import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Shield, Trophy, TrendingUp, Calendar, Building2, Map, Star, Award } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const CHART_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1'];

function StatCard({ icon: Icon, label, value, sub, color = 'emerald' }) {
    const colorMap = {
        emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        blue: 'bg-blue-50 text-blue-600 border-blue-100',
        amber: 'bg-amber-50 text-amber-600 border-amber-100',
        purple: 'bg-purple-50 text-purple-600 border-purple-100',
    };
    return (
        <Card className={`border ${colorMap[color]}`}>
            <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                    <Icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{label}</span>
                </div>
                <div className="text-2xl font-bold">{value}</div>
                {sub && <div className="text-xs mt-1 opacity-70">{sub}</div>}
            </CardContent>
        </Card>
    );
}

function RankTable({ title, icon: Icon, rows, valueLabel }) {
    return (
        <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                    <Icon className="w-4 h-4 text-slate-500" />
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                    {rows.slice(0, 10).map((row, idx) => (
                        <div key={row.name} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                                ${idx === 0 ? 'bg-amber-100 text-amber-700' : idx === 1 ? 'bg-slate-200 text-slate-600' : idx === 2 ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-500'}`}>
                                {idx + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate">{row.name}</div>
                                {row.sub && <div className="text-xs text-slate-500">{row.sub}</div>}
                            </div>
                            <div className="font-bold text-sm text-slate-700 flex-shrink-0">{row.value} <span className="text-xs font-normal text-slate-400">{valueLabel}</span></div>
                        </div>
                    ))}
                    {rows.length === 0 && (
                        <div className="px-4 py-8 text-center text-sm text-slate-400">No data yet</div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

export default function NationGeographyTab({ clubs = [], leagues = [], leagueTables = [] }) {
    const [geoLevel, setGeoLevel] = useState('region');

    const activeClubs = clubs.filter(c => !c.is_defunct && !c.is_former_name);

    // Build grouped stats by region / district / settlement
    const grouped = useMemo(() => {
        const map = {};
        activeClubs.forEach(club => {
            const key = club[geoLevel] || (geoLevel === 'settlement' ? club.city : null);
            if (!key) return;
            if (!map[key]) {
                map[key] = { name: key, clubs: [], titles: 0, topFlightSeasons: 0, cupTitles: 0, totalTrophies: 0 };
            }
            map[key].clubs.push(club);
            map[key].titles += club.league_titles || 0;
            map[key].cupTitles += club.domestic_cup_titles || 0;
            map[key].topFlightSeasons += club.seasons_top_flight || 0;
            map[key].totalTrophies += (club.league_titles || 0) + (club.domestic_cup_titles || 0);
        });
        return Object.values(map);
    }, [activeClubs, geoLevel]);

    // League breakdown by region
    const leagueMap = useMemo(() => {
        const lm = {};
        leagues.forEach(l => { lm[l.id] = l; });
        return lm;
    }, [leagues]);

    const leagueBreakdown = useMemo(() => {
        const byLeague = {};
        activeClubs.forEach(club => {
            const geoKey = club[geoLevel] || (geoLevel === 'settlement' ? club.city : null);
            if (!geoKey || !club.league_id) return;
            const league = leagueMap[club.league_id];
            if (!league) return;
            const lName = league.name;
            if (!byLeague[lName]) byLeague[lName] = { league: lName, tier: league.tier || 99 };
            byLeague[lName][geoKey] = (byLeague[lName][geoKey] || 0) + 1;
        });
        return Object.values(byLeague).sort((a, b) => a.tier - b.tier);
    }, [activeClubs, geoLevel, leagueMap]);

    // Clubs without location data
    const missingLocation = activeClubs.filter(c => !c.region && !c.district && !c.settlement && !c.city);
    const missingFounded = activeClubs.filter(c => !c.founded_year);

    // Summary stats
    const regions = [...new Set(activeClubs.map(c => c.region).filter(Boolean))];
    const districts = [...new Set(activeClubs.map(c => c.district).filter(Boolean))];
    const settlements = [...new Set(activeClubs.map(c => c.settlement || c.city).filter(Boolean))];

    // Founding era breakdown
    const foundingEras = useMemo(() => {
        const eras = { 'Pre-1900': 0, '1900-1949': 0, '1950-1979': 0, '1980-1999': 0, '2000+': 0 };
        activeClubs.forEach(c => {
            if (!c.founded_year) return;
            const y = c.founded_year;
            if (y < 1900) eras['Pre-1900']++;
            else if (y < 1950) eras['1900-1949']++;
            else if (y < 1980) eras['1950-1979']++;
            else if (y < 2000) eras['1980-1999']++;
            else eras['2000+']++;
        });
        return Object.entries(eras).map(([name, value]) => ({ name, value })).filter(e => e.value > 0);
    }, [activeClubs]);

    // Top flight dominance (which geo areas have most top-flight seasons)
    const topFlightDominance = [...grouped]
        .filter(g => g.topFlightSeasons > 0)
        .sort((a, b) => b.topFlightSeasons - a.topFlightSeasons);

    const byClubCount = [...grouped].sort((a, b) => b.clubs.length - a.clubs.length);
    const byTitles = [...grouped].filter(g => g.totalTrophies > 0).sort((a, b) => b.totalTrophies - a.totalTrophies);

    // Most represented geo area in each league tier
    const tierDominance = useMemo(() => {
        const tierMap = {};
        activeClubs.forEach(club => {
            const geoKey = club[geoLevel] || (geoLevel === 'settlement' ? club.city : null);
            if (!geoKey || !club.league_id) return;
            const league = leagueMap[club.league_id];
            if (!league) return;
            const tier = league.tier || 99;
            if (!tierMap[tier]) tierMap[tier] = {};
            tierMap[tier][geoKey] = (tierMap[tier][geoKey] || 0) + 1;
        });
        return Object.entries(tierMap).map(([tier, areas]) => {
            const sorted = Object.entries(areas).sort((a, b) => b[1] - a[1]);
            return { tier: parseInt(tier), areas: sorted.slice(0, 5) };
        }).sort((a, b) => a.tier - b.tier);
    }, [activeClubs, geoLevel, leagueMap]);

    const chartData = byClubCount.slice(0, 12).map(g => ({
        name: g.name.length > 12 ? g.name.slice(0, 12) + '…' : g.name,
        clubs: g.clubs.length,
        titles: g.totalTrophies,
        topFlight: g.topFlightSeasons,
    }));

    const levelLabel = geoLevel === 'region' ? 'Region' : geoLevel === 'district' ? 'District' : 'Settlement';

    return (
        <div className="space-y-8">
            {/* Summary stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={Map} label="Regions" value={regions.length} sub={`${activeClubs.filter(c => c.region).length} clubs mapped`} color="emerald" />
                <StatCard icon={MapPin} label="Districts" value={districts.length} sub={`across ${regions.length} regions`} color="blue" />
                <StatCard icon={Building2} label="Settlements" value={settlements.length} sub="towns & cities" color="amber" />
                <StatCard icon={Shield} label="Missing Location" value={missingLocation.length} sub="no geo data" color="purple" />
            </div>

            {/* Geo level selector */}
            <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-600">View by:</span>
                {['region', 'district', 'settlement'].map(level => (
                    <button
                        key={level}
                        onClick={() => setGeoLevel(level)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors capitalize
                            ${geoLevel === level ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                        {level}
                    </button>
                ))}
            </div>

            {/* Main chart */}
            {chartData.length > 0 && (
                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base">Clubs per {levelLabel}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 40 }}>
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" interval={0} />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip />
                                <Bar dataKey="clubs" name="Clubs" fill="#10b981" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="titles" name="Trophies" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}

            {/* Ranking tables */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <RankTable
                    title={`Most Clubs per ${levelLabel}`}
                    icon={Shield}
                    rows={byClubCount.map(g => ({ name: g.name, value: g.clubs.length, sub: `${g.titles} league titles` }))}
                    valueLabel="clubs"
                />
                <RankTable
                    title={`Most Successful ${levelLabel}`}
                    icon={Trophy}
                    rows={byTitles.map(g => ({ name: g.name, value: g.totalTrophies, sub: `${g.titles} league + ${g.cupTitles} cup` }))}
                    valueLabel="trophies"
                />
                <RankTable
                    title={`Top Flight Dominance`}
                    icon={TrendingUp}
                    rows={topFlightDominance.map(g => ({ name: g.name, value: g.topFlightSeasons, sub: `${g.clubs.length} clubs` }))}
                    valueLabel="seasons"
                />
            </div>

            {/* League tier breakdown by geography */}
            {tierDominance.length > 0 && (
                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Award className="w-4 h-4 text-slate-500" />
                            Most Represented {levelLabel} per League Tier
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {tierDominance.map(({ tier, areas }) => (
                                <div key={tier}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Badge className="bg-slate-700 text-white text-xs">Tier {tier}</Badge>
                                        <span className="text-xs text-slate-500">{leagues.find(l => l.tier === tier)?.name || ''}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {areas.map(([area, count], i) => (
                                            <div key={area} className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-full px-3 py-1">
                                                {i === 0 && <Star className="w-3 h-3 text-amber-500" />}
                                                <span className="text-sm font-medium">{area}</span>
                                                <span className="text-xs text-slate-400">{count}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Founding era & pie chart row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Founding eras */}
                {foundingEras.length > 0 && (
                    <Card className="border-0 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-slate-500" />
                                Clubs by Founding Era
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={foundingEras}>
                                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 11 }} />
                                    <Tooltip />
                                    <Bar dataKey="value" name="Clubs" radius={[4, 4, 0, 0]}>
                                        {foundingEras.map((_, i) => (
                                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                )}

                {/* Region pie chart */}
                {byClubCount.length > 0 && (
                    <Card className="border-0 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-slate-500" />
                                Club Distribution by {levelLabel}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie
                                        data={byClubCount.slice(0, 8).map(g => ({ name: g.name, value: g.clubs.length }))}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={80}
                                        label={({ name, percent }) => `${name.slice(0, 8)} ${(percent * 100).toFixed(0)}%`}
                                        labelLine={false}
                                    >
                                        {byClubCount.slice(0, 8).map((_, i) => (
                                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(val) => [val, 'Clubs']} />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Oldest clubs */}
            <Card className="border-0 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-500" />
                        Oldest Clubs
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {activeClubs
                            .filter(c => c.founded_year)
                            .sort((a, b) => a.founded_year - b.founded_year)
                            .slice(0, 10)
                            .map((club, idx) => (
                                <Link key={club.id} to={createPageUrl(`ClubDetail?id=${club.id}`)}>
                                    <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 border border-slate-100">
                                        <span className="w-6 text-center text-xs font-bold text-slate-400">{idx + 1}</span>
                                        {club.logo_url ? (
                                            <img src={club.logo_url} alt={club.name} className="w-8 h-8 object-contain" />
                                        ) : (
                                            <Shield className="w-6 h-6 text-slate-300" />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-sm truncate">{club.name}</div>
                                            <div className="text-xs text-slate-500">{club.settlement || club.region || ''}</div>
                                        </div>
                                        <Badge variant="outline" className="text-xs flex-shrink-0">{club.founded_year}</Badge>
                                    </div>
                                </Link>
                            ))}
                    </div>
                </CardContent>
            </Card>

            {/* Missing data warning */}
            {(missingLocation.length > 0 || missingFounded.length > 0) && (
                <Card className="border-amber-200 bg-amber-50">
                    <CardContent className="p-4">
                        <h4 className="font-semibold text-amber-800 mb-2">⚠️ Missing Data</h4>
                        <div className="text-sm text-amber-700 space-y-1">
                            {missingLocation.length > 0 && (
                                <div>{missingLocation.length} clubs have no location data: {missingLocation.slice(0, 5).map(c => c.name).join(', ')}{missingLocation.length > 5 ? ` +${missingLocation.length - 5} more` : ''}</div>
                            )}
                            {missingFounded.length > 0 && (
                                <div>{missingFounded.length} clubs missing founded year</div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}