import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart, ScatterChart, Scatter } from 'recharts';
import { Trophy, TrendingUp, Target, Zap, MapPin, Calendar, Users, Award, Shield, Percent } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function LeagueAnalyticsDashboard({ league, seasons, leagueTables, clubs }) {
    const analytics = useMemo(() => {
        if (!seasons || seasons.length === 0) return null;

        // Title concentration (Gini coefficient approximation)
        const titleCounts = {};
        seasons.forEach(s => {
            if (s.champion_name) {
                titleCounts[s.champion_name] = (titleCounts[s.champion_name] || 0) + 1;
            }
        });
        const titleDistribution = Object.values(titleCounts);
        const uniqueChampions = Object.keys(titleCounts).length;
        const avgTitlesPerChampion = titleDistribution.reduce((a, b) => a + b, 0) / (uniqueChampions || 1);
        const competitiveBalance = (uniqueChampions / seasons.length * 100).toFixed(1);

        // Points trends by year
        const pointsTrends = seasons.map(s => {
            const seasonTable = leagueTables.filter(t => t.season_id === s.id || (t.league_id === league.id && t.year === s.year));
            const champion = seasonTable.find(t => t.position === 1);
            const avgPoints = seasonTable.length > 0 
                ? seasonTable.reduce((sum, t) => sum + (t.points || 0), 0) / seasonTable.length
                : 0;
            return {
                year: s.year,
                championPoints: champion?.points || 0,
                avgPoints: avgPoints.toFixed(1),
                topGoals: Math.max(...seasonTable.map(t => t.goals_for || 0), 0)
            };
        }).reverse();

        // Goal scoring trends
        const goalTrends = seasons.map(s => {
            const seasonTable = leagueTables.filter(t => t.season_id === s.id || (t.league_id === league.id && t.year === s.year));
            const totalGoals = seasonTable.reduce((sum, t) => sum + (t.goals_for || 0), 0);
            const avgGoals = seasonTable.length > 0 ? (totalGoals / seasonTable.length).toFixed(1) : 0;
            return {
                year: s.year,
                totalGoals,
                avgGoals: parseFloat(avgGoals)
            };
        }).reverse();

        // Promotion success rate
        const promotedClubsTracking = [];
        for (let i = 1; i < seasons.length; i++) {
            const currentSeason = seasons[i];
            const prevSeason = seasons[i - 1];
            
            if (prevSeason.promoted_teams) {
                const promoted = prevSeason.promoted_teams.split(',').map(t => t.trim());
                const currentTable = leagueTables.filter(t => 
                    (t.season_id === currentSeason.id || (t.league_id === league.id && t.year === currentSeason.year))
                );
                
                promoted.forEach(clubName => {
                    const clubEntry = currentTable.find(t => t.club_name === clubName);
                    if (clubEntry) {
                        const survived = !currentSeason.relegated_teams?.split(',').map(t => t.trim()).includes(clubName);
                        promotedClubsTracking.push({
                            club: clubName,
                            year: currentSeason.year,
                            survived,
                            position: clubEntry.position
                        });
                    }
                });
            }
        }
        const survivalRate = promotedClubsTracking.length > 0
            ? (promotedClubsTracking.filter(p => p.survived).length / promotedClubsTracking.length * 100).toFixed(1)
            : 0;
        const avgPromotedPosition = promotedClubsTracking.length > 0
            ? (promotedClubsTracking.reduce((sum, p) => sum + p.position, 0) / promotedClubsTracking.length).toFixed(1)
            : 0;

        // Champion origins (geographic)
        const championsByRegion = {};
        seasons.forEach(s => {
            if (s.champion_name) {
                const club = clubs.find(c => c.name === s.champion_name);
                if (club?.region) {
                    championsByRegion[club.region] = (championsByRegion[club.region] || 0) + 1;
                }
            }
        });
        const topRegion = Object.entries(championsByRegion).sort((a, b) => b[1] - a[1])[0];

        // Title dynasties visualization
        const dynastyData = [];
        const sortedSeasons = [...seasons].sort((a, b) => a.year.localeCompare(b.year));
        let currentChampion = null;
        let currentStreak = 0;
        
        sortedSeasons.forEach((s, idx) => {
            if (s.champion_name === currentChampion) {
                currentStreak++;
            } else {
                if (currentStreak >= 2) {
                    dynastyData.push({
                        club: currentChampion,
                        streak: currentStreak,
                        endYear: sortedSeasons[idx - 1]?.year
                    });
                }
                currentChampion = s.champion_name;
                currentStreak = 1;
            }
        });
        if (currentStreak >= 2) {
            dynastyData.push({
                club: currentChampion,
                streak: currentStreak,
                endYear: sortedSeasons[sortedSeasons.length - 1]?.year
            });
        }
        dynastyData.sort((a, b) => b.streak - a.streak);

        // Volatility - how much does table change
        let volatilityScore = 0;
        for (let i = 1; i < seasons.length; i++) {
            const curr = leagueTables.filter(t => t.season_id === seasons[i].id);
            const prev = leagueTables.filter(t => t.season_id === seasons[i-1].id);
            const currClubs = new Set(curr.map(t => t.club_name));
            const prevClubs = new Set(prev.map(t => t.club_name));
            const turnover = [...currClubs].filter(c => !prevClubs.has(c)).length;
            volatilityScore += turnover;
        }
        const avgTurnover = seasons.length > 1 ? (volatilityScore / (seasons.length - 1)).toFixed(1) : 0;

        return {
            pointsTrends,
            goalTrends,
            competitiveBalance,
            uniqueChampions,
            survivalRate,
            avgPromotedPosition,
            topRegion,
            dynastyData,
            avgTurnover,
            avgTitlesPerChampion: avgTitlesPerChampion.toFixed(1)
        };
    }, [league, seasons, leagueTables, clubs]);

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
                        <Users className="w-5 h-5 text-purple-500 mx-auto mb-2" />
                        <div className="text-2xl font-bold">{analytics.uniqueChampions}</div>
                        <div className="text-xs text-slate-500">Different Champions</div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-4 text-center">
                        <Percent className="w-5 h-5 text-emerald-500 mx-auto mb-2" />
                        <div className="text-2xl font-bold">{analytics.competitiveBalance}%</div>
                        <div className="text-xs text-slate-500">Competitive Balance</div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-4 text-center">
                        <TrendingUp className="w-5 h-5 text-blue-500 mx-auto mb-2" />
                        <div className="text-2xl font-bold">{analytics.survivalRate}%</div>
                        <div className="text-xs text-slate-500">Promoted Club Survival</div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-4 text-center">
                        <Shield className="w-5 h-5 text-slate-500 mx-auto mb-2" />
                        <div className="text-2xl font-bold">{analytics.avgTurnover}</div>
                        <div className="text-xs text-slate-500">Avg Club Turnover</div>
                    </CardContent>
                </Card>
            </div>

            {/* Points Trends */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-amber-500" />
                            Champion Points Trend
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={analytics.pointsTrends}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                                <Legend />
                                <Line type="monotone" dataKey="championPoints" stroke="#f59e0b" strokeWidth={2} name="Champion Points" dot={{ r: 3 }} />
                                <Line type="monotone" dataKey="avgPoints" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" name="League Average" dot={{ r: 3 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Zap className="w-5 h-5 text-blue-500" />
                            Goal Scoring Evolution
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                            <AreaChart data={analytics.goalTrends}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                                <Area type="monotone" dataKey="avgGoals" stroke="#3b82f6" fill="#93c5fd" fillOpacity={0.6} name="Avg Goals per Club" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Title Dynasties */}
            {analytics.dynastyData.length > 0 && (
                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-purple-500" />
                            Title Dynasties (2+ consecutive)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={analytics.dynastyData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis type="number" tick={{ fontSize: 12 }} />
                                <YAxis dataKey="club" type="category" width={150} tick={{ fontSize: 12 }} />
                                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
                                <Bar dataKey="streak" fill="#a855f7" name="Consecutive Titles" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}

            {/* Geographic Distribution */}
            {analytics.topRegion && (
                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-indigo-500" />
                            Champion Origins
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="p-6 rounded-lg bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200">
                            <div className="text-center">
                                <div className="text-3xl font-bold text-indigo-700">{analytics.topRegion[0]}</div>
                                <div className="text-slate-600 mt-2">
                                    {analytics.topRegion[1]} championship{analytics.topRegion[1] > 1 ? 's' : ''} - Most successful region
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Promotion/Relegation Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-green-500" />
                            Promoted Club Success
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="p-4 rounded-lg bg-green-50">
                                <div className="text-4xl font-bold text-green-600 mb-1">{analytics.survivalRate}%</div>
                                <div className="text-sm text-green-700">Survival Rate</div>
                                <div className="text-xs text-slate-500 mt-1">Promoted clubs that avoided immediate relegation</div>
                            </div>
                            <div className="p-4 rounded-lg bg-blue-50">
                                <div className="text-4xl font-bold text-blue-600 mb-1">{analytics.avgPromotedPosition}</div>
                                <div className="text-sm text-blue-700">Average Finish Position</div>
                                <div className="text-xs text-slate-500 mt-1">Where promoted clubs typically finish</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Award className="w-5 h-5 text-amber-500" />
                            Competitive Metrics
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="p-4 rounded-lg bg-amber-50">
                                <div className="text-4xl font-bold text-amber-600 mb-1">{analytics.avgTitlesPerChampion}</div>
                                <div className="text-sm text-amber-700">Avg Titles per Champion</div>
                                <div className="text-xs text-slate-500 mt-1">Lower = more competitive league</div>
                            </div>
                            <div className="p-4 rounded-lg bg-slate-50">
                                <div className="text-4xl font-bold text-slate-600 mb-1">{analytics.avgTurnover}</div>
                                <div className="text-sm text-slate-700">Avg Yearly Turnover</div>
                                <div className="text-xs text-slate-500 mt-1">New clubs entering per season</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}