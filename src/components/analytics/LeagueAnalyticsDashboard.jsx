import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, AreaChart, Area } from 'recharts';
import { Trophy, TrendingUp, Activity, MapPin, Users, Target, Flame, Crown, BarChart3, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LeagueClubHistory from '../leagues/LeagueClubHistory';

export default function LeagueAnalyticsDashboard({ league, seasons = [], allTables = [], clubs = [], allLeagues = [] }) {
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
        <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="performance">Performance</TabsTrigger>
                <TabsTrigger value="trends">Trends</TabsTrigger>
                <TabsTrigger value="history">Club History</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
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

            {/* Most Frequent Clubs */}
            <Card className="border-0 shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-500" />
                        Most Frequent Clubs
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {analytics.mostFrequentClubs.map((club, idx) => {
                            const clubObj = clubs.find(c => c.id === club.clubId || c.name === club.name);
                            return (
                            <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-sm">
                                        {idx + 1}
                                    </div>
                                    {clubObj?.logo_url && (
                                        <img src={clubObj.logo_url} alt="" className="w-6 h-6 object-contain bg-white rounded" />
                                    )}
                                    {club.clubId ? (
                                        <Link to={createPageUrl(`ClubDetail?id=${club.clubId}`)} className="font-semibold hover:text-blue-600">
                                            {club.name}
                                        </Link>
                                    ) : (
                                        <span className="font-semibold">{club.name}</span>
                                    )}
                                </div>
                                <Badge variant="outline">{club.count} seasons</Badge>
                            </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
            </TabsContent>

            <TabsContent value="performance" className="space-y-6">
                {/* Top performers per season */}
                {(() => {
                    const sortedSeasons = [...seasons].sort((a, b) => a.year.localeCompare(b.year));

                    // Most points ever in a single season
                    const allEntries = allTables.filter(t => t.league_id === league.id);
                    const topPoints = [...allEntries].filter(t => t.points).sort((a, b) => b.points - a.points).slice(0, 10);
                    const topWins = [...allEntries].filter(t => t.won).sort((a, b) => b.won - a.won).slice(0, 10);
                    const topGoals = [...allEntries].filter(t => t.goals_for).sort((a, b) => b.goals_for - a.goals_for).slice(0, 10);
                    const bestDefense = [...allEntries].filter(t => t.goals_against != null && t.played > 0).sort((a, b) => a.goals_against - b.goals_against).slice(0, 10);

                    // Win % per club (all time)
                    const clubWinRates = {};
                    allEntries.forEach(t => {
                        const key = t.club_name;
                        if (!clubWinRates[key]) clubWinRates[key] = { played: 0, won: 0, club_id: t.club_id };
                        clubWinRates[key].played += t.played || 0;
                        clubWinRates[key].won += t.won || 0;
                    });
                    const winRateTable = Object.entries(clubWinRates)
                        .filter(([, v]) => v.played >= 10)
                        .map(([name, v]) => ({ name, club_id: v.club_id, winRate: ((v.won / v.played) * 100).toFixed(1), played: v.played, won: v.won }))
                        .sort((a, b) => b.winRate - a.winRate)
                        .slice(0, 10);

                    return (
                        <>
                            {/* Win Rate Table */}
                            <Card className="border-0 shadow-sm">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><Flame className="w-5 h-5 text-orange-500" /> All-Time Win Rate (min. 10 games)</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {winRateTable.map((club, idx) => {
                                            const c = clubs.find(c => c.id === club.club_id || c.name === club.name);
                                            return (
                                                <div key={idx} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
                                                    <div className="w-7 h-7 flex items-center justify-center font-bold text-slate-500 text-sm">{idx + 1}</div>
                                                    {c?.logo_url && <img src={c.logo_url} alt="" className="w-6 h-6 object-contain bg-white rounded" />}
                                                    <Link to={createPageUrl(`ClubDetail?id=${club.club_id}`)} className="flex-1 font-medium hover:underline">{club.name}</Link>
                                                    <div className="text-sm text-slate-500">{club.won}W / {club.played}P</div>
                                                    <Badge className="bg-orange-100 text-orange-800 border-orange-200">{club.winRate}%</Badge>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* All-time GD leaderboard */}
                            {(() => {
                                const gdTable = Object.entries(
                                    allEntries.reduce((acc, t) => {
                                        const key = t.club_name;
                                        if (!acc[key]) acc[key] = { gd: 0, club_id: t.club_id };
                                        acc[key].gd += (t.goals_for || 0) - (t.goals_against || 0);
                                        return acc;
                                    }, {})
                                ).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.gd - a.gd).slice(0, 10);

                                return (
                                    <Card className="border-0 shadow-sm">
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5 text-indigo-500" /> All-Time Goal Difference Leaders</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-2">
                                                {gdTable.map((club, idx) => {
                                                    const c = clubs.find(c => c.id === club.club_id || c.name === club.name);
                                                    const barWidth = Math.min(100, Math.abs(club.gd) / Math.max(...gdTable.map(x => Math.abs(x.gd))) * 100);
                                                    return (
                                                        <div key={idx} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
                                                            <span className="text-sm font-bold text-slate-400 w-5">{idx + 1}</span>
                                                            {c?.logo_url && <img src={c.logo_url} alt="" className="w-6 h-6 object-contain bg-white rounded" />}
                                                            <Link to={createPageUrl(`ClubDetail?id=${club.club_id}`)} className="w-32 font-medium text-sm hover:underline truncate">{club.name}</Link>
                                                            <div className="flex-1 bg-slate-200 rounded-full h-2">
                                                                <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${barWidth}%` }} />
                                                            </div>
                                                            <Badge variant="outline" className={`font-bold ${club.gd > 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                                                                {club.gd > 0 ? `+${club.gd}` : club.gd}
                                                            </Badge>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })()}

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Most points in a single season */}
                                <Card className="border-0 shadow-sm">
                                    <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Trophy className="w-4 h-4 text-amber-500" /> Most Points (Single Season)</CardTitle></CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            {topPoints.map((t, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-bold text-slate-400 w-5">{idx + 1}</span>
                                                        <div>
                                                            <div className="font-medium text-sm">{t.club_name}</div>
                                                            <div className="text-xs text-slate-500">{t.year}</div>
                                                        </div>
                                                    </div>
                                                    <Badge variant="outline" className="font-bold">{t.points} pts</Badge>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Most wins in a single season */}
                                <Card className="border-0 shadow-sm">
                                    <CardHeader><CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="w-4 h-4 text-emerald-500" /> Most Wins (Single Season)</CardTitle></CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            {topWins.map((t, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-bold text-slate-400 w-5">{idx + 1}</span>
                                                        <div>
                                                            <div className="font-medium text-sm">{t.club_name}</div>
                                                            <div className="text-xs text-slate-500">{t.year}</div>
                                                        </div>
                                                    </div>
                                                    <Badge variant="outline" className="font-bold text-emerald-700">{t.won}W</Badge>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Most goals in a single season */}
                                <Card className="border-0 shadow-sm">
                                    <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Target className="w-4 h-4 text-blue-500" /> Most Goals Scored (Single Season)</CardTitle></CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            {topGoals.map((t, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-bold text-slate-400 w-5">{idx + 1}</span>
                                                        <div>
                                                            <div className="font-medium text-sm">{t.club_name}</div>
                                                            <div className="text-xs text-slate-500">{t.year}</div>
                                                        </div>
                                                    </div>
                                                    <Badge variant="outline" className="font-bold text-blue-700">{t.goals_for} goals</Badge>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Best defense */}
                                <Card className="border-0 shadow-sm">
                                    <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Activity className="w-4 h-4 text-purple-500" /> Best Defense (Single Season)</CardTitle></CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            {bestDefense.map((t, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-bold text-slate-400 w-5">{idx + 1}</span>
                                                        <div>
                                                            <div className="font-medium text-sm">{t.club_name}</div>
                                                            <div className="text-xs text-slate-500">{t.year}</div>
                                                        </div>
                                                    </div>
                                                    <Badge variant="outline" className="font-bold text-purple-700">{t.goals_against} conceded</Badge>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </>
                    );
                })()}
            </TabsContent>

            <TabsContent value="trends" className="space-y-6">
                {(() => {
                    const sortedSeasons = [...seasons].sort((a, b) => a.year.localeCompare(b.year));

                    // Teams per season
                    const teamsPerSeason = sortedSeasons.map(s => {
                        const count = allTables.filter(t => t.league_id === league.id && t.year === s.year).length;
                        return { year: s.year, teams: count || s.number_of_teams || 0 };
                    }).filter(d => d.teams > 0);

                    // Avg points of champion per season
                    const championPointsTrend = sortedSeasons.map(s => {
                        const table = allTables.filter(t => t.league_id === league.id && t.year === s.year).sort((a, b) => a.position - b.position);
                        const champion = table[0];
                        return { year: s.year, points: champion?.points || null, club: champion?.club_name || s.champion_name };
                    }).filter(d => d.points);

                    // Avg goals per game trend
                    const avgGoalsTrend = sortedSeasons.map(s => {
                        const table = allTables.filter(t => t.league_id === league.id && t.year === s.year);
                        const totalGoals = table.reduce((sum, t) => sum + (t.goals_for || 0), 0);
                        const totalGames = table.reduce((sum, t) => sum + (t.played || 0), 0);
                        return { year: s.year, avgGoals: totalGames > 0 ? parseFloat((totalGoals / totalGames).toFixed(2)) : null };
                    }).filter(d => d.avgGoals);

                    // Points needed to survive relegation (last safe position)
                    const safePointsTrend = sortedSeasons.map(s => {
                        const table = allTables.filter(t => t.league_id === league.id && t.year === s.year).sort((a, b) => a.position - b.position);
                        const relSpots = s.relegation_spots || league.relegation_spots || 3;
                        const lastSafe = table[table.length - 1 - relSpots];
                        return { year: s.year, safePoints: lastSafe?.points || null };
                    }).filter(d => d.safePoints);

                    return (
                        <>
                            {/* Champion points trend */}
                            <Card className="border-0 shadow-sm">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><Crown className="w-5 h-5 text-amber-500" /> Champion's Points Over Time</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={280}>
                                        <LineChart data={championPointsTrend}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="year" angle={-45} textAnchor="end" height={70} />
                                            <YAxis />
                                            <Tooltip content={({ active, payload }) => active && payload?.length ? (
                                                <div className="bg-white p-3 border rounded shadow-lg">
                                                    <p className="font-semibold">{payload[0].payload.year}</p>
                                                    <p className="text-sm text-amber-700">{payload[0].payload.club}</p>
                                                    <p className="text-sm">{payload[0].value} pts</p>
                                                </div>
                                            ) : null} />
                                            <Line type="monotone" dataKey="points" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b' }} name="Champion Points" />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Avg goals trend */}
                                <Card className="border-0 shadow-sm">
                                    <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Target className="w-4 h-4 text-green-500" /> Avg Goals per Game Trend</CardTitle></CardHeader>
                                    <CardContent>
                                        <ResponsiveContainer width="100%" height={220}>
                                            <AreaChart data={avgGoalsTrend}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="year" angle={-45} textAnchor="end" height={60} />
                                                <YAxis domain={['auto', 'auto']} />
                                                <Tooltip />
                                                <Area type="monotone" dataKey="avgGoals" stroke="#10b981" fill="#10b981" fillOpacity={0.3} name="Avg Goals/Game" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>

                                {/* Points needed for safety trend */}
                                {safePointsTrend.length > 0 && (
                                    <Card className="border-0 shadow-sm">
                                        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Activity className="w-4 h-4 text-red-500" /> Points Needed for Safety</CardTitle></CardHeader>
                                        <CardContent>
                                            <ResponsiveContainer width="100%" height={220}>
                                                <LineChart data={safePointsTrend}>
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis dataKey="year" angle={-45} textAnchor="end" height={60} />
                                                    <YAxis domain={['auto', 'auto']} />
                                                    <Tooltip />
                                                    <Line type="monotone" dataKey="safePoints" stroke="#ef4444" strokeWidth={2} name="Safe Points" />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Teams per season */}
                                {teamsPerSeason.length > 0 && (
                                    <Card className="border-0 shadow-sm">
                                        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Users className="w-4 h-4 text-blue-500" /> Teams per Season</CardTitle></CardHeader>
                                        <CardContent>
                                            <ResponsiveContainer width="100%" height={220}>
                                                <BarChart data={teamsPerSeason}>
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis dataKey="year" angle={-45} textAnchor="end" height={60} />
                                                    <YAxis allowDecimals={false} />
                                                    <Tooltip />
                                                    <Bar dataKey="teams" fill="#3b82f6" name="Teams" />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Total goals per season trend */}
                                {(() => {
                                    const totalGoalsTrend = [...seasons].sort((a, b) => a.year.localeCompare(b.year)).map(s => {
                                        const table = allTables.filter(t => t.league_id === league.id && t.year === s.year);
                                        const totalGoals = table.reduce((sum, t) => sum + (t.goals_for || 0), 0);
                                        return { year: s.year, totalGoals };
                                    }).filter(d => d.totalGoals > 0);
                                    return totalGoalsTrend.length > 0 ? (
                                        <Card className="border-0 shadow-sm">
                                            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Target className="w-4 h-4 text-rose-500" /> Total Goals per Season</CardTitle></CardHeader>
                                            <CardContent>
                                                <ResponsiveContainer width="100%" height={220}>
                                                    <BarChart data={totalGoalsTrend}>
                                                        <CartesianGrid strokeDasharray="3 3" />
                                                        <XAxis dataKey="year" angle={-45} textAnchor="end" height={60} />
                                                        <YAxis />
                                                        <Tooltip />
                                                        <Bar dataKey="totalGoals" fill="#f43f5e" name="Total Goals" />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </CardContent>
                                        </Card>
                                    ) : null;
                                })()}
                            </div>

                            {/* Competitive Balance over time (unique champion rate by decade) */}
                            {(() => {
                                const sortedSeasons = [...seasons].sort((a, b) => a.year.localeCompare(b.year));
                                // Group by ~10 year windows
                                const byDecade = {};
                                sortedSeasons.forEach(s => {
                                    if (!s.champion_name) return;
                                    const decade = Math.floor(parseInt(s.year) / 10) * 10;
                                    const key = `${decade}s`;
                                    if (!byDecade[key]) byDecade[key] = { champions: new Set(), total: 0 };
                                    byDecade[key].champions.add(s.champion_name);
                                    byDecade[key].total++;
                                });
                                const decadeData = Object.entries(byDecade).map(([decade, v]) => ({
                                    decade,
                                    uniqueChampions: v.champions.size,
                                    seasons: v.total,
                                    balance: parseFloat(((v.champions.size / v.total) * 100).toFixed(1))
                                })).filter(d => d.seasons >= 2);

                                return decadeData.length > 1 ? (
                                    <Card className="border-0 shadow-sm">
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5 text-teal-500" /> Competitive Balance by Era</CardTitle>
                                            <p className="text-sm text-slate-500">% of seasons won by different champions — higher means more competitive</p>
                                        </CardHeader>
                                        <CardContent>
                                            <ResponsiveContainer width="100%" height={240}>
                                                <BarChart data={decadeData}>
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis dataKey="decade" />
                                                    <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} />
                                                    <Tooltip formatter={(v) => [`${v}%`, 'Balance Score']} />
                                                    <Bar dataKey="balance" fill="#14b8a6" name="Balance %" radius={[4,4,0,0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </CardContent>
                                    </Card>
                                ) : null;
                            })()}
                        </>
                    );
                })()}
            </TabsContent>

            <TabsContent value="history" className="space-y-6">
                <LeagueClubHistory 
                    league={league}
                    leagueTables={allTables}
                    clubs={clubs}
                    allLeagues={allLeagues}
                />
            </TabsContent>
        </Tabs>
    );
}