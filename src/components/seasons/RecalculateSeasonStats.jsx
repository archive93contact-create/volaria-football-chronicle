import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Calculator, CheckCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

export default function RecalculateSeasonStats({ seasons, leagueTables }) {
    const [open, setOpen] = useState(false);
    const [selectedYear, setSelectedYear] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const queryClient = useQueryClient();

    // Get unique years from seasons
    const years = [...new Set(seasons.map(s => s.year))].sort((a, b) => b.localeCompare(a));

    const recalculate = async () => {
        if (!selectedYear) return;
        
        setLoading(true);
        setResult(null);

        // Get all seasons for this year (could be multiple divisions)
        const yearSeasons = seasons.filter(s => s.year === selectedYear);
        
        let totalUpdated = 0;

        for (const season of yearSeasons) {
            // Get league table entries for this specific season
            const seasonTables = leagueTables.filter(lt => 
                lt.year === selectedYear && 
                (lt.season_id === season.id || lt.division_name === season.division_name)
            );

            if (seasonTables.length === 0) continue;

            // Calculate correct games per team based on teams in THIS division
            const teamsInDivision = seasonTables.length;
            const correctGamesPerTeam = (teamsInDivision - 1) * 2;

            // Update each table entry
            for (const entry of seasonTables) {
                // Only recalculate if the played count seems wrong
                const currentPlayed = entry.played || 0;
                
                // If played is way off (more than double what it should be), recalculate
                if (currentPlayed > correctGamesPerTeam * 1.5 || currentPlayed === 0) {
                    // Calculate new stats proportionally based on correct games
                    const ratio = currentPlayed > 0 ? correctGamesPerTeam / currentPlayed : 1;
                    
                    const newWon = Math.round((entry.won || 0) * ratio);
                    const newDrawn = Math.round((entry.drawn || 0) * ratio);
                    const newLost = correctGamesPerTeam - newWon - newDrawn;
                    const newGoalsFor = Math.round((entry.goals_for || 0) * ratio);
                    const newGoalsAgainst = Math.round((entry.goals_against || 0) * ratio);
                    const newPoints = (newWon * 3) + newDrawn;

                    await base44.entities.LeagueTable.update(entry.id, {
                        played: correctGamesPerTeam,
                        won: Math.max(0, newWon),
                        drawn: Math.max(0, newDrawn),
                        lost: Math.max(0, newLost),
                        goals_for: Math.max(0, newGoalsFor),
                        goals_against: Math.max(0, newGoalsAgainst),
                        goal_difference: newGoalsFor - newGoalsAgainst,
                        points: newPoints
                    });
                    totalUpdated++;
                }
            }

            // Update season's number_of_teams if wrong
            if (season.number_of_teams !== teamsInDivision) {
                await base44.entities.Season.update(season.id, {
                    number_of_teams: teamsInDivision
                });
            }
        }

        setResult({ updated: totalUpdated });
        setLoading(false);
        queryClient.invalidateQueries(['leagueTables']);
        queryClient.invalidateQueries(['seasonTables']);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <Calculator className="w-4 h-4 mr-2" />
                    Recalculate Stats
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Recalculate Season Stats</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <p className="text-sm text-slate-600">
                        This will fix W/D/L and games played for seasons with incorrect stats 
                        (e.g., multi-division leagues that calculated games based on total league size instead of division size).
                    </p>
                    
                    <div>
                        <label className="text-sm font-medium">Select Season Year</label>
                        <Select value={selectedYear} onValueChange={setSelectedYear}>
                            <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Choose a season..." />
                            </SelectTrigger>
                            <SelectContent>
                                {years.map(year => (
                                    <SelectItem key={year} value={year}>{year}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {result && (
                        <div className="p-3 bg-green-50 rounded-lg flex items-center gap-2 text-green-700">
                            <CheckCircle className="w-4 h-4" />
                            <span>Updated {result.updated} table entries</span>
                        </div>
                    )}

                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setOpen(false)}>
                            Close
                        </Button>
                        <Button 
                            onClick={recalculate} 
                            disabled={!selectedYear || loading}
                            className="bg-emerald-600 hover:bg-emerald-700"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Recalculating...
                                </>
                            ) : (
                                <>
                                    <Calculator className="w-4 h-4 mr-2" />
                                    Recalculate
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}