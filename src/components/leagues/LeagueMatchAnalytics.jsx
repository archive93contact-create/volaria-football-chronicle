import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Flame, Trophy, Target, Home, Plane, Activity, Swords, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { computeLeagueMatchStats } from '@/lib/matchAnalytics';

export default function LeagueMatchAnalytics({ leagueId }) {
    const { data: matches = [], isLoading } = useQuery({
        queryKey: ['leagueMatches', leagueId],
        queryFn: () => base44.entities.Match.filter({ league_id: leagueId }),
        enabled: !!leagueId,
        staleTime: 5 * 60 * 1000,
    });

    const stats = useMemo(() => computeLeagueMatchStats(matches), [matches]);

    if (isLoading) {
        return (
            <Card className="border-0 shadow-sm">
                <CardContent className="p-6 text-center text-slate-400">Loading match analytics…</CardContent>
            </Card>
        );
    }

    if (!stats) {
        return (
            <Card className="border-dashed border-2 border-slate-300">
                <CardContent className="flex flex-col items-center justify-center py-12">
                    <Activity className="w-12 h-12 text-slate-300 mb-3" />
                    <h3 className="font-semibold text-slate-600">No Match Data Yet</h3>
                    <p className="text-sm text-slate-400">Match analytics appear once matches are backfilled or entered for this league.</p>
                </CardContent>
            </Card>
        );
    }

    const scorelineData = stats.topScorelines.map(s => ({ name: s.score, count: s.count }));
    const outcomeData = [
        { name: 'Home Wins', value: stats.homeWins, fill: '#3b82f6' },
        { name: 'Draws', value: stats.draws, fill: '#94a3b8' },
        { name: 'Away Wins', value: stats.awayWins, fill: '#f59e0b' },
    ];

    const MatchRow = ({ m, label, icon: Icon, color }) => {
        if (!m) return null;
        return (
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <Icon className="w-5 h-5 shrink-0" style={{ color }} />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                        <span className="font-medium truncate">
                            {m.homeId ? (
                                <Link to={createPageUrl(`ClubDetail?id=${m.homeId}`)} className="hover:text-blue-600">{m.home}</Link>
                            ) : m.home}
                            {' '} <span className="font-bold text-slate-700">{m.homeScore} - {m.awayScore}</span> {' '}
                            {m.awayId ? (
                                <Link to={createPageUrl(`ClubDetail?id=${m.awayId}`)} className="hover:text-blue-600">{m.away}</Link>
                            ) : m.away}
                        </span>
                        <Badge variant="outline" className="ml-2 shrink-0">{m.year}</Badge>
                    </div>
                    <div className="text-xs text-slate-500">{label} • {m.total} goals{m.matchday ? ` • MD${m.matchday}` : ''}</div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Key metrics */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-4 text-center">
                        <Activity className="w-5 h-5 text-blue-500 mx-auto mb-2" />
                        <div className="text-2xl font-bold">{stats.totalMatches}</div>
                        <div className="text-xs text-slate-500">Matches</div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-4 text-center">
                        <Target className="w-5 h-5 text-green-500 mx-auto mb-2" />
                        <div className="text-2xl font-bold">{stats.totalGoals}</div>
                        <div className="text-xs text-slate-500">Total Goals</div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-4 text-center">
                        <Flame className="w-5 h-5 text-orange-500 mx-auto mb-2" />
                        <div className="text-2xl font-bold">{stats.avgGoals}</div>
                        <div className="text-xs text-slate-500">Goals/Match</div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-blue-50">
                    <CardContent className="p-4 text-center">
                        <Home className="w-5 h-5 text-blue-600 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-blue-700">{stats.homeWinRate}%</div>
                        <div className="text-xs text-blue-600">Home Wins</div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-slate-50">
                    <CardContent className="p-4 text-center">
                        <Activity className="w-5 h-5 text-slate-500 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-slate-600">{stats.drawRate}%</div>
                        <div className="text-xs text-slate-500">Draws</div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-amber-50">
                    <CardContent className="p-4 text-center">
                        <Plane className="w-5 h-5 text-amber-600 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-amber-700">{stats.awayWinRate}%</div>
                        <div className="text-xs text-amber-600">Away Wins</div>
                    </CardContent>
                </Card>
            </div>

            {/* Outcome distribution + scorelines */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Activity className="w-4 h-4 text-blue-500" /> Home vs Away Advantage
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={outcomeData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" />
                                <YAxis dataKey="name" type="category" width={90} />
                                <Tooltip formatter={(v) => [`${v} (${((v / stats.totalMatches) * 100).toFixed(1)}%)`, '']} />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                    {outcomeData.map((entry, i) => (
                                        <Cell key={i} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Target className="w-4 h-4 text-green-500" /> Most Common Scorelines
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={scorelineData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis allowDecimals={false} />
                                <Tooltip />
                                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Notable matches */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Zap className="w-4 h-4 text-amber-500" /> Highest-Scoring Match
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <MatchRow m={stats.highestScoring} label="Most goals" icon={Zap} color="#f59e0b" />
                        {!stats.highestScoring && <p className="text-sm text-slate-400">—</p>}
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Home className="w-4 h-4 text-blue-500" /> Biggest Home Win
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <MatchRow m={stats.biggestHomeWin} label={`${stats.biggestHomeWin?.margin || 0}-goal margin`} icon={Home} color="#3b82f6" />
                        {!stats.biggestHomeWin && <p className="text-sm text-slate-400">—</p>}
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Plane className="w-4 h-4 text-amber-500" /> Biggest Away Win
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <MatchRow m={stats.biggestAwayWin} label={`${stats.biggestAwayWin?.margin || 0}-goal margin`} icon={Plane} color="#f59e0b" />
                        {!stats.biggestAwayWin && <p className="text-sm text-slate-400">—</p>}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}