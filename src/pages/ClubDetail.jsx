import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Shield, Edit2, Trash2, ChevronRight, Save, X, Loader2, MapPin, Users, Calendar, Trophy, TrendingUp, TrendingDown, Target, Star, Award, Plus } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ImageUploaderWithColors from '@/components/common/ImageUploaderWithColors';
import LeagueHistoryChart from '@/components/clubs/LeagueHistoryChart';
import ClubNarratives from '@/components/clubs/ClubNarratives';
import ClubHistory from '@/components/clubs/ClubHistory';
import RivalryTracker from '@/components/clubs/RivalryTracker';
import DynastyTracker from '@/components/clubs/DynastyTracker';
import AdminOnly from '@/components/common/AdminOnly';
import StabilityBadge from '@/components/stability/StabilityBadge';
import ClubInfrastructure from '@/components/clubs/ClubInfrastructure';
import ProfessionalStatusBadge from '@/components/clubs/ProfessionalStatusBadge';
import AIKitGenerator from '@/components/clubs/AIKitGenerator';
import ColorExtractor from '@/components/common/ColorExtractor';
import ImmersiveHeader from '@/components/common/ImmersiveHeader';
import StatsCard from '@/components/common/StatsCard';
import ThemedCard from '@/components/common/ThemedCard';
import AIPlayerGenerator from '@/components/players/AIPlayerGenerator';
import PlayerProfile from '@/components/players/PlayerProfile';
import UpdatePlayerImages from '@/components/players/UpdatePlayerImages';
import ClubAnalytics from '@/components/clubs/ClubAnalytics';
import ClubAnalyticsDashboard from '@/components/clubs/ClubAnalyticsDashboard';

