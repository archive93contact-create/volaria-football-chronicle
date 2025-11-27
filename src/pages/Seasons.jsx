import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Trophy, Star, Shield, Globe, ChevronDown, Award, TrendingUp } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from '@/components/common/PageHeader';
import SeasonNarratives from '@/components/seasons/SeasonNarratives';

export default function Seasons() {
    const [selectedYear, setSelectedYear] = useState('');

    const { data: seasons = [] } = useQuery({
        queryKey: ['allSeasons'],
        queryFn: () => base44.entities.Season.list('-year'),
    });

    const { data: continentalSeasons = [] } = useQuery({
        queryKey: ['continentalSeasons'],
        queryFn: () => base44.entities.ContinentalSeason.list('-year'),
    });

    const { data: competitions = [] } = useQuery({
        queryKey: ['competitions'],
        queryFn: () => base44.entities.ContinentalCompetition.list(),
    });

    const { data: leagues = [] } = useQuery({
        queryKey: ['allLeagues'],
        queryFn: () => base44.entities.League.list(),
    });

    const { data: nations = [] } = useQuery({
        queryKey: ['nations'],
        queryFn: () => base44.entities.Nation.list(),
    });

    const { data: coefficients = [] } = useQuery({
        queryKey: ['coefficients'],
        queryFn: () => base44.entities.CountryCoefficient.list('rank'),
    });

    // Get unique years from all seasons
    const allYears = [...new Set([
        ...seasons.map(s => s.year),
        ...continentalSeasons.map(s => s.year)
    ])].filter(Boolean).sort().reverse();

    // Set default year
    if (!selectedYear && allYears.length > 0) {
        setSelectedYear(allYears[0]);
    }

    // Filter data for selected year
    const yearSeasons = seasons.filter(s => s.year === selectedYear);
    const yearContinentalSeasons = continentalSeasons.filter(s => s.year === selectedYear);

    // Get VCC and CCC winners
    const vccComp = competitions.find(c => c.short_name === 'VCC' || c.name?.includes('Champions'));
    const cccComp = competitions.find(c => c.short_name === 'CCC' || c.name?.includes('Challenge') || c.name?.includes('Continental'));
    
    const vccSeason = yearContinentalSeasons.find(s => s.competition_id === vccComp?.id);
    const cccSeason = yearContinentalSeasons.find(s => s.competition_id === cccComp?.id);

    // Group league champions by nation
    const championsByNation = {};
    yearSeasons.forEach(season => {
        const league = leagues.find(l => l.id === season.league_id);
        if (league && season.champion_name) {
            const nation = nations.find(n => n.id === league.nation_id);
            if (nation) {
                if (!championsByNation[nation.id]) {
                    championsByNation[nation.id] = {
                        nation,
                        champions: []
                    };
                }
                championsByNation[nation.id].champions.push({
                    league,
                    champion: season.champion_name,
                    runnerUp: season.runner_up
                });
            }
        }
    });

    // Sort nations by coefficient ranking
    const sortedNations = Object.values(championsByNation).sort((a, b) => {
        const coeffA = coefficients.find(c => c.nation_id === a.nation.id);
        const coeffB = coefficients.find(c => c.nation_id === b.nation.id);
        if (coeffA && coeffB) return (coeffA.rank || 999) - (coeffB.rank || 999);
        if (coeffA) return -1;
        if (coeffB) return 1;
        return a.nation.name.localeCompare(b.nation.name);
    });

    // Count titles per nation for this year
    const nationTitleCounts = {};
    yearSeasons.forEach(season => {
        const league = leagues.find(l => l.id === season.league_id);
        if (league?.tier === 1 && season.champion_name) {
            const nation = nations.find(n => n.id === league.nation_id);
            if (nation) {
                nationTitleCounts[nation.id] = (nationTitleCounts[nation.id] || 0) + 1;
            }
        }
    });

    return (
        <div className="min-h-screen bg-slate-50">
            <PageHeader 
                title="Season Archive"
                subtitle="Continental season summaries and champions"
                breadcrumbs={[{ label: 'Seasons' }]}
            >
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="w-40 bg-white/10 border-white/30 text-white">
                        <SelectValue placeholder="Select Year" />
                    </SelectTrigger>
                    <SelectContent>
                        {allYears.map(year => (
                            <SelectItem key={year} value={year}>{year}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </PageHeader>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {!selectedYear ? (
                    <Card className="border-dashed border-2 border-slate-300">
                        <CardContent className="flex flex-col items-center justify-center py-16">
                            <Trophy className="w-16 h-16 text-slate-300 mb-4" />
                            <h3 className="text-xl font-semibold text-slate-700 mb-2">No Season Data</h3>
                            <p className="text-slate-500">Add seasons to leagues to see summaries here</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-8">
                        {/* Continental Winners */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* VCC Winner */}
                            <Card className="border-0 shadow-lg overflow-hidden">
                                <div className="bg-gradient-to-r from-amber-500 to-yellow-500 p-4">
                                    <div className="flex items-center gap-2 text-white">
                                        <Star className="w-6 h-6" />
                                        <h3 className="font-bold text-lg">Volarian Champions Cup</h3>
                                    </div>
                                </div>
                                <CardContent className="p-6">
                                    {vccSeason ? (
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3">
                                                <Trophy className="w-8 h-8 text-amber-500" />
                                                <div>
                                                    <div className="text-2xl font-bold text-amber-700">{vccSeason.champion_name}</div>
                                                    <div className="text-sm text-slate-500">{vccSeason.champion_nation}</div>
                                                </div>
                                            </div>
                                            {vccSeason.runner_up && (
                                                <div className="flex items-center gap-3 text-slate-600">
                                                    <Award className="w-5 h-5" />
                                                    <span>Runner-up: {vccSeason.runner_up} ({vccSeason.runner_up_nation})</span>
                                                </div>
                                            )}
                                            {vccSeason.final_score && (
                                                <div className="text-sm text-slate-500">Final: {vccSeason.final_score}</div>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-slate-500">No VCC data for {selectedYear}</p>
                                    )}
                                </CardContent>
                            </Card>

                            {/* CCC Winner */}
                            <Card className="border-0 shadow-lg overflow-hidden">
                                <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-4">
                                    <div className="flex items-center gap-2 text-white">
                                        <Shield className="w-6 h-6" />
                                        <h3 className="font-bold text-lg">Continental Challenge Cup</h3>
                                    </div>
                                </div>
                                <CardContent className="p-6">
                                    {cccSeason ? (
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3">
                                                <Trophy className="w-8 h-8 text-blue-500" />
                                                <div>
                                                    <div className="text-2xl font-bold text-blue-700">{cccSeason.champion_name}</div>
                                                    <div className="text-sm text-slate-500">{cccSeason.champion_nation}</div>
                                                </div>
                                            </div>
                                            {cccSeason.runner_up && (
                                                <div className="flex items-center gap-3 text-slate-600">
                                                    <Award className="w-5 h-5" />
                                                    <span>Runner-up: {cccSeason.runner_up} ({cccSeason.runner_up_nation})</span>
                                                </div>
                                            )}
                                            {cccSeason.final_score && (
                                                <div className="text-sm text-slate-500">Final: {cccSeason.final_score}</div>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-slate-500">No CCC data for {selectedYear}</p>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Season Narratives */}
                        <SeasonNarratives 
                            selectedYear={selectedYear}
                            seasons={yearSeasons}
                            continentalSeasons={yearContinentalSeasons}
                            leagues={leagues}
                            nations={nations}
                            allSeasons={seasons}
                            allContinentalSeasons={continentalSeasons}
                        />

                        {/* Season Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <Card className="border-0 shadow-sm">
                                <CardContent className="p-4 text-center">
                                    <Globe className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                                    <div className="text-2xl font-bold">{Object.keys(championsByNation).length}</div>
                                    <div className="text-xs text-slate-500">Nations with Data</div>
                                </CardContent>
                            </Card>
                            <Card className="border-0 shadow-sm">
                                <CardContent className="p-4 text-center">
                                    <Trophy className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                                    <div className="text-2xl font-bold">{yearSeasons.filter(s => s.champion_name).length}</div>
                                    <div className="text-xs text-slate-500">League Champions</div>
                                </CardContent>
                            </Card>
                            <Card className="border-0 shadow-sm">
                                <CardContent className="p-4 text-center">
                                    <Star className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                                    <div className="text-2xl font-bold">{yearContinentalSeasons.length}</div>
                                    <div className="text-xs text-slate-500">Continental Cups</div>
                                </CardContent>
                            </Card>
                            <Card className="border-0 shadow-sm">
                                <CardContent className="p-4 text-center">
                                    <TrendingUp className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                                    <div className="text-2xl font-bold">{yearSeasons.length}</div>
                                    <div className="text-xs text-slate-500">Total Seasons</div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* League Champions by Nation */}
                        <Card className="border-0 shadow-lg">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Trophy className="w-5 h-5 text-amber-500" />
                                    Top Flight Champions - {selectedYear}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                {sortedNations.length === 0 ? (
                                    <p className="text-center py-8 text-slate-500">No league champion data for {selectedYear}</p>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-slate-50">
                                                <TableHead className="w-12">#</TableHead>
                                                <TableHead>Nation</TableHead>
                                                <TableHead>League</TableHead>
                                                <TableHead>Champion</TableHead>
                                                <TableHead className="hidden md:table-cell">Runner-up</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {sortedNations.map(({ nation, champions }, idx) => {
                                                const coeff = coefficients.find(c => c.nation_id === nation.id);
                                                const topFlight = champions.find(c => c.league.tier === 1) || champions[0];
                                                if (!topFlight) return null;
                                                
                                                return (
                                                    <TableRow key={nation.id} className="hover:bg-slate-50">
                                                        <TableCell className="text-slate-400 font-medium">
                                                            {coeff?.rank || idx + 1}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Link 
                                                                to={createPageUrl(`NationDetail?id=${nation.id}`)} 
                                                                className="flex items-center gap-2 hover:text-emerald-600"
                                                            >
                                                                {nation.flag_url && (
                                                                    <img src={nation.flag_url} alt="" className="w-6 h-4 object-cover rounded" />
                                                                )}
                                                                <span className="font-medium">{nation.name}</span>
                                                                {nation.membership && (
                                                                    <Badge className={`text-xs ${nation.membership === 'VCC' ? 'bg-amber-500' : 'bg-blue-500'}`}>
                                                                        {nation.membership}
                                                                    </Badge>
                                                                )}
                                                            </Link>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Link 
                                                                to={createPageUrl(`LeagueDetail?id=${topFlight.league.id}`)} 
                                                                className="text-slate-600 hover:text-emerald-600"
                                                            >
                                                                {topFlight.league.name}
                                                            </Link>
                                                        </TableCell>
                                                        <TableCell>
                                                            <span className="flex items-center gap-2 font-semibold text-emerald-700">
                                                                <Trophy className="w-4 h-4 text-amber-500" />
                                                                {topFlight.champion}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="hidden md:table-cell text-slate-500">
                                                            {topFlight.runnerUp || '-'}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}