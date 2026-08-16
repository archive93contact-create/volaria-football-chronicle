import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Plus, Trophy, Edit2, Trash2, ChevronRight, Star, Calendar, Crown, Globe2, Target, Repeat2 } from 'lucide-react';
import ContinentalNarratives from '@/components/continental/ContinentalNarratives';
import CupHistoricalStats from '@/components/cups/CupHistoricalStats';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import AdminOnly from '@/components/common/AdminOnly';
import { getEntityTheme } from '@/utils/entityTheme';
import { syncContinentalCompetition } from '@/lib/continentalSync';
import AnalyticsInsightGrid from '@/components/analytics/AnalyticsInsightGrid';
import EntitySectionHeader from '@/components/common/EntitySectionHeader';

export default function CompetitionDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    const compId = urlParams.get('id');
    const queryClient = useQueryClient();
    
    const [isAddSeasonOpen, setIsAddSeasonOpen] = useState(false);
    const [seasonFormData, setSeasonFormData] = useState({
        year: '', champion_id: '', champion_name: '', champion_nation_id: '', champion_nation: '',
        runner_up_id: '', runner_up: '', runner_up_nation_id: '', runner_up_nation: '',
        final_score: '', final_venue: '', top_scorer: '', notes: ''
    });
    const [editingSeason, setEditingSeason] = useState(null);

    const { data: competition } = useQuery({
        queryKey: ['competition', compId],
        queryFn: async () => {
            const comps = await base44.entities.ContinentalCompetition.filter({ id: compId });
            return comps[0];
        },
        enabled: !!compId,
    });

    const { data: seasons = [] } = useQuery({
        queryKey: ['competitionSeasons', compId],
        queryFn: () => base44.entities.ContinentalSeason.filter({ competition_id: compId }, '-year'),
    });

    const { data: nations = [] } = useQuery({
        queryKey: ['nations'],
        queryFn: () => base44.entities.Nation.list('name'),
    });

    const { data: clubs = [] } = useQuery({
        queryKey: ['clubs'],
        queryFn: () => base44.entities.Club.list(),
    });

    const getNationFlag = (nationName) => {
        const nation = nations.find(n => n.name?.toLowerCase() === nationName?.toLowerCase());
        return nation?.flag_url;
    };

    // Get participating nations
    const participatingNations = React.useMemo(() => {
        if (!competition?.participating_nation_ids || competition.participating_nation_ids.length === 0) {
            return nations.filter(n => n.membership === (competition?.tier === 1 ? 'VCC' : 'CCC'));
        }
        return nations.filter(n => competition.participating_nation_ids.includes(n.id));
    }, [competition, nations]);

    // Count titles per nation and club
    const titlesByNation = React.useMemo(() => {
        const counts = {};
        seasons.forEach(s => {
            if (s.champion_nation) {
                counts[s.champion_nation] = (counts[s.champion_nation] || 0) + 1;
            }
        });
        return Object.entries(counts).sort((a, b) => b[1] - a[1]);
    }, [seasons]);

    const titlesByClub = React.useMemo(() => {
        const counts = {};
        seasons.forEach(s => {
            if (s.champion_name) {
                counts[s.champion_name] = {
                    count: (counts[s.champion_name]?.count || 0) + 1,
                    nation: s.champion_nation,
                    years: [...(counts[s.champion_name]?.years || []), s.year]
                };
            }
        });
        return Object.entries(counts).sort((a, b) => b[1].count - a[1].count);
    }, [seasons]);

    const invalidateCompetitionData = () => {
        queryClient.invalidateQueries({ queryKey: ['competitionSeasons', compId] });
        queryClient.invalidateQueries({ queryKey: ['continentalSeasons'] });
        queryClient.invalidateQueries({ queryKey: ['competition', compId] });
        queryClient.invalidateQueries({ queryKey: ['continentalCompetitions'] });
        queryClient.invalidateQueries({ queryKey: ['clubs'] });
        queryClient.invalidateQueries({ queryKey: ['allClubs'] });
    };

    const createSeasonMutation = useMutation({
        mutationFn: async (data) => {
            const created = await base44.entities.ContinentalSeason.create({ ...data, competition_id: compId });
            await syncContinentalCompetition(compId);
            return created;
        },
        onSuccess: () => {
            invalidateCompetitionData();
            setIsAddSeasonOpen(false);
            resetSeasonForm();
        },
    });

    const updateSeasonMutation = useMutation({
        mutationFn: async ({ id, data }) => {
            const updated = await base44.entities.ContinentalSeason.update(id, data);
            await syncContinentalCompetition(compId);
            return updated;
        },
        onSuccess: () => {
            invalidateCompetitionData();
            setEditingSeason(null);
            resetSeasonForm();
        },
    });

    const deleteSeasonMutation = useMutation({
        mutationFn: async (id) => {
            await base44.entities.ContinentalSeason.delete(id);
            await syncContinentalCompetition(compId);
        },
        onSuccess: invalidateCompetitionData,
    });

    const resetSeasonForm = () => {
        setSeasonFormData({
            year: '', champion_id: '', champion_name: '', champion_nation_id: '', champion_nation: '',
            runner_up_id: '', runner_up: '', runner_up_nation_id: '', runner_up_nation: '',
            final_score: '', final_venue: '', top_scorer: '', notes: ''
        });
    };

    const updateSeasonField = (field, value) => {
        setSeasonFormData(prev => ({ ...prev, [field]: value }));
    };

    const openEditSeason = (season) => {
        const champion = clubs.find(c => c.id === season.champion_id) || clubs.find(c => c.name === season.champion_name);
        const runnerUp = clubs.find(c => c.id === season.runner_up_id) || clubs.find(c => c.name === season.runner_up);
        setSeasonFormData({
            ...season,
            champion_id: champion?.id || season.champion_id || '',
            champion_nation_id: champion?.nation_id || season.champion_nation_id || '',
            runner_up_id: runnerUp?.id || season.runner_up_id || '',
            runner_up_nation_id: runnerUp?.nation_id || season.runner_up_nation_id || '',
        });
        setEditingSeason(season);
    };

    const updateFinalist = (role, clubId) => {
        const club = clubs.find(c => c.id === clubId);
        const nation = nations.find(n => n.id === club?.nation_id);
        if (!club) return;
        setSeasonFormData(prev => role === 'champion' ? {
            ...prev,
            champion_id: club.id,
            champion_name: club.name,
            champion_nation_id: nation?.id || club.nation_id || '',
            champion_nation: nation?.name || '',
        } : {
            ...prev,
            runner_up_id: club.id,
            runner_up: club.name,
            runner_up_nation_id: nation?.id || club.nation_id || '',
            runner_up_nation: nation?.name || '',
        });
    };

    const handleSeasonSubmit = () => {
        if (editingSeason) {
            updateSeasonMutation.mutate({ id: editingSeason.id, data: seasonFormData });
        } else {
            createSeasonMutation.mutate(seasonFormData);
        }
    };

    if (!competition) {
        return <div className="min-h-screen bg-[#f5f5f4] flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-slate-700 border-t-transparent rounded-full" /></div>;
    }

    const competitionTheme = getEntityTheme({ primary: competition.primary_color, secondary: competition.secondary_color });
    const participatingNationIds = new Set(participatingNations.map(n => n.id));
    const eligibleClubs = clubs
        .filter(c => !c.is_defunct && !c.is_former_name && (participatingNationIds.size === 0 || participatingNationIds.has(c.nation_id)))
        .sort((a, b) => a.name.localeCompare(b.name));

    const completedSeasons = seasons.filter(s => s.champion_id || s.champion_name);
    const titleLeader = titlesByClub[0];
    const titleConcentration = completedSeasons.length && titleLeader ? (titleLeader[1].count / completedSeasons.length) * 100 : 0;
    const chronologicalWinners = [...completedSeasons]
        .sort((a, b) => String(a.year || '').localeCompare(String(b.year || ''), undefined, { numeric: true }))
        .map(s => s.champion_id || `name:${s.champion_name}`);
    const repeatChampionCount = chronologicalWinners.slice(1).filter((winner, index) => winner === chronologicalWinners[index]).length;
    const repeatChampionRate = chronologicalWinners.length > 1 ? (repeatChampionCount / (chronologicalWinners.length - 1)) * 100 : 0;
    const uniqueWinningNations = new Set(completedSeasons.map(s => s.champion_nation_id || s.champion_nation).filter(Boolean)).size;
    const competitionInsights = [
        { label: 'Title concentration', value: completedSeasons.length ? `${titleConcentration.toFixed(0)}%` : '—', detail: titleLeader ? `${titleLeader[0]} holds ${titleLeader[1].count} of ${completedSeasons.length} recorded titles` : 'No completed editions yet', icon: Crown },
        { label: 'Winning nations', value: uniqueWinningNations || '—', detail: participatingNations.length ? `Across ${participatingNations.length} participating nations` : 'Participant list not set', icon: Globe2 },
        { label: 'Repeat champions', value: chronologicalWinners.length > 1 ? `${repeatChampionRate.toFixed(0)}%` : '—', detail: chronologicalWinners.length > 1 ? `${repeatChampionCount} back-to-back retained titles` : 'More editions needed', icon: Repeat2 },
        { label: 'Winner diversity', value: titlesByClub.length || '—', detail: completedSeasons.length ? `${titlesByClub.length} different champions in ${completedSeasons.length} completed editions` : 'No completed editions yet', icon: Trophy },
        competition.number_of_teams && { label: 'Field size', value: competition.number_of_teams, detail: competition.format || 'Current competition field', icon: Target },
    ].filter(Boolean);

    const seasonFormContent = (
        <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label>Season Year *</Label>
                    <Input value={seasonFormData.year || ''} onChange={(e) => updateSeasonField('year', e.target.value)} placeholder="e.g., 2023-24" className="mt-1" />
                </div>
                <div>
                    <Label>Final Score</Label>
                    <Input value={seasonFormData.final_score || ''} onChange={(e) => updateSeasonField('final_score', e.target.value)} placeholder="e.g., 2-1" className="mt-1" />
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <Label>Champion</Label>
                    <Select value={seasonFormData.champion_id || ''} onValueChange={(v) => updateFinalist('champion', v)}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select winning club" /></SelectTrigger>
                        <SelectContent>
                            {eligibleClubs.map(club => <SelectItem key={club.id} value={club.id}>{club.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label>Champion Nation</Label>
                    <div className="mt-1 h-10 rounded-md border border-slate-200 bg-slate-50 px-3 flex items-center text-sm text-slate-600">{seasonFormData.champion_nation || 'Derived from club'}</div>
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <Label>Runner-up</Label>
                    <Select value={seasonFormData.runner_up_id || ''} onValueChange={(v) => updateFinalist('runner_up', v)}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select runner-up" /></SelectTrigger>
                        <SelectContent>
                            {eligibleClubs.filter(club => club.id !== seasonFormData.champion_id).map(club => <SelectItem key={club.id} value={club.id}>{club.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label>Runner-up Nation</Label>
                    <div className="mt-1 h-10 rounded-md border border-slate-200 bg-slate-50 px-3 flex items-center text-sm text-slate-600">{seasonFormData.runner_up_nation || 'Derived from club'}</div>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label>Final Venue</Label>
                    <Input value={seasonFormData.final_venue || ''} onChange={(e) => updateSeasonField('final_venue', e.target.value)} className="mt-1" />
                </div>
                <div>
                    <Label>Top Scorer</Label>
                    <Input value={seasonFormData.top_scorer || ''} onChange={(e) => updateSeasonField('top_scorer', e.target.value)} placeholder="e.g., John Smith (10 goals)" className="mt-1" />
                </div>
            </div>
            <div>
                <Label>Notes</Label>
                <Textarea value={seasonFormData.notes || ''} onChange={(e) => updateSeasonField('notes', e.target.value)} rows={3} className="mt-1" />
            </div>
            <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => { setIsAddSeasonOpen(false); setEditingSeason(null); resetSeasonForm(); }}>Cancel</Button>
                <Button onClick={handleSeasonSubmit} disabled={!seasonFormData.year} className="text-white" style={{ backgroundColor: competitionTheme.ui }}>
                    {editingSeason ? 'Save Changes' : 'Add Season'}
                </Button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#f5f5f4]">
            <section className="relative overflow-hidden bg-[#090a0b] text-white border-b border-white/10">
                <div className="absolute inset-0" style={{ background: `linear-gradient(108deg, #070809 0%, ${competitionTheme.heroPrimary}e8 52%, ${competitionTheme.heroSecondary}cc 100%)` }} />
                <div className="absolute inset-0 bg-gradient-to-r from-black/45 via-black/10 to-black/35" />
                {competition.logo_url && <img src={competition.logo_url} alt="" aria-hidden="true" className="pointer-events-none absolute -right-16 -bottom-28 sm:right-0 sm:-bottom-36 w-[390px] sm:w-[580px] h-[390px] sm:h-[580px] object-contain opacity-[0.09] grayscale" />}

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-8 sm:pb-10">
                    <nav className="flex items-center gap-2 text-xs sm:text-sm text-white/55 mb-7 flex-wrap">
                        <Link to={createPageUrl('Home')} className="hover:text-white">Volaria</Link>
                        <ChevronRight className="w-3.5 h-3.5" />
                        <Link to={createPageUrl('ContinentalCompetitions')} className="hover:text-white">Continental Competitions</Link>
                        <ChevronRight className="w-3.5 h-3.5" />
                        <span className="text-white">{competition.short_name || competition.name}</span>
                    </nav>

                    <div className="grid grid-cols-1 sm:grid-cols-[170px_minmax(0,1fr)] md:grid-cols-[210px_minmax(0,1fr)] gap-6 sm:gap-8 items-center">
                        <div className="relative w-36 h-36 sm:w-full sm:h-44 md:h-48 flex items-center justify-center">
                            <div className="absolute inset-[10%] rounded-full blur-3xl opacity-45" style={{ backgroundColor: competition.secondary_color || competition.primary_color || '#fff' }} />
                            {competition.logo_url ? <img src={competition.logo_url} alt={`${competition.name} logo`} className="relative z-10 max-w-[108%] max-h-[108%] object-contain drop-shadow-[0_18px_22px_rgba(0,0,0,.52)]" /> : <div className="relative z-10 w-[82%] h-[82%] rounded-full border border-white/15 bg-black/20 flex items-center justify-center">{competition.tier === 1 ? <Star className="w-20 h-20 text-white/35" /> : <Trophy className="w-20 h-20 text-white/35" />}</div>}
                        </div>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                {competition.short_name && <span className="text-[10px] uppercase tracking-[0.16em] font-black px-2 py-1 rounded border border-white/15 bg-white/8">{competition.short_name}</span>}
                                <span className="text-[10px] uppercase tracking-[0.16em] font-semibold text-white/55">{competition.tier === 1 ? 'Premier continental competition' : competition.tier === 2 ? 'Secondary continental competition' : `Continental tier ${competition.tier || '—'}`}</span>
                            </div>
                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-[-0.045em] leading-[0.95] break-words">{competition.name}</h1>
                            {competition.description && <p className="mt-4 text-base sm:text-lg text-white/68 max-w-3xl leading-relaxed">{competition.description}</p>}
                            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/62">
                                {competition.format && <span>{competition.format}</span>}
                                {competition.founded_year && <span>Founded {competition.founded_year}</span>}
                                {competition.current_champion && <span className="flex items-center gap-1.5"><Trophy className="w-4 h-4" /> Current champion: <strong className="text-white">{competition.current_champion}</strong></span>}
                            </div>
                        </div>
                    </div>

                    <div className="mt-7 grid grid-cols-4 sm:grid-cols-5 border border-white/15 rounded-xl overflow-hidden bg-black/20 backdrop-blur-sm">
                        <div className="px-3 sm:px-4 py-3 border-r border-white/10"><div className="text-xl sm:text-2xl font-black">{seasons.length}</div><div className="text-[9px] uppercase tracking-wider text-white/45">Editions</div></div>
                        <div className="px-3 sm:px-4 py-3 border-r border-white/10"><div className="text-xl sm:text-2xl font-black">{participatingNations.length}</div><div className="text-[9px] uppercase tracking-wider text-white/45">Nations</div></div>
                        <div className="px-3 sm:px-4 py-3 border-r border-white/10"><div className="text-xl sm:text-2xl font-black">{titlesByClub.length}</div><div className="text-[9px] uppercase tracking-wider text-white/45">Winners</div></div>
                        <div className="px-3 sm:px-4 py-3 sm:border-r border-white/10"><div className="text-xl sm:text-2xl font-black">{competition.number_of_teams || '—'}</div><div className="text-[9px] uppercase tracking-wider text-white/45">Teams</div></div>
                        <div className="hidden sm:block px-4 py-3"><div className="text-xl sm:text-2xl font-black">{competition.most_titles_count || titleLeader?.[1]?.count || '—'}</div><div className="text-[9px] uppercase tracking-wider text-white/45">Record titles</div></div>
                    </div>

                    {participatingNations.length > 0 && <div className="mt-5 flex flex-wrap gap-2">{participatingNations.slice(0, 22).map(nation => nation.flag_url ? <Link key={nation.id} to={createPageUrl(`NationDetail?id=${nation.id}`)} title={nation.name} className="w-8 h-6 rounded border border-white/15 bg-black/15 p-0.5 flex items-center justify-center hover:border-white/45 transition-colors"><img src={nation.flag_url} alt={`${nation.name} flag`} className="max-w-full max-h-full object-contain" /></Link> : null)}{participatingNations.length > 22 && <span className="text-xs text-white/50 self-center">+{participatingNations.length-22}</span>}</div>}
                </div>
                <div className="h-1.5 flex"><div className="flex-[3]" style={{ backgroundColor: competitionTheme.primary }} /><div className="flex-[2]" style={{ backgroundColor: competitionTheme.secondary }} /></div>
            </section>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Tabs defaultValue="overview" className="space-y-6">
                    <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        <TabsList className="h-12 w-max min-w-full justify-start rounded-none border-b border-slate-200 bg-transparent p-0">
                            <TabsTrigger value="overview" className="h-12 rounded-none border-b-2 border-transparent px-4 text-sm font-semibold text-slate-500 data-[state=active]:border-[var(--competition-accent)] data-[state=active]:bg-transparent data-[state=active]:text-slate-950 data-[state=active]:shadow-none">Overview</TabsTrigger>
                            <TabsTrigger value="history-stats" className="h-12 rounded-none border-b-2 border-transparent px-4 text-sm font-semibold text-slate-500 data-[state=active]:border-[var(--competition-accent)] data-[state=active]:bg-transparent data-[state=active]:text-slate-950 data-[state=active]:shadow-none">History & Stats</TabsTrigger>
                            <TabsTrigger value="winners" className="h-12 rounded-none border-b-2 border-transparent px-4 text-sm font-semibold text-slate-500 data-[state=active]:border-[var(--competition-accent)] data-[state=active]:bg-transparent data-[state=active]:text-slate-950 data-[state=active]:shadow-none">All Winners</TabsTrigger>
                        </TabsList>
                    </div>

                    {/* OVERVIEW TAB */}
                    <TabsContent value="overview">
                {/* Most Recent Final */}
                {seasons.length > 0 && (() => {
                    const latestSeason = seasons[0];
                    return (
                        <Card className="border-0 shadow-lg mb-8 overflow-hidden" style={{ background: `linear-gradient(135deg, ${competition.primary_color || '#1e40af'}15, ${competition.secondary_color || '#fbbf24'}15)` }}>
                            <CardContent className="p-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <Trophy className="w-5 h-5" style={{ color: competition.primary_color || '#1e40af' }} />
                                    <h3 className="font-bold text-lg">Most Recent Final - {latestSeason.year}</h3>
                                </div>
                                <div className="flex flex-col md:flex-row items-center justify-center gap-6">
                                    <div className="text-center flex-1">
                                        <div className="flex items-center justify-center gap-2 mb-2">
                                            {getNationFlag(latestSeason.champion_nation) && (
                                                <img src={getNationFlag(latestSeason.champion_nation)} alt="" className="w-8 h-5 object-cover rounded" />
                                            )}
                                        </div>
                                        {(() => {
                                            const champClub = clubs.find(c => c.name === latestSeason.champion_name);
                                            return champClub ? (
                                                <Link to={createPageUrl(`ClubDetail?id=${champClub.id}`)} className="text-2xl font-bold text-emerald-600 hover:underline">{latestSeason.champion_name}</Link>
                                            ) : (
                                                <div className="text-2xl font-bold text-emerald-600">{latestSeason.champion_name}</div>
                                            );
                                        })()}
                                        <div className="text-sm text-slate-500">{latestSeason.champion_nation}</div>
                                        <div className="mt-2 inline-block px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-semibold">
                                            Champion
                                        </div>
                                    </div>
                                    <div className="text-center px-6">
                                        <div className="text-3xl font-bold text-slate-800">{latestSeason.final_score || 'vs'}</div>
                                        {latestSeason.final_venue && (
                                            <div className="text-sm text-slate-500 mt-1">{latestSeason.final_venue}</div>
                                        )}
                                    </div>
                                    <div className="text-center flex-1">
                                        <div className="flex items-center justify-center gap-2 mb-2">
                                            {getNationFlag(latestSeason.runner_up_nation) && (
                                                <img src={getNationFlag(latestSeason.runner_up_nation)} alt="" className="w-8 h-5 object-cover rounded" />
                                            )}
                                        </div>
                                        {(() => {
                                            const runnerClub = clubs.find(c => c.name === latestSeason.runner_up);
                                            return runnerClub ? (
                                                <Link to={createPageUrl(`ClubDetail?id=${runnerClub.id}`)} className="text-2xl font-bold text-slate-700 hover:underline">{latestSeason.runner_up}</Link>
                                            ) : (
                                                <div className="text-2xl font-bold text-slate-700">{latestSeason.runner_up}</div>
                                            );
                                        })()}
                                        <div className="text-sm text-slate-500">{latestSeason.runner_up_nation}</div>
                                        <div className="mt-2 inline-block px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-sm">
                                            Runner-up
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-4 text-center">
                                    <Link to={createPageUrl(`ContinentalSeasonDetail?id=${latestSeason.id}`)}>
                                        <Button variant="outline" size="sm">View Full Tournament</Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })()}

                {/* Title Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {/* Titles by Nation */}
                    {titlesByNation.length > 0 && (
                        <Card className="border-0 shadow-sm">
                            <CardHeader><CardTitle className="text-lg">Titles by Nation</CardTitle></CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {titlesByNation.slice(0, 10).map(([nationName, count], idx) => {
                                        const nation = nations.find(n => n.name === nationName);
                                        return (
                                            <div key={nationName} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-slate-400 font-bold w-6">{idx + 1}</span>
                                                    {nation?.flag_url && (
                                                        <img src={nation.flag_url} alt="" className="w-6 h-4 object-cover rounded-sm" />
                                                    )}
                                                    <span className="font-medium text-slate-700">{nationName}</span>
                                                </div>
                                                <span className="font-bold text-emerald-600">{count}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Most Successful Clubs */}
                    {titlesByClub.length > 0 && (
                        <Card className="border-0 shadow-sm">
                            <CardHeader><CardTitle className="text-lg">Most Successful Clubs</CardTitle></CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {titlesByClub.slice(0, 10).map(([clubName, data], idx) => {
                                        const club = clubs.find(c => c.name === clubName);
                                        const nation = nations.find(n => n.name === data.nation);
                                        return (
                                            <Link 
                                                key={clubName} 
                                                to={club ? createPageUrl(`ClubDetail?id=${club.id}`) : '#'}
                                                className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-100 transition-colors"
                                            >
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    <span className="text-slate-400 font-bold w-6">{idx + 1}</span>
                                                    {club?.logo_url && (
                                                        <img src={club.logo_url} alt="" className="w-5 h-5 object-contain flex-shrink-0" />
                                                    )}
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="font-medium text-slate-700 hover:text-emerald-600 truncate">{clubName}</span>
                                                        <div className="flex items-center gap-1">
                                                            {nation?.flag_url && (
                                                                <img src={nation.flag_url} alt="" className="w-4 h-3 object-cover rounded-sm" />
                                                            )}
                                                            <span className="text-xs text-slate-500">{data.nation}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <span className="font-bold text-amber-600 ml-2">{data.count}</span>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Narratives - Competition Story */}
                <ContinentalNarratives competition={competition} seasons={seasons} nations={nations} />

                {/* History */}
                {competition.history && (
                    <Card className="border-0 shadow-sm mb-8">
                        <CardHeader><CardTitle>Competition History</CardTitle></CardHeader>
                        <CardContent><p className="text-slate-600 whitespace-pre-line">{competition.history}</p></CardContent>
                    </Card>
                )}
                    </TabsContent>

                    {/* HISTORY & STATS TAB */}
                    <TabsContent value="history-stats">
                        <CupHistoricalStats 
                            seasons={seasons}
                            clubs={clubs}
                            isNational={false}
                        />
                    </TabsContent>

                    {/* ALL WINNERS TAB */}
                    <TabsContent value="winners">
                {/* Winners Table */}
                <Card className="border-0 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Roll of Honour</CardTitle>
                        <AdminOnly>
                            <Dialog open={isAddSeasonOpen} onOpenChange={setIsAddSeasonOpen}>
                                <DialogTrigger asChild>
                                    <Button className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-2" /> Add Season</Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-xl">
                                    <DialogHeader><DialogTitle>Add Season</DialogTitle></DialogHeader>
                                    {seasonFormContent}
                                </DialogContent>
                            </Dialog>
                        </AdminOnly>
                    </CardHeader>
                    <CardContent>
                        {seasons.length === 0 ? (
                            <div className="text-center py-12 text-slate-500">
                                <p className="mb-2">No seasons recorded yet.</p>
                                <p className="text-sm">Add a season above, then click on it to add knockout matches (Round of 32, Quarter-finals, etc.)</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Season</TableHead>
                                        <TableHead>Champion</TableHead>
                                        <TableHead className="hidden md:table-cell">Nation</TableHead>
                                        <TableHead>Runner-up</TableHead>
                                        <TableHead className="hidden md:table-cell">Score</TableHead>
                                        <TableHead className="hidden lg:table-cell">Venue</TableHead>
                                        <TableHead className="w-20"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {seasons.map(season => (
                                        <TableRow key={season.id} className="hover:bg-slate-50">
                                            <TableCell className="font-medium">
                                                <Link to={createPageUrl(`ContinentalSeasonDetail?id=${season.id}`)} className="hover:text-emerald-600 hover:underline">
                                                    {season.year}
                                                </Link>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {getNationFlag(season.champion_nation) && (
                                                        <img src={getNationFlag(season.champion_nation)} alt="" className="w-5 h-3 object-contain" />
                                                    )}
                                                    {(() => {
                                                        const champClub = clubs.find(c => c.name === season.champion_name);
                                                        return champClub ? (
                                                            <Link to={createPageUrl(`ClubDetail?id=${champClub.id}`)} className="font-semibold text-emerald-600 hover:underline">{season.champion_name}</Link>
                                                        ) : (
                                                            <span className="font-semibold text-emerald-600">{season.champion_name}</span>
                                                        );
                                                    })()}
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell text-slate-500">{season.champion_nation}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {getNationFlag(season.runner_up_nation) && (
                                                        <img src={getNationFlag(season.runner_up_nation)} alt="" className="w-5 h-3 object-contain" />
                                                    )}
                                                    {(() => {
                                                        const runnerClub = clubs.find(c => c.name === season.runner_up);
                                                        return runnerClub ? (
                                                            <Link to={createPageUrl(`ClubDetail?id=${runnerClub.id}`)} className="hover:text-emerald-600 hover:underline">{season.runner_up}</Link>
                                                        ) : (
                                                            <span>{season.runner_up}</span>
                                                        );
                                                    })()}
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell">{season.final_score}</TableCell>
                                            <TableCell className="hidden lg:table-cell text-slate-500">{season.final_venue}</TableCell>
                                            <TableCell>
                                                <div className="flex gap-1">
                                                    <Link to={createPageUrl(`ContinentalSeasonDetail?id=${season.id}`)}>
                                                        <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700">Matches</Button>
                                                    </Link>
                                                    <AdminOnly>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditSeason(season)}><Edit2 className="w-3 h-3" /></Button>
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-red-500"><Trash2 className="w-3 h-3" /></Button></AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader><AlertDialogTitle>Delete {season.year}?</AlertDialogTitle></AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                    <AlertDialogAction onClick={() => deleteSeasonMutation.mutate(season.id)} className="bg-red-600">Delete</AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </AdminOnly>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Edit Season Dialog */}
            <Dialog open={!!editingSeason} onOpenChange={(open) => { if (!open) { setEditingSeason(null); resetSeasonForm(); } }}>
                <DialogContent className="max-w-xl">
                    <DialogHeader><DialogTitle>Edit Season</DialogTitle></DialogHeader>
                    {seasonFormContent}
                </DialogContent>
            </Dialog>
        </div>
    );
}