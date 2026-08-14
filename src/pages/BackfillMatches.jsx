import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Loader2, Zap, CheckCircle2, AlertTriangle, Database, ShieldAlert, RefreshCw, ListChecks } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import PageHeader from '@/components/common/PageHeader';
import AdminOnly, { useIsAdmin } from '@/components/common/AdminOnly';
import { backfillSeason, normalizeTables, checkConsistency } from '@/lib/matchBackfiller';

export default function BackfillMatches() {
    const { isAdmin, isLoading: authLoading } = useIsAdmin();
    const queryClient = useQueryClient();
    const [selected, setSelected] = useState(new Set());
    const [processing, setProcessing] = useState(false);
    const [log, setLog] = useState([]);
    const [progress, setProgress] = useState({ done: 0, total: 0 });

    const { data: seasons = [], isLoading: seasonsLoading } = useQuery({
        queryKey: ['allSeasonsBackfill'],
        queryFn: () => base44.entities.Season.list('-year', 500),
    });

    const { data: leagues = [] } = useQuery({
        queryKey: ['allLeaguesBackfill'],
        queryFn: () => base44.entities.League.list('name', 500),
    });

    const { data: leagueTables = [], isLoading: tablesLoading } = useQuery({
        queryKey: ['allTablesBackfill'],
        queryFn: () => base44.entities.LeagueTable.list('-year', 2000),
    });

    const { data: allMatches = [] } = useQuery({
        queryKey: ['allMatchesBackfill'],
        queryFn: () => base44.entities.Match.list('-year', 5000),
    });

    const leagueMap = useMemo(() => Object.fromEntries(leagues.map(l => [l.id, l])), [leagues]);
    const matchesBySeason = useMemo(() => {
        const map = {};
        allMatches.forEach(m => { map[m.season_id] = (map[m.season_id] || 0) + 1; });
        return map;
    }, [allMatches]);

    const seasonRows = useMemo(() => {
        return seasons.map(season => {
            const league = leagueMap[season.league_id];
            const tables = leagueTables.filter(t => t.league_id === season.league_id && t.year === season.year);
            const teamCount = tables.filter(t => t.club_id).length;
            const existingMatches = matchesBySeason[season.id] || 0;
            const expectedMatches = teamCount >= 2 ? teamCount * (teamCount - 1) * ((tables[0]?.played || 0) > (teamCount - 1) ? 2 : 1) / 2 : 0;
            const consistency = checkConsistency(tables);
            return {
                season, league, tables, teamCount, existingMatches, expectedMatches,
                hasTableData: teamCount >= 2,
                ready: teamCount >= 2,
                consistency,
            };
        }).sort((a, b) => (b.season.year || '').localeCompare(a.season.year || ''));
    }, [seasons, leagueMap, leagueTables, matchesBySeason]);

    const eligibleSeasons = seasonRows.filter(r => r.ready);
    const seasonsMissingMatches = eligibleSeasons.filter(r => r.existingMatches === 0);

    const toggleSelect = (seasonId) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(seasonId)) next.delete(seasonId);
            else next.add(seasonId);
            return next;
        });
    };

    const selectAllMissing = () => {
        setSelected(new Set(seasonsMissingMatches.map(r => r.season.id)));
    };

    const clearSelection = () => setSelected(new Set());

    const processSeason = async (row) => {
        const { season, league, tables } = row;
        // Normalize tables first so totals are consistent
        const { rows: normalized, adjustments } = normalizeTables(tables);
        let normalizedCount = adjustments.length;

        // Update league table records if any adjustments were made
        if (normalizedCount > 0) {
            for (const norm of normalized) {
                const orig = tables.find(t => t.id === norm.id);
                if (!orig) continue;
                await base44.entities.LeagueTable.update(orig.id, {
                    won: norm.won,
                    drawn: norm.drawn,
                    lost: norm.lost,
                    goals_for: norm.goals_for,
                    goals_against: norm.goals_against,
                    goal_difference: norm.goal_difference,
                    points: norm.points,
                });
            }
        }

        const result = backfillSeason(normalized, season.id, season.league_id, season.year);
        if (!result.ok) {
            return { ok: false, label: `${league?.name || '?'} ${season.year}`, error: result.error };
        }
        // Delete existing matches for this season first (if any)
        if (row.existingMatches > 0) {
            try {
                await base44.entities.Match.deleteMany({ season_id: season.id });
            } catch (e) { /* may not have any */ }
        }
        await base44.entities.Match.bulkCreate(result.matchRecords);
        const perfect = result.stats.mismatches.length === 0 && result.stats.resultDeficit === 0 && result.stats.goalError === 0;
        return {
            ok: true,
            label: `${league?.name || '?'} ${season.year}`,
            stats: result.stats,
            perfect,
            normalizedCount,
        };
    };

    const handleRun = async () => {
        const rows = eligibleSeasons.filter(r => selected.has(r.season.id));
        if (rows.length === 0) return;
        setProcessing(true);
        setLog([]);
        setProgress({ done: 0, total: rows.length });

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const entry = { label: `${row.league?.name || '?'} ${row.season.year}`, status: 'processing' };
            setLog(prev => [...prev, entry]);
            try {
                const res = await processSeason(row);
                setLog(prev => {
                    const updated = [...prev];
                    updated[updated.length - 1] = {
                        label: res.label,
                        status: res.ok ? (res.perfect ? 'perfect' : 'partial') : 'error',
                        details: res.ok ? res.stats : res.error,
                    };
                    return updated;
                });
            } catch (err) {
                setLog(prev => {
                    const updated = [...prev];
                    updated[updated.length - 1] = { label: entry.label, status: 'error', details: err.message };
                    return updated;
                });
            }
            setProgress({ done: i + 1, total: rows.length });
        }

        queryClient.invalidateQueries({ queryKey: ['allMatchesBackfill'] });
        queryClient.invalidateQueries({ queryKey: ['allMatches'] });
        setSelected(new Set());
        setProcessing(false);
    };

    if (authLoading || seasonsLoading || tablesLoading) {
        return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;
    }

    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Card className="max-w-md">
                    <CardContent className="text-center py-8">
                        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <h2 className="text-xl font-bold mb-2">Admin Access Required</h2>
                        <p className="text-slate-500 mb-4">Only admins can backfill match data.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <PageHeader
                title="Backfill Historic Matches"
                subtitle="Generate fixtures & results to match existing league tables"
                breadcrumbs={[{ label: 'Home', url: createPageUrl('Home') }, { label: 'Backfill Matches' }]}
            />

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                <AdminOnly>
                    <Card className="border-0 shadow-sm bg-emerald-50/50">
                        <CardContent className="pt-6">
                            <div className="flex items-start gap-3">
                                <Database className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                                <div className="text-sm text-slate-600 space-y-1">
                                    <p>This tool generates a full round-robin fixture list for each season and assigns results and scorelines that <strong>mathematically reproduce</strong> the final league table — wins, draws, losses, points, goals for and against all match the recorded standings.</p>
                                    <p className="text-slate-500">Deterministic algorithm (no AI needed). Select seasons below and run. Seasons with existing matches will have them replaced.</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Controls */}
                    <div className="flex flex-wrap items-center gap-3">
                        <Button onClick={selectAllMissing} variant="outline" size="sm" disabled={processing}>
                            <ListChecks className="w-4 h-4 mr-2" />
                            Select all missing ({seasonsMissingMatches.length})
                        </Button>
                        <Button onClick={clearSelection} variant="ghost" size="sm" disabled={processing || selected.size === 0}>
                            Clear selection
                        </Button>
                        <div className="ml-auto flex items-center gap-3">
                            {selected.size > 0 && <span className="text-sm text-slate-500">{selected.size} season{selected.size !== 1 ? 's' : ''} selected</span>}
                            <Button onClick={handleRun} disabled={processing || selected.size === 0} className="bg-emerald-600 hover:bg-emerald-700">
                                {processing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</> : <><Zap className="w-4 h-4 mr-2" /> Backfill Selected</>}
                            </Button>
                        </div>
                    </div>

                    {/* Progress */}
                    {processing && progress.total > 0 && (
                        <div className="space-y-1">
                            <div className="flex justify-between text-sm text-slate-500">
                                <span>Processing seasons...</span>
                                <span>{progress.done} / {progress.total}</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                                <div className="bg-emerald-600 h-full transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
                            </div>
                        </div>
                    )}

                    {/* Log */}
                    {log.length > 0 && (
                        <Card className="border-0 shadow-sm">
                            <CardHeader><CardTitle className="text-base">Processing Log</CardTitle></CardHeader>
                            <CardContent className="space-y-1.5 max-h-72 overflow-y-auto">
                                {log.map((entry, i) => (
                                    <div key={i} className="flex items-center gap-2 text-sm py-1 border-b border-slate-100 last:border-0">
                                        {entry.status === 'processing' && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
                                        {entry.status === 'perfect' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                                        {entry.status === 'partial' && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                                        {entry.status === 'error' && <AlertTriangle className="w-4 h-4 text-red-500" />}
                                        <span className="font-medium text-slate-700">{entry.label}</span>
                                        {entry.status === 'perfect' && <span className="text-emerald-600 text-xs">{entry.details?.matches} matches — exact match</span>}
                                        {entry.status === 'partial' && (
                                            <span className="text-amber-600 text-xs">
                                                {entry.details?.matches} matches · {entry.details?.mismatches?.length || 0} stat mismatches
                                                {entry.details?.resultDeficit ? ` · ${entry.details.resultDeficit} W/D/L deficits` : ''}
                                                {entry.details?.goalError ? ` · ${entry.details.goalError} goal error` : ''}
                                            </span>
                                        )}
                                        {entry.normalizedCount > 0 && (
                                            <span className="text-sky-600 text-xs">· {entry.normalizedCount} table fixes</span>
                                        )}
                                        {entry.status === 'error' && <span className="text-red-500 text-xs">{entry.details}</span>}
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}

                    {/* Season list */}
                    <Card className="border-0 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-base">Seasons with League Table Data ({eligibleSeasons.length})</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {eligibleSeasons.length === 0 ? (
                                <p className="text-center py-8 text-slate-500">No seasons with complete league table data found.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-slate-100">
                                                <TableHead className="w-10"></TableHead>
                                                <TableHead>League</TableHead>
                                                <TableHead>Year</TableHead>
                                                <TableHead className="text-center">Teams</TableHead>
                                                <TableHead className="text-center">Expected</TableHead>
                                                <TableHead className="text-center">Existing</TableHead>
                                                <TableHead>Table</TableHead>
                                                <TableHead>Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {eligibleSeasons.slice(0, 200).map(row => (
                                                <TableRow key={row.season.id}>
                                                    <TableCell>
                                                        <input
                                                            type="checkbox"
                                                            checked={selected.has(row.season.id)}
                                                            onChange={() => toggleSelect(row.season.id)}
                                                            disabled={processing}
                                                            className="w-4 h-4 rounded accent-emerald-600"
                                                        />
                                                    </TableCell>
                                                    <TableCell className="font-medium truncate max-w-[200px]">{row.league?.name || 'Unknown'}</TableCell>
                                                    <TableCell>{row.season.year}</TableCell>
                                                    <TableCell className="text-center">{row.teamCount}</TableCell>
                                                    <TableCell className="text-center text-slate-500">{row.expectedMatches}</TableCell>
                                                    <TableCell className="text-center">{row.existingMatches || 0}</TableCell>
                                                    <TableCell>
                                                        {row.consistency.consistent
                                                            ? <Badge variant="outline" className="text-emerald-600 border-emerald-300">✓ Consistent</Badge>
                                                            : <Badge variant="outline" className="text-amber-600 border-amber-300">⚠ Fixed</Badge>}
                                                    </TableCell>
                                                    <TableCell>
                                                        {row.existingMatches === 0
                                                            ? <Badge className="bg-amber-100 text-amber-700 border-0">No matches</Badge>
                                                            : <Badge className="bg-emerald-100 text-emerald-700 border-0">{row.existingMatches} matches</Badge>}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </AdminOnly>
            </div>
        </div>
    );
}