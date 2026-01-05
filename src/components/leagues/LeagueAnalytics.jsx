import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, ScatterChart, Scatter } from 'recharts';
import { Trophy, TrendingUp, MapPin, Activity, Target, Users, BarChart3, Award } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function LeagueAnalytics({ league, seasons = [], leagueTables = [], clubs = [] }) {
    const analytics = useMemo(() => {
        if (!league || seasons.length === 0) return null;

        // Competitive Balance (Gini coefficient approximation)
        const titleWinners = {};
        seasons.forEach(s => {
            if (s.champion_name) {
                titleWinners[s.champion_name] = (titleWinners[s.champion_name] || 0) + 1;
            }
        });
        const titleCounts = Object.values(titleWinners);
        const uniqueChampions = Object.keys(titleWinners).length;
        const totalSeasons = seasons.length;
        const concentrationRatio = uniqueChampions > 0 ? (totalSeasons / uniqueChampions) : 0;

        // Title dynasties map
        const dynasties = Object.entries(titleWinners)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([name, count]) => ({
                club: name,
                titles: count,
                percentage: ((count / totalSeasons) * 100).toFixed(1)
            }));

        // Geographic distribution
        const regionCounts = {};
        const championsByRegion = {};
        leagueTables.forEach(t => {
            const club = clubs.find(c => c.id === t.club_id || c.name === t.club_name);
            if (club?.region) {
                regionCounts[club.region] = (regionCounts[club.region] || 0) + 1;
                if (t.status === 'champion') {
                    championsByRegion[club.region] = (championsByRegion[club.region] || 0) + 1;
                }
            }
        });
        const geographicData = Object.entries(regionCounts).map(([region, count]) => ({
            region,
            clubs: count,
            titles: championsByRegion[region] || 0
        })).sort((a, b) => b.clubs - a.clubs);

        // Volatility index (position changes season-to-season)
        const volatility = [];
        for (let i = 1; i < seasons.length; i++) {
            const prevSeason = seasons[i - 1];
            const currSeason = seasons[i];
            const prevTable = leagueTables.filter(t => t.season_id === prevSeason.id || (t.league_id === prevSeason.league_id && t.year === prevSeason.year));
            const currTable = leagueTables.filter(t => t.season_id === currSeason.id || (t.league_id === currSeason.league_id && t.year === currSeason.year));
            
            let totalMovement = 0;
            let clubsTracked = 0;
            currTable.forEach(curr => {
                const prev = prevTable.find(p => p.club_name === curr.club_name);
                if (prev) {
                    totalMovement += Math.abs(curr.position - prev.position);
                    clubsTracked++;
                }
            });
            
            if (clubsTracked > 0) {
                volatility.push({
                    year: currSeason.year,
                    avgMovement: (totalMovement / clubsTracked).toFixed(1)
                });
            }
        }

        // Goal economy trends
        const goalTrends = seasons.map(s => {
            const seasonTables = leagueTables.filter(t => t.season_id === s.id || (t.league_id === s.league_id && t.year === s.year));
            const totalGoals = seasonTables.reduce((sum, t) => sum + (t.goals_for || 0), 0);
            const totalGames = seasonTables.reduce((sum, t) => sum + (t.played || 0), 0);
            const avgGoalsPerGame = totalGames > 0 ? (totalGoals / totalGames).toFixed(2) : 0;
            return {
                year: s.year,
                goalsPerGame: parseFloat(avgGoalsPerGame),
                totalGoals
            };
        }).sort((a, b) => a.year.localeCompare(b.year));

        // Promotion success rate
        const promotionAnalysis = { survived: 0, relegated: 0, total: 0 };
        seasons.forEach((s, idx) => {
            if (s.promoted_teams && idx < seasons.length - 1) {
                const promoted = s.promoted_teams.split(',').map(t => t.trim());
                const nextSeason = seasons[idx + 1];
                const nextTable = leagueTables.filter(t => t.season_id === nextSeason.id || (t.league_id === nextSeason.league_id && t.year === nextSeason.year));
                
                promoted.forEach(clubName => {
                    const found = nextTable.find(t => t.club_name === clubName);
                    if (found) {
                        promotionAnalysis.total++;
                        if (nextSeason.relegated_teams?.split(',').map(t => t.trim()).includes(clubName)) {
                            promotionAnalysis.relegated++;
                        } else {
                            promotionAnalysis.survived++;
                        }
                    }
                });
            }
        });
        const survivalRate = promotionAnalysis.total > 0 ? ((promotionAnalysis.survived / promotionAnalysis.total) * 100).toFixed(1) : 0;

        // Title margins (how close races are)
        const titleMargins = seasons.map(s => {
            const table = leagueTables.filter(t => t.season_id === s.id || (t.league_id === s.league_id && t.year === s.year))
                .sort((a, b) => a.position - b.position);
            if (table.length >= 2) {
                return {
                    year: s.year,
                    margin: (table[0].points || 0) - (table[1].points || 0)
                };
            }
            return null;
        }).filter(Boolean);

        const avgTitleMargin = titleMargins.length > 0 
            ? (titleMargins.reduce((sum, m) => sum + m.margin, 0) / titleMargins.length).toFixed(1)
            : 0;

        return {
            concentrationRatio,
            uniqueChampions,
            totalSeasons,
            dynasties,
            geographicData,
            volatility,
            goalTrends,
            promotionAnalysis,
            survivalRate,
            titleMargins,
            avgTitleMargin
        };
    }, [league, seasons, leagueTables, clubs]);

    if (!analytics) {
        return (
            <Card className="border-0 shadow-sm">
                <CardContent className="p-8 text-center text-slate-500">
                    No season data available for analytics
                </CardContent>
            </Card>
        );
    }

    const { dynasties, geographicData, volatility, goalTrends, promotionAnalysis, survivalRate, titleMargins, avgTitleMargin, concentrationRatio, uniqueChampions, totalSeasons } = analytics;

    return (
        <div className="space-y-6">
            {/* Competitive Balance */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-blue-800">
                            <BarChart3 className="w-5 h-5" />
                            Competition Level
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-blue-900">{concentrationRatio.toFixed(1)}</div>
                        <div className="text-sm text-blue-700 mt-1">Seasons per unique champion</div>
                        <div className="mt-3 text-xs text-blue-600">
                            {uniqueChampions} different champions in {totalSeasons} seasons
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-orange-50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-amber-800">
                            <Trophy className="w-5 h-5" />
                            Avg Title Margin
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-amber-900">{avgTitleMargin} pts</div>
                        <div className="text-sm text-amber-700 mt-1">
                            {parseFloat(avgTitleMargin) <= 3 ? 'Tight races' : parseFloat(avgTitleMargin) >= 10 ? 'Often one-sided' : 'Balanced competition'}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-emerald-50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-green-800">
                            <TrendingUp className="w-5 h-5" />
                            Promotion Survival
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-green-900">{survivalRate}%</div>
                        <div className="text-sm text-green-700 mt-1">
                            {promotionAnalysis.survived}/{promotionAnalysis.total} stayed up
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Title Dynasties */}
            <Card className="border-0 shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-amber-500" />
                        Title Dynasties
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={dynasties} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis type="category" dataKey="club" width={120} />
                            <Tooltip />
                            <Bar dataKey="titles" fill="#f59e0b" label={{ position: 'right' }} />
                        </BarChart>
                    </ResponsiveContainer>
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                        {dynasties.slice(0, 4).map((d, idx) => (
                            <div key={idx} className="p-3 bg-slate-50 rounded-lg text-center">
                                <div className="text-xs text-slate-500">{d.club}</div>
                                <div className="text-lg font-bold text-amber-600">{d.titles}</div>
                                <div className="text-xs text-slate-400">{d.percentage}%</div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Geographic Distribution */}
            {geographicData.length > 0 && (
                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-indigo-500" />
                            Geographic Distribution
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie
                                        data={geographicData}
                                        dataKey="clubs"
                                        nameKey="region"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={80}
                                        label
                                    >
                                        {geographicData.map((entry, idx) => (
                                            <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="space-y-2">
                                {geographicData.map((d, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                                        <span className="text-sm font-medium flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                            {d.region}
                                        </span>
                                        <div className="text-xs text-slate-600">
                                            {d.clubs} clubs • {d.titles} titles
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* League Volatility */}
            {volatility.length > 0 && (
                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Activity className="w-5 h-5 text-purple-500" />
                            League Volatility (Position Changes)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={volatility}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="year" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="avgMovement" stroke="#8b5cf6" strokeWidth={2} name="Avg Position Change" />
                            </LineChart>
                        </ResponsiveContainer>
                        <div className="mt-2 text-sm text-slate-600">
                            Higher values indicate more unpredictable seasons with major table movements
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Goal Economy */}
            <Card className="border-0 shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Target className="w-5 h-5 text-blue-500" />
                        Goal Economy Trends
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={goalTrends}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="year" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="goalsPerGame" stroke="#3b82f6" strokeWidth={2} name="Goals Per Game" />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Title Race Margins */}
            {titleMargins.length > 0 && (
                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Award className="w-5 h-5 text-orange-500" />
                            Title Race Margins
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={titleMargins}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="year" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="margin" fill="#f97316" name="Points Margin" />
                            </BarChart>
                        </ResponsiveContainer>
                        <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
                            <div className="p-3 bg-red-50 rounded-lg">
                                <div className="font-bold text-red-600">{titleMargins.filter(m => m.margin <= 3).length}</div>
                                <div className="text-xs text-slate-600">Tight (≤3 pts)</div>
                            </div>
                            <div className="p-3 bg-amber-50 rounded-lg">
                                <div className="font-bold text-amber-600">{titleMargins.filter(m => m.margin > 3 && m.margin <= 10).length}</div>
                                <div className="text-xs text-slate-600">Moderate (4-10 pts)</div>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-lg">
                                <div className="font-bold text-slate-600">{titleMargins.filter(m => m.margin > 10).length}</div>
                                <div className="text-xs text-slate-600">Dominant (>10 pts)</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}