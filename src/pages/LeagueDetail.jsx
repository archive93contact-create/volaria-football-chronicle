import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Plus, Trophy, Shield, Edit2, Trash2, ChevronRight, Save, X, Loader2, Calendar, Users, Sparkles } from 'lucide-react';
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
import ImageUploaderWithColors from '@/components/common/ImageUploaderWithColors';
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
import MatchResultsViewer from '@/components/seasons/MatchResultsViewer';
import VisualLeagueHistory from '@/components/leagues/VisualLeagueHistory';
import AIFillMissingStats from '@/components/leagues/AIFillMissingStats';
import SyncClubStats from '@/components/common/SyncClubStats';
import LeagueRecords from '@/components/leagues/LeagueRecords';
import AILeagueGenerator from '@/components/leagues/AILeagueGenerator';
import RecalculateSeasonStats from '@/components/seasons/RecalculateSeasonStats';
import ImmersiveHeader from '@/components/common/ImmersiveHeader';
import ColorExtractor from '@/components/common/ColorExtractor';
import StatsCard from '@/components/common/StatsCard';
import ThemedCard from '@/components/common/ThemedCard';
import LeaguePlayerStats from '@/components/leagues/LeaguePlayerStats';
import LeagueHistoricalStats from '@/components/leagues/LeagueHistoricalStats';
import LeagueAnalyticsDashboard from '@/components/analytics/LeagueAnalyticsDashboard';

