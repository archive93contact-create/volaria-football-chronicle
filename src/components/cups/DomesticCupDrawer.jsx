import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
    const [isSavingFinals, setIsSavingFinals] = useState(false);

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

        // For first round or no matches, get clubs from league tables for the season year
        if (matches.length === 0) {
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

        // For subsequent rounds, get ALL winners from ALL existing completed rounds
        // This handles custom round names properly
        const allWinners = new Set();
        
        Object.keys(matchesByRound).forEach(existingRound => {
            matchesByRound[existingRound].forEach(match => {
                if (match.winner && match.winner !== 'TBD' && match.winner.toLowerCase() !== 'bye') {
                    allWinners.add(match.winner);
                }
            });
        });

        return clubs.filter(c => allWinners.has(c.name));
    };

    // Calculate next power of 2
    const nextPowerOf2 = (n) => {
        let power = 1;
        while (power < n) power *= 2;
        return power;
    };

    // Perform the draw with proper bye calculation
    const performDraw = (round) => {
        setIsDrawing(true);
        setSelectedRound(round);

        const availableClubs = getAvailableClubs(round);
        const numClubs = availableClubs.length;
        
        // Seed clubs (sort by tier, then position - best teams first)
        const seededClubs = [...availableClubs].sort((a, b) => {
            return getSeeding(a.name) - getSeeding(b.name);
        });

        // Calculate bracket structure
        const nextRoundSize = Math.floor(numClubs / 2);
        const bracketSize = nextPowerOf2(nextRoundSize);
        const byesNeeded = (bracketSize * 2) - numClubs;
        const firstRoundMatches = (numClubs - byesNeeded) / 2;

        const pairs = [];
        const clubsWithByes = seededClubs.slice(0, byesNeeded); // Top seeds get byes
        const clubsInFirstRound = seededClubs.slice(byesNeeded);

        // Create byes (these clubs advance automatically)
        clubsWithByes.forEach(club => {
            pairs.push({ home: club, away: null, isBye: true });
        });

        // Shuffle clubs in first round for excitement (or keep seeded if preferred)
        // Split into top half and bottom half for balanced matchups
        const halfSize = Math.ceil(clubsInFirstRound.length / 2);
        const topHalf = clubsInFirstRound.slice(0, halfSize);
        const bottomHalf = clubsInFirstRound.slice(halfSize).reverse();

        // Pair top seeds vs bottom seeds
        for (let i = 0; i < topHalf.length && i < bottomHalf.length; i++) {
            pairs.push({
                home: topHalf[i],
                away: bottomHalf[i],
                isBye: false
            });
        }

        // Handle odd number in first round (shouldn't happen with proper calculation but safety)
        if (clubsInFirstRound.length % 2 === 1) {
            const lastClub = clubsInFirstRound[clubsInFirstRound.length - 1];
            pairs.push({ home: lastClub, away: null, isBye: true });
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

        setDrawResults({ 
            round, 
            matches: newMatches, 
            pairs,
            stats: {
                totalClubs: numClubs,
                byes: byesNeeded,
                matches: firstRoundMatches
            }
        });
        setIsDrawing(false);
    };

    const [editableMatches, setEditableMatches] = useState([]);

    const confirmDraw = () => {
        // Save the matches to state for editing before committing
        setEditableMatches(drawResults.matches);
        setDrawResults(null);
    };

    const updateEditableMatch = (matchNumber, field, value) => {
        setEditableMatches(prev => prev.map(m => {
            if (m.match_number === matchNumber) {
                const updated = { ...m, [field]: value };
                
                // Auto-determine winner if both scores are set
                if ((field === 'home_score' || field === 'away_score') && m.away_club_name !== 'BYE') {
                    const home = field === 'home_score' ? value : m.home_score;
                    const away = field === 'away_score' ? value : m.away_score;
                    if (home !== null && away !== null && home !== '' && away !== '') {
                        if (parseInt(home) > parseInt(away)) {
                            updated.winner = m.home_club_name;
                            updated.winner_id = m.home_club_id;
                        } else if (parseInt(away) > parseInt(home)) {
                            updated.winner = m.away_club_name;
                            updated.winner_id = m.away_club_id;
                        }
                    }
                }
                
                return updated;
            }
            return m;
        }));
    };

    const saveMatches = () => {
        createMatchesMutation.mutate(editableMatches);
        setEditableMatches([]);
    };

    // Update season with champion and runner-up from Final
    const updateSeasonMutation = useMutation({
        mutationFn: async (data) => {
            return await base44.entities.DomesticCupSeason.update(seasonId, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['cupSeason', seasonId]);
            setIsSavingFinals(false);
        },
    });

    const finalizeCup = async () => {
        setIsSavingFinals(true);
        const finalMatch = matches.find(m => m.round === 'Final');
        if (!finalMatch || !finalMatch.winner) {
            alert('Cannot finalize: Final match has no winner');
            setIsSavingFinals(false);
            return;
        }

        const champion = finalMatch.winner;
        const runnerUp = finalMatch.winner === finalMatch.home_club_name ? finalMatch.away_club_name : finalMatch.home_club_name;
        const championClub = clubs.find(c => c.name === champion);
        const runnerUpClub = clubs.find(c => c.name === runnerUp);

        await updateSeasonMutation.mutateAsync({
            champion_name: champion,
            champion_id: championClub?.id || null,
            runner_up: runnerUp,
            runner_up_id: runnerUpClub?.id || null
        });
    };

    // Determine correct round name based on number of clubs
    const determineCorrectRound = (numClubs) => {
        if (numClubs === 2) return 'Final';
        if (numClubs === 4) return 'Semi-final';
        if (numClubs === 8) return 'Quarter-final';
        if (numClubs === 16) return 'Round of 16';
        if (numClubs === 32) return 'Round of 32';
        if (numClubs === 64) return 'Round of 64';
        if (numClubs === 128) return 'Round of 128';
        return `Round of ${numClubs}`;
    };

    // Identify ALL rounds and their draw status
    const roundsStatus = useMemo(() => {
        const matchesByRound = matches.reduce((acc, m) => {
            if (!acc[m.round]) acc[m.round] = [];
            acc[m.round].push(m);
            return acc;
        }, {});

        const allRounds = [];

        // If no matches exist at all, determine starting round
        if (matches.length === 0) {
            const available = getAvailableClubs(null);
            if (available.length >= 2) {
                const correctRound = determineCorrectRound(available.length);
                allRounds.push({
                    round: correctRound,
                    status: 'ready',
                    clubCount: available.length,
                    reason: `${available.length} clubs eligible - draw ${correctRound}`
                });
            }
            return allRounds;
        }

        // Check existing rounds
        const existingRounds = Object.keys(matchesByRound).sort((a, b) => {
            return ROUND_ORDER.indexOf(a) - ROUND_ORDER.indexOf(b);
        });

        existingRounds.forEach((round, idx) => {
            const roundMatches = matchesByRound[round];
            const allComplete = roundMatches.every(m => m.winner && m.winner !== 'TBD');
            
            allRounds.push({
                round,
                status: allComplete ? 'complete' : 'in_progress',
                clubCount: roundMatches.length,
                reason: allComplete 
                    ? `${roundMatches.length} matches complete` 
                    : `${roundMatches.filter(m => m.winner).length}/${roundMatches.length} matches complete`
            });

            // If this round is complete and not the final, check for next round
            if (allComplete && round !== 'Final') {
                // Get winners to determine next round
                const winners = roundMatches
                    .filter(m => m.winner && m.winner !== 'TBD' && m.winner.toLowerCase() !== 'bye')
                    .map(m => m.winner);
                
                const uniqueWinners = [...new Set(winners)];
                
                // Check if next round exists
                const nextRoundIdx = ROUND_ORDER.indexOf(round) + 1;
                const nextRound = ROUND_ORDER[nextRoundIdx];
                const nextRoundExists = matchesByRound[nextRound];

                if (!nextRoundExists && uniqueWinners.length >= 2) {
                    const correctNextRound = determineCorrectRound(uniqueWinners.length);
                    allRounds.push({
                        round: correctNextRound,
                        status: 'ready',
                        clubCount: uniqueWinners.length,
                        reason: `${uniqueWinners.length} clubs qualified - draw ${correctNextRound}`
                    });
                }
            }
        });

        return allRounds;
    }, [matches, clubs, leagueTables, season]);

    // Extract rounds that are ready for drawing
    const roundsNeedingDraw = roundsStatus.filter(r => r.status === 'ready');

    const availableForDraw = getAvailableClubs(selectedRound);

    // Check if tournament is complete (Final has a winner)
    const finalMatch = matches.find(m => m.round === 'Final');
    const isTournamentComplete = finalMatch && finalMatch.winner && finalMatch.winner !== 'TBD';
    const needsFinalization = isTournamentComplete && !season.champion_name;

    return (
        <>
            {/* Finalize Tournament Button */}
            {needsFinalization && (
                <Card className="border-2 border-amber-500 bg-amber-50/50 mb-4">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <div className="font-semibold text-amber-900">Tournament Complete!</div>
                            <div className="text-sm text-amber-700">Click to finalize and record the champion</div>
                        </div>
                        <Button 
                            onClick={finalizeCup}
                            disabled={isSavingFinals}
                            className="bg-amber-600 hover:bg-amber-700"
                        >
                            {isSavingFinals ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                            ) : (
                                <><Trophy className="w-4 h-4 mr-2" /> Finalize Cup</>
                            )}
                        </Button>
                    </CardContent>
                </Card>
            )}

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
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Draw Complete - {drawResults?.round}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-3 gap-3 p-3 bg-emerald-50 rounded-lg">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-emerald-900">{drawResults?.stats.totalClubs}</div>
                                <div className="text-xs text-emerald-700">Total Clubs</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-amber-900">{drawResults?.stats.byes}</div>
                                <div className="text-xs text-amber-700">Byes (Top Seeds)</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-blue-900">{drawResults?.stats.matches}</div>
                                <div className="text-xs text-blue-700">Matches to Play</div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            {drawResults?.matches.map((match, idx) => (
                                <div key={idx} className={`p-3 rounded-lg ${match.away_club_name === 'BYE' ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50'}`}>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-slate-500 w-8">#{match.match_number}</span>
                                        <div className="flex-1 flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2 flex-1">
                                                <Badge variant="outline" className="text-xs">T{getClubTier(match.home_club_name)}</Badge>
                                                <span className="font-medium text-sm">{match.home_club_name}</span>
                                            </div>
                                            {match.away_club_name === 'BYE' ? (
                                                <Badge className="bg-amber-500 text-white">AUTOMATIC BYE</Badge>
                                            ) : (
                                                <>
                                                    <span className="text-slate-400 text-sm">vs</span>
                                                    <div className="flex items-center gap-2 flex-1 justify-end">
                                                        <span className="font-medium text-sm">{match.away_club_name}</span>
                                                        <Badge variant="outline" className="text-xs">T{getClubTier(match.away_club_name)}</Badge>
                                                    </div>
                                                </>
                                            )}
                                        </div>
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
                                className="bg-emerald-600 hover:bg-emerald-700"
                            >
                                <Trophy className="w-4 h-4 mr-2" />
                                Confirm & Enter Results
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Editable Matches Dialog (after draw confirmed) */}
            <Dialog open={editableMatches.length > 0} onOpenChange={(open) => { if (!open) setEditableMatches([]); }}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Enter Match Results - {editableMatches[0]?.round}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <p className="text-sm text-slate-600">
                            Enter scores to determine winners, or leave blank if scores are unknown. You must select a winner for each match.
                        </p>

                        <div className="space-y-3">
                            {editableMatches.map((match, idx) => (
                                <Card key={idx} className={match.away_club_name === 'BYE' ? 'bg-amber-50' : ''}>
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-slate-500 font-mono w-6">#{match.match_number}</span>
                                            
                                            {/* Home Team */}
                                            <div className="flex-1 flex items-center gap-2">
                                                <Badge variant="outline" className="text-xs">T{getClubTier(match.home_club_name)}</Badge>
                                                <span className="font-medium text-sm flex-1">{match.home_club_name}</span>
                                                <Input 
                                                    type="number"
                                                    placeholder="—"
                                                    className="w-16 h-9 text-center"
                                                    value={match.home_score ?? ''}
                                                    onChange={(e) => updateEditableMatch(match.match_number, 'home_score', e.target.value ? parseInt(e.target.value) : null)}
                                                    disabled={match.away_club_name === 'BYE'}
                                                />
                                            </div>

                                            {match.away_club_name === 'BYE' ? (
                                                <Badge className="bg-amber-500 text-white px-4">BYE - Auto Win</Badge>
                                            ) : (
                                                <>
                                                    {/* Away Team */}
                                                    <div className="flex-1 flex items-center gap-2">
                                                        <Input 
                                                            type="number"
                                                            placeholder="—"
                                                            className="w-16 h-9 text-center"
                                                            value={match.away_score ?? ''}
                                                            onChange={(e) => updateEditableMatch(match.match_number, 'away_score', e.target.value ? parseInt(e.target.value) : null)}
                                                        />
                                                        <span className="font-medium text-sm flex-1 text-right">{match.away_club_name}</span>
                                                        <Badge variant="outline" className="text-xs">T{getClubTier(match.away_club_name)}</Badge>
                                                    </div>

                                                    {/* Winner Selection */}
                                                    <div className="flex gap-1">
                                                        <Button
                                                            size="sm"
                                                            variant={match.winner === match.home_club_name ? "default" : "outline"}
                                                            onClick={() => {
                                                                updateEditableMatch(match.match_number, 'winner', match.home_club_name);
                                                                updateEditableMatch(match.match_number, 'winner_id', match.home_club_id);
                                                            }}
                                                            className={match.winner === match.home_club_name ? 'bg-emerald-600' : ''}
                                                        >
                                                            H
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant={match.winner === match.away_club_name ? "default" : "outline"}
                                                            onClick={() => {
                                                                updateEditableMatch(match.match_number, 'winner', match.away_club_name);
                                                                updateEditableMatch(match.match_number, 'winner_id', match.away_club_id);
                                                            }}
                                                            className={match.winner === match.away_club_name ? 'bg-emerald-600' : ''}
                                                        >
                                                            A
                                                        </Button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {/* Validation Warning */}
                        {editableMatches.some(m => !m.winner) && (
                            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                                ⚠️ Some matches don't have winners selected. You must select a winner for each match before saving.
                            </div>
                        )}

                        <div className="flex justify-end gap-2 pt-4 border-t">
                            <Button variant="outline" onClick={() => setEditableMatches([])}>
                                Cancel
                            </Button>
                            <Button 
                                onClick={saveMatches}
                                disabled={createMatchesMutation.isPending || editableMatches.some(m => !m.winner)}
                                className="bg-emerald-600 hover:bg-emerald-700"
                            >
                                {createMatchesMutation.isPending ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                                ) : (
                                    <>Save {editableMatches.length} Matches</>
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