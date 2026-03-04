import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, MapPin, Building2, Star, TrendingUp, Shield, Award, BarChart2 } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend, PieChart, Pie
} from 'recharts';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#6366f1'];

export default function NationGeographyTab({ clubs, leagueTables, leagues }) {
    const [viewLevel, setViewLevel] = useState('region');

    const stats = useMemo(() => {
        if (!clubs || clubs.length === 0) return null;

        const buildLocationMap = (keyFn, extraFn) => {
            const map = {};
            clubs.forEach(club => {
                const key = keyFn(club);
                if (!key) return;
                if (!map[key]) {
                    map[key] = { name: key, clubs: [], titles: 0, cupTitles: 0, topFlightSeasons: 0, topThreeFinishes: 0, ...(extraFn ? extraFn(club) : {}) };
                }
                if (!map[key].clubs.find(c => c.id === club.id)) {
                    map[key].clubs.push(club);
                    map[key].titles += (club.league_titles || 0);
                    map[key].cupTitles += (club.domestic_cup_titles || 0);
                    map[key].topFlightSeasons += (club.seasons_top_flight || 0);
                }
            });

            // Add table stats
            (leagueTables || []).forEach(entry => {
                const club = clubs.find(c => c.id === entry.club_id);
                if (!club) return;
                const key = keyFn(club);
                if (!key || !map[key]) return;
                const league = leagues?.find(l => l.id === entry.league_id);
                const tier = entry.tier || league?.tier || 1;
                if (tier === 1 && entry.position <= 3) map[key].topThreeFinishes++;
            });

            return Object.values(map).map(loc => ({
                ...loc,
                score: (loc.titles * 10) + (loc.cupTitles * 7) + (loc.topThreeFinishes * 3) + (loc.topFlightSeasons * 0.1),
            })).sort((a, b) => b.score - a.score);
        };

        const regionMap = buildLocationMap(c => c.region);
        const districtMap = buildLocationMap(c => c.district, c => ({ region: c.region }));
        const settlementMap = buildLocationMap(c => c.settlement, c => ({ region: c.region, district: c.district }));

        // Tier breakdown per location for each level
        const tierBreakdown = (keyFn) => {
            const map = {};
            clubs.forEach(club => {
                const key = keyFn(club);
                if (!key) return;
                const league = leagues?.find(l => l.id === club.league_id);
                const tier = league?.tier;
                if (!map[key]) map[key] = {};
                if (tier) map[key][`Tier ${tier}`] = (map[key][`Tier ${tier}`] || 0) + 1;
            });
            return map;
        };

        const tierBreakdowns = {
            region: tierBreakdown(c => c.region),
            district: tierBreakdown(c => c.district),
            settlement: tierBreakdown(c => c.settlement),
        };

        // All tiers present
        const allTiers = [...new Set(clubs.map(c => leagues?.find(l => l.id === c.league_id)?.tier).filter(Boolean))].sort();

        return { regionMap, districtMap, settlementMap, tierBreakdowns, allTiers };
    }, [clubs, leagueTables, leagues]);

    if (!stats) {
        return (
            <Card>
                <CardContent className="py-12 text-center text-slate-500">
                    No club location data available. Add location data to clubs to see geography stats.
                </CardContent>
            </Card>
        );
    }

    const { regionMap, districtMap, settlementMap, tierBreakdowns, allTiers } = stats;

    const currentData = viewLevel === 'region' ? regionMap : viewLevel === 'district' ? districtMap : settlementMap;
    const currentTierBreakdown = tierBreakdowns[viewLevel];

    const top = currentData[0];
    const mostClubs = [...currentData].sort((a, b) => b.clubs.length - a.clubs.length)[0];
    const mostTopFlight = [...currentData].sort((a, b) => b.topFlightSeasons - a.topFlightSeasons)[0];
    const mostTitles = [...currentData].sort((a, b) => (b.titles + b.cupTitles) - (a.titles + a.cupTitles))[0];

    // Chart data - clubs per location
    const clubsChartData = [...currentData]
        .sort((a, b) => b.clubs.length - a.clubs.length)
        .slice(0, 15)
        .map(loc => ({ name: loc.name.length > 12 ? loc.name.slice(0, 12) + '…' : loc.name, fullName: loc.name, clubs: loc.clubs.length }));

    // Top flight appearances chart
    const topFlightChart = [...currentData]
        .sort((a, b) => b.topFlightSeasons - a.topFlightSeasons)
        .slice(0, 15)
        .map(loc => ({ name: loc.name.length > 12 ? loc.name.slice(0, 12) + '…' : loc.name, fullName: loc.name, 'Top Flight': loc.topFlightSeasons, Titles: loc.titles }));

    // Tier distribution pie (overall)
    const tierPieData = allTiers.map((tier, i) => {
        const count = clubs.filter(c => leagues?.find(l => l.id === c.league_id)?.tier === tier).length;
        return { name: `Tier ${tier}`, value: count, color: COLORS[i % COLORS.length] };
    });

    // Stacked bar - tier breakdown per location
    const stackedData = currentData.slice(0, 12).map(loc => {
        const row = { name: loc.name.length > 10 ? loc.name.slice(0, 10) + '…' : loc.name, fullName: loc.name };
        allTiers.forEach(tier => {
            row[`T${tier}`] = currentTierBreakdown[loc.name]?.[`Tier ${tier}`] || 0;
        });
        return row;
    });

    const getDominanceLabel = (loc) => {
        const total = loc.titles + loc.cupTitles;
        if (total >= 5) return { label: 'Dominant', color: 'bg-amber-100 text-amber-800' };
        if (total >= 2) return { label: 'Strong', color: 'bg-emerald-100 text-emerald-800' };
        if (loc.topThreeFinishes >= 3) return { label: 'Competitive', color: 'bg-blue-100 text-blue-800' };
        return { label: 'Developing', color: 'bg-slate-100 text-slate-700' };
    };

    const noData = currentData.length === 0;

    return (
        <div className="space-y-6">
            {/* Level Toggle */}
            <div className="flex gap-2">
                {['region', 'district', 'settlement'].map(level => (
                    <Button
                        key={level}
                        variant={viewLevel === level ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewLevel(level)}
                        className="capitalize"
                    >
                        {level}s ({(level === 'region' ? regionMap : level === 'district' ? districtMap : settlementMap).length})
                    </Button>
                ))}
            </div>

            {noData ? (
                <Card>
                    <CardContent className="py-10 text-center text-slate-500">
                        No {viewLevel} data for clubs yet. Add {viewLevel} info to clubs to see stats.
                    </CardContent>
                </Card>
            ) : (
                <>
                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-orange-50">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <Trophy className="w-4 h-4 text-amber-600" />
                                    <span className="text-xs text-amber-600 font-medium">Most Successful</span>
                                </div>
                                <div className="font-bold text-slate-900 truncate">{mostTitles?.name}</div>
                                <div className="text-sm text-slate-600">{(mostTitles?.titles || 0) + (mostTitles?.cupTitles || 0)} trophies</div>
                            </CardContent>
                        </Card>
                        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <Shield className="w-4 h-4 text-blue-600" />
                                    <span className="text-xs text-blue-600 font-medium">Most Clubs</span>
                                </div>
                                <div className="font-bold text-slate-900 truncate">{mostClubs?.name}</div>
                                <div className="text-sm text-slate-600">{mostClubs?.clubs.length} clubs</div>
                            </CardContent>
                        </Card>
                        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-teal-50">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                                    <span className="text-xs text-emerald-600 font-medium">Most Top Flight</span>
                                </div>
                                <div className="font-bold text-slate-900 truncate">{mostTopFlight?.name}</div>
                                <div className="text-sm text-slate-600">{mostTopFlight?.topFlightSeasons} seasons</div>
                            </CardContent>
                        </Card>
                        <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-pink-50">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <MapPin className="w-4 h-4 text-purple-600" />
                                    <span className="text-xs text-purple-600 font-medium">Total {viewLevel}s</span>
                                </div>
                                <div className="font-bold text-slate-900">{currentData.length}</div>
                                <div className="text-sm text-slate-600">with clubs</div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Clubs per Location */}
                        <Card className="border-0 shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <Shield className="w-4 h-4 text-blue-500" />
                                    Clubs per {viewLevel}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={220}>
                                    <BarChart data={clubsChartData} layout="vertical" margin={{ left: 8, right: 16 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                        <XAxis type="number" tick={{ fontSize: 11 }} />
                                        <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={90} />
                                        <Tooltip formatter={(v, n, props) => [v, props.payload.fullName]} />
                                        <Bar dataKey="clubs" radius={[0, 4, 4, 0]}>
                                            {clubsChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* Top Flight Seasons */}
                        <Card className="border-0 shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                                    Top Flight Seasons by {viewLevel}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={220}>
                                    <BarChart data={topFlightChart} layout="vertical" margin={{ left: 8, right: 16 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                        <XAxis type="number" tick={{ fontSize: 11 }} />
                                        <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={90} />
                                        <Tooltip formatter={(v, n, props) => [v, `${props.payload.fullName} - ${n}`]} />
                                        <Bar dataKey="Top Flight" fill="#10b981" radius={[0, 4, 4, 0]} />
                                        <Bar dataKey="Titles" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                                        <Legend />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>

                    {/* League Tier Distribution */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Stacked tier breakdown */}
                        <Card className="border-0 shadow-sm lg:col-span-2">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <BarChart2 className="w-4 h-4 text-purple-500" />
                                    League Tier Breakdown by {viewLevel}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={260}>
                                    <BarChart data={stackedData} layout="vertical" margin={{ left: 8, right: 16 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                        <XAxis type="number" tick={{ fontSize: 11 }} />
                                        <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={90} />
                                        <Tooltip formatter={(v, n, props) => [v, `${props.payload.fullName} - ${n}`]} />
                                        <Legend />
                                        {allTiers.map((tier, i) => (
                                            <Bar key={tier} dataKey={`T${tier}`} name={`Tier ${tier}`} stackId="a" fill={COLORS[i % COLORS.length]} />
                                        ))}
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* Tier pie */}
                        <Card className="border-0 shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-indigo-500" />
                                    All Clubs by Tier
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={200}>
                                    <PieChart>
                                        <Pie data={tierPieData} cx="50%" cy="50%" innerRadius={45} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false} fontSize={10}>
                                            {tierPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="flex flex-wrap gap-2 justify-center mt-2">
                                    {tierPieData.map((d, i) => (
                                        <div key={i} className="flex items-center gap-1 text-xs">
                                            <div className="w-3 h-3 rounded-full" style={{ background: d.color }} />
                                            <span>{d.name}: {d.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Rankings Table */}
                    <Card className="border-0 shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Star className="w-4 h-4 text-amber-500" />
                                {viewLevel.charAt(0).toUpperCase() + viewLevel.slice(1)} Rankings
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {currentData.map((loc, idx) => {
                                    const dom = getDominanceLabel(loc);
                                    return (
                                        <div key={loc.name} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                                            <span className="w-7 text-center font-bold text-slate-400 text-sm">#{idx + 1}</span>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-slate-900 truncate">{loc.name}</span>
                                                    <Badge className={`${dom.color} text-xs shrink-0`}>{dom.label}</Badge>
                                                </div>
                                                {loc.region && viewLevel !== 'region' && (
                                                    <span className="text-xs text-slate-500">{loc.district ? `${loc.district}, ` : ''}{loc.region}</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 text-sm shrink-0">
                                                <div className="text-center hidden sm:block">
                                                    <div className="font-bold text-blue-600">{loc.clubs.length}</div>
                                                    <div className="text-xs text-slate-500">clubs</div>
                                                </div>
                                                <div className="text-center hidden sm:block">
                                                    <div className="font-bold text-emerald-600">{loc.topFlightSeasons}</div>
                                                    <div className="text-xs text-slate-500">top flight</div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="font-bold text-amber-600">{loc.titles}</div>
                                                    <div className="text-xs text-slate-500">titles</div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="font-bold text-orange-500">{loc.cupTitles}</div>
                                                    <div className="text-xs text-slate-500">cups</div>
                                                </div>
                                            </div>
                                            {/* Club crests */}
                                            <div className="hidden md:flex items-center gap-1 shrink-0">
                                                {loc.clubs.slice(0, 5).map(club => (
                                                    <Link key={club.id} to={createPageUrl(`ClubDetail?id=${club.id}`)}>
                                                        {club.logo_url ? (
                                                            <img src={club.logo_url} alt={club.name} className="w-6 h-6 object-contain" title={club.name} />
                                                        ) : (
                                                            <Shield className="w-5 h-5 text-slate-300" title={club.name} />
                                                        )}
                                                    </Link>
                                                ))}
                                                {loc.clubs.length > 5 && (
                                                    <span className="text-xs text-slate-400">+{loc.clubs.length - 5}</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}