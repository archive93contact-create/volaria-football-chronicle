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

        // For first round, get clubs from league tables for the season year
        if (matches.length === 0 || round === ROUND_ORDER[0]) {
            // Filter clubs by eligible tiers from cup config
            const eligibleTiers = cup.eligible_tiers?.split('-').map(t => parseInt(t.trim())) || [1, 2, 3, 4, 5, 6, 7, 8];
            const minTier = Math.min(...eligibleTiers);
            const maxTier = Math.max(...eligibleTiers);
            
            // Get clubs that played in this season's year
            const seasonYear = season.year;
            const yearTables = leagueTables.filter(t => t.year === seasonYear);
            const eligibleClubNames = new Set();
            
            yearTables.forEach(table => {
                const league = leagues.find(l => l.id === table.league_id);
                const tier = league?.tier || 999;
                if (tier >= minTier && tier <= maxTier && table.club_name) {
                    eligibleClubNames.add(table.club_name);
                }
            });
            
            return clubs.filter(club => eligibleClubNames.has(club.name));
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

    // Identify ALL rounds and their draw status
    const roundsStatus = useMemo(() => {
        const matchesByRound = matches.reduce((acc, m) => {
            if (!acc[m.round]) acc[m.round] = [];
            acc[m.round].push(m);
            return acc;
        }, {});

        const allRounds = [];

        // If no matches exist at all, show first round as needing draw
        if (matches.length === 0) {
            const available = getAvailableClubs(ROUND_ORDER[0]);
            if (available.length >= 2) {
                allRounds.push({
                    round: ROUND_ORDER[0],
                    status: 'ready',
                    clubCount: available.length,
                    reason: `${available.length} clubs eligible - start tournament`
                });
            }
            return allRounds;
        }

        // Check each round in order
        for (let i = 0; i < ROUND_ORDER.length; i++) {
            const round = ROUND_ORDER[i];
            const roundMatches = matchesByRound[round] || [];
            
            if (roundMatches.length === 0) {
                // This round doesn't exist yet
                if (i === 0) {
                    // First round but has no matches
                    const available = getAvailableClubs(round);
                    if (available.length >= 2) {
                        allRounds.push({
                            round,
                            status: 'ready',
                            clubCount: available.length,
                            reason: `${available.length} clubs eligible`
                        });
                    }
                } else {
                    // Check if previous round is complete
                    const previousRound = ROUND_ORDER[i - 1];
                    const previousMatches = matchesByRound[previousRound] || [];
                    const allPreviousComplete = previousMatches.length > 0 && 
                        previousMatches.every(m => m.winner && m.winner !== 'TBD');
                    
                    if (allPreviousComplete) {
                        const available = getAvailableClubs(round);
                        if (available.length >= 2) {
                            allRounds.push({
                                round,
                                status: 'ready',
                                clubCount: available.length,
                                reason: `${available.length} clubs qualified from ${previousRound}`
                            });
                        } else if (available.length === 1) {
                            allRounds.push({
                                round,
                                status: 'waiting',
                                clubCount: 1,
                                reason: 'Only 1 club - tournament complete?'
                            });
                        }
                    } else if (previousMatches.length > 0) {
                        allRounds.push({
                            round,
                            status: 'waiting',
                            clubCount: 0,
                            reason: `Waiting for ${previousRound} to complete`
                        });
                    }
                }
            } else {
                // Round exists - check if complete
                const allComplete = roundMatches.every(m => m.winner && m.winner !== 'TBD');
                allRounds.push({
                    round,
                    status: allComplete ? 'complete' : 'in_progress',
                    clubCount: roundMatches.length,
                    reason: allComplete ? `${roundMatches.length} matches complete` : `${roundMatches.filter(m => m.winner).length}/${roundMatches.length} matches complete`
                });
            }
        }

        return allRounds;
    }, [matches, clubs, leagueTables, season]);

    // Extract rounds that are ready for drawing
    const roundsNeedingDraw = roundsStatus.filter(r => r.status === 'ready');

    const availableForDraw = getAvailableClubs(selectedRound);

    return (
        <>
            {/* Tournament Progress Overview */}
            {roundsStatus.length > 0 && (
                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Trophy className="w-5 h-5" />
                            Tournament Progress
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {roundsStatus.map(({ round, status, clubCount, reason }) => (
                            <div 
                                key={round} 
                                className={`flex items-center justify-between p-3 rounded-lg ${
                                    status === 'ready' ? 'bg-emerald-50 border-2 border-emerald-500' :
                                    status === 'complete' ? 'bg-slate-50 border border-slate-200' :
                                    status === 'in_progress' ? 'bg-blue-50 border border-blue-200' :
                                    'bg-slate-50 border border-slate-200 opacity-60'
                                }`}
                            >
                                <div>
                                    <div className={`font-semibold ${
                                        status === 'ready' ? 'text-emerald-900' :
                                        status === 'complete' ? 'text-slate-600' :
                                        status === 'in_progress' ? 'text-blue-900' :
                                        'text-slate-500'
                                    }`}>
                                        {round}
                                    </div>
                                    <div className={`text-sm ${
                                        status === 'ready' ? 'text-emerald-700' :
                                        status === 'complete' ? 'text-slate-500' :
                                        status === 'in_progress' ? 'text-blue-700' :
                                        'text-slate-400'
                                    }`}>
                                        {reason}
                                    </div>
                                </div>
                                {status === 'ready' && (
                                    <Button 
                                        onClick={() => performDraw(round)}
                                        className="bg-emerald-600 hover:bg-emerald-700"
                                    >
                                        <Shuffle className="w-4 h-4 mr-2" />
                                        Draw Round
                                    </Button>
                                )}
                                {status === 'complete' && (
                                    <Badge className="bg-slate-600">✓ Complete</Badge>
                                )}
                                {status === 'in_progress' && (
                                    <Badge className="bg-blue-600">In Progress</Badge>
                                )}
                                {status === 'waiting' && (
                                    <Badge variant="outline">Waiting</Badge>
                                )}
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