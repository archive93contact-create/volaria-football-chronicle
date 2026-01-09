import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Shield, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

export default function PreserveHistoricalTiers({ league, seasons = [], leagueTables = [] }) {
    const [open, setOpen] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [results, setResults] = useState({ updated: 0 });
    const queryClient = useQueryClient();

    const handlePreserve = async () => {
        setProcessing(true);
        const currentTier = league.tier || 1;
        let updated = 0;

        // Update seasons without tier set
        const seasonsToUpdate = seasons.filter(s => !s.tier);
        setProgress({ current: 0, total: seasonsToUpdate.length + leagueTables.filter(t => !t.tier).length });

        for (const season of seasonsToUpdate) {
            await base44.entities.Season.update(season.id, { tier: currentTier });
            updated++;
            setProgress(prev => ({ ...prev, current: prev.current + 1 }));
        }

        // Update league tables without tier set (in small batches)
        const tablesToUpdate = leagueTables.filter(t => !t.tier);
        const batchSize = 5;
        
        for (let i = 0; i < tablesToUpdate.length; i += batchSize) {
            const batch = tablesToUpdate.slice(i, i + batchSize);
            await Promise.all(batch.map(t => base44.entities.LeagueTable.update(t.id, { tier: currentTier })));
            updated += batch.length;
            setProgress(prev => ({ ...prev, current: prev.current + batch.length }));
        }

        setResults({ updated });
        setProcessing(false);
        queryClient.invalidateQueries({ queryKey: ['leagueSeasons'] });
        queryClient.invalidateQueries({ queryKey: ['leagueTables'] });
    };

    const needsPreservation = seasons.some(s => !s.tier) || leagueTables.some(t => !t.tier);

    if (!needsPreservation) return null;

    return (
        <>
            <Button 
                onClick={() => setOpen(true)}
                variant="outline"
                className="border-amber-300 text-amber-700 hover:bg-amber-50"
            >
                <Shield className="w-4 h-4 mr-2" />
                Preserve Historical Tiers
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Shield className="w-5 h-5 text-amber-500" />
                            Preserve Historical Tier Data
                        </DialogTitle>
                    </DialogHeader>

                    <div className="py-4 space-y-4">
                        {!processing && results.updated === 0 && (
                            <>
                                <p className="text-slate-600">
                                    This will lock in the current tier ({league.tier || 1}) for all historical seasons and league table entries that don't have a tier saved yet.
                                </p>
                                <p className="text-sm text-slate-500">
                                    <strong>Why?</strong> If you change this league's tier in the future, the historical data will still show the correct tier it was at the time.
                                </p>
                                <div className="p-3 bg-amber-50 rounded-lg text-sm text-amber-800">
                                    <p className="font-semibold mb-1">To preserve:</p>
                                    <ul className="list-disc list-inside space-y-1">
                                        <li>{seasons.filter(s => !s.tier).length} seasons</li>
                                        <li>{leagueTables.filter(t => !t.tier).length} league table entries</li>
                                    </ul>
                                </div>
                                <Button onClick={handlePreserve} className="w-full bg-amber-600 hover:bg-amber-700">
                                    <Shield className="w-4 h-4 mr-2" />
                                    Preserve Tier Data
                                </Button>
                            </>
                        )}

                        {processing && (
                            <div className="text-center py-6">
                                <Loader2 className="w-8 h-8 animate-spin text-amber-600 mx-auto mb-4" />
                                <p className="font-medium">Preserving historical data...</p>
                                <p className="text-sm text-slate-500">
                                    {progress.current} of {progress.total} entries
                                </p>
                                <div className="w-full bg-slate-200 rounded-full h-2 mt-4">
                                    <div 
                                        className="bg-amber-600 h-2 rounded-full transition-all"
                                        style={{ width: `${(progress.current / progress.total) * 100}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {!processing && results.updated > 0 && (
                            <div className="text-center py-4">
                                <Check className="w-12 h-12 text-green-500 mx-auto mb-4" />
                                <p className="font-medium text-green-700">Preservation Complete!</p>
                                <p className="text-slate-600 mt-2">
                                    Updated <strong>{results.updated}</strong> entries with tier {league.tier || 1}
                                </p>
                                <p className="text-sm text-slate-500 mt-2">
                                    Historical data is now locked in. You can safely change this league's tier without affecting past records.
                                </p>
                                <Button onClick={() => { setOpen(false); setResults({ updated: 0 }); }} className="mt-4">
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