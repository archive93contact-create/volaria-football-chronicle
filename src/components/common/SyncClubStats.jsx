import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

export default function SyncClubStats({ clubs = [], leagueTables = [], leagues = [] }) {
    const [open, setOpen] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0, currentClub: '' });
    const [results, setResults] = useState({ updated: 0, skipped: 0 });
    const queryClient = useQueryClient();

    const handleSync = async () => {
        setProcessing(true);
        setProgress({ current: 0, total: clubs.length, currentClub: '' });
        
        let updated = 0;
        let skipped = 0;

        for (let i = 0; i < clubs.length; i++) {
            const club = clubs[i];
            setProgress({ current: i + 1, total: clubs.length, currentClub: club.name });

            // Get all league table entries for this club
            const clubTables = leagueTables.filter(t => 
                t.club_id === club.id || 
                t.club_name?.toLowerCase() === club.name?.toLowerCase()
            );

            if (clubTables.length === 0) {
                skipped++;
                continue;
            }

            // Calculate totals from league tables - preserve existing data
            const currentStats = {
                total_wins: club.total_wins || 0,
                total_draws: club.total_draws || 0,
                total_losses: club.total_losses || 0,
                total_goals_scored: club.total_goals_scored || 0,
                total_goals_conceded: club.total_goals_conceded || 0,
                seasons_played: club.seasons_played || 0,
                seasons_top_flight: club.seasons_top_flight || 0,
                promotions: club.promotions || 0,
                relegations: club.relegations || 0,
                league_titles: club.league_titles || 0,
                title_years: club.title_years || ''
            };

            // Calculate this batch's stats
            let batchWins = 0, batchDraws = 0, batchLosses = 0;
            let batchGF = 0, batchGA = 0;
            let batchSeasons = 0;
            let batchTopFlightSeasons = 0;
            let batchPromotions = 0, batchRelegations = 0;
            let batchTitles = 0;
            const batchTitleYears = [];

            for (const table of clubTables) {
                if (table.played > 0 || table.won > 0) {
                    batchWins += table.won || 0;
                    batchDraws += table.drawn || 0;
                    batchLosses += table.lost || 0;
                    batchGF += table.goals_for || 0;
                    batchGA += table.goals_against || 0;
                    batchSeasons++;

                    const tableLeague = leagues.find(l => l.id === table.league_id);
                    if (tableLeague?.tier === 1) {
                        batchTopFlightSeasons++;
                        if (table.status === 'champion' || table.position === 1) {
                            batchTitles++;
                            batchTitleYears.push(table.year);
                        }
                    }
                    if (table.status === 'promoted' || table.status === 'playoff_winner') {
                        batchPromotions++;
                    }
                    if (table.status === 'relegated') {
                        batchRelegations++;
                    }
                }
            }

            // Merge with existing stats (don't overwrite, add to them)
            const existingTitleYears = currentStats.title_years ? currentStats.title_years.split(',').map(y => y.trim()) : [];
            const allTitleYears = [...new Set([...existingTitleYears, ...batchTitleYears])].filter(Boolean).sort();

            await base44.entities.Club.update(club.id, {
                total_wins: currentStats.total_wins + batchWins,
                total_draws: currentStats.total_draws + batchDraws,
                total_losses: currentStats.total_losses + batchLosses,
                total_goals_scored: currentStats.total_goals_scored + batchGF,
                total_goals_conceded: currentStats.total_goals_conceded + batchGA,
                seasons_played: currentStats.seasons_played + batchSeasons,
                seasons_top_flight: currentStats.seasons_top_flight + batchTopFlightSeasons,
                league_titles: currentStats.league_titles + batchTitles,
                title_years: allTitleYears.join(', '),
                promotions: currentStats.promotions + batchPromotions,
                relegations: currentStats.relegations + batchRelegations
            });
            updated++;
        }

        setResults({ updated, skipped });
        setProcessing(false);
        queryClient.invalidateQueries(['clubs']);
        queryClient.invalidateQueries(['nationClubs']);
        queryClient.invalidateQueries(['club']);
    };

    return (
        <>
            <Button 
                onClick={() => setOpen(true)}
                variant="outline"
                className="border-blue-300 text-blue-700 hover:bg-blue-50"
            >
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync Club Stats
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <RefreshCw className="w-5 h-5 text-blue-500" />
                            Sync Club All-Time Statistics
                        </DialogTitle>
                    </DialogHeader>

                    <div className="py-4 space-y-4">
                        {!processing && results.updated === 0 && (
                            <>
                                <p className="text-slate-600">
                                    This will recalculate all club statistics (W/D/L/GF/GA, seasons played, titles, promotions, relegations) from the league table data.
                                </p>
                                <p className="text-sm text-slate-500">
                                    <strong>{clubs.length}</strong> clubs will be updated based on <strong>{leagueTables.length}</strong> league table entries.
                                </p>
                                <div className="p-3 bg-amber-50 rounded-lg text-sm text-amber-800">
                                    ⚠️ This will overwrite existing club statistics. Make sure your league tables are complete and accurate.
                                </div>
                                <Button onClick={handleSync} className="w-full bg-blue-600 hover:bg-blue-700">
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Sync All Club Stats
                                </Button>
                            </>
                        )}

                        {processing && (
                            <div className="text-center py-6">
                                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                                <p className="font-medium">Updating {progress.currentClub}...</p>
                                <p className="text-sm text-slate-500">
                                    {progress.current} of {progress.total} clubs
                                </p>
                                <div className="w-full bg-slate-200 rounded-full h-2 mt-4">
                                    <div 
                                        className="bg-blue-600 h-2 rounded-full transition-all"
                                        style={{ width: `${(progress.current / progress.total) * 100}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {!processing && results.updated > 0 && (
                            <div className="text-center py-4">
                                <Check className="w-12 h-12 text-green-500 mx-auto mb-4" />
                                <p className="font-medium text-green-700">Sync Complete!</p>
                                <p className="text-slate-600 mt-2">
                                    Updated <strong>{results.updated}</strong> clubs
                                    {results.skipped > 0 && <span> ({results.skipped} skipped - no table data)</span>}
                                </p>
                                <Button onClick={() => { setOpen(false); setResults({ updated: 0, skipped: 0 }); }} className="mt-4">
                                    Done
                                </Button>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}