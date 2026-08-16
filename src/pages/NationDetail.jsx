import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Plus, Trophy, Shield, Edit2, Trash2, ChevronRight, Save, X, Loader2, Star, Award, MapPin, Layers, Sparkles, Globe2, Languages, Building2 } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from '@/components/common/PageHeader';
import ImageUploaderWithColors from '@/components/common/ImageUploaderWithColors';
import NationNarratives from '@/components/nations/NationNarratives';
import PersonalizedNationStory from '@/components/nations/PersonalizedNationStory';
import GoldenEras from '@/components/nations/GoldenEras';
import AdminOnly from '@/components/common/AdminOnly';
import AINationEnhancer from '@/components/nations/AINationEnhancer';
import ImmersiveNationContent from '@/components/nations/ImmersiveNationContent';
import LeaguePyramid from '@/components/nations/LeaguePyramid';
import EnhancedLeaguePyramid from '@/components/nations/EnhancedLeaguePyramid';
import YouthLeagueStructure from '@/components/nations/YouthLeagueStructure';
import NationStats from '@/components/nations/NationStats';
import LeagueStructureManager from '@/components/nations/LeagueStructureManager';
import NationSeasonOverview from '@/components/nations/NationSeasonOverview';
import NationAnalyticsDashboard from '@/components/analytics/NationAnalyticsDashboard';
import GeographicSuccessMap from '@/components/nations/GeographicSuccessMap';
import NationGeographyTab from '@/components/nations/NationGeographyTab';
import DominantEraTimeline from '@/components/nations/DominantEraTimeline';
import LeaguePyramidFlow from '@/components/nations/LeaguePyramidFlow';
import CrestCleaner from '@/components/clubs/CrestCleaner';
import EntityStickyNav from '@/components/common/EntityStickyNav';
import EntitySectionHeader from '@/components/common/EntitySectionHeader';
import { getEntityTheme } from '@/utils/entityTheme';
import { useNavigate } from 'react-router-dom';

