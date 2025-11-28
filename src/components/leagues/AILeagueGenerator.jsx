import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Trophy, TrendingUp, TrendingDown, RefreshCw, Save, Shield } from 'lucide-react';
import StabilityBadge from '@/components/stability/StabilityBadge';

// Calculate club strength based on stability, history, and tier
const calculateClubStrength = (club, previousPosition, tier) => {
    let strength = 50; // Base strength

    // Factor in stability points (major factor)
    const stability = club.stability_points || 0;
    strength += stability * 2; // Each stability point = 2 strength

    // Factor in previous position if exists
    if (previousPosition) {
        // Higher position = more strength (inverse relationship)
        strength += (20 - previousPosition) * 1.5;
    }

    // Factor in historical success
    strength += (club.league_titles || 0) * 3;
    strength += (club.promotions || 0) * 2;
    strength -= (club.relegations || 0) * 1.5;

    // Continental success adds prestige
    strength += (club.vcc_titles || 0) * 5;
    strength += (club.ccc_titles || 0) * 3;

    // Add some randomness
    strength += (Math.random() - 0.5) * 20;

    return Math.max(10, Math.min(100, strength));
};

// Generate realistic match results based on strength difference
const generateMatchResult = (homeStrength, awayStrength) => {
    const strengthDiff = homeStrength - awayStrength;
    const homeAdvantage = 5;
    
    // Calculate probabilities
    const homeWinProb = 0.35 + (strengthDiff + homeAdvantage) / 200;
    const drawProb = 0.28 - Math.abs(strengthDiff) / 400;
    
    const rand = Math.random();
    let homeGoals, awayGoals;
    
    if (rand < Math.max(0.15, Math.min(0.65, homeWinProb))) {
        // Home win
        homeGoals = Math.floor(Math.random() * 3) + 1;
        awayGoals = Math.floor(Math.random() * homeGoals);
    } else if (rand < Math.max(0.15, Math.min(0.65, homeWinProb)) + Math.max(0.15, drawProb)) {
        // Draw
        const goals = Math.floor(Math.random() * 3);
        homeGoals = goals;
        awayGoals = goals;
    } else {
        // Away win
        awayGoals = Math.floor(Math.random() * 3) + 1;
        homeGoals = Math.floor(Math.random() * awayGoals);
    }
    
    return { homeGoals, awayGoals };
};

// Generate full season results
const generateSeasonTable = (clubs, league, previousSeasonTables, allLeagues) => {
    const tier = league.tier || 1;
    
    // Calculate strength for each club
    const clubStrengths = clubs.map(club => {
        const prevTable = previousSeasonTables.find(t => t.club_id === club.id);
        return {
            club,
            strength: calculateClubStrength(club, prevTable?.position, tier),
            previousPosition: prevTable?.position
        };
    });

    // Initialize stats
    const stats = clubStrengths.map(cs => ({
        club_id: cs.club.id,
        club_name: cs.club.name,
        strength: cs.strength,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goals_for: 0,
        goals_against: 0,
        points: 0
    }));

    // Generate matches (each team plays each other twice - home and away)
    for (let i = 0; i < stats.length; i++) {
        for (let j = 0; j < stats.length; j++) {
            if (i !== j) {
                const homeTeam = stats[i];
                const awayTeam = stats[j];
                
                const result = generateMatchResult(
                    clubStrengths[i].strength,
                    clubStrengths[j].strength
                );

                homeTeam.played++;
                awayTeam.played++;
                homeTeam.goals_for += result.homeGoals;
                homeTeam.goals_against += result.awayGoals;
                awayTeam.goals_for += result.awayGoals;
                awayTeam.goals_against += result.homeGoals;

                if (result.homeGoals > result.awayGoals) {
                    homeTeam.won++;
                    homeTeam.points += 3;
                    awayTeam.lost++;
                } else if (result.homeGoals < result.awayGoals) {
                    awayTeam.won++;
                    awayTeam.points += 3;
                    homeTeam.lost++;
                } else {
                    homeTeam.drawn++;
                    awayTeam.drawn++;
                    homeTeam.points += 1;
                    awayTeam.points += 1;
                }
            }
        }
    }

    // Sort by points, then goal difference, then goals scored
    stats.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        const gdA = a.goals_for - a.goals_against;
        const gdB = b.goals_for - b.goals_against;
        if (gdB !== gdA) return gdB - gdA;
        return b.goals_for - a.goals_for;
    });

    // Assign positions and status
    const promotionSpots = league.promotion_spots || 2;
    const relegationSpots = league.relegation_spots || 3;

    return stats.map((team, index) => {
        const position = index + 1;
        let status = '';
        
        if (position === 1) {
            status = 'champion';
        } else if (position <= promotionSpots && tier > 1) {
            status = 'promoted';
        } else if (position > stats.length - relegationSpots) {
            status = 'relegated';
        }

        return {
            ...team,
            position,
            goal_difference: team.goals_for - team.goals_against,
            status
        };
    });
};

