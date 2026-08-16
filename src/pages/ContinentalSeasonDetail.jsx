import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Plus, Trophy, ChevronRight, Star, Edit2, Trash2, Loader2, RefreshCw, Settings, Shield } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AddMatchDialog from '@/components/continental/AddMatchDialog';
import EnhancedBracketView from '@/components/continental/EnhancedBracketView';
import SeasonStats from '@/components/continental/SeasonStats';
import SeasonNarratives from '@/components/continental/SeasonNarratives';
import ParticipantsList from '@/components/continental/ParticipantsList';
import AdminOnly from '@/components/common/AdminOnly';
import { getEntityTheme } from '@/utils/entityTheme';
import { syncContinentalCompetition } from '@/lib/continentalSync';

const ROUND_ORDER = ['Group Stage', 'Round of 32', 'Round of 16', 'Quarter-final', 'Semi-final', 'Final'];

export default function ContinentalSeasonDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    const seasonId = urlParams.get('id');
    const queryClient = useQueryClient();
    
    const [isAddMatchOpen, setIsAddMatchOpen] = useState(false);
    const [editingMatch, setEditingMatch] = useState(null);
    const [isEditRoundsOpen, setIsEditRoundsOpen] = useState(false);
    const [roundNames, setRoundNames] = useState({});

    const { data: season } = useQuery({
        queryKey: ['continentalSeason', seasonId],
        queryFn: async () => {
            const seasons = await base44.entities.ContinentalSeason.filter({ id: seasonId });
            return seasons[0];
        },
        enabled: !!seasonId,
    });

    const { data: competition } = useQuery({
        queryKey: ['competition', season?.competition_id],
        queryFn: async () => {
            const comps = await base44.entities.ContinentalCompetition.filter({ id: season.competition_id });
            return comps[0];
        },
        enabled: !!season?.competition_id,
    });

    const { data: matches = [] } = useQuery({
        queryKey: ['continentalMatches', seasonId],
        queryFn: () => base44.entities.ContinentalMatch.filter({ season_id: seasonId }),
        enabled: !!seasonId,
    });

    const { data: nations = [] } = useQuery({
        queryKey: ['nations'],
        queryFn: () => base44.entities.Nation.list('name'),
    });

    const { data: clubs = [] } = useQuery({
        queryKey: ['allClubs'],
        queryFn: () => base44.entities.Club.list('name'),
    });

    const { data: allMatches = [] } = useQuery({
        queryKey: ['allContinentalMatches'],
        queryFn: () => base44.entities.ContinentalMatch.list(),
    });

    const { data: allSeasons = [] } = useQuery({
        queryKey: ['allContinentalSeasons'],
        queryFn: () => base44.entities.ContinentalSeason.list(),
    });

    const deleteMatchMutation = useMutation({
        mutationFn: async (id) => {
            await base44.entities.ContinentalMatch.delete(id);
            if (season?.competition_id) await syncContinentalCompetition(season.competition_id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['continentalMatches', seasonId] });
            queryClient.invalidateQueries({ queryKey: ['continentalSeason', seasonId] });
            queryClient.invalidateQueries({ queryKey: ['continentalSeasons'] });
            queryClient.invalidateQueries({ queryKey: ['clubs'] });
            queryClient.invalidateQueries({ queryKey: ['allClubs'] });
        },
    });

    const updateCompetitionMutation = useMutation({
        mutationFn: (data) => base44.entities.ContinentalCompetition.update(competition.id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['competition', season?.competition_id]);
            setIsEditRoundsOpen(false);
        },
    });

    const openEditRounds = () => {
        setRoundNames(competition?.round_names || {});
        setIsEditRoundsOpen(true);
    };

    const saveRoundNames = () => {
        // Filter out empty values
        const cleanedRoundNames = Object.fromEntries(
            Object.entries(roundNames).filter(([_, v]) => v && v.trim())
        );
        updateCompetitionMutation.mutate({ round_names: cleanedRoundNames });
    };

    if (!season || !competition) {
        return <div className="min-h-screen bg-[#f5f5f4] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-700" /></div>;
    }

    const competitionTheme = getEntityTheme({ primary: competition.primary_color, secondary: competition.secondary_color });
    const resolveClub = (id, name) => clubs.find(c => c.id === id) || clubs.find(c => c.name === name);
    const championClub = resolveClub(season.champion_id, season.champion_name);
    const runnerClub = resolveClub(season.runner_up_id, season.runner_up);
    const championNation = nations.find(n => n.id === season.champion_nation_id) || nations.find(n => n.name?.toLowerCase() === season.champion_nation?.toLowerCase());
    const runnerNation = nations.find(n => n.id === season.runner_up_nation_id) || nations.find(n => n.name?.toLowerCase() === season.runner_up_nation?.toLowerCase());
    const participantMap = new Map();
    matches.forEach(match => {
        const home = resolveClub(match.home_club_id, match.home_club_name);
        const away = resolveClub(match.away_club_id, match.away_club_name);
        if (home) participantMap.set(home.id, { ...home, nation: match.home_club_nation, isChampion: home.id === championClub?.id });
        if (away) participantMap.set(away.id, { ...away, nation: match.away_club_nation, isChampion: away.id === championClub?.id });
    });
    const participantClubs = [...participantMap.values()].sort((a, b) => {
        if (a.isChampion !== b.isChampion) return a.isChampion ? -1 : 1;
        return a.name.localeCompare(b.name);
    });

    // Group matches by round
    const matchesByRound = matches.reduce((acc, match) => {
        if (!acc[match.round]) acc[match.round] = [];
        acc[match.round].push(match);
        return acc;
    }, {});

    // Sort rounds
    const sortedRounds = Object.keys(matchesByRound).sort((a, b) => {
        const idxA = ROUND_ORDER.indexOf(a);
        const idxB = ROUND_ORDER.indexOf(b);
        return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
    });

    const getNationFlag = (nationName) => {
        const nation = nations.find(n => n.name.toLowerCase() === nationName?.toLowerCase());
        return nation?.flag_url;
    };

    return (
        <div className="min-h-screen bg-[#f5f5f4]" style={{ '--competition-accent': competitionTheme.ui }}>
            <section className="relative overflow-hidden bg-[#090a0b] text-white border-b border-white/10">
                <div className="absolute inset-0" style={{ background: `linear-gradient(108deg, #070809 0%, ${competitionTheme.heroPrimary}e8 52%, ${competitionTheme.heroSecondary}cc 100%)` }} />
                <div className="absolute inset-0 bg-gradient-to-r from-black/45 via-black/10 to-black/35" />
                {competition.logo_url && <img src={competition.logo_url} alt="" aria-hidden="true" className="pointer-events-none absolute -right-12 -bottom-28 w-[380px] sm:w-[520px] h-[380px] sm:h-[520px] object-contain opacity-[0.08] grayscale" />}

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-8 sm:pb-10">
                    <nav className="flex items-center gap-2 text-xs sm:text-sm text-white/55 mb-7 flex-wrap">
                        <Link to={createPageUrl('Home')} className="hover:text-white">Volaria</Link>
                        <ChevronRight className="w-3.5 h-3.5" />
                        <Link to={createPageUrl('ContinentalCompetitions')} className="hover:text-white">Continental Competitions</Link>
                        <ChevronRight className="w-3.5 h-3.5" />
                        <Link to={createPageUrl(`CompetitionDetail?id=${competition.id}`)} className="hover:text-white">{competition.short_name || competition.name}</Link>
                        <ChevronRight className="w-3.5 h-3.5" />
                        <span className="text-white">{season.year}</span>
                    </nav>

                    <div className="grid grid-cols-1 sm:grid-cols-[150px_minmax(0,1fr)] md:grid-cols-[180px_minmax(0,1fr)] gap-6 sm:gap-8 items-center">
                        <div className="relative w-32 h-32 sm:w-full sm:h-40 flex items-center justify-center">
                            <div className="absolute inset-[10%] rounded-full blur-3xl opacity-45" style={{ backgroundColor: competition.secondary_color || competition.primary_color || '#fff' }} />
                            {competition.logo_url ? <img src={competition.logo_url} alt={`${competition.name} logo`} className="relative z-10 max-w-full max-h-full object-contain drop-shadow-[0_18px_22px_rgba(0,0,0,.52)]" /> : <Trophy className="relative z-10 w-16 h-16 text-white/35" />}
                        </div>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2"><span className="text-[10px] uppercase tracking-[0.16em] font-black px-2 py-1 rounded border border-white/15 bg-white/8">{competition.short_name || 'Continental'}</span><span className="text-[10px] uppercase tracking-[0.16em] font-semibold text-white/55">{season.year} edition</span></div>
                            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-[-0.04em] leading-[0.98]">{competition.name} <span className="text-white/55">{season.year}</span></h1>
                            {season.champion_name && <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/70"><Trophy className="w-4 h-4" style={{ color: competitionTheme.secondary }} /><span>Champion</span>{championClub?.logo_url && <img src={championClub.logo_url} alt="" className="w-7 h-7 object-contain" />}<Link to={championClub ? createPageUrl(`ClubDetail?id=${championClub.id}`) : '#'} className="font-black text-white hover:underline">{championClub?.name || season.champion_name}</Link>{championNation?.flag_url && <img src={championNation.flag_url} alt="" className="w-6 h-4 object-contain" />}</div>}
                        </div>
                    </div>

                    <div className="mt-7 grid grid-cols-4 border border-white/15 rounded-xl overflow-hidden bg-black/20 backdrop-blur-sm max-w-3xl">
                        <div className="px-3 sm:px-4 py-3 border-r border-white/10"><div className="text-xl sm:text-2xl font-black">{participantClubs.length}</div><div className="text-[9px] uppercase tracking-wider text-white/45">Clubs</div></div>
                        <div className="px-3 sm:px-4 py-3 border-r border-white/10"><div className="text-xl sm:text-2xl font-black">{matches.length}</div><div className="text-[9px] uppercase tracking-wider text-white/45">Matches</div></div>
                        <div className="px-3 sm:px-4 py-3 border-r border-white/10"><div className="text-xl sm:text-2xl font-black">{sortedRounds.length}</div><div className="text-[9px] uppercase tracking-wider text-white/45">Rounds</div></div>
                        <div className="px-3 sm:px-4 py-3"><div className="text-base sm:text-xl font-black truncate">{season.final_score || '—'}</div><div className="text-[9px] uppercase tracking-wider text-white/45">Final score</div></div>
                    </div>

                    {participantClubs.length > 0 && <div className="mt-5 hidden sm:flex flex-wrap gap-2 items-center">{participantClubs.slice(0,20).map(club => <Link key={club.id} to={createPageUrl(`ClubDetail?id=${club.id}`)} title={club.name} className={`relative w-9 h-9 rounded-lg border flex items-center justify-center p-1 transition-colors ${club.isChampion ? 'border-white/50 bg-white/12' : 'border-white/12 bg-black/12 hover:border-white/35'}`}>{club.logo_url ? <img src={club.logo_url} alt="" className="max-w-full max-h-full object-contain" /> : <Shield className="w-5 h-5 text-white/35" />}{club.isChampion && <Trophy className="absolute -top-1.5 -right-1.5 w-4 h-4" style={{ color: competitionTheme.secondary }} />}</Link>)}</div>}
                    <AdminOnly><div className="mt-5"><Button variant="outline" size="sm" className="border-white/20 bg-black/15 text-white hover:bg-white/10 hover:text-white" onClick={openEditRounds}><Settings className="w-4 h-4 mr-2" /> Edit round names</Button></div></AdminOnly>
                </div>
                <div className="h-1.5 flex"><div className="flex-[3]" style={{ backgroundColor: competitionTheme.primary }} /><div className="flex-[2]" style={{ backgroundColor: competitionTheme.secondary }} /></div>
            </section>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">


                {/* Season Narratives */}
                <SeasonNarratives 
                    matches={matches}
                    season={season}
                    allMatches={allMatches}
                    allSeasons={allSeasons}
                    clubs={clubs}
                />

                {/* Final Info */}
                {season.champion_name && (
                    <Card className="relative overflow-hidden border shadow-sm mb-8" style={{ borderColor: competitionTheme.border, background: `radial-gradient(circle at 0% 0%, ${competitionTheme.tintStrong} 0%, transparent 46%), linear-gradient(135deg, ${competitionTheme.tint} 0%, #fff 40%)` }}>
                        {competition.logo_url && <img src={competition.logo_url} alt="" aria-hidden="true" className="pointer-events-none absolute -right-10 -bottom-20 w-56 h-56 object-contain opacity-[0.035] grayscale" />}
                        <div className="h-[3px]" style={{ background: `linear-gradient(90deg, ${competitionTheme.ui}, ${competitionTheme.accent}, transparent 82%)` }} />
                        <CardContent className="relative p-5 sm:p-7">
                            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 sm:gap-8">
                                <div className="text-center min-w-0">
                                    {championClub?.logo_url && <img src={championClub.logo_url} alt={`${championClub.name} crest`} className="w-16 h-16 sm:w-20 sm:h-20 object-contain mx-auto mb-3" />}
                                    <div className="text-[10px] uppercase tracking-wider font-black text-slate-400 mb-1">Champion</div>
                                    {championClub ? <Link to={createPageUrl(`ClubDetail?id=${championClub.id}`)} className="text-lg sm:text-2xl font-black text-slate-950 hover:underline block truncate">{championClub.name}</Link> : <div className="text-lg sm:text-2xl font-black text-slate-950 truncate">{season.champion_name}</div>}
                                    <div className="mt-1 flex items-center justify-center gap-1.5 text-xs text-slate-500">{championNation?.flag_url && <img src={championNation.flag_url} alt="" className="w-5 h-3.5 object-contain" />}<span>{championNation?.name || season.champion_nation}</span></div>
                                </div>
                                <div className="text-center min-w-20 sm:min-w-32">
                                    <Trophy className="w-5 h-5 mx-auto mb-1" style={{ color: competitionTheme.ui }} />
                                    <div className="text-2xl sm:text-3xl font-black text-slate-800">{season.final_score || 'vs'}</div>
                                    {season.final_venue && <div className="mt-1 text-[10px] sm:text-xs text-slate-400 max-w-36 line-clamp-2">{season.final_venue}</div>}
                                </div>
                                <div className="text-center min-w-0">
                                    {runnerClub?.logo_url && <img src={runnerClub.logo_url} alt={`${runnerClub.name} crest`} className="w-16 h-16 sm:w-20 sm:h-20 object-contain mx-auto mb-3" />}
                                    <div className="text-[10px] uppercase tracking-wider font-black text-slate-400 mb-1">Runner-up</div>
                                    {runnerClub ? <Link to={createPageUrl(`ClubDetail?id=${runnerClub.id}`)} className="text-lg sm:text-2xl font-bold text-slate-700 hover:underline block truncate">{runnerClub.name}</Link> : <div className="text-lg sm:text-2xl font-bold text-slate-700 truncate">{season.runner_up}</div>}
                                    <div className="mt-1 flex items-center justify-center gap-1.5 text-xs text-slate-500">{runnerNation?.flag_url && <img src={runnerNation.flag_url} alt="" className="w-5 h-3.5 object-contain" />}<span>{runnerNation?.name || season.runner_up_nation}</span></div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <Tabs defaultValue="bracket" className="space-y-6">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                        <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                            <TabsList className="h-12 w-max justify-start rounded-none border-b border-slate-200 bg-transparent p-0">
                                {[
                                    ['bracket', 'Tournament Bracket'], ['crests', 'Club Crests'], ['participants', 'Participants'], ['stats', 'Stats & Records'], ['rounds', 'By Round']
                                ].map(([value, label]) => <TabsTrigger key={value} value={value} className="h-12 rounded-none border-b-2 border-transparent px-4 text-sm font-semibold text-slate-500 data-[state=active]:border-[var(--competition-accent)] data-[state=active]:bg-transparent data-[state=active]:text-slate-950 data-[state=active]:shadow-none">{label}</TabsTrigger>)}
                            </TabsList>
                        </div>
                        <AdminOnly>
                            <div className="flex gap-2 flex-wrap">
                                <Button variant="outline" size="sm" onClick={openEditRounds}>
                                    <Settings className="w-4 h-4 mr-1" /> Round Names
                                </Button>
                                <Link to={createPageUrl(`UpdateContinentalStats?season=${seasonId}`)}>
                                    <Button variant="outline" size="sm" title="Stats now sync automatically; use this to rebuild older historical aggregates">
                                        <RefreshCw className="w-4 h-4 mr-1" /> Rebuild Stats
                                    </Button>
                                </Link>
                                <Button size="sm" onClick={() => setIsAddMatchOpen(true)} className="text-white" style={{ backgroundColor: competitionTheme.ui }}>
                                    <Plus className="w-4 h-4 mr-1" /> Add Match
                                </Button>
                            </div>
                        </AdminOnly>
                    </div>

                    <TabsContent value="bracket">
                        <EnhancedBracketView 
                            matches={matches} 
                            getNationFlag={getNationFlag}
                            clubs={clubs}
                            nations={nations}
                            competition={competition}
                            onEditMatch={setEditingMatch}
                        />
                    </TabsContent>

                    <TabsContent value="crests">
                        <Card className="border shadow-sm overflow-hidden" style={{ borderColor: competitionTheme.border, background: `linear-gradient(135deg, ${competitionTheme.tint}, #fff 38%)` }}>
                            <div className="h-[3px]" style={{ background: `linear-gradient(90deg, ${competitionTheme.ui}, ${competitionTheme.accent}, transparent 82%)` }} />
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" style={{ color: competitionTheme.ui }} /> Competing Clubs</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {participantClubs.length === 0 ? (
                                    <p className="text-center py-8 text-slate-500">No participating clubs yet</p>
                                ) : (
                                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-5">
                                        {participantClubs.map(club => {
                                            const nation = nations.find(n => n.id === club.nation_id) || nations.find(n => n.name === club.nation);
                                            return (
                                                <Link key={club.id} to={createPageUrl(`ClubDetail?id=${club.id}`)} className="group flex flex-col items-center gap-2 min-w-0">
                                                    <div className="relative w-full aspect-square rounded-2xl border flex items-center justify-center p-4 transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-md" style={{ borderColor: competitionTheme.border, background: `radial-gradient(circle at 50% 35%, ${competitionTheme.tintStrong}, rgba(255,255,255,.9) 64%)` }}>
                                                        {club.logo_url ? <img src={club.logo_url} alt={`${club.name} crest`} className="w-full h-full object-contain drop-shadow-sm" /> : <Shield className="w-12 h-12 text-slate-300" />}
                                                        {club.isChampion && <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center shadow-sm border border-white" style={{ backgroundColor: competitionTheme.ui }}><Trophy className="w-4 h-4 text-white" /></span>}
                                                    </div>
                                                    {nation?.flag_url && <img src={nation.flag_url} alt="" className="w-7 h-5 object-contain" />}
                                                    <span className="text-xs text-center text-slate-700 font-semibold line-clamp-2">{club.name}</span>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="participants">
                        <ParticipantsList 
                            matches={matches}
                            season={season}
                            clubs={clubs}
                            nations={nations}
                            competition={competition}
                            allSeasons={allSeasons}
                            allMatches={allMatches}
                        />
                    </TabsContent>

                    <TabsContent value="stats">
                        <SeasonStats 
                            matches={matches}
                            season={season}
                            clubs={clubs}
                            nations={nations}
                        />
                    </TabsContent>

                    <TabsContent value="rounds">
                        {sortedRounds.length === 0 ? (
                            <Card className="border-dashed border-2 border-slate-300">
                                <CardContent className="flex flex-col items-center justify-center py-12">
                                    <Trophy className="w-12 h-12 text-slate-300 mb-4" />
                                    <h3 className="text-lg font-semibold text-slate-700 mb-2">No Matches Yet</h3>
                                    <p className="text-slate-500">Add matches to build the competition bracket</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-6">
                                {sortedRounds.map(round => (
                                    <Card key={round} className="border-0 shadow-sm">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-lg">{round}</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-3">
                                                {matchesByRound[round]
                                                    .sort((a, b) => (a.match_number || 0) - (b.match_number || 0))
                                                    .map(match => (
                                                        <div key={match.id} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg group">
                                                            <div className="flex-1 flex items-center gap-3">
                                                                {getNationFlag(match.home_club_nation) && (
                                                                    <img src={getNationFlag(match.home_club_nation)} alt="" className="w-5 h-3 object-contain" />
                                                                )}
                                                                <span className={`font-medium ${match.winner === match.home_club_name ? 'text-emerald-700' : ''}`}>
                                                                    {match.home_club_name}
                                                                </span>
                                                            </div>
                                                            <div className="text-center min-w-[100px]">
                                                                {match.is_single_leg ? (
                                                                    <span className="font-bold">
                                                                        {match.home_score_leg1 ?? '-'} - {match.away_score_leg1 ?? '-'}
                                                                    </span>
                                                                ) : (
                                                                    <div className="text-sm">
                                                                        <div>{match.home_score_leg1 ?? '-'} - {match.away_score_leg1 ?? '-'}</div>
                                                                        <div>{match.away_score_leg2 ?? '-'} - {match.home_score_leg2 ?? '-'}</div>
                                                                        <div className="font-bold text-xs">({match.home_aggregate ?? '-'} - {match.away_aggregate ?? '-'})</div>
                                                                    </div>
                                                                )}
                                                                {match.penalties && <div className="text-xs text-slate-500">(pen: {match.penalties})</div>}
                                                            </div>
                                                            <div className="flex-1 flex items-center justify-end gap-3">
                                                                <span className={`font-medium ${match.winner === match.away_club_name ? 'text-emerald-700' : ''}`}>
                                                                    {match.away_club_name}
                                                                </span>
                                                                {getNationFlag(match.away_club_nation) && (
                                                                    <img src={getNationFlag(match.away_club_nation)} alt="" className="w-5 h-3 object-contain" />
                                                                )}
                                                            </div>
                                                            <AdminOnly>
                                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <Button variant="ghost" size="sm" onClick={() => setEditingMatch(match)}>
                                                                        <Edit2 className="w-3 h-3" />
                                                                    </Button>
                                                                    <AlertDialog>
                                                                        <AlertDialogTrigger asChild>
                                                                            <Button variant="ghost" size="sm" className="text-red-500">
                                                                                <Trash2 className="w-3 h-3" />
                                                                            </Button>
                                                                        </AlertDialogTrigger>
                                                                        <AlertDialogContent>
                                                                            <AlertDialogHeader>
                                                                                <AlertDialogTitle>Delete this match?</AlertDialogTitle>
                                                                            </AlertDialogHeader>
                                                                            <AlertDialogFooter>
                                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                                <AlertDialogAction onClick={() => deleteMatchMutation.mutate(match.id)} className="bg-red-600">Delete</AlertDialogAction>
                                                                            </AlertDialogFooter>
                                                                        </AlertDialogContent>
                                                                    </AlertDialog>
                                                                </div>
                                                            </AdminOnly>
                                                        </div>
                                                    ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>

                {/* Season Notes */}
                {season.notes && (
                    <Card className="border-0 shadow-sm mt-8">
                        <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
                        <CardContent><p className="text-slate-600 whitespace-pre-line">{season.notes}</p></CardContent>
                    </Card>
                )}
            </div>

            <AddMatchDialog
                isOpen={isAddMatchOpen || !!editingMatch}
                onClose={() => { setIsAddMatchOpen(false); setEditingMatch(null); }}
                seasonId={seasonId}
                editingMatch={editingMatch}
                nations={nations}
                clubs={clubs}
            />

            {/* Edit Round Names Dialog */}
            <Dialog open={isEditRoundsOpen} onOpenChange={setIsEditRoundsOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Customize Round Names</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <p className="text-sm text-slate-500">
                            Rename rounds for {competition?.name}. Leave blank to use default names.
                        </p>
                        <div className="space-y-3">
                            <div>
                                <Label className="text-xs text-slate-500">Round of 32 →</Label>
                                <Input 
                                    value={roundNames['Round of 32'] || ''} 
                                    onChange={(e) => setRoundNames({...roundNames, 'Round of 32': e.target.value})}
                                    placeholder="e.g., Qualifying Round"
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label className="text-xs text-slate-500">Round of 16 →</Label>
                                <Input 
                                    value={roundNames['Round of 16'] || ''} 
                                    onChange={(e) => setRoundNames({...roundNames, 'Round of 16': e.target.value})}
                                    placeholder="e.g., Round One"
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label className="text-xs text-slate-500">Quarter-final →</Label>
                                <Input 
                                    value={roundNames['Quarter-final'] || ''} 
                                    onChange={(e) => setRoundNames({...roundNames, 'Quarter-final': e.target.value})}
                                    placeholder="e.g., Quarter-final"
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label className="text-xs text-slate-500">Semi-final →</Label>
                                <Input 
                                    value={roundNames['Semi-final'] || ''} 
                                    onChange={(e) => setRoundNames({...roundNames, 'Semi-final': e.target.value})}
                                    placeholder="e.g., Semi-final"
                                    className="mt-1"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={() => setIsEditRoundsOpen(false)}>Cancel</Button>
                            <Button 
                                onClick={saveRoundNames} 
                                disabled={updateCompetitionMutation.isPending}
                                className="bg-emerald-600 hover:bg-emerald-700"
                            >
                                {updateCompetitionMutation.isPending ? 'Saving...' : 'Save'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}