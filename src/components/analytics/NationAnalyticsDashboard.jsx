import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Trophy, TrendingUp, Shield, Users, Calendar, Award, Star, AlertCircle } from 'lucide-react';
import StatsCard from '@/components/common/StatsCard';

export default function NationAnalyticsDashboard({ 
    nation, 
    leagues = [], 
    clubs = [], 
    seasons = [], 
    leagueTables = [],
    domesticCups = [],
    domesticCupSeasons = [],
    players = []
}) {
    const analytics = useMemo(() => {
        if (!nation) return null;

        // Club Health
        const totalClubs = clubs.length;
        const activeClubs = clubs.filter(c => !c.is_defunct && c.is_active !== false).length;
        const defunctClubs = clubs.filter(c => c.is_defunct).length;
        const inactiveClubs = clubs.filter(c => !c.is_defunct && c.is_active === false).length;
        const defunctRate = totalClubs > 0 ? ((defunctClubs / totalClubs) * 100).toFixed(1) : 0;

        // Professional Status
        const professionalClubs = clubs.filter(c => c.professional_status === 'professional' && !c.is_defunct).length;
        const semiProClubs = clubs.filter(c => c.professional_status === 'semi-professional' && !c.is_defunct).length;
        const amateurClubs = clubs.filter(c => c.professional_status === 'amateur' && !c.is_defunct).length;

        // Youth Academies
        const clubsWithAcademies = clubs.filter(c => c.has_youth_academy && !c.is_defunct).length;
        const academyRate = activeClubs > 0 ? ((clubsWithAcademies / activeClubs) * 100).toFixed(1) : 0;

        // League System Growth
        const leaguesByTier = {};
        leagues.forEach(l => {
            if (!leaguesByTier[l.tier]) {
                leaguesByTier[l.tier] = { count: 0, active: 0, inactive: 0 };
            }
            leaguesByTier[l.tier].count++;
            if (l.is_active !== false) {
                leaguesByTier[l.tier].active++;
            } else {
                leaguesByTier[l.tier].inactive++;
            }
        });

        const tierDistribution = Object.entries(leaguesByTier)
            .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
            .map(([tier, data]) => ({
                tier: `Tier ${tier}`,
                leagues: data.count,
                active: data.active,
                inactive: data.inactive
            }));

        // Title Concentration
        const titleWinners = {};
        seasons.forEach(s => {
            if (s.champion_name) {
                const league = leagues.find(l => l.id === s.league_id);
                if (league?.tier === 1) {
                    titleWinners[s.champion_name] = (titleWinners[s.champion_name] || 0) + 1;
                }
            }
        });
        const topChampions = Object.entries(titleWinners)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([name, count]) => ({ name, titles: count }));

        // League System Evolution (by decade)
        const leagueGrowth = {};
        const clubGrowth = {};
        
        seasons.forEach(s => {
            const year = parseInt(s.year.split('-')[0] || s.year);
            if (isNaN(year)) return;
            const decade = Math.floor(year / 10) * 10;
            if (!leagueGrowth[decade]) {
                leagueGrowth[decade] = new Set();
                clubGrowth[decade] = new Set();
            }
            leagueGrowth[decade].add(s.league_id);
        });

        leagueTables.forEach(t => {
            const year = parseInt(t.year.split('-')[0] || t.year);
            if (isNaN(year)) return;
            const decade = Math.floor(year / 10) * 10;
            if (!clubGrowth[decade]) {
                clubGrowth[decade] = new Set();
            }
            if (t.club_id) clubGrowth[decade].add(t.club_id);
        });

        const evolutionData = Object.keys(leagueGrowth)
            .sort()
            .map(decade => ({
                decade: `${decade}s`,
                leagues: leagueGrowth[decade].size,
                clubs: clubGrowth[decade].size
            }));

        // Continental Success
        const vccTitles = clubs.reduce((sum, c) => sum + (c.vcc_titles || 0), 0);
        const cccTitles = clubs.reduce((sum, c) => sum + (c.ccc_titles || 0), 0);
        const vccAppearances = clubs.reduce((sum, c) => sum + (c.vcc_appearances || 0), 0);
        const cccAppearances = clubs.reduce((sum, c) => sum + (c.ccc_appearances || 0), 0);

        // Domestic Cup
        const cupWinners = {};
        domesticCupSeasons.forEach(cs => {
            if (cs.champion_name) {
                cupWinners[cs.champion_name] = (cupWinners[cs.champion_name] || 0) + 1;
            }
        });
        const topCupWinners = Object.entries(cupWinners)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name, titles: count }));

        // Cup winners by tier
        const cupWinnersByTier = {};
        domesticCupSeasons.forEach(cs => {
            if (cs.champion_id) {
                const club = clubs.find(c => c.id === cs.champion_id);
                const league = leagues.find(l => l.id === club?.league_id);
                const tier = league?.tier || 'Unknown';
                cupWinnersByTier[tier] = (cupWinnersByTier[tier] || 0) + 1;
            }
        });

        // Regional dominance
        const titlesByRegion = {};
        seasons.forEach(s => {
            if (s.champion_name) {
                const club = clubs.find(c => c.name === s.champion_name || c.id === s.champion_id);
                if (club?.region) {
                    titlesByRegion[club.region] = (titlesByRegion[club.region] || 0) + 1;
                }
            }
        });
        const regionalData = Object.entries(titlesByRegion)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([region, titles]) => ({ region, titles }));

        // Club longevity
        const clubAges = clubs
            .filter(c => c.founded_year)
            .map(c => new Date().getFullYear() - c.founded_year);
        const avgAge = clubAges.length > 0 ? (clubAges.reduce((a, b) => a + b, 0) / clubAges.length).toFixed(1) : 0;
        const oldestClub = clubs
            .filter(c => c.founded_year)
            .sort((a, b) => a.founded_year - b.founded_year)[0];

        // Player stats
        const totalPlayers = players.length;
        const youthPlayers = players.filter(p => p.is_youth_player).length;
        const avgOVR = players.length > 0 
            ? (players.reduce((sum, p) => sum + (p.overall_rating || 0), 0) / players.length).toFixed(1)
            : 0;

        // Professional status distribution
        const profStatusData = [
            { name: 'Professional', value: professionalClubs, color: '#10b981' },
            { name: 'Semi-Pro', value: semiProClubs, color: '#f59e0b' },
            { name: 'Amateur', value: amateurClubs, color: '#6b7280' }
        ].filter(d => d.value > 0);

        // Defunct clubs by decade
        const defunctByDecade = {};
        clubs.filter(c => c.defunct_year).forEach(c => {
            const decade = Math.floor(c.defunct_year / 10) * 10;
            defunctByDecade[decade] = (defunctByDecade[decade] || 0) + 1;
        });
        const defunctData = Object.keys(defunctByDecade)
            .sort()
            .map(decade => ({
                decade: `${decade}s`,
                defunct: defunctByDecade[decade]
            }));

        return {
            totalClubs,
            activeClubs,
            defunctClubs,
            inactiveClubs,
            defunctRate,
            professionalClubs,
            semiProClubs,
            amateurClubs,
            clubsWithAcademies,
            academyRate,
            tierDistribution,
            topChampions,
            evolutionData,
            vccTitles,
            cccTitles,
            vccAppearances,
            cccAppearances,
            topCupWinners,
            cupWinnersByTier,
            regionalData,
            avgAge,
            oldestClub,
            totalPlayers,
            youthPlayers,
            avgOVR,
            profStatusData,
            defunctData
        };
    }, [nation, leagues, clubs, seasons, leagueTables, domesticCups, domesticCupSeasons, players]);

    if (!analytics) {
        return <div className="text-center py-8 text-slate-500">Loading analytics...</div>;
    }

    return (
        <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <StatsCard icon={Shield} label="Total Clubs" value={analytics.totalClubs} color="blue" />
                <StatsCard icon={Users} label="Active Clubs" value={analytics.activeClubs} color="green" />
                <StatsCard icon={AlertCircle} label="Defunct Rate" value={`${analytics.defunctRate}%`} color="red" />
                <StatsCard icon={Trophy} label="Total Leagues" value={leagues.length} color="purple" />
                <StatsCard icon={Users} label="Players" value={analytics.totalPlayers} color="indigo" />
                <StatsCard icon={Award} label="Youth Players" value={analytics.youthPlayers} color="amber" />
            </div>

            {/* League System Growth */}
            {analytics.evolutionData.length > 0 && (
                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-emerald-600" />
                            League System Evolution
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={analytics.evolutionData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="decade" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="leagues" stroke="#8b5cf6" strokeWidth={2} name="Leagues" />
                                <Line type="monotone" dataKey="clubs" stroke="#10b981" strokeWidth={2} name="Clubs" />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}

            {/* Club Health & Professional Status */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="w-5 h-5 text-blue-600" />
                            Club Status Distribution
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between mb-2">
                                    <span className="text-sm font-medium">Active Clubs</span>
                                    <span className="text-sm font-bold text-green-600">{analytics.activeClubs}</span>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-2">
                                    <div className="bg-green-500 h-2 rounded-full" style={{ width: `${(analytics.activeClubs / analytics.totalClubs) * 100}%` }} />
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between mb-2">
                                    <span className="text-sm font-medium">Defunct Clubs</span>
                                    <span className="text-sm font-bold text-red-600">{analytics.defunctClubs}</span>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-2">
                                    <div className="bg-red-500 h-2 rounded-full" style={{ width: `${(analytics.defunctClubs / analytics.totalClubs) * 100}%` }} />
                                </div>
                            </div>
                            {analytics.inactiveClubs > 0 && (
                                <div>
                                    <div className="flex justify-between mb-2">
                                        <span className="text-sm font-medium">Inactive Clubs</span>
                                        <span className="text-sm font-bold text-amber-600">{analytics.inactiveClubs}</span>
                                    </div>
                                    <div className="w-full bg-slate-200 rounded-full h-2">
                                        <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${(analytics.inactiveClubs / analytics.totalClubs) * 100}%` }} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {analytics.profStatusData.length > 0 && (
                    <Card className="border-0 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Trophy className="w-5 h-5 text-amber-600" />
                                Professional Status
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie
                                        data={analytics.profStatusData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {analytics.profStatusData.map((entry, index) => (
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

            {/* Tier Distribution */}
            {analytics.tierDistribution.length > 0 && (
                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-purple-600" />
                            League Pyramid Structure
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={analytics.tierDistribution}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="tier" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="active" stackId="a" fill="#10b981" name="Active" />
                                <Bar dataKey="inactive" stackId="a" fill="#ef4444" name="Inactive" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}

            {/* Continental Success */}
            {(analytics.vccTitles > 0 || analytics.cccTitles > 0 || analytics.vccAppearances > 0 || analytics.cccAppearances > 0) && (
                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Star className="w-5 h-5 text-purple-600" />
                            Continental Performance
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div className="text-center p-4 bg-purple-50 rounded-lg">
                                <div className="text-3xl font-bold text-purple-600">{analytics.vccTitles}</div>
                                <div className="text-sm text-purple-800 mt-1">VCC Titles</div>
                            </div>
                            <div className="text-center p-4 bg-blue-50 rounded-lg">
                                <div className="text-3xl font-bold text-blue-600">{analytics.cccTitles}</div>
                                <div className="text-sm text-blue-800 mt-1">CCC Titles</div>
                            </div>
                            <div className="text-center p-4 bg-purple-50 rounded-lg">
                                <div className="text-3xl font-bold text-purple-600">{analytics.vccAppearances}</div>
                                <div className="text-sm text-purple-800 mt-1">VCC Appearances</div>
                            </div>
                            <div className="text-center p-4 bg-blue-50 rounded-lg">
                                <div className="text-3xl font-bold text-blue-600">{analytics.cccAppearances}</div>
                                <div className="text-sm text-blue-800 mt-1">CCC Appearances</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Top League Champions & Cup Winners */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {analytics.topChampions.length > 0 && (
                    <Card className="border-0 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Trophy className="w-5 h-5 text-amber-600" />
                                Most League Titles (Top Tier)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {analytics.topChampions.map((club, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                                        <span className="font-medium">{club.name}</span>
                                        <span className="font-bold text-amber-600">{club.titles}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {analytics.topCupWinners.length > 0 && (
                    <Card className="border-0 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Award className="w-5 h-5 text-orange-600" />
                                Most Domestic Cup Titles
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {analytics.topCupWinners.map((club, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                                        <span className="font-medium">{club.name}</span>
                                        <span className="font-bold text-orange-600">{club.titles}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Regional Dominance */}
            {analytics.regionalData.length > 0 && (
                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="w-5 h-5 text-emerald-600" />
                            Regional Success (League Titles)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={analytics.regionalData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" />
                                <YAxis dataKey="region" type="category" width={100} />
                                <Tooltip />
                                <Bar dataKey="titles" fill="#10b981" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}

            {/* Defunct Clubs Timeline */}
            {analytics.defunctData.length > 0 && (
                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-red-600" />
                            Club Closures by Decade
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={analytics.defunctData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="decade" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="defunct" fill="#ef4444" name="Clubs Closed" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}

            {/* Additional Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50">
                    <CardContent className="p-6 text-center">
                        <Calendar className="w-12 h-12 text-blue-600 mx-auto mb-3" />
                        <div className="text-3xl font-bold text-blue-700">{analytics.avgAge}</div>
                        <div className="text-sm text-blue-600 mt-1">Average Club Age (years)</div>
                        {analytics.oldestClub && (
                            <div className="text-xs text-slate-600 mt-2">
                                Oldest: {analytics.oldestClub.name} ({analytics.oldestClub.founded_year})
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-emerald-50">
                    <CardContent className="p-6 text-center">
                        <Users className="w-12 h-12 text-green-600 mx-auto mb-3" />
                        <div className="text-3xl font-bold text-green-700">{analytics.academyRate}%</div>
                        <div className="text-sm text-green-600 mt-1">Clubs with Youth Academies</div>
                        <div className="text-xs text-slate-600 mt-2">
                            {analytics.clubsWithAcademies} of {analytics.activeClubs} active clubs
                        </div>
                    </CardContent>
                </Card>

                {analytics.avgOVR > 0 && (
                    <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-yellow-50">
                        <CardContent className="p-6 text-center">
                            <Star className="w-12 h-12 text-amber-600 mx-auto mb-3" />
                            <div className="text-3xl font-bold text-amber-700">{analytics.avgOVR}</div>
                            <div className="text-sm text-amber-600 mt-1">Average Player Rating</div>
                            <div className="text-xs text-slate-600 mt-2">
                                Across {analytics.totalPlayers} players
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}