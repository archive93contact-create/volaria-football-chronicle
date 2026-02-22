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
    allLeagueTables = [],
    leagues = []
}) {
    const queryClient = useQueryClient();
    const [selectedRound, setSelectedRound] = useState('');
    const [isDrawDialogOpen, setIsDrawDialogOpen] = useState(false);

    // Define standard cup rounds (FA Cup style) - MUST match EnhancedBracketView round order
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
        'Round of 128',
        'Round of 64',
        'Round of 32',
        'Round of 16',
        'Quarter-final',
        'Semi-final',
        'Final'
    ];

    // Get all clubs with their tier from league tables for this season
    const clubsWithTier = useMemo(() => {
        return allClubs.map(club => {
            const tableEntry = allLeagueTables.find(t => 
                (t.club_id === club.id || t.club_name?.toLowerCase().trim() === club.name?.toLowerCase().trim()) && 
                t.year === season.year
            );
            if (!tableEntry) return { ...club, tier: null, position: null };
            
            // Get tier from table entry first, then fall back to league tier
            const tier = tableEntry.tier || (() => {
                const league = leagues.find(l => l.id === tableEntry.league_id);
                return league?.tier || null;
            })();
            
            return {
                ...club,
                tier,
                position: tableEntry?.position
            };
        }).filter(club => club.tier !== null); // Only include clubs with tier data for this season
    }, [allClubs, allLeagueTables, leagues, season.year]);

    // Get teams that have entered - all clubs from league tables for this season
    const getEligibleTeamsForRound = (roundName) => {
        return clubsWithTier.sort((a, b) => (a.tier || 999) - (b.tier || 999));
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

        // For subsequent rounds, use winners from previous round
        const previousRoundIndex = standardRounds.indexOf(selectedRound) - 1;
        const previousRound = standardRounds[previousRoundIndex];
        
        const previousMatches = existingMatches.filter(m => m.round === previousRound);
        const combined = previousMatches
            .filter(m => m.winner_id)
            .map(m => clubsWithTier.find(c => c.id === m.winner_id))
            .filter(Boolean);

        // Remove teams already in matches for this round
        const alreadyDrawn = new Set([
            ...existingMatchesInRound.map(m => m.home_club_id),
            ...existingMatchesInRound.map(m => m.away_club_id)
        ].filter(Boolean));

        return combined.filter(t => !alreadyDrawn.has(t.id));
    }, [selectedRound, existingMatches, clubsWithTier]);



    // Create matches from drawn pairs
    const createMatchesMutation = useMutation({
        mutationFn: async (pairs) => {
            // Separate actual matches from byes
            const actualMatches = pairs.filter(p => !p.isBye);
            const byeTeams = pairs.filter(p => p.isBye).map(p => p.home);

            // Create matches (excluding byes)
            const matches = actualMatches.map((pair, idx) => ({
                season_id: season.id,
                round: selectedRound,
                match_number: idx + 1,
                home_club_id: pair.home.id,
                home_club_name: pair.home.name,
                away_club_id: pair.away.id,
                away_club_name: pair.away.name,
                home_score: null,
                away_score: null,
                winner_id: null,
                winner: null
            }));

            if (matches.length > 0) {
                await base44.entities.DomesticCupMatch.bulkCreate(matches);
            }

            // Auto-advance bye teams to next round (if not final)
            if (byeTeams.length > 0 && selectedRound !== 'Final') {
                const nextRoundIndex = standardRounds.indexOf(selectedRound) + 1;
                const nextRound = standardRounds[nextRoundIndex];
                
                if (nextRound) {
                    // Create placeholder matches in next round with byes as winners
                    const byeMatches = byeTeams.map((team, idx) => ({
                        season_id: season.id,
                        round: nextRound,
                        match_number: idx + 1,
                        home_club_id: team.id,
                        home_club_name: team.name,
                        away_club_id: null,
                        away_club_name: 'TBD',
                        home_score: null,
                        away_score: null,
                        winner_id: null,
                        winner: null,
                        notes: `Advanced via bye from ${selectedRound}`
                    }));
                    
                    await base44.entities.DomesticCupMatch.bulkCreate(byeMatches);
                }
            }
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['cupMatches', season.id] });
            await queryClient.refetchQueries({ queryKey: ['cupMatches', season.id] });
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
                {/* Clubs Available */}
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <div className="flex items-start gap-2">
                        <Users className="w-4 h-4 text-emerald-600 mt-0.5" />
                        <div className="flex-1">
                            <h4 className="font-semibold text-emerald-900 text-sm">📋 Clubs from League Tables ({season.year})</h4>
                            <p className="text-xs text-emerald-700 mt-1">
                                {clubsWithTier.length} clubs found with tier data for {season.year}
                            </p>
                            {clubsWithTier.length > 0 && (
                                <div className="mt-2 text-xs bg-white rounded px-2 py-1">
                                    {(() => {
                                        const tierCounts = {};
                                        clubsWithTier.forEach(club => {
                                            tierCounts[club.tier] = (tierCounts[club.tier] || 0) + 1;
                                        });
                                        return Object.entries(tierCounts)
                                            .sort((a, b) => Number(a[0]) - Number(b[0]))
                                            .map(([tier, count]) => (
                                                <span key={tier} className="mr-3">
                                                    <strong>Tier {tier}:</strong> {count}
                                                </span>
                                            ));
                                    })()}
                                </div>
                            )}
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
                            <p>• Total clubs in nation: {allClubs.length}</p>
                            <p>• League tables for {season.year}: {allLeagueTables.filter(t => t.year === season.year).length}</p>
                            <p>• Clubs with tier data: {clubsWithTier.length}</p>
                        </div>
                        <p className="text-xs mt-2 text-red-600">
                            {clubsWithTier.length === 0 
                                ? '⚠️ No clubs found in league tables for this year. Make sure league tables exist for the selected leagues.' 
                                : 'All teams have already been drawn or eliminated. Complete previous rounds first.'}
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}