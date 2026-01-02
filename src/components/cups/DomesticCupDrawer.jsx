import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shuffle, Loader2, Trophy, ChevronDown, ChevronUp } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const ROUND_ORDER = ['Round of 128', 'Round of 64', 'Round of 32', 'Round of 16', 'Quarter-final', 'Semi-final', 'Final'];

export default function DomesticCupDrawer({ 
    seasonId, 
    season, 
    cup, 
    clubs, 
    leagues, 
    leagueTables,
    matches,
    onDrawComplete 
}) {
    const queryClient = useQueryClient();
    const [isDrawing, setIsDrawing] = useState(false);
    const [drawResults, setDrawResults] = useState(null);
    const [selectedRound, setSelectedRound] = useState(null);
    const [showPoolDetails, setShowPoolDetails] = useState(false);

    const createMatchesMutation = useMutation({
        mutationFn: async (matchesToCreate) => {
            return await base44.entities.DomesticCupMatch.bulkCreate(matchesToCreate);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['cupMatches', seasonId]);
            if (onDrawComplete) onDrawComplete();
        },
    });

    // Get club tier from league tables
    const getClubTier = (clubName) => {
        const table = leagueTables.find(t => t.club_name?.toLowerCase().trim() === clubName?.toLowerCase().trim());
        if (!table) return 999; // Unranked
        const league = leagues.find(l => l.id === table.league_id);
        return league?.tier || 999;
    };

    // Get club position within their league
    const getClubPosition = (clubName) => {
        const table = leagueTables.find(t => t.club_name?.toLowerCase().trim() === clubName?.toLowerCase().trim());
        return table?.position || 999;
    };

    // Get seeding value (lower is better)
    const getSeeding = (clubName) => {
        const tier = getClubTier(clubName);
        const position = getClubPosition(clubName);
        // Seed by tier first, then by position within tier
        return tier * 1000 + position;
    };

    // Determine next round
    const getNextRound = (currentRound) => {
        const currentIdx = ROUND_ORDER.indexOf(currentRound);
        if (currentIdx === -1 || currentIdx === ROUND_ORDER.length - 1) return null;
        return ROUND_ORDER[currentIdx + 1];
    };

    // Get clubs in pool for next round
    const getAvailableClubs = (round) => {
        const matchesByRound = matches.reduce((acc, m) => {
            if (!acc[m.round]) acc[m.round] = [];
            acc[m.round].push(m);
            return acc;
        }, {});

        // For first round, all clubs are available
        if (round === 'Round of 128' || round === 'Round of 64' || !round) {
            // Filter clubs by eligible tiers from cup config
            const eligibleTiers = cup.eligible_tiers?.split('-').map(t => parseInt(t.trim())) || [1, 2, 3, 4, 5, 6, 7, 8];
            const minTier = Math.min(...eligibleTiers);
            const maxTier = Math.max(...eligibleTiers);
            
            return clubs.filter(club => {
                const tier = getClubTier(club.name);
                return tier >= minTier && tier <= maxTier;
            });
        }

        // For subsequent rounds, get winners from previous round
        const previousRound = ROUND_ORDER[ROUND_ORDER.indexOf(round) - 1];
        if (!previousRound || !matchesByRound[previousRound]) return [];

        const winnerNames = matchesByRound[previousRound]
            .filter(m => m.winner && m.winner !== 'TBD' && m.winner.toLowerCase() !== 'bye')
            .map(m => m.winner);

        return clubs.filter(c => winnerNames.includes(c.name));
    };

    // Perform the draw
    const performDraw = (round) => {
        setIsDrawing(true);
        setSelectedRound(round);

        const availableClubs = getAvailableClubs(round);
        
        // Seed clubs (sort by tier, then position)
        const seededClubs = [...availableClubs].sort((a, b) => {
            return getSeeding(a.name) - getSeeding(b.name);
        });

        // Pair clubs (seeded vs unseeded)
        const matchesCount = Math.floor(seededClubs.length / 2);
        const pairs = [];

        if (seededClubs.length % 2 === 1) {
            // Odd number - highest seeded club gets a bye
            const byeClub = seededClubs[0];
            seededClubs.shift();
            pairs.push({ home: byeClub, away: null, isBye: true });
        }

        // Split into seeded and unseeded halves
        const halfSize = Math.ceil(seededClubs.length / 2);
        const topHalf = seededClubs.slice(0, halfSize);
        const bottomHalf = seededClubs.slice(halfSize).reverse(); // Reverse for seeding balance

        // Pair top seed with bottom unseeded, etc.
        for (let i = 0; i < Math.min(topHalf.length, bottomHalf.length); i++) {
            pairs.push({
                home: topHalf[i],
                away: bottomHalf[i],
                isBye: false
            });
        }

        // Create match data
        const newMatches = pairs.map((pair, idx) => {
            if (pair.isBye) {
                return {
                    season_id: seasonId,
                    round,
                    match_number: idx + 1,
                    home_club_name: pair.home.name,
                    home_club_id: pair.home.id,
                    away_club_name: 'BYE',
                    away_club_id: null,
                    home_score: null,
                    away_score: null,
                    winner: pair.home.name,
                    notes: 'Bye - advances automatically'
                };
            }
            return {
                season_id: seasonId,
                round,
                match_number: idx + 1,
                home_club_name: pair.home.name,
                home_club_id: pair.home.id,
                away_club_name: pair.away.name,
                away_club_id: pair.away.id,
                home_score: null,
                away_score: null,
                winner: null
            };
        });

        setDrawResults({ round, matches: newMatches, pairs });
        setIsDrawing(false);
    };

    const confirmDraw = () => {
        createMatchesMutation.mutate(drawResults.matches);
        setDrawResults(null);
    };

    // Identify which rounds need a draw
    const roundsNeedingDraw = useMemo(() => {
        const matchesByRound = matches.reduce((acc, m) => {
            if (!acc[m.round]) acc[m.round] = [];
            acc[m.round].push(m);
            return acc;
        }, {});

        const needsDraw = [];

        // Start with first round if no matches exist
        if (matches.length === 0) {
            const firstRound = ROUND_ORDER[0];
            const available = getAvailableClubs(firstRound);
            if (available.length >= 2) {
                needsDraw.push({
                    round: firstRound,
                    clubCount: available.length,
                    reason: 'No matches yet - start the tournament'
                });
            }
            return needsDraw;
        }

        // Check each round
        for (const round of ROUND_ORDER) {
            const roundMatches = matchesByRound[round] || [];
            
            // If this round has no matches but previous round is complete
            if (roundMatches.length === 0) {
                const previousRoundIdx = ROUND_ORDER.indexOf(round) - 1;
                if (previousRoundIdx >= 0) {
                    const previousRound = ROUND_ORDER[previousRoundIdx];
                    const previousMatches = matchesByRound[previousRound] || [];
                    const allPreviousComplete = previousMatches.length > 0 && 
                        previousMatches.every(m => m.winner && m.winner !== 'TBD');
                    
                    if (allPreviousComplete) {
                        const available = getAvailableClubs(round);
                        if (available.length >= 2) {
                            needsDraw.push({
                                round,
                                clubCount: available.length,
                                reason: `${previousRound} complete - ${available.length} clubs advancing`
                            });
                        } else if (available.length === 1 && round === 'Final') {
                            // Special case: one club made it to final (shouldn't happen but handle it)
                            needsDraw.push({
                                round,
                                clubCount: 1,
                                reason: 'Only one finalist - needs opponent'
                            });
                        }
                    }
                }
                break; // Only show the next round that needs a draw
            }
        }

        return needsDraw;
    }, [matches, clubs, leagueTables]);

    const availableForDraw = getAvailableClubs(selectedRound);

    return (
        <>
            {roundsNeedingDraw.length > 0 && (
                <Card className="border-2 border-emerald-500 bg-emerald-50/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-emerald-700">
                            <Shuffle className="w-5 h-5" />
                            Draw Required
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {roundsNeedingDraw.map(({ round, clubCount, reason }) => (
                            <div key={round} className="flex items-center justify-between p-3 bg-white rounded-lg">
                                <div>
                                    <div className="font-semibold text-slate-900">{round}</div>
                                    <div className="text-sm text-slate-600">{reason}</div>
                                </div>
                                <Button 
                                    onClick={() => performDraw(round)}
                                    className="bg-emerald-600 hover:bg-emerald-700"
                                >
                                    <Shuffle className="w-4 h-4 mr-2" />
                                    Draw {round}
                                </Button>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Draw Preview Dialog */}
            <Dialog open={!!drawResults} onOpenChange={(open) => { if (!open) setDrawResults(null); }}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Draw Results - {drawResults?.round}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                            <span className="font-medium text-emerald-900">{drawResults?.matches.length} matches created</span>
                            <Badge className="bg-emerald-600">{drawResults?.pairs.length} pairs</Badge>
                        </div>

                        <div className="space-y-2">
                            {drawResults?.matches.map((match, idx) => (
                                <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                    <span className="text-xs text-slate-500 w-8">#{match.match_number}</span>
                                    <div className="flex-1 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-xs">T{getClubTier(match.home_club_name)}</Badge>
                                            <span className="font-medium">{match.home_club_name}</span>
                                        </div>
                                        <span className="text-slate-400">vs</span>
                                        {match.away_club_name === 'BYE' ? (
                                            <Badge className="bg-amber-500">BYE</Badge>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">{match.away_club_name}</span>
                                                <Badge variant="outline" className="text-xs">T{getClubTier(match.away_club_name)}</Badge>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-end gap-2 pt-4 border-t">
                            <Button variant="outline" onClick={() => setDrawResults(null)}>
                                Cancel
                            </Button>
                            <Button 
                                onClick={confirmDraw} 
                                disabled={createMatchesMutation.isPending}
                                className="bg-emerald-600 hover:bg-emerald-700"
                            >
                                {createMatchesMutation.isPending ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</>
                                ) : (
                                    <><Trophy className="w-4 h-4 mr-2" /> Confirm Draw</>
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Pool Details (for debugging/transparency) */}
            {selectedRound && (
                <Card className="mt-4">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm">Available Clubs Pool</CardTitle>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setShowPoolDetails(!showPoolDetails)}
                            >
                                {showPoolDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </Button>
                        </div>
                    </CardHeader>
                    {showPoolDetails && (
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                                {availableForDraw.map(club => (
                                    <div key={club.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded">
                                        <Badge variant="outline" className="text-xs">T{getClubTier(club.name)}</Badge>
                                        <span className="truncate">{club.name}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    )}
                </Card>
            )}
        </>
    );
}