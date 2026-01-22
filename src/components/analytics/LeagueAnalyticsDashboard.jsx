import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, AreaChart, Area } from 'recharts';
import { Trophy, TrendingUp, Activity, MapPin, Users, Target, Flame, Crown, BarChart3, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import LeagueAllTimeClubs from '@/components/leagues/LeagueAllTimeClubs';

export default function LeagueAnalyticsDashboard({ league, seasons = [], allTables = [], clubs = [] }) {
    const analytics = useMemo(() => {
        if (!league || seasons.length === 0) return null;

        // Sort seasons chronologically
        const sortedSeasons = [...seasons].sort((a, b) => a.year.localeCompare(b.year));
        
        // Competitive Balance (Gini Coefficient approximation)
        const championCounts = {};
        sortedSeasons.forEach(s => {
            if (s.champion_name) {
                championCounts[s.champion_name] = (championCounts[s.champion_name] || 0) + 1;
            }
        });
        
        const uniqueChampions = Object.keys(championCounts).length;
        const totalSeasons = sortedSeasons.length;
        const competitiveBalance = uniqueChampions / Math.max(totalSeasons, 1);
        
        // Title concentration
        const mostSuccessfulClub = Object.entries(championCounts).sort((a, b) => b[1] - a[1])[0];
        const titleConcentration = mostSuccessfulClub ? (mostSuccessfulClub[1] / totalSeasons * 100).toFixed(1) : 0;
        
        // Dynasty Map (which clubs dominated which eras)
        const dynasties = [];
        let currentDynasty = null;
        sortedSeasons.forEach(s => {
            if (s.champion_name) {
                if (currentDynasty && currentDynasty.club === s.champion_name) {
                    currentDynasty.endYear = s.year;
                    currentDynasty.count++;
                } else {
                    if (currentDynasty) dynasties.push(currentDynasty);
                    currentDynasty = { club: s.champion_name, startYear: s.year, endYear: s.year, count: 1 };
                }
            }
        });
        if (currentDynasty) dynasties.push(currentDynasty);
        
        // Only keep dynasties of 2+ consecutive titles
        const significantDynasties = dynasties.filter(d => d.count >= 2);
        
        // Points gap trends (champion vs runner-up)
        const pointsGapData = sortedSeasons.map(s => {
            const seasonTables = allTables.filter(t => t.season_id === s.id || (t.league_id === league.id && t.year === s.year));
            const sorted = seasonTables.sort((a, b) => a.position - b.position);
            const champion = sorted[0];
            const runnerUp = sorted[1];
            const gap = champion && runnerUp ? (champion.points || 0) - (runnerUp.points || 0) : 0;
            
            return {
                year: s.year,
                gap,
                champion: champion?.club_name || s.champion_name
            };
        });
        
        const avgPointsGap = pointsGapData.length > 0 
            ? (pointsGapData.reduce((sum, d) => sum + d.gap, 0) / pointsGapData.length).toFixed(1)
            : 0;
        
        // Goal economy by era
        const goalData = sortedSeasons.map(s => {
            const seasonTables = allTables.filter(t => t.season_id === s.id || (t.league_id === league.id && t.year === s.year));
            const totalGoals = seasonTables.reduce((sum, t) => sum + (t.goals_for || 0), 0);
            const totalGames = seasonTables.reduce((sum, t) => sum + (t.played || 0), 0);
            const avgGoalsPerGame = totalGames > 0 ? totalGoals / totalGames : 0;
            
            return {
                year: s.year,
                totalGoals,
                avgGoalsPerGame: avgGoalsPerGame.toFixed(2)
            };
        });
        
        // Promotion success rate
        const promotionTracking = [];
        for (let i = 0; i < sortedSeasons.length - 1; i++) {
            const currentSeason = sortedSeasons[i];
            const nextSeason = sortedSeasons[i + 1];
            
            if (currentSeason.promoted_teams && nextSeason) {
                const promotedClubs = currentSeason.promoted_teams.split(',').map(c => c.trim()).filter(Boolean);
                const nextSeasonTables = allTables.filter(t => t.season_id === nextSeason.id || (t.league_id === league.id && t.year === nextSeason.year));
                
                promotedClubs.forEach(clubName => {
                    const clubInNextSeason = nextSeasonTables.find(t => t.club_name === clubName);
                    if (clubInNextSeason) {
                        const survived = !nextSeason.relegated_teams?.split(',').map(c => c.trim()).includes(clubName);
                        const position = clubInNextSeason.position;
                        promotionTracking.push({ year: nextSeason.year, clubName, survived, position });
                    }
                });
            }
        }
        
        const totalPromoted = promotionTracking.length;
        const survivedPromoted = promotionTracking.filter(p => p.survived).length;
        const promotionSurvivalRate = totalPromoted > 0 ? (survivedPromoted / totalPromoted * 100).toFixed(1) : 0;
        const avgPromotedFinish = totalPromoted > 0 ? (promotionTracking.reduce((sum, p) => sum + p.position, 0) / totalPromoted).toFixed(1) : 0;
        
        // Geographic heatmap
        const championsByRegion = {};
        sortedSeasons.forEach(s => {
            if (s.champion_name) {
                const club = clubs.find(c => c.name === s.champion_name);
                if (club?.region) {
                    championsByRegion[club.region] = (championsByRegion[club.region] || 0) + 1;
                }
            }
        });
        
        // Volatility Index (how much table changes season-to-season)
        let totalPositionChanges = 0;
        let comparisonCount = 0;
        
        for (let i = 0; i < sortedSeasons.length - 1; i++) {
            const currentTables = allTables.filter(t => t.season_id === sortedSeasons[i].id || (t.league_id === league.id && t.year === sortedSeasons[i].year));
            const nextTables = allTables.filter(t => t.season_id === sortedSeasons[i + 1].id || (t.league_id === league.id && t.year === sortedSeasons[i + 1].year));
            
            currentTables.forEach(current => {
                const next = nextTables.find(n => n.club_name === current.club_name);
                if (next) {
                    totalPositionChanges += Math.abs(current.position - next.position);
                    comparisonCount++;
                }
            });
        }
        
        const volatilityIndex = comparisonCount > 0 ? (totalPositionChanges / comparisonCount).toFixed(2) : 0;
        
        // Most appearances by club
        const clubAppearances = {};
        allTables.forEach(t => {
            clubAppearances[t.club_name] = (clubAppearances[t.club_name] || 0) + 1;
        });
        const mostFrequentClubs = Object.entries(clubAppearances)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([name, count]) => {
                const club = clubs.find(c => c.name === name);
                return { name, count, clubId: club?.id };
            });
        
        // Title distribution chart
        const titleDistributionData = Object.entries(championCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([name, count]) => {
                const club = clubs.find(c => c.name === name);
                return { name, titles: count, clubId: club?.id };
            });
        
        return {
            uniqueChampions,
            competitiveBalance: (competitiveBalance * 100).toFixed(1),
            mostSuccessfulClub,
            titleConcentration,
            dynasties: significantDynasties,
            pointsGapData,
            avgPointsGap,
            goalData,
            promotionTracking,
            promotionSurvivalRate,
            avgPromotedFinish,
            championsByRegion,
            volatilityIndex,
            mostFrequentClubs,
            titleDistributionData,
            totalSeasons,
            totalPromoted,
            survivedPromoted
        };
    }, [league, seasons, allTables, clubs]);

    if (!analytics) {
        return (
            <Card className="border-dashed border-2 border-slate-300">
                <CardContent className="flex flex-col items-center justify-center py-16">
                    <BarChart3 className="w-16 h-16 text-slate-300 mb-4" />
                    <h3 className="text-xl font-semibold text-slate-700 mb-2">No Data Yet</h3>
                    <p className="text-slate-500">Add season data to see analytics</p>
                </CardContent>
            </Card>
        );
    }

    const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#14b8a6'];

    return (
        <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50">
                    <CardContent className="p-4 text-center">
                        <Trophy className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                        <div className="text-3xl font-bold text-blue-700">{analytics.uniqueChampions}</div>
                        <div className="text-xs text-blue-600">Different Champions</div>
                        <div className="text-xs text-slate-500 mt-1">{analytics.totalSeasons} seasons</div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-emerald-50">
                    <CardContent className="p-4 text-center">
                        <Activity className="w-6 h-6 text-green-600 mx-auto mb-2" />
                        <div className="text-3xl font-bold text-green-700">{analytics.competitiveBalance}%</div>
                        <div className="text-xs text-green-600">Competitive Balance</div>
                        <div className="text-xs text-slate-500 mt-1">Higher = More balanced</div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-orange-50">
                    <CardContent className="p-4 text-center">
                        <Crown className="w-6 h-6 text-amber-600 mx-auto mb-2" />
                        <div className="text-3xl font-bold text-amber-700">{analytics.avgPointsGap}</div>
                        <div className="text-xs text-amber-600">Avg Points Gap</div>
                        <div className="text-xs text-slate-500 mt-1">Champion vs Runner-up</div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-fuchsia-50">
                    <CardContent className="p-4 text-center">
                        <TrendingUp className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                        <div className="text-3xl font-bold text-purple-700">{analytics.volatilityIndex}</div>
                        <div className="text-xs text-purple-600">Volatility Index</div>
                        <div className="text-xs text-slate-500 mt-1">Avg position change</div>
                    </CardContent>
                </Card>
            </div>

            {/* Title Distribution */}
            <Card className="border-0 shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-amber-500" />
                        Title Dynasty Map
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={analytics.titleDistributionData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="titles" fill="#f59e0b" name="Championships" />
                        </BarChart>
                    </ResponsiveContainer>
                    {analytics.mostSuccessfulClub && (
                        <div className="mt-4 p-4 bg-amber-50 rounded-lg text-center">
                            <div className="text-sm text-amber-700 mb-1">Most Successful Club</div>
                            <div className="text-2xl font-bold text-amber-800">{analytics.mostSuccessfulClub[0]}</div>
                            <div className="text-sm text-amber-600">{analytics.mostSuccessfulClub[1]} titles ({analytics.titleConcentration}% of all titles)</div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Competitive Trends */}
            <Card className="border-0 shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-blue-500" />
                        Title Race Competitiveness
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={analytics.pointsGapData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="year" angle={-45} textAnchor="end" height={80} />
                            <YAxis label={{ value: 'Points Gap', angle: -90, position: 'insideLeft' }} />
                            <Tooltip content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    return (
                                        <div className="bg-white p-3 border rounded shadow-lg">
                                            <p className="font-semibold">{payload[0].payload.year}</p>
                                            <p className="text-sm text-slate-600">Champion: {payload[0].payload.champion}</p>
                                            <p className="text-sm">Gap: {payload[0].value} points</p>
                                        </div>
                                    );
                                }
                                return null;
                            }} />
                            <Line type="monotone" dataKey="gap" stroke="#3b82f6" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                    <div className="mt-2 text-center text-sm text-slate-500">
                        Lower gap = More competitive title race
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Goal Economy */}
                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Target className="w-5 h-5 text-green-500" />
                            Goal Economy Trends
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                            <AreaChart data={analytics.goalData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="year" angle={-45} textAnchor="end" height={60} />
                                <YAxis />
                                <Tooltip />
                                <Area type="monotone" dataKey="avgGoalsPerGame" stroke="#10b981" fill="#10b981" fillOpacity={0.6} name="Avg Goals/Game" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Geographic Distribution */}
                {Object.keys(analytics.championsByRegion).length > 0 && (
                    <Card className="border-0 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-indigo-500" />
                                Champions by Region
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie
                                        data={Object.entries(analytics.championsByRegion).map(([name, value]) => ({ name, value }))}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {Object.entries(analytics.championsByRegion).map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Dynasty Eras */}
            {analytics.dynasties.length > 0 && (
                <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-yellow-50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Crown className="w-5 h-5 text-amber-600" />
                            Championship Dynasties
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {analytics.dynasties.map((dynasty, idx) => {
                                const club = clubs.find(c => c.name === dynasty.club);
                                return (
                                    <div key={idx} className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm">
                                        <div>
                                            {club ? (
                                                <Link to={createPageUrl(`ClubDetail?id=${club.id}`)} className="font-bold text-lg text-amber-700 hover:text-amber-800">
                                                    {dynasty.club}
                                                </Link>
                                            ) : (
                                                <div className="font-bold text-lg text-amber-700">{dynasty.club}</div>
                                            )}
                                            <div className="text-sm text-slate-600">
                                                {dynasty.startYear} - {dynasty.endYear}
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-3xl font-bold text-amber-600">{dynasty.count}</div>
                                            <div className="text-xs text-amber-700">consecutive titles</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Promotion Success */}
            {analytics.totalPromoted > 0 && (
                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-green-500" />
                            Promotion Success Rate
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-3 gap-4 mb-4">
                            <div className="text-center p-4 bg-blue-50 rounded-lg">
                                <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                                <div className="text-3xl font-bold text-blue-700">{analytics.totalPromoted}</div>
                                <div className="text-sm text-blue-600">Total Promoted</div>
                            </div>
                            <div className="text-center p-4 bg-green-50 rounded-lg">
                                <Trophy className="w-8 h-8 text-green-600 mx-auto mb-2" />
                                <div className="text-3xl font-bold text-green-700">{analytics.promotionSurvivalRate}%</div>
                                <div className="text-sm text-green-600">Survival Rate</div>
                            </div>
                            <div className="text-center p-4 bg-amber-50 rounded-lg">
                                <Target className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                                <div className="text-3xl font-bold text-amber-700">{analytics.avgPromotedFinish}</div>
                                <div className="text-sm text-amber-600">Avg Finish Position</div>
                            </div>
                        </div>
                        <div className="text-sm text-slate-500 text-center">
                            Based on {analytics.totalPromoted} promoted clubs tracked across all seasons
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* All-Time Clubs & Consecutive Stays */}
            <LeagueAllTimeClubs league={league} allTables={allTables} clubs={clubs} />
        </div>
    );
}