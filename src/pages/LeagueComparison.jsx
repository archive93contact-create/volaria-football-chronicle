import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import { Trophy, Shield, Users, Calendar, Target, BarChart3, ArrowLeftRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from '@/components/common/PageHeader';

export default function LeagueComparison() {
    const [league1Id, setLeague1Id] = useState('');
    const [league2Id, setLeague2Id] = useState('');

    const { data: leagues = [] } = useQuery({
        queryKey: ['leagues'],
        queryFn: () => base44.entities.League.list('name'),
    });

    const { data: nations = [] } = useQuery({
        queryKey: ['nations'],
        queryFn: () => base44.entities.Nation.list(),
    });

    const { data: clubs = [] } = useQuery({
        queryKey: ['clubs'],
        queryFn: () => base44.entities.Club.list(),
    });

    const { data: seasons = [] } = useQuery({
        queryKey: ['seasons'],
        queryFn: () => base44.entities.Season.list(),
    });

    const { data: leagueTables = [] } = useQuery({
        queryKey: ['leagueTables'],
        queryFn: () => base44.entities.LeagueTable.list(),
    });

    const compareStats = useMemo(() => {
        if (!league1Id || !league2Id) return null;

        const getLeagueStats = (leagueId) => {
            const league = leagues.find(l => l.id === leagueId);
            if (!league) return null;

            const nation = nations.find(n => n.id === league.nation_id);
            const leagueClubs = clubs.filter(c => c.league_id === leagueId);
            const leagueSeasons = seasons.filter(s => s.league_id === leagueId);
            const tables = leagueTables.filter(t => t.league_id === leagueId);

            // Unique champions
            const champions = [...new Set(leagueSeasons.map(s => s.champion_name).filter(Boolean))];
            
            // Competitiveness
            const competitiveness = leagueSeasons.length > 0 
                ? Math.round((champions.length / leagueSeasons.length) * 100)
                : 0;

            // Continental success from clubs
            const vccTitles = leagueClubs.reduce((sum, c) => sum + (c.vcc_titles || 0), 0);
            const cccTitles = leagueClubs.reduce((sum, c) => sum + (c.ccc_titles || 0), 0);

            // Average goals per season
            const avgGoals = tables.length > 0
                ? Math.round(tables.reduce((sum, t) => sum + (t.goals_for || 0), 0) / tables.length)
                : 0;

            // Total stadium capacity
            const totalCapacity = leagueClubs.reduce((sum, c) => sum + (c.stadium_capacity || 0), 0);

            return {
                league,
                nation,
                clubCount: leagueClubs.length,
                seasonCount: leagueSeasons.length,
                uniqueChampions: champions.length,
                competitiveness,
                vccTitles,
                cccTitles,
                avgGoals,
                totalCapacity,
                founded: league.founded_year,
                tier: league.tier || 1
            };
        };

        return {
            league1: getLeagueStats(league1Id),
            league2: getLeagueStats(league2Id)
        };
    }, [league1Id, league2Id, leagues, nations, clubs, seasons, leagueTables]);

    const renderComparison = (label, val1, val2, icon, higherBetter = true) => {
        const better1 = higherBetter ? val1 > val2 : val1 < val2;
        const better2 = higherBetter ? val2 > val1 : val2 < val1;
        
        return (
            <div className="grid grid-cols-3 gap-4 py-3 border-b border-slate-100">
                <div className={`text-right text-lg font-bold ${better1 ? 'text-emerald-600' : 'text-slate-700'}`}>
                    {val1}
                </div>
                <div className="text-center flex items-center justify-center gap-2 text-slate-500">
                    {icon}
                    <span className="text-sm">{label}</span>
                </div>
                <div className={`text-left text-lg font-bold ${better2 ? 'text-emerald-600' : 'text-slate-700'}`}>
                    {val2}
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <PageHeader 
                title="League Comparison"
                subtitle="Compare two leagues side by side"
                breadcrumbs={[
                    { label: 'Nations', url: createPageUrl('Nations') },
                    { label: 'League Comparison' }
                ]}
            />

            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* League Selectors */}
                <Card className="border-0 shadow-sm mb-8">
                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                            <Select value={league1Id} onValueChange={setLeague1Id}>
                                <SelectTrigger className="h-12">
                                    <SelectValue placeholder="Select first league" />
                                </SelectTrigger>
                                <SelectContent>
                                    {leagues.map(league => {
                                        const nation = nations.find(n => n.id === league.nation_id);
                                        return (
                                            <SelectItem key={league.id} value={league.id}>
                                                {league.name} {nation ? `(${nation.name})` : ''}
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>

                            <div className="flex justify-center">
                                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                                    <ArrowLeftRight className="w-6 h-6 text-slate-400" />
                                </div>
                            </div>

                            <Select value={league2Id} onValueChange={setLeague2Id}>
                                <SelectTrigger className="h-12">
                                    <SelectValue placeholder="Select second league" />
                                </SelectTrigger>
                                <SelectContent>
                                    {leagues.map(league => {
                                        const nation = nations.find(n => n.id === league.nation_id);
                                        return (
                                            <SelectItem key={league.id} value={league.id}>
                                                {league.name} {nation ? `(${nation.name})` : ''}
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* Comparison Results */}
                {compareStats?.league1 && compareStats?.league2 && (
                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-6">
                            {/* Headers */}
                            <div className="grid grid-cols-3 gap-4 mb-6 pb-4 border-b-2 border-slate-200">
                                <div className="text-right">
                                    <Link to={createPageUrl(`LeagueDetail?id=${league1Id}`)} className="hover:text-emerald-600">
                                        <h3 className="text-xl font-bold">{compareStats.league1.league.name}</h3>
                                        <p className="text-sm text-slate-500">{compareStats.league1.nation?.name}</p>
                                    </Link>
                                </div>
                                <div className="text-center">
                                    <BarChart3 className="w-8 h-8 text-slate-300 mx-auto" />
                                </div>
                                <div className="text-left">
                                    <Link to={createPageUrl(`LeagueDetail?id=${league2Id}`)} className="hover:text-emerald-600">
                                        <h3 className="text-xl font-bold">{compareStats.league2.league.name}</h3>
                                        <p className="text-sm text-slate-500">{compareStats.league2.nation?.name}</p>
                                    </Link>
                                </div>
                            </div>

                            {/* Stats */}
                            {renderComparison('Clubs', compareStats.league1.clubCount, compareStats.league2.clubCount, <Shield className="w-4 h-4" />)}
                            {renderComparison('Seasons Played', compareStats.league1.seasonCount, compareStats.league2.seasonCount, <Calendar className="w-4 h-4" />)}
                            {renderComparison('Different Champions', compareStats.league1.uniqueChampions, compareStats.league2.uniqueChampions, <Trophy className="w-4 h-4" />)}
                            {renderComparison('Competitiveness %', compareStats.league1.competitiveness, compareStats.league2.competitiveness, <Target className="w-4 h-4" />)}
                            {renderComparison('VCC Titles', compareStats.league1.vccTitles, compareStats.league2.vccTitles, <Trophy className="w-4 h-4" />)}
                            {renderComparison('CCC Titles', compareStats.league1.cccTitles, compareStats.league2.cccTitles, <Trophy className="w-4 h-4" />)}
                            {renderComparison('Total Capacity', compareStats.league1.totalCapacity.toLocaleString(), compareStats.league2.totalCapacity.toLocaleString(), <Users className="w-4 h-4" />)}
                            {renderComparison('Founded', compareStats.league1.founded || '—', compareStats.league2.founded || '—', <Calendar className="w-4 h-4" />, false)}
                        </CardContent>
                    </Card>
                )}

                {!league1Id || !league2Id && (
                    <div className="text-center py-16 text-slate-500">
                        <BarChart3 className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                        <p>Select two leagues above to compare them</p>
                    </div>
                )}
            </div>
        </div>
    );
}