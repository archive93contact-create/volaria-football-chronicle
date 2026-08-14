import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { backfillSeason, normalizeTables, checkConsistency } from '@/lib/matchBackfiller';
import { Database, Loader2, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/**
 * Reusable button that backfills Match records from a season's LeagueTable data.
 * Works in two modes:
 * 1. tableRows + seasonId + leagueId + year provided directly (e.g. EditSeasonTable)
 * 2. fetchFromDB=true — fetches LeagueTable records for the season from the DB (e.g. PostSeasonFixturePrompt)
 */
export default function BackfillMatchesButton({ tableRows, seasonId, leagueId, year, fetchFromDB = false, onDone, variant = "outline", size = "default", label = "Backfill Matches" }) {
    const [running, setRunning] = useState(false);
    const [result, setResult] = useState(null);
    const queryClient = useQueryClient();

    const handleBackfill = async () => {
        setRunning(true);
        setResult(null);
        try {
            let rows = tableRows;
            if (fetchFromDB) {
                const fetched = await base44.entities.LeagueTable.filter({ league_id: leagueId, year });
                rows = fetched.sort((a, b) => (a.position || 99) - (b.position || 99));
            }

            if (!rows || rows.length < 2) {
                toast.error('Need at least 2 clubs with table data');
                setRunning(false);
                return;
            }

            const validRows = rows.filter(r => r.club_name && r.club_id);
            if (validRows.length < 2) {
                toast.error('Table rows missing club IDs — save the table first so clubs are linked');
                setRunning(false);
                return;
            }

            // Check if any stats are filled
            const hasStats = validRows.some(r => (r.won || 0) > 0 || (r.drawn || 0) > 0 || (r.lost || 0) > 0);
            if (!hasStats) {
                toast.error('No stats in table yet — fill in W/D/L/GF/GA before backfilling');
                setRunning(false);
                return;
            }

            // Normalize the tables so totals are consistent
            const { rows: normalized } = normalizeTables(validRows);

            // Delete existing matches for this season
            const existing = await base44.entities.Match.filter({ season_id: seasonId });
            if (existing.length > 0) {
                for (const m of existing) {
                    await base44.entities.Match.delete(m.id);
                }
            }

            // Run the backfill
            const backfillResult = backfillSeason(normalized, seasonId, leagueId, year);
            if (!backfillResult.ok) {
                toast.error(backfillResult.error || 'Backfill failed');
                setRunning(false);
                return;
            }

            // Save matches to DB
            await base44.entities.Match.bulkCreate(backfillResult.matchRecords);

            queryClient.invalidateQueries({ queryKey: ['matches'] });
            queryClient.invalidateQueries({ queryKey: ['allMatches'] });

            const { stats } = backfillResult;
            const isPerfect = stats.resultDeficit === 0 && stats.goalError === 0;
            const msg = isPerfect
                ? `✅ ${stats.matches} matches generated — exact match to table`
                : `⚠️ ${stats.matches} matches generated — W/D/L deficit: ${stats.resultDeficit}, goal error: ${stats.goalError}`;

            toast.success(msg);
            setResult({ ...stats, isPerfect });
            if (onDone) onDone(backfillResult);
        } catch (err) {
            console.error('Backfill error:', err);
            toast.error(`Backfill failed: ${err.message || err}`);
        } finally {
            setRunning(false);
        }
    };

    return (
        <div className="flex flex-col gap-1">
            <Button
                onClick={handleBackfill}
                disabled={running || !seasonId || !leagueId || !year}
                variant={variant}
                size={size}
            >
                {running ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Backfilling...</>
                ) : result?.isPerfect ? (
                    <><CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600" /> {label} — Done</>
                ) : result ? (
                    <><AlertTriangle className="w-4 h-4 mr-2 text-amber-500" /> {label} — Partial</>
                ) : (
                    <><Database className="w-4 h-4 mr-2" /> {label}</>
                )}
            </Button>
            {result && !result.isPerfect && (
                <span className="text-xs text-amber-600">
                    {result.matches} matches · {result.resultDeficit} result gaps · {result.goalError} goal gaps
                </span>
            )}
            {result?.isPerfect && (
                <span className="text-xs text-emerald-600">
                    {result.matches} matches · exact table match
                </span>
            )}
        </div>
    );
}