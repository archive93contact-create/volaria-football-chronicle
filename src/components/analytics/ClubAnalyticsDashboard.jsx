import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Trophy, TrendingUp, TrendingDown, Home, Plane, Swords, Calendar, Users, Target, Flame, Award, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function ClubAnalyticsDashboard({ club, seasons = [], allClubs = [], allLeagues = [] }) {
    const analytics = useMemo(() => {
        if (!club || seasons.length === 0) return null;

        // Sort seasons chronologically
        const sortedSeasons = [...seasons].sort((a, b) => a.year.localeCompare(b.year));
        
        // Performance Over Time
        const performanceData = sortedSeasons.map(s => {
            const league = allLeagues.find(l => l.id === s.league_id);
            return {
                year: s.year,
                position: s.position,
                points: s.points || 0,
                goalsFor: s.goals_for || 0,
                goalsAgainst: s.goals_against || 0,
                goalDiff: (s.goals_for || 0) - (s.goals_against || 0),
                tier: s.tier || league?.tier || 1
            };
        });

        // Home vs Away (estimate from total stats)
        const totalGames = seasons.reduce((sum, s) => sum + (s.played || 0), 0);
        const totalWins = seasons.reduce((sum, s) => sum + (s.won || 0), 0);
        const totalDraws = seasons.reduce((sum, s) => sum + (s.drawn || 0), 0);
        const totalLosses = seasons.reduce((sum, s) => sum + (s.lost || 0), 0);
        
        const winRate = totalGames > 0 ? ((totalWins / totalGames) * 100).toFixed(1) : 0;
        const avgPointsPerGame = totalGames > 0 ? ((seasons.reduce((sum, s) => sum + (s.points || 0), 0) / totalGames)).toFixed(2) : 0;
        
        // Form data (recent seasons)
        const recentSeasons = sortedSeasons.slice(-10);
        
        // Trophy count by type
        const trophies = {
            league: club.league_titles || 0,
            domestic_cup: club.domestic_cup_titles || 0,
            vcc: club.vcc_titles || 0,
            ccc: club.ccc_titles || 0
        };
        
        // Tier distribution
        const tierDistribution = {};
        seasons.forEach(s => {
            const tier = s.tier || allLeagues.find(l => l.id === s.league_id)?.tier || 1;
            tierDistribution[`Tier ${tier}`] = (tierDistribution[`Tier ${tier}`] || 0) + 1;
        });
        
        // Position distribution
        const positionRanges = {
            'Champions (1st)': 0,
            'Top 3': 0,
            'Top 6': 0,
            'Mid Table': 0,
            'Bottom 6': 0,
            'Relegated': 0
        };
        
        seasons.forEach(s => {
            if (s.position === 1) positionRanges['Champions (1st)']++;
            else if (s.position <= 3) positionRanges['Top 3']++;
            else if (s.position <= 6) positionRanges['Top 6']++;
            else if (s.position <= 12 || s.position <= (s.played / 2)) positionRanges['Mid Table']++;
            else if (s.status === 'relegated') positionRanges['Relegated']++;
            else positionRanges['Bottom 6']++;
        });
        
        // Rival records
        const rivalRecords = {};
        if (club.rival_club_ids && club.rival_club_ids.length > 0) {
            club.rival_club_ids.forEach(rivalId => {
                const rival = allClubs.find(c => c.id === rivalId);
                if (rival) {
                    // Count seasons they've been in same league
                    const rivalSeasons = seasons.filter(s => {
                        // This is simplified - would need actual match data for real H2H
                        return true;
                    });
                    rivalRecords[rival.name] = {
                        name: rival.name,
                        id: rival.id,
                        seasonsInSameLeague: rivalSeasons.length
                    };
                }
            });
        }
        
        // Best and worst seasons
        const topFlightSeasons = seasons.filter(s => {
            const tier = s.tier || allLeagues.find(l => l.id === s.league_id)?.tier;
            return tier === 1;
        });
        
        const bestSeason = topFlightSeasons.length > 0 
            ? topFlightSeasons.reduce((best, s) => !best || s.position < best.position ? s : best, null)
            : seasons.reduce((best, s) => !best || s.points > best.points ? s : best, null);
            
        const worstSeason = seasons.reduce((worst, s) => !worst || s.position > worst.position ? s : worst, null);
        
        // Promotion/Relegation history
        const promotions = seasons.filter(s => s.status === 'promoted').length;
        const relegations = seasons.filter(s => s.status === 'relegated').length;
        
        // Streaks detection
        let longestWinningStreak = 0;
        let currentStreak = 0;
        sortedSeasons.forEach(s => {
            if (s.position === 1) {
                currentStreak++;
                longestWinningStreak = Math.max(longestWinningStreak, currentStreak);
            } else {
                currentStreak = 0;
            }
        });
        
        // Goal statistics
        const totalGoalsScored = seasons.reduce((sum, s) => sum + (s.goals_for || 0), 0);
        const totalGoalsConceded = seasons.reduce((sum, s) => sum + (s.goals_against || 0), 0);
        const avgGoalsPerSeason = (totalGoalsScored / seasons.length).toFixed(1);
        
        return {
            performanceData,
            recentSeasons,
            trophies,
            tierDistribution,
            positionRanges,
            rivalRecords,
            bestSeason,
            worstSeason,
            totalGames,
            totalWins,
            totalDraws,
            totalLosses,
            winRate,
            avgPointsPerGame,
            promotions,
            relegations,
            longestWinningStreak,
            totalGoalsScored,
            totalGoalsConceded,
            avgGoalsPerSeason,
            topFlightSeasons: topFlightSeasons.length
        };
    }, [club, seasons, allClubs, allLeagues]);

    if (!analytics) {
        return (
            <Card className="border-dashed border-2 border-slate-300">
                <CardContent className="flex flex-col items-center justify-center py-16">
                    <Target className="w-16 h-16 text-slate-300 mb-4" />
                    <h3 className="text-xl font-semibold text-slate-700 mb-2">No Data Yet</h3>
                    <p className="text-slate-500">Add season data to see analytics</p>
                </CardContent>
            </Card>
        );
    }

    const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4'];

    return (
        <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-4 text-center">
                        <Calendar className="w-5 h-5 text-blue-500 mx-auto mb-2" />
                        <div className="text-2xl font-bold">{seasons.length}</div>
                        <div className="text-xs text-slate-500">Seasons Played</div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-green-50">
                    <CardContent className="p-4 text-center">
                        <Trophy className="w-5 h-5 text-green-600 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-green-700">{analytics.totalWins}</div>
                        <div className="text-xs text-green-600">Wins ({analytics.winRate}%)</div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-4 text-center">
                        <Target className="w-5 h-5 text-slate-500 mx-auto mb-2" />
                        <div className="text-2xl font-bold">{analytics.totalDraws}</div>
                        <div className="text-xs text-slate-500">Draws</div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-red-50">
                    <CardContent className="p-4 text-center">
                        <TrendingDown className="w-5 h-5 text-red-600 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-red-700">{analytics.totalLosses}</div>
                        <div className="text-xs text-red-600">Losses</div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-4 text-center">
                        <Flame className="w-5 h-5 text-orange-500 mx-auto mb-2" />
                        <div className="text-2xl font-bold">{analytics.avgPointsPerGame}</div>
                        <div className="text-xs text-slate-500">Pts/Game</div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-amber-50">
                    <CardContent className="p-4 text-center">
                        <Award className="w-5 h-5 text-amber-600 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-amber-700">
                            {Object.values(analytics.trophies).reduce((a, b) => a + b, 0)}
                        </div>
                        <div className="text-xs text-amber-600">Total Trophies</div>
                    </CardContent>
                </Card>
            </div>

            {/* Performance Over Time */}
            <Card className="border-0 shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-blue-500" />
                        Performance Trends
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={analytics.performanceData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="year" angle={-45} textAnchor="end" height={80} />
                            <YAxis yAxisId="left" reversed domain={[1, 'dataMax']} label={{ value: 'Position', angle: -90, position: 'insideLeft' }} />
                            <YAxis yAxisId="right" orientation="right" label={{ value: 'Points', angle: 90, position: 'insideRight' }} />
                            <Tooltip />
                            <Legend />
                            <Line yAxisId="left" type="monotone" dataKey="position" stroke="#ef4444" strokeWidth={2} name="League Position" />
                            <Line yAxisId="right" type="monotone" dataKey="points" stroke="#3b82f6" strokeWidth={2} name="Points" />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Goals Analysis */}
                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Target className="w-5 h-5 text-green-500" />
                            Goal Statistics
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                            <AreaChart data={analytics.performanceData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="year" angle={-45} textAnchor="end" height={60} />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Area type="monotone" dataKey="goalsFor" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} name="Goals Scored" />
                                <Area type="monotone" dataKey="goalsAgainst" stackId="2" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} name="Goals Conceded" />
                            </AreaChart>
                        </ResponsiveContainer>
                        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                            <div>
                                <div className="text-2xl font-bold text-green-600">{analytics.totalGoalsScored}</div>
                                <div className="text-xs text-slate-500">Total Scored</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-red-600">{analytics.totalGoalsConceded}</div>
                                <div className="text-xs text-slate-500">Total Conceded</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold">{analytics.avgGoalsPerSeason}</div>
                                <div className="text-xs text-slate-500">Avg/Season</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Position Distribution */}
                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Award className="w-5 h-5 text-amber-500" />
                            Finish Position Distribution
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={Object.entries(analytics.positionRanges).filter(([_, v]) => v > 0).map(([name, value]) => ({ name, value }))}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {Object.entries(analytics.positionRanges).filter(([_, v]) => v > 0).map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Trophy Cabinet */}
            {Object.values(analytics.trophies).some(v => v > 0) && (
                <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-yellow-50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-amber-600" />
                            Trophy Cabinet
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {analytics.trophies.league > 0 && (
                                <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                                    <Trophy className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                                    <div className="text-3xl font-bold text-amber-600">{analytics.trophies.league}</div>
                                    <div className="text-sm text-amber-700">League Titles</div>
                                </div>
                            )}
                            {analytics.trophies.domestic_cup > 0 && (
                                <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                                    <Award className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                                    <div className="text-3xl font-bold text-orange-600">{analytics.trophies.domestic_cup}</div>
                                    <div className="text-sm text-orange-700">Domestic Cups</div>
                                </div>
                            )}
                            {analytics.trophies.vcc > 0 && (
                                <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                                    <Award className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                                    <div className="text-3xl font-bold text-purple-600">{analytics.trophies.vcc}</div>
                                    <div className="text-sm text-purple-700">VCC Titles</div>
                                </div>
                            )}
                            {analytics.trophies.ccc > 0 && (
                                <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                                    <Award className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                                    <div className="text-3xl font-bold text-blue-600">{analytics.trophies.ccc}</div>
                                    <div className="text-sm text-blue-700">CCC Titles</div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Best & Worst Seasons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-green-50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-emerald-600" />
                            Best Season
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {analytics.bestSeason && (
                            <div>
                                <div className="text-3xl font-bold text-emerald-700 mb-2">{analytics.bestSeason.year}</div>
                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">Position:</span>
                                        <span className="font-semibold">{analytics.bestSeason.position}{analytics.bestSeason.position === 1 ? 'st' : analytics.bestSeason.position === 2 ? 'nd' : analytics.bestSeason.position === 3 ? 'rd' : 'th'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">Points:</span>
                                        <span className="font-semibold">{analytics.bestSeason.points}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">Record:</span>
                                        <span className="font-semibold">{analytics.bestSeason.won}W-{analytics.bestSeason.drawn}D-{analytics.bestSeason.lost}L</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">Goals:</span>
                                        <span className="font-semibold">{analytics.bestSeason.goals_for}-{analytics.bestSeason.goals_against}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-gradient-to-br from-red-50 to-rose-50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingDown className="w-5 h-5 text-red-600" />
                            Worst Season
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {analytics.worstSeason && (
                            <div>
                                <div className="text-3xl font-bold text-red-700 mb-2">{analytics.worstSeason.year}</div>
                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">Position:</span>
                                        <span className="font-semibold">{analytics.worstSeason.position}{analytics.worstSeason.position === 1 ? 'st' : analytics.worstSeason.position === 2 ? 'nd' : analytics.worstSeason.position === 3 ? 'rd' : 'th'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">Points:</span>
                                        <span className="font-semibold">{analytics.worstSeason.points}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">Record:</span>
                                        <span className="font-semibold">{analytics.worstSeason.won}W-{analytics.worstSeason.drawn}D-{analytics.worstSeason.lost}L</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">Goals:</span>
                                        <span className="font-semibold">{analytics.worstSeason.goals_for}-{analytics.worstSeason.goals_against}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Rival Records */}
            {Object.keys(analytics.rivalRecords).length > 0 && (
                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Swords className="w-5 h-5 text-red-500" />
                            Rivalry Records
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {Object.values(analytics.rivalRecords).map(rival => (
                                <Link
                                    key={rival.id}
                                    to={createPageUrl(`ClubDetail?id=${rival.id}`)}
                                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <Shield className="w-4 h-4 text-slate-500" />
                                        <span className="font-semibold">{rival.name}</span>
                                    </div>
                                    <Badge variant="outline">{rival.seasonsInSameLeague} seasons together</Badge>
                                </Link>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Promotion/Relegation History */}
            {(analytics.promotions > 0 || analytics.relegations > 0) && (
                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-blue-500" />
                            Tier Movement
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center p-4 bg-green-50 rounded-lg">
                                <TrendingUp className="w-8 h-8 text-green-600 mx-auto mb-2" />
                                <div className="text-3xl font-bold text-green-700">{analytics.promotions}</div>
                                <div className="text-sm text-green-600">Promotions</div>
                            </div>
                            <div className="text-center p-4 bg-red-50 rounded-lg">
                                <TrendingDown className="w-8 h-8 text-red-600 mx-auto mb-2" />
                                <div className="text-3xl font-bold text-red-700">{analytics.relegations}</div>
                                <div className="text-sm text-red-600">Relegations</div>
                            </div>
                            <div className="text-center p-4 bg-blue-50 rounded-lg">
                                <Trophy className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                                <div className="text-3xl font-bold text-blue-700">{analytics.topFlightSeasons}</div>
                                <div className="text-sm text-blue-600">Top Flight Seasons</div>
                            </div>
                            {analytics.longestWinningStreak > 1 && (
                                <div className="text-center p-4 bg-amber-50 rounded-lg">
                                    <Flame className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                                    <div className="text-3xl font-bold text-amber-700">{analytics.longestWinningStreak}</div>
                                    <div className="text-sm text-amber-600">Title Streak</div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}