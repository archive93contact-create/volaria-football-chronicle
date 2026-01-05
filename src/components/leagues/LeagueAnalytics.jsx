import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart } from 'recharts';
import { Trophy, TrendingUp, Target, Users, Flame, Award, Shield, MapPin, Percent, Crown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function LeagueAnalytics({ league, seasons, leagueTables, clubs }) {
    const analytics = useMemo(() => {
        if (!seasons || seasons.length === 0) return null;

        const sortedSeasons = [...seasons].sort((a, b) => a.year.localeCompare(b.year));

        // Competitive balance - title concentration
        const titleCounts = {};
        seasons.forEach(s => {
            if (s.champion_name) {
                titleCounts[s.champion_name] = (titleCounts[s.champion_name] || 0) + 1;
            }
        });
        const uniqueChampions = Object.keys(titleCounts).length;
        const mostTitles = Math.max(...Object.values(titleCounts));
        const titleConcentration = (mostTitles / seasons.length * 100).toFixed(1);

        // Points gap trends
        const pointsGapTrends = sortedSeasons.map(s => {
            const table = leagueTables.filter(t => t.year === s.year).sort((a, b) => a.position - b.position);
            if (table.length < 2) return null;
            return {
                year: s.year,
                gap: (table[0]?.points || 0) - (table[1]?.points || 0),
                championPoints: table[0]?.points || 0
            };
        }).filter(Boolean);

        // Goal economy by decade
        const goalsByDecade = {};
        seasons.forEach(s => {
            const year = parseInt(s.year.split('-')[0]);
            const decade = Math.floor(year / 10) * 10;
            const table = leagueTables.filter(t => t.year === s.year);
            const totalGoals = table.reduce((sum, t) => sum + (t.goals_for || 0), 0);
            const matches = table.reduce((sum, t) => sum + (t.played || 0), 0);
            
            if (!goalsByDecade[decade]) goalsByDecade[decade] = { goals: 0, matches: 0 };
            goalsByDecade[decade].goals += totalGoals;
            goalsByDecade[decade].matches += matches;
        });

        const goalEconomy = Object.entries(goalsByDecade).map(([decade, data]) => ({
            decade: `${decade}s`,
            avgGoals: data.matches > 0 ? (data.goals / data.matches * 2).toFixed(2) : 0 // *2 because each match counted twice
        })).sort((a, b) => a.decade.localeCompare(b.decade));

        // Promotion success rate
        let promotedClubCount = 0;
        let survivedCount = 0;
        
        sortedSeasons.forEach((s, idx) => {
            if (idx === sortedSeasons.length - 1) return; // Skip last season (can't check survival)
            const nextSeason = sortedSeasons[idx + 1];
            if (!s.promoted_teams) return;
            
            const promoted = s.promoted_teams.split(',').map(t => t.trim()).filter(Boolean);
            promotedClubCount += promoted.length;
            
            const nextTable = leagueTables.filter(t => t.year === nextSeason.year);
            const relegated = nextSeason.relegated_teams?.split(',').map(t => t.trim()) || [];
            
            promoted.forEach(club => {
                const survived = !relegated.some(r => r === club || club.includes(r) || r.includes(club));
                if (survived) survivedCount++;
            });
        });

        const promotionSurvivalRate = promotedClubCount > 0 
            ? ((survivedCount / promotedClubCount) * 100).toFixed(1)
            : null;

        // Geographic champions
        const championsByRegion = {};
        seasons.forEach(s => {
            if (!s.champion_name) return;
            const club = clubs.find(c => c.name === s.champion_name);
            if (club?.region) {
                championsByRegion[club.region] = (championsByRegion[club.region] || 0) + 1;
            }
        });
        const topRegion = Object.entries(championsByRegion).sort((a, b) => b[1] - a[1])[0];

        // Volatility - position changes season to season
        let totalPositionChanges = 0;
        let comparisons = 0;
        
        sortedSeasons.forEach((s, idx) => {
            if (idx === 0) return;
            const prevSeason = sortedSeasons[idx - 1];
            const thisTable = leagueTables.filter(t => t.year === s.year);
            const prevTable = leagueTables.filter(t => t.year === prevSeason.year);
            
            thisTable.forEach(team => {
                const prevEntry = prevTable.find(p => p.club_name === team.club_name);
                if (prevEntry) {
                    totalPositionChanges += Math.abs(team.position - prevEntry.position);
                    comparisons++;
                }
            });
        });

        const avgVolatility = comparisons > 0 ? (totalPositionChanges / comparisons).toFixed(1) : 0;

        // Dynasty detection - clubs with 3+ consecutive titles
        const dynasties = [];
        let currentDynasty = null;
        
        sortedSeasons.forEach(s => {
            if (!s.champion_name) return;
            
            if (!currentDynasty || currentDynasty.club !== s.champion_name) {
                if (currentDynasty && currentDynasty.years.length >= 3) {
                    dynasties.push(currentDynasty);
                }
                currentDynasty = { club: s.champion_name, years: [s.year] };
            } else {
                currentDynasty.years.push(s.year);
            }
        });
        if (currentDynasty && currentDynasty.years.length >= 3) {
            dynasties.push(currentDynasty);
        }

        return {
            uniqueChampions,
            titleConcentration,
            pointsGapTrends,
            goalEconomy,
            promotionSurvivalRate,
            topRegion,
            avgVolatility,
            dynasties,
            tierPerformance: analytics?.tierPerformance || []
        };
    }, [league, seasons, leagueTables, clubs]);

    if (!analytics) return <p className="text-center py-8 text-slate-500">Not enough data for analytics</p>;

    return (
        <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-4 text-center">
                        <Users className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                        <div className="text-2xl font-bold">{analytics.uniqueChampions}</div>
                        <div className="text-xs text-slate-500">Different Champions</div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-4 text-center">
                        <Percent className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                        <div className="text-2xl font-bold">{analytics.titleConcentration}%</div>
                        <div className="text-xs text-slate-500">Top Club Dominance</div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-4 text-center">
                        <Target className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                        <div className="text-2xl font-bold">{analytics.avgVolatility}</div>
                        <div className="text-xs text-slate-500">Avg Position Change</div>
                    </CardContent>
                </Card>
                {analytics.promotionSurvivalRate && (
                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-4 text-center">
                            <TrendingUp className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                            <div className="text-2xl font-bold">{analytics.promotionSurvivalRate}%</div>
                            <div className="text-xs text-slate-500">Promotion Survival</div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Competitive Balance Insight */}
            <Card className="border-0 shadow-sm bg-gradient-to-r from-purple-50 to-pink-50">
                <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                        <Shield className="w-8 h-8 text-purple-600 mt-1" />
                        <div>
                            <h3 className="font-bold text-lg text-purple-900 mb-2">Competitive Balance</h3>
                            <p className="text-slate-700">
                                {analytics.uniqueChampions === 1 
                                    ? `Complete dominance - only 1 club has ever won the title.`
                                    : analytics.titleConcentration >= 50
                                    ? `Moderately competitive - ${analytics.uniqueChampions} different champions, but one club has won ${analytics.titleConcentration}% of titles.`
                                    : analytics.titleConcentration >= 30
                                    ? `Balanced competition - ${analytics.uniqueChampions} different champions with relatively even distribution.`
                                    : `Highly competitive - ${analytics.uniqueChampions} different champions with no single dominant force.`
                                }
                            </p>
                            <p className="text-sm text-purple-700 mt-2">
                                {analytics.avgVolatility >= 5
                                    ? `High volatility (${analytics.avgVolatility} avg position change) suggests an unpredictable league with frequent shake-ups.`
                                    : analytics.avgVolatility >= 3
                                    ? `Moderate volatility (${analytics.avgVolatility} avg position change) - a healthy mix of stability and movement.`
                                    : `Low volatility (${analytics.avgVolatility} avg position change) - established pecking order with limited movement.`
                                }
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Title Race Margins Over Time */}
            {analytics.pointsGapTrends.length >= 3 && (
                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Flame className="w-5 h-5 text-orange-500" />
                            Title Race Competitiveness
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                            <AreaChart data={analytics.pointsGapTrends}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} label={{ value: 'Points Gap', angle: -90, position: 'insideLeft', fontSize: 12 }} />
                                <Tooltip />
                                <Legend />
                                <Area type="monotone" dataKey="gap" stroke="#f59e0b" fill="#f59e0b20" name="1st to 2nd Gap" />
                            </AreaChart>
                        </ResponsiveContainer>
                        <p className="text-xs text-slate-500 mt-2 italic">Lower gaps = tighter title races</p>
                    </CardContent>
                </Card>
            )}

            {/* Goal Economy Trends */}
            {analytics.goalEconomy.length > 0 && (
                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Target className="w-5 h-5 text-blue-500" />
                            Scoring Trends by Decade
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={analytics.goalEconomy}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="decade" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} label={{ value: 'Goals per Match', angle: -90, position: 'insideLeft', fontSize: 12 }} />
                                <Tooltip />
                                <Bar dataKey="avgGoals" fill="#3b82f6" name="Avg Goals/Match" />
                            </BarChart>
                        </ResponsiveContainer>
                        <p className="text-xs text-slate-500 mt-2 italic">Shows offensive vs defensive eras</p>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Regional Success */}
                {analytics.topRegion && (
                    <Card className="border-0 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-indigo-500" />
                                Geographic Dominance
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="p-4 bg-indigo-50 rounded-lg">
                                <div className="text-2xl font-bold text-indigo-700 mb-1">{analytics.topRegion[0]}</div>
                                <div className="text-sm text-slate-600">{analytics.topRegion[1]} championship{analytics.topRegion[1] > 1 ? 's' : ''}</div>
                                <p className="text-xs text-indigo-600 mt-2">
                                    Most successful region - {((analytics.topRegion[1] / seasons.length) * 100).toFixed(1)}% of all titles
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Dynasties */}
                {analytics.dynasties.length > 0 && (
                    <Card className="border-0 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Crown className="w-5 h-5 text-amber-500" />
                                Dynasties (3+ Consecutive)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {analytics.dynasties.map((dynasty, idx) => {
                                    const club = clubs.find(c => c.name === dynasty.club);
                                    return (
                                        <div key={idx} className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                                            <div className="flex items-center gap-2 mb-1">
                                                {club?.logo_url && <img src={club.logo_url} alt="" className="w-6 h-6 object-contain" />}
                                                <span className="font-bold text-amber-800">{dynasty.club}</span>
                                            </div>
                                            <div className="text-sm text-amber-700">
                                                {dynasty.years.length} consecutive titles ({dynasty.years[0]} - {dynasty.years[dynasty.years.length - 1]})
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Promotion/Relegation Analysis */}
            {analytics.promotionSurvivalRate && (
                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-emerald-500" />
                            Promotion Success Analysis
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-3 gap-6 text-center">
                            <div>
                                <div className="text-3xl font-bold text-emerald-600">{analytics.promotionSurvivalRate}%</div>
                                <div className="text-sm text-slate-500">Survival Rate</div>
                            </div>
                            <div>
                                <div className="text-3xl font-bold text-slate-600">{survivedCount}</div>
                                <div className="text-sm text-slate-500">Survived</div>
                            </div>
                            <div>
                                <div className="text-3xl font-bold text-red-600">{promotedClubCount - survivedCount}</div>
                                <div className="text-sm text-slate-500">Relegated Back</div>
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 mt-4 italic text-center">
                            {analytics.promotionSurvivalRate >= 60 
                                ? 'Promoted clubs typically adapt well to this division'
                                : analytics.promotionSurvivalRate >= 40
                                ? 'Mixed results for promoted sides - tough but achievable'
                                : 'Extremely challenging for promoted clubs to survive'
                            }
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Title Race Summary */}
            {analytics.pointsGapTrends.length > 0 && (
                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-amber-500" />
                            Title Race Characteristics
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {(() => {
                                const avgGap = analytics.pointsGapTrends.reduce((sum, t) => sum + t.gap, 0) / analytics.pointsGapTrends.length;
                                const closestRace = analytics.pointsGapTrends.reduce((min, t) => t.gap < min.gap ? t : min);
                                const biggestMargin = analytics.pointsGapTrends.reduce((max, t) => t.gap > max.gap ? t : max);
                                
                                return (
                                    <>
                                        <div className="flex justify-between p-3 bg-slate-50 rounded-lg">
                                            <span className="text-slate-600">Average Title Margin</span>
                                            <span className="font-bold">{avgGap.toFixed(1)} points</span>
                                        </div>
                                        <div className="flex justify-between p-3 bg-orange-50 rounded-lg">
                                            <span className="text-slate-600">Closest Title Race</span>
                                            <span className="font-bold text-orange-600">{closestRace.gap} pts ({closestRace.year})</span>
                                        </div>
                                        <div className="flex justify-between p-3 bg-amber-50 rounded-lg">
                                            <span className="text-slate-600">Biggest Margin</span>
                                            <span className="font-bold text-amber-600">{biggestMargin.gap} pts ({biggestMargin.year})</span>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}