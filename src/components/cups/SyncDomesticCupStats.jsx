import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RefreshCw, Loader2, Trophy, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function SyncDomesticCupStats({ season, cup, clubs, onComplete }) {
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [results, setResults] = useState(null);

    const updateClubMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.Club.update(id, data),
    });

    const updateSeasonMutation = useMutation({
        mutationFn: (data) => base44.entities.DomesticCupSeason.update(season.id, data),
    });

    const syncStats = async () => {
        setSyncing(true);
        setResults(null);

        try {
            const updates = {
                championUpdated: false,
                runnerUpUpdated: false,
                errors: []
            };

            // Update champion
            if (season.champion_name) {
                const championClub = clubs.find(c => c.name?.toLowerCase().trim() === season.champion_name?.toLowerCase().trim());
                if (championClub) {
                    const currentTitles = championClub.domestic_cup_titles || 0;
                    const currentYears = championClub.domestic_cup_title_years || '';
                    const yearsArray = currentYears ? currentYears.split(',').map(y => y.trim()) : [];
                    
                    if (!yearsArray.includes(season.year)) {
                        yearsArray.push(season.year);
                        const updateData = {
                            domestic_cup_titles: currentTitles + 1,
                            domestic_cup_title_years: yearsArray.sort().join(', ')
                        };
                        // Only update best finish if this is their first title or better than existing
                        if (!championClub.domestic_cup_best_finish || championClub.domestic_cup_best_finish !== 'Winner') {
                            updateData.domestic_cup_best_finish = 'Winner';
                            updateData.domestic_cup_best_finish_year = season.year;
                        }
                        await updateClubMutation.mutateAsync({
                            id: championClub.id,
                            data: updateData
                        });
                        updates.championUpdated = true;
                    }
                } else {
                    updates.errors.push(`Champion "${season.champion_name}" not found in clubs`);
                }
            }

            // Update runner-up
            if (season.runner_up) {
                const runnerUpClub = clubs.find(c => c.name?.toLowerCase().trim() === season.runner_up?.toLowerCase().trim());
                if (runnerUpClub) {
                    const currentRunnerUps = runnerUpClub.domestic_cup_runner_up || 0;
                    const updateData = {
                        domestic_cup_runner_up: currentRunnerUps + 1
                    };
                    // Update best finish if Final is better than current or not set
                    const finishOrder = ['Winner', 'Final', 'Semi-final', 'Quarter-final'];
                    const currentBest = runnerUpClub.domestic_cup_best_finish;
                    if (!currentBest || finishOrder.indexOf('Final') < finishOrder.indexOf(currentBest)) {
                        updateData.domestic_cup_best_finish = 'Final';
                        updateData.domestic_cup_best_finish_year = season.year;
                    }
                    await updateClubMutation.mutateAsync({
                        id: runnerUpClub.id,
                        data: updateData
                    });
                    updates.runnerUpUpdated = true;
                } else {
                    updates.errors.push(`Runner-up "${season.runner_up}" not found in clubs`);
                }
            }

            // Update season's best finish tracking if needed
            if (!season.champion_name && season.runner_up) {
                await updateSeasonMutation.mutateAsync({
                    champion_name: null,
                    runner_up: season.runner_up
                });
            }

            setResults(updates);

            // Invalidate queries
            queryClient.invalidateQueries(['allClubs']);
            queryClient.invalidateQueries(['clubs']);
            queryClient.invalidateQueries(['cupSeason']);

            if (updates.championUpdated || updates.runnerUpUpdated) {
                toast.success('Cup stats synchronized successfully');
            } else if (updates.errors.length > 0) {
                toast.error('Some stats could not be synchronized');
            } else {
                toast.info('Stats already up to date');
            }

            if (onComplete) onComplete();
        } catch (error) {
            toast.error('Failed to sync stats');
            console.error('Sync error:', error);
        } finally {
            setSyncing(false);
        }
    };

    return (
        <>
            <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsOpen(true)}
            >
                <RefreshCw className="w-4 h-4 mr-1" />
                Sync Stats
            </Button>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Sync Cup Stats to Clubs</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <p className="text-sm text-slate-600">
                            This will update the trophy counts for the champion and runner-up clubs in the {cup.name} {season.year}.
                        </p>

                        {season.champion_name && (
                            <div className="p-3 bg-emerald-50 rounded-lg">
                                <div className="flex items-center gap-2 text-sm">
                                    <Trophy className="w-4 h-4 text-emerald-600" />
                                    <span className="font-medium">Champion:</span>
                                    <span>{season.champion_name}</span>
                                </div>
                            </div>
                        )}

                        {season.runner_up && (
                            <div className="p-3 bg-slate-50 rounded-lg">
                                <div className="flex items-center gap-2 text-sm">
                                    <Trophy className="w-4 h-4 text-slate-400" />
                                    <span className="font-medium">Runner-up:</span>
                                    <span>{season.runner_up}</span>
                                </div>
                            </div>
                        )}

                        {results && (
                            <div className="space-y-2">
                                {results.championUpdated && (
                                    <div className="flex items-center gap-2 text-sm text-emerald-600">
                                        <CheckCircle className="w-4 h-4" />
                                        <span>Champion trophy count updated</span>
                                    </div>
                                )}
                                {results.runnerUpUpdated && (
                                    <div className="flex items-center gap-2 text-sm text-emerald-600">
                                        <CheckCircle className="w-4 h-4" />
                                        <span>Runner-up count updated</span>
                                    </div>
                                )}
                                {results.errors.length > 0 && (
                                    <div className="space-y-1">
                                        {results.errors.map((error, idx) => (
                                            <div key={idx} className="text-sm text-red-600">
                                                {error}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex justify-end gap-2 pt-4 border-t">
                            <Button variant="outline" onClick={() => setIsOpen(false)}>
                                Close
                            </Button>
                            <Button 
                                onClick={syncStats} 
                                disabled={syncing || !season.champion_name}
                                className="bg-emerald-600 hover:bg-emerald-700"
                            >
                                {syncing ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Syncing...</>
                                ) : (
                                    <><RefreshCw className="w-4 h-4 mr-2" /> Sync Now</>
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}