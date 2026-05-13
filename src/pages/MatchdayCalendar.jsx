import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Calendar, Globe, Filter, Shield, Trophy, ChevronLeft, ChevronRight, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from '@/components/common/PageHeader';

export default function MatchdayCalendar() {
    const [selectedNation, setSelectedNation] = useState('all');
    const [selectedYear, setSelectedYear] = useState('');
    const [selectedMatchday, setSelectedMatchday] = useState(null);

    const { data: nations = [] } = useQuery({ queryKey: ['nations'], queryFn: () => base44.entities.Nation.list('name') });
    const { data: leagues = [] } = useQuery({ queryKey: ['allLeagues'], queryFn: () => base44.entities.League.list() });
    const { data: matches = [], isLoading } = useQuery({
        queryKey: ['allMatches'],
        queryFn: () => base44.entities.Match.list('-match_date', 500),
    });
    const { data: clubs = [] } = useQuery({ queryKey: ['allClubs'], queryFn: () => base44.entities.Club.list('name') });

    // Get all unique season years
    const years = [...new Set(matches.map(m => m.year).filter(Boolean))].sort().reverse();
    const currentYear = selectedYear || years[0] || '';

    // Filter matches
    const filteredMatches = useMemo(() => {
        return matches.filter(m => {
            if (currentYear && m.year !== currentYear) return false;
            if (selectedNation !== 'all') {
                const league = leagues.find(l => l.id === m.league_id);
                if (!league || league.nation_id !== selectedNation) return false;
            }
            return true;
        });
    }, [matches, currentYear, selectedNation, leagues]);

    // Group by matchday
    const matchdays = useMemo(() => {
        const grouped = {};
        filteredMatches.forEach(m => {
            const key = m.matchday || 0;
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(m);
        });
        return Object.entries(grouped)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([md, ms]) => ({ matchday: Number(md), matches: ms }));
    }, [filteredMatches]);

    const activeMD = selectedMatchday ?? (matchdays.find(md => md.matches.some(m => m.home_score === null))?.matchday ?? matchdays[matchdays.length - 1]?.matchday);
    const activeMatchdayData = matchdays.find(md => md.matchday === activeMD);

    const totalPlayed = filteredMatches.filter(m => m.home_score !== null).length;
    const totalFixtures = filteredMatches.length;
    const totalGoals = filteredMatches.reduce((sum, m) => sum + (m.home_score || 0) + (m.away_score || 0), 0);

    const navigateMD = (dir) => {
        const idx = matchdays.findIndex(md => md.matchday === activeMD);
        const next = matchdays[idx + dir];
        if (next) setSelectedMatchday(next.matchday);
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <PageHeader
                title="Matchday Calendar"
                subtitle="All fixtures and results across Volaria"
                breadcrumbs={[{ label: 'Live', url: createPageUrl('CurrentSeason') }, { label: 'Matchday Calendar' }]}
            >
                <div className="flex items-center gap-3 flex-wrap">
                    <Select value={currentYear} onValueChange={setSelectedYear}>
                        <SelectTrigger className="w-32 bg-white/10 border-white/30 text-white">
                            <SelectValue placeholder="Season" />
                        </SelectTrigger>
                        <SelectContent>
                            {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={selectedNation} onValueChange={setSelectedNation}>
                        <SelectTrigger className="w-40 bg-white/10 border-white/30 text-white">
                            <Globe className="w-4 h-4 mr-2" />
                            <SelectValue placeholder="All Nations" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Nations</SelectItem>
                            {nations.map(n => <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </PageHeader>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Season summary */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                    <Card className="border-0 shadow-sm text-center">
                        <CardContent className="p-4">
                            <div className="text-2xl font-bold">{totalPlayed}</div>
                            <div className="text-xs text-slate-500">Matches Played</div>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm text-center">
                        <CardContent className="p-4">
                            <div className="text-2xl font-bold">{totalFixtures - totalPlayed}</div>
                            <div className="text-xs text-slate-500">Remaining</div>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm text-center">
                        <CardContent className="p-4">
                            <div className="text-2xl font-bold text-emerald-600">{totalGoals}</div>
                            <div className="text-xs text-slate-500">Total Goals</div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Matchday selector sidebar */}
                    <Card className="border-0 shadow-sm lg:col-span-1">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Matchdays</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="max-h-[500px] overflow-y-auto">
                                {matchdays.map(({ matchday, matches: ms }) => {
                                    const played = ms.filter(m => m.home_score !== null).length;
                                    const total = ms.length;
                                    const isActive = matchday === activeMD;
                                    const allPlayed = played === total;
                                    const hasStarted = played > 0;
                                    return (
                                        <button
                                            key={matchday}
                                            onClick={() => setSelectedMatchday(matchday)}
                                            className={`w-full flex items-center justify-between px-4 py-3 border-b last:border-0 transition-colors text-left ${isActive ? 'bg-emerald-50 border-l-4 border-l-emerald-500' : 'hover:bg-slate-50'}`}
                                        >
                                            <span className={`font-semibold text-sm ${isActive ? 'text-emerald-700' : 'text-slate-700'}`}>
                                                {matchday === 0 ? 'Unknown' : `Matchday ${matchday}`}
                                            </span>
                                            <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${allPlayed ? 'bg-emerald-100 text-emerald-700' : hasStarted ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                                                {played}/{total}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Main matchday content */}
                    <div className="lg:col-span-3 space-y-4">
                        {activeMatchdayData ? (
                            <>
                                {/* Matchday header */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Button variant="outline" size="icon" onClick={() => navigateMD(-1)} disabled={matchdays.findIndex(m => m.matchday === activeMD) === 0}>
                                            <ChevronLeft className="w-4 h-4" />
                                        </Button>
                                        <h2 className="text-xl font-bold">
                                            {activeMD === 0 ? 'Unknown Matchday' : `Matchday ${activeMD}`}
                                        </h2>
                                        <Button variant="outline" size="icon" onClick={() => navigateMD(1)} disabled={matchdays.findIndex(m => m.matchday === activeMD) === matchdays.length - 1}>
                                            <ChevronRight className="w-4 h-4" />
                                        </Button>
                                    </div>
                                    <Badge variant="outline">
                                        {activeMatchdayData.matches.filter(m => m.home_score !== null).length}/{activeMatchdayData.matches.length} played
                                    </Badge>
                                </div>

                                {/* Group by league */}
                                {(() => {
                                    const byLeague = {};
                                    activeMatchdayData.matches.forEach(m => {
                                        const lid = m.league_id || 'unknown';
                                        if (!byLeague[lid]) byLeague[lid] = [];
                                        byLeague[lid].push(m);
                                    });

                                    return Object.entries(byLeague).map(([lid, lms]) => {
                                        const league = leagues.find(l => l.id === lid);
                                        const nation = league ? nations.find(n => n.id === league.nation_id) : null;

                                        return (
                                            <Card key={lid} className="border-0 shadow-sm overflow-hidden">
                                                <div className="px-4 py-2 flex items-center gap-2 bg-slate-800">
                                                    {league?.logo_url && <img src={league.logo_url} alt="" className="w-5 h-5 object-contain bg-white rounded p-0.5" />}
                                                    <span className="font-semibold text-white text-sm">{league?.name || 'Unknown League'}</span>
                                                    {nation && <span className="text-slate-400 text-xs">· {nation.name}</span>}
                                                    <Link to={createPageUrl(`LeagueDetail?id=${lid}`)} className="ml-auto text-slate-400 hover:text-white text-xs">View →</Link>
                                                </div>
                                                <CardContent className="p-0">
                                                    {lms.map(m => {
                                                        const hasScore = m.home_score !== null;
                                                        const homeWon = hasScore && m.home_score > m.away_score;
                                                        const awayWon = hasScore && m.away_score > m.home_score;
                                                        const isDraw = hasScore && m.home_score === m.away_score;
                                                        const homeClub = clubs.find(c => c.id === m.home_club_id);
                                                        const awayClub = clubs.find(c => c.id === m.away_club_id);

                                                        return (
                                                            <div key={m.id} className={`flex items-center px-4 py-3 border-b last:border-0 ${!hasScore ? 'bg-slate-50/50' : ''}`}>
                                                                {/* Home */}
                                                                <div className={`flex items-center gap-2 flex-1 justify-end ${homeWon ? 'font-bold' : ''}`}>
                                                                    {homeClub?.logo_url && <img src={homeClub.logo_url} alt="" className="w-6 h-6 object-contain" />}
                                                                    <Link to={homeClub ? createPageUrl(`ClubDetail?id=${homeClub.id}`) : '#'} className="text-sm truncate hover:text-emerald-600 max-w-[120px]">
                                                                        {m.home_club_name}
                                                                    </Link>
                                                                </div>

                                                                {/* Score / VS */}
                                                                <div className="mx-4 text-center shrink-0 w-20">
                                                                    {hasScore ? (
                                                                        <div className={`font-bold px-2 py-1 rounded text-sm ${isDraw ? 'bg-slate-200 text-slate-700' : 'bg-slate-800 text-white'}`}>
                                                                            {m.home_score} – {m.away_score}
                                                                        </div>
                                                                    ) : (
                                                                        <div className="text-slate-300 text-sm font-semibold">vs</div>
                                                                    )}
                                                                    {m.is_derby && <div className="text-xs text-red-500 mt-0.5">Derby</div>}
                                                                </div>

                                                                {/* Away */}
                                                                <div className={`flex items-center gap-2 flex-1 ${awayWon ? 'font-bold' : ''}`}>
                                                                    <Link to={awayClub ? createPageUrl(`ClubDetail?id=${awayClub.id}`) : '#'} className="text-sm truncate hover:text-emerald-600 max-w-[120px]">
                                                                        {m.away_club_name}
                                                                    </Link>
                                                                    {awayClub?.logo_url && <img src={awayClub.logo_url} alt="" className="w-6 h-6 object-contain ml-auto" />}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </CardContent>
                                            </Card>
                                        );
                                    });
                                })()}
                            </>
                        ) : (
                            <Card className="border-dashed border-2 border-slate-300">
                                <CardContent className="flex flex-col items-center justify-center py-16">
                                    <Calendar className="w-16 h-16 text-slate-300 mb-4" />
                                    <h3 className="text-xl font-semibold text-slate-700 mb-2">No Matchday Data</h3>
                                    <p className="text-slate-500 text-center">Generate fixtures for a season to see the matchday calendar</p>
                                    <Link to={createPageUrl('CurrentSeason')} className="mt-4">
                                        <Button variant="outline">Go to Fixture Generator</Button>
                                    </Link>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}