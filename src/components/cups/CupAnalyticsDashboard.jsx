import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, Award, Users, Target, Crown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function CupAnalyticsDashboard({ seasons, clubs }) {
    const analytics = useMemo(() => {
        if (!seasons || seasons.length === 0) return null;

        // Title counts
        const titleCounts = {};
        const runnerUpCounts = {};
        const finalAppearances = {};

        seasons.forEach(s => {
            if (s.champion_name) {
                titleCounts[s.champion_name] = (titleCounts[s.champion_name] || 0) + 1;
                finalAppearances[s.champion_name] = (finalAppearances[s.champion_name] || 0) + 1;
            }
            if (s.runner_up) {
                runnerUpCounts[s.runner_up] = (runnerUpCounts[s.runner_up] || 0) + 1;
                finalAppearances[s.runner_up] = (finalAppearances[s.runner_up] || 0) + 1;
            }
        });

        // Most successful clubs
        const mostSuccessful = Object.entries(titleCounts)
            .map(([name, titles]) => ({
                name,
                titles,
                runnerUps: runnerUpCounts[name] || 0,
                finalAppearances: finalAppearances[name] || 0,
                club: clubs?.find(c => c.name === name)
            }))
            .sort((a, b) => b.titles - a.titles || b.finalAppearances - a.finalAppearances)
            .slice(0, 10);

        // Most finals without winning
        const unluckyClubs = Object.entries(runnerUpCounts)
            .filter(([name]) => !titleCounts[name])
            .map(([name, count]) => ({
                name,
                runnerUps: count,
                club: clubs?.find(c => c.name === name)
            }))
            .sort((a, b) => b.runnerUps - a.runnerUps)
            .slice(0, 5);

        // Winning streaks and dominance
        const winningStreaks = [];
        let currentStreak = null;

        seasons.sort((a, b) => a.year.localeCompare(b.year)).forEach((s, idx) => {
            if (!currentStreak) {
                currentStreak = { club: s.champion_name, start: s.year, end: s.year, count: 1 };
            } else if (s.champion_name === currentStreak.club) {
                currentStreak.end = s.year;
                currentStreak.count++;
            } else {
                if (currentStreak.count >= 2) {
                    winningStreaks.push(currentStreak);
                }
                currentStreak = { club: s.champion_name, start: s.year, end: s.year, count: 1 };
            }
        });
        if (currentStreak && currentStreak.count >= 2) {
            winningStreaks.push(currentStreak);
        }
        winningStreaks.sort((a, b) => b.count - a.count);

        // Decade breakdown
        const decadeData = {};
        seasons.forEach(s => {
            const decade = Math.floor(parseInt(s.year) / 10) * 10;
            const decadeLabel = `${decade}s`;
            if (!decadeData[decadeLabel]) {
                decadeData[decadeLabel] = {
                    decade: decadeLabel,
                    uniqueWinners: new Set(),
                    totalEditions: 0
                };
            }
            decadeData[decadeLabel].uniqueWinners.add(s.champion_name);
            decadeData[decadeLabel].totalEditions++;
        });

        const decadeChart = Object.values(decadeData)
            .map(d => ({
                decade: d.decade,
                'Unique Winners': d.uniqueWinners.size,
                'Total Editions': d.totalEditions
            }))
            .sort((a, b) => a.decade.localeCompare(b.decade));

        return {
            mostSuccessful,
            unluckyClubs,
            winningStreaks,
            decadeChart,
            totalEditions: seasons.length,
            uniqueWinners: new Set(seasons.map(s => s.champion_name).filter(Boolean)).size
        };
    }, [seasons, clubs]);

    if (!analytics) {
        return (
            <Card>
                <CardContent className="py-8">
                    <p className="text-slate-500 text-center">No cup data available for analytics</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Overview Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4 text-center">
                        <Trophy className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                        <div className="text-2xl font-bold">{analytics.totalEditions}</div>
                        <div className="text-xs text-slate-500">Total Editions</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <Users className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                        <div className="text-2xl font-bold">{analytics.uniqueWinners}</div>
                        <div className="text-xs text-slate-500">Unique Winners</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <Crown className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                        <div className="text-2xl font-bold">{analytics.mostSuccessful[0]?.titles || 0}</div>
                        <div className="text-xs text-slate-500">Most Titles</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <TrendingUp className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                        <div className="text-2xl font-bold">{analytics.winningStreaks[0]?.count || 0}</div>
                        <div className="text-xs text-slate-500">Longest Streak</div>
                    </CardContent>
                </Card>
            </div>

            {/* Most Successful Clubs */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-amber-600" />
                        Most Successful Clubs
                    </CardTitle>
                    <CardDescription>Clubs with the most cup titles</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {analytics.mostSuccessful.map((data, idx) => (
                            <div key={data.name} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg border">
                                <span className="text-2xl font-bold text-slate-400 w-8 text-center">#{idx + 1}</span>
                                {data.club?.logo_url && (
                                    <img src={data.club.logo_url} alt={data.name} className="w-10 h-10 object-contain bg-white rounded" />
                                )}
                                <div className="flex-1">
                                    {data.club ? (
                                        <Link to={createPageUrl('ClubDetail', `?id=${data.club.id}`)} className="font-bold text-slate-900 hover:text-emerald-600 hover:underline">
                                            {data.name}
                                        </Link>
                                    ) : (
                                        <span className="font-bold text-slate-900">{data.name}</span>
                                    )}
                                    <p className="text-sm text-slate-600">
                                        {data.finalAppearances} final{data.finalAppearances > 1 ? 's' : ''} • {data.runnerUps} runner-up{data.runnerUps > 1 ? 's' : ''}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge className="bg-amber-100 text-amber-800">
                                        <Trophy className="w-3 h-3 mr-1" />
                                        {data.titles}
                                    </Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Winning Streaks */}
            {analytics.winningStreaks.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-purple-600" />
                            Winning Streaks
                        </CardTitle>
                        <CardDescription>Consecutive title wins</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {analytics.winningStreaks.slice(0, 5).map((streak, idx) => {
                                const club = clubs?.find(c => c.name === streak.club);
                                return (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
                                        <div className="flex items-center gap-3">
                                            {club?.logo_url && (
                                                <img src={club.logo_url} alt={streak.club} className="w-6 h-6 object-contain bg-white rounded" />
                                            )}
                                            <div>
                                                {club ? (
                                                    <Link to={createPageUrl('ClubDetail', `?id=${club.id}`)} className="font-bold text-slate-900 hover:text-purple-600 hover:underline">
                                                        {streak.club}
                                                    </Link>
                                                ) : (
                                                    <span className="font-bold text-slate-900">{streak.club}</span>
                                                )}
                                                <p className="text-sm text-slate-600">{streak.start} - {streak.end}</p>
                                            </div>
                                        </div>
                                        <Badge className="bg-purple-100 text-purple-800">
                                            {streak.count} consecutive {streak.count > 1 ? 'titles' : 'title'}
                                        </Badge>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Unlucky Clubs */}
            {analytics.unluckyClubs.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Award className="w-5 h-5 text-slate-600" />
                            Most Finals Without Winning
                        </CardTitle>
                        <CardDescription>Clubs that reached finals but never won</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {analytics.unluckyClubs.map((data) => {
                                const club = data.club;
                                return (
                                    <div key={data.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                                        <div className="flex items-center gap-3">
                                            {club?.logo_url && (
                                                <img src={club.logo_url} alt={data.name} className="w-6 h-6 object-contain bg-white rounded" />
                                            )}
                                            {club ? (
                                                <Link to={createPageUrl('ClubDetail', `?id=${club.id}`)} className="font-bold text-slate-900 hover:text-emerald-600 hover:underline">
                                                    {data.name}
                                                </Link>
                                            ) : (
                                                <span className="font-bold text-slate-900">{data.name}</span>
                                            )}
                                        </div>
                                        <Badge variant="outline">
                                            {data.runnerUps} runner-up{data.runnerUps > 1 ? 's' : ''}
                                        </Badge>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Decade Analysis */}
            {analytics.decadeChart.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Competition Spread by Decade</CardTitle>
                        <CardDescription>How competitive the cup was across different eras</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={analytics.decadeChart}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="decade" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="Unique Winners" fill="#10b981" />
                                <Bar dataKey="Total Editions" fill="#3b82f6" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}