import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Swords, Trophy, Shield, Loader2, Save, Crown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { computeLocalDerbyTable } from '@/lib/matchAnalytics';
import AdminOnly from '@/components/common/AdminOnly';

export default function DistrictDerbyBoard({ locationClubs, locationName, locationType }) {
    const queryClient = useQueryClient();
    const [savedMsg, setSavedMsg] = useState(null);

    // Unique league IDs for the clubs in this location
    const leagueIds = useMemo(
        () => [...new Set(locationClubs.map(c => c.league_id).filter(Boolean))],
        [locationClubs]
    );

    // Fetch matches for each league these clubs play in
    const leagueMatchQueries = useQuery({
        queryKey: ['leagueMatchesBatch', leagueIds.join(',')],
        queryFn: async () => {
            if (leagueIds.length === 0) return [];
            const results = await Promise.all(
                leagueIds.map(lid => base44.entities.Match.filter({ league_id: lid }))
            );
            return results.flat();
        },
        enabled: leagueIds.length > 0,
        staleTime: 5 * 60 * 1000,
    });

    const matches = leagueMatchQueries.data || [];

    const { table, matches: localMatches } = useMemo(
        () => computeLocalDerbyTable(locationClubs, matches),
        [locationClubs, matches]
    );

    // Mutation to write dominance scores + ranks back to clubs
    const saveMutation = useMutation({
        mutationFn: async () => {
            const updates = table.map(row => ({
                id: row.club.id,
                data: {
                    local_dominance_score: row.dominanceScore,
                    local_dominance_rank: row.rank,
                },
            }));
            // Sequential to avoid hammering the API
            for (const u of updates) {
                await base44.entities.Club.update(u.id, u.data);
            }
            return updates.length;
        },
        onSuccess: (count) => {
            queryClient.invalidateQueries({ queryKey: ['allClubs'] });
            queryClient.invalidateQueries({ queryKey: ['club'] });
            setSavedMsg(`Saved dominance scores to ${count} clubs`);
            setTimeout(() => setSavedMsg(null), 4000);
        },
    });

    if (leagueMatchQueries.isLoading) {
        return (
            <Card className="border-0 shadow-sm">
                <CardContent className="p-6 text-center text-slate-400">Loading derby records…</CardContent>
            </Card>
        );
    }

    if (locationClubs.length < 2) {
        return (
            <Card className="border-dashed border-2 border-slate-300">
                <CardContent className="flex flex-col items-center justify-center py-10">
                    <Swords className="w-10 h-10 text-slate-300 mb-2" />
                    <p className="text-sm text-slate-400">Need at least 2 clubs in this location for derby records.</p>
                </CardContent>
            </Card>
        );
    }

    if (table.length === 0 || localMatches.length === 0) {
        return (
            <Card className="border-dashed border-2 border-slate-300">
                <CardContent className="flex flex-col items-center justify-center py-10">
                    <Swords className="w-10 h-10 text-slate-300 mb-2" />
                    <h3 className="font-semibold text-slate-600">No Derby Matches Found</h3>
                    <p className="text-sm text-slate-400">
                        No match records between {locationName} clubs yet. Backfill matches for their leagues to populate the derby board.
                    </p>
                </CardContent>
            </Card>
        );
    }

    const champion = table[0];

    return (
        <div className="space-y-6">
            {/* District Champion banner */}
            <Card className="border-0 shadow-sm bg-gradient-to-r from-amber-50 to-yellow-50 border-l-4 border-l-amber-500">
                <CardContent className="p-4 flex items-center gap-4">
                    <Crown className="w-10 h-10 text-amber-500 shrink-0" />
                    <div className="flex-1">
                        <div className="text-xs text-amber-700 font-medium">
                            {locationType === 'region' ? 'Regional' : locationType === 'district' ? 'District' : 'Local'} Champion (by derby record)
                        </div>
                        <Link to={createPageUrl(`ClubDetail?id=${champion.club.id}`)} className="text-xl font-bold text-amber-800 hover:underline">
                            {champion.club.name}
                        </Link>
                        <div className="text-sm text-amber-700">
                            {champion.won}W {champion.drawn}D {champion.lost}L • {champion.points} pts • Dominance {champion.dominanceScore}/100
                        </div>
                    </div>
                    {champion.club.logo_url && (
                        <img src={champion.club.logo_url} alt="" className="w-14 h-14 object-contain bg-white rounded-lg p-1" />
                    )}
                </CardContent>
            </Card>

            {/* Derby Table */}
            <Card className="border-0 shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Swords className="w-5 h-5 text-red-500" />
                        {locationName} Derby Table
                        <Badge variant="outline" className="ml-1">{localMatches.length} matches</Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-100 text-slate-600">
                                    <th className="text-center px-3 py-2 w-10">#</th>
                                    <th className="text-left px-3 py-2">Club</th>
                                    <th className="text-center px-2 py-2">P</th>
                                    <th className="text-center px-2 py-2 text-green-600">W</th>
                                    <th className="text-center px-2 py-2 text-slate-500">D</th>
                                    <th className="text-center px-2 py-2 text-red-600">L</th>
                                    <th className="text-center px-2 py-2 hidden sm:table-cell">GF</th>
                                    <th className="text-center px-2 py-2 hidden sm:table-cell">GA</th>
                                    <th className="text-center px-2 py-2">GD</th>
                                    <th className="text-center px-2 py-2 font-bold">Pts</th>
                                    <th className="text-center px-2 py-2">Dom</th>
                                </tr>
                            </thead>
                            <tbody>
                                {table.map((row) => (
                                    <tr key={row.club.id} className="border-t hover:bg-slate-50">
                                        <td className="text-center px-3 py-2 font-bold text-slate-400">
                                            {row.rank === 1 && <Trophy className="w-3.5 h-3.5 text-amber-500 inline" />}
                                            {row.rank > 1 && row.rank}
                                        </td>
                                        <td className="px-3 py-2">
                                            <Link to={createPageUrl(`ClubDetail?id=${row.club.id}`)} className="flex items-center gap-2 hover:text-blue-600">
                                                {row.club.logo_url ? (
                                                    <img src={row.club.logo_url} alt="" className="w-5 h-5 object-contain bg-white rounded" />
                                                ) : (
                                                    <Shield className="w-4 h-4 text-slate-300" />
                                                )}
                                                <span className="font-medium truncate">{row.club.name}</span>
                                            </Link>
                                        </td>
                                        <td className="text-center px-2 py-2">{row.played}</td>
                                        <td className="text-center px-2 py-2 text-green-600 font-medium">{row.won}</td>
                                        <td className="text-center px-2 py-2 text-slate-500">{row.drawn}</td>
                                        <td className="text-center px-2 py-2 text-red-600 font-medium">{row.lost}</td>
                                        <td className="text-center px-2 py-2 hidden sm:table-cell">{row.gf}</td>
                                        <td className="text-center px-2 py-2 hidden sm:table-cell">{row.ga}</td>
                                        <td className="text-center px-2 py-2">
                                            <span className={row.goalDifference > 0 ? 'text-green-600' : row.goalDifference < 0 ? 'text-red-600' : 'text-slate-500'}>
                                                {row.goalDifference > 0 ? '+' : ''}{row.goalDifference}
                                            </span>
                                        </td>
                                        <td className="text-center px-2 py-2 font-bold">{row.points}</td>
                                        <td className="text-center px-2 py-2">
                                            <span className="inline-block w-10 text-xs font-bold rounded px-1.5 py-0.5"
                                                style={{
                                                    backgroundColor: row.dominanceScore >= 67 ? '#dcfce7' : row.dominanceScore >= 40 ? '#fef9c3' : '#fee2e2',
                                                    color: row.dominanceScore >= 67 ? '#15803d' : row.dominanceScore >= 40 ? '#a16207' : '#b91c1c',
                                                }}>
                                                {row.dominanceScore}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p className="text-xs text-slate-400 px-4 py-2">
                        Dominance score = points rate (70%) + win rate (30%), scaled 0–100. Only matches between {locationName} clubs count.
                    </p>
                </CardContent>
            </Card>

            {/* Recent derby results */}
            <Card className="border-0 shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Swords className="w-4 h-4 text-red-500" /> Recent Derby Results
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-1.5 max-h-64 overflow-y-auto">
                        {[...localMatches]
                            .sort((a, b) => (b.year || '').localeCompare(a.year || '') || (b.matchday || 0) - (a.matchday || 0))
                            .slice(0, 15)
                            .map((m, i) => {
                                const homeClub = locationClubs.find(c => c.id === m.home_club_id);
                                const awayClub = locationClubs.find(c => c.id === m.away_club_id);
                                return (
                                    <div key={i} className="flex items-center gap-2 p-2 bg-slate-50 rounded text-sm">
                                        <span className="text-xs text-slate-400 w-12 shrink-0">{m.year}</span>
                                        <span className="flex-1 text-right truncate">
                                            {homeClub ? (
                                                <Link to={createPageUrl(`ClubDetail?id=${homeClub.id}`)} className="hover:text-blue-600">{m.home_club_name}</Link>
                                            ) : m.home_club_name}
                                        </span>
                                        <span className="font-bold px-2 py-0.5 bg-white rounded border">{m.home_score}-{m.away_score}</span>
                                        <span className="flex-1 truncate">
                                            {awayClub ? (
                                                <Link to={createPageUrl(`ClubDetail?id=${awayClub.id}`)} className="hover:text-blue-600">{m.away_club_name}</Link>
                                            ) : m.away_club_name}
                                        </span>
                                    </div>
                                );
                            })}
                    </div>
                </CardContent>
            </Card>

            {/* Admin: write dominance scores back to clubs */}
            <AdminOnly>
                <Card className="border-0 shadow-sm bg-blue-50 border-l-4 border-l-blue-500">
                    <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
                        <div>
                            <div className="font-semibold text-blue-800">Write Dominance Scores to Clubs</div>
                            <p className="text-sm text-blue-600">
                                Saves <code className="bg-blue-100 px-1 rounded">local_dominance_score</code> and <code className="bg-blue-100 px-1 rounded">local_dominance_rank</code> to each club record, so it factors into club rankings.
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            {savedMsg && <span className="text-sm text-green-600 font-medium">{savedMsg}</span>}
                            <Button
                                onClick={() => saveMutation.mutate()}
                                disabled={saveMutation.isPending}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                Save to {table.length} Clubs
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </AdminOnly>
        </div>
    );
}