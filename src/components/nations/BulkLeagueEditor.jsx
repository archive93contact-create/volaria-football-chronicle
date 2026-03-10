import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Save, Loader2, Plus, ExternalLink, Check, ArrowUp, RotateCcw, AlertCircle, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function BulkLeagueEditor({ leagues = [], nationId, onSaved }) {
    const professionalLeagues = leagues.filter(l => l.league_type !== 'youth' && l.league_type !== 'reserve');
    const sortedLeagues = [...professionalLeagues].sort((a, b) => (a.tier || 99) - (b.tier || 99) || a.name.localeCompare(b.name));

    const [edits, setEdits] = useState({});
    const queryClient = useQueryClient();

    const saveMutation = useMutation({
        mutationFn: async (changes) => {
            await Promise.all(
                Object.entries(changes).map(([leagueId, data]) =>
                    base44.entities.League.update(leagueId, data)
                )
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leagues', nationId] });
            setEdits({});
            onSaved?.();
        },
    });

    const dirtyCount = Object.keys(edits).length;
    const hasChanges = dirtyCount > 0;

    const getField = (league, field) => {
        if (edits[league.id]?.[field] !== undefined) return edits[league.id][field];
        return league[field];
    };

    const setField = (leagueId, field, value) => {
        setEdits(prev => ({
            ...prev,
            [leagueId]: { ...prev[leagueId], [field]: value }
        }));
    };

    const resetRow = (leagueId) => {
        setEdits(prev => {
            const next = { ...prev };
            delete next[leagueId];
            return next;
        });
    };

    const saveAll = () => saveMutation.mutate(edits);

    // Group by tier for visual separation
    const byTier = useMemo(() => {
        return sortedLeagues.reduce((acc, l) => {
            const tier = getField(l, 'tier') || 1;
            if (!acc[tier]) acc[tier] = [];
            acc[tier].push(l);
            return acc;
        }, {});
    }, [sortedLeagues, edits]);

    const possibleParentsFor = (league) => {
        const currentTier = parseInt(getField(league, 'tier') || 1);
        return professionalLeagues.filter(l => l.id !== league.id && (l.tier || 1) < currentTier);
    };

    const tierNumbers = [...new Set(sortedLeagues.map(l => getField(l, 'tier') || 1))].sort((a, b) => a - b);

    if (professionalLeagues.length === 0) {
        return (
            <Card className="border-dashed border-2 border-slate-300">
                <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
                    <AlertCircle className="w-10 h-10 text-slate-300" />
                    <p className="text-slate-500">No professional leagues yet.</p>
                    <Link to={createPageUrl(`AddLeague?nation_id=${nationId}`)}>
                        <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add First League</Button>
                    </Link>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600 font-medium">
                        {professionalLeagues.length} leagues
                    </span>
                    {hasChanges && (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                            {dirtyCount} unsaved change{dirtyCount > 1 ? 's' : ''}
                        </Badge>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {hasChanges && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEdits({})}
                        >
                            <RotateCcw className="w-4 h-4 mr-1" /> Discard All
                        </Button>
                    )}
                    <Button
                        size="sm"
                        onClick={saveAll}
                        disabled={!hasChanges || saveMutation.isPending}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                        {saveMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-1" />
                        ) : (
                            <Save className="w-4 h-4 mr-1" />
                        )}
                        Save All Changes
                    </Button>
                    <Link to={createPageUrl(`AddLeague?nation_id=${nationId}`)}>
                        <Button size="sm" variant="outline">
                            <Plus className="w-4 h-4 mr-1" /> Add League
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Table header */}
            <div className="hidden md:grid grid-cols-12 gap-2 px-3 py-2 bg-slate-100 rounded-lg text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <div className="col-span-1">Tier</div>
                <div className="col-span-4">League Name</div>
                <div className="col-span-4">Feeds Into (Parent)</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-1 text-right">Open</div>
            </div>

            {/* Rows grouped by tier */}
            {tierNumbers.map(tier => (
                <div key={tier} className="space-y-1">
                    <div className="flex items-center gap-2 py-1">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${tier === 1 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                            {tier === 1 ? '★ Tier 1' : `Tier ${tier}`}
                        </span>
                        <div className="flex-1 h-px bg-slate-200" />
                    </div>

                    {sortedLeagues
                        .filter(l => (getField(l, 'tier') || 1) == tier)
                        .map(league => {
                            const isDirty = !!edits[league.id];
                            const isActive = getField(league, 'is_active') !== false;
                            const currentParent = getField(league, 'parent_league_id');
                            const currentTier = parseInt(getField(league, 'tier') || 1);
                            const possibleParents = possibleParentsFor(league);

                            return (
                                <div
                                    key={league.id}
                                    className={`grid grid-cols-1 md:grid-cols-12 gap-2 items-center p-3 rounded-lg border transition-all ${
                                        isDirty
                                            ? 'bg-amber-50 border-amber-300'
                                            : !isActive
                                                ? 'bg-slate-50 border-slate-200 opacity-60'
                                                : 'bg-white border-slate-200 hover:border-slate-300'
                                    }`}
                                >
                                    {/* Tier */}
                                    <div className="md:col-span-1">
                                        <Input
                                            type="number"
                                            min={1}
                                            max={20}
                                            value={getField(league, 'tier') || ''}
                                            onChange={e => setField(league.id, 'tier', parseInt(e.target.value) || 1)}
                                            className="h-8 text-sm text-center w-full"
                                        />
                                    </div>

                                    {/* Name */}
                                    <div className="md:col-span-4">
                                        <div className="flex items-center gap-2">
                                            {league.logo_url && (
                                                <img src={league.logo_url} alt="" className="w-6 h-6 object-contain flex-shrink-0 bg-white rounded" />
                                            )}
                                            <Input
                                                value={getField(league, 'name') || ''}
                                                onChange={e => setField(league.id, 'name', e.target.value)}
                                                className="h-8 text-sm"
                                                placeholder="League name..."
                                            />
                                        </div>
                                    </div>

                                    {/* Feeds Into */}
                                    <div className="md:col-span-4">
                                        {currentTier > 1 && possibleParents.length > 0 ? (
                                            <Select
                                                value={currentParent || 'none'}
                                                onValueChange={v => setField(league.id, 'parent_league_id', v === 'none' ? null : v)}
                                            >
                                                <SelectTrigger className="h-8 text-sm">
                                                    <SelectValue placeholder="No parent..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">— No parent —</SelectItem>
                                                    {possibleParents.map(p => (
                                                        <SelectItem key={p.id} value={p.id}>
                                                            Tier {p.tier}: {p.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        ) : currentTier === 1 ? (
                                            <span className="text-xs text-slate-400 italic">Top tier — no parent</span>
                                        ) : (
                                            <span className="text-xs text-slate-400 italic">No higher tier leagues exist</span>
                                        )}
                                        {currentParent && currentTier === 1 && (
                                            <span className="text-xs text-slate-400">—</span>
                                        )}
                                    </div>

                                    {/* Status toggle */}
                                    <div className="md:col-span-2 flex items-center gap-2">
                                        <button
                                            onClick={() => setField(league.id, 'is_active', !isActive)}
                                            className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full border transition-colors ${
                                                isActive
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                    : 'bg-slate-100 text-slate-500 border-slate-200'
                                            }`}
                                        >
                                            {isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                                            {isActive ? 'Active' : 'Inactive'}
                                        </button>
                                        {isDirty && (
                                            <button
                                                onClick={() => resetRow(league.id)}
                                                className="text-slate-400 hover:text-slate-600 transition-colors"
                                                title="Reset this row"
                                            >
                                                <RotateCcw className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>

                                    {/* Open link */}
                                    <div className="md:col-span-1 flex justify-end">
                                        <Link to={createPageUrl(`LeagueDetail?id=${league.id}`)}>
                                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            );
                        })}
                </div>
            ))}

            {/* Save reminder if dirty */}
            {hasChanges && (
                <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <span className="text-sm text-amber-800 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        You have unsaved changes to {dirtyCount} league{dirtyCount > 1 ? 's' : ''}.
                    </span>
                    <Button
                        size="sm"
                        onClick={saveAll}
                        disabled={saveMutation.isPending}
                        className="bg-amber-600 hover:bg-amber-700 text-white"
                    >
                        {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                        Save All
                    </Button>
                </div>
            )}

            {saveMutation.isSuccess && !hasChanges && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
                    <Check className="w-4 h-4" /> All changes saved successfully.
                </div>
            )}
        </div>
    );
}