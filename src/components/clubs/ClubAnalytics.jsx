import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, Area, AreaChart } from 'recharts';
import { Trophy, TrendingUp, Home, Plane, Swords, Clock, Target, Users, Flame, Award, Calendar, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Badge } from "@/components/ui/badge";

export default function ClubAnalytics({ club, seasons, leagues, allClubs, players = [] }) {
    const analytics = useMemo(() => {
        if (!seasons || seasons.length === 0) return null;

        const sortedSeasons = [...seasons].sort((a, b) => a.year.localeCompare(b.year));

        // Performance trends over time
        const performanceTrends = sortedSeasons.map(s => {
            const league = leagues.find(l => l.id === s.league_id);
            return {
                year: s.year,
                points: s.points || 0,
                position: s.position,
                tier: league?.tier || 1,
                won: s.won || 0,
                drawn: s.drawn || 0,
                lost: s.lost || 0,
                goalsFor: s.goals_for || 0,
                goalsAgainst: s.goals_against || 0,
                goalDiff: (s.goals_for || 0) - (s.goals_against || 0)
            };
        });

        // Win rate by tier
        const tierStats = {};
        seasons.forEach(s => {
            const league = leagues.find(l => l.id === s.league_id);
            const tier = league?.tier || 1;
            if (!tierStats[tier]) tierStats[tier] = { played: 0, won: 0, drawn: 0, lost: 0 };
            tierStats[tier].played += s.played || 0;
            tierStats[tier].won += s.won || 0;
            tierStats[tier].drawn += s.drawn || 0;
            tierStats[tier].lost += s.lost || 0;
        });

        const tierPerformance = Object.entries(tierStats).map(([tier, stats]) => ({
            tier: `Tier ${tier}`,
            winRate: ((stats.won / stats.played) * 100).toFixed(1),
            seasons: seasons.filter(s => {
                const league = leagues.find(l => l.id === s.league_id);
                return league?.tier === parseInt(tier);
            }).length
        })).sort((a, b) => a.tier.localeCompare(b.tier));

        // Head-to-head vs rivals
        const rivalStats = (club.rival_club_ids || []).map(rivalId => {
            const rival = allClubs.find(c => c.id === rivalId);
            if (!rival) return null;
            
            // Count seasons where both clubs were in same league
            const clashSeasons = seasons.filter(s => {
                return seasons.some(rs => rs.year === s.year && rs.league_id === s.league_id);
            });

            return {
                rivalName: rival.name,
                rivalId: rival.id,
                clashes: clashSeasons.length,
                logo: rival.logo_url
            };
        }).filter(Boolean);

        // Peak years detection
        const peakYears = sortedSeasons
            .filter(s => s.position <= 3 || s.status === 'champion')
            .map(s => ({
                year: s.year,
                position: s.position,
                status: s.status,
                points: s.points
            }));

        // Longest streaks
        let longestWinStreak = 0;
        let longestUnbeaten = 0;
        // Note: Would need match-by-match data for accurate streaks, using season-level approximation
        
        // Best/worst seasons
        const bestSeason = sortedSeasons.reduce((best, s) => {
            if (!best) return s;
            const league = leagues.find(l => l.id === s.league_id);
            const bestLeague = leagues.find(l => l.id === best.league_id);
            if ((league?.tier || 1) < (bestLeague?.tier || 1)) return s;
            if ((league?.tier || 1) === (bestLeague?.tier || 1) && s.position < best.position) return s;
            return best;
        }, null);

        const worstSeason = sortedSeasons.reduce((worst, s) => {
            if (!worst) return s;
            const league = leagues.find(l => l.id === s.league_id);
            const worstLeague = leagues.find(l => l.id === worst.league_id);
            if ((league?.tier || 1) > (worstLeague?.tier || 1)) return s;
            if ((league?.tier || 1) === (worstLeague?.tier || 1) && s.position > worst.position) return s;
            return worst;
        }, null);

        // Squad analytics
        const seniorPlayers = players.filter(p => !p.is_youth_player && p.overall_rating);
        const youthPlayers = players.filter(p => p.is_youth_player);
        const avgAge = seniorPlayers.length > 0 
            ? seniorPlayers.reduce((sum, p) => sum + (p.age || 25), 0) / seniorPlayers.length 
            : null;
        const avgOVR = seniorPlayers.length > 0
            ? seniorPlayers.reduce((sum, p) => sum + p.overall_rating, 0) / seniorPlayers.length
            : null;

        // Position breakdown
        const positionGroups = {
            GK: seniorPlayers.filter(p => p.position === 'GK').length,
            DEF: seniorPlayers.filter(p => ['CB', 'LB', 'RB'].includes(p.position)).length,
            MID: seniorPlayers.filter(p => ['CDM', 'CM', 'CAM'].includes(p.position)).length,
            FWD: seniorPlayers.filter(p => ['LW', 'RW', 'ST'].includes(p.position)).length
        };

        return {
            performanceTrends,
            tierPerformance,
            rivalStats,
            peakYears,
            bestSeason,
            worstSeason,
            avgAge,
            avgOVR,
            positionGroups,
            seniorCount: seniorPlayers.length,
            youthCount: youthPlayers.length
        };
    }, [club, seasons, leagues, allClubs, players]);

    if (!analytics) return <p className="text-center py-8 text-slate-500">Not enough data for analytics</p>;

    return (
        <div className="space-y-6">
            {/* Key Insights */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-4 text-center">
                        <Trophy className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                        <div className="text-2xl font-bold">{analytics.performanceTrends.length}</div>
                        <div className="text-xs text-slate-500">Seasons Tracked</div>
                    </CardContent>
                </Card>
                {analytics.avgOVR && (
                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-4 text-center">
                            <Users className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                            <div className="text-2xl font-bold">{Math.round(analytics.avgOVR)}</div>
                            <div className="text-xs text-slate-500">Squad OVR</div>
                        </CardContent>
                    </Card>
                )}
                {analytics.avgAge && (
                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-4 text-center">
                            <Calendar className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                            <div className="text-2xl font-bold">{analytics.avgAge.toFixed(1)}</div>
                            <div className="text-xs text-slate-500">Avg Age</div>
                        </CardContent>
                    </Card>
                )}
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-4 text-center">
                        <Flame className="w-6 h-6 text-orange-500 mx-auto mb-2" />
                        <div className="text-2xl font-bold">{analytics.peakYears.length}</div>
                        <div className="text-xs text-slate-500">Peak Seasons</div>
                    </CardContent>
                </Card>
            </div>

            {/* Best & Worst Seasons */}
            {(analytics.bestSeason || analytics.worstSeason) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {analytics.bestSeason && (
                        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-green-50">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Trophy className="w-5 h-5 text-emerald-600" />
                                    Best Season
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-emerald-700 mb-2">
                                    {analytics.bestSeason.year}
                                </div>
                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">Position:</span>
                                        <span className="font-bold text-emerald-600">
                                            {analytics.bestSeason.position}{analytics.bestSeason.position === 1 ? 'st' : analytics.bestSeason.position === 2 ? 'nd' : analytics.bestSeason.position === 3 ? 'rd' : 'th'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">Points:</span>
                                        <span className="font-bold">{analytics.bestSeason.points}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">Record:</span>
                                        <span className="font-mono text-xs">{analytics.bestSeason.won}W-{analytics.bestSeason.drawn}D-{analytics.bestSeason.lost}L</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                    {analytics.worstSeason && (
                        <Card className="border-0 shadow-sm bg-gradient-to-br from-slate-50 to-slate-100">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <TrendingDown className="w-5 h-5 text-slate-600" />
                                    Toughest Season
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-slate-700 mb-2">
                                    {analytics.worstSeason.year}
                                </div>
                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">Position:</span>
                                        <span className="font-bold text-red-600">
                                            {analytics.worstSeason.position}{analytics.worstSeason.position === 2 ? 'nd' : analytics.worstSeason.position === 3 ? 'rd' : 'th'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">Points:</span>
                                        <span className="font-bold">{analytics.worstSeason.points}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">Record:</span>
                                        <span className="font-mono text-xs">{analytics.worstSeason.won}W-{analytics.worstSeason.drawn}D-{analytics.worstSeason.lost}L</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {/* Performance Trends Chart */}
            {analytics.performanceTrends.length >= 3 && (
                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-emerald-500" />
                            Performance Trends
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={analytics.performanceTrends}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                                <YAxis yAxisId="left" tick={{ fontSize: 12 }} label={{ value: 'Points', angle: -90, position: 'insideLeft', fontSize: 12 }} />
                                <YAxis yAxisId="right" orientation="right" reversed tick={{ fontSize: 12 }} label={{ value: 'Position', angle: 90, position: 'insideRight', fontSize: 12 }} />
                                <Tooltip />
                                <Legend />
                                <Area yAxisId="left" type="monotone" dataKey="points" stroke="#10b981" fill="#10b98120" name="Points" />
                                <Line yAxisId="right" type="monotone" dataKey="position" stroke="#f59e0b" strokeWidth={2} name="Position" dot={{ fill: '#f59e0b' }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}

            {/* Goals Trend */}
            {analytics.performanceTrends.length >= 3 && (
                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Target className="w-5 h-5 text-blue-500" />
                            Goal Trends
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={analytics.performanceTrends}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="goalsFor" fill="#10b981" name="Goals Scored" />
                                <Bar dataKey="goalsAgainst" fill="#ef4444" name="Goals Conceded" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Win Rate by Tier */}
                {analytics.tierPerformance.length > 0 && (
                    <Card className="border-0 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="w-5 h-5 text-purple-500" />
                                Performance by Division
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {analytics.tierPerformance.map(tier => (
                                    <div key={tier.tier} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                        <div>
                                            <div className="font-bold">{tier.tier}</div>
                                            <div className="text-xs text-slate-500">{tier.seasons} season{tier.seasons > 1 ? 's' : ''}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-bold text-emerald-600">{tier.winRate}%</div>
                                            <div className="text-xs text-slate-500">Win Rate</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Squad Depth by Position */}
                {analytics.seniorCount > 0 && (
                    <Card className="border-0 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="w-5 h-5 text-blue-500" />
                                Squad Distribution
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie
                                        data={[
                                            { name: 'GK', value: analytics.positionGroups.GK, color: '#fbbf24' },
                                            { name: 'DEF', value: analytics.positionGroups.DEF, color: '#3b82f6' },
                                            { name: 'MID', value: analytics.positionGroups.MID, color: '#10b981' },
                                            { name: 'FWD', value: analytics.positionGroups.FWD, color: '#ef4444' }
                                        ]}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, value }) => `${name}: ${value}`}
                                        outerRadius={80}
                                        dataKey="value"
                                    >
                                        {[
                                            { color: '#fbbf24' },
                                            { color: '#3b82f6' },
                                            { color: '#10b981' },
                                            { color: '#ef4444' }
                                        ].map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="mt-4 grid grid-cols-2 gap-2 text-center text-sm">
                                <div>
                                    <div className="font-bold text-lg">{analytics.seniorCount}</div>
                                    <div className="text-xs text-slate-500">Senior Squad</div>
                                </div>
                                <div>
                                    <div className="font-bold text-lg">{analytics.youthCount}</div>
                                    <div className="text-xs text-slate-500">Youth Players</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Rival Head-to-Heads */}
            {analytics.rivalStats.length > 0 && (
                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Swords className="w-5 h-5 text-red-500" />
                            Rivalry Records
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {analytics.rivalStats.slice(0, 6).map(rival => (
                                <Link
                                    key={rival.rivalId}
                                    to={createPageUrl(`ClubDetail?id=${rival.rivalId}`)}
                                    className="flex items-center gap-3 p-3 bg-red-50 rounded-lg hover:bg-red-100 transition-colors border border-red-200"
                                >
                                    {rival.logo && <img src={rival.logo} alt="" className="w-8 h-8 object-contain" />}
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium truncate">{rival.rivalName}</div>
                                        <div className="text-xs text-red-600">{rival.clashes} season{rival.clashes > 1 ? 's' : ''} together</div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                        <p className="text-xs text-slate-500 mt-3 italic">Seasons competing in the same division</p>
                    </CardContent>
                </Card>
            )}

            {/* Peak Years Timeline */}
            {analytics.peakYears.length > 0 && (
                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Award className="w-5 h-5 text-amber-500" />
                            Golden Eras (Top 3 Finishes)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {analytics.peakYears.map(peak => (
                                <Badge 
                                    key={peak.year}
                                    className={
                                        peak.status === 'champion' 
                                            ? 'bg-amber-500 text-white' 
                                            : peak.position === 2
                                            ? 'bg-slate-300 text-slate-800'
                                            : 'bg-orange-300 text-orange-900'
                                    }
                                >
                                    {peak.year} - {peak.position === 1 ? '🏆 Champions' : `${peak.position}${peak.position === 2 ? 'nd' : 'rd'}`}
                                </Badge>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Form Guide (Last 10 Seasons) */}
            {analytics.performanceTrends.length > 0 && (
                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="w-5 h-5 text-slate-500" />
                            Recent Form (Last 10 Seasons)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {analytics.performanceTrends.slice(-10).reverse().map(s => {
                                let color = 'bg-slate-200';
                                if (s.position === 1) color = 'bg-amber-400';
                                else if (s.position <= 3) color = 'bg-emerald-400';
                                else if (s.position <= 6) color = 'bg-blue-300';
                                else if (s.position >= 15) color = 'bg-red-400';
                                
                                return (
                                    <div 
                                        key={s.year}
                                        className={`${color} px-3 py-2 rounded-lg text-white font-bold text-sm`}
                                        title={`${s.year}: ${s.position}${s.position === 1 ? 'st' : s.position === 2 ? 'nd' : s.position === 3 ? 'rd' : 'th'} (${s.points} pts)`}
                                    >
                                        {s.year.split('-')[0]}: {s.position}
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}