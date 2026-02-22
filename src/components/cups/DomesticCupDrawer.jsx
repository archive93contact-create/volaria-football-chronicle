import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, Plus } from 'lucide-react';
import CupDrawEngine from './CupDrawEngine';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

/**
 * Enhanced Domestic Cup Drawer
 * Supports FA Cup-style tiered entry and dynamic round management
 */

export default function DomesticCupDrawer({ 
    season, 
    cup, 
    allClubs = [],
    existingMatches = [],
    allLeagueTables = []
}) {
    const queryClient = useQueryClient();
    const [selectedRound, setSelectedRound] = useState('');
    const [isDrawDialogOpen, setIsDrawDialogOpen] = useState(false);
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [entryConfig, setEntryConfig] = useState(cup.entry_rounds_by_tier || {});

    // Define standard cup rounds (FA Cup style)
    const standardRounds = [
        'Preliminary Round',
        'First Round Qualifying',
        'Second Round Qualifying', 
        'Third Round Qualifying',
        'Fourth Round Qualifying',
        'First Round',
        'Second Round',
        'Third Round',
        'Fourth Round',
        'Fifth Round',
        'Quarter-Final',
        'Semi-Final',
        'Final'
    ];

    // Get teams that have entered based on cup tier entry rules
    const getEligibleTeamsForRound = (roundName) => {
        const entryRules = cup.entry_rounds_by_tier || entryConfig;
        
        // Get teams that should enter at this round or earlier
        const eligibleTiers = Object.entries(entryRules)
            .filter(([tierRange, entryRound]) => {
                const roundIndex = standardRounds.indexOf(entryRound);
                const currentIndex = standardRounds.indexOf(roundName);
                return roundIndex <= currentIndex;
            })
            .map(([tierRange]) => tierRange);

        // Get all clubs with their tier from league tables for this season
        const clubsWithTier = allClubs.map(club => {
            const tableEntry = allLeagueTables.find(t => 
                (t.club_id === club.id || t.club_name === club.name) && 
                t.year === season.year
            );
            return {
                ...club,
                tier: tableEntry?.tier || club.tier || 999,
                position: tableEntry?.position
            };
        });

        // Parse tier ranges (e.g., "1-2" or "3-5" or "1")
        const teams = clubsWithTier.filter(club => {
            const clubTier = club.tier;
            
            return eligibleTiers.some(range => {
                if (range.includes('-')) {
                    const [min, max] = range.split('-').map(Number);
                    return clubTier >= min && clubTier <= max;
                } else {
                    return clubTier === Number(range);
                }
            });
        });

        return teams.sort((a, b) => (a.tier || 999) - (b.tier || 999));
    };

    // Get teams already in the competition (from previous rounds)
    const getTeamsInCompetition = () => {
        const winners = new Set();
        
        existingMatches.forEach(match => {
            if (match.winner_id) {
                winners.add(match.winner_id);
            }
        });

        return allClubs.filter(c => winners.has(c.id));
    };

    // Calculate available teams for selected round
    const availableTeams = useMemo(() => {
        if (!selectedRound) return [];

        const existingMatchesInRound = existingMatches.filter(m => m.round === selectedRound);
        
        // If first round, use entry rules
        if (existingMatches.length === 0 || selectedRound === standardRounds[0]) {
            const eligible = getEligibleTeamsForRound(selectedRound);
            const alreadyDrawn = new Set([
                ...existingMatchesInRound.map(m => m.home_club_id),
                ...existingMatchesInRound.map(m => m.away_club_id)
            ].filter(Boolean));
            
            return eligible.filter(t => !alreadyDrawn.has(t.id));
        }

        // For subsequent rounds, use winners from previous round + new entrants
        const previousRoundIndex = standardRounds.indexOf(selectedRound) - 1;
        const previousRound = standardRounds[previousRoundIndex];
        
        const previousMatches = existingMatches.filter(m => m.round === previousRound);
        const winners = previousMatches
            .filter(m => m.winner_id)
            .map(m => allClubs.find(c => c.id === m.winner_id))
            .filter(Boolean);

        // Add new entrants for this round
        const newEntrants = getEligibleTeamsForRound(selectedRound)
            .filter(t => !winners.some(w => w.id === t.id));

        const combined = [...winners, ...newEntrants];

        // Remove teams already in matches for this round
        const alreadyDrawn = new Set([
            ...existingMatchesInRound.map(m => m.home_club_id),
            ...existingMatchesInRound.map(m => m.away_club_id)
        ].filter(Boolean));

        return combined.filter(t => !alreadyDrawn.has(t.id));
    }, [selectedRound, existingMatches, allClubs, cup, season]);

    // Save entry configuration
    const saveConfigMutation = useMutation({
        mutationFn: async (config) => {
            await base44.entities.DomesticCup.update(cup.id, {
                entry_rounds_by_tier: config
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['domesticCup']);
            setIsConfigOpen(false);
        }
    });

    // Create matches from drawn pairs
    const createMatchesMutation = useMutation({
        mutationFn: async (pairs) => {
            const matches = pairs.map((pair, idx) => ({
                season_id: season.id,
                round: selectedRound,
                match_number: idx + 1,
                home_club_id: pair.home.id,
                home_club_name: pair.home.name,
                away_club_id: pair.away?.id || null,
                away_club_name: pair.away?.name || null,
                home_score: null,
                away_score: null,
                winner_id: pair.isBye ? pair.home.id : null, // Auto-advance bye
                winner: pair.isBye ? pair.home.name : null
            }));

            await base44.entities.DomesticCupMatch.bulkCreate(matches);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['cupMatches']);
            setIsDrawDialogOpen(false);
            setSelectedRound('');
        }
    });

    // Calculate recommended starting round based on number of teams
    const getRecommendedStartingRound = () => {
        const totalTeams = season.number_of_teams || 0;
        if (totalTeams === 0) return null;
        
        // Find closest power of 2 and suggest appropriate round
        if (totalTeams <= 2) return 'Final';
        if (totalTeams <= 4) return 'Semi-Final';
        if (totalTeams <= 8) return 'Quarter-Final';
        if (totalTeams <= 16) return 'Fifth Round';
        if (totalTeams <= 32) return 'Fourth Round';
        if (totalTeams <= 64) return 'Third Round';
        if (totalTeams <= 128) return 'Second Round';
        return 'First Round';
    };

    const recommendedRound = getRecommendedStartingRound();
    const hasNoMatches = existingMatches.length === 0;

    return (
        <Card className="border-0 shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-500" />
                    Cup Draw System
                </CardTitle>
                <p className="text-sm text-slate-500 mt-2">
                    Conduct round-by-round draws using FA Cup bracket logic with automatic bye calculation
                </p>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Recommended Starting Round */}
                {hasNoMatches && recommendedRound && season.number_of_teams > 0 && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <div className="flex items-start gap-2">
                            <Trophy className="w-4 h-4 text-emerald-600 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold text-emerald-900">
                                    💡 Recommended: Start at <strong>{recommendedRound}</strong>
                                </p>
                                <p className="text-xs text-emerald-700 mt-1">
                                    Based on {season.number_of_teams} teams, this round fits the bracket size. Configure entry rules above first, then draw this round.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
                {/* Auto-suggested Entry Configuration */}
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <h4 className="font-semibold text-emerald-900 text-sm">⚙️ Entry Rules</h4>
                            <p className="text-xs text-emerald-700 mt-1">
                                {Object.keys(entryConfig).length > 0 
                                    ? `${Object.keys(entryConfig).length} tier rule(s) configured`
                                    : 'Click "Auto-Configure" to automatically set entry rules based on team count'}
                            </p>
                            {Object.keys(entryConfig).length > 0 && (
                                <div className="mt-2 space-y-1">
                                    {(() => {
                                        // Debug: show what data we have
                                        const clubsWithTierData = allClubs.map(club => {
                                            const tableEntry = allLeagueTables.find(t => 
                                                (t.club_id === club.id || t.club_name?.toLowerCase().trim() === club.name?.toLowerCase().trim()) && 
                                                t.year === season.year
                                            );
                                            return {
                                                ...club,
                                                tier: tableEntry?.tier || null,
                                                tableEntry
                                            };
                                        });
                                        
                                        const tierCounts = {};
                                        clubsWithTierData.forEach(club => {
                                            if (club.tier) {
                                                tierCounts[club.tier] = (tierCounts[club.tier] || 0) + 1;
                                            }
                                        });
                                        
                                        return (
                                            <>
                                                {/* Debug info */}
                                                <div className="text-xs bg-yellow-50 rounded px-2 py-1 border border-yellow-200">
                                                    <strong>Debug:</strong> Tier distribution: {JSON.stringify(tierCounts)} | 
                                                    Clubs with tier: {clubsWithTierData.filter(c => c.tier).length}/{allClubs.length}
                                                </div>
                                                
                                                {Object.entries(entryConfig).sort((a, b) => {
                                                    const tierA = a[0].includes('-') ? parseInt(a[0].split('-')[0]) : parseInt(a[0]);
                                                    const tierB = b[0].includes('-') ? parseInt(b[0].split('-')[0]) : parseInt(b[0]);
                                                    return tierA - tierB;
                                                }).map(([tier, round]) => {
                                                    const teamsInTier = clubsWithTierData.filter(club => {
                                                        const clubTier = club.tier;
                                                        if (!clubTier) return false;
                                                        
                                                        if (tier.includes('-')) {
                                                            const [min, max] = tier.split('-').map(Number);
                                                            return clubTier >= min && clubTier <= max;
                                                        }
                                                        return clubTier === Number(tier);
                                                    });
                                                    
                                                    return (
                                                        <div key={tier} className="text-xs bg-white rounded px-2 py-1 flex items-center justify-between">
                                                            <span><strong>Tier {tier}:</strong> {round}</span>
                                                            <Badge variant="outline" className="text-xs">{teamsInTier.length} clubs</Badge>
                                                        </div>
                                                    );
                                                })}
                                            </>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Button 
                                size="sm" 
                                variant="outline" 
                                className="bg-white"
                                onClick={() => {
                                    // Auto-configure based on total teams
                                    const totalTeams = season.number_of_teams || 0;
                                    const autoConfig = {};
                                    
                                    if (totalTeams <= 32) {
                                        // Small cup - everyone starts early
                                        autoConfig['1-2'] = 'Third Round';
                                        autoConfig['3-5'] = 'Second Round';
                                        autoConfig['6-10'] = 'First Round';
                                    } else if (totalTeams <= 64) {
                                        // Medium cup - FA Cup style
                                        autoConfig['1-2'] = 'Third Round';
                                        autoConfig['3-4'] = 'Second Round';
                                        autoConfig['5-7'] = 'First Round';
                                        autoConfig['8-10'] = 'Preliminary Round';
                                    } else {
                                        // Large cup - multiple qualifying rounds
                                        autoConfig['1-2'] = 'Fourth Round';
                                        autoConfig['3-4'] = 'Third Round';
                                        autoConfig['5-6'] = 'Second Round';
                                        autoConfig['7-8'] = 'First Round';
                                        autoConfig['9-10'] = 'Preliminary Round';
                                    }
                                    
                                    setEntryConfig(autoConfig);
                                    saveConfigMutation.mutate(autoConfig);
                                }}
                            >
                                Auto-Configure
                            </Button>
                            <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
                                <DialogTrigger asChild>
                                    <Button size="sm" variant="outline" className="bg-white">
                                        Manual Setup
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-xl">
                                    <DialogHeader>
                                        <DialogTitle>Configure Tier Entry Rules</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <p className="text-sm text-slate-600">
                                            Define which tier(s) of clubs enter at each round. Example: Tier 1-2 clubs enter at "Third Round", Tier 3-4 at "First Round"
                                        </p>
                                        <div className="space-y-3">
                                            {['1', '2', '3', '4', '5', '1-2', '3-4', '5-6', '7-10'].map(tierRange => (
                                                <div key={tierRange} className="flex items-center gap-2">
                                                    <Label className="w-24 text-sm">Tier {tierRange}:</Label>
                                                    <Select 
                                                        value={entryConfig[tierRange] || ''} 
                                                        onValueChange={(v) => setEntryConfig({...entryConfig, [tierRange]: v})}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="No entry" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="_none">No entry</SelectItem>
                                                            {standardRounds.map(r => (
                                                                <SelectItem key={r} value={r}>{r}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex justify-end gap-2 pt-4 border-t">
                                            <Button variant="outline" onClick={() => setIsConfigOpen(false)}>Cancel</Button>
                                            <Button 
                                                onClick={() => {
                                                    const filtered = Object.fromEntries(
                                                        Object.entries(entryConfig).filter(([_, v]) => v && v !== '_none')
                                                    );
                                                    saveConfigMutation.mutate(filtered);
                                                }}
                                                className="bg-emerald-600"
                                            >
                                                Save Entry Rules
                                            </Button>
                                        </div>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                </div>

                {/* Draw Style Badge */}
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded">
                    <span className="text-sm text-slate-600">Draw Style:</span>
                    <Badge variant="outline">
                        {cup.draw_style === 'seeded' ? '🎯 Seeded (higher tiers protected)' : '🎲 Random'}
                    </Badge>
                </div>

                {/* Round Selector */}
                <div>
                    <Label>Select Round to Draw</Label>
                    <Select value={selectedRound} onValueChange={setSelectedRound}>
                        <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Choose round..." />
                        </SelectTrigger>
                        <SelectContent>
                            {standardRounds.map(round => {
                                const matchesInRound = existingMatches.filter(m => m.round === round);
                                const hasMatches = matchesInRound.length > 0;
                                
                                return (
                                    <SelectItem key={round} value={round}>
                                        <div className="flex items-center justify-between w-full">
                                            <span>{round}</span>
                                            {hasMatches && (
                                                <Badge variant="outline" className="ml-2">
                                                    {matchesInRound.length} matches
                                                </Badge>
                                            )}
                                        </div>
                                    </SelectItem>
                                );
                            })}
                        </SelectContent>
                    </Select>
                </div>

                {/* Draw Engine */}
                {selectedRound && availableTeams.length > 0 && (
                    <Dialog open={isDrawDialogOpen} onOpenChange={setIsDrawDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
                                <Plus className="w-4 h-4 mr-2" />
                                Draw {selectedRound} ({availableTeams.length} teams)
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>{selectedRound} Draw</DialogTitle>
                            </DialogHeader>
                            <CupDrawEngine
                                availableTeams={availableTeams}
                                roundName={selectedRound}
                                drawStyle={cup.draw_style || 'random'}
                                onDrawComplete={(pairs) => createMatchesMutation.mutate(pairs)}
                            />
                        </DialogContent>
                    </Dialog>
                )}

                {/* Show available teams for selected round */}
                {selectedRound && availableTeams.length > 0 && !isDrawDialogOpen && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                        <h4 className="text-sm font-semibold mb-2 text-slate-700">
                            📋 {availableTeams.length} Teams Entering at {selectedRound}:
                        </h4>
                        <div className="max-h-60 overflow-y-auto space-y-1">
                            {availableTeams
                                .sort((a, b) => (b.tier || 999) - (a.tier || 999)) // Lowest tiers first (highest tier numbers)
                                .map(team => {
                                    const tableEntry = allLeagueTables.find(t => 
                                        (t.club_id === team.id || t.club_name === team.name) && 
                                        t.year === season.year
                                    );
                                    return (
                                        <div key={team.id} className="flex items-center gap-2 text-xs p-2 bg-white rounded">
                                            {team.logo_url && <img src={team.logo_url} alt="" className="w-5 h-5 object-contain" />}
                                            <span className="flex-1">{team.name}</span>
                                            <Badge variant="outline" className="text-xs">T{team.tier || tableEntry?.tier || '?'}</Badge>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                )}

                {selectedRound && availableTeams.length === 0 && (
                    <div className="text-center py-6 text-slate-500 bg-red-50 border border-red-200 rounded-lg">
                        <Users className="w-8 h-8 mx-auto mb-2 text-red-400" />
                        <p className="text-sm font-semibold text-red-900">No teams available for {selectedRound}</p>
                        <div className="text-xs mt-2 text-red-700 space-y-1">
                            <p>🔍 Debugging info:</p>
                            <p>• Entry rules configured: {Object.keys(entryConfig).length > 0 ? 'Yes' : 'No'}</p>
                            <p>• Total clubs in nation: {allClubs.length}</p>
                            <p>• League tables for {season.year}: {allLeagueTables.filter(t => t.year === season.year).length}</p>
                            <p>• League tables with tier field: {allLeagueTables.filter(t => t.year === season.year && t.tier).length}</p>
                            <p>• Entry config: {JSON.stringify(entryConfig)}</p>
                        </div>
                        <p className="text-xs mt-2 text-red-600">
                            {Object.keys(entryConfig).length === 0 
                                ? '⚠️ Click "Auto-Configure" above to set entry rules!' 
                                : 'Complete previous round or adjust entry rules'}
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}