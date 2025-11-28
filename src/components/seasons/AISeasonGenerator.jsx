import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, Trophy, TrendingUp, TrendingDown, Shield, Check, X } from 'lucide-react';
import { getStabilityStatus } from '../clubs/StabilityCalculator';

export default function AISeasonGenerator({ leagueId, onComplete }) {
    const queryClient = useQueryClient();
    const [year, setYear] = useState('');
    const [selectedClubIds, setSelectedClubIds] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedTable, setGeneratedTable] = useState(null);
    const [promotionSpots, setPromotionSpots] = useState(2);
    const [relegationSpots, setRelegationSpots] = useState(2);

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
        queryKey: ['clubsByNation', league?.nation_id],
        queryFn: () => base44.entities.Club.filter({ nation_id: league.nation_id }),
        enabled: !!league?.nation_id,
    });

    const { data: leagueTables = [] } = useQuery({
        queryKey: ['leagueTables', leagueId],
        queryFn: () => base44.entities.LeagueTable.filter({ league_id: leagueId }),
        enabled: !!leagueId,
    });

    const { data: allLeagueTables = [] } = useQuery({
        queryKey: ['allLeagueTables'],
        queryFn: () => base44.entities.LeagueTable.list(),
    });

    const { data: leagues = [] } = useQuery({
        queryKey: ['allLeagues'],
        queryFn: () => base44.entities.League.list(),
    });

    // Get previous season
    const previousSeason = useMemo(() => {
        const years = [...new Set(leagueTables.map(lt => lt.year))].sort().reverse();
        return years[0];
    }, [leagueTables]);

    // Calculate club strength based on history and stability
    const calculateClubStrength = (club) => {
        const clubHistory = allLeagueTables.filter(lt => lt.club_id === club.id);
        let strength = 50; // Base strength

        // Stability influence (0-30 points)
        const stabilityPoints = club.stability_points || 10;
        strength += Math.min(30, Math.max(-10, (stabilityPoints - 10) * 1.5));

        // Recent form (last 3 seasons)
        const recentSeasons = clubHistory
            .sort((a, b) => b.year.localeCompare(a.year))
            .slice(0, 3);
        
        recentSeasons.forEach((season, idx) => {
            const weight = 3 - idx; // More recent = more weight
            const seasonLeague = leagues.find(l => l.id === season.league_id);
            const tier = seasonLeague?.tier || 5;
            
            // Position bonus (inverse - lower position = higher bonus)
            const posBonus = (20 - season.position) * weight * 0.5;
            strength += posBonus;

            // Tier bonus (playing in higher tier = stronger)
            strength += (5 - tier) * weight * 2;
        });

        // Historical success
        strength += (club.league_titles || 0) * 2;
        strength += (club.promotions || 0) * 0.5;
        strength -= (club.relegations || 0) * 0.3;

        // Continental experience
        strength += (club.vcc_appearances || 0) * 1;
        strength += (club.ccc_appearances || 0) * 0.5;

        return Math.max(10, Math.min(100, strength));
    };

    // Available clubs for selection
    const availableClubs = useMemo(() => {
        return clubs
            .filter(c => !c.is_former_name && !c.is_defunct)
            .map(c => ({
                ...c,
                strength: calculateClubStrength(c),
                stabilityStatus: getStabilityStatus(c.stability_points || 10)
            }))
            .sort((a, b) => b.strength - a.strength);
    }, [clubs, allLeagueTables, leagues]);

    const toggleClub = (clubId) => {
        setSelectedClubIds(prev => 
            prev.includes(clubId) 
                ? prev.filter(id => id !== clubId)
                : [...prev, clubId]
        );
    };

    const generateSeason = async () => {
        if (selectedClubIds.length < 4 || !year) return;
        
        setIsGenerating(true);
        
        const selectedClubs = availableClubs.filter(c => selectedClubIds.includes(c.id));
        const numTeams = selectedClubs.length;
        const gamesPerTeam = (numTeams - 1) * 2; // Home and away

        // Generate table based on strength with randomness
        const tableData = selectedClubs.map(club => {
            // Add randomness to strength for this season (±15%)
            const seasonStrength = club.strength * (0.85 + Math.random() * 0.3);
            return { club, seasonStrength };
        });

        // Sort by season strength
        tableData.sort((a, b) => b.seasonStrength - a.seasonStrength);

        // Generate realistic stats for each position
        const generatedRows = tableData.map((item, index) => {
            const position = index + 1;
            const { club, seasonStrength } = item;

            // Expected points based on position (roughly linear distribution)
            const topPoints = gamesPerTeam * 2.5; // ~2.5 per game for champions
            const bottomPoints = gamesPerTeam * 0.6; // ~0.6 per game for bottom
            const expectedPoints = topPoints - ((position - 1) / (numTeams - 1)) * (topPoints - bottomPoints);
            
            // Add some randomness
            const points = Math.round(expectedPoints * (0.9 + Math.random() * 0.2));
            
            // Calculate W/D/L from points
            // Approximate: wins = (points - draws) / 3, assuming ~25% draws
            const draws = Math.round(gamesPerTeam * (0.2 + Math.random() * 0.15));
            const winsFromPoints = (points - draws) / 3;
            const wins = Math.max(0, Math.min(gamesPerTeam - draws, Math.round(winsFromPoints)));
            const losses = gamesPerTeam - wins - draws;

            // Goals - stronger teams score more, concede less
            const strengthFactor = seasonStrength / 60;
            const goalsFor = Math.round((1.2 + strengthFactor * 0.8) * gamesPerTeam * (0.85 + Math.random() * 0.3));
            const goalsAgainst = Math.round((0.8 + (1 - strengthFactor) * 0.6) * gamesPerTeam * (0.85 + Math.random() * 0.3));

            // Determine status
            let status = null;
            if (position === 1) status = 'champion';
            else if (position <= promotionSpots) status = 'promoted';
            else if (position > numTeams - relegationSpots) status = 'relegated';

            return {
                club_id: club.id,
                club_name: club.name,
                position,
                played: gamesPerTeam,
                won: wins,
                drawn: draws,
                lost: losses,
                goals_for: goalsFor,
                goals_against: goalsAgainst,
                goal_difference: goalsFor - goalsAgainst,
                points: wins * 3 + draws,
                status,
                strength: Math.round(club.strength),
                stabilityStatus: club.stabilityStatus
            };
        });

        // Recalculate points to be consistent
        generatedRows.forEach(row => {
            row.points = row.won * 3 + row.drawn;
        });

        // Re-sort by points, then GD
        generatedRows.sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            return b.goal_difference - a.goal_difference;
        });

        // Update positions after sort
        generatedRows.forEach((row, idx) => {
            row.position = idx + 1;
            if (row.position === 1) row.status = 'champion';
            else if (row.position <= promotionSpots) row.status = 'promoted';
            else if (row.position > numTeams - relegationSpots) row.status = 'relegated';
            else row.status = null;
        });

        setGeneratedTable(generatedRows);
        setIsGenerating(false);
    };

    const saveSeason = async () => {
        if (!generatedTable || !year) return;
        
        setIsGenerating(true);

        // Create season record
        const season = await base44.entities.Season.create({
            league_id: leagueId,
            year,
            number_of_teams: generatedTable.length,
            champion_name: generatedTable[0]?.club_name,
            champion_id: generatedTable[0]?.club_id,
            runner_up: generatedTable[1]?.club_name,
            promotion_spots: promotionSpots,
            relegation_spots: relegationSpots,
            promoted_teams: generatedTable.filter(r => r.status === 'promoted').map(r => r.club_name).join(', '),
            relegated_teams: generatedTable.filter(r => r.status === 'relegated').map(r => r.club_name).join(', '),
        });

        // Create league table entries
        const tableEntries = generatedTable.map(row => ({
            season_id: season.id,
            league_id: leagueId,
            year,
            position: row.position,
            club_id: row.club_id,
            club_name: row.club_name,
            played: row.played,
            won: row.won,
            drawn: row.drawn,
            lost: row.lost,
            goals_for: row.goals_for,
            goals_against: row.goals_against,
            goal_difference: row.goal_difference,
            points: row.points,
            status: row.status,
        }));

        await base44.entities.LeagueTable.bulkCreate(tableEntries);

        queryClient.invalidateQueries(['seasons']);
        queryClient.invalidateQueries(['leagueTables']);
        
        setIsGenerating(false);
        setGeneratedTable(null);
        setSelectedClubIds([]);
        setYear('');
        
        if (onComplete) onComplete(season);
    };

    return (
        <Card className="border-0 shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-500" />
                    AI Season Generator
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {!generatedTable ? (
                    <>
                        <p className="text-sm text-slate-600">
                            Select clubs for the season and the AI will generate realistic results based on 
                            club strength, stability points, and historical performance.
                        </p>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <Label>Season Year</Label>
                                <Input 
                                    value={year} 
                                    onChange={(e) => setYear(e.target.value)}
                                    placeholder="e.g., 1879"
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label>Promotion Spots</Label>
                                <Input 
                                    type="number"
                                    value={promotionSpots} 
                                    onChange={(e) => setPromotionSpots(parseInt(e.target.value) || 0)}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label>Relegation Spots</Label>
                                <Input 
                                    type="number"
                                    value={relegationSpots} 
                                    onChange={(e) => setRelegationSpots(parseInt(e.target.value) || 0)}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label>Selected</Label>
                                <div className="mt-1 h-10 flex items-center">
                                    <Badge variant="outline" className="text-lg">
                                        {selectedClubIds.length} clubs
                                    </Badge>
                                </div>
                            </div>
                        </div>

                        <div>
                            <Label className="mb-2 block">Select Clubs (sorted by strength)</Label>
                            <div className="max-h-96 overflow-y-auto border rounded-lg p-2 space-y-1">
                                {availableClubs.map(club => (
                                    <div 
                                        key={club.id}
                                        className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${
                                            selectedClubIds.includes(club.id) 
                                                ? 'bg-emerald-50 border border-emerald-200' 
                                                : 'hover:bg-slate-50'
                                        }`}
                                        onClick={() => toggleClub(club.id)}
                                    >
                                        <Checkbox checked={selectedClubIds.includes(club.id)} />
                                        {club.logo_url && (
                                            <img src={club.logo_url} alt="" className="w-6 h-6 object-contain" />
                                        )}
                                        <span className="flex-1 font-medium">{club.name}</span>
                                        <Badge variant="outline" className="text-xs">
                                            Str: {Math.round(club.strength)}
                                        </Badge>
                                        <Badge className={`${club.stabilityStatus.color} text-xs`}>
                                            {club.stabilityStatus.label}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <Button 
                            onClick={generateSeason}
                            disabled={selectedClubIds.length < 4 || !year || isGenerating}
                            className="w-full bg-purple-600 hover:bg-purple-700"
                        >
                            {isGenerating ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
                            ) : (
                                <><Sparkles className="w-4 h-4 mr-2" /> Generate Season</>
                            )}
                        </Button>
                    </>
                ) : (
                    <>
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold">Generated Table - {year}</h3>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => setGeneratedTable(null)}>
                                    <X className="w-4 h-4 mr-1" /> Regenerate
                                </Button>
                                <Button onClick={saveSeason} disabled={isGenerating} className="bg-emerald-600 hover:bg-emerald-700">
                                    {isGenerating ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                                    ) : (
                                        <><Check className="w-4 h-4 mr-2" /> Save Season</>
                                    )}
                                </Button>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-100">
                                    <tr>
                                        <th className="p-2 text-left">Pos</th>
                                        <th className="p-2 text-left">Club</th>
                                        <th className="p-2 text-center">P</th>
                                        <th className="p-2 text-center">W</th>
                                        <th className="p-2 text-center">D</th>
                                        <th className="p-2 text-center">L</th>
                                        <th className="p-2 text-center">GF</th>
                                        <th className="p-2 text-center">GA</th>
                                        <th className="p-2 text-center">GD</th>
                                        <th className="p-2 text-center">Pts</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {generatedTable.map(row => (
                                        <tr 
                                            key={row.club_id}
                                            className={
                                                row.status === 'champion' ? 'bg-amber-50' :
                                                row.status === 'promoted' ? 'bg-green-50' :
                                                row.status === 'relegated' ? 'bg-red-50' : ''
                                            }
                                        >
                                            <td className="p-2 font-medium">
                                                {row.position}
                                                {row.status === 'champion' && <Trophy className="w-3 h-3 inline ml-1 text-amber-500" />}
                                                {row.status === 'promoted' && <TrendingUp className="w-3 h-3 inline ml-1 text-green-500" />}
                                                {row.status === 'relegated' && <TrendingDown className="w-3 h-3 inline ml-1 text-red-500" />}
                                            </td>
                                            <td className="p-2">{row.club_name}</td>
                                            <td className="p-2 text-center">{row.played}</td>
                                            <td className="p-2 text-center">{row.won}</td>
                                            <td className="p-2 text-center">{row.drawn}</td>
                                            <td className="p-2 text-center">{row.lost}</td>
                                            <td className="p-2 text-center">{row.goals_for}</td>
                                            <td className="p-2 text-center">{row.goals_against}</td>
                                            <td className="p-2 text-center">{row.goal_difference}</td>
                                            <td className="p-2 text-center font-bold">{row.points}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}