import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Plus, Trophy, Shield, Edit2, Trash2, ChevronRight, Save, X, Loader2, Calendar, Users } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ImageUploader from '@/components/common/ImageUploader';
import LeagueNarratives from '@/components/leagues/LeagueNarratives';
import LeagueCompetitiveness from '@/components/leagues/LeagueCompetitiveness';
import PromotionRelegationFlow from '@/components/leagues/PromotionRelegationFlow';
import LeagueClubsMap from '@/components/leagues/LeagueClubsMap';
import HeadToHeadMatrix from '@/components/leagues/HeadToHeadMatrix';
import LeagueRivalries from '@/components/leagues/LeagueRivalries';
import AdminOnly from '@/components/common/AdminOnly';
import LeagueHistory from '@/components/leagues/LeagueHistory';
import SeasonStorylines from '@/components/seasons/SeasonStorylines';
import LeaguePredictions from '@/components/leagues/LeaguePredictions';
import VisualLeagueHistory from '@/components/leagues/VisualLeagueHistory';
import AIFillMissingStats from '@/components/leagues/AIFillMissingStats';
import SyncClubStats from '@/components/common/SyncClubStats';
import LeagueRecords from '@/components/leagues/LeagueRecords';

export default function LeagueDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    const leagueId = urlParams.get('id');
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({});
    const [selectedSeason, setSelectedSeason] = useState('');
    const [selectedTab, setSelectedTab] = useState('clubs');
    const [editingSeason, setEditingSeason] = useState(null);
    const [seasonEditData, setSeasonEditData] = useState({});

    const { data: league } = useQuery({
        queryKey: ['league', leagueId],
        queryFn: async () => {
            const leagues = await base44.entities.League.filter({ id: leagueId });
            return leagues[0];
        },
        enabled: !!leagueId,
    });

    const { data: nation } = useQuery({
        queryKey: ['nation', league?.nation_id],
        queryFn: async () => {
            const nations = await base44.entities.Nation.filter({ id: league.nation_id });
            return nations[0];
        },
        enabled: !!league?.nation_id,
    });

    const { data: clubs = [] } = useQuery({
        queryKey: ['leagueClubs', leagueId],
        queryFn: () => base44.entities.Club.filter({ league_id: leagueId }, 'name'),
    });

    const { data: seasons = [] } = useQuery({
        queryKey: ['leagueSeasons', leagueId],
        queryFn: () => base44.entities.Season.filter({ league_id: leagueId }, '-year'),
    });

    const { data: leagueTables = [] } = useQuery({
        queryKey: ['leagueTables', leagueId],
        queryFn: () => base44.entities.LeagueTable.filter({ league_id: leagueId }),
    });

    // Fetch all clubs for this nation (for season storylines)
    const { data: allNationClubs = [] } = useQuery({
        queryKey: ['allNationClubsForStorylines', league?.nation_id],
        queryFn: () => base44.entities.Club.filter({ nation_id: league.nation_id }),
        enabled: !!league?.nation_id,
    });

    // Fetch all leagues in this nation (for tracking promotion/relegation across tiers)
    const { data: allNationLeagues = [] } = useQuery({
        queryKey: ['allNationLeagues', league?.nation_id],
        queryFn: () => base44.entities.League.filter({ nation_id: league.nation_id }),
        enabled: !!league?.nation_id,
    });

    // Fetch all seasons for all leagues in this nation
    const { data: allNationSeasons = [] } = useQuery({
        queryKey: ['allNationSeasons', league?.nation_id],
        queryFn: async () => {
            const leagueIds = allNationLeagues.map(l => l.id);
            const allSeasons = await base44.entities.Season.list();
            return allSeasons.filter(s => leagueIds.includes(s.league_id));
        },
        enabled: allNationLeagues.length > 0,
    });

    const updateMutation = useMutation({
        mutationFn: (data) => base44.entities.League.update(leagueId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['league', leagueId] });
            setIsEditing(false);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: () => base44.entities.League.delete(leagueId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leagues'] });
            navigate(createPageUrl('Nations'));
        },
    });

    const deleteSeasonMutation = useMutation({
        mutationFn: async (seasonId) => {
            // Delete associated league table entries first
            const tables = await base44.entities.LeagueTable.filter({ season_id: seasonId });
            for (const table of tables) {
                await base44.entities.LeagueTable.delete(table.id);
            }
            await base44.entities.Season.delete(seasonId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leagueSeasons', leagueId] });
            queryClient.invalidateQueries({ queryKey: ['leagueTables', leagueId] });
        },
    });

    const updateSeasonMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.Season.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leagueSeasons', leagueId] });
            setEditingSeason(null);
        },
    });

    const deleteClubMutation = useMutation({
        mutationFn: (clubId) => base44.entities.Club.delete(clubId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leagueClubs', leagueId] });
            queryClient.invalidateQueries({ queryKey: ['clubs'] });
        },
    });

    const handleViewTable = (year) => {
        setSelectedSeason(year);
        setSelectedTab('table');
    };

    const handleEditSeason = (season) => {
        setSeasonEditData(season);
        setEditingSeason(season.id);
    };

    const handleSaveSeason = () => {
        updateSeasonMutation.mutate({ id: editingSeason, data: seasonEditData });
    };



    const handleEdit = () => {
        setEditData(league);
        setIsEditing(true);
    };

    const handleSave = () => {
        const submitData = {
            ...editData,
            tier: parseInt(editData.tier) || 1,
            founded_year: editData.founded_year ? parseInt(editData.founded_year) : null,
            number_of_teams: editData.number_of_teams ? parseInt(editData.number_of_teams) : null,
        };
        updateMutation.mutate(submitData);
    };

    if (!league) {
        return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;
    }

    const uniqueYears = [...new Set(leagueTables.map(t => t.year))].sort().reverse();
    const currentYear = selectedSeason || uniqueYears[0];
    const currentSeasonTable = leagueTables.filter(t => t.year === currentYear).sort((a, b) => a.position - b.position);
    
    // Group tables by division if multiple divisions exist
    const divisionNames = [...new Set(currentSeasonTable.map(t => t.division_name).filter(Boolean))];
    const hasDivisions = divisionNames.length > 1;
    const tablesByDivision = hasDivisions 
        ? divisionNames.reduce((acc, div) => {
            acc[div] = currentSeasonTable.filter(t => t.division_name === div).sort((a, b) => a.position - b.position);
            return acc;
        }, {})
        : { '': currentSeasonTable };

    // Get previous season info for (P), (R), (C) indicators
    const sortedYears = [...uniqueYears].sort();
    const currentYearIndex = sortedYears.indexOf(currentYear);
    const previousYear = currentYearIndex > 0 ? sortedYears[currentYearIndex - 1] : null;
    const previousSeason = previousYear ? seasons.find(s => s.year === previousYear) : null;
    
    // Get promoted teams from lower tier leagues (teams that got promoted TO this league)
    const lowerTierLeagues = allNationLeagues.filter(l => l.tier === (league?.tier || 1) + 1);
    const promotedToThisLeague = [];
    lowerTierLeagues.forEach(lowerLeague => {
        const lowerPrevSeason = allNationSeasons.find(s => s.league_id === lowerLeague.id && s.year === previousYear);
        if (lowerPrevSeason?.promoted_teams) {
            lowerPrevSeason.promoted_teams.split(',').forEach(t => {
                if (t.trim()) promotedToThisLeague.push(t.trim().toLowerCase());
            });
        }
        // Champions are also promoted
        if (lowerPrevSeason?.champion_name) {
            promotedToThisLeague.push(lowerPrevSeason.champion_name.trim().toLowerCase());
        }
    });
    
    // Get relegated teams from higher tier leagues (teams that got relegated TO this league)
    const higherTierLeagues = allNationLeagues.filter(l => l.tier === (league?.tier || 1) - 1);
    const relegatedToThisLeague = [];
    higherTierLeagues.forEach(higherLeague => {
        const higherPrevSeason = allNationSeasons.find(s => s.league_id === higherLeague.id && s.year === previousYear);
        if (higherPrevSeason?.relegated_teams) {
            higherPrevSeason.relegated_teams.split(',').forEach(t => {
                if (t.trim()) relegatedToThisLeague.push(t.trim().toLowerCase());
            });
        }
    });
    
    // Get previous champion of THIS league (for top tier)
    const previousChampion = previousSeason?.champion_name?.trim().toLowerCase() || '';
    
    // Helper to check club status
    const getClubIndicators = (clubName) => {
        if (!clubName) return { isPromoted: false, isRelegated: false, isChampion: false };
        const name = clubName.trim().toLowerCase();
        return {
            isPromoted: promotedToThisLeague.some(t => t === name || name.includes(t) || t.includes(name)),
            isRelegated: relegatedToThisLeague.some(t => t === name || name.includes(t) || t.includes(name)),
            isChampion: league.tier === 1 && previousChampion && (previousChampion === name || name.includes(previousChampion) || previousChampion.includes(name))
        };
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Hero */}
            <div className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${league.primary_color || '#1e40af'}, ${league.secondary_color || '#3b82f6'})` }}>
                <div className="absolute inset-0 bg-black/20" />
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <nav className="flex items-center gap-2 text-sm text-white/70 mb-4">
                        <Link to={createPageUrl('Home')} className="hover:text-white">Volaria</Link>
                        <ChevronRight className="w-4 h-4" />
                        <Link to={createPageUrl('Nations')} className="hover:text-white">Nations</Link>
                        <ChevronRight className="w-4 h-4" />
                        {nation && <Link to={createPageUrl(`NationDetail?id=${nation.id}`)} className="hover:text-white">{nation.name}</Link>}
                        <ChevronRight className="w-4 h-4" />
                        <span className="text-white">{league.name}</span>
                    </nav>
                    <div className="flex items-center gap-6">
                        {league.logo_url ? (
                            <img src={league.logo_url} alt={league.name} className="w-24 h-24 object-contain bg-white rounded-xl p-2" />
                        ) : (
                            <div className="w-24 h-24 bg-white/20 rounded-xl flex items-center justify-center">
                                <Trophy className="w-12 h-12 text-white" />
                            </div>
                        )}
                        <div className="flex-1">
                            <h1 className="text-3xl md:text-4xl font-bold text-white">{league.name}</h1>
                            {league.description && <p className="mt-2 text-white/80">{league.description}</p>}
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
                                        <AlertDialogHeader><AlertDialogTitle>Delete {league.name}?</AlertDialogTitle></AlertDialogHeader>
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

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center"><Users className="w-6 h-6 text-blue-500 mx-auto mb-2" /><div className="text-2xl font-bold">{clubs.length}</div><div className="text-xs text-slate-500">Clubs</div></CardContent></Card>
                    <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center"><Calendar className="w-6 h-6 text-emerald-500 mx-auto mb-2" /><div className="text-2xl font-bold">{seasons.length}</div><div className="text-xs text-slate-500">Seasons</div></CardContent></Card>
                    {league.current_champion && <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center"><Trophy className="w-6 h-6 text-amber-500 mx-auto mb-2" /><div className="text-sm font-bold text-emerald-600 truncate">{league.current_champion}</div><div className="text-xs text-slate-500">Champion</div></CardContent></Card>}
                    {league.founded_year && <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center"><div className="text-2xl font-bold">{league.founded_year}</div><div className="text-xs text-slate-500">Founded</div></CardContent></Card>}
                </div>

                {/* Quick Navigation Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                    <a href="#league-table" className="block">
                        <Card className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer bg-gradient-to-br from-amber-50 to-yellow-50 group">
                            <CardContent className="p-4 flex items-center gap-3">
                                <Trophy className="w-8 h-8 text-amber-500" />
                                <div>
                                    <div className="font-semibold text-slate-800 group-hover:text-amber-700">League Table</div>
                                    <div className="text-xs text-slate-500">{currentYear} Season</div>
                                </div>
                            </CardContent>
                        </Card>
                    </a>
                    <a href="#league-story" className="block">
                        <Card className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer bg-gradient-to-br from-blue-50 to-indigo-50 group">
                            <CardContent className="p-4 flex items-center gap-3">
                                <Calendar className="w-8 h-8 text-blue-500" />
                                <div>
                                    <div className="font-semibold text-slate-800 group-hover:text-blue-700">League History</div>
                                    <div className="text-xs text-slate-500">Champions & Storylines</div>
                                </div>
                            </CardContent>
                        </Card>
                    </a>
                    <a href="#season-story" className="block">
                        <Card className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer bg-gradient-to-br from-purple-50 to-pink-50 group">
                            <CardContent className="p-4 flex items-center gap-3">
                                <Shield className="w-8 h-8 text-purple-500" />
                                <div>
                                    <div className="font-semibold text-slate-800 group-hover:text-purple-700">Season Story</div>
                                    <div className="text-xs text-slate-500">Drama & Insights</div>
                                </div>
                            </CardContent>
                        </Card>
                    </a>
                    <a href="#stats-records" className="block">
                        <Card className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer bg-gradient-to-br from-emerald-50 to-teal-50 group">
                            <CardContent className="p-4 flex items-center gap-3">
                                <Users className="w-8 h-8 text-emerald-500" />
                                <div>
                                    <div className="font-semibold text-slate-800 group-hover:text-emerald-700">Stats & Records</div>
                                    <div className="text-xs text-slate-500">All-Time Data</div>
                                </div>
                            </CardContent>
                        </Card>
                    </a>
                </div>

                {/* LEAGUE TABLE */}
                {currentSeasonTable.length > 0 && (
                    <div id="league-table">
                    <Card className="border-0 shadow-lg mb-8">
                        <CardHeader className="flex flex-row items-center justify-between bg-slate-50 border-b">
                            <CardTitle className="flex items-center gap-2">
                                <Trophy className="w-5 h-5 text-amber-500" />
                                League Table {currentYear}
                                {hasDivisions && ` (${divisionNames.length} Divisions)`}
                            </CardTitle>
                            {uniqueYears.length > 0 && (
                                <Select value={selectedSeason || uniqueYears[0]} onValueChange={setSelectedSeason}>
                                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {uniqueYears.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            )}
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className={hasDivisions ? "grid grid-cols-1 lg:grid-cols-2 gap-0" : ""}>
                                {Object.entries(tablesByDivision).map(([divName, divTable]) => (
                                    <div key={divName || 'main'} className={hasDivisions ? "border-r last:border-r-0" : ""}>
                                        {hasDivisions && (
                                            <div className="bg-slate-800 text-white px-4 py-2 font-semibold">
                                                {divName}
                                            </div>
                                        )}
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-slate-100">
                                                    <TableHead className="w-12">#</TableHead>
                                                    <TableHead>Club</TableHead>
                                                    <TableHead className="text-center">P</TableHead>
                                                    <TableHead className="text-center">W</TableHead>
                                                    <TableHead className="text-center">D</TableHead>
                                                    <TableHead className="text-center">L</TableHead>
                                                    <TableHead className="text-center hidden md:table-cell">GF</TableHead>
                                                    <TableHead className="text-center hidden md:table-cell">GA</TableHead>
                                                    <TableHead className="text-center">GD</TableHead>
                                                    <TableHead className="text-center font-bold">Pts</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {divTable.map((row) => (
                                                    <TableRow key={row.id} style={{ backgroundColor: row.highlight_color || 'transparent' }}>
                                                        <TableCell className="font-bold">
                                                            <span className="flex items-center gap-1">
                                                                {row.position}
                                                                {row.status === 'champion' && <Trophy className="w-4 h-4 text-amber-500" />}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="font-medium">
                                                            {(() => {
                                                                const indicators = getClubIndicators(row.club_name);
                                                                return (
                                                                    <span className="flex items-center gap-1">
                                                                        {row.club_id ? (
                                                                            <Link to={createPageUrl(`ClubDetail?id=${row.club_id}`)} className="hover:text-emerald-600 hover:underline">
                                                                                {row.club_name}
                                                                            </Link>
                                                                        ) : row.club_name}
                                                                        {indicators.isChampion && (
                                                                            <span className="text-xs font-bold text-amber-600 ml-1" title="Defending Champions">(C)</span>
                                                                        )}
                                                                        {indicators.isPromoted && (
                                                                            <span className="text-xs font-bold text-green-600 ml-1" title="Promoted from lower tier">(P)</span>
                                                                        )}
                                                                        {indicators.isRelegated && (
                                                                            <span className="text-xs font-bold text-red-600 ml-1" title="Relegated from higher tier">(R)</span>
                                                                        )}
                                                                    </span>
                                                                );
                                                            })()}
                                                        </TableCell>
                                                        <TableCell className="text-center">{row.played}</TableCell>
                                                        <TableCell className="text-center">{row.won}</TableCell>
                                                        <TableCell className="text-center">{row.drawn}</TableCell>
                                                        <TableCell className="text-center">{row.lost}</TableCell>
                                                        <TableCell className="text-center hidden md:table-cell">{row.goals_for}</TableCell>
                                                        <TableCell className="text-center hidden md:table-cell">{row.goals_against}</TableCell>
                                                        <TableCell className="text-center">{row.goal_difference > 0 ? `+${row.goal_difference}` : row.goal_difference}</TableCell>
                                                        <TableCell className="text-center font-bold">{row.points}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                    </div>
                )}

                {/* League History Section */}
                <div id="league-story">
                    {/* Visual League History */}
                    <VisualLeagueHistory league={league} seasons={seasons} clubs={allNationClubs} />

                {/* League History Timeline */}
                <LeagueHistory league={league} seasons={seasons} nation={nation} />

                {/* League Narratives */}
                <LeagueNarratives league={league} seasons={seasons} clubs={clubs} leagueTables={leagueTables} />
                </div>

                {/* Season Storylines Section */}
                <div id="season-story">
                {/* Season Storylines for selected season */}
                {(selectedSeason || uniqueYears[0]) && (
                    <div className="mb-8">
                        <SeasonStorylines 
                            season={seasons.find(s => s.year === (selectedSeason || uniqueYears[0]))}
                            league={league}
                            leagueTable={currentSeasonTable}
                            allSeasons={seasons}
                            allLeagueTables={leagueTables}
                            clubs={allNationClubs}
                        />
                    </div>
                )}
                </div>

                {/* Stats & Records Section */}
                <div id="stats-records">
                {/* Competitiveness & Flow */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <LeagueCompetitiveness seasons={seasons} leagueTables={leagueTables} />
                    <PromotionRelegationFlow seasons={seasons} clubs={clubs} leagues={[league]} />
                </div>

                {/* Geographic & Head-to-Head */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <LeagueClubsMap clubs={clubs} nation={nation} />
                    <HeadToHeadMatrix clubs={clubs} leagueTables={leagueTables} />
                </div>

                {/* Fierce Rivalries */}
                <LeagueRivalries clubs={clubs} leagueTables={leagueTables} />
                </div>

                {/* AI Predictions */}
                <div className="mb-8">
                    <LeaguePredictions 
                        league={league}
                        seasons={seasons}
                        leagueTables={leagueTables}
                        clubs={allNationClubs}
                    />
                </div>

                <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
                    <TabsList>
                        <TabsTrigger value="clubs">Clubs ({clubs.length})</TabsTrigger>
                        <TabsTrigger value="titles">Most Titles</TabsTrigger>
                        <TabsTrigger value="history">Season History</TabsTrigger>
                        <TabsTrigger value="records">All-Time Records</TabsTrigger>
                    </TabsList>

                    <TabsContent value="clubs">
                        <Card className="border-0 shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle>Clubs</CardTitle>
                                <AdminOnly>
                                    <Link to={createPageUrl(`AddClub?nation_id=${league.nation_id}&league_id=${leagueId}`)}>
                                        <Button className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-2" /> Add Club</Button>
                                    </Link>
                                </AdminOnly>
                            </CardHeader>
                            <CardContent>
                                {clubs.length === 0 ? (
                                    <p className="text-center py-8 text-slate-500">No clubs in this league yet</p>
                                ) : (
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                        {clubs.map(club => (
                                            <div key={club.id} className="flex items-center gap-3 p-3 rounded-lg border hover:shadow-md transition-shadow group relative">
                                                <Link to={createPageUrl(`ClubDetail?id=${club.id}`)} className="flex items-center gap-3 flex-1">
                                                    {club.logo_url ? (
                                                        <img src={club.logo_url} alt={club.name} className="w-10 h-10 object-contain" />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center"><Shield className="w-5 h-5 text-slate-400" /></div>
                                                    )}
                                                    <div className="truncate flex-1">
                                                        <div className="font-medium truncate">{club.name}</div>
                                                        {club.city && <div className="text-xs text-slate-500">{club.city}</div>}
                                                    </div>
                                                    {nation?.flag_url && (
                                                        <img src={nation.flag_url} alt={nation.name} className="w-5 h-3 object-contain" />
                                                    )}
                                                </Link>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 absolute right-2 text-red-500 hover:text-red-700">
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Delete {club.name}?</AlertDialogTitle>
                                                            <AlertDialogDescription>This will permanently delete this club.</AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => deleteClubMutation.mutate(club.id)} className="bg-red-600">Delete</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="titles">
                        <Card className="border-0 shadow-sm">
                            <CardHeader>
                                <CardTitle>All-Time Title Winners</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {(() => {
                                    // Count titles per club from season data
                                    const titleCounts = {};
                                    seasons.forEach(season => {
                                        if (season.champion_name) {
                                            const name = season.champion_name.trim();
                                            if (!titleCounts[name]) {
                                                titleCounts[name] = { count: 0, years: [] };
                                            }
                                            titleCounts[name].count++;
                                            titleCounts[name].years.push(season.year);
                                        }
                                    });

                                    const sortedClubs = Object.entries(titleCounts)
                                        .sort((a, b) => b[1].count - a[1].count);

                                    if (sortedClubs.length === 0) {
                                        return <p className="text-center py-8 text-slate-500">No title history yet</p>;
                                    }

                                    return (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-12">#</TableHead>
                                                    <TableHead>Club</TableHead>
                                                    <TableHead className="text-center">Titles</TableHead>
                                                    <TableHead className="hidden md:table-cell">Years</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {sortedClubs.map(([clubName, data], idx) => (
                                                    <TableRow key={clubName}>
                                                        <TableCell className="font-bold text-slate-400">{idx + 1}</TableCell>
                                                        <TableCell className="font-medium">
                                                            <span className="flex items-center gap-2">
                                                                {idx === 0 && <Trophy className="w-4 h-4 text-amber-500" />}
                                                                {clubName}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <span className="font-bold text-emerald-600">{data.count}</span>
                                                        </TableCell>
                                                        <TableCell className="hidden md:table-cell text-slate-500 text-sm">
                                                            {data.years.sort().join(', ')}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    );
                                })()}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="history">
                        <Card className="border-0 shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle>Season History</CardTitle>
                                <div className="flex gap-2">
                                    <AdminOnly>
                                        <SyncClubStats 
                                            clubs={allNationClubs}
                                            leagueTables={leagueTables}
                                            leagues={allNationLeagues}
                                        />
                                        <AIFillMissingStats 
                                            league={league}
                                            seasons={seasons}
                                            leagueTables={leagueTables}
                                            allClubs={allNationClubs}
                                        />
                                        <Link to={createPageUrl(`AddSeason?league_id=${leagueId}`)}>
                                            <Button className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-2" /> Add Season</Button>
                                        </Link>
                                    </AdminOnly>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {seasons.length === 0 ? (
                                    <p className="text-center py-8 text-slate-500">No season history yet</p>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Season</TableHead>
                                                <TableHead>Champion</TableHead>
                                                <TableHead className="hidden md:table-cell">Runner-up</TableHead>
                                                <TableHead className="hidden lg:table-cell">Top Scorer</TableHead>
                                                <TableHead className="w-40 text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {seasons.map(season => (
                                                <TableRow key={season.id} className="hover:bg-slate-50">
                                                    <TableCell className="font-medium">{season.year}</TableCell>
                                                    <TableCell className="text-emerald-600 font-semibold">
                                                        <span className="flex items-center gap-1">
                                                            <Trophy className="w-4 h-4 text-amber-500" />
                                                            {season.champion_name}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="hidden md:table-cell">{season.runner_up}</TableCell>
                                                    <TableCell className="hidden lg:table-cell text-slate-500">{season.top_scorer}</TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <Button variant="ghost" size="sm" onClick={() => handleViewTable(season.year)}>
                                                                View
                                                            </Button>
                                                            <Link to={createPageUrl(`EditSeasonTable?league_id=${leagueId}&season_id=${season.id}&year=${season.year}`)}>
                                                                <Button variant="ghost" size="sm" title="Edit Table">
                                                                    <Edit2 className="w-4 h-4" />
                                                                </Button>
                                                            </Link>
                                                            <Button variant="ghost" size="sm" onClick={() => handleEditSeason(season)} title="Edit Season Info">
                                                                ℹ️
                                                            </Button>
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild>
                                                                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700">
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </Button>
                                                                </AlertDialogTrigger>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle>Delete {season.year} season?</AlertDialogTitle>
                                                                        <AlertDialogDescription>This will delete the season and all associated table data.</AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                        <AlertDialogAction onClick={() => deleteSeasonMutation.mutate(season.id)} className="bg-red-600">Delete</AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
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

                                    <TabsContent value="records">
                                        <LeagueRecords 
                                            leagueTables={leagueTables}
                                            clubs={allNationClubs}
                                            seasons={seasons}
                                        />
                                    </TabsContent>
                                    </Tabs>
                                    </div>

            {/* Edit League Dialog */}
            <Dialog open={isEditing} onOpenChange={setIsEditing}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>Edit League</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="flex justify-center">
                            <ImageUploader currentImage={editData.logo_url} onUpload={(url) => setEditData({...editData, logo_url: url})} label="Upload Logo" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><Label>League Name</Label><Input value={editData.name || ''} onChange={(e) => setEditData({...editData, name: e.target.value})} className="mt-1" /></div>
                            <div><Label>Tier</Label><Input type="number" value={editData.tier || ''} onChange={(e) => setEditData({...editData, tier: e.target.value})} className="mt-1" /></div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div><Label>Founded</Label><Input type="number" value={editData.founded_year || ''} onChange={(e) => setEditData({...editData, founded_year: e.target.value})} className="mt-1" /></div>
                            <div><Label>Teams</Label><Input type="number" value={editData.number_of_teams || ''} onChange={(e) => setEditData({...editData, number_of_teams: e.target.value})} className="mt-1" /></div>
                            <div><Label>Format</Label><Input value={editData.format || ''} onChange={(e) => setEditData({...editData, format: e.target.value})} className="mt-1" /></div>
                        </div>
                        <div><Label>Description</Label><Textarea value={editData.description || ''} onChange={(e) => setEditData({...editData, description: e.target.value})} rows={3} className="mt-1" /></div>
                        <div><Label>History</Label><Textarea value={editData.history || ''} onChange={(e) => setEditData({...editData, history: e.target.value})} rows={4} className="mt-1" /></div>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setIsEditing(false)}><X className="w-4 h-4 mr-2" /> Cancel</Button>
                            <Button onClick={handleSave} disabled={updateMutation.isPending} className="bg-emerald-600"><Save className="w-4 h-4 mr-2" /> Save</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Edit Season Dialog */}
            <Dialog open={!!editingSeason} onOpenChange={(open) => !open && setEditingSeason(null)}>
                <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>Edit Season</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div><Label>Season Year</Label><Input value={seasonEditData.year || ''} onChange={(e) => setSeasonEditData({...seasonEditData, year: e.target.value})} className="mt-1" /></div>
                            <div><Label>Number of Teams</Label><Input type="number" value={seasonEditData.number_of_teams || ''} onChange={(e) => setSeasonEditData({...seasonEditData, number_of_teams: parseInt(e.target.value) || 0})} className="mt-1" /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><Label>Champion</Label><Input value={seasonEditData.champion_name || ''} onChange={(e) => setSeasonEditData({...seasonEditData, champion_name: e.target.value})} className="mt-1" /></div>
                            <div><Label>Runner-up</Label><Input value={seasonEditData.runner_up || ''} onChange={(e) => setSeasonEditData({...seasonEditData, runner_up: e.target.value})} className="mt-1" /></div>
                        </div>
                        <div><Label>Top Scorer</Label><Input value={seasonEditData.top_scorer || ''} onChange={(e) => setSeasonEditData({...seasonEditData, top_scorer: e.target.value})} placeholder="e.g., John Smith (25 goals)" className="mt-1" /></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><Label>Promoted Teams</Label><Input value={seasonEditData.promoted_teams || ''} onChange={(e) => setSeasonEditData({...seasonEditData, promoted_teams: e.target.value})} placeholder="Comma separated" className="mt-1" /></div>
                            <div><Label>Relegated Teams</Label><Input value={seasonEditData.relegated_teams || ''} onChange={(e) => setSeasonEditData({...seasonEditData, relegated_teams: e.target.value})} placeholder="Comma separated" className="mt-1" /></div>
                        </div>
                        <div><Label>Notes</Label><Textarea value={seasonEditData.notes || ''} onChange={(e) => setSeasonEditData({...seasonEditData, notes: e.target.value})} rows={3} className="mt-1" /></div>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setEditingSeason(null)}><X className="w-4 h-4 mr-2" /> Cancel</Button>
                            <Button onClick={handleSaveSeason} disabled={updateSeasonMutation.isPending} className="bg-emerald-600">
                                {updateSeasonMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Save
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}