import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Plus, Trophy, Shield, Edit2, Trash2, ChevronRight, Save, X, Loader2, Star, Award, MapPin, Layers } from 'lucide-react';
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
import GoldenEras from '@/components/nations/GoldenEras';
import AdminOnly from '@/components/common/AdminOnly';
import AINationEnhancer from '@/components/nations/AINationEnhancer';
import ImmersiveNationContent from '@/components/nations/ImmersiveNationContent';
import LeaguePyramid from '@/components/nations/LeaguePyramid';
import EnhancedLeaguePyramid from '@/components/nations/EnhancedLeaguePyramid';
import NationStats from '@/components/nations/NationStats';
import { useNavigate } from 'react-router-dom';

export default function NationDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    const nationId = urlParams.get('id');
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({});

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

    const { data: clubs = [] } = useQuery({
        queryKey: ['clubs', nationId],
        queryFn: () => base44.entities.Club.filter({ nation_id: nationId }, 'name'),
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

    const coefficient = coefficients.find(c => c.nation_id === nationId);

    const { data: nationalPlayers = [] } = useQuery({
        queryKey: ['nationalSquadPlayers', nation?.name],
        queryFn: () => base44.entities.Player.filter({ nationality: nation.name }),
        enabled: !!nation?.name,
    });

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

    // Group leagues by tier
    const leaguesByTier = leagues.reduce((acc, league) => {
        const tier = league.tier || 1;
        if (!acc[tier]) acc[tier] = [];
        acc[tier].push(league);
        return acc;
    }, {});

    // Build custom header style if nation has colors
    const headerStyle = nation.primary_color ? {
        background: `linear-gradient(135deg, ${nation.primary_color}, ${nation.secondary_color || nation.primary_color}90)`
    } : null;

    return (
        <div className="min-h-screen bg-slate-50">
            {headerStyle ? (
                <div className="relative overflow-hidden" style={headerStyle}>
                    <div className="absolute inset-0 bg-black/20" />
                    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
                        <nav className="flex items-center gap-2 text-sm text-white/70 mb-6">
                            <Link to={createPageUrl('Home')} className="hover:text-white">Volaria</Link>
                            <ChevronRight className="w-4 h-4" />
                            <Link to={createPageUrl('Nations')} className="hover:text-white">Nations</Link>
                            <ChevronRight className="w-4 h-4" />
                            <span className="text-white">{nation.name}</span>
                        </nav>
                        <div className="flex items-center gap-6">
                            {nation.flag_url && (
                                <div className="hidden sm:block w-24 h-24 md:w-32 md:h-32 bg-white rounded-2xl p-3 shadow-2xl">
                                    <img src={nation.flag_url} alt={nation.name} className="w-full h-full object-contain" />
                                </div>
                            )}
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight">{nation.name}</h1>
                                    {nation.membership && (
                                        <Badge className={nation.membership === 'VCC' ? 'bg-amber-500 text-white' : 'bg-blue-500 text-white'}>
                                            {nation.membership === 'VCC' ? 'Full Member' : 'Associate'}
                                        </Badge>
                                    )}
                                </div>
                                {(nation.description || nation.federation_name) && (
                                    <p className="mt-3 text-lg text-white/80 max-w-2xl">{nation.description || nation.federation_name}</p>
                                )}
                            </div>
                            <AdminOnly>
                                <div className="flex gap-2">
                                    <Button variant="outline" className="border-white/30 text-white hover:bg-white/10" onClick={handleEdit}>
                                        <Edit2 className="w-4 h-4 mr-2" /> Edit
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="outline" className="border-red-400/50 text-red-300 hover:bg-red-500/20"><Trash2 className="w-4 h-4" /></Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Delete {nation.name}?</AlertDialogTitle>
                                                <AlertDialogDescription>This will permanently delete this nation.</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-red-600">Delete</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </AdminOnly>
                        </div>
                    </div>
                </div>
            ) : (
            <PageHeader 
                title={nation.name}
                subtitle={nation.description || nation.federation_name}
                image={nation.flag_url}
                breadcrumbs={[
                    { label: 'Nations', url: createPageUrl('Nations') },
                    { label: nation.name }
                ]}
            >
                <AdminOnly>
                    <div className="flex gap-2">
                        <Button variant="outline" className="border-white/30 text-white hover:bg-white/10" onClick={handleEdit}>
                            <Edit2 className="w-4 h-4 mr-2" />
                            Edit
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="outline" className="border-red-400/50 text-red-300 hover:bg-red-500/20">
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Delete {nation.name}?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will permanently delete this nation. This action cannot be undone.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-red-600 hover:bg-red-700">
                                        Delete
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </AdminOnly>
            </PageHeader>
            )}

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Nation Stats */}
                <NationStats nation={nation} clubs={clubs} leagues={leagues} coefficient={coefficient} />

                {/* Quick Access Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-8">
                    {/* Top League */}
                    {leagues.filter(l => l.tier === 1)[0] && (
                        <Link to={createPageUrl(`LeagueDetail?id=${leagues.filter(l => l.tier === 1)[0].id}`)}>
                            <Card className="border-0 shadow-sm hover:shadow-lg transition-all h-full bg-gradient-to-br from-amber-50 to-orange-50 group cursor-pointer">
                                <CardContent className="p-5">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center">
                                            <Trophy className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-amber-600 font-medium">Top Division</p>
                                            <h3 className="font-bold text-slate-900 group-hover:text-amber-700">{leagues.filter(l => l.tier === 1)[0].name}</h3>
                                        </div>
                                    </div>
                                    {leagues.filter(l => l.tier === 1)[0].current_champion && (
                                        <p className="text-sm text-slate-600">
                                            🏆 Champion: <span className="font-medium text-emerald-600">{leagues.filter(l => l.tier === 1)[0].current_champion}</span>
                                        </p>
                                    )}
                                    <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                                        View league <ChevronRight className="w-3 h-3" />
                                    </p>
                                </CardContent>
                            </Card>
                        </Link>
                    )}

                    {/* Best Club */}
                    {(() => {
                        const bestClub = clubs
                            .map(c => ({ ...c, score: (c.league_titles || 0) * 3 + (c.vcc_titles || 0) * 5 + (c.ccc_titles || 0) * 3 + (c.domestic_cup_titles || 0) }))
                            .filter(c => c.score > 0)
                            .sort((a, b) => b.score - a.score)[0];
                        if (!bestClub) return null;
                        return (
                            <Link to={createPageUrl(`ClubDetail?id=${bestClub.id}`)}>
                                <Card className="border-0 shadow-sm hover:shadow-lg transition-all h-full bg-gradient-to-br from-blue-50 to-indigo-50 group cursor-pointer">
                                    <CardContent className="p-5">
                                        <div className="flex items-center gap-3 mb-3">
                                            {bestClub.logo_url ? (
                                                <img src={bestClub.logo_url} alt={bestClub.name} className="w-10 h-10 object-contain" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
                                                    <Shield className="w-5 h-5 text-white" />
                                                </div>
                                            )}
                                            <div>
                                                <p className="text-xs text-blue-600 font-medium">Most Successful Club</p>
                                                <h3 className="font-bold text-slate-900 group-hover:text-blue-700">{bestClub.name}</h3>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm text-slate-600">
                                            {bestClub.league_titles > 0 && <span>🏆 {bestClub.league_titles} titles</span>}
                                            {bestClub.vcc_titles > 0 && <span className="text-amber-600">⭐ {bestClub.vcc_titles} VCC</span>}
                                        </div>
                                        <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                                            View club <ChevronRight className="w-3 h-3" />
                                        </p>
                                    </CardContent>
                                </Card>
                            </Link>
                        );
                    })()}

                    {/* All Clubs Link */}
                    <Link to={createPageUrl(`NationClubs?id=${nationId}`)}>
                        <Card className="border-0 shadow-sm hover:shadow-lg transition-all h-full bg-gradient-to-br from-emerald-50 to-teal-50 group cursor-pointer">
                            <CardContent className="p-5">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center">
                                        <Shield className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-emerald-600 font-medium">Browse All</p>
                                        <h3 className="font-bold text-slate-900 group-hover:text-emerald-700">{clubs.length} Clubs</h3>
                                    </div>
                                </div>
                                <p className="text-sm text-slate-600">Explore all clubs in {nation.name}</p>
                                <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
                                    View all clubs <ChevronRight className="w-3 h-3" />
                                </p>
                            </CardContent>
                        </Card>
                    </Link>
                </div>

                {/* Tabs for main content */}
                <Tabs defaultValue="overview" className="mt-6">
                    <TabsList className="mb-6">
                        <TabsTrigger value="overview" className="flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            Overview
                        </TabsTrigger>
                        <TabsTrigger value="pyramid" className="flex items-center gap-2">
                            <Layers className="w-4 h-4" />
                            League Pyramid
                        </TabsTrigger>
                        <TabsTrigger value="national-squad" className="flex items-center gap-2">
                            <Trophy className="w-4 h-4" />
                            National Squad
                        </TabsTrigger>
                        <TabsTrigger value="details" className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            Nation Details
                        </TabsTrigger>
                        <TabsTrigger value="clubs" className="flex items-center gap-2">
                            <Star className="w-4 h-4" />
                            Most Successful
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="pyramid">
                        <EnhancedLeaguePyramid leagues={leagues} seasons={seasons} clubs={clubs} />
                    </TabsContent>

                    <TabsContent value="national-squad">
                        {(() => {
                            // Pick top 2 per position based on overall + potential
                            const positions = {
                                GK: nationalPlayers.filter(p => p.position === 'GK'),
                                DEF: nationalPlayers.filter(p => ['CB', 'LB', 'RB'].includes(p.position)),
                                MID: nationalPlayers.filter(p => ['CDM', 'CM', 'CAM'].includes(p.position)),
                                FWD: nationalPlayers.filter(p => ['LW', 'RW', 'ST'].includes(p.position))
                            };

                            const squad = {};
                            Object.keys(positions).forEach(pos => {
                                squad[pos] = positions[pos]
                                    .sort((a, b) => (b.overall_rating + b.potential) - (a.overall_rating + a.potential))
                                    .slice(0, pos === 'DEF' ? 8 : pos === 'MID' ? 8 : pos === 'GK' ? 3 : 5);
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
                                                            const club = clubs.find(c => c.id === player.club_id);
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
                                                                        <Link to={createPageUrl(`ClubDetail?id=${club.id}`)} className="flex items-center gap-2 hover:text-emerald-600">
                                                                            {club.logo_url && <img src={club.logo_url} alt={club.name} className="w-8 h-8 object-contain" />}
                                                                            <span className="text-sm font-medium hidden md:block">{club.name}</span>
                                                                        </Link>
                                                                    )}
                                                                    <div className="flex gap-3">
                                                                        <div className="text-center">
                                                                            <div className="text-lg font-bold text-emerald-600">{player.overall_rating}</div>
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
                                                                    <Badge className="bg-purple-500 text-white text-xs">{club.vcc_titles} VCC</Badge>
                                                                )}
                                                                {club.ccc_titles > 0 && (
                                                                    <Badge className="bg-blue-500 text-white text-xs">{club.ccc_titles} CCC</Badge>
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
                                <div className="text-lg font-bold text-emerald-600">{nation.region}</div>
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
                                    <Button className="bg-emerald-600 hover:bg-emerald-700">
                                        <Plus className="w-4 h-4 mr-2" />
                                        Add League
                                    </Button>
                                </Link>
                            </AdminOnly>
                        </div>

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
                                                                <p className="text-sm text-emerald-600">🏆 {cup.current_champion}</p>
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

                        {Object.keys(leaguesByTier).length === 0 ? (
                            <Card className="border-dashed border-2 border-slate-300">
                                <CardContent className="flex flex-col items-center justify-center py-12">
                                    <Trophy className="w-12 h-12 text-slate-300 mb-4" />
                                    <h3 className="text-lg font-semibold text-slate-700 mb-2">No Leagues Yet</h3>
                                    <p className="text-slate-500 mb-4">Start building the league structure</p>
                                    <Link to={createPageUrl(`AddLeague?nation_id=${nationId}`)}>
                                        <Button>Add First League</Button>
                                    </Link>
                                </CardContent>
                            </Card>
                        ) : (
                            Object.entries(leaguesByTier).sort(([a], [b]) => a - b).map(([tier, tierLeagues]) => (
                                <div key={tier}>
                                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
                                        {tier === '1' ? 'Top Division' : `Tier ${tier}`}
                                    </h3>
                                    <div className="space-y-3">
                                        {tierLeagues.map(league => {
                                            const leagueClubs = clubs.filter(c => c.league_id === league.id);
                                            return (
                                                <Link 
                                                    key={league.id} 
                                                    to={createPageUrl(`LeagueDetail?id=${league.id}`)}
                                                    className="block"
                                                >
                                                    <Card className="border-0 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
                                                        <CardContent className="p-4 flex items-center gap-4">
                                                            {league.logo_url ? (
                                                                <img 
                                                                    src={league.logo_url} 
                                                                    alt={league.name}
                                                                    className="w-14 h-14 object-contain rounded-lg bg-slate-100 p-2"
                                                                />
                                                            ) : (
                                                                <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center">
                                                                    <Trophy className="w-6 h-6 text-amber-600" />
                                                                </div>
                                                            )}
                                                            <div className="flex-1">
                                                                <h4 className="font-bold text-slate-900">{league.name}</h4>
                                                                <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
                                                                    <span>{leagueClubs.length} clubs</span>
                                                                    {league.current_champion && (
                                                                        <span className="text-emerald-600">
                                                                            🏆 {league.current_champion}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <ChevronRight className="w-5 h-5 text-slate-400" />
                                                        </CardContent>
                                                    </Card>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))
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
                            <Button onClick={handleSave} disabled={updateMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700">
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