export default function AILeagueGenerator({ leagueId, seasonYear, isOpen, onClose, onGenerated }) {
    const queryClient = useQueryClient();
    const [selectedClubs, setSelectedClubs] = useState([]);
    const [generatedTable, setGeneratedTable] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const { data: league } = useQuery({
        queryKey: ['league', leagueId],
        queryFn: async () => {
            const leagues = await base44.entities.League.filter({ id: leagueId });
            return leagues[0];
        },
        enabled: !!leagueId,
    });

    const { data: clubs = [] } = useQuery({
        queryKey: ['leagueClubs', league?.nation_id],
        queryFn: () => base44.entities.Club.filter({ nation_id: league.nation_id }),
        enabled: !!league?.nation_id,
    });

    const { data: allLeagues = [] } = useQuery({
        queryKey: ['allLeagues'],
        queryFn: () => base44.entities.League.list(),
    });

    const { data: previousTables = [] } = useQuery({
        queryKey: ['previousSeasonTables', leagueId],
        queryFn: async () => {
            // Get all tables for this league to find previous season
            const tables = await base44.entities.LeagueTable.filter({ league_id: leagueId });
            // Find the most recent season before the target year
            const years = [...new Set(tables.map(t => t.year))].sort().reverse();
            const prevYear = years.find(y => y < seasonYear);
            return prevYear ? tables.filter(t => t.year === prevYear) : [];
        },
        enabled: !!leagueId && !!seasonYear,
    });

    // Filter clubs that are in this league or could be
    const eligibleClubs = useMemo(() => {
        return clubs.filter(c => 
            c.league_id === leagueId || 
            !c.is_defunct && !c.is_former_name
        ).sort((a, b) => {
            // Prioritize clubs already in this league
            if (c => c.league_id === leagueId) return -1;
            return a.name.localeCompare(b.name);
        });
    }, [clubs, leagueId]);

    // Pre-select clubs from previous season
    React.useEffect(() => {
        if (previousTables.length > 0) {
            setSelectedClubs(previousTables.map(t => t.club_id).filter(Boolean));
        }
    }, [previousTables]);

    const toggleClub = (clubId) => {
        setSelectedClubs(prev => 
            prev.includes(clubId) 
                ? prev.filter(id => id !== clubId)
                : [...prev, clubId]
        );
    };

    const generate = () => {
        setIsGenerating(true);
        const selectedClubObjects = clubs.filter(c => selectedClubs.includes(c.id));
        
        setTimeout(() => {
            const table = generateSeasonTable(selectedClubObjects, league, previousTables, allLeagues);
            setGeneratedTable(table);
            setIsGenerating(false);
        }, 500);
    };

    const regenerate = () => {
        generate();
    };

    const saveTable = async () => {
        if (!generatedTable) return;
        
        setIsSaving(true);

        // First create the season
        const seasonData = {
            league_id: leagueId,
            year: seasonYear,
            number_of_teams: generatedTable.length,
            champion_id: generatedTable[0].club_id,
            champion_name: generatedTable[0].club_name,
            runner_up: generatedTable[1]?.club_name,
            promoted_teams: generatedTable.filter(t => t.status === 'promoted').map(t => t.club_name).join(', '),
            relegated_teams: generatedTable.filter(t => t.status === 'relegated').map(t => t.club_name).join(', '),
        };

        const season = await base44.entities.Season.create(seasonData);

        // Create league table entries
        for (const entry of generatedTable) {
            await base44.entities.LeagueTable.create({
                season_id: season.id,
                league_id: leagueId,
                year: seasonYear,
                position: entry.position,
                club_id: entry.club_id,
                club_name: entry.club_name,
                played: entry.played,
                won: entry.won,
                drawn: entry.drawn,
                lost: entry.lost,
                goals_for: entry.goals_for,
                goals_against: entry.goals_against,
                goal_difference: entry.goal_difference,
                points: entry.points,
                status: entry.status
            });
        }

        queryClient.invalidateQueries(['seasons']);
        queryClient.invalidateQueries(['leagueTables']);
        setIsSaving(false);
        if (onGenerated) onGenerated(season);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-500" />
                        AI League Generator - {league?.name} {seasonYear}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {!generatedTable ? (
                        <>
                            <div>
                                <Label className="text-base font-semibold mb-3 block">
                                    Select Clubs for Season ({selectedClubs.length} selected)
                                </Label>
                                <p className="text-sm text-slate-500 mb-3">
                                    Select the clubs that will participate in this season. The AI will generate realistic results based on club stability, history, and previous positions.
                                </p>
                                
                                <div className="border rounded-lg max-h-64 overflow-y-auto">
                                    {eligibleClubs.map(club => {
                                        const isSelected = selectedClubs.includes(club.id);
                                        const wasInPrevious = previousTables.some(t => t.club_id === club.id);
                                        
                                        return (
                                            <div 
                                                key={club.id}
                                                className={`flex items-center gap-3 p-2 border-b last:border-b-0 cursor-pointer hover:bg-slate-50 ${isSelected ? 'bg-emerald-50' : ''}`}
                                                onClick={() => toggleClub(club.id)}
                                            >
                                                <Checkbox checked={isSelected} />
                                                {club.logo_url ? (
                                                    <img src={club.logo_url} alt="" className="w-6 h-6 object-contain" />
                                                ) : (
                                                    <Shield className="w-6 h-6 text-slate-300" />
                                                )}
                                                <span className="flex-1 font-medium">{club.name}</span>
                                                {wasInPrevious && (
                                                    <Badge variant="outline" className="text-xs">Previous Season</Badge>
                                                )}
                                                {club.stability_points !== undefined && (
                                                    <StabilityBadge 
                                                        points={club.stability_points} 
                                                        status={club.stability_status}
                                                        size="small"
                                                    />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <Button 
                                onClick={generate}
                                disabled={selectedClubs.length < 4 || isGenerating}
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
                                <h3 className="font-semibold">Generated League Table</h3>
                                <Button variant="outline" size="sm" onClick={regenerate}>
                                    <RefreshCw className="w-4 h-4 mr-2" /> Regenerate
                                </Button>
                            </div>

                            <div className="border rounded-lg overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-100">
                                            <TableHead className="w-12">#</TableHead>
                                            <TableHead>Club</TableHead>
                                            <TableHead className="text-center">P</TableHead>
                                            <TableHead className="text-center">W</TableHead>
                                            <TableHead className="text-center">D</TableHead>
                                            <TableHead className="text-center">L</TableHead>
                                            <TableHead className="text-center">GF</TableHead>
                                            <TableHead className="text-center">GA</TableHead>
                                            <TableHead className="text-center">GD</TableHead>
                                            <TableHead className="text-center font-bold">Pts</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {generatedTable.map((row) => {
                                            const club = clubs.find(c => c.id === row.club_id);
                                            return (
                                                <TableRow 
                                                    key={row.club_id}
                                                    className={
                                                        row.status === 'champion' ? 'bg-amber-50' :
                                                        row.status === 'promoted' ? 'bg-green-50' :
                                                        row.status === 'relegated' ? 'bg-red-50' : ''
                                                    }
                                                >
                                                    <TableCell className="font-bold">
                                                        {row.position}
                                                        {row.status === 'champion' && <Trophy className="w-4 h-4 text-amber-500 inline ml-1" />}
                                                        {row.status === 'promoted' && <TrendingUp className="w-4 h-4 text-green-500 inline ml-1" />}
                                                        {row.status === 'relegated' && <TrendingDown className="w-4 h-4 text-red-500 inline ml-1" />}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            {club?.logo_url && (
                                                                <img src={club.logo_url} alt="" className="w-5 h-5 object-contain" />
                                                            )}
                                                            <span className="font-medium">{row.club_name}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center">{row.played}</TableCell>
                                                    <TableCell className="text-center">{row.won}</TableCell>
                                                    <TableCell className="text-center">{row.drawn}</TableCell>
                                                    <TableCell className="text-center">{row.lost}</TableCell>
                                                    <TableCell className="text-center">{row.goals_for}</TableCell>
                                                    <TableCell className="text-center">{row.goals_against}</TableCell>
                                                    <TableCell className="text-center">{row.goal_difference}</TableCell>
                                                    <TableCell className="text-center font-bold">{row.points}</TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="flex gap-3">
                                <Button 
                                    variant="outline" 
                                    className="flex-1"
                                    onClick={() => setGeneratedTable(null)}
                                >
                                    Back to Club Selection
                                </Button>
                                <Button 
                                    onClick={saveTable}
                                    disabled={isSaving}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                                >
                                    {isSaving ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                                    ) : (
                                        <><Save className="w-4 h-4 mr-2" /> Save Season</>
                                    )}
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}