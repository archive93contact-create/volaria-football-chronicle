import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Swords, Shield, TrendingUp, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { computeClubHeadToHead } from '@/lib/matchAnalytics';

export default function HeadToHeadRecords({ club }) {
    // Fetch matches where this club is home or away (by ID)
    const { data: homeMatches = [], isLoading: homeLoading } = useQuery({
        queryKey: ['clubMatchesHome', club?.id],
        queryFn: () => base44.entities.Match.filter({ home_club_id: club.id }),
        enabled: !!club?.id,
        staleTime: 5 * 60 * 1000,
    });
    const { data: awayMatches = [], isLoading: awayLoading } = useQuery({
        queryKey: ['clubMatchesAway', club?.id],
        queryFn: () => base44.entities.Match.filter({ away_club_id: club.id }),
        enabled: !!club?.id,
        staleTime: 5 * 60 * 1000,
    });

    const allMatches = useMemo(() => [...homeMatches, ...awayMatches], [homeMatches, awayMatches]);

    const { opponents, summary } = useMemo(
        () => computeClubHeadToHead(club, allMatches),
        [club, allMatches]
    );

    if (homeLoading || awayLoading) {
        return (
            <Card className="border-0 shadow-sm">
                <CardContent className="p-6 text-center text-slate-400">Loading head-to-head records…</CardContent>
            </Card>
        );
    }

    if (!summary || summary.totalMatches === 0) {
        return (
            <Card className="border-dashed border-2 border-slate-300">
                <CardContent className="flex flex-col items-center justify-center py-12">
                    <Swords className="w-12 h-12 text-slate-300 mb-3" />
                    <h3 className="font-semibold text-slate-600">No Match Data Yet</h3>
                    <p className="text-sm text-slate-400">Head-to-head records appear once matches are backfilled or entered.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-0 shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Swords className="w-5 h-5 text-red-500" />
                    Head-to-Head Records
                    <Badge variant="outline" className="ml-1">{summary.totalMatches} matches</Badge>
                </CardTitle>
            </CardHeader>
            <CardContent>
                {/* Summary bar */}
                <div className="grid grid-cols-5 gap-2 mb-4 text-center">
                    <div className="p-2 bg-slate-50 rounded-lg">
                        <div className="text-lg font-bold">{summary.opponentCount}</div>
                        <div className="text-xs text-slate-500">Opponents</div>
                    </div>
                    <div className="p-2 bg-green-50 rounded-lg">
                        <div className="text-lg font-bold text-green-700">{summary.totalWon}</div>
                        <div className="text-xs text-green-600">Won</div>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg">
                        <div className="text-lg font-bold text-slate-600">{summary.totalDrawn}</div>
                        <div className="text-xs text-slate-500">Drawn</div>
                    </div>
                    <div className="p-2 bg-red-50 rounded-lg">
                        <div className="text-lg font-bold text-red-700">{summary.totalLost}</div>
                        <div className="text-xs text-red-600">Lost</div>
                    </div>
                    <div className="p-2 bg-blue-50 rounded-lg">
                        <div className="text-lg font-bold text-blue-700">{summary.totalGf}:{summary.totalGa}</div>
                        <div className="text-xs text-blue-600">Goals</div>
                    </div>
                </div>

                {/* Opponent list */}
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {opponents.map(opp => {
                        const winPct = opp.played > 0 ? Math.round((opp.won / opp.played) * 100) : 0;
                        return (
                            <Link
                                key={opp.oppId || opp.oppName}
                                to={opp.oppId ? createPageUrl(`ClubDetail?id=${opp.oppId}`) : '#'}
                                className="block p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                            >
                                <div className="flex items-center justify-between mb-1.5">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Shield className="w-4 h-4 text-slate-400 shrink-0" />
                                        <span className="font-medium truncate">{opp.oppName}</span>
                                        {opp.currentStreak && (
                                            <Badge variant="outline" className="text-xs shrink-0">
                                                {opp.currentStreak}
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm shrink-0">
                                        <span className="text-green-600 font-medium">{opp.won}W</span>
                                        <span className="text-slate-500">{opp.drawn}D</span>
                                        <span className="text-red-600 font-medium">{opp.lost}L</span>
                                        <ChevronRight className="w-4 h-4 text-slate-300" />
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                        <div
                                            className="h-full bg-green-500 rounded-full"
                                            style={{ width: `${winPct}%` }}
                                        />
                                    </div>
                                    <span className="text-xs text-slate-500 w-20 text-right">
                                        {opp.gf}:{opp.ga} ({opp.played})
                                    </span>
                                </div>
                                {(opp.biggestWin || opp.biggestLoss) && (
                                    <div className="flex items-center gap-3 mt-1.5 text-xs">
                                        {opp.biggestWin && (
                                            <span className="text-green-600">
                                                Best: {opp.biggestWin.score} ({opp.biggestWin.year}{opp.biggestWin.isHome ? ' H' : ' A'})
                                            </span>
                                        )}
                                        {opp.biggestLoss && (
                                            <span className="text-red-500">
                                                Worst: {opp.biggestLoss.score} ({opp.biggestLoss.year}{opp.biggestLoss.isHome ? ' H' : ' A'})
                                            </span>
                                        )}
                                    </div>
                                )}
                            </Link>
                        );
                    })}
                </div>

                <p className="text-xs text-slate-400 text-center mt-3">
                    Computed from {summary.totalMatches} match records • Win bar shows win rate against each opponent
                </p>
            </CardContent>
        </Card>
    );
}