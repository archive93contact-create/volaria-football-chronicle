import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Star, TrendingUp, TrendingDown, Shield, Users, Target, Award, Globe } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import LocationRankings from './LocationRankings';

export default function LocationAnalytics({ locationClubs, leagues, locationType, locationName, allLeagueTables = [], allLocations = [], allClubs = [] }) {
    const analytics = useMemo(() => {
        if (!locationClubs || locationClubs.length === 0) return null;

        // Club distribution by tier
        const clubsByTier = {};
        locationClubs.forEach(club => {
            const league = leagues.find(l => l.id === club.league_id);
            const tier = league?.tier || 99;
            clubsByTier[tier] = (clubsByTier[tier] || 0) + 1;
        });

        const tierDistribution = Object.entries(clubsByTier)
            .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
            .map(([tier, count]) => ({ tier: `Tier ${tier}`, count }));

        // Success metrics
        const totalTitles = locationClubs.reduce((sum, c) => sum + (c.league_titles || 0), 0);
        const totalCupTitles = locationClubs.reduce((sum, c) => sum + (c.domestic_cup_titles || 0), 0);
        const totalContinental = locationClubs.reduce((sum, c) => sum + (c.vcc_titles || 0) + (c.ccc_titles || 0), 0);
        const topFlightClubs = locationClubs.filter(c => {
            const league = leagues.find(l => l.id === c.league_id);
            return league?.tier === 1;
        }).length;

        // Club history analysis
        const totalSeasons = locationClubs.reduce((sum, c) => sum + (c.seasons_played || 0), 0);
        const avgSeasons = locationClubs.length > 0 ? Math.round(totalSeasons / locationClubs.length) : 0;
        const totalPromotions = locationClubs.reduce((sum, c) => sum + (c.promotions || 0), 0);
        const totalRelegations = locationClubs.reduce((sum, c) => sum + (c.relegations || 0), 0);

        // Professional status breakdown
        const professionalBreakdown = {
            professional: locationClubs.filter(c => c.professional_status === 'professional').length,
            semiPro: locationClubs.filter(c => c.professional_status === 'semi-professional').length,
            amateur: locationClubs.filter(c => !c.professional_status || c.professional_status === 'amateur').length,
        };

        const statusData = [
            { name: 'Professional', value: professionalBreakdown.professional, color: '#3b82f6' },
            { name: 'Semi-Pro', value: professionalBreakdown.semiPro, color: '#a855f7' },
            { name: 'Amateur', value: professionalBreakdown.amateur, color: '#64748b' },
        ].filter(d => d.value > 0);

        // Most successful clubs
        const topClubs = [...locationClubs]
            .sort((a, b) => {
                const aScore = (a.vcc_titles || 0) * 100 + (a.league_titles || 0) * 10 + (a.domestic_cup_titles || 0);
                const bScore = (b.vcc_titles || 0) * 100 + (b.league_titles || 0) * 10 + (b.domestic_cup_titles || 0);
                return bScore - aScore;
            })
            .filter(c => (c.league_titles || 0) + (c.domestic_cup_titles || 0) + (c.vcc_titles || 0) + (c.ccc_titles || 0) > 0)
            .slice(0, 5);

        // Historical performance over time (from LeagueTable data)
        const yearlyPerformance = {};
        locationClubs.forEach(club => {
            const clubTables = allLeagueTables.filter(t => t.club_id === club.id);
            clubTables.forEach(table => {
                if (!table.year) return;
                if (!yearlyPerformance[table.year]) {
                    yearlyPerformance[table.year] = { year: table.year, topFlight: 0, tier2: 0, tier3Plus: 0, totalClubs: 0 };
                }
                const league = leagues.find(l => l.id === table.league_id);
                const tier = table.tier || league?.tier || 1;
                yearlyPerformance[table.year].totalClubs++;
                if (tier === 1) yearlyPerformance[table.year].topFlight++;
                else if (tier === 2) yearlyPerformance[table.year].tier2++;
                else yearlyPerformance[table.year].tier3Plus++;
            });
        });

        const performanceOverTime = Object.values(yearlyPerformance)
            .sort((a, b) => a.year.localeCompare(b.year))
            .slice(-15); // Last 15 years

        // Best finishes
        const bestFinishes = locationClubs
            .filter(c => c.best_finish)
            .sort((a, b) => {
                // Sort by tier first (lower is better), then by position
                const tierDiff = (a.best_finish_tier || 1) - (b.best_finish_tier || 1);
                if (tierDiff !== 0) return tierDiff;
                return a.best_finish - b.best_finish;
            })
            .slice(0, 5);

        return {
            tierDistribution,
            totalTitles,
            totalCupTitles,
            totalContinental,
            topFlightClubs,
            avgSeasons,
            totalPromotions,
            totalRelegations,
            statusData,
            topClubs,
            performanceOverTime,
            bestFinishes,
            clubCount: locationClubs.length,
        };
    }, [locationClubs, leagues, allLeagueTables]);

    if (!analytics) {
        return (
            <Card className="border-dashed border-2 border-slate-300">
                <CardContent className="flex flex-col items-center justify-center py-12">
                    <Shield className="w-12 h-12 text-slate-300 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">No Data Available</h3>
                    <p className="text-slate-500">Add clubs to this location to see analytics</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-4 text-center">
                        <Shield className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                        <div className="text-2xl font-bold">{analytics.clubCount}</div>
                        <div className="text-xs text-slate-500">Football Clubs</div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-amber-50">
                    <CardContent className="p-4 text-center">
                        <Star className="w-6 h-6 text-amber-600 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-amber-700">{analytics.topFlightClubs}</div>
                        <div className="text-xs text-amber-600">Top Flight Clubs</div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-4 text-center">
                        <Trophy className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
                        <div className="text-2xl font-bold">{analytics.totalTitles}</div>
                        <div className="text-xs text-slate-500">League Titles</div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-purple-50">
                    <CardContent className="p-4 text-center">
                        <Star className="w-6 h-6 text-purple-600 mx-auto mb-2 fill-purple-600" />
                        <div className="text-2xl font-bold text-purple-700">{analytics.totalContinental}</div>
                        <div className="text-xs text-purple-600">Continental</div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Tier Distribution */}
                <Card className="border-0 shadow-sm">
                    <CardHeader><CardTitle className="text-lg">League Tier Distribution</CardTitle></CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={analytics.tierDistribution}>
                                <XAxis dataKey="tier" />
                                <YAxis allowDecimals={false} />
                                <Tooltip />
                                <Bar dataKey="count" fill="#10b981" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Professional Status */}
                {analytics.statusData.length > 0 && (
                    <Card className="border-0 shadow-sm">
                        <CardHeader><CardTitle className="text-lg">Professional Status</CardTitle></CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie
                                        data={analytics.statusData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, value }) => `${name}: ${value}`}
                                        outerRadius={80}
                                        dataKey="value"
                                    >
                                        {analytics.statusData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Historical Performance */}
            {analytics.performanceOverTime.length > 0 && (
                <Card className="border-0 shadow-sm">
                    <CardHeader><CardTitle className="text-lg">Historical Performance by Division</CardTitle></CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={analytics.performanceOverTime}>
                                <XAxis dataKey="year" />
                                <YAxis allowDecimals={false} />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="topFlight" stroke="#f59e0b" strokeWidth={2} name="Top Flight" />
                                <Line type="monotone" dataKey="tier2" stroke="#3b82f6" strokeWidth={2} name="Tier 2" />
                                <Line type="monotone" dataKey="tier3Plus" stroke="#64748b" strokeWidth={2} name="Tier 3+" />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}

            {/* Most Successful Clubs */}
            {analytics.topClubs.length > 0 && (
                <Card className="border-0 shadow-sm">
                    <CardHeader><CardTitle className="text-lg">Most Decorated Clubs</CardTitle></CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {analytics.topClubs.map((club, idx) => (
                                <Link
                                    key={club.id}
                                    to={createPageUrl(`ClubDetail?id=${club.id}`)}
                                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors border border-slate-100"
                                >
                                    <span className="w-6 text-center font-bold text-xl text-slate-300">{idx + 1}</span>
                                    {club.logo_url ? (
                                        <img src={club.logo_url} alt="" className="w-12 h-12 object-contain bg-white rounded p-1" />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center">
                                            <Shield className="w-6 h-6 text-slate-400" />
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <div className="font-bold">{club.name}</div>
                                        <div className="text-xs text-slate-500">{club.nickname}</div>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm">
                                        {club.league_titles > 0 && (
                                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                                <Trophy className="w-3 h-3 mr-1" /> {club.league_titles}
                                            </Badge>
                                        )}
                                        {club.domestic_cup_titles > 0 && (
                                            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                                                <Award className="w-3 h-3 mr-1" /> {club.domestic_cup_titles}
                                            </Badge>
                                        )}
                                        {club.vcc_titles > 0 && (
                                            <Badge className="bg-purple-500 text-white">
                                                <Star className="w-3 h-3 mr-1 fill-white" /> {club.vcc_titles} VCC
                                            </Badge>
                                        )}
                                        {club.ccc_titles > 0 && (
                                            <Badge className="bg-blue-500 text-white">
                                                <Globe className="w-3 h-3 mr-1" /> {club.ccc_titles} CCC
                                            </Badge>
                                        )}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Best Finishes */}
            {analytics.bestFinishes.length > 0 && (
                <Card className="border-0 shadow-sm">
                    <CardHeader><CardTitle className="text-lg">Best League Finishes</CardTitle></CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {analytics.bestFinishes.map((club) => (
                                <Link
                                    key={club.id}
                                    to={createPageUrl(`ClubDetail?id=${club.id}`)}
                                    className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors border border-slate-100"
                                >
                                    <div className="flex items-center gap-3">
                                        {club.logo_url ? (
                                            <img src={club.logo_url} alt="" className="w-10 h-10 object-contain bg-white rounded p-1" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                                                <Shield className="w-5 h-5 text-slate-400" />
                                            </div>
                                        )}
                                        <div>
                                            <div className="font-medium">{club.name}</div>
                                            <div className="text-xs text-slate-500">{club.best_finish_year}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                            <Target className="w-3 h-3 mr-1" />
                                            {club.best_finish === 1 ? '1st' : club.best_finish === 2 ? '2nd' : club.best_finish === 3 ? '3rd' : `${club.best_finish}th`}
                                        </Badge>
                                        {club.best_finish_tier && (
                                            <span className="text-xs text-slate-500">Tier {club.best_finish_tier}</span>
                                        )}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Additional Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-4 text-center">
                        <Users className="w-5 h-5 text-slate-500 mx-auto mb-2" />
                        <div className="text-lg font-bold">{analytics.avgSeasons}</div>
                        <div className="text-xs text-slate-500">Avg Seasons</div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-green-50">
                    <CardContent className="p-4 text-center">
                        <TrendingUp className="w-5 h-5 text-green-600 mx-auto mb-2" />
                        <div className="text-lg font-bold text-green-700">{analytics.totalPromotions}</div>
                        <div className="text-xs text-green-600">Promotions</div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-red-50">
                    <CardContent className="p-4 text-center">
                        <TrendingDown className="w-5 h-5 text-red-600 mx-auto mb-2" />
                        <div className="text-lg font-bold text-red-700">{analytics.totalRelegations}</div>
                        <div className="text-xs text-red-600">Relegations</div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-orange-50">
                    <CardContent className="p-4 text-center">
                        <Award className="w-5 h-5 text-orange-600 mx-auto mb-2" />
                        <div className="text-lg font-bold text-orange-700">{analytics.totalCupTitles}</div>
                        <div className="text-xs text-orange-600">Cup Titles</div>
                    </CardContent>
                </Card>
            </div>

            {/* Club Rankings in this Location */}
            <div className="mt-6">
                <LocationRankings 
                    location={{ name: locationName, type: locationType }}
                    allClubs={locationClubs}
                    allLeagues={leagues}
                />
            </div>
        </div>
    );
}