import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Trophy, Star, Shield, Globe, Zap, ChevronRight, Calendar, Activity } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from '@/components/common/PageHeader';
import LiveLeagueTable from '@/components/currentseason/LiveLeagueTable';
import FixtureGenerator from '@/components/currentseason/FixtureGenerator';
import LatestResults from '@/components/currentseason/LatestResults';
import ContinentalSection from '@/components/currentseason/ContinentalSection';

export default function CurrentSeason() {
    const [selectedNation, setSelectedNation] = useState('all');
    const [activeTab, setActiveTab] = useState('tables');

    const { data: nations = [] } = useQuery({
        queryKey: ['nations'],
        queryFn: () => base44.entities.Nation.list('name'),
    });

    const { data: leagues = [] } = useQuery({
        queryKey: ['allLeagues'],
        queryFn: () => base44.entities.League.list(),
    });

    const { data: seasons = [] } = useQuery({
        queryKey: ['allSeasons'],
        queryFn: () => base44.entities.Season.list('-year'),
    });

    const { data: matches = [] } = useQuery({
        queryKey: ['allMatches'],
        queryFn: () => base44.entities.Match.list('-match_date', 200),
    });

    const { data: leagueTables = [] } = useQuery({
        queryKey: ['allLeagueTables'],
        queryFn: () => base44.entities.LeagueTable.list(),
    });

    const { data: clubs = [] } = useQuery({
        queryKey: ['allClubs'],
        queryFn: () => base44.entities.Club.list('name'),
    });

    const { data: competitions = [] } = useQuery({
        queryKey: ['competitions'],
        queryFn: () => base44.entities.ContinentalCompetition.list(),
    });

    const { data: continentalSeasons = [] } = useQuery({
        queryKey: ['continentalSeasons'],
        queryFn: () => base44.entities.ContinentalSeason.list('-year'),
    });

    const { data: continentalMatches = [] } = useQuery({
        queryKey: ['continentalMatches'],
        queryFn: () => base44.entities.ContinentalMatch.list(),
    });

    // Find the most recent year across all seasons
    const allYears = [...new Set(seasons.map(s => s.year))].sort().reverse();
    const currentYear = allYears[0] || '';

    // Get top-flight leagues (tier 1), filtered by nation
    const tier1Leagues = useMemo(() => {
        return leagues.filter(l => l.tier === 1 && (selectedNation === 'all' || l.nation_id === selectedNation));
    }, [leagues, selectedNation]);

    // Get recent matches (last 20 across all leagues)
    const recentMatches = useMemo(() => {
        return matches
            .filter(m => m.home_score !== null && m.home_score !== undefined)
            .slice(0, 30);
    }, [matches]);

    // Stats summary
    const totalLeagues = tier1Leagues.length;
    const totalMatches = matches.filter(m => m.home_score !== null).length;
    const vccComp = competitions.find(c => c.short_name === 'VCC' || c.name?.toLowerCase().includes('champions'));
    const cccComp = competitions.find(c => c.short_name === 'CCC' || c.name?.toLowerCase().includes('challenge') || c.name?.toLowerCase().includes('continental'));

    return (
        <div className="min-h-screen bg-slate-50">
            <PageHeader
                title="Current Season"
                subtitle={`Live tables, results & fixtures from across Volaria${currentYear ? ` — ${currentYear}` : ''}`}
                breadcrumbs={[{ label: 'Current Season' }]}
            >
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 rounded-full border border-green-400/30">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        <span className="text-white text-sm font-medium">Live</span>
                    </div>
                    <Select value={selectedNation} onValueChange={setSelectedNation}>
                        <SelectTrigger className="w-44 bg-white/10 border-white/30 text-white">
                            <Globe className="w-4 h-4 mr-2" />
                            <SelectValue placeholder="All Nations" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Nations</SelectItem>
                            {nations.map(n => (
                                <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </PageHeader>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <Card className="border-0 shadow-sm bg-white">
                        <CardContent className="p-4 text-center">
                            <Globe className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                            <div className="text-2xl font-bold">{nations.length}</div>
                            <div className="text-xs text-slate-500">Nations</div>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm bg-white">
                        <CardContent className="p-4 text-center">
                            <Trophy className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                            <div className="text-2xl font-bold">{tier1Leagues.length}</div>
                            <div className="text-xs text-slate-500">Top Divisions</div>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm bg-white">
                        <CardContent className="p-4 text-center">
                            <Activity className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                            <div className="text-2xl font-bold">{totalMatches}</div>
                            <div className="text-xs text-slate-500">Matches Played</div>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm bg-white">
                        <CardContent className="p-4 text-center">
                            <Star className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                            <div className="text-2xl font-bold">{currentYear || '—'}</div>
                            <div className="text-xs text-slate-500">Current Season</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Continental Competitions Banner */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <ContinentalSection
                        competition={vccComp}
                        continentalSeasons={continentalSeasons}
                        continentalMatches={continentalMatches}
                        color="amber"
                        currentYear={currentYear}
                    />
                    <ContinentalSection
                        competition={cccComp}
                        continentalSeasons={continentalSeasons}
                        continentalMatches={continentalMatches}
                        color="blue"
                        currentYear={currentYear}
                    />
                </div>

                {/* Main Content Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="mb-6">
                        <TabsTrigger value="tables">
                            <Trophy className="w-4 h-4 mr-2" /> League Tables
                        </TabsTrigger>
                        <TabsTrigger value="results">
                            <Activity className="w-4 h-4 mr-2" /> Latest Results
                        </TabsTrigger>
                        <TabsTrigger value="fixtures">
                            <Calendar className="w-4 h-4 mr-2" /> Fixture Generator
                        </TabsTrigger>
                    </TabsList>

                    {/* LEAGUE TABLES */}
                    <TabsContent value="tables">
                        {tier1Leagues.length === 0 ? (
                            <Card className="border-dashed border-2 border-slate-300">
                                <CardContent className="flex flex-col items-center justify-center py-16">
                                    <Trophy className="w-16 h-16 text-slate-300 mb-4" />
                                    <h3 className="text-xl font-semibold text-slate-700 mb-2">No League Data Yet</h3>
                                    <p className="text-slate-500">Add seasons and league tables to see them here</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-6">
                                {tier1Leagues.map(league => {
                                    const nation = nations.find(n => n.id === league.nation_id);
                                    const leagueSeasons = seasons.filter(s => s.league_id === league.id);
                                    const latestSeason = leagueSeasons[0];
                                    const tableSeason = latestSeason?.year;
                                    const tableEntries = leagueTables
                                        .filter(t => t.league_id === league.id && t.year === tableSeason)
                                        .sort((a, b) => a.position - b.position);

                                    if (tableEntries.length === 0) return null;

                                    return (
                                        <LiveLeagueTable
                                            key={league.id}
                                            league={league}
                                            nation={nation}
                                            season={latestSeason}
                                            tableEntries={tableEntries}
                                            clubs={clubs}
                                            matches={matches.filter(m => m.league_id === league.id && m.year === tableSeason)}
                                        />
                                    );
                                })}
                            </div>
                        )}
                    </TabsContent>

                    {/* LATEST RESULTS */}
                    <TabsContent value="results">
                        <LatestResults
                            matches={recentMatches}
                            leagues={leagues}
                            nations={nations}
                            clubs={clubs}
                            selectedNation={selectedNation}
                        />
                    </TabsContent>

                    {/* FIXTURE GENERATOR */}
                    <TabsContent value="fixtures">
                        <FixtureGenerator
                            leagues={leagues}
                            seasons={seasons}
                            clubs={clubs}
                            nations={nations}
                            matches={matches}
                            selectedNation={selectedNation}
                        />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}