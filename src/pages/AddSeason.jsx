import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Save, ArrowLeft, Loader2, Plus, Trash2, Trophy, ArrowUp, ArrowDown, ClipboardPaste, Layers, ShieldAlert } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import PageHeader from '@/components/common/PageHeader';
import { useIsAdmin } from '@/components/common/AdminOnly';
import AIStatsGenerator from '@/components/seasons/AIStatsGenerator';
import { recalculateStabilityAfterSeason } from '@/components/stability/autoUpdateStability';

export default function AddSeason() {
    const { isAdmin, isLoading: authLoading } = useIsAdmin();
    
    if (authLoading) {
        return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;
    }
    
    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Card className="max-w-md">
                    <CardContent className="text-center py-8">
                        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <h2 className="text-xl font-bold mb-2">Admin Access Required</h2>
                        <p className="text-slate-500 mb-4">Only administrators can add content.</p>
                        <Link to={createPageUrl('Home')}><Button>Back to Home</Button></Link>
                    </CardContent>
                </Card>
            </div>
        );
    }
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const urlParams = new URLSearchParams(window.location.search);
    const leagueId = urlParams.get('league_id');

    const { data: league } = useQuery({
        queryKey: ['league', leagueId],
        queryFn: async () => {
            const leagues = await base44.entities.League.filter({ id: leagueId });
            return leagues[0];
        },
        enabled: !!leagueId,
    });

    const { data: allNationClubs = [] } = useQuery({
        queryKey: ['nationClubs', league?.nation_id],
        queryFn: () => base44.entities.Club.filter({ nation_id: league.nation_id }, 'name'),
        enabled: !!league?.nation_id,
    });

    const { data: youthTeams = [] } = useQuery({
        queryKey: ['youthTeams', league?.nation_id],
        queryFn: async () => {
            const clubs = await base44.entities.Club.filter({ nation_id: league.nation_id }) || [];
            const clubIds = clubs.map(c => c.id);
            if (clubIds.length === 0) return [];
            const allYouthTeams = await base44.entities.YouthTeam.list() || [];
            return allYouthTeams.filter(yt => clubIds.includes(yt.parent_club_id));
        },
        enabled: !!league?.nation_id && league?.league_type === 'youth',
    });

    const [seasonData, setSeasonData] = useState({
        year: '', number_of_teams: 18, top_scorer: '', notes: '',
        champion_color: '#fef3c7', promotion_color: '#d1fae5', relegation_color: '#fee2e2',
        playoff_color: '#dbeafe',
        promotion_spots: 2, relegation_spots: 3,
        tier: null, division_name: '', division_group: '',
        playoff_spots_start: null, playoff_spots_end: null, playoff_format: '',
        playoff_winner: '', playoff_runner_up: '', playoff_notes: ''
    });

    const [tableRows, setTableRows] = useState([]);
    const [divisions, setDivisions] = useState([{ name: '', teams: 18, rows: [], promotion_spots: 2, relegation_spots: 3 }]);
    const [activeDivision, setActiveDivision] = useState(0);
    const [pasteDialogOpen, setPasteDialogOpen] = useState(false);
    const [pasteText, setPasteText] = useState('');
    const [useMultipleDivisions, setUseMultipleDivisions] = useState(false);
    const [divisionPasteDialogOpen, setDivisionPasteDialogOpen] = useState(false);
    const [divisionPasteText, setDivisionPasteText] = useState('');
    const [selectedYouthTeams, setSelectedYouthTeams] = useState({});

    const initializeTable = (numTeams) => {
        const rows = [];
        for (let i = 1; i <= numTeams; i++) {
            rows.push({
                position: i, club_name: '', played: 0, won: 0, drawn: 0, lost: 0,
                goals_for: 0, goals_against: 0, goal_difference: 0, points: 0,
                status: '', highlight_color: ''
            });
        }
        setTableRows(rows);
    };

    const initializeDivisionTable = (divIndex, numTeams) => {
        const rows = [];
        for (let i = 1; i <= numTeams; i++) {
            rows.push({
                position: i, club_name: '', played: 0, won: 0, drawn: 0, lost: 0,
                goals_for: 0, goals_against: 0, goal_difference: 0, points: 0,
                status: '', highlight_color: ''
            });
        }
        const updated = [...divisions];
        updated[divIndex].rows = rows;
        setDivisions(updated);
    };

    const addDivision = () => {
        setDivisions([...divisions, { name: '', teams: 18, rows: [], promotion_spots: 2, relegation_spots: 3 }]);
    };

    const removeDivision = (index) => {
        if (divisions.length > 1) {
            const updated = divisions.filter((_, i) => i !== index);
            setDivisions(updated);
            if (activeDivision >= updated.length) {
                setActiveDivision(updated.length - 1);
            }
        }
    };

    const updateDivision = (index, field, value) => {
        const updated = [...divisions];
        updated[index][field] = value;
        setDivisions(updated);
    };

    const updateDivisionRow = (divIndex, rowIndex, field, value) => {
        const updated = [...divisions];
        const row = updated[divIndex].rows[rowIndex];
        row[field] = field === 'club_name' || field === 'status' || field === 'highlight_color' 
            ? value 
            : parseInt(value) || 0;
        
        if (['goals_for', 'goals_against'].includes(field)) {
            row.goal_difference = row.goals_for - row.goals_against;
        }
        if (['won', 'drawn', 'lost'].includes(field)) {
            row.played = row.won + row.drawn + row.lost;
        }
        setDivisions(updated);
    };

    const setDivisionRowStatus = (divIndex, rowIndex, status) => {
        const updated = [...divisions];
        updated[divIndex].rows[rowIndex].status = status;
        if (status === 'champion') updated[divIndex].rows[rowIndex].highlight_color = seasonData.champion_color;
        else if (status === 'promoted' || status === 'playoff_winner') updated[divIndex].rows[rowIndex].highlight_color = seasonData.promotion_color;
        else if (status === 'relegated') updated[divIndex].rows[rowIndex].highlight_color = seasonData.relegation_color;
        else if (status === 'playoff') updated[divIndex].rows[rowIndex].highlight_color = seasonData.playoff_color;
        else updated[divIndex].rows[rowIndex].highlight_color = '';
        setDivisions(updated);
    };

    const handleDivisionPasteClubs = () => {
        const lines = divisionPasteText.split('\n').filter(line => line.trim());
        if (lines.length === 0) return;

        const updated = [...divisions];
        updated[activeDivision].teams = lines.length;
        updated[activeDivision].rows = lines.map((line, idx) => ({
            position: idx + 1,
            club_name: line.trim(),
            played: 0, won: 0, drawn: 0, lost: 0,
            goals_for: 0, goals_against: 0, goal_difference: 0, points: 0,
            status: '', highlight_color: ''
        }));
        setDivisions(updated);
        setDivisionPasteDialogOpen(false);
        setDivisionPasteText('');
    };

    const applyDivisionAutoStatus = (divIndex) => {
        const updated = [...divisions];
        const div = updated[divIndex];
        const promoSpots = div.promotion_spots || 0;
        const relegSpots = div.relegation_spots || 0;
        
        div.rows = div.rows.map((row, idx) => {
            const pos = idx + 1;
            let status = '';
            let color = '';
            
            if (pos === 1) {
                status = 'champion';
                color = seasonData.champion_color;
            } else if (pos <= promoSpots) {
                status = 'promoted';
                color = seasonData.promotion_color;
            } else if (pos > div.rows.length - relegSpots) {
                status = 'relegated';
                color = seasonData.relegation_color;
            }
            
            return { ...row, status, highlight_color: color };
        });
        setDivisions(updated);
    };

    const handleTeamCountChange = (count) => {
        const num = parseInt(count) || 0;
        setSeasonData({ ...seasonData, number_of_teams: num });
        if (num > 0 && num <= 30) {
            initializeTable(num);
        }
    };

    const updateRow = (index, field, value) => {
        const updated = [...tableRows];
        updated[index][field] = field === 'club_name' || field === 'status' || field === 'highlight_color' 
            ? value 
            : parseInt(value) || 0;
        
        // Auto-calculate goal difference
        if (['goals_for', 'goals_against'].includes(field)) {
            updated[index].goal_difference = updated[index].goals_for - updated[index].goals_against;
        }
        
        // Auto-calculate played games
        if (['won', 'drawn', 'lost'].includes(field)) {
            updated[index].played = updated[index].won + updated[index].drawn + updated[index].lost;
        }

        // Auto-set status based on position
        const pos = updated[index].position;
        if (pos === 1) {
            updated[index].status = 'champion';
            updated[index].highlight_color = seasonData.champion_color;
        } else if (pos <= seasonData.promotion_spots) {
            updated[index].status = 'promoted';
            updated[index].highlight_color = seasonData.promotion_color;
        } else if (pos > seasonData.number_of_teams - seasonData.relegation_spots) {
            updated[index].status = 'relegated';
            updated[index].highlight_color = seasonData.relegation_color;
        }

        setTableRows(updated);
    };

    const setRowStatus = (index, status) => {
        const updated = [...tableRows];
        updated[index].status = status;
        if (status === 'champion') updated[index].highlight_color = seasonData.champion_color;
        else if (status === 'promoted' || status === 'playoff_winner') updated[index].highlight_color = seasonData.promotion_color;
        else if (status === 'relegated') updated[index].highlight_color = seasonData.relegation_color;
        else if (status === 'playoff') updated[index].highlight_color = seasonData.playoff_color;
        else updated[index].highlight_color = '';
        setTableRows(updated);
    };

    const currentTier = seasonData.tier || league?.tier || 1;

    const createSeasonMutation = useMutation({
        mutationFn: async (data) => {
            const isTopTier = currentTier === 1;
            const isTFALeague = currentTier <= 4;

            // Handle multiple divisions
            if (useMultipleDivisions && divisions.length > 0) {
                const allClubIdMaps = {};
                const allSeasons = [];

                for (const div of divisions) {
                    if (!div.name || div.rows.length === 0) continue;

                    // Create season for each division - use per-division promotion/relegation spots
                    const divSeason = await base44.entities.Season.create({
                        league_id: leagueId,
                        year: data.year,
                        tier: data.tier || null,
                        division_name: div.name,
                        division_group: data.division_group || null,
                        number_of_teams: div.rows.filter(r => r.club_name.trim()).length,
                        champion_name: div.rows.find(r => r.status === 'champion')?.club_name || '',
                        runner_up: div.rows.find(r => r.position === 2)?.club_name || '',
                        top_scorer: data.top_scorer,
                        promoted_teams: div.rows.filter(r => r.status === 'promoted' || r.status === 'playoff_winner').map(r => r.club_name).join(', '),
                        relegated_teams: div.rows.filter(r => r.status === 'relegated').map(r => r.club_name).join(', '),
                        champion_color: data.champion_color,
                        promotion_color: data.promotion_color,
                        relegation_color: data.relegation_color,
                        playoff_color: data.playoff_color,
                        promotion_spots: div.promotion_spots || data.promotion_spots,
                        relegation_spots: div.relegation_spots || data.relegation_spots,
                        playoff_spots_start: data.playoff_spots_start || null,
                        playoff_spots_end: data.playoff_spots_end || null,
                        playoff_format: data.playoff_format || null,
                        playoff_winner: data.playoff_winner || null,
                        playoff_runner_up: data.playoff_runner_up || null,
                        playoff_notes: data.playoff_notes || null,
                        notes: data.notes
                    });
                    allSeasons.push({ season: divSeason, division: div });

                    // Process clubs for this division
                    for (const row of div.rows.filter(r => r.club_name.trim())) {
                        const clubName = row.club_name.trim();
                        const existingClub = allNationClubs.find(c => c.name.toLowerCase() === clubName.toLowerCase());
                        const isChampion = row.status === 'champion';
                        const isPromoted = row.status === 'promoted' || row.status === 'playoff_winner';
                        const isRelegated = row.status === 'relegated';

                        if (existingClub) {
                            const updateData = {
                                league_titles: (existingClub.league_titles || 0) + ((isChampion && isTopTier) ? 1 : 0),
                                title_years: (isChampion && isTopTier) ? (existingClub.title_years ? `${existingClub.title_years}, ${data.year}` : data.year) : existingClub.title_years,
                                lower_tier_titles: (existingClub.lower_tier_titles || 0) + ((isChampion && !isTopTier) ? 1 : 0),
                                lower_tier_title_years: (isChampion && !isTopTier) ? (existingClub.lower_tier_title_years ? `${existingClub.lower_tier_title_years}, ${data.year}` : data.year) : existingClub.lower_tier_title_years,
                                seasons_played: (existingClub.seasons_played || 0) + 1,
                                total_wins: (existingClub.total_wins || 0) + (row.won || 0),
                                total_draws: (existingClub.total_draws || 0) + (row.drawn || 0),
                                total_losses: (existingClub.total_losses || 0) + (row.lost || 0),
                                total_goals_scored: (existingClub.total_goals_scored || 0) + (row.goals_for || 0),
                                total_goals_conceded: (existingClub.total_goals_conceded || 0) + (row.goals_against || 0),
                                promotions: (existingClub.promotions || 0) + (isPromoted ? 1 : 0),
                                relegations: (existingClub.relegations || 0) + (isRelegated ? 1 : 0),
                                seasons_top_flight: (existingClub.seasons_top_flight || 0) + (isTopTier ? 1 : 0),
                                seasons_in_tfa: (existingClub.seasons_in_tfa || 0) + (isTFALeague ? 1 : 0),
                            };
                            if (data.year > (existingClub.last_season_year || '')) {
                                updateData.league_id = leagueId;
                                updateData.last_season_year = data.year;
                            }
                            await base44.entities.Club.update(existingClub.id, updateData);
                            allClubIdMaps[clubName] = existingClub.id;
                        } else {
                            const newClub = await base44.entities.Club.create({
                                name: clubName,
                                nation_id: league.nation_id,
                                league_id: leagueId,
                                league_titles: (isChampion && isTopTier) ? 1 : 0,
                                title_years: (isChampion && isTopTier) ? data.year : '',
                                lower_tier_titles: (isChampion && !isTopTier) ? 1 : 0,
                                lower_tier_title_years: (isChampion && !isTopTier) ? data.year : '',
                                best_finish: row.position,
                                best_finish_year: data.year,
                                best_finish_tier: currentTier,
                                last_season_year: data.year,
                                seasons_played: 1,
                                total_wins: row.won || 0,
                                total_draws: row.drawn || 0,
                                total_losses: row.lost || 0,
                                total_goals_scored: row.goals_for || 0,
                                total_goals_conceded: row.goals_against || 0,
                                promotions: isPromoted ? 1 : 0,
                                relegations: isRelegated ? 1 : 0,
                                seasons_top_flight: isTopTier ? 1 : 0,
                                seasons_in_tfa: isTFALeague ? 1 : 0,
                            });
                            allClubIdMaps[clubName] = newClub.id;
                        }
                    }

                    // Create league table entries for this division
                    const tableEntries = div.rows.filter(r => r.club_name.trim()).map(row => ({
                        season_id: divSeason.id,
                        league_id: leagueId,
                        year: data.year,
                        tier: currentTier, // Capture the league's tier at time of creation
                        division_name: div.name,
                        club_id: allClubIdMaps[row.club_name.trim()] || '',
                        ...row
                    }));
                    if (tableEntries.length > 0) {
                        await base44.entities.LeagueTable.bulkCreate(tableEntries);
                    }
                }
                return allSeasons[0]?.season;
            }

            // Single division logic
            const season = await base44.entities.Season.create({
                league_id: leagueId,
                year: data.year,
                tier: data.tier || null,
                division_name: data.division_name || null,
                division_group: data.division_group || null,
                number_of_teams: data.number_of_teams,
                champion_name: tableRows.find(r => r.status === 'champion')?.club_name || '',
                runner_up: tableRows.find(r => r.position === 2)?.club_name || '',
                top_scorer: data.top_scorer,
                promoted_teams: tableRows.filter(r => r.status === 'promoted' || r.status === 'playoff_winner').map(r => r.club_name).join(', '),
                relegated_teams: tableRows.filter(r => r.status === 'relegated').map(r => r.club_name).join(', '),
                champion_color: data.champion_color,
                promotion_color: data.promotion_color,
                relegation_color: data.relegation_color,
                playoff_color: data.playoff_color,
                promotion_spots: data.promotion_spots,
                relegation_spots: data.relegation_spots,
                playoff_spots_start: data.playoff_spots_start || null,
                playoff_spots_end: data.playoff_spots_end || null,
                playoff_format: data.playoff_format || null,
                playoff_winner: data.playoff_winner || null,
                playoff_runner_up: data.playoff_runner_up || null,
                playoff_notes: data.playoff_notes || null,
                notes: data.notes
            });
            // Process each club in the table - create new or update existing
            const clubIdMap = {};
            for (const row of tableRows.filter(r => r.club_name.trim())) {
                const clubName = row.club_name.trim();
                
                // Check if club already exists in the nation
                const existingClub = allNationClubs.find(
                    c => c.name.toLowerCase() === clubName.toLowerCase()
                );

                if (existingClub) {
                    // Update existing club stats
                    const isChampion = row.status === 'champion';
                    const isPromoted = row.status === 'promoted';
                    const isRelegated = row.status === 'relegated';

                    // Only count league titles if this is tier 1 (top tier)
                    const currentTitles = existingClub.league_titles || 0;
                    const currentTitleYears = existingClub.title_years || '';
                    const newTitles = (isChampion && isTopTier) ? currentTitles + 1 : currentTitles;
                    const newTitleYears = (isChampion && isTopTier)
                        ? (currentTitleYears ? `${currentTitleYears}, ${data.year}` : data.year)
                        : currentTitleYears;

                    // Track lower-tier titles separately
                    const currentLowerTitles = existingClub.lower_tier_titles || 0;
                    const currentLowerTitleYears = existingClub.lower_tier_title_years || '';
                    const newLowerTitles = (isChampion && !isTopTier) ? currentLowerTitles + 1 : currentLowerTitles;
                    const newLowerTitleYears = (isChampion && !isTopTier)
                        ? (currentLowerTitleYears ? `${currentLowerTitleYears}, ${data.year}` : data.year)
                        : currentLowerTitleYears;

                    // Best finish: prioritize the highest tier (lowest tier number)
                    // Then within same tier, the best position (lowest number)
                    const existingBestTier = existingClub.best_finish_tier || 999;
                    const existingBestFinish = existingClub.best_finish || 999;
                    
                    let newBestFinish = existingBestFinish;
                    let newBestFinishYear = existingClub.best_finish_year;
                    let newBestFinishTier = existingBestTier;

                    // Current tier is HIGHER (better) if its number is LOWER
                    // e.g., tier 1 < tier 2 means tier 1 is better
                    if (currentTier < existingBestTier) {
                        // This is a higher tier than previous best - always update
                        newBestFinish = row.position;
                        newBestFinishYear = data.year;
                        newBestFinishTier = currentTier;
                    } else if (currentTier === existingBestTier && row.position < existingBestFinish) {
                        // Same tier but better position
                        newBestFinish = row.position;
                        newBestFinishYear = data.year;
                        newBestFinishTier = currentTier;
                    }
                    // If currentTier > existingBestTier, don't update (lower tier finish doesn't count)

                    // Update current league based on most recent season
                    const existingLastSeasonYear = existingClub.last_season_year || '';
                    const shouldUpdateCurrentLeague = data.year > existingLastSeasonYear || !existingLastSeasonYear;

                    const updateData = {
                        league_titles: newTitles,
                        title_years: newTitleYears,
                        lower_tier_titles: newLowerTitles,
                        lower_tier_title_years: newLowerTitleYears,
                        best_finish: newBestFinish,
                        best_finish_year: newBestFinishYear,
                        best_finish_tier: newBestFinishTier,
                        seasons_played: (existingClub.seasons_played || 0) + 1,
                        total_wins: (existingClub.total_wins || 0) + (row.won || 0),
                        total_draws: (existingClub.total_draws || 0) + (row.drawn || 0),
                        total_losses: (existingClub.total_losses || 0) + (row.lost || 0),
                        total_goals_scored: (existingClub.total_goals_scored || 0) + (row.goals_for || 0),
                        total_goals_conceded: (existingClub.total_goals_conceded || 0) + (row.goals_against || 0),
                        promotions: (existingClub.promotions || 0) + ((isPromoted || row.status === 'playoff_winner') ? 1 : 0),
                        relegations: (existingClub.relegations || 0) + (isRelegated ? 1 : 0),
                        seasons_top_flight: (existingClub.seasons_top_flight || 0) + (isTopTier ? 1 : 0),
                        seasons_in_tfa: (existingClub.seasons_in_tfa || 0) + (isTFALeague ? 1 : 0),
                        };

                    // Only update current league if this is the most recent season
                    if (shouldUpdateCurrentLeague) {
                        updateData.league_id = leagueId;
                        updateData.last_season_year = data.year;
                    }

                    await base44.entities.Club.update(existingClub.id, updateData);
                    clubIdMap[clubName] = existingClub.id;
                } else {
                    // Create new club
                    const isChampion = row.status === 'champion';
                    const isPromoted = row.status === 'promoted' || row.status === 'playoff_winner';
                    const isRelegated = row.status === 'relegated';

                    const newClub = await base44.entities.Club.create({
                        name: clubName,
                        nation_id: league.nation_id,
                        league_id: leagueId,
                        league_titles: (isChampion && isTopTier) ? 1 : 0,
                        title_years: (isChampion && isTopTier) ? data.year : '',
                        lower_tier_titles: (isChampion && !isTopTier) ? 1 : 0,
                        lower_tier_title_years: (isChampion && !isTopTier) ? data.year : '',
                        best_finish: row.position,
                        best_finish_year: data.year,
                        best_finish_tier: currentTier,
                        last_season_year: data.year,
                        seasons_played: 1,
                        total_wins: row.won || 0,
                        total_draws: row.drawn || 0,
                        total_losses: row.lost || 0,
                        total_goals_scored: row.goals_for || 0,
                        total_goals_conceded: row.goals_against || 0,
                        promotions: isPromoted ? 1 : 0,
                        relegations: isRelegated ? 1 : 0,
                        seasons_top_flight: isTopTier ? 1 : 0,
                        seasons_in_tfa: isTFALeague ? 1 : 0,
                    });
                    clubIdMap[clubName] = newClub.id;
                }
            }

            // Create league table entries with club IDs (and youth team IDs if youth league)
            const isYouthLeague = league.league_type === 'youth';
            const tableEntries = tableRows.filter(r => r.club_name.trim()).map(row => ({
                season_id: season.id,
                league_id: leagueId,
                year: data.year,
                tier: currentTier, // Capture the league's tier at time of creation
                division_name: data.division_name || null,
                club_id: clubIdMap[row.club_name.trim()] || '',
                youth_team_id: isYouthLeague ? selectedYouthTeams[row.position] : null,
                ...row
            }));

            if (tableEntries.length > 0) {
                await base44.entities.LeagueTable.bulkCreate(tableEntries);
            }

            // Auto-update stability for all clubs in this season
            const affectedClubIds = Object.values(clubIdMap);
            if (affectedClubIds.length > 0) {
                await recalculateStabilityAfterSeason(affectedClubIds);
            }

            return season;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['leagueSeasons']);
            queryClient.invalidateQueries(['leagueTables']);
            queryClient.invalidateQueries(['clubs']);
            queryClient.invalidateQueries(['nationClubs']);
            queryClient.invalidateQueries(['allClubs']);
            navigate(createPageUrl(`LeagueDetail?id=${leagueId}`));
        },
    });

    const handleSubmit = () => {
        createSeasonMutation.mutate(seasonData);
    };

    const applyAutoStatus = () => {
        const updated = tableRows.map((row, idx) => {
            const pos = idx + 1;
            let status = '';
            let color = '';
            
            if (pos === 1) {
                status = 'champion';
                color = seasonData.champion_color;
            } else if (pos <= seasonData.promotion_spots) {
                status = 'promoted';
                color = seasonData.promotion_color;
            } else if (seasonData.playoff_spots_start && seasonData.playoff_spots_end && 
                       pos >= seasonData.playoff_spots_start && pos <= seasonData.playoff_spots_end) {
                status = 'playoff';
                color = seasonData.playoff_color;
            } else if (pos > seasonData.number_of_teams - seasonData.relegation_spots) {
                status = 'relegated';
                color = seasonData.relegation_color;
            }
            
            return { ...row, status, highlight_color: color };
        });
        setTableRows(updated);
    };

    const handlePasteClubs = () => {
        const lines = pasteText.split('\n').filter(line => line.trim());
        if (lines.length === 0) return;

        // Update team count if needed
        if (lines.length !== tableRows.length) {
            setSeasonData(prev => ({ ...prev, number_of_teams: lines.length }));
        }

        const newRows = lines.map((line, idx) => {
            const clubName = line.trim();
            return {
                position: idx + 1,
                club_name: clubName,
                played: 0, won: 0, drawn: 0, lost: 0,
                goals_for: 0, goals_against: 0, goal_difference: 0, points: 0,
                status: '', highlight_color: ''
            };
        });

        setTableRows(newRows);
        setPasteDialogOpen(false);
        setPasteText('');
    };

    if (!league) {
        return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <PageHeader 
                title="Add Season"
                subtitle={`Create a new season for ${league.name}`}
                breadcrumbs={[
                    { label: 'Nations', url: createPageUrl('Nations') },
                    { label: league.name, url: createPageUrl(`LeagueDetail?id=${leagueId}`) },
                    { label: 'Add Season' }
                ]}
            />

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                {/* Season Info */}
                <Card className="border-0 shadow-sm">
                    <CardHeader><CardTitle>Season Details</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <Label>Season Year *</Label>
                                <Input value={seasonData.year} onChange={(e) => setSeasonData({...seasonData, year: e.target.value})} placeholder="e.g., 2023-24" className="mt-1" />
                            </div>
                            <div>
                                <Label>Number of Teams</Label>
                                <Input type="number" min="2" max="30" value={seasonData.number_of_teams} onChange={(e) => handleTeamCountChange(e.target.value)} className="mt-1" />
                            </div>
                            <div>
                                <Label>Promotion Spots</Label>
                                <Input type="number" min="0" value={seasonData.promotion_spots} onChange={(e) => setSeasonData({...seasonData, promotion_spots: parseInt(e.target.value) || 0})} className="mt-1" />
                            </div>
                            <div>
                                <Label>Relegation Spots</Label>
                                <Input type="number" min="0" value={seasonData.relegation_spots} onChange={(e) => setSeasonData({...seasonData, relegation_spots: parseInt(e.target.value) || 0})} className="mt-1" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div>
                                <Label>Tier Override (if moved)</Label>
                                <Input type="number" min="1" value={seasonData.tier || ''} onChange={(e) => setSeasonData({...seasonData, tier: e.target.value ? parseInt(e.target.value) : null})} placeholder={`Default: ${league?.tier || 1}`} className="mt-1" />
                            </div>
                            <div>
                                <Label>Division Name (if split)</Label>
                                <Input value={seasonData.division_name} onChange={(e) => setSeasonData({...seasonData, division_name: e.target.value})} placeholder="e.g., North, South, A" className="mt-1" />
                            </div>
                            <div>
                                <Label>Division Group</Label>
                                <Input value={seasonData.division_group} onChange={(e) => setSeasonData({...seasonData, division_group: e.target.value})} placeholder="e.g., Regional" className="mt-1" />
                            </div>
                        </div>
                        <div>
                            <Label>Top Scorer</Label>
                            <Input value={seasonData.top_scorer} onChange={(e) => setSeasonData({...seasonData, top_scorer: e.target.value})} placeholder="e.g., John Smith (25 goals)" className="mt-1" />
                        </div>
                    </CardContent>
                </Card>

                {/* Promotion Playoffs */}
                <Card className="border-0 shadow-sm">
                    <CardHeader><CardTitle>Promotion Playoffs (Optional)</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <Label>Playoff Start Position</Label>
                                <Input type="number" min="1" value={seasonData.playoff_spots_start || ''} onChange={(e) => setSeasonData({...seasonData, playoff_spots_start: e.target.value ? parseInt(e.target.value) : null})} placeholder="e.g., 4" className="mt-1" />
                            </div>
                            <div>
                                <Label>Playoff End Position</Label>
                                <Input type="number" min="1" value={seasonData.playoff_spots_end || ''} onChange={(e) => setSeasonData({...seasonData, playoff_spots_end: e.target.value ? parseInt(e.target.value) : null})} placeholder="e.g., 6" className="mt-1" />
                            </div>
                            <div>
                                <Label>Playoff Winner</Label>
                                <Input value={seasonData.playoff_winner} onChange={(e) => setSeasonData({...seasonData, playoff_winner: e.target.value})} placeholder="Club promoted via playoff" className="mt-1" />
                            </div>
                            <div>
                                <Label>Playoff Runner-up</Label>
                                <Input value={seasonData.playoff_runner_up} onChange={(e) => setSeasonData({...seasonData, playoff_runner_up: e.target.value})} placeholder="Lost in final" className="mt-1" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Playoff Format</Label>
                                <Input value={seasonData.playoff_format} onChange={(e) => setSeasonData({...seasonData, playoff_format: e.target.value})} placeholder="e.g., Semi-finals then Final" className="mt-1" />
                            </div>
                            <div>
                                <Label>Playoff Notes</Label>
                                <Input value={seasonData.playoff_notes} onChange={(e) => setSeasonData({...seasonData, playoff_notes: e.target.value})} placeholder="e.g., Final: 2-1 at Wembley" className="mt-1" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Highlight Colors */}
                <Card className="border-0 shadow-sm">
                    <CardHeader><CardTitle>Position Highlight Colors</CardTitle></CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div>
                                <Label className="flex items-center gap-2"><Trophy className="w-4 h-4 text-amber-500" /> Champion Color</Label>
                                <div className="flex gap-2 mt-1">
                                    <input type="color" value={seasonData.champion_color} onChange={(e) => setSeasonData({...seasonData, champion_color: e.target.value})} className="w-12 h-10 rounded cursor-pointer border" />
                                    <Input value={seasonData.champion_color} onChange={(e) => setSeasonData({...seasonData, champion_color: e.target.value})} />
                                </div>
                            </div>
                            <div>
                                <Label className="flex items-center gap-2"><ArrowUp className="w-4 h-4 text-green-500" /> Promotion Color</Label>
                                <div className="flex gap-2 mt-1">
                                    <input type="color" value={seasonData.promotion_color} onChange={(e) => setSeasonData({...seasonData, promotion_color: e.target.value})} className="w-12 h-10 rounded cursor-pointer border" />
                                    <Input value={seasonData.promotion_color} onChange={(e) => setSeasonData({...seasonData, promotion_color: e.target.value})} />
                                </div>
                            </div>
                            <div>
                                <Label className="flex items-center gap-2"><ArrowDown className="w-4 h-4 text-red-500" /> Relegation Color</Label>
                                <div className="flex gap-2 mt-1">
                                    <input type="color" value={seasonData.relegation_color} onChange={(e) => setSeasonData({...seasonData, relegation_color: e.target.value})} className="w-12 h-10 rounded cursor-pointer border" />
                                    <Input value={seasonData.relegation_color} onChange={(e) => setSeasonData({...seasonData, relegation_color: e.target.value})} />
                                </div>
                            </div>
                            <div>
                                <Label className="flex items-center gap-2">🔄 Playoff Color</Label>
                                <div className="flex gap-2 mt-1">
                                    <input type="color" value={seasonData.playoff_color} onChange={(e) => setSeasonData({...seasonData, playoff_color: e.target.value})} className="w-12 h-10 rounded cursor-pointer border" />
                                    <Input value={seasonData.playoff_color} onChange={(e) => setSeasonData({...seasonData, playoff_color: e.target.value})} />
                                </div>
                            </div>
                        </div>
                        <Button variant="outline" onClick={applyAutoStatus} className="mt-4">
                            Apply Auto-Status Based on Position
                        </Button>
                    </CardContent>
                </Card>

                {/* Multiple Divisions Toggle */}
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-4">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={useMultipleDivisions} 
                                onChange={(e) => setUseMultipleDivisions(e.target.checked)}
                                className="w-5 h-5 rounded"
                            />
                            <div>
                                <div className="font-medium flex items-center gap-2">
                                    <Layers className="w-4 h-4" />
                                    Multiple Divisions
                                </div>
                                <p className="text-sm text-slate-500">Enable if this season had multiple divisions (e.g., North/South, Group A/B)</p>
                            </div>
                        </label>
                    </CardContent>
                </Card>

                {/* League Table Builder - Single Division */}
                {!useMultipleDivisions && (
                    <Card className="border-0 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>League Table</CardTitle>
                            <div className="flex gap-2">
                                <Dialog open={pasteDialogOpen} onOpenChange={setPasteDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline">
                                            <ClipboardPaste className="w-4 h-4 mr-2" /> Paste Club List
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Paste Club Names</DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-4 py-4">
                                            <p className="text-sm text-slate-500">
                                                Paste club names (one per line) in order of league position.
                                            </p>
                                            <Textarea
                                                value={pasteText}
                                                onChange={(e) => setPasteText(e.target.value)}
                                                placeholder={"1st Place FC\n2nd Place United\n3rd Place City\n..."}
                                                rows={12}
                                                className="font-mono text-sm"
                                            />
                                            <p className="text-xs text-slate-400">
                                                {pasteText.split('\n').filter(l => l.trim()).length} clubs detected
                                            </p>
                                            <div className="flex justify-end gap-2">
                                                <Button variant="outline" onClick={() => setPasteDialogOpen(false)}>Cancel</Button>
                                                <Button onClick={handlePasteClubs} disabled={!pasteText.trim()} className="bg-emerald-600 hover:bg-emerald-700">
                                                    Populate Table
                                                </Button>
                                            </div>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                                <AIStatsGenerator 
                                    tableRows={tableRows}
                                    setTableRows={setTableRows}
                                    seasonData={seasonData}
                                    league={league}
                                />
                                {tableRows.length === 0 && (
                                    <Button onClick={() => initializeTable(seasonData.number_of_teams)}>
                                        <Plus className="w-4 h-4 mr-2" /> Generate Empty Table
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            {tableRows.length === 0 ? (
                                <p className="text-center py-8 text-slate-500">Click "Generate Table" to create the league table with {seasonData.number_of_teams} teams</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-slate-100">
                                                <TableHead className="w-12">#</TableHead>
                                                <TableHead className="min-w-[180px]">Club</TableHead>
                                                <TableHead className="w-14 text-center">P</TableHead>
                                                <TableHead className="w-14 text-center">W</TableHead>
                                                <TableHead className="w-14 text-center">D</TableHead>
                                                <TableHead className="w-14 text-center">L</TableHead>
                                                <TableHead className="w-14 text-center">GF</TableHead>
                                                <TableHead className="w-14 text-center">GA</TableHead>
                                                <TableHead className="w-14 text-center">GD</TableHead>
                                                <TableHead className="w-14 text-center">Pts</TableHead>
                                                <TableHead className="w-32">Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {tableRows.map((row, idx) => (
                                                <TableRow key={idx} style={{ backgroundColor: row.highlight_color || 'transparent' }}>
                                                    <TableCell className="font-bold">{row.position}</TableCell>
                                                    <TableCell>
                                                        {league.league_type === 'youth' ? (
                                                            <Select 
                                                                value={selectedYouthTeams[row.position] || ''} 
                                                                onValueChange={(v) => {
                                                                    setSelectedYouthTeams({...selectedYouthTeams, [row.position]: v});
                                                                    const yt = youthTeams.find(t => t.id === v);
                                                                    if (yt) updateRow(idx, 'club_name', yt.name);
                                                                }}
                                                            >
                                                                <SelectTrigger className="h-8">
                                                                    <SelectValue placeholder="Select youth team" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {youthTeams.filter(yt => yt.age_group === league.age_group).map(yt => (
                                                                        <SelectItem key={yt.id} value={yt.id}>
                                                                            {yt.name}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        ) : (
                                                            <Input 
                                                                value={row.club_name} 
                                                                onChange={(e) => updateRow(idx, 'club_name', e.target.value)} 
                                                                placeholder="Club name"
                                                                className="h-8"
                                                            />
                                                        )}
                                                    </TableCell>
                                                    <TableCell><Input type="number" value={row.played} onChange={(e) => updateRow(idx, 'played', e.target.value)} className="h-8 w-14 text-center p-1" /></TableCell>
                                                    <TableCell><Input type="number" value={row.won} onChange={(e) => updateRow(idx, 'won', e.target.value)} className="h-8 w-14 text-center p-1" /></TableCell>
                                                    <TableCell><Input type="number" value={row.drawn} onChange={(e) => updateRow(idx, 'drawn', e.target.value)} className="h-8 w-14 text-center p-1" /></TableCell>
                                                    <TableCell><Input type="number" value={row.lost} onChange={(e) => updateRow(idx, 'lost', e.target.value)} className="h-8 w-14 text-center p-1" /></TableCell>
                                                    <TableCell><Input type="number" value={row.goals_for} onChange={(e) => updateRow(idx, 'goals_for', e.target.value)} className="h-8 w-14 text-center p-1" /></TableCell>
                                                    <TableCell><Input type="number" value={row.goals_against} onChange={(e) => updateRow(idx, 'goals_against', e.target.value)} className="h-8 w-14 text-center p-1" /></TableCell>
                                                    <TableCell className="text-center font-medium">{row.goal_difference}</TableCell>
                                                    <TableCell><Input type="number" value={row.points} onChange={(e) => updateRow(idx, 'points', e.target.value)} className="h-8 w-14 text-center p-1 font-bold" /></TableCell>
                                                    <TableCell>
                                                        <Select value={row.status} onValueChange={(v) => setRowStatus(idx, v)}>
                                                            <SelectTrigger className="h-8 w-28">
                                                                <SelectValue placeholder="Status" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="none">None</SelectItem>
                                                                <SelectItem value="champion">🏆 Champion</SelectItem>
                                                                <SelectItem value="promoted">⬆️ Promoted</SelectItem>
                                                                <SelectItem value="playoff_winner">🎯 Playoff Winner</SelectItem>
                                                                <SelectItem value="playoff">🔄 Playoff</SelectItem>
                                                                <SelectItem value="relegated">⬇️ Relegated</SelectItem>
                                                                <SelectItem value="european">⭐ European</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* League Table Builder - Multiple Divisions */}
                {useMultipleDivisions && (
                    <Card className="border-0 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <Layers className="w-5 h-5" />
                                Division Tables
                            </CardTitle>
                            <Button onClick={addDivision} variant="outline">
                                <Plus className="w-4 h-4 mr-2" /> Add Division
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <Tabs value={String(activeDivision)} onValueChange={(v) => setActiveDivision(parseInt(v))}>
                                <TabsList className="mb-4">
                                    {divisions.map((div, idx) => (
                                        <TabsTrigger key={idx} value={String(idx)}>
                                            {div.name || `Division ${idx + 1}`}
                                        </TabsTrigger>
                                    ))}
                                </TabsList>
                                
                                {divisions.map((div, divIdx) => (
                                    <TabsContent key={divIdx} value={String(divIdx)}>
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 items-end">
                                                <div className="md:col-span-2">
                                                    <Label>Division Name *</Label>
                                                    <Input 
                                                        value={div.name} 
                                                        onChange={(e) => updateDivision(divIdx, 'name', e.target.value)}
                                                        placeholder="e.g., North, South, Group A"
                                                        className="mt-1"
                                                    />
                                                </div>
                                                <div>
                                                    <Label>Teams</Label>
                                                    <Input 
                                                        type="number" 
                                                        min="2" 
                                                        max="30"
                                                        value={div.teams} 
                                                        onChange={(e) => updateDivision(divIdx, 'teams', parseInt(e.target.value) || 18)}
                                                        className="mt-1"
                                                    />
                                                </div>
                                                <div>
                                                    <Label>Promotion Spots</Label>
                                                    <Input 
                                                        type="number" 
                                                        min="0"
                                                        value={div.promotion_spots || 0} 
                                                        onChange={(e) => updateDivision(divIdx, 'promotion_spots', parseInt(e.target.value) || 0)}
                                                        className="mt-1"
                                                    />
                                                </div>
                                                <div>
                                                    <Label>Relegation Spots</Label>
                                                    <Input 
                                                        type="number" 
                                                        min="0"
                                                        value={div.relegation_spots || 0} 
                                                        onChange={(e) => updateDivision(divIdx, 'relegation_spots', parseInt(e.target.value) || 0)}
                                                        className="mt-1"
                                                    />
                                                </div>
                                                {divisions.length > 1 && (
                                                    <Button 
                                                        onClick={() => removeDivision(divIdx)}
                                                        variant="ghost"
                                                        className="text-red-500 hover:text-red-700"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                <Dialog open={divisionPasteDialogOpen && activeDivision === divIdx} onOpenChange={(open) => {
                                                    setDivisionPasteDialogOpen(open);
                                                    if (!open) setDivisionPasteText('');
                                                }}>
                                                    <DialogTrigger asChild>
                                                        <Button variant="outline" onClick={() => setActiveDivision(divIdx)}>
                                                            <ClipboardPaste className="w-4 h-4 mr-2" /> Paste Club List
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent>
                                                        <DialogHeader>
                                                            <DialogTitle>Paste Club Names - {div.name || `Division ${divIdx + 1}`}</DialogTitle>
                                                        </DialogHeader>
                                                        <div className="space-y-4 py-4">
                                                            <p className="text-sm text-slate-500">
                                                                Paste club names (one per line) in order of league position.
                                                            </p>
                                                            <Textarea
                                                                value={divisionPasteText}
                                                                onChange={(e) => setDivisionPasteText(e.target.value)}
                                                                placeholder={"1st Place FC\n2nd Place United\n3rd Place City\n..."}
                                                                rows={12}
                                                                className="font-mono text-sm"
                                                            />
                                                            <p className="text-xs text-slate-400">
                                                                {divisionPasteText.split('\n').filter(l => l.trim()).length} clubs detected
                                                            </p>
                                                            <div className="flex justify-end gap-2">
                                                                <Button variant="outline" onClick={() => setDivisionPasteDialogOpen(false)}>Cancel</Button>
                                                                <Button onClick={handleDivisionPasteClubs} disabled={!divisionPasteText.trim()} className="bg-emerald-600 hover:bg-emerald-700">
                                                                    Populate Table
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </DialogContent>
                                                </Dialog>
                                                <Button 
                                                    onClick={() => initializeDivisionTable(divIdx, div.teams)}
                                                    variant="outline"
                                                >
                                                    Generate Empty Table
                                                </Button>
                                                {div.rows.length > 0 && (
                                                    <>
                                                        <AIStatsGenerator 
                                                            tableRows={div.rows}
                                                            setTableRows={(newRows) => {
                                                                const updated = [...divisions];
                                                                updated[divIdx].rows = newRows;
                                                                setDivisions(updated);
                                                            }}
                                                            seasonData={seasonData}
                                                            league={league}
                                                            divisionTeamCount={div.rows.filter(r => r.club_name).length}
                                                        />
                                                        <Button 
                                                            onClick={() => applyDivisionAutoStatus(divIdx)}
                                                            variant="outline"
                                                        >
                                                            Apply Auto-Status
                                                        </Button>
                                                    </>
                                                )}
                                            </div>

                                            {div.rows.length > 0 && (
                                                <div className="overflow-x-auto">
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow className="bg-slate-100">
                                                                <TableHead className="w-12">#</TableHead>
                                                                <TableHead className="min-w-[180px]">Club</TableHead>
                                                                <TableHead className="w-14 text-center">P</TableHead>
                                                                <TableHead className="w-14 text-center">W</TableHead>
                                                                <TableHead className="w-14 text-center">D</TableHead>
                                                                <TableHead className="w-14 text-center">L</TableHead>
                                                                <TableHead className="w-14 text-center">GF</TableHead>
                                                                <TableHead className="w-14 text-center">GA</TableHead>
                                                                <TableHead className="w-14 text-center">GD</TableHead>
                                                                <TableHead className="w-14 text-center">Pts</TableHead>
                                                                <TableHead className="w-32">Status</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {div.rows.map((row, rowIdx) => (
                                                                <TableRow key={rowIdx} style={{ backgroundColor: row.highlight_color || 'transparent' }}>
                                                                    <TableCell className="font-bold">{row.position}</TableCell>
                                                                    <TableCell>
                                                                        <Input 
                                                                            value={row.club_name} 
                                                                            onChange={(e) => updateDivisionRow(divIdx, rowIdx, 'club_name', e.target.value)} 
                                                                            placeholder="Club name"
                                                                            className="h-8"
                                                                        />
                                                                    </TableCell>
                                                                    <TableCell><Input type="number" value={row.played} onChange={(e) => updateDivisionRow(divIdx, rowIdx, 'played', e.target.value)} className="h-8 w-14 text-center p-1" /></TableCell>
                                                                    <TableCell><Input type="number" value={row.won} onChange={(e) => updateDivisionRow(divIdx, rowIdx, 'won', e.target.value)} className="h-8 w-14 text-center p-1" /></TableCell>
                                                                    <TableCell><Input type="number" value={row.drawn} onChange={(e) => updateDivisionRow(divIdx, rowIdx, 'drawn', e.target.value)} className="h-8 w-14 text-center p-1" /></TableCell>
                                                                    <TableCell><Input type="number" value={row.lost} onChange={(e) => updateDivisionRow(divIdx, rowIdx, 'lost', e.target.value)} className="h-8 w-14 text-center p-1" /></TableCell>
                                                                    <TableCell><Input type="number" value={row.goals_for} onChange={(e) => updateDivisionRow(divIdx, rowIdx, 'goals_for', e.target.value)} className="h-8 w-14 text-center p-1" /></TableCell>
                                                                    <TableCell><Input type="number" value={row.goals_against} onChange={(e) => updateDivisionRow(divIdx, rowIdx, 'goals_against', e.target.value)} className="h-8 w-14 text-center p-1" /></TableCell>
                                                                    <TableCell className="text-center font-medium">{row.goal_difference}</TableCell>
                                                                    <TableCell><Input type="number" value={row.points} onChange={(e) => updateDivisionRow(divIdx, rowIdx, 'points', e.target.value)} className="h-8 w-14 text-center p-1 font-bold" /></TableCell>
                                                                    <TableCell>
                                                                        <Select value={row.status} onValueChange={(v) => setDivisionRowStatus(divIdx, rowIdx, v)}>
                                                                            <SelectTrigger className="h-8 w-28">
                                                                                <SelectValue placeholder="Status" />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                <SelectItem value="none">None</SelectItem>
                                                                                <SelectItem value="champion">🏆 Champion</SelectItem>
                                                                                <SelectItem value="promoted">⬆️ Promoted</SelectItem>
                                                                                <SelectItem value="playoff_winner">🎯 Playoff Winner</SelectItem>
                                                                                <SelectItem value="playoff">🔄 Playoff</SelectItem>
                                                                                <SelectItem value="relegated">⬇️ Relegated</SelectItem>
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            )}
                                        </div>
                                    </TabsContent>
                                ))}
                            </Tabs>
                        </CardContent>
                    </Card>
                )}

                {/* Notes */}
                <Card className="border-0 shadow-sm">
                    <CardHeader><CardTitle>Additional Notes</CardTitle></CardHeader>
                    <CardContent>
                        <Textarea value={seasonData.notes} onChange={(e) => setSeasonData({...seasonData, notes: e.target.value})} rows={3} placeholder="Any additional notes about this season..." />
                    </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex items-center justify-between">
                    <Button variant="ghost" onClick={() => navigate(-1)}>
                        <ArrowLeft className="w-4 h-4 mr-2" /> Cancel
                    </Button>
                    <Button 
                        onClick={handleSubmit} 
                        disabled={createSeasonMutation.isPending || !seasonData.year} 
                        className="bg-emerald-600 hover:bg-emerald-700"
                    >
                        {createSeasonMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</> : <><Save className="w-4 h-4 mr-2" /> Create Season</>}
                    </Button>
                </div>
            </div>
        </div>
    );
}