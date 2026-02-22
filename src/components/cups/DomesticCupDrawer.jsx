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
                {/* Entry Configuration */}
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-start justify-between">
                        <div>
                            <h4 className="font-semibold text-amber-900 text-sm">⚙️ Tier Entry Configuration</h4>
                            <p className="text-xs text-amber-700 mt-1">
                                {Object.keys(entryConfig).length > 0 
                                    ? `${Object.keys(entryConfig).length} tier rule(s) configured`
                                    : 'No entry rules set - configure which tiers enter at which rounds'}
                            </p>
                        </div>
                        <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm" variant="outline" className="bg-white">
                                    Configure Entry
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

                {selectedRound && availableTeams.length === 0 && (
                    <div className="text-center py-6 text-slate-500 bg-slate-50 rounded-lg">
                        <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="text-sm">No teams available for {selectedRound}</p>
                        <p className="text-xs mt-1">Complete previous round or check entry rules</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}