export default function LeagueDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    const leagueId = urlParams.get('id');
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({});
    const [selectedSeason, setSelectedSeason] = useState('');
    const [selectedTab, setSelectedTab] = useState('table');
    const [editingSeason, setEditingSeason] = useState(null);
    const [seasonEditData, setSeasonEditData] = useState({});
    const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
    const [generatorYear, setGeneratorYear] = useState('');

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

    const { data: allLeagueClubs = [] } = useQuery({
        queryKey: ['leagueClubs', leagueId],
        queryFn: () => base44.entities.Club.filter({ league_id: leagueId }, 'name'),
        enabled: !!leagueId,
    });

    // Filter out defunct clubs
    const clubs = useMemo(() => {
        if (!allLeagueClubs || allLeagueClubs.length === 0) return [];
        return allLeagueClubs.filter(c => !c.is_defunct);
    }, [allLeagueClubs]);

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
            if (allNationLeagues.length === 0) return [];
            const seasonPromises = allNationLeagues.map(l => 
                base44.entities.Season.filter({ league_id: l.id })
            );
            const results = await Promise.all(seasonPromises);
            return results.flat();
        },
        enabled: allNationLeagues.length > 0,
    });

    const updateMutation = useMutation({
        mutationFn: (data) => base44.entities.League.update(leagueId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['league', leagueId] });
            queryClient.invalidateQueries({ queryKey: ['leagueSeasons', leagueId] });
            queryClient.invalidateQueries({ queryKey: ['leagueTables', leagueId] });
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
            tier: editData.tier ? parseInt(editData.tier) : null,
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
            {/* Immersive Hero */}
            <ImmersiveHeader
                title={league.name}
                subtitle={league.description}
                breadcrumbs={[
                    { label: 'Nations', url: createPageUrl('Nations') },
                    ...(nation ? [{ label: nation.name, url: createPageUrl(`NationDetail?id=${nation.id}`) }] : []),
                    { label: league.name }
                ]}
                image={league.logo_url}
                primaryColor={league.primary_color}
                secondaryColor={league.secondary_color}
                accentColor={league.accent_color}
                textStyle={league.text_style}
                atmosphere={league.tier === 1 ? 'electric' : 'modern'}
            >
                <div className="flex flex-col items-center gap-3">
                    {/* Crests Grid */}
                    {currentSeasonTable.length > 0 && (
                        <div className="hidden lg:flex flex-wrap gap-1.5 max-w-xs justify-center">
                            {currentSeasonTable.map((team) => {
                                const club = clubs.find(c => c.id === team.club_id);
                                const isChampion = team.position === 1;
                                return club?.logo_url && (
                                    <div 
                                        key={team.id} 
                                        className={`relative group ${isChampion ? 'w-12 h-12' : 'w-8 h-8'}`}
                                        title={team.club_name}
                                    >
                                        <img 
                                            src={club.logo_url} 
                                            alt={team.club_name}
                                            className={`w-full h-full object-contain bg-white rounded-lg p-1 shadow-sm ${isChampion ? 'ring-2 ring-amber-400' : ''}`}
                                        />
                                        {isChampion && <Trophy className="absolute -top-1 -right-1 w-4 h-4 text-amber-400" />}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    {/* Stats */}
                    <div className="flex items-center gap-4 text-white/90 text-sm">
                        <div className="flex items-center gap-1.5">
                            <Users className="w-4 h-4" />
                            <span className="font-bold">{clubs.length}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4" />
                            <span className="font-bold">{seasons.length}</span>
                        </div>
                        {league.founded_year && (
                            <div className="flex items-center gap-1.5">
                                <span>Est. {league.founded_year}</span>
                            </div>
                        )}
                    </div>
                    {league.current_champion && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 rounded-lg border border-amber-400/30">
                            <Trophy className="w-4 h-4 text-amber-300" />
                            <span className="font-bold text-white text-sm">{league.current_champion}</span>
                        </div>
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
                                <AlertDialogHeader><AlertDialogTitle>Delete {league.name}?</AlertDialogTitle></AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-red-600">Delete</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </AdminOnly>
            </ImmersiveHeader>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Personalized League Story */}
                {seasons.length > 0 && allNationClubs.length > 0 && leagueTables.length > 0 && (
                    <PersonalizedLeagueStory
                        league={league}
                        nation={nation}
                        seasons={seasons}
                        clubs={allNationClubs}
                        allLeagueTables={leagueTables}
                    />
                )}

                {/* League Name Change Notice */}
                {league.former_name && league.renamed_year && (
                    <Card className="border-0 shadow-sm mb-6 bg-blue-50 border-l-4 border-l-blue-500">
                        <CardContent className="p-4 flex items-center gap-3">
                            <Trophy className="w-6 h-6 text-blue-600" />
                            <div>
                                <span className="text-blue-800 font-semibold">League renamed in {league.renamed_year}</span>
                                <div className="text-blue-700 text-sm mt-1">
                                    Formerly known as <span className="font-semibold">{league.former_name}</span>
                                    {league.rename_reason && <span> • {league.rename_reason}</span>}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <Tabs value={selectedTab} onValueChange={setSelectedTab} defaultValue="table" className="space-y-6">
                    <TabsList>
                        <TabsTrigger value="table">League Table</TabsTrigger>
                        <TabsTrigger value="history-stats">History & Stats</TabsTrigger>
                        <TabsTrigger value="story">League Story</TabsTrigger>
                        <TabsTrigger value="crests">Club Crests ({(() => {
                            const currentSeasonClubIds = currentSeasonTable.map(t => t.club_id).filter(Boolean);
                            return clubs.filter(c => currentSeasonClubIds.includes(c.id)).length;
                        })()})</TabsTrigger>
                        <TabsTrigger value="clubs">Clubs List</TabsTrigger>
                        <TabsTrigger value="titles">Most Titles</TabsTrigger>
                        <TabsTrigger value="seasons">Season History</TabsTrigger>
                        <TabsTrigger value="records">All-Time Records</TabsTrigger>
                        <TabsTrigger value="analytics">Analytics</TabsTrigger>
                        <TabsTrigger value="predictions">Predictions</TabsTrigger>
                    </TabsList>

                    {/* LEAGUE TABLE TAB */}
                    <TabsContent value="table">
                    {currentSeasonTable.length > 0 && (() => {
                    const currentSeasonObj = seasons.find(s => s.year === currentYear);
                    return (
                    <div>
                    <ThemedCard
                        title={
                            <span className="flex items-center gap-2 justify-between w-full">
                                <span className="flex items-center gap-2">
                                    <Trophy className="w-5 h-5" style={{ color: league.accent_color || '#f59e0b' }} />
                                    League Table {currentYear}
                                    {hasDivisions && ` (${divisionNames.length} Divisions)`}
                                </span>
                            </span>
                        }
                        primaryColor={league.primary_color}
                        accentColor={league.accent_color}
                        className="mb-8 shadow-lg"
                    >
                        <CardHeader className="flex flex-row items-center justify-between bg-slate-50 border-b p-0 pt-4 px-6">
                            <div></div>
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
                                                                const club = clubs.find(c => c.id === row.club_id);
                                                                const displayName = club?.shortened_name || row.club_name;
                                                                return (
                                                                    <span className="flex items-center gap-1">
                                                                        {row.club_id ? (
                                                                            <Link to={createPageUrl(`ClubDetail?id=${row.club_id}`)} className="hover:text-emerald-600 hover:underline">
                                                                                {displayName}
                                                                            </Link>
                                                                        ) : displayName}
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
                    </ThemedCard>

                    {/* Season Storylines */}
                    {(selectedSeason || uniqueYears[0]) && (
                        <SeasonStorylines 
                            season={seasons.find(s => s.year === (selectedSeason || uniqueYears[0]))}
                            league={league}
                            leagueTable={currentSeasonTable}
                            allSeasons={seasons}
                            allLeagueTables={leagueTables}
                            clubs={allNationClubs}
                        />
                    )}

                    {/* Match Results */}
                    {currentSeasonObj?.id && (
                        <MatchResultsViewer 
                            seasonId={currentSeasonObj.id}
                            leagueId={leagueId}
                            seasonYear={currentYear}
                            clubs={clubs}
                        />
                    )}
                    </div>
                    );
                    })()}
                    </TabsContent>

                    {/* HISTORY & STATS TAB */}
                    <TabsContent value="history-stats">
                        {/* Historical Stats - Decades, Longest Serving, etc */}
                        <LeagueHistoricalStats 
                            seasons={seasons}
                            leagueTables={leagueTables}
                            clubs={allNationClubs}
                            league={league}
                        />

                        {/* League History Timeline */}
                        <div className="mt-8">
                            <LeagueHistory league={league} seasons={seasons} nation={nation} />
                        </div>

                        {/* Visual League History */}
                        <VisualLeagueHistory league={league} seasons={seasons} clubs={allNationClubs} />

                        {/* Player Statistics */}
                        <LeaguePlayerStats league={league} clubs={clubs} nation={nation} />

                        {/* Geographic & Head-to-Head */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                            <LeagueClubsMap clubs={clubs} nation={nation} />
                            <HeadToHeadMatrix clubs={clubs} leagueTables={leagueTables} />
                        </div>
                    </TabsContent>

                    {/* LEAGUE STORY TAB */}
                    <TabsContent value="story">
                        {/* League Narratives */}
                        <LeagueNarratives league={league} seasons={seasons} clubs={clubs} leagueTables={leagueTables} />

                        {/* Competitiveness & Flow */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                            <LeagueCompetitiveness seasons={seasons} leagueTables={leagueTables} />
                            <PromotionRelegationFlow seasons={seasons} clubs={clubs} leagues={[league]} />
                        </div>

                        {/* Fierce Rivalries */}
                        <LeagueRivalries clubs={clubs} leagueTables={leagueTables} />
                    </TabsContent>

                    {/* CLUB CRESTS TAB */}
                    <TabsContent value="crests">
                        <ThemedCard 
                            title="Current Competing Clubs"
                            icon={Shield}
                            primaryColor={league.primary_color}
                            accentColor={league.accent_color}
                        >
                            <CardContent className="p-0">
                                {(() => {
                                    // Get clubs that are in the current season table
                                    const currentSeasonClubIds = currentSeasonTable.map(t => t.club_id).filter(Boolean);
                                    const activeClubs = clubs.filter(c => currentSeasonClubIds.includes(c.id));
                                    
                                    if (activeClubs.length === 0) {
                                        return <p className="text-center py-8 text-slate-500">No clubs in the current season yet</p>;
                                    }
                                    
                                    return (
                                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-6 p-6">
                                            {activeClubs.map(club => (
                                                <Link 
                                                    key={club.id} 
                                                    to={createPageUrl(`ClubDetail?id=${club.id}`)}
                                                    className="group flex flex-col items-center gap-2"
                                                >
                                                    <div className="w-full aspect-square bg-white rounded-xl p-4 shadow-md hover:shadow-2xl transition-all duration-300 group-hover:scale-110 border border-slate-200 flex items-center justify-center">
                                                        {club.logo_url ? (
                                                            <img 
                                                                src={club.logo_url} 
                                                                alt={club.name} 
                                                                className="w-full h-full object-contain"
                                                            />
                                                        ) : (
                                                            <Shield className="w-12 h-12 text-slate-300" />
                                                        )}
                                                    </div>
                                                    <span className="text-xs text-center text-slate-700 group-hover:text-emerald-600 font-medium transition-colors line-clamp-2">
                                                        {club.name}
                                                    </span>
                                                </Link>
                                            ))}
                                        </div>
                                    );
                                })()}
                            </CardContent>
                        </ThemedCard>
                    </TabsContent>

                    <TabsContent value="clubs">
                        <ThemedCard 
                            title="Clubs"
                            icon={Shield}
                            primaryColor={league.primary_color}
                            accentColor={league.accent_color}
                        >
                            <CardHeader className="flex flex-row items-center justify-between p-0 pb-4">
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
                                                <AdminOnly>
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
                                                </AdminOnly>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </ThemedCard>
                    </TabsContent>

                    {/* MOST TITLES TAB */}
                    <TabsContent value="titles">
                        <ThemedCard 
                            title="All-Time Title Winners"
                            icon={Trophy}
                            primaryColor={league.primary_color}
                            accentColor={league.accent_color}
                        >
                            <CardHeader className="p-0 pb-4"></CardHeader>
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
                        </ThemedCard>
                    </TabsContent>

                    {/* SEASON HISTORY TAB */}
                    <TabsContent value="seasons">
                        <ThemedCard 
                            title="Season History"
                            icon={Calendar}
                            primaryColor={league.primary_color}
                            accentColor={league.accent_color}
                        >
                            <CardHeader className="flex flex-row items-center justify-between p-0 pb-4">
                                <div className="flex gap-2">
                                    <AdminOnly>
                                        <RecalculateSeasonStats 
                                            seasons={seasons}
                                            leagueTables={leagueTables}
                                        />
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
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="text" 
                                                placeholder="Year (e.g. 1880)" 
                                                value={generatorYear}
                                                onChange={(e) => setGeneratorYear(e.target.value)}
                                                className="w-32 px-2 py-1 border rounded text-sm"
                                            />
                                            <Button 
                                                variant="outline"
                                                onClick={() => setIsGeneratorOpen(true)}
                                                disabled={!generatorYear}
                                            >
                                                <Sparkles className="w-4 h-4 mr-2" /> AI Generate
                                            </Button>
                                        </div>
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
                                                                View Table
                                                            </Button>
                                                            <AdminOnly>
                                                                <Link to={createPageUrl(`EditSeasonTable?league_id=${leagueId}&season_id=${season.id}&year=${season.year}`)}>
                                                                    <Button variant="ghost" size="sm">
                                                                        <Edit2 className="w-4 h-4 mr-1" />
                                                                        Edit Table & Matches
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
                                                            </AdminOnly>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                                )}
                                            </CardContent>
                                        </ThemedCard>
                                    </TabsContent>

                    {/* ALL-TIME RECORDS TAB */}
                    <TabsContent value="records">
                                        <LeagueRecords 
                                            leagueTables={leagueTables}
                                            clubs={allNationClubs}
                                            seasons={seasons}
                                        />
                    </TabsContent>

                    {/* ANALYTICS TAB */}
                    <TabsContent value="analytics">
                        <LeagueAnalyticsDashboard 
                            league={league}
                            seasons={seasons}
                            allTables={leagueTables}
                            clubs={allNationClubs}
                        />
                    </TabsContent>

                    {/* PREDICTIONS TAB */}
                    <TabsContent value="predictions">
                        <LeaguePredictions 
                            league={league}
                            seasons={seasons}
                            leagueTables={leagueTables}
                            clubs={allNationClubs}
                        />
                    </TabsContent>
                </Tabs>
            </div>

            {/* Edit League Dialog */}
            <Dialog open={isEditing} onOpenChange={setIsEditing}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>Edit League</DialogTitle></DialogHeader>
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
                                    buttonText="🎨 Auto-Detect Colors from Logo"
                                />
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><Label>League Name</Label><Input value={editData.name || ''} onChange={(e) => setEditData({...editData, name: e.target.value})} className="mt-1" /></div>
                            <div><Label>Tier</Label><Input type="number" value={editData.tier || ''} onChange={(e) => setEditData({...editData, tier: e.target.value})} className="mt-1" /></div>
                        </div>
                        <div>
                            <Label className="text-xs">Accent Color</Label>
                            <div className="flex gap-2 mt-1">
                                <input 
                                    type="color" 
                                    value={editData.accent_color || '#10b981'} 
                                    onChange={(e) => setEditData({...editData, accent_color: e.target.value})}
                                    className="w-12 h-10 rounded cursor-pointer"
                                />
                                <input 
                                    type="text" 
                                    value={editData.accent_color || ''} 
                                    onChange={(e) => setEditData({...editData, accent_color: e.target.value})}
                                    placeholder="#10b981"
                                    className="flex-1 px-3 py-2 border rounded text-sm"
                                />
                            </div>
                        </div>
                        <div>
                            <Label className="text-xs">Text Style</Label>
                            <Select 
                                value={editData.text_style || 'modern'} 
                                onValueChange={(v) => setEditData({...editData, text_style: v})}
                            >
                                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="modern">Modern</SelectItem>
                                    <SelectItem value="classic">Classic</SelectItem>
                                    <SelectItem value="bold">Bold</SelectItem>
                                    <SelectItem value="elegant">Elegant</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div><Label>Founded</Label><Input type="number" value={editData.founded_year || ''} onChange={(e) => setEditData({...editData, founded_year: e.target.value})} className="mt-1" /></div>
                            <div><Label>Teams</Label><Input type="number" value={editData.number_of_teams || ''} onChange={(e) => setEditData({...editData, number_of_teams: e.target.value})} className="mt-1" /></div>
                            <div><Label>Format</Label><Input value={editData.format || ''} onChange={(e) => setEditData({...editData, format: e.target.value})} className="mt-1" /></div>
                        </div>
                        <div>
                            <Label>Governing Body</Label>
                            <Input 
                                value={editData.governing_body || ''} 
                                onChange={(e) => setEditData({...editData, governing_body: e.target.value})} 
                                className="mt-1" 
                                placeholder="e.g., TFA, Regional FA"
                            />
                            <p className="text-xs text-slate-500 mt-1">Groups leagues with same governing body on nation page</p>
                        </div>
                        <div>
                            <Label>Inactivity/Dormancy Reason</Label>
                            <Textarea
                                value={editData.inactivity_reason || ''}
                                onChange={(e) => setEditData({...editData, inactivity_reason: e.target.value})}
                                rows={2}
                                className="mt-1"
                                placeholder="e.g., 'War suspended operations 1940-1945' or 'Restructured into X League in 1995'"
                            />
                            <p className="text-xs text-slate-500 mt-1">Explain gaps in seasons or league dormancy periods</p>
                        </div>
                        <div><Label>Description</Label><Textarea value={editData.description || ''} onChange={(e) => setEditData({...editData, description: e.target.value})} rows={3} className="mt-1" /></div>
                        <div><Label>History</Label><Textarea value={editData.history || ''} onChange={(e) => setEditData({...editData, history: e.target.value})} rows={4} className="mt-1" /></div>
                        
                        {/* Active Status */}
                        <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                            <input 
                                type="checkbox" 
                                id="is_active"
                                checked={editData.is_active !== false}
                                onChange={(e) => setEditData({...editData, is_active: e.target.checked})}
                                className="rounded"
                            />
                            <Label htmlFor="is_active" className="cursor-pointer">
                                League is currently active (uncheck for defunct/discontinued leagues)
                            </Label>
                        </div>
                        
                        {/* League Name Change Section */}
                        <div className="border-t pt-4 mt-4">
                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                                <Trophy className="w-4 h-4" /> League Name Change
                            </h4>
                            <div className="space-y-3 p-3 bg-blue-50 rounded-lg">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <Label className="text-xs">Former Name</Label>
                                        <Input 
                                            value={editData.former_name || ''} 
                                            onChange={(e) => setEditData({...editData, former_name: e.target.value})} 
                                            placeholder="Previous league name" 
                                            className="mt-1" 
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs">Renamed Year</Label>
                                        <Input 
                                            type="number" 
                                            value={editData.renamed_year || ''} 
                                            onChange={(e) => setEditData({...editData, renamed_year: parseInt(e.target.value) || null})} 
                                            placeholder="e.g., 1992" 
                                            className="mt-1" 
                                        />
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-xs">Reason for Rename</Label>
                                    <Input 
                                        value={editData.rename_reason || ''} 
                                        onChange={(e) => setEditData({...editData, rename_reason: e.target.value})} 
                                        placeholder="e.g., Sponsorship deal, political restructuring" 
                                        className="mt-1" 
                                    />
                                </div>
                                <p className="text-xs text-blue-600">
                                    This will display a notice showing the league's former name and when it changed
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setIsEditing(false)}><X className="w-4 h-4 mr-2" /> Cancel</Button>
                            <Button onClick={handleSave} disabled={updateMutation.isPending} className="bg-emerald-600"><Save className="w-4 h-4 mr-2" /> Save</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* AI League Generator */}
            <AILeagueGenerator 
                leagueId={leagueId}
                seasonYear={generatorYear}
                isOpen={isGeneratorOpen}
                onClose={() => setIsGeneratorOpen(false)}
                onGenerated={(season) => {
                    queryClient.invalidateQueries(['leagueSeasons', leagueId]);
                    queryClient.invalidateQueries(['leagueTables', leagueId]);
                    setGeneratorYear('');
                }}
            />

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