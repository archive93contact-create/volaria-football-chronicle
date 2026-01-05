import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Trophy, TrendingUp, Home, Plane, Swords, Calendar, Award, Target, Zap, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Badge } from "@/components/ui/badge";

export default function ClubAnalyticsDashboard({ club, seasons, leagues, allLeagueTables, rivals = [] }) {
    const analytics = useMemo(() => {
        if (!club || !seasons || seasons.length === 0) return null;

        // Performance over time
        const performanceData = seasons.map(s => {
            const league = leagues.find(l => l.id === s.league_id);
            const winRate = s.played > 0 ? ((s.won / s.played) * 100).toFixed(1) : 0;
            const pointsPerGame = s.played > 0 ? (s.points / s.played).toFixed(2) : 0;
            return {
                year: s.year,
                position: s.position,
                points: s.points,
                winRate: parseFloat(winRate),
                ppg: parseFloat(pointsPerGame),
                tier: league?.tier || 1,
                goalsFor: s.goals_for,
                goalsAgainst: s.goals_against,
                won: s.won,
                drawn: s.drawn,
                lost: s.lost
            };
        }).reverse();

        // Home vs Away (estimate: assume 50/50 split)
        const totalHomeGames = seasons.reduce((sum, s) => sum + Math.floor((s.played || 0) / 2), 0);
        const totalAwayGames = seasons.reduce((sum, s) => sum + Math.ceil((s.played || 0) / 2), 0);
        const homeAwayData = [
            { name: 'Home', games: totalHomeGames },
            { name: 'Away', games: totalAwayGames }
        ];

        // Results distribution
        const totalWins = seasons.reduce((sum, s) => sum + (s.won || 0), 0);
        const totalDraws = seasons.reduce((sum, s) => sum + (s.drawn || 0), 0);
        const totalLosses = seasons.reduce((sum, s) => sum + (s.lost || 0), 0);
        const resultsData = [
            { name: 'Wins', value: totalWins, color: '#10b981' },
            { name: 'Draws', value: totalDraws, color: '#6b7280' },
            { name: 'Losses', value: totalLosses, color: '#ef4444' }
        ];

        // Peak years (best 5 seasons by position and tier)
        const peakSeasons = [...seasons]
            .sort((a, b) => {
                const aLeague = leagues.find(l => l.id === a.league_id);
                const bLeague = leagues.find(l => l.id === b.league_id);
                const aTier = aLeague?.tier || 99;
                const bTier = bLeague?.tier || 99;
                if (aTier !== bTier) return aTier - bTier;
                return a.position - b.position;
            })
            .slice(0, 5);

        // Streaks
        let longestWinStreak = 0;
        let longestUnbeatenStreak = 0;
        seasons.forEach(s => {
            if (s.won >= longestWinStreak) longestWinStreak = s.won;
            if ((s.won + s.drawn) >= longestUnbeatenStreak) longestUnbeatenStreak = s.won + s.drawn;
        });

        // Rivalry head-to-head (if rivals data provided)
        const rivalryRecords = rivals.map(rival => {
            // Count matches from league tables where both clubs were in same league
            const sharedSeasons = allLeagueTables.filter(t => 
                t.club_id === club.id || t.club_id === rival.id
            );
            const years = [...new Set(sharedSeasons.map(t => t.year))];
            
            return {
                rival,
                seasons: years.length,
                // Simplified - would need match data for exact records
            };
        }).filter(r => r.seasons > 0);

        // Trophy timeline
        const trophyTimeline = [];
        if (club.title_years) {
            club.title_years.split(',').forEach(y => {
                trophyTimeline.push({ year: y.trim(), type: 'League Title', color: '#f59e0b' });
            });
        }
        if (club.domestic_cup_title_years) {
            club.domestic_cup_title_years.split(',').forEach(y => {
                trophyTimeline.push({ year: y.trim(), type: 'Domestic Cup', color: '#fb923c' });
            });
        }
        if (club.vcc_title_years) {
            club.vcc_title_years.split(',').forEach(y => {
                trophyTimeline.push({ year: y.trim(), type: 'VCC', color: '#a855f7' });
            });
        }
        if (club.ccc_title_years) {
            club.ccc_title_years.split(',').forEach(y => {
                trophyTimeline.push({ year: y.trim(), type: 'CCC', color: '#3b82f6' });
            });
        }
        trophyTimeline.sort((a, b) => a.year.localeCompare(b.year));

        // Tier journey
        const tierJourney = performanceData.map(d => ({
            year: d.year,
            tier: d.tier,
            position: d.position
        }));

        return {
            performanceData,
            homeAwayData,
            resultsData,
            peakSeasons,
            longestWinStreak,
            longestUnbeatenStreak,
            rivalryRecords,
            trophyTimeline,
            tierJourney,
            avgPointsPerGame: (performanceData.reduce((sum, d) => sum + d.ppg, 0) / performanceData.length).toFixed(2),
            avgGoalsFor: (seasons.reduce((sum, s) => sum + (s.goals_for || 0), 0) / seasons.length).toFixed(1),
            avgGoalsAgainst: (seasons.reduce((sum, s) => sum + (s.goals_against || 0), 0) / seasons.length).toFixed(1)
        };
    }, [club, seasons, leagues, allLeagueTables, rivals]);

    if (!analytics) {
        return (
            <div className="text-center py-12 text-slate-500">
                <Target className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p>Not enough data for analytics yet</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-4 text-center">
                        <Zap className="w-5 h-5 text-blue-500 mx-auto mb-2" />
                        <div className="text-2xl font-bold">{analytics.avgPointsPerGame}</div>
                        <div className="text-xs text-slate-500">Avg Points/Game</div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-4 text-center">
                        <Target className="w-5 h-5 text-green-500 mx-auto mb-2" />
                        <div className="text-2xl font-bold">{analytics.avgGoalsFor}</div>
                        <div className="text-xs text-slate-500">Avg Goals/Season</div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-4 text-center">
                        <Shield className="w-5 h-5 text-red-500 mx-auto mb-2" />
                        <div className="text-2xl font-bold">{analytics.avgGoalsAgainst}</div>
                        <div className="text-xs text-slate-500">Avg Conceded/Season</div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-4 text-center">
                        <Trophy className="w-5 h-5 text-amber-500 mx-auto mb-2" />
                        <div className="text-2xl font-bold">{analytics.longestWinStreak}</div>
                        <div className="text-xs text-slate-500">Best Win Streak</div>
                    </CardContent>
                </Card>
            </div>

            {/* Performance Trends */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-emerald-500" />
                            League Position Trend
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={analytics.performanceData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                                <YAxis reversed domain={[1, 'dataMax']} tick={{ fontSize: 12 }} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                                    formatter={(value, name) => {
                                        if (name === 'position') return [`${value}${value === 1 ? 'st' : value === 2 ? 'nd' : value === 3 ? 'rd' : 'th'}`, 'Position'];
                                        return [value, name];
                                    }}
                                />
                                <Line type="monotone" dataKey="position" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 4 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Zap className="w-5 h-5 text-blue-500" />
                            Points Per Game Trend
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                            <AreaChart data={analytics.performanceData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} domain={[0, 3]} />
                                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                                <Area type="monotone" dataKey="ppg" stroke="#3b82f6" fill="#93c5fd" fillOpacity={0.6} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Goals Trend & Results Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Target className="w-5 h-5 text-purple-500" />
                            Goals For vs Against
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={analytics.performanceData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                                <Legend />
                                <Bar dataKey="goalsFor" fill="#10b981" name="Goals For" />
                                <Bar dataKey="goalsAgainst" fill="#ef4444" name="Goals Against" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Award className="w-5 h-5 text-slate-500" />
                            All-Time Results Distribution
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={analytics.resultsData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {analytics.resultsData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Peak Years */}
            {analytics.peakSeasons.length > 0 && (
                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-amber-500" />
                            Peak Years
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                            {analytics.peakSeasons.map((s, idx) => {
                                const league = leagues.find(l => l.id === s.league_id);
                                return (
                                    <div key={s.id} className="p-4 rounded-lg bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200">
                                        <div className="flex items-center gap-2 mb-2">
                                            {idx === 0 && <Trophy className="w-4 h-4 text-amber-500" />}
                                            <div className="font-bold text-amber-700">{s.year}</div>
                                        </div>
                                        <div className="text-2xl font-bold text-amber-800 mb-1">
                                            {s.position}{s.position === 1 ? 'st' : s.position === 2 ? 'nd' : s.position === 3 ? 'rd' : 'th'}
                                        </div>
                                        <div className="text-xs text-amber-600">
                                            {league?.name} (T{league?.tier})
                                        </div>
                                        <div className="text-xs text-slate-600 mt-1">
                                            {s.points} pts • {s.won}W {s.drawn}D {s.lost}L
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Trophy Timeline */}
            {analytics.trophyTimeline.length > 0 && (
                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-purple-500" />
                            Trophy Timeline ({analytics.trophyTimeline.length} honours)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="relative">
                            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />
                            <div className="space-y-4">
                                {analytics.trophyTimeline.map((trophy, idx) => (
                                    <div key={idx} className="flex items-center gap-4 relative">
                                        <div 
                                            className="w-8 h-8 rounded-full flex items-center justify-center z-10 shadow-md"
                                            style={{ backgroundColor: trophy.color }}
                                        >
                                            <Trophy className="w-4 h-4 text-white" />
                                        </div>
                                        <div className="flex-1 p-3 rounded-lg bg-slate-50">
                                            <div className="font-bold" style={{ color: trophy.color }}>{trophy.type}</div>
                                            <div className="text-sm text-slate-600">{trophy.year}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Tier Journey Visualization */}
            {analytics.tierJourney.length > 0 && (
                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-indigo-500" />
                            League Tier Journey
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={200}>
                            <LineChart data={analytics.tierJourney}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                                <YAxis reversed domain={[1, 'dataMax + 1']} tick={{ fontSize: 12 }} label={{ value: 'Tier', angle: -90, position: 'insideLeft' }} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                                    formatter={(value, name) => {
                                        if (name === 'tier') return [`Tier ${value}`, 'Division'];
                                        return [value, name];
                                    }}
                                />
                                <Line type="stepAfter" dataKey="tier" stroke="#6366f1" strokeWidth={3} dot={{ fill: '#6366f1', r: 5 }} />
                            </LineChart>
                        </ResponsiveContainer>
                        <p className="text-xs text-slate-500 mt-2 text-center italic">
                            Lower tier number = higher division (Tier 1 is top flight)
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Rivalry Records */}
            {analytics.rivalryRecords.length > 0 && (
                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Swords className="w-5 h-5 text-red-500" />
                            Rivalry Records
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {analytics.rivalryRecords.map(({ rival, seasons }) => (
                                <Link 
                                    key={rival.id}
                                    to={createPageUrl(`ClubDetail?id=${rival.id}`)}
                                    className="flex items-center justify-between p-4 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        {rival.logo_url && <img src={rival.logo_url} alt="" className="w-8 h-8 object-contain" />}
                                        <div>
                                            <div className="font-bold">{rival.name}</div>
                                            <div className="text-xs text-slate-500">{seasons} seasons together</div>
                                        </div>
                                    </div>
                                    <Swords className="w-5 h-5 text-red-400" />
                                </Link>
                            ))}
                        </div>
                        <p className="text-xs text-slate-500 mt-4 italic">Seasons played in the same division</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}