export default function NationDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    const nationId = urlParams.get('id');
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({});
    const [flagCleanerOpen, setFlagCleanerOpen] = useState(false);

    const { data: nation, isLoading } = useQuery({
        queryKey: ['nation', nationId],
        queryFn: async () => {
            const nations = await base44.entities.Nation.filter({ id: nationId });
            return nations[0];
        },
        enabled: !!nationId,
    });

    const { data: leagues = [] } = useQuery({
        queryKey: ['leagues', nationId],
        queryFn: () => base44.entities.League.filter({ nation_id: nationId }, 'tier'),
    });

    const { data: allNationClubs = [] } = useQuery({
        queryKey: ['clubs', nationId],
        queryFn: () => base44.entities.Club.filter({ nation_id: nationId }, 'name'),
    });

    // Filter out defunct clubs for display
    const clubs = React.useMemo(() => {
        return allNationClubs.filter(c => !c.is_defunct);
    }, [allNationClubs]);

    const { data: allClubs = [] } = useQuery({
        queryKey: ['allClubs'],
        queryFn: () => base44.entities.Club.list(),
    });

    const { data: seasons = [] } = useQuery({
        queryKey: ['nationSeasons', nationId],
        queryFn: async () => {
            // Get all seasons for all leagues in this nation
            const allSeasons = await base44.entities.Season.list();
            const leagueIds = leagues.map(l => l.id);
            return allSeasons.filter(s => leagueIds.includes(s.league_id));
        },
        enabled: leagues.length > 0,
    });

    const { data: domesticCups = [] } = useQuery({
        queryKey: ['domesticCups', nationId],
        queryFn: () => base44.entities.DomesticCup.filter({ nation_id: nationId }),
    });

    const { data: cupSeasons = [] } = useQuery({
        queryKey: ['nationCupSeasons', nationId],
        queryFn: async () => {
            const cupIds = domesticCups.map(c => c.id);
            if (cupIds.length === 0) return [];
            const allCupSeasons = await base44.entities.DomesticCupSeason.list();
            return allCupSeasons.filter(s => cupIds.includes(s.cup_id));
        },
        enabled: domesticCups.length > 0,
    });

    const { data: coefficients = [] } = useQuery({
        queryKey: ['coefficients'],
        queryFn: () => base44.entities.CountryCoefficient.list(),
    });

    const { data: continentalCompetitions = [] } = useQuery({
        queryKey: ['continentalCompetitionsForBranding'],
        queryFn: () => base44.entities.ContinentalCompetition.list(),
        staleTime: 30 * 60 * 1000,
    });

    const coefficient = coefficients.find(c => c.nation_id === nationId);

    const { data: nationalPlayers = [] } = useQuery({
        queryKey: ['nationalSquadPlayers', nation?.name],
        queryFn: () => base44.entities.Player.filter({ nationality: nation.name }),
        enabled: !!nation?.name,
    });

    const { data: leagueTables = [] } = useQuery({
        queryKey: ['nationLeagueTables', nationId],
        queryFn: async () => {
            const leagueIds = leagues.map(l => l.id);
            if (leagueIds.length === 0) return [];
            const allTables = await base44.entities.LeagueTable.list();
            return allTables.filter(t => leagueIds.includes(t.league_id));
        },
        enabled: leagues.length > 0,
    });

    // Calculate national team strength based on top 22 players
    const nationalTeamStrength = React.useMemo(() => {
        if (!nationalPlayers.length) return null;
        
        const top22 = [...nationalPlayers]
            .sort((a, b) => ((b.overall_rating || 0) + (b.potential || 0)) - ((a.overall_rating || 0) + (a.potential || 0)))
            .slice(0, 22);
        
        if (top22.length === 0) return null;
        
        const avgRating = top22.reduce((sum, p) => sum + (p.overall_rating || 0), 0) / top22.length;
        return Math.round(avgRating);
    }, [nationalPlayers]);

    const updateMutation = useMutation({
        mutationFn: (data) => base44.entities.Nation.update(nationId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['nation', nationId] });
            queryClient.invalidateQueries({ queryKey: ['nations'] });
            setIsEditing(false);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: () => base44.entities.Nation.delete(nationId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['nations'] });
            navigate(createPageUrl('Nations'));
        },
    });

    const handleEdit = () => {
        setEditData(nation);
        setIsEditing(true);
    };

    const handleSave = () => {
        const submitData = {
            ...editData,
            founded_year: editData.founded_year ? parseInt(editData.founded_year) : null
        };
        updateMutation.mutate(submitData);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50">
                <Skeleton className="h-64 w-full" />
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <Skeleton className="h-48 mb-8" />
                </div>
            </div>
        );
    }

    if (!nation) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Card className="max-w-md">
                    <CardContent className="text-center py-8">
                        <h2 className="text-xl font-bold mb-4">Nation Not Found</h2>
                        <Link to={createPageUrl('Nations')}>
                            <Button>Back to Nations</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Filter professional leagues only for tier structure
    const professionalLeagues = leagues.filter(l => l.league_type !== 'youth' && l.league_type !== 'reserve');
    
    // Group professional leagues by tier
    const leaguesByTier = professionalLeagues.reduce((acc, league) => {
        const tier = league.tier || 1;
        if (!acc[tier]) acc[tier] = [];
        acc[tier].push(league);
        return acc;
    }, {});

    const nationTheme = getEntityTheme({ primary: nation.primary_color, secondary: nation.secondary_color });
    const vcc = continentalCompetitions.find(c => c.short_name === 'VCC' || c.name?.includes('Champions'));
    const ccc = continentalCompetitions.find(c => c.short_name === 'CCC' || c.name?.includes('Challenge'));
    const membershipCompetition = nation.membership === 'VCC' ? vcc : ccc;
    const membershipTheme = getEntityTheme({
        primary: membershipCompetition?.primary_color || (nation.membership === 'VCC' ? '#1a472a' : '#4169e1'),
        secondary: membershipCompetition?.secondary_color || (nation.membership === 'VCC' ? '#d4af37' : '#c0c0c0')
    });
    const nationTabs = [
        ['overview', 'Overview'], ['pyramid', 'Pyramid'], ['youth-structure', 'Youth'], ['geo-stats', 'Geography'],
        ['eras', 'Eras'], ['flow', 'Flow'], ['national-squad', 'Squad'], ['season-overview', 'Season'],
        ['details', 'Details'], ['clubs', 'Success'], ['analytics', 'Analytics']
    ];
    const topLeague = professionalLeagues.find(l => l.tier === 1);
    const topLeagueTheme = getEntityTheme({ primary: topLeague?.primary_color || nationTheme.primary, secondary: topLeague?.secondary_color || nationTheme.secondary, accent: topLeague?.accent_color });
    const bestClub = clubs
        .map(c => ({ ...c, score: (c.league_titles || 0) * 3 + (c.vcc_titles || 0) * 5 + (c.ccc_titles || 0) * 3 + (c.domestic_cup_titles || 0) }))
        .filter(c => c.score > 0)
        .sort((a, b) => b.score - a.score)[0];
    const bestClubTheme = getEntityTheme({ primary: bestClub?.primary_color || nationTheme.primary, secondary: bestClub?.secondary_color || nationTheme.secondary, accent: bestClub?.accent_color });

    return (
        <div className="min-h-screen bg-[#f5f5f4]" style={{ '--nation-primary': nationTheme.ui, '--nation-secondary': nationTheme.secondary }}>
            <section className="relative overflow-hidden bg-[#090a0b] text-white border-b border-white/10">
                <div className="absolute inset-0" style={{ background: `linear-gradient(108deg, #070809 0%, ${nationTheme.heroPrimary}e8 48%, ${nationTheme.heroSecondary}d8 100%)` }} />
                <div className="absolute inset-0 bg-gradient-to-r from-black/45 via-black/10 to-black/35" />
                <div className="absolute inset-0 opacity-[0.10]" style={{ backgroundImage: `radial-gradient(circle at 16% 28%, rgba(255,255,255,.24), transparent 28%), linear-gradient(115deg, transparent 0 55%, rgba(255,255,255,.10) 55% 56%, transparent 56% 100%)` }} />
                {nation.flag_url && <img src={nation.flag_url} alt="" aria-hidden="true" className="pointer-events-none absolute -right-24 sm:-right-12 -bottom-16 sm:-bottom-28 w-[430px] sm:w-[620px] h-[300px] sm:h-[430px] object-contain opacity-[0.11] saturate-125" />}

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-8 md:pb-10">
                    <div className="flex items-center justify-between gap-4 mb-7">
                        <nav className="flex items-center gap-2 text-xs sm:text-sm text-white/60 min-w-0 overflow-hidden">
                            <Link to={createPageUrl('Home')} className="hover:text-white transition-colors shrink-0">Volaria</Link>
                            <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                            <Link to={createPageUrl('Nations')} className="hover:text-white transition-colors shrink-0">Nations</Link>
                            <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                            <span className="text-white truncate">{nation.name}</span>
                        </nav>
                        <AdminOnly>
                            <div className="flex gap-2 shrink-0">
                                <Button size="sm" variant="outline" className="bg-black/20 border-white/25 text-white hover:bg-white/15 hover:text-white" onClick={() => setFlagCleanerOpen(true)}><Sparkles className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Clean flag</span></Button>
                                <Button size="sm" variant="outline" className="bg-black/20 border-white/25 text-white hover:bg-white/15 hover:text-white" onClick={handleEdit}><Edit2 className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Edit nation</span></Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild><Button size="sm" variant="outline" className="bg-black/20 border-red-300/30 text-red-200 hover:bg-red-500/20 hover:text-red-100"><Trash2 className="w-4 h-4" /></Button></AlertDialogTrigger>
                                    <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete {nation.name}?</AlertDialogTitle><AlertDialogDescription>This will permanently delete this nation.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-red-600">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </AdminOnly>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-[190px_minmax(0,1fr)] lg:grid-cols-[220px_minmax(0,1fr)] gap-6 md:gap-9 items-center">
                        <div className="relative w-40 h-28 sm:w-48 sm:h-32 md:w-full md:h-36 flex items-center justify-center">
                            <div className="absolute inset-[8%] rounded-[40%] blur-3xl opacity-45" style={{ backgroundColor: nation.secondary_color || nation.primary_color || '#ffffff' }} />
                            {nation.flag_url ? <img src={nation.flag_url} alt={`${nation.name} flag`} className="relative z-10 max-w-full max-h-full object-contain drop-shadow-[0_18px_22px_rgba(0,0,0,0.48)]" /> : <div className="relative z-10 w-full h-full rounded-xl border border-white/20 bg-black/20 flex items-center justify-center"><Globe2 className="w-16 h-16 text-white/35" /></div>}
                        </div>

                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                {nation.region && <span className="text-[11px] uppercase tracking-[0.18em] font-semibold text-white/65">{nation.region}</span>}
                                {nation.membership && <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded border font-bold" style={{ backgroundColor: `${membershipTheme.primary}28`, borderColor: `${membershipTheme.secondary}70`, color: '#ffffff' }}>{nation.membership === 'VCC' ? 'VFC Full Member' : 'VFC Associate'}</span>}
                            </div>
                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-[-0.045em] leading-[0.95] text-white break-words">{nation.name}</h1>
                            {(nation.description || nation.federation_name) && <p className="mt-4 text-base sm:text-lg text-white/72 max-w-3xl leading-relaxed">{nation.description || nation.federation_name}</p>}
                            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/70">
                                {nation.capital && <span className="flex items-center gap-1.5"><Building2 className="w-4 h-4" /> {nation.capital}</span>}
                                {nation.language && <span className="flex items-center gap-1.5"><Languages className="w-4 h-4" /> {nation.language}</span>}
                                {nation.federation_name && <span className="flex items-center gap-1.5"><Shield className="w-4 h-4" /> {nation.federation_name}</span>}
                            </div>
                        </div>
                    </div>

                    <div className="mt-7 grid grid-cols-3 sm:grid-cols-5 border border-white/15 rounded-xl overflow-hidden bg-black/20 backdrop-blur-sm">
                        <div className="px-3 sm:px-4 py-3 border-r border-white/10"><div className="text-2xl font-black">{clubs.length}</div><div className="text-[10px] uppercase tracking-wider text-white/50">Clubs</div></div>
                        <div className="px-3 sm:px-4 py-3 border-r border-white/10"><div className="text-2xl font-black">{professionalLeagues.length}</div><div className="text-[10px] uppercase tracking-wider text-white/50">Leagues</div></div>
                        <div className="px-3 sm:px-4 py-3 sm:border-r border-white/10"><div className="text-2xl font-black">{domesticCups.length}</div><div className="text-[10px] uppercase tracking-wider text-white/50">Domestic cups</div></div>
                        <div className="hidden sm:block px-4 py-3 border-r border-white/10"><div className="text-2xl font-black">{nation.nation_strength || '—'}</div><div className="text-[10px] uppercase tracking-wider text-white/50">Strength</div></div>
                        <div className="hidden sm:block px-4 py-3"><div className="text-sm font-bold leading-tight">{nation.founded_year || '—'}</div><div className="text-[10px] uppercase tracking-wider text-white/50 mt-1">Football since</div></div>
                    </div>
                </div>
                <div className="h-1.5 flex"><div className="flex-[3]" style={{ backgroundColor: nation.primary_color || '#334155' }} /><div className="flex-[2]" style={{ backgroundColor: nation.secondary_color || nation.primary_color || '#111827' }} /></div>
            </section>

            <CrestCleaner
                open={flagCleanerOpen}
                onOpenChange={setFlagCleanerOpen}
                item={nation}
                entityType="Nation"
                imageField="flag_url"
                assetLabel="flag"
                onSaved={() => {
                    queryClient.invalidateQueries({ queryKey: ['nation', nationId] });
                    queryClient.invalidateQueries({ queryKey: ['nations'] });
                }}
            />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Personalized Nation Football Story */}
                <PersonalizedNationStory
                    nation={nation}
                    leagues={leagues}
                    clubs={allNationClubs}
                    seasons={seasons}
                    coefficients={coefficients}
                />

                {/* Nation Stats */}
                <NationStats nation={nation} clubs={clubs} leagues={leagues} coefficient={coefficient} nationalTeamStrength={nationalTeamStrength} />

                {/* Discovery cards use the identity of the thing they represent */}
                <EntitySectionHeader eyebrow="Explore" title={`Football in ${nation.name}`} description="The leading competition, most successful club and the wider club landscape." accentColor={nationTheme.ui} className="mt-8" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
                    {topLeague && (
                        <Link to={createPageUrl(`LeagueDetail?id=${topLeague.id}`)} className="group">
                            <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-all h-full bg-white overflow-hidden" style={{ borderTop: `3px solid ${topLeagueTheme.ui}` }}>
                                <CardContent className="p-5">
                                    <div className="flex items-center gap-3 mb-3">
                                        {topLeague.logo_url ? <img src={topLeague.logo_url} alt={topLeague.name} className="w-11 h-11 object-contain" /> : <Trophy className="w-8 h-8" style={{ color: topLeagueTheme.ui }} />}
                                        <div className="min-w-0">
                                            <p className="text-[10px] uppercase tracking-wider font-black text-slate-400">Top division</p>
                                            <h3 className="font-black text-slate-900 truncate">{topLeague.name}</h3>
                                        </div>
                                    </div>
                                    {topLeague.current_champion && <p className="text-sm text-slate-600">Champion · <span className="font-semibold">{topLeague.current_champion}</span></p>}
                                    <p className="text-xs font-semibold mt-3 flex items-center gap-1" style={{ color: topLeagueTheme.ui }}>View league <ChevronRight className="w-3 h-3" /></p>
                                </CardContent>
                            </Card>
                        </Link>
                    )}

                    {bestClub && (
                        <Link to={createPageUrl(`ClubDetail?id=${bestClub.id}`)} className="group">
                            <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-all h-full bg-white overflow-hidden" style={{ borderTop: `3px solid ${bestClubTheme.ui}` }}>
                                <CardContent className="p-5">
                                    <div className="flex items-center gap-3 mb-3">
                                        {bestClub.logo_url ? <img src={bestClub.logo_url} alt={`${bestClub.name} crest`} className="w-11 h-11 object-contain" /> : <Shield className="w-8 h-8" style={{ color: bestClubTheme.ui }} />}
                                        <div className="min-w-0">
                                            <p className="text-[10px] uppercase tracking-wider font-black text-slate-400">Most successful club</p>
                                            <h3 className="font-black text-slate-900 truncate">{bestClub.name}</h3>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-slate-600">
                                        {bestClub.league_titles > 0 && <span>{bestClub.league_titles} league titles</span>}
                                        {bestClub.vcc_titles > 0 && <span>{bestClub.vcc_titles} VCC</span>}
                                    </div>
                                    <p className="text-xs font-semibold mt-3 flex items-center gap-1" style={{ color: bestClubTheme.ui }}>View club <ChevronRight className="w-3 h-3" /></p>
                                </CardContent>
                            </Card>
                        </Link>
                    )}

                    <Link to={createPageUrl(`NationClubs?id=${nationId}`)} className="group">
                        <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-all h-full bg-white overflow-hidden" style={{ borderTop: `3px solid ${nationTheme.ui}` }}>
                            <CardContent className="p-5">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: nationTheme.tintStrong }}><Shield className="w-6 h-6" style={{ color: nationTheme.ui }} /></div>
                                    <div>
                                        <p className="text-[10px] uppercase tracking-wider font-black text-slate-400">National club directory</p>
                                        <h3 className="font-black text-slate-900">{clubs.length} clubs</h3>
                                    </div>
                                </div>
                                <p className="text-sm text-slate-600">Explore every active club in {nation.name}.</p>
                                <p className="text-xs font-semibold mt-3 flex items-center gap-1" style={{ color: nationTheme.ui }}>View all clubs <ChevronRight className="w-3 h-3" /></p>
                            </CardContent>
                        </Card>
                    </Link>
                </div>

                {/* Tabs for main content */}
                <Tabs defaultValue="overview" className="mt-6">
                    <EntityStickyNav image={nation.flag_url} name={nation.name} items={nationTabs} accentColor={nationTheme.ui} />
                    <div className="hidden md:block overflow-x-auto mb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        <TabsList className="h-12 w-max min-w-full justify-start gap-1 rounded-none border-b border-slate-200 bg-transparent p-0">
                            {nationTabs.map(([value, label]) => (
                                <TabsTrigger key={value} value={value} className="h-12 rounded-none border-b-2 border-transparent px-4 text-sm font-semibold text-slate-500 data-[state=active]:border-[var(--nation-primary)] data-[state=active]:bg-transparent data-[state=active]:text-slate-950 data-[state=active]:shadow-none">{label}</TabsTrigger>
                            ))}
                        </TabsList>
                    </div>

                    <TabsContent value="pyramid">
                        <EnhancedLeaguePyramid leagues={professionalLeagues} seasons={seasons} clubs={clubs} nationId={nationId} />
                    </TabsContent>

                    <TabsContent value="youth-structure">
                        <YouthLeagueStructure nationId={nationId} />
                    </TabsContent>

                    <TabsContent value="season-overview">
                        <NationSeasonOverview 
                            nation={nation}
                            allSeasons={seasons}
                            allLeagues={leagues}
                            allClubs={allNationClubs}
                        />
                    </TabsContent>

                    <TabsContent value="national-squad">
                        {(() => {
                            // Pick top 22 players with balanced squad
                            const positions = {
                                GK: nationalPlayers.filter(p => p.position === 'GK'),
                                DEF: nationalPlayers.filter(p => ['CB', 'LB', 'RB'].includes(p.position)),
                                MID: nationalPlayers.filter(p => ['CDM', 'CM', 'CAM'].includes(p.position)),
                                FWD: nationalPlayers.filter(p => ['LW', 'RW', 'ST'].includes(p.position))
                            };

                            // Sort all players by rating
                            Object.keys(positions).forEach(pos => {
                                positions[pos].sort((a, b) => ((b.overall_rating || 0) + (b.potential || 0)) - ((a.overall_rating || 0) + (a.potential || 0)));
                            });

                            const squad = {};
                            const selected = new Set();
                            
                            // First, guarantee 2 best per position
                            Object.keys(positions).forEach(pos => {
                                squad[pos] = [];
                                const minPerPos = pos === 'GK' ? 2 : 2;
                                positions[pos].slice(0, minPerPos).forEach(p => {
                                    squad[pos].push(p);
                                    selected.add(p.id);
                                });
                            });

                            // Fill remaining spots (22 - 8 = 14) with best available players, prioritizing positions
                            const currentTotal = Object.values(squad).flat().length;
                            const remaining = 22 - currentTotal;
                            const maxPerPosition = { GK: 3, DEF: 8, MID: 7, FWD: 5 };
                            
                            const allRemaining = [];
                            Object.entries(positions).forEach(([pos, players]) => {
                                players.forEach(p => {
                                    if (!selected.has(p.id) && squad[pos].length < maxPerPosition[pos]) {
                                        allRemaining.push({ ...p, pos });
                                    }
                                });
                            });
                            
                            allRemaining.sort((a, b) => ((b.overall_rating || 0) + (b.potential || 0)) - ((a.overall_rating || 0) + (a.potential || 0)));
                            allRemaining.slice(0, remaining).forEach(p => {
                                squad[p.pos].push(p);
                                selected.add(p.id);
                            });

                            const totalPlayers = Object.values(squad).flat().length;

                            if (totalPlayers === 0) {
                                return (
                                    <Card className="border-dashed border-2 border-slate-300">
                                        <CardContent className="flex flex-col items-center justify-center py-16">
                                            <Trophy className="w-16 h-16 text-slate-300 mb-4" />
                                            <h3 className="text-xl font-semibold text-slate-700 mb-2">No Players from {nation.name}</h3>
                                            <p className="text-slate-500">Generate players for clubs to build a national squad</p>
                                        </CardContent>
                                    </Card>
                                );
                            }

                            const positionNames = {
                                GK: 'Goalkeepers',
                                DEF: 'Defenders',
                                MID: 'Midfielders',
                                FWD: 'Forwards'
                            };

                            return (
                                <div className="space-y-6">
                                    <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50">
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <Trophy className="w-6 h-6 text-blue-600" />
                                                {nation.name} National Squad
                                            </CardTitle>
                                            <p className="text-sm text-slate-600 mt-1">
                                                {totalPlayers} players selected based on ratings and potential
                                            </p>
                                        </CardHeader>
                                    </Card>

                                    {Object.entries(squad).map(([pos, players]) => {
                                        if (players.length === 0) return null;
                                        return (
                                            <Card key={pos} className="border-0 shadow-sm">
                                                <CardHeader>
                                                    <CardTitle>{positionNames[pos]}</CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="space-y-2">
                                                        {players.map(player => {
                                                            const club = allClubs.find(c => c.id === player.club_id);
                                                            return (
                                                                <div key={player.id} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                                                                    <Link to={createPageUrl(`PlayerDetail?id=${player.id}`)} className="flex items-center gap-3 flex-1">
                                                                        {player.photo_url ? (
                                                                            <img src={player.photo_url} alt={player.full_name} className="w-12 h-12 rounded-full object-cover" />
                                                                        ) : (
                                                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                                                                                <span className="text-lg font-bold text-blue-600">{player.first_name?.[0]}{player.last_name?.[0]}</span>
                                                                            </div>
                                                                        )}
                                                                        <div className="flex-1">
                                                                            <div className="font-semibold text-slate-900">{player.full_name || `${player.first_name} ${player.last_name}`}</div>
                                                                            <div className="text-sm text-slate-500 flex items-center gap-2">
                                                                                <span className="px-2 py-0.5 bg-slate-200 rounded text-xs font-semibold">{player.position}</span>
                                                                                <span>Age {player.age}</span>
                                                                                {player.birth_place && <span>• {player.birth_place}</span>}
                                                                            </div>
                                                                        </div>
                                                                    </Link>
                                                                    {club && (
                                                                        <Link to={createPageUrl(`ClubDetail?id=${club.id}`)} className="flex items-center gap-2 hover:underline">
                                                                            {club.logo_url && <img src={club.logo_url} alt={club.name} className="w-8 h-8 object-contain" />}
                                                                            <span className="text-sm font-medium hidden md:block">{club.name}</span>
                                                                        </Link>
                                                                    )}
                                                                    <div className="flex gap-3">
                                                                        <div className="text-center">
                                                                            <div className="text-lg font-bold" style={{ color: nationTheme.ui }}>{player.overall_rating}</div>
                                                                            <div className="text-xs text-slate-500">OVR</div>
                                                                        </div>
                                                                        <div className="text-center">
                                                                            <div className="text-lg font-bold text-blue-600">{player.potential}</div>
                                                                            <div className="text-xs text-slate-500">POT</div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            );
                        })()}
                    </TabsContent>

                    <TabsContent value="details">
                        <AdminOnly>
                            <div className="mb-6">
                                <AINationEnhancer 
                                    nation={nation} 
                                    onUpdate={() => queryClient.invalidateQueries({ queryKey: ['nation', nationId] })}
                                />
                            </div>
                        </AdminOnly>

                        <ImmersiveNationContent nation={nation} />
                    </TabsContent>

                    <TabsContent value="clubs">
                        {clubs.length > 0 ? (
                            <Card className="border-0 shadow-sm">
                                <CardHeader>
                                    <CardTitle>Most Successful Clubs in {nation.name}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {clubs
                                            .map(club => ({
                                                ...club,
                                                totalDomesticTrophies: (club.league_titles || 0) + (club.domestic_cup_titles || 0),
                                                totalTitles: (club.league_titles || 0) + (club.lower_tier_titles || 0)
                                            }))
                                            .filter(club => club.totalDomesticTrophies > 0)
                                            .sort((a, b) => b.totalDomesticTrophies - a.totalDomesticTrophies || b.league_titles - a.league_titles)
                                            .map((club, idx) => (
                                                <Link 
                                                    key={club.id} 
                                                    to={createPageUrl(`ClubDetail?id=${club.id}`)}
                                                    className="flex items-center gap-4 p-4 rounded-lg hover:bg-slate-50 transition-colors border border-slate-100"
                                                >
                                                    <span className="w-8 text-center font-bold text-2xl text-slate-300">{idx + 1}</span>
                                                    {club.logo_url ? (
                                                        <img src={club.logo_url} alt={club.name} className="w-16 h-16 object-contain bg-white rounded-lg p-2" />
                                                    ) : (
                                                        <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center">
                                                            <Shield className="w-8 h-8 text-slate-400" />
                                                        </div>
                                                    )}
                                                    <div className="flex-1">
                                                        <div className="font-bold text-lg text-slate-900">{club.name}</div>
                                                        <div className="text-sm text-slate-500">{club.city || club.settlement}</div>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-2">
                                                        <div className="flex items-center gap-3">
                                                            <span className="flex items-center gap-1 text-amber-600 font-bold">
                                                                <Star className="w-4 h-4" /> {club.totalDomesticTrophies}
                                                            </span>
                                                            {club.league_titles > 0 && (
                                                                <span className="flex items-center gap-1 text-slate-600">
                                                                    <Trophy className="w-4 h-4" /> {club.league_titles}
                                                                </span>
                                                            )}
                                                            {club.domestic_cup_titles > 0 && (
                                                                <span className="flex items-center gap-1 text-orange-600">
                                                                    <Award className="w-4 h-4" /> {club.domestic_cup_titles}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {((club.vcc_titles || 0) + (club.ccc_titles || 0)) > 0 && (
                                                            <div className="flex items-center gap-2">
                                                                {club.vcc_titles > 0 && (
                                                                    <Badge className="text-white text-xs" style={{ backgroundColor: getEntityTheme({ primary: vcc?.primary_color || '#1a472a', secondary: vcc?.secondary_color || '#d4af37' }).primary }}>{club.vcc_titles} VCC</Badge>
                                                                )}
                                                                {club.ccc_titles > 0 && (
                                                                    <Badge className="text-white text-xs" style={{ backgroundColor: getEntityTheme({ primary: ccc?.primary_color || '#4169e1', secondary: ccc?.secondary_color || '#c0c0c0' }).primary }}>{club.ccc_titles} CCC</Badge>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </Link>
                                            ))}
                                    </div>
                                </CardContent>
                            </Card>
                        ) : (
                            <Card className="border-dashed border-2 border-slate-300">
                                <CardContent className="flex flex-col items-center justify-center py-12">
                                    <Trophy className="w-12 h-12 text-slate-300 mb-4" />
                                    <p className="text-slate-500">No trophy winners yet</p>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    <TabsContent value="overview">
                        {/* Nation Narratives */}
                        <NationNarratives nation={nation} leagues={leagues} clubs={clubs} domesticCups={domesticCups} cupSeasons={cupSeasons} />

                        {/* Golden Eras */}
                        <div className="mt-6">
                            <GoldenEras clubs={clubs} nation={nation} />
                        </div>

                {/* League Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 mt-8">
                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-4 text-center">
                            <Trophy className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                            <div className="text-2xl font-bold">{leagues.length}</div>
                            <div className="text-sm text-slate-500">Leagues</div>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-4 text-center">
                            <Shield className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                            <div className="text-2xl font-bold">{clubs.length}</div>
                            <div className="text-sm text-slate-500">Clubs</div>
                        </CardContent>
                    </Card>
                    {nation.founded_year && (
                        <Card className="border-0 shadow-sm">
                            <CardContent className="p-4 text-center">
                                <div className="text-2xl font-bold">{nation.founded_year}</div>
                                <div className="text-sm text-slate-500">Football Founded</div>
                            </CardContent>
                        </Card>
                    )}
                    {nation.region && (
                        <Card className="border-0 shadow-sm">
                            <CardContent className="p-4 text-center">
                                <div className="text-lg font-bold" style={{ color: nationTheme.ui }}>{nation.region}</div>
                                <div className="text-sm text-slate-500">Region</div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Leagues Section */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-slate-900">League Structure</h2>
                            <AdminOnly>
                                <Link to={createPageUrl(`AddLeague?nation_id=${nationId}`)}>
                                    <Button className="text-white" style={{ backgroundColor: nationTheme.ui }}>
                                        <Plus className="w-4 h-4 mr-2" />
                                        Add League
                                    </Button>
                                </Link>
                            </AdminOnly>
                        </div>

                        <LeagueStructureManager 
                            leagues={professionalLeagues} 
                            seasons={seasons} 
                            clubs={clubs}
                            nationId={nationId}
                        />

                        {/* Domestic Cups Section */}
                        {(domesticCups.length > 0 || true) && (
                            <div className="mt-8">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-slate-700">Domestic Cups</h3>
                                    <Link to={createPageUrl(`DomesticCups?nation_id=${nationId}`)}>
                                        <Button size="sm" variant="outline">
                                            <Award className="w-4 h-4 mr-2" />
                                            {domesticCups.length > 0 ? 'Manage Cups' : 'Add Cup'}
                                        </Button>
                                    </Link>
                                </div>
                                {domesticCups.length > 0 && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {domesticCups.map(cup => (
                                            <Link key={cup.id} to={createPageUrl(`DomesticCupDetail?id=${cup.id}`)}>
                                                <Card className="border-0 shadow-sm hover:shadow-lg transition-all">
                                                    <CardContent className="p-4 flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${cup.primary_color || '#1e40af'}, ${cup.secondary_color || '#fbbf24'})` }}>
                                                            <Trophy className="w-6 h-6 text-white" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <h4 className="font-bold text-slate-900">{cup.name}</h4>
                                                            {cup.current_champion && (
                                                                <p className="text-sm text-amber-600">🏆 {cup.current_champion}</p>
                                                            )}
                                                        </div>
                                                        <ChevronRight className="w-5 h-5 text-slate-400" />
                                                    </CardContent>
                                                </Card>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}


                    </div>

                    {/* Info & Clubs Sidebar */}
                    <div className="space-y-6">
                        {/* History */}
                        {nation.football_history && (
                            <Card className="border-0 shadow-sm">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg">Football History</CardTitle>
                                </CardHeader>
                                <CardContent className="prose prose-sm prose-slate">
                                    <p className="text-slate-600 whitespace-pre-line">{nation.football_history}</p>
                                </CardContent>
                            </Card>
                        )}

                            {/* All Clubs */}
                                          <Card className="border-0 shadow-sm">
                                              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                                                  <CardTitle className="text-lg">All Clubs</CardTitle>
                                                  <div className="flex gap-1">
                                                      <Link to={createPageUrl(`NationClubs?id=${nationId}`)}>
                                                          <Button size="sm" variant="outline">View All</Button>
                                                      </Link>
                                                      <Link to={createPageUrl(`AddClub?nation_id=${nationId}`)}>
                                                          <Button size="sm" variant="ghost">
                                                              <Plus className="w-4 h-4" />
                                                          </Button>
                                                      </Link>
                                                  </div>
                                          </CardHeader>
                            <CardContent>
                                {clubs.length === 0 ? (
                                    <p className="text-slate-500 text-sm">No clubs added yet</p>
                                ) : (
                                    <div className="space-y-2 max-h-96 overflow-y-auto">
                                        {clubs.slice(0, 20).map(club => (
                                            <Link 
                                                key={club.id} 
                                                to={createPageUrl(`ClubDetail?id=${club.id}`)}
                                                className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 transition-colors"
                                            >
                                                {club.logo_url ? (
                                                    <img src={club.logo_url} alt={club.name} className="w-8 h-8 object-contain" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                                                        <Shield className="w-4 h-4 text-slate-400" />
                                                    </div>
                                                )}
                                                <span className="font-medium text-sm text-slate-700 truncate">{club.name}</span>
                                                {nation.flag_url && (
                                                    <img src={nation.flag_url} alt={nation.name} className="w-5 h-3 object-contain ml-auto" />
                                                )}
                                            </Link>
                                        ))}
                                        {clubs.length > 20 && (
                                            <p className="text-sm text-slate-500 text-center py-2">
                                                + {clubs.length - 20} more clubs
                                            </p>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
                    </TabsContent>

                    <TabsContent value="geo-stats">
                        <NationGeographyTab
                            nation={nation}
                            clubs={clubs}
                            leagueTables={leagueTables}
                            leagues={leagues}
                        />
                    </TabsContent>

                    <TabsContent value="eras">
                        <DominantEraTimeline 
                            clubs={clubs}
                            leagueTables={leagueTables}
                        />
                    </TabsContent>

                    <TabsContent value="flow">
                        <LeaguePyramidFlow 
                            clubs={clubs}
                            leagueTables={leagueTables}
                            leagues={leagues}
                        />
                    </TabsContent>

                    <TabsContent value="analytics">
                        <NationAnalyticsDashboard 
                            nation={nation}
                            leagues={leagues}
                            clubs={allNationClubs}
                            seasons={seasons}
                            leagueTables={leagueTables}
                            domesticCups={domesticCups}
                            domesticCupSeasons={cupSeasons}
                            players={nationalPlayers}
                        />
                    </TabsContent>
                </Tabs>
            </div>

            {/* Edit Dialog */}
            <Dialog open={isEditing} onOpenChange={setIsEditing}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Nation</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                        <div className="flex justify-center">
                            <ImageUploaderWithColors
                                currentImage={editData.flag_url}
                                onUpload={(url) => setEditData({...editData, flag_url: url})}
                                primaryColor={editData.primary_color}
                                secondaryColor={editData.secondary_color}
                                onColorsChange={(primary, secondary) => setEditData({...editData, primary_color: primary, secondary_color: secondary})}
                                label="Upload Flag"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Nation Name</Label>
                                <Input
                                    value={editData.name || ''}
                                    onChange={(e) => setEditData({...editData, name: e.target.value})}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label>Region</Label>
                                <Input
                                    value={editData.region || ''}
                                    onChange={(e) => setEditData({...editData, region: e.target.value})}
                                    className="mt-1"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Federation Name</Label>
                                <Input
                                    value={editData.federation_name || ''}
                                    onChange={(e) => setEditData({...editData, federation_name: e.target.value})}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label>Founded Year</Label>
                                <Input
                                    type="number"
                                    value={editData.founded_year || ''}
                                    onChange={(e) => setEditData({...editData, founded_year: e.target.value})}
                                    className="mt-1"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Capital City</Label>
                                <div className="mt-1 space-y-2">
                                    <Input
                                        value={editData.capital || ''}
                                        onChange={(e) => setEditData({...editData, capital: e.target.value})}
                                        placeholder="Type or select from settlements"
                                    />
                                    {clubs.length > 0 && (
                                        <Select 
                                            value="" 
                                            onValueChange={(value) => setEditData({...editData, capital: value})}
                                        >
                                            <SelectTrigger className="text-sm">
                                                <SelectValue placeholder="Or select existing settlement..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {[...new Set(clubs.map(c => c.settlement || c.city).filter(Boolean))].sort().map(settlement => (
                                                    <SelectItem key={settlement} value={settlement}>
                                                        {settlement} {editData.capital === settlement ? '⭐' : ''}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                </div>
                            </div>
                            <div>
                                <Label>Language</Label>
                                <Input
                                    value={editData.language || ''}
                                    onChange={(e) => setEditData({...editData, language: e.target.value})}
                                    className="mt-1"
                                    placeholder="Will be auto-generated if empty"
                                />
                            </div>
                        </div>
                        <div>
                            <Label>Description</Label>
                            <Textarea
                                value={editData.description || ''}
                                onChange={(e) => setEditData({...editData, description: e.target.value})}
                                rows={3}
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label>Football History</Label>
                            <Textarea
                                value={editData.football_history || ''}
                                onChange={(e) => setEditData({...editData, football_history: e.target.value})}
                                rows={5}
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label>Continental Membership</Label>
                            <Select value={editData.membership || ''} onValueChange={(value) => setEditData({...editData, membership: value})}>
                                <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Select membership type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="VCC">VCC - Full Member</SelectItem>
                                    <SelectItem value="CCC">CCC - Associate Member</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>Naming Convention Styles (select up to 4)</Label>
                            <div className="grid grid-cols-2 gap-2 mt-2 p-3 bg-slate-50 rounded-lg max-h-64 overflow-y-auto">
                                {[
                                    'English/British', 'American', 'Spanish', 'Italian', 'German', 'French', 'Portuguese',
                                    'Dutch', 'Swiss', 'Austrian', 'Scandinavian', 'Eastern European', 'Balkan', 
                                    'Polish', 'Czech', 'Hungarian', 'Slovakian', 'Turkish',
                                    'Arabic', 'North African', 'West African', 'East African', 'South African', 
                                    'Brazilian', 'Central American', 'Caribbean',
                                    'Central Asian', 'South East Asian', 'East Asian', 'Celtic', 'Nordic'
                                ].map(style => {
                                    const currentStyles = editData.naming_styles || [];
                                    const isSelected = currentStyles.includes(style);
                                    return (
                                        <label key={style} className="flex items-center gap-2 text-sm">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={(e) => {
                                                    if (e.target.checked && currentStyles.length < 4) {
                                                        setEditData({...editData, naming_styles: [...currentStyles, style]});
                                                    } else if (!e.target.checked) {
                                                        setEditData({...editData, naming_styles: currentStyles.filter(s => s !== style)});
                                                    }
                                                }}
                                                disabled={!isSelected && currentStyles.length >= 4}
                                                className="rounded"
                                            />
                                            {style}
                                        </label>
                                    );
                                })}
                            </div>
                            <p className="text-xs text-slate-500 mt-1">{(editData.naming_styles || []).length}/4 styles selected</p>
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setIsEditing(false)}>
                                <X className="w-4 h-4 mr-2" /> Cancel
                            </Button>
                            <Button onClick={handleSave} disabled={updateMutation.isPending} className="text-white" style={{ backgroundColor: nationTheme.ui }}>
                                {updateMutation.isPending ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                                ) : (
                                    <><Save className="w-4 h-4 mr-2" /> Save Changes</>
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}