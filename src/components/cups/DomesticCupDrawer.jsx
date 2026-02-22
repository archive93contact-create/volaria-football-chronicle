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
        const entryRules = cup.entry_rounds_by_tier || {};
        
        // Get teams that should enter at this round or earlier
        const eligibleTiers = Object.entries(entryRules)
            .filter(([tierRange, entryRound]) => {
                const roundIndex = standardRounds.indexOf(entryRound);
                const currentIndex = standardRounds.indexOf(roundName);
                return roundIndex <= currentIndex;
            })
            .map(([tierRange]) => tierRange);

        // Parse tier ranges (e.g., "1-2" or "3-5" or "1")
        const teams = allClubs.filter(club => {
            const clubTier = club.tier || 999;
            
            return eligibleTiers.some(range => {
                if (range.includes('-')) {
                    const [min, max] = range.split('-').map(Number);
                    return clubTier >= min && clubTier <= max;
                } else {
                    return clubTier === Number(range);
                }
            });
        });

        // Add club data from league tables
        return teams.map(club => {
            const tableEntry = allLeagueTables.find(t => 
                t.club_id === club.id && t.year === season.year
            );
            return {
                ...club,
                position: tableEntry?.position
            };
        }).sort((a, b) => (a.tier || 999) - (b.tier || 999));
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