export default function ClubDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    const clubId = urlParams.get('id');
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({});

    const { data: club } = useQuery({
        queryKey: ['club', clubId],
        queryFn: async () => {
            const clubs = await base44.entities.Club.filter({ id: clubId });
            return clubs[0];
        },
        enabled: !!clubId,
    });

    const { data: nation } = useQuery({
        queryKey: ['nation', club?.nation_id],
        queryFn: async () => {
            const nations = await base44.entities.Nation.filter({ id: club.nation_id });
            return nations[0];
        },
        enabled: !!club?.nation_id,
    });

    const { data: league } = useQuery({
        queryKey: ['league', club?.league_id],
        queryFn: async () => {
            const leagues = await base44.entities.League.filter({ id: club.league_id });
            return leagues[0];
        },
        enabled: !!club?.league_id,
    });

    const { data: leagues = [] } = useQuery({
        queryKey: ['leaguesByNation', club?.nation_id],
        queryFn: () => base44.entities.League.filter({ nation_id: club.nation_id }),
        enabled: !!club?.nation_id,
    });

    const { data: clubSeasons = [] } = useQuery({
        queryKey: ['clubSeasons', clubId],
        queryFn: () => base44.entities.LeagueTable.filter({ club_id: clubId }, '-year'),
        enabled: !!clubId,
    });

    const { data: allLeagues = [] } = useQuery({
        queryKey: ['allLeagues'],
        queryFn: () => base44.entities.League.list(),
    });

    const { data: allClubs = [] } = useQuery({
        queryKey: ['allClubsForPredecessor', club?.nation_id],
        queryFn: () => base44.entities.Club.filter({ nation_id: club.nation_id }),
        enabled: !!club?.nation_id,
    });

    // Fetch all league tables for dynamic rivalry detection
    const { data: allNationLeagueTables = [] } = useQuery({
        queryKey: ['allNationLeagueTables', club?.nation_id],
        queryFn: async () => {
            const nationLeagues = await base44.entities.League.filter({ nation_id: club.nation_id });
            const leagueIds = nationLeagues.map(l => l.id);
            const tables = await base44.entities.LeagueTable.list();
            return tables.filter(t => leagueIds.includes(t.league_id));
        },
        enabled: !!club?.nation_id,
    });

    // Fetch predecessor club data if exists
    const { data: predecessorClub } = useQuery({
        queryKey: ['predecessorClub', club?.predecessor_club_id],
        queryFn: async () => {
            const clubs = await base44.entities.Club.filter({ id: club.predecessor_club_id });
            return clubs[0];
        },
        enabled: !!club?.predecessor_club_id,
    });

    // Fetch second predecessor club data if exists (merger)
    const { data: predecessorClub2 } = useQuery({
        queryKey: ['predecessorClub2', club?.predecessor_club_2_id],
        queryFn: async () => {
            const clubs = await base44.entities.Club.filter({ id: club.predecessor_club_2_id });
            return clubs[0];
        },
        enabled: !!club?.predecessor_club_2_id,
    });

    // Fetch predecessor's seasons
    const { data: predecessorSeasons = [] } = useQuery({
        queryKey: ['predecessorSeasons', club?.predecessor_club_id],
        queryFn: () => base44.entities.LeagueTable.filter({ club_id: club.predecessor_club_id }, '-year'),
        enabled: !!club?.predecessor_club_id,
    });

    // Fetch second predecessor's seasons
    const { data: predecessorSeasons2 = [] } = useQuery({
        queryKey: ['predecessorSeasons2', club?.predecessor_club_2_id],
        queryFn: () => base44.entities.LeagueTable.filter({ club_id: club.predecessor_club_2_id }, '-year'),
        enabled: !!club?.predecessor_club_2_id,
    });

    // Fetch successor club if this is defunct
    const { data: successorClub } = useQuery({
        queryKey: ['successorClub', club?.successor_club_id],
        queryFn: async () => {
            const clubs = await base44.entities.Club.filter({ id: club.successor_club_id });
            return clubs[0];
        },
        enabled: !!club?.successor_club_id,
    });

    // Fetch former name club data if exists
    const { data: formerNameClub } = useQuery({
        queryKey: ['formerNameClub', club?.former_name_club_id],
        queryFn: async () => {
            const clubs = await base44.entities.Club.filter({ id: club.former_name_club_id });
            return clubs[0];
        },
        enabled: !!club?.former_name_club_id,
    });

    // Fetch second former name club data if exists
    const { data: formerNameClub2 } = useQuery({
        queryKey: ['formerNameClub2', club?.former_name_club_2_id],
        queryFn: async () => {
            const clubs = await base44.entities.Club.filter({ id: club.former_name_club_2_id });
            return clubs[0];
        },
        enabled: !!club?.former_name_club_2_id,
    });

    // Fetch former name club's seasons
    const { data: formerNameSeasons = [] } = useQuery({
        queryKey: ['formerNameSeasons', club?.former_name_club_id],
        queryFn: () => base44.entities.LeagueTable.filter({ club_id: club.former_name_club_id }, '-year'),
        enabled: !!club?.former_name_club_id,
    });

    // Fetch second former name club's seasons
    const { data: formerNameSeasons2 = [] } = useQuery({
        queryKey: ['formerNameSeasons2', club?.former_name_club_2_id],
        queryFn: () => base44.entities.LeagueTable.filter({ club_id: club.former_name_club_2_id }, '-year'),
        enabled: !!club?.former_name_club_2_id,
    });

    // Fetch players for Squad tab
    const { data: players = [] } = useQuery({
        queryKey: ['players', clubId],
        queryFn: () => base44.entities.Player.filter({ club_id: clubId }),
        enabled: !!clubId,
    });

    // Fetch current name club if this is a former name record
    const { data: currentNameClub } = useQuery({
        queryKey: ['currentNameClub', club?.current_name_club_id],
        queryFn: async () => {
            const clubs = await base44.entities.Club.filter({ id: club.current_name_club_id });
            return clubs[0];
        },
        enabled: !!club?.current_name_club_id,
    });

    // Combine seasons from current club, predecessors, and former names
    const combinedSeasons = [...clubSeasons, ...predecessorSeasons, ...predecessorSeasons2, ...formerNameSeasons, ...formerNameSeasons2].sort((a, b) => b.year.localeCompare(a.year));

    // Calculate club average OVR from squad
    const clubAverageOVR = React.useMemo(() => {
        const seniorPlayers = players.filter(p => !p.is_youth_player && p.overall_rating);
        if (seniorPlayers.length === 0) return null;
        const avgOVR = seniorPlayers.reduce((sum, p) => sum + p.overall_rating, 0) / seniorPlayers.length;
        return Math.round(avgOVR);
    }, [players]);

    // Combine stats from former name clubs (same club, just renamed)
    const combinedStats = React.useMemo(() => {
        if (!club) return null;
        const former = formerNameClub || {};
        const former2 = formerNameClub2 || {};
        
        // Helper to combine comma-separated year strings
        const combineYears = (...yearStrings) => {
            const years = yearStrings.flatMap(y => y?.split(',').map(s => s.trim()).filter(Boolean) || []);
            return years.length > 0 ? [...new Set(years)].sort().join(', ') : null;
        };

        // Helper to sum numbers
        const sum = (...nums) => nums.reduce((a, b) => (a || 0) + (b || 0), 0);

        return {
            league_titles: sum(club.league_titles, former.league_titles, former2.league_titles),
            title_years: combineYears(club.title_years, former.title_years, former2.title_years),
            lower_tier_titles: sum(club.lower_tier_titles, former.lower_tier_titles, former2.lower_tier_titles),
            lower_tier_title_years: combineYears(club.lower_tier_title_years, former.lower_tier_title_years, former2.lower_tier_title_years),
            seasons_played: sum(club.seasons_played, former.seasons_played, former2.seasons_played),
            seasons_top_flight: sum(club.seasons_top_flight, former.seasons_top_flight, former2.seasons_top_flight),
            promotions: sum(club.promotions, former.promotions, former2.promotions),
            relegations: sum(club.relegations, former.relegations, former2.relegations),
            total_wins: sum(club.total_wins, former.total_wins, former2.total_wins),
            total_draws: sum(club.total_draws, former.total_draws, former2.total_draws),
            total_losses: sum(club.total_losses, former.total_losses, former2.total_losses),
            total_goals_scored: sum(club.total_goals_scored, former.total_goals_scored, former2.total_goals_scored),
            total_goals_conceded: sum(club.total_goals_conceded, former.total_goals_conceded, former2.total_goals_conceded),
            vcc_titles: sum(club.vcc_titles, former.vcc_titles, former2.vcc_titles),
            vcc_title_years: combineYears(club.vcc_title_years, former.vcc_title_years, former2.vcc_title_years),
            vcc_runner_up: sum(club.vcc_runner_up, former.vcc_runner_up, former2.vcc_runner_up),
            vcc_appearances: sum(club.vcc_appearances, former.vcc_appearances, former2.vcc_appearances),
            ccc_titles: sum(club.ccc_titles, former.ccc_titles, former2.ccc_titles),
            ccc_title_years: combineYears(club.ccc_title_years, former.ccc_title_years, former2.ccc_title_years),
            ccc_runner_up: sum(club.ccc_runner_up, former.ccc_runner_up, former2.ccc_runner_up),
            ccc_appearances: sum(club.ccc_appearances, former.ccc_appearances, former2.ccc_appearances),
            // For best finishes, use the best one across all records
            best_finish: [club.best_finish, former.best_finish, former2.best_finish].filter(Boolean).sort((a, b) => a - b)[0] || null,
            best_finish_tier: (() => {
                const finishes = [
                    { finish: club.best_finish, tier: club.best_finish_tier },
                    { finish: former.best_finish, tier: former.best_finish_tier },
                    { finish: former2.best_finish, tier: former2.best_finish_tier }
                ].filter(f => f.finish);
                if (finishes.length === 0) return null;
                finishes.sort((a, b) => a.finish - b.finish);
                return finishes[0].tier;
            })(),
            best_finish_year: (() => {
                const finishes = [
                    { finish: club.best_finish, year: club.best_finish_year },
                    { finish: former.best_finish, year: former.best_finish_year },
                    { finish: former2.best_finish, year: former2.best_finish_year }
                ].filter(f => f.finish);
                if (finishes.length === 0) return null;
                finishes.sort((a, b) => a.finish - b.finish);
                return finishes[0].year;
            })(),
            vcc_best_finish: club.vcc_best_finish || former.vcc_best_finish || former2.vcc_best_finish,
            vcc_best_finish_year: club.vcc_best_finish_year || former.vcc_best_finish_year || former2.vcc_best_finish_year,
            ccc_best_finish: club.ccc_best_finish || former.ccc_best_finish || former2.ccc_best_finish,
            ccc_best_finish_year: club.ccc_best_finish_year || former.ccc_best_finish_year || former2.ccc_best_finish_year,
            // Domestic cup stats
            domestic_cup_titles: sum(club.domestic_cup_titles, former.domestic_cup_titles, former2.domestic_cup_titles),
            domestic_cup_title_years: combineYears(club.domestic_cup_title_years, former.domestic_cup_title_years, former2.domestic_cup_title_years),
            domestic_cup_runner_up: sum(club.domestic_cup_runner_up, former.domestic_cup_runner_up, former2.domestic_cup_runner_up),
            domestic_cup_best_finish: club.domestic_cup_best_finish || former.domestic_cup_best_finish || former2.domestic_cup_best_finish,
            domestic_cup_best_finish_year: club.domestic_cup_best_finish_year || former.domestic_cup_best_finish_year || former2.domestic_cup_best_finish_year,
        };
    }, [club, formerNameClub, formerNameClub2]);

    const updateMutation = useMutation({
        mutationFn: (data) => base44.entities.Club.update(clubId, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['club', clubId]);
            setIsEditing(false);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: () => base44.entities.Club.delete(clubId),
        onSuccess: () => {
            queryClient.invalidateQueries(['clubs']);
            navigate(createPageUrl('Nations'));
        },
    });

    const handleEdit = () => {
        setEditData(club);
        setIsEditing(true);
    };

    const handleSave = () => {
        const submitData = {
            ...editData,
            founded_year: editData.founded_year ? parseInt(editData.founded_year) : null,
            stadium_capacity: editData.stadium_capacity ? parseInt(editData.stadium_capacity) : null,
        };
        // Only include logo_url if it has a value (don't send null to clear it unintentionally)
        if (editData.logo_url !== undefined) {
            submitData.logo_url = editData.logo_url || null;
        }
        updateMutation.mutate(submitData);
    };

    if (!club) {
        return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Immersive Hero with Larger Crest */}
            <div 
                className="relative overflow-hidden"
                style={{
                    background: club.primary_color 
                        ? `linear-gradient(135deg, ${club.primary_color}e6, ${club.secondary_color || club.primary_color}b3, ${club.accent_color || club.primary_color}80)`
                        : 'linear-gradient(to br, rgb(15 23 42), rgb(30 41 59), rgb(15 23 42))'
                }}
            >
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                    <div 
                        className="w-full h-full"
                        style={{
                            backgroundImage: club.pattern_preference === 'vertical_stripes' 
                                ? `repeating-linear-gradient(90deg, ${club.primary_color || '#ffffff'}30 0px, ${club.primary_color || '#ffffff'}30 20px, transparent 20px, transparent 40px)`
                                : club.pattern_preference === 'horizontal_hoops'
                                ? `repeating-linear-gradient(0deg, ${club.primary_color || '#ffffff'}30 0px, ${club.primary_color || '#ffffff'}30 20px, transparent 20px, transparent 40px)`
                                : undefined
                        }}
                    />
                </div>
                
                {/* Dark overlay for readability */}
                <div className="absolute inset-0 bg-black/30" />
                
                {/* Content */}
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    {/* Breadcrumbs */}
                    <nav className="flex items-center gap-2 text-sm text-slate-400 mb-6">
                        <Link to={createPageUrl('Nations')} className="hover:text-white transition-colors">Nations</Link>
                        <ChevronRight className="w-4 h-4" />
                        {nation && (
                            <>
                                <Link to={createPageUrl(`NationDetail?id=${nation.id}`)} className="hover:text-white transition-colors">{nation.name}</Link>
                                <ChevronRight className="w-4 h-4" />
                            </>
                        )}
                        {league && (
                            <>
                                <Link to={createPageUrl(`LeagueDetail?id=${league.id}`)} className="hover:text-white transition-colors">{league.name}</Link>
                                <ChevronRight className="w-4 h-4" />
                            </>
                        )}
                        <span className="text-white">{club.name}</span>
                    </nav>

                    {/* Main Header Content */}
                    <div className="flex flex-col md:flex-row items-center gap-8 mb-8">
                        {/* Large Club Crest */}
                        <div className="relative flex flex-col items-center">
                            <div 
                                className="w-48 h-48 md:w-64 md:h-64 bg-white rounded-3xl shadow-2xl p-6 flex items-center justify-center"
                                style={{
                                    borderColor: club.accent_color || club.primary_color,
                                    borderWidth: '4px',
                                    borderStyle: 'solid'
                                }}
                            >
                                {club.logo_url ? (
                                    <img src={club.logo_url} alt={club.name} className="w-full h-full object-contain" />
                                ) : (
                                    <Shield className="w-32 h-32 text-slate-300" />
                                )}
                            </div>
                            
                            {/* Nation Flag & Name */}
                            {nation && (
                                <Link 
                                    to={createPageUrl(`NationDetail?id=${nation.id}`)}
                                    className="flex flex-col items-center gap-2 mt-4 group"
                                >
                                    {nation.flag_url && (
                                        <img 
                                            src={nation.flag_url} 
                                            alt={nation.name} 
                                            className="w-16 h-10 object-contain rounded-lg shadow-lg border-2 border-white/50 group-hover:border-white transition-all"
                                        />
                                    )}
                                    <span className="text-white/90 font-medium text-sm group-hover:text-white transition-colors">
                                        {nation.name}
                                    </span>
                                </Link>
                            )}
                        </div>

                        {/* Club Info */}
                        <div className="flex-1 text-center md:text-left">
                            <h1 
                                className="text-4xl md:text-6xl font-bold text-white mb-3 tracking-tight"
                                style={{
                                    fontFamily: club.text_style === 'classic' ? 'Georgia, serif' : club.text_style === 'bold' ? 'Impact, sans-serif' : undefined
                                }}
                            >
                                {club.name}
                            </h1>
                            {club.nickname && (
                                <p className="text-xl text-white/80 italic mb-4">"{club.nickname}"</p>
                            )}
                            <div className="flex flex-col items-center md:items-start gap-3">
                                {/* Badges */}
                                <div className="flex items-center gap-2">
                                    {nation?.name === 'Turuliand' && league?.tier <= 4 && (
                                        <span className="px-2 py-1 bg-white/20 rounded text-xs font-bold text-white border border-white/30">TFA</span>
                                    )}
                                    {club.professional_status && <ProfessionalStatusBadge status={club.professional_status} size="small" />}
                                    {club.stability_points !== undefined && <StabilityBadge points={club.stability_points} status={club.stability_status} iconOnly={true} />}
                                </div>
                                {/* Location */}
                                {(club.settlement || club.district || club.region || club.city) && (
                                    <div className="flex items-center gap-2 text-white/80 flex-wrap text-sm">
                                        <MapPin className="w-4 h-4" />
                                        {club.settlement && <Link to={createPageUrl(`LocationDetail?name=${encodeURIComponent(club.settlement)}&type=settlement&nation_id=${club.nation_id}`)} className="hover:text-white hover:underline">{club.settlement}</Link>}
                                        {club.settlement && club.district && <span className="text-white/50">•</span>}
                                        {club.district && <Link to={createPageUrl(`LocationDetail?name=${encodeURIComponent(club.district)}&type=district&nation_id=${club.nation_id}`)} className="hover:text-white hover:underline">{club.district}</Link>}
                                        {(club.settlement || club.district) && club.region && <span className="text-white/50">•</span>}
                                        {club.region && <Link to={createPageUrl(`LocationDetail?name=${encodeURIComponent(club.region)}&type=region&nation_id=${club.nation_id}`)} className="hover:text-white hover:underline">{club.region}</Link>}
                                        {!club.settlement && !club.district && !club.region && club.city && <span>{club.city}</span>}
                                    </div>
                                )}
                                {/* Kit Display */}
                                {club.primary_color && (
                                    <AdminOnly>
                                        <AIKitGenerator 
                                            club={club} 
                                            onKitsGenerated={(updatedClub) => queryClient.setQueryData(['club', clubId], updatedClub)}
                                            compact={true}
                                            nation={nation}
                                        />
                                    </AdminOnly>
                                )}
                            </div>
                        </div>
                        
                        {/* Action Buttons */}
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
                                        <AlertDialogHeader><AlertDialogTitle>Delete {club.name}?</AlertDialogTitle></AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-red-600">Delete</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </AdminOnly>
                    </div>

                    {/* Stadium Banner */}
                    {club.stadium && (
                        <div 
                            className="mt-8 p-6 rounded-2xl border-2 border-white/20 bg-white/5 backdrop-blur-sm"
                            style={{
                                borderColor: club.accent_color ? `${club.accent_color}40` : undefined
                            }}
                        >
                            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <MapPin className="w-10 h-10 text-white/80" />
                                    <div>
                                        <div className="text-sm text-white/60">Home Ground</div>
                                        <div className="text-2xl font-bold text-white">{club.stadium}</div>
                                        {club.stadium_capacity && (
                                            <div className="text-white/80">Capacity: {club.stadium_capacity.toLocaleString()}</div>
                                        )}
                                    </div>
                                </div>
                                {club.founded_year && (
                                    <div className="text-center">
                                        <div className="text-sm text-white/60">Established</div>
                                        <div className="text-3xl font-bold text-white">{club.founded_year}</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Tabs defaultValue="overview" className="space-y-6">
                    <TabsList>
                        <TabsTrigger value="overview">Club Story & Honours</TabsTrigger>
                        <TabsTrigger value="statistics">Season History</TabsTrigger>
                        <TabsTrigger value="analytics">Analytics</TabsTrigger>
                        <TabsTrigger value="rivalries">Rivalries & Dynasty</TabsTrigger>
                        <TabsTrigger value="squad">Squad ({players.filter(p => !p.is_youth_player).length})</TabsTrigger>
                        <TabsTrigger value="youth">Youth ({players.filter(p => p.is_youth_player).length})</TabsTrigger>
                        <TabsTrigger value="continental">Continental</TabsTrigger>
                        <TabsTrigger value="info">Club Info</TabsTrigger>
                    </TabsList>

                    {/* OVERVIEW TAB - Club Story, History & Honours */}
                    <TabsContent value="overview">
                {/* Stats - with subtle club theming */}
                <div 
                    id="honours" 
                    className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8 p-4 rounded-xl" 
                    style={{ backgroundColor: club.primary_color ? `${club.primary_color}05` : undefined }}
                >
                    {/* Club OVR */}
                    {clubAverageOVR && (
                        <StatsCard 
                            icon={Users} 
                            label="Squad OVR" 
                            value={clubAverageOVR} 
                            customColor={club.primary_color || '#10b981'}
                            customBg={club.primary_color ? `${club.primary_color}10` : '#d1fae5'}
                        />
                    )}
                    {/* Total Trophies */}
                    {(() => {
                        const totalTrophies = (combinedStats?.league_titles || 0) + 
                                              (combinedStats?.domestic_cup_titles || 0) + 
                                              (combinedStats?.vcc_titles || 0) + 
                                              (combinedStats?.ccc_titles || 0);
                        if (totalTrophies === 0) return null;
                        return <StatsCard 
                            icon={Star} 
                            label="Total Trophies" 
                            value={totalTrophies} 
                            customColor={club.accent_color || club.primary_color}
                            customBg={club.primary_color ? `${club.primary_color}15` : '#fef3c7'}
                            gradient
                        />;
                    })()}
                    {combinedStats?.league_titles > 0 && (
                        <StatsCard icon={Trophy} label="League Titles" value={combinedStats.league_titles} color="amber" />
                    )}
                    {combinedStats?.domestic_cup_titles > 0 && (
                        <StatsCard icon={Award} label="Cup Titles" value={combinedStats.domestic_cup_titles} color="orange" />
                    )}
                    {/* Cup Best Finish - show for all clubs that have any cup history */}
                    {(combinedStats?.domestic_cup_best_finish || combinedStats?.domestic_cup_titles > 0 || combinedStats?.domestic_cup_runner_up > 0) && (
                        <Card className="border-0 shadow-sm bg-orange-50">
                            <CardContent className="p-4 text-center">
                                <Award className="w-6 h-6 text-orange-500 mx-auto mb-2" />
                                <div className="text-lg font-bold text-orange-700">
                                    {combinedStats?.domestic_cup_titles > 0 
                                        ? 'Winner' 
                                        : combinedStats?.domestic_cup_best_finish || 'Final'}
                                </div>
                                <div className="text-xs text-orange-600">Best Cup Finish</div>
                            </CardContent>
                        </Card>
                    )}
                    {combinedStats?.best_finish && (
                                                  <Card className="border-0 shadow-sm">
                                                      <CardContent className="p-4 text-center">
                                                          <Target className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                                                          <div className="text-2xl font-bold">{combinedStats.best_finish === 1 ? '1st' : combinedStats.best_finish === 2 ? '2nd' : combinedStats.best_finish === 3 ? '3rd' : `${combinedStats.best_finish}th`}</div>
                                                          <div className="text-xs text-slate-500">
                                                              Best Finish {combinedStats.best_finish_tier ? `(Tier ${combinedStats.best_finish_tier})` : ''}
                                                          </div>
                                                      </CardContent>
                                                  </Card>
                                              )}
                                              {(() => {
                                                                      if (combinedSeasons.length === 0) return null;
                                                                      let worstFinish = null;
                                                                      let worstTier = null;
                                                                      combinedSeasons.forEach(s => {
                                                                          const tier = allLeagues.find(l => l.id === s.league_id)?.tier || 1;
                                                                          // Higher tier number = lower level, higher position number = worse finish
                                                                          // Use tier * 100 + position to find the "worst" (highest score)
                                                                          const score = tier * 100 + s.position;
                                                                          if (worstFinish === null || score > (worstTier * 100 + worstFinish)) {
                                                                              worstFinish = s.position;
                                                                              worstTier = tier;
                                                                          }
                                                                      });
                                                                      if (!worstFinish) return null;
                                                                      return (
                                                                          <Card className="border-0 shadow-sm">
                                                                              <CardContent className="p-4 text-center">
                                                                                  <TrendingDown className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                                                                                  <div className="text-2xl font-bold">{worstFinish === 1 ? '1st' : worstFinish === 2 ? '2nd' : worstFinish === 3 ? '3rd' : `${worstFinish}th`}</div>
                                                                                  <div className="text-xs text-slate-500">
                                                                                      Worst Finish (Tier {worstTier})
                                                                                  </div>
                                                                                  </CardContent>
                                                                                  </Card>
                                                                                  );
                                                                                  })()}
                    {combinedStats?.seasons_played > 0 && (
                        <Card className="border-0 shadow-sm">
                            <CardContent className="p-4 text-center">
                                <Calendar className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                                <div className="text-2xl font-bold">{combinedStats.seasons_played}</div>
                                <div className="text-xs text-slate-500">Seasons</div>
                            </CardContent>
                        </Card>
                    )}
                    {combinedStats?.promotions > 0 && (
                        <Card className="border-0 shadow-sm bg-green-50">
                            <CardContent className="p-4 text-center">
                                <TrendingUp className="w-6 h-6 text-green-500 mx-auto mb-2" />
                                <div className="text-2xl font-bold text-green-700">{combinedStats.promotions}</div>
                                <div className="text-xs text-green-600">Promotions</div>
                            </CardContent>
                        </Card>
                    )}
                    {combinedStats?.relegations > 0 && (
                        <Card className="border-0 shadow-sm bg-red-50">
                            <CardContent className="p-4 text-center">
                                <TrendingDown className="w-6 h-6 text-red-500 mx-auto mb-2" />
                                <div className="text-2xl font-bold text-red-700">{combinedStats.relegations}</div>
                                <div className="text-xs text-red-600">Relegations</div>
                            </CardContent>
                        </Card>
                    )}
                    {league && (
                        <Card className="border-0 shadow-sm">
                            <CardContent className="p-4 text-center">
                                <Shield className="w-6 h-6 text-slate-500 mx-auto mb-2" />
                                <div className="text-sm font-bold truncate">{league.name}</div>
                                <div className="text-xs text-slate-500">Current League</div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Title Years */}
                {combinedStats?.title_years && (
                    <Card 
                        className="border-0 shadow-sm mb-4 bg-gradient-to-r from-amber-50 to-yellow-50"
                        style={{ 
                            borderLeft: club.accent_color ? `4px solid ${club.accent_color}` : '4px solid #f59e0b',
                            backgroundColor: club.primary_color ? `${club.primary_color}08` : undefined
                        }}
                    >
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <Trophy className="w-8 h-8 text-amber-500" />
                                <div>
                                    <div className="font-semibold text-amber-800">League Championship Titles</div>
                                    <div className="text-amber-700">{combinedStats.title_years}</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Cup Title Years */}
                {combinedStats?.domestic_cup_title_years && (
                    <Card 
                        className="border-0 shadow-sm mb-4 bg-gradient-to-r from-orange-50 to-amber-50"
                        style={{ 
                            borderLeft: club.secondary_color ? `4px solid ${club.secondary_color}` : '4px solid #fb923c'
                        }}
                    >
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <Award className="w-8 h-8 text-orange-500" />
                                <div>
                                    <div className="font-semibold text-orange-800">Domestic Cup Titles</div>
                                    <div className="text-orange-700">{combinedStats.domestic_cup_title_years}</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}



                {/* Continental Title Years */}
                {(combinedStats?.vcc_title_years || combinedStats?.ccc_title_years) && (
                    <Card 
                        className="border-0 shadow-sm mb-8 bg-gradient-to-r from-purple-50 to-indigo-50"
                        style={{ 
                            borderLeft: club.accent_color ? `4px solid ${club.accent_color}` : '4px solid #a855f7'
                        }}
                    >
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <Star className="w-8 h-8 text-purple-500" />
                                <div>
                                    <div className="font-semibold text-purple-800">Continental Titles</div>
                                    {combinedStats.vcc_title_years && (
                                        <div className="text-purple-700">VCC: {combinedStats.vcc_title_years}</div>
                                    )}
                                    {combinedStats.ccc_title_years && (
                                        <div className="text-indigo-700">CCC: {combinedStats.ccc_title_years}</div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}



                {/* Continental Honours */}
                {((combinedStats?.vcc_titles > 0) || (combinedStats?.ccc_titles > 0) || combinedStats?.vcc_appearances > 0 || combinedStats?.ccc_appearances > 0) && (
                    <ThemedCard 
                        title="Continental Honours" 
                        icon={Star}
                        primaryColor={club.primary_color}
                        accentColor={club.accent_color}
                        className="mb-8"
                    >
                        <CardContent className="p-0">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* VCC Section */}
                                {(combinedStats?.vcc_titles > 0 || combinedStats?.vcc_appearances > 0 || combinedStats?.vcc_best_finish) && (
                                    <div className="p-4 rounded-lg bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200">
                                       <div className="flex items-center gap-2 mb-3">
                                           <Badge className="bg-amber-500 text-white">VCC</Badge>
                                           <span className="font-semibold text-amber-800">Volarian Champions Cup</span>
                                       </div>
                                       <p className="text-xs text-amber-600 mb-3 italic">Premier competition - Full member nations only</p>
                                        <div className="space-y-2">
                                            {combinedStats?.vcc_titles > 0 && (
                                                <div className="flex items-center gap-2">
                                                    <Trophy className="w-5 h-5 text-amber-500" />
                                                    <span className="font-bold text-amber-700">{combinedStats.vcc_titles} Title{combinedStats.vcc_titles > 1 ? 's' : ''}</span>
                                                    {combinedStats.vcc_title_years && <span className="text-amber-600 text-sm">({combinedStats.vcc_title_years})</span>}
                                                </div>
                                            )}
                                            {combinedStats?.vcc_runner_up > 0 && (
                                                <div className="flex items-center gap-2 text-slate-600">
                                                    <Award className="w-4 h-4" />
                                                    <span>{combinedStats.vcc_runner_up} Runner-up{combinedStats.vcc_runner_up > 1 ? 's' : ''}</span>
                                                </div>
                                            )}
                                            {combinedStats?.vcc_best_finish && !combinedStats?.vcc_titles && (
                                                <div className="flex items-center gap-2 text-slate-600">
                                                    <Target className="w-4 h-4" />
                                                    <span>Best: {combinedStats.vcc_best_finish}</span>
                                                    {combinedStats.vcc_best_finish_year && <span className="text-sm">({combinedStats.vcc_best_finish_year})</span>}
                                                </div>
                                            )}
                                            {combinedStats?.vcc_appearances > 0 && (
                                                <div className="text-sm text-slate-500">
                                                    {combinedStats.vcc_appearances} appearance{combinedStats.vcc_appearances > 1 ? 's' : ''}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* CCC Section */}
                                {(combinedStats?.ccc_titles > 0 || combinedStats?.ccc_appearances > 0 || combinedStats?.ccc_best_finish) && (
                                    <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
                                       <div className="flex items-center gap-2 mb-3">
                                           <Badge className="bg-blue-500 text-white">CCC</Badge>
                                           <span className="font-semibold text-blue-800">Continental Challenge Cup</span>
                                       </div>
                                       <p className="text-xs text-blue-600 mb-3 italic">Developing nations pathway</p>
                                        <div className="space-y-2">
                                            {combinedStats?.ccc_titles > 0 && (
                                                <div className="flex items-center gap-2">
                                                    <Trophy className="w-5 h-5 text-blue-500" />
                                                    <span className="font-bold text-blue-700">{combinedStats.ccc_titles} Title{combinedStats.ccc_titles > 1 ? 's' : ''}</span>
                                                    {combinedStats.ccc_title_years && <span className="text-blue-600 text-sm">({combinedStats.ccc_title_years})</span>}
                                                </div>
                                            )}
                                            {combinedStats?.ccc_runner_up > 0 && (
                                                <div className="flex items-center gap-2 text-slate-600">
                                                    <Award className="w-4 h-4" />
                                                    <span>{combinedStats.ccc_runner_up} Runner-up{combinedStats.ccc_runner_up > 1 ? 's' : ''}</span>
                                                </div>
                                            )}
                                            {combinedStats?.ccc_best_finish && !combinedStats?.ccc_titles && (
                                                <div className="flex items-center gap-2 text-slate-600">
                                                    <Target className="w-4 h-4" />
                                                    <span>Best: {combinedStats.ccc_best_finish}</span>
                                                    {combinedStats.ccc_best_finish_year && <span className="text-sm">({combinedStats.ccc_best_finish_year})</span>}
                                                </div>
                                            )}
                                            {combinedStats?.ccc_appearances > 0 && (
                                                <div className="text-sm text-slate-500">
                                                    {combinedStats.ccc_appearances} appearance{combinedStats.ccc_appearances > 1 ? 's' : ''}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </ThemedCard>
                )}

                {/* All-Time Stats */}
                <div id="all-time-stats">
                    {combinedStats?.seasons_played > 0 && (
                        <ThemedCard 
                            title="All-Time League Statistics"
                            primaryColor={club.primary_color}
                            accentColor={club.accent_color}
                            className="mb-4"
                        >
                            <CardContent className="p-0">
                                <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-center">
                                    <div className="p-3 bg-slate-50 rounded-lg">
                                        <div className="text-2xl font-bold text-green-600">{combinedStats.total_wins || 0}</div>
                                        <div className="text-xs text-slate-500">Wins</div>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-lg">
                                        <div className="text-2xl font-bold text-slate-600">{combinedStats.total_draws || 0}</div>
                                        <div className="text-xs text-slate-500">Draws</div>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-lg">
                                        <div className="text-2xl font-bold text-red-600">{combinedStats.total_losses || 0}</div>
                                        <div className="text-xs text-slate-500">Losses</div>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-lg">
                                        <div className="text-2xl font-bold">{combinedStats.total_goals_scored || 0}</div>
                                        <div className="text-xs text-slate-500">Goals Scored</div>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-lg">
                                        <div className="text-2xl font-bold">{combinedStats.total_goals_conceded || 0}</div>
                                        <div className="text-xs text-slate-500">Goals Conceded</div>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-lg">
                                        <div className="text-2xl font-bold">{(combinedStats.total_goals_scored || 0) - (combinedStats.total_goals_conceded || 0)}</div>
                                        <div className="text-xs text-slate-500">Goal Difference</div>
                                    </div>
                                </div>
                            </CardContent>
                        </ThemedCard>
                    )}

                    {/* Top Flight Stats */}
                    {(() => {
                        const topFlightSeasons = combinedSeasons.filter(s => {
                            const seasonLeague = allLeagues.find(l => l.id === s.league_id);
                            return seasonLeague?.tier === 1;
                        });
                        if (topFlightSeasons.length === 0) return null;
                        
                        const topFlightStats = topFlightSeasons.reduce((acc, s) => ({
                            seasons: acc.seasons + 1,
                            wins: acc.wins + (s.won || 0),
                            draws: acc.draws + (s.drawn || 0),
                            losses: acc.losses + (s.lost || 0),
                            goalsFor: acc.goalsFor + (s.goals_for || 0),
                            goalsAgainst: acc.goalsAgainst + (s.goals_against || 0),
                        }), { seasons: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 });

                        return (
                            <ThemedCard
                                icon={Star}
                                title={
                                    <span className="flex items-center gap-2">
                                        Top Flight Statistics Only
                                        <Badge className="ml-2" style={{ 
                                            backgroundColor: club.accent_color || club.primary_color || '#f59e0b',
                                            color: 'white'
                                        }}>{topFlightStats.seasons} seasons</Badge>
                                    </span>
                                }
                                primaryColor={club.primary_color}
                                accentColor={club.accent_color}
                                className="mb-8"
                            >
                                <CardContent className="p-0">
                                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-center">
                                        <div className="p-3 bg-white/60 rounded-lg">
                                            <div className="text-2xl font-bold text-green-600">{topFlightStats.wins}</div>
                                            <div className="text-xs text-slate-600">Wins</div>
                                        </div>
                                        <div className="p-3 bg-white/60 rounded-lg">
                                            <div className="text-2xl font-bold text-slate-600">{topFlightStats.draws}</div>
                                            <div className="text-xs text-slate-600">Draws</div>
                                        </div>
                                        <div className="p-3 bg-white/60 rounded-lg">
                                            <div className="text-2xl font-bold text-red-600">{topFlightStats.losses}</div>
                                            <div className="text-xs text-slate-600">Losses</div>
                                        </div>
                                        <div className="p-3 bg-white/60 rounded-lg">
                                            <div className="text-2xl font-bold">{topFlightStats.goalsFor}</div>
                                            <div className="text-xs text-slate-600">Goals Scored</div>
                                        </div>
                                        <div className="p-3 bg-white/60 rounded-lg">
                                            <div className="text-2xl font-bold">{topFlightStats.goalsAgainst}</div>
                                            <div className="text-xs text-slate-600">Goals Conceded</div>
                                        </div>
                                        <div className="p-3 bg-white/60 rounded-lg">
                                            <div className="text-2xl font-bold">{topFlightStats.goalsFor - topFlightStats.goalsAgainst}</div>
                                            <div className="text-xs text-slate-600">Goal Difference</div>
                                        </div>
                                    </div>
                                </CardContent>
                            </ThemedCard>
                        );
                    })()}
                </div>

                {/* Defunct/Successor Notice */}
                {club.is_defunct && successorClub && (
                    <Card className="border-0 shadow-sm mb-8 bg-amber-50 border-l-4 border-l-amber-500">
                        <CardContent className="p-4 flex items-center gap-3">
                            <Shield className="w-6 h-6 text-amber-600" />
                            <div>
                                <span className="text-amber-800">This club is now defunct.</span>
                                <Link to={createPageUrl(`ClubDetail?id=${successorClub.id}`)} className="ml-2 font-semibold text-amber-700 hover:underline">
                                    View successor: {successorClub.name} →
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Predecessor Notice */}
                {(predecessorClub || predecessorClub2) && (
                    <Card className="border-0 shadow-sm mb-8 bg-blue-50 border-l-4 border-l-blue-500">
                        <CardContent className="p-4 flex items-center gap-3">
                            <Shield className="w-6 h-6 text-blue-600" />
                            <div>
                                <span className="text-blue-800">
                                    {predecessorClub && predecessorClub2 ? 'This club was formed from a merger of ' : 'This club continues the legacy of '}
                                </span>
                                {predecessorClub && (
                                    <>
                                        <Link to={createPageUrl(`ClubDetail?id=${predecessorClub.id}`)} className="font-semibold text-blue-700 hover:underline">
                                            {predecessorClub.name}
                                        </Link>
                                        {predecessorClub.defunct_year && <span className="text-blue-600"> ({predecessorClub.defunct_year})</span>}
                                    </>
                                )}
                                {predecessorClub && predecessorClub2 && <span className="text-blue-800"> and </span>}
                                {predecessorClub2 && (
                                    <>
                                        <Link to={createPageUrl(`ClubDetail?id=${predecessorClub2.id}`)} className="font-semibold text-blue-700 hover:underline">
                                            {predecessorClub2.name}
                                        </Link>
                                        {predecessorClub2.defunct_year && <span className="text-blue-600"> ({predecessorClub2.defunct_year})</span>}
                                    </>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Former Name Notice */}
                {(formerNameClub || formerNameClub2 || club.reverted_to_original) && (
                    <Card className="border-0 shadow-sm mb-8 bg-purple-50 border-l-4 border-l-purple-500">
                        <CardContent className="p-4 flex items-center gap-3">
                            <Shield className="w-6 h-6 text-purple-600" />
                            <div>
                                {club.reverted_to_original && (
                                    <span className="text-purple-800 font-medium">Reverted to original name. </span>
                                )}
                                {(formerNameClub || formerNameClub2) && (
                                    <>
                                        <span className="text-purple-800">Formerly known as </span>
                                        {formerNameClub && (
                                            <Link to={createPageUrl(`ClubDetail?id=${formerNameClub.id}`)} className="font-semibold text-purple-700 hover:underline">
                                                {formerNameClub.name}
                                            </Link>
                                        )}
                                        {formerNameClub && formerNameClub2 && <span className="text-purple-800"> and </span>}
                                        {formerNameClub2 && (
                                            <Link to={createPageUrl(`ClubDetail?id=${formerNameClub2.id}`)} className="font-semibold text-purple-700 hover:underline">
                                                {formerNameClub2.name}
                                            </Link>
                                        )}
                                        {club.renamed_year && <span className="text-purple-600"> (current name since {club.renamed_year})</span>}
                                        <span className="text-purple-600"> - same club, different name{formerNameClub && formerNameClub2 ? 's' : ''}.</span>
                                    </>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* This is a Former Name Notice */}
                {club.is_former_name && currentNameClub && (
                    <Card className="border-0 shadow-sm mb-8 bg-purple-50 border-l-4 border-l-purple-500">
                        <CardContent className="p-4 flex items-center gap-3">
                            <Shield className="w-6 h-6 text-purple-600" />
                            <div>
                                <span className="text-purple-800">This is a former name. The club is now known as </span>
                                <Link to={createPageUrl(`ClubDetail?id=${currentNameClub.id}`)} className="font-semibold text-purple-700 hover:underline">
                                    {currentNameClub.name}
                                </Link>
                                {club.renamed_year && <span className="text-purple-600"> (since {club.renamed_year})</span>}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Club History Timeline */}
                    <ClubHistory 
                        club={{...club, ...combinedStats}}
                        nation={nation}
                        league={league}
                        seasons={combinedSeasons}
                        leagues={allLeagues}
                    />

                    {/* Club Narratives */}
                    <ClubNarratives 
                        club={{...club, ...combinedStats}} 
                        seasons={combinedSeasons} 
                        leagues={allLeagues} 
                        allClubs={allClubs}
                        allLeagueTables={allNationLeagueTables}
                    />
                    </TabsContent>

                    {/* STATISTICS TAB - Season History & Graph */}
                    <TabsContent value="statistics">
                        <Card className="border-0 shadow-sm">
                            <CardHeader><CardTitle>Season by Season</CardTitle></CardHeader>
                            <CardContent>
                                {combinedSeasons.length === 0 ? (
                                    <p className="text-center py-8 text-slate-500">No season history yet</p>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-slate-100">
                                                <TableHead>Season</TableHead>
                                                <TableHead>Club</TableHead>
                                                <TableHead>League</TableHead>
                                                <TableHead className="text-center">Pos</TableHead>
                                                <TableHead className="text-center">P</TableHead>
                                                <TableHead className="text-center">W</TableHead>
                                                <TableHead className="text-center">D</TableHead>
                                                <TableHead className="text-center">L</TableHead>
                                                <TableHead className="text-center hidden md:table-cell">GF</TableHead>
                                                <TableHead className="text-center hidden md:table-cell">GA</TableHead>
                                                <TableHead className="text-center">Pts</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {combinedSeasons.map((season) => {
                                                const seasonLeague = allLeagues.find(l => l.id === season.league_id);
                                                const isPredecessor = season.club_id === club.predecessor_club_id || season.club_id === club.predecessor_club_2_id;
                                                const isFormerName = season.club_id === club.former_name_club_id || season.club_id === club.former_name_club_2_id;
                                                return (
                                                    <TableRow key={season.id} style={{ backgroundColor: season.highlight_color || (isPredecessor ? '#f1f5f9' : isFormerName ? '#faf5ff' : 'transparent') }}>
                                                        <TableCell className="font-medium">{season.year}</TableCell>
                                                        <TableCell className={isPredecessor || season.club_id === club.former_name_club_id ? 'text-slate-500 italic' : ''}>
                                                                {season.club_id === club.predecessor_club_id ? predecessorClub?.name : 
                                                                 season.club_id === club.predecessor_club_2_id ? predecessorClub2?.name : 
                                                                 season.club_id === club.former_name_club_id ? formerNameClub?.name :
                                                                 season.club_id === club.former_name_club_2_id ? formerNameClub2?.name :
                                                                 club.name}
                                                        </TableCell>
                                                        <TableCell>
                                                                                                                          {seasonLeague ? (
                                                                                                                              <Link to={createPageUrl(`LeagueDetail?id=${seasonLeague.id}`)} className={`hover:text-emerald-600 hover:underline ${seasonLeague.tier === 1 ? 'font-bold' : ''}`}>
                                                                                                                                  {seasonLeague.name}
                                                                                                                                  <span className={`ml-1 text-xs ${seasonLeague.tier === 1 ? 'text-amber-600 font-semibold' : 'text-slate-400'}`}>
                                                                                                                                      (T{seasonLeague.tier})
                                                                                                                                  </span>
                                                                                                                              </Link>
                                                                                                                          ) : '-'}
                                                                                                                      </TableCell>
                                                        <TableCell className="text-center">
                                                            <span className="flex items-center justify-center gap-1">
                                                                {season.position}
                                                                {season.status === 'champion' && <Trophy className="w-4 h-4 text-amber-500" />}
                                                                {season.status === 'promoted' && <TrendingUp className="w-4 h-4 text-green-500" />}
                                                                {season.status === 'relegated' && <TrendingDown className="w-4 h-4 text-red-500" />}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="text-center">{season.played}</TableCell>
                                                        <TableCell className="text-center">{season.won}</TableCell>
                                                        <TableCell className="text-center">{season.drawn}</TableCell>
                                                        <TableCell className="text-center">{season.lost}</TableCell>
                                                        <TableCell className="text-center hidden md:table-cell">{season.goals_for}</TableCell>
                                                        <TableCell className="text-center hidden md:table-cell">{season.goals_against}</TableCell>
                                                        <TableCell className="text-center font-bold">{season.points}</TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>

                        {/* League History Chart */}
                        {combinedSeasons.length >= 2 && (
                            <div className="mt-8">
                                <LeagueHistoryChart seasons={combinedSeasons} leagues={allLeagues} nationName={nation?.name} />
                            </div>
                        )}
                    </TabsContent>

                    {/* ANALYTICS TAB */}
                    <TabsContent value="analytics">
                        <ClubAnalyticsDashboard 
                            club={{...club, ...combinedStats}}
                            seasons={combinedSeasons}
                            leagues={allLeagues}
                            allLeagueTables={[...clubSeasons, ...predecessorSeasons, ...predecessorSeasons2, ...formerNameSeasons, ...formerNameSeasons2]}
                            rivals={allClubs.filter(c => (club.rival_club_ids || []).includes(c.id))}
                        />
                    </TabsContent>

                    {/* ANALYTICS TAB */}
                    <TabsContent value="analytics">
                        <ClubAnalytics 
                            club={club}
                            seasons={combinedSeasons}
                            leagues={allLeagues}
                            allClubs={allClubs}
                            players={players}
                        />
                    </TabsContent>

                    {/* RIVALRIES & DYNASTY TAB */}
                    <TabsContent value="rivalries">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <DynastyTracker club={club} combinedStats={combinedStats} />
                            <RivalryTracker club={club} allClubs={allClubs} allLeagueTables={allNationLeagueTables} />
                        </div>
                    </TabsContent>

                    {/* SQUAD TAB */}
                    <TabsContent value="squad">
                        {(() => {
                            const seniorPlayers = players.filter(p => !p.is_youth_player);
                            const byPosition = {
                                GK: seniorPlayers.filter(p => p.position === 'GK'),
                                DEF: seniorPlayers.filter(p => ['CB', 'LB', 'RB'].includes(p.position)),
                                MID: seniorPlayers.filter(p => ['CDM', 'CM', 'CAM'].includes(p.position)),
                                FWD: seniorPlayers.filter(p => ['LW', 'RW', 'ST'].includes(p.position))
                            };

                            return seniorPlayers.length === 0 ? (
                                <Card className="border-dashed border-2 border-slate-300">
                                    <CardContent className="flex flex-col items-center justify-center py-16">
                                        <Users className="w-16 h-16 text-slate-300 mb-4" />
                                        <h3 className="text-xl font-semibold text-slate-700 mb-2">No Players Yet</h3>
                                        <p className="text-slate-500 mb-4">Start building your squad</p>
                                        <AdminOnly>
                                            <div className="flex gap-2">
                                                <AIPlayerGenerator 
                                                    club={club} 
                                                    nation={nation}
                                                    onPlayersGenerated={() => queryClient.invalidateQueries(['players'])}
                                                />
                                            </div>
                                        </AdminOnly>
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="space-y-6">
                                    {Object.entries(byPosition).map(([pos, plrs]) => {
                                        if (plrs.length === 0) return null;
                                        const positionNames = {
                                            GK: 'Goalkeepers',
                                            DEF: 'Defenders',
                                            MID: 'Midfielders',
                                            FWD: 'Forwards'
                                        };
                                        return (
                                            <Card key={pos} className="border-0 shadow-sm">
                                                <CardHeader>
                                                    <CardTitle>{positionNames[pos]}</CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="space-y-2">
                                                        {plrs.sort((a, b) => (a.shirt_number || 99) - (b.shirt_number || 99)).map(player => (
                                                            <PlayerProfile 
                                                                key={player.id} 
                                                                player={player}
                                                                onUpdate={() => queryClient.invalidateQueries(['players'])}
                                                            />
                                                        ))}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                    <AdminOnly>
                                        <div className="space-y-4">
                                            <AIPlayerGenerator 
                                                club={club} 
                                                nation={nation}
                                                onPlayersGenerated={() => queryClient.invalidateQueries(['players'])}
                                            />
                                            <UpdatePlayerImages 
                                                clubId={clubId} 
                                                onComplete={() => queryClient.invalidateQueries(['players'])} 
                                            />
                                        </div>
                                    </AdminOnly>
                                </div>
                            );
                        })()}
                    </TabsContent>

                    {/* YOUTH TAB */}
                    <TabsContent value="youth">
                    {(() => {
                        const youthPlayers = players.filter(p => p.is_youth_player);
                        const byPosition = {
                            GK: youthPlayers.filter(p => p.position === 'GK'),
                            DEF: youthPlayers.filter(p => ['CB', 'LB', 'RB'].includes(p.position)),
                            MID: youthPlayers.filter(p => ['CDM', 'CM', 'CAM'].includes(p.position)),
                            FWD: youthPlayers.filter(p => ['LW', 'RW', 'ST'].includes(p.position))
                        };

                        return youthPlayers.length === 0 ? (
                            <Card className="border-dashed border-2 border-slate-300">
                                <CardContent className="flex flex-col items-center justify-center py-16">
                                    <Users className="w-16 h-16 text-slate-300 mb-4" />
                                    <h3 className="text-xl font-semibold text-slate-700 mb-2">No Youth Players</h3>
                                    <p className="text-slate-500 mb-4">Youth academy not yet populated</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-6">
                                {Object.entries(byPosition).map(([pos, plrs]) => {
                                    if (plrs.length === 0) return null;
                                    const positionNames = {
                                        GK: 'Goalkeepers',
                                        DEF: 'Defenders',
                                        MID: 'Midfielders',
                                        FWD: 'Forwards'
                                    };
                                    return (
                                        <Card key={pos} className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50">
                                            <CardHeader>
                                                <CardTitle className="flex items-center gap-2">
                                                    <Users className="w-5 h-5 text-blue-600" />
                                                    {positionNames[pos]}
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-2">
                                                    {plrs.sort((a, b) => (a.shirt_number || 99) - (b.shirt_number || 99)).map(player => (
                                                        <PlayerProfile 
                                                            key={player.id} 
                                                            player={player}
                                                            onUpdate={() => queryClient.invalidateQueries(['players'])}
                                                        />
                                                    ))}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        );
                    })()}
                    </TabsContent>

                    {/* CONTINENTAL TAB */}
                    <TabsContent value="continental">
                        <ThemedCard 
                            title="Continental Competition Record"
                            icon={Star}
                            primaryColor={club.primary_color}
                            accentColor={club.accent_color}
                        >
                            <CardContent className="p-0">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* VCC Stats */}
                                    <div>
                                       <div className="mb-4">
                                           <div className="flex items-center gap-2 mb-1">
                                               <Badge className="bg-amber-500 text-white">VCC</Badge>
                                               <h3 className="font-semibold">Volarian Champions Cup</h3>
                                           </div>
                                           <p className="text-xs text-amber-700 italic">The premier continental competition</p>
                                       </div>
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                                                <span className="text-slate-600">Appearances</span>
                                                <span className="font-bold text-lg">{combinedStats?.vcc_appearances || 0}</span>
                                            </div>
                                            <div className="flex justify-between items-center p-3 bg-amber-50 rounded-lg">
                                                <span className="text-amber-700">Titles Won</span>
                                                <span className="font-bold text-lg text-amber-600">{combinedStats?.vcc_titles || 0}</span>
                                            </div>
                                            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                                                <span className="text-slate-600">Finals Lost</span>
                                                <span className="font-bold text-lg">{combinedStats?.vcc_runner_up || 0}</span>
                                            </div>
                                            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                                                <span className="text-slate-600">Best Finish</span>
                                                <div className="text-right">
                                                    <span className="font-bold">{combinedStats?.vcc_best_finish || 'N/A'}</span>
                                                    {combinedStats?.vcc_best_finish_year && <span className="text-sm text-slate-500 ml-1">({combinedStats.vcc_best_finish_year})</span>}
                                                </div>
                                            </div>
                                            {combinedStats?.vcc_title_years && (
                                                <div className="p-3 bg-amber-50 rounded-lg">
                                                    <span className="text-amber-700 text-sm">Title Years: {combinedStats.vcc_title_years}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* CCC Stats */}
                                    <div>
                                       <div className="mb-4">
                                           <div className="flex items-center gap-2 mb-1">
                                               <Badge className="bg-blue-500 text-white">CCC</Badge>
                                               <h3 className="font-semibold">Continental Challenge Cup</h3>
                                           </div>
                                           <p className="text-xs text-blue-700 italic">For associate member nations</p>
                                       </div>
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                                                <span className="text-slate-600">Appearances</span>
                                                <span className="font-bold text-lg">{combinedStats?.ccc_appearances || 0}</span>
                                            </div>
                                            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                                                <span className="text-blue-700">Titles Won</span>
                                                <span className="font-bold text-lg text-blue-600">{combinedStats?.ccc_titles || 0}</span>
                                            </div>
                                            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                                                <span className="text-slate-600">Finals Lost</span>
                                                <span className="font-bold text-lg">{combinedStats?.ccc_runner_up || 0}</span>
                                            </div>
                                            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                                                <span className="text-slate-600">Best Finish</span>
                                                <div className="text-right">
                                                    <span className="font-bold">{combinedStats?.ccc_best_finish || 'N/A'}</span>
                                                    {combinedStats?.ccc_best_finish_year && <span className="text-sm text-slate-500 ml-1">({combinedStats.ccc_best_finish_year})</span>}
                                                </div>
                                            </div>
                                            {combinedStats?.ccc_title_years && (
                                                <div className="p-3 bg-blue-50 rounded-lg">
                                                    <span className="text-blue-700 text-sm">Title Years: {combinedStats.ccc_title_years}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                </CardContent>
                                </ThemedCard>
                                </TabsContent>

                    {/* CLUB INFO TAB */}
                    <TabsContent value="info">
                       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                           <div className="lg:col-span-2 space-y-6">
                                                          {/* AI Kit Generator */}
                                                          <AdminOnly>
                                                              {club.primary_color && (
                                                                  <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-pink-50">
                                                                      <CardHeader><CardTitle>AI Kit Generator</CardTitle></CardHeader>
                                                                      <CardContent>
                                                                          <AIKitGenerator 
                                                                              club={club} 
                                                                              onKitsGenerated={(updatedClub) => queryClient.setQueryData(['club', clubId], updatedClub)}
                                                                              nation={nation}
                                                                          />
                                                                      </CardContent>
                                                                  </Card>
                                                              )}
                                                          </AdminOnly>

                                                          {/* Club Infrastructure */}
                                                          <ClubInfrastructure club={club} league={league} nation={nation} />

                                                          {/* Location & Basic Info Card */}
                                                          <Card className="border-0 shadow-sm">
                                <CardHeader><CardTitle>Club Information</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                            {club.founded_year && (
                                                <div className="p-3 bg-slate-50 rounded-lg">
                                                    <div className="text-xs text-slate-500 mb-1">Founded</div>
                                                    <div className="font-bold text-lg">{club.founded_year}</div>
                                                </div>
                                            )}
                                            {club.region && (
                                                <div className="p-3 bg-slate-50 rounded-lg">
                                                    <div className="text-xs text-slate-500 mb-1">Region</div>
                                                    <div className="font-semibold">{club.region}</div>
                                                </div>
                                            )}
                                            {club.district && (
                                                <div className="p-3 bg-slate-50 rounded-lg">
                                                    <div className="text-xs text-slate-500 mb-1">District</div>
                                                    <div className="font-semibold">{club.district}</div>
                                                </div>
                                            )}
                                            {club.settlement && (
                                                <div className="p-3 bg-slate-50 rounded-lg">
                                                    <div className="text-xs text-slate-500 mb-1">Settlement</div>
                                                    <div className="font-semibold">{club.settlement}</div>
                                                </div>
                                            )}
                                            {club.city && !club.settlement && (
                                                <div className="p-3 bg-slate-50 rounded-lg">
                                                    <div className="text-xs text-slate-500 mb-1">City</div>
                                                    <div className="font-semibold">{club.city}</div>
                                                </div>
                                            )}
                                            {club.primary_color && (
                                                <div className="p-3 bg-slate-50 rounded-lg">
                                                    <div className="text-xs text-slate-500 mb-1">Colors</div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-5 h-5 rounded-full border border-slate-300" style={{ backgroundColor: club.primary_color }} />
                                                        {club.secondary_color && (
                                                            <div className="w-5 h-5 rounded-full border border-slate-300" style={{ backgroundColor: club.secondary_color }} />
                                                        )}
                                                        </div>
                                                        </div>
                                                        )}
                                                        </div>
                                                        </CardContent>
                                                        </Card>

                                                        {/* Stadium Card */}
                                                        {club.stadium && (
                                                        <Card className="border-0 shadow-sm">
                                                        <CardContent className="p-4 flex items-center gap-4">
                                                        <MapPin className="w-8 h-8 text-blue-500" />
                                                        <div>
                                                        <div className="text-sm text-slate-500">Stadium</div>
                                                        <div className="text-xl font-bold">{club.stadium}</div>
                                                        {club.stadium_capacity && <div className="text-sm text-slate-500">Capacity: {club.stadium_capacity.toLocaleString()}</div>}
                                                        </div>
                                                        </CardContent>
                                                        </Card>
                                                        )}
                                                        {club.history && (
                                                        <Card className="border-0 shadow-sm">
                                                        <CardHeader><CardTitle>Club History</CardTitle></CardHeader>
                                                        <CardContent><p className="text-slate-600 whitespace-pre-line">{club.history}</p></CardContent>
                                                        </Card>
                                                        )}
                                                        {club.honours && (
                                                        <Card className="border-0 shadow-sm">
                                                        <CardHeader><CardTitle>Honours</CardTitle></CardHeader>
                                                        <CardContent><p className="text-slate-600 whitespace-pre-line">{club.honours}</p></CardContent>
                                                        </Card>
                                                        )}
                                                        </div>
                                                        <div className="space-y-6">
                                                        {club.manager && (
                                                        <Card className="border-0 shadow-sm">
                                                        <CardHeader><CardTitle>Manager</CardTitle></CardHeader>
                                                        <CardContent><p className="font-semibold">{club.manager}</p></CardContent>
                                                        </Card>
                                                        )}
                                                        {club.notable_players && (
                                                        <Card className="border-0 shadow-sm">
                                                        <CardHeader><CardTitle>Notable Players</CardTitle></CardHeader>
                                                        <CardContent><p className="text-slate-600 whitespace-pre-line">{club.notable_players}</p></CardContent>
                                                        </Card>
                                                        )}
                                                        {club.rivals && (
                                                        <Card className="border-0 shadow-sm">
                                                        <CardHeader><CardTitle>Rivals</CardTitle></CardHeader>
                                                        <CardContent><p className="text-slate-600 whitespace-pre-line">{club.rivals}</p></CardContent>
                                                        </Card>
                                                        )}
                                                        </div>
                                                        </div>
                                                        </TabsContent>
                                                        </Tabs>
                                                        </div>

            {/* Edit Dialog */}
            <Dialog open={isEditing} onOpenChange={setIsEditing}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>Edit Club</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-3">
                            <div className="flex justify-center">
                                <ImageUploaderWithColors 
                                    currentImage={editData.logo_url} 
                                    onUpload={(url) => setEditData({...editData, logo_url: url})} 
                                    primaryColor={editData.primary_color}
                                    secondaryColor={editData.secondary_color}
                                    onColorsChange={(primary, secondary) => setEditData({...editData, primary_color: primary, secondary_color: secondary})}
                                    label="Upload Logo" 
                                />
                            </div>
                            {editData.logo_url && (
                                <ColorExtractor
                                    imageUrl={editData.logo_url}
                                    onColorsExtracted={(colors) => setEditData({
                                        ...editData,
                                        primary_color: colors.primary,
                                        secondary_color: colors.secondary,
                                        accent_color: colors.accent
                                    })}
                                    buttonText="🎨 Auto-Detect Colors from Crest"
                                />
                            )}
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div><Label>Club Name</Label><Input value={editData.name || ''} onChange={(e) => setEditData({...editData, name: e.target.value})} className="mt-1" /></div>
                            <div><Label>Shortened Name</Label><Input value={editData.shortened_name || ''} onChange={(e) => setEditData({...editData, shortened_name: e.target.value})} placeholder="For tables" className="mt-1" /></div>
                            <div><Label>Nickname</Label><Input value={editData.nickname || ''} onChange={(e) => setEditData({...editData, nickname: e.target.value})} className="mt-1" /></div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div><Label>Region</Label><Input value={editData.region || ''} onChange={(e) => setEditData({...editData, region: e.target.value})} className="mt-1" placeholder="Largest area" /></div>
                            <div><Label>District</Label><Input value={editData.district || ''} onChange={(e) => setEditData({...editData, district: e.target.value})} className="mt-1" placeholder="Medium area" /></div>
                            <div><Label>Settlement</Label><Input value={editData.settlement || ''} onChange={(e) => setEditData({...editData, settlement: e.target.value})} className="mt-1" placeholder="Town/city" /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><Label>City (legacy)</Label><Input value={editData.city || ''} onChange={(e) => setEditData({...editData, city: e.target.value})} className="mt-1" /></div>
                            <div><Label>Founded Year</Label><Input type="number" value={editData.founded_year || ''} onChange={(e) => setEditData({...editData, founded_year: e.target.value})} className="mt-1" /></div>
                        </div>
                        <div>
                            <Label>League</Label>
                            <Select value={editData.league_id || ''} onValueChange={(v) => setEditData({...editData, league_id: v})}>
                                <SelectTrigger className="mt-1"><SelectValue placeholder="Select league" /></SelectTrigger>
                                <SelectContent>
                                    {leagues.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><Label>Stadium</Label><Input value={editData.stadium || ''} onChange={(e) => setEditData({...editData, stadium: e.target.value})} className="mt-1" /></div>
                            <div><Label>Capacity</Label><Input type="number" value={editData.stadium_capacity || ''} onChange={(e) => setEditData({...editData, stadium_capacity: e.target.value})} className="mt-1" /></div>
                        </div>
                        <div><Label>Manager</Label><Input value={editData.manager || ''} onChange={(e) => setEditData({...editData, manager: e.target.value})} className="mt-1" /></div>
                        <div><Label>History</Label><Textarea value={editData.history || ''} onChange={(e) => setEditData({...editData, history: e.target.value})} rows={3} className="mt-1" /></div>
                        <div><Label>Honours</Label><Textarea value={editData.honours || ''} onChange={(e) => setEditData({...editData, honours: e.target.value})} rows={3} className="mt-1" /></div>
                        
                        {/* Branding & Kit Design */}
                        <div className="border-t pt-4 mt-4">
                            <h4 className="font-semibold mb-3">🎨 Branding & Kit Design</h4>
                            <div className="grid grid-cols-2 gap-4 p-3 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg">
                                <div>
                                    <Label className="text-xs">Accent Color</Label>
                                    <div className="flex gap-2 mt-1">
                                        <Input 
                                            type="color" 
                                            value={editData.accent_color || '#3b82f6'} 
                                            onChange={(e) => setEditData({...editData, accent_color: e.target.value})} 
                                            className="w-16 h-10"
                                        />
                                        <Input 
                                            value={editData.accent_color || ''} 
                                            onChange={(e) => setEditData({...editData, accent_color: e.target.value})} 
                                            placeholder="#3b82f6"
                                            className="flex-1"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-xs">Kit Pattern</Label>
                                    <Select 
                                        value={editData.pattern_preference || 'solid'} 
                                        onValueChange={(v) => setEditData({...editData, pattern_preference: v})}
                                    >
                                        <SelectTrigger className="mt-1"><SelectValue placeholder="Solid" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="solid">Solid</SelectItem>
                                            <SelectItem value="vertical_stripes">Vertical Stripes</SelectItem>
                                            <SelectItem value="horizontal_hoops">Horizontal Hoops</SelectItem>
                                            <SelectItem value="sash">Sash</SelectItem>
                                            <SelectItem value="diagonal_stripe">Diagonal Stripe</SelectItem>
                                            <SelectItem value="halves">Halves</SelectItem>
                                            <SelectItem value="quarters">Quarters</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label className="text-xs">Text Style</Label>
                                    <Select 
                                        value={editData.text_style || 'modern'} 
                                        onValueChange={(v) => setEditData({...editData, text_style: v})}
                                    >
                                        <SelectTrigger className="mt-1"><SelectValue placeholder="Modern" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="modern">Modern</SelectItem>
                                            <SelectItem value="classic">Classic</SelectItem>
                                            <SelectItem value="bold">Bold</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                        
                        {/* Club Succession Section */}
                        <div className="border-t pt-4 mt-4">
                            <h4 className="font-semibold mb-3 flex items-center gap-2"><Shield className="w-4 h-4" /> Club Succession</h4>
                            <div className="space-y-3 p-3 bg-slate-50 rounded-lg">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <Label className="text-xs">Predecessor Club (this club continues from)</Label>
                                        <Select 
                                            value={editData.predecessor_club_id || ''} 
                                            onValueChange={(v) => setEditData({...editData, predecessor_club_id: v === 'none' ? null : v})}
                                        >
                                            <SelectTrigger className="mt-1"><SelectValue placeholder="None" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">None</SelectItem>
                                                {allClubs.filter(c => c.id !== clubId && !c.predecessor_club_id && c.id !== editData.predecessor_club_2_id).map(c => (
                                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label className="text-xs">2nd Predecessor (if merger)</Label>
                                        <Select 
                                            value={editData.predecessor_club_2_id || ''} 
                                            onValueChange={(v) => setEditData({...editData, predecessor_club_2_id: v === 'none' ? null : v})}
                                        >
                                            <SelectTrigger className="mt-1"><SelectValue placeholder="None" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">None</SelectItem>
                                                {allClubs.filter(c => c.id !== clubId && !c.predecessor_club_id && c.id !== editData.predecessor_club_id).map(c => (
                                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 p-3 bg-slate-100 rounded-lg">
                                        <Label className="text-xs flex items-center gap-2 flex-1">
                                            <input 
                                                type="checkbox" 
                                                checked={editData.is_active !== false}
                                                onChange={(e) => setEditData({...editData, is_active: e.target.checked})}
                                                className="rounded"
                                            />
                                            Club is currently active
                                        </Label>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex-1">
                                            <Label className="text-xs flex items-center gap-2">
                                                <input 
                                                    type="checkbox" 
                                                    checked={editData.is_defunct || false}
                                                    onChange={(e) => setEditData({...editData, is_defunct: e.target.checked})}
                                                    className="rounded"
                                                />
                                                This club is defunct/disbanded
                                            </Label>
                                        </div>
                                        {editData.is_defunct && (
                                            <div className="w-32">
                                                <Label className="text-xs">Defunct Year</Label>
                                                <Input 
                                                    type="number" 
                                                    value={editData.defunct_year || ''} 
                                                    onChange={(e) => setEditData({...editData, defunct_year: parseInt(e.target.value) || null})} 
                                                    className="mt-1" 
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {editData.is_defunct && (
                                    <div>
                                        <Label className="text-xs">Successor Club (this club became)</Label>
                                        <Select 
                                            value={editData.successor_club_id || ''} 
                                            onValueChange={(v) => setEditData({...editData, successor_club_id: v === 'none' ? null : v})}
                                        >
                                            <SelectTrigger className="mt-1"><SelectValue placeholder="None" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">None</SelectItem>
                                                {allClubs.filter(c => c.id !== clubId).map(c => (
                                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Name Change Section */}
                        <div className="border-t pt-4 mt-4">
                            <h4 className="font-semibold mb-3 flex items-center gap-2"><Shield className="w-4 h-4" /> Name Changes (Same Club)</h4>
                            <p className="text-xs text-slate-500 mb-3">Use this when the club simply changed name but is the same entity (not a reformation or restart).</p>
                            <div className="space-y-3 p-3 bg-purple-50 rounded-lg">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <Label className="text-xs">Former Name Club Record</Label>
                                        <Select 
                                            value={editData.former_name_club_id || ''} 
                                            onValueChange={(v) => setEditData({...editData, former_name_club_id: v === 'none' ? null : v})}
                                        >
                                            <SelectTrigger className="mt-1"><SelectValue placeholder="None" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">None</SelectItem>
                                                {allClubs.filter(c => c.id !== clubId && c.id !== editData.former_name_club_2_id).map(c => (
                                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label className="text-xs">2nd Former Name (if multiple)</Label>
                                        <Select 
                                            value={editData.former_name_club_2_id || ''} 
                                            onValueChange={(v) => setEditData({...editData, former_name_club_2_id: v === 'none' ? null : v})}
                                        >
                                            <SelectTrigger className="mt-1"><SelectValue placeholder="None" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">None</SelectItem>
                                                {allClubs.filter(c => c.id !== clubId && c.id !== editData.former_name_club_id).map(c => (
                                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="flex-1">
                                        <Label className="text-xs flex items-center gap-2">
                                            <input 
                                                type="checkbox" 
                                                checked={editData.is_former_name || false}
                                                onChange={(e) => setEditData({...editData, is_former_name: e.target.checked})}
                                                className="rounded"
                                            />
                                            This record is a former name
                                        </Label>
                                    </div>
                                    <div className="flex-1">
                                        <Label className="text-xs flex items-center gap-2">
                                            <input 
                                                type="checkbox" 
                                                checked={editData.reverted_to_original || false}
                                                onChange={(e) => setEditData({...editData, reverted_to_original: e.target.checked})}
                                                className="rounded"
                                            />
                                            Reverted to original name
                                        </Label>
                                    </div>
                                    <div>
                                        <Label className="text-xs">Renamed Year</Label>
                                        <Input 
                                            type="number" 
                                            value={editData.renamed_year || ''} 
                                            onChange={(e) => setEditData({...editData, renamed_year: parseInt(e.target.value) || null})} 
                                            className="mt-1" 
                                        />
                                    </div>
                                </div>
                                {editData.is_former_name && (
                                    <div>
                                        <Label className="text-xs">Current Name Club</Label>
                                        <Select 
                                            value={editData.current_name_club_id || ''} 
                                            onValueChange={(v) => setEditData({...editData, current_name_club_id: v === 'none' ? null : v})}
                                        >
                                            <SelectTrigger className="mt-1"><SelectValue placeholder="None" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">None</SelectItem>
                                                {allClubs.filter(c => c.id !== clubId).map(c => (
                                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Rivalries Section */}
                        <div className="border-t pt-4 mt-4">
                            <h4 className="font-semibold mb-3 flex items-center gap-2"><Shield className="w-4 h-4" /> Rivalries</h4>
                            <div className="space-y-2 p-3 bg-red-50 rounded-lg">
                                <Label className="text-xs text-red-800">Rival Clubs (select up to 10)</Label>
                                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                                    {allClubs.filter(c => c.id !== clubId).map(c => {
                                        const isSelected = (editData.rival_club_ids || []).includes(c.id);
                                        return (
                                            <label key={c.id} className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${isSelected ? 'bg-red-200' : 'hover:bg-red-100'}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={(e) => {
                                                        const current = editData.rival_club_ids || [];
                                                        if (e.target.checked && current.length < 10) {
                                                            setEditData({...editData, rival_club_ids: [...current, c.id]});
                                                        } else if (!e.target.checked) {
                                                            setEditData({...editData, rival_club_ids: current.filter(id => id !== c.id)});
                                                        }
                                                    }}
                                                    disabled={!isSelected && (editData.rival_club_ids || []).length >= 10}
                                                    className="rounded"
                                                />
                                                <span className="text-sm truncate">{c.name}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                                <p className="text-xs text-red-600">{(editData.rival_club_ids || []).length}/10 rivals selected</p>
                            </div>
                        </div>

                        {/* Domestic Cup Honours Section */}
                        <div className="border-t pt-4 mt-4">
                            <h4 className="font-semibold mb-3 flex items-center gap-2"><Award className="w-4 h-4" /> Domestic Cup</h4>
                            <div className="grid grid-cols-3 gap-3 p-3 bg-amber-50 rounded-lg">
                                <div>
                                    <Label className="text-xs">Titles</Label>
                                    <Input type="number" value={editData.domestic_cup_titles || ''} onChange={(e) => setEditData({...editData, domestic_cup_titles: parseInt(e.target.value) || 0})} className="mt-1" />
                                </div>
                                <div>
                                    <Label className="text-xs">Runner-up</Label>
                                    <Input type="number" value={editData.domestic_cup_runner_up || ''} onChange={(e) => setEditData({...editData, domestic_cup_runner_up: parseInt(e.target.value) || 0})} className="mt-1" />
                                </div>
                                <div>
                                    <Label className="text-xs">Title Years</Label>
                                    <Input value={editData.domestic_cup_title_years || ''} onChange={(e) => setEditData({...editData, domestic_cup_title_years: e.target.value})} placeholder="e.g., 2020, 2022" className="mt-1" />
                                </div>
                                <div>
                                    <Label className="text-xs">Best Finish</Label>
                                    <Input value={editData.domestic_cup_best_finish || ''} onChange={(e) => setEditData({...editData, domestic_cup_best_finish: e.target.value})} placeholder="e.g., Final, Semi-final" className="mt-1" />
                                </div>
                                <div>
                                    <Label className="text-xs">Best Finish Year</Label>
                                    <Input value={editData.domestic_cup_best_finish_year || ''} onChange={(e) => setEditData({...editData, domestic_cup_best_finish_year: e.target.value})} className="mt-1" />
                                </div>
                            </div>
                        </div>

                        {/* Continental Honours Section */}
                        <div className="border-t pt-4 mt-4">
                            <h4 className="font-semibold mb-3 flex items-center gap-2"><Star className="w-4 h-4" /> Continental Honours</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-3 p-3 bg-amber-50 rounded-lg">
                                   <Label className="text-amber-800 font-bold">VCC - Premier Competition</Label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div><Label className="text-xs">Titles</Label><Input type="number" value={editData.vcc_titles || ''} onChange={(e) => setEditData({...editData, vcc_titles: parseInt(e.target.value) || 0})} className="mt-1" /></div>
                                        <div><Label className="text-xs">Runner-up</Label><Input type="number" value={editData.vcc_runner_up || ''} onChange={(e) => setEditData({...editData, vcc_runner_up: parseInt(e.target.value) || 0})} className="mt-1" /></div>
                                    </div>
                                    <div><Label className="text-xs">Title Years</Label><Input value={editData.vcc_title_years || ''} onChange={(e) => setEditData({...editData, vcc_title_years: e.target.value})} placeholder="e.g., 2020, 2022" className="mt-1" /></div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div><Label className="text-xs">Best Finish</Label><Input value={editData.vcc_best_finish || ''} onChange={(e) => setEditData({...editData, vcc_best_finish: e.target.value})} placeholder="e.g., Semi-final" className="mt-1" /></div>
                                        <div><Label className="text-xs">Best Year</Label><Input value={editData.vcc_best_finish_year || ''} onChange={(e) => setEditData({...editData, vcc_best_finish_year: e.target.value})} className="mt-1" /></div>
                                    </div>
                                    <div><Label className="text-xs">Appearances</Label><Input type="number" value={editData.vcc_appearances || ''} onChange={(e) => setEditData({...editData, vcc_appearances: parseInt(e.target.value) || 0})} className="mt-1" /></div>
                                </div>
                                <div className="space-y-3 p-3 bg-blue-50 rounded-lg">
                                   <Label className="text-blue-800">CCC - Developing Nations</Label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div><Label className="text-xs">Titles</Label><Input type="number" value={editData.ccc_titles || ''} onChange={(e) => setEditData({...editData, ccc_titles: parseInt(e.target.value) || 0})} className="mt-1" /></div>
                                        <div><Label className="text-xs">Runner-up</Label><Input type="number" value={editData.ccc_runner_up || ''} onChange={(e) => setEditData({...editData, ccc_runner_up: parseInt(e.target.value) || 0})} className="mt-1" /></div>
                                    </div>
                                    <div><Label className="text-xs">Title Years</Label><Input value={editData.ccc_title_years || ''} onChange={(e) => setEditData({...editData, ccc_title_years: e.target.value})} placeholder="e.g., 2019, 2021" className="mt-1" /></div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div><Label className="text-xs">Best Finish</Label><Input value={editData.ccc_best_finish || ''} onChange={(e) => setEditData({...editData, ccc_best_finish: e.target.value})} placeholder="e.g., Quarter-final" className="mt-1" /></div>
                                        <div><Label className="text-xs">Best Year</Label><Input value={editData.ccc_best_finish_year || ''} onChange={(e) => setEditData({...editData, ccc_best_finish_year: e.target.value})} className="mt-1" /></div>
                                    </div>
                                    <div><Label className="text-xs">Appearances</Label><Input type="number" value={editData.ccc_appearances || ''} onChange={(e) => setEditData({...editData, ccc_appearances: parseInt(e.target.value) || 0})} className="mt-1" /></div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setIsEditing(false)}><X className="w-4 h-4 mr-2" /> Cancel</Button>
                            <Button onClick={handleSave} disabled={updateMutation.isPending} className="bg-emerald-600"><Save className="w-4 h-4 mr-2" /> Save</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}