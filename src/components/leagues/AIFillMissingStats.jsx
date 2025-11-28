import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, Wand2, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export default function AIFillMissingStats({ league, seasons = [], leagueTables = [], allClubs = [] }) {
    const [open, setOpen] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0, currentSeason: '' });
    const [results, setResults] = useState([]);
    const [syncClubStats, setSyncClubStats] = useState(true);
    const queryClient = useQueryClient();

    // Find seasons with incomplete stats
    const incompleteSeasons = seasons.filter(season => {
        const tables = leagueTables.filter(t => t.year === season.year);
        return tables.length > 0 && tables.some(t => t.club_name && (t.points === 0 || t.played === 0));
    });

    const updateTableMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.LeagueTable.update(id, data),
    });

    const generateStatsForSeason = async (season) => {
        const tables = leagueTables
            .filter(t => t.year === season.year)
            .sort((a, b) => a.position - b.position);

        if (tables.length === 0) return { season: season.year, success: false, error: 'No table data' };

        const numTeams = tables.length;
        const gamesPerTeam = (numTeams - 1) * 2;

        const knownData = tables
            .map((r, idx) => `${idx + 1}. ${r.club_name}${r.points > 0 ? ` (${r.points} pts)` : ''}`)
            .join('\n');

        // Randomly determine season characteristics for variety
        const seasonTypes = ['close', 'dominant', 'chaotic', 'normal'];
        const seasonType = seasonTypes[Math.floor(Math.random() * seasonTypes.length)];
        
        const prompt = `Generate realistic and VARIED football league table statistics for a ${numTeams}-team league season.

LEAGUE: ${league?.name || 'Football League'} (Tier ${league?.tier || 1})
SEASON: ${season.year}
GAMES PER TEAM: ${gamesPerTeam}
CHAMPION: ${season.champion_name || 'Position 1'}

SEASON TYPE: ${seasonType.toUpperCase()}
${seasonType === 'close' ? '- This was a TIGHT title race! Top 2-3 teams within 3-5 points of each other. Also make relegation battle close.' : ''}
${seasonType === 'dominant' ? '- Champion was DOMINANT! Won by 10-15+ points. But make mid-table and relegation zones competitive.' : ''}
${seasonType === 'chaotic' ? '- UNPREDICTABLE season! Some surprise results, unusual goal differences, maybe a high-scoring team finishing mid-table.' : ''}
${seasonType === 'normal' ? '- Standard season with realistic gaps between positions (2-4 points between most places).' : ''}

TEAMS IN ORDER (1st to last):
${knownData}

CRITICAL REQUIREMENTS:
1. W + D + L MUST equal exactly ${gamesPerTeam} for every team
2. Points = (W × 3) + D - calculate this correctly!
3. Goal difference = GF - GA
4. Add REALISTIC VARIETY:
   - Some teams are defensive (low GF, low GA)
   - Some are attacking but leaky (high GF, high GA) 
   - Some are boring (lots of draws, 1-0 wins)
   - Bottom teams can still score 30-50 goals
   - Top teams typically 50-80+ goals depending on league level
5. Create interesting storylines:
   - Maybe 2nd place has better goal difference but fewer points
   - A team with most goals might finish 4th-6th
   - Relegated team might have scored more than team just above them
6. Tier ${league?.tier || 1} league - ${league?.tier === 1 ? 'top flight, higher quality' : league?.tier <= 3 ? 'professional level' : 'semi-pro/amateur, more variable results'}

Generate UNIQUE, INTERESTING stats - not just a linear points progression!`;

        try {
            const result = await base44.integrations.Core.InvokeLLM({
                prompt,
                response_json_schema: {
                    type: "object",
                    properties: {
                        teams: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    position: { type: "number" },
                                    played: { type: "number" },
                                    won: { type: "number" },
                                    drawn: { type: "number" },
                                    lost: { type: "number" },
                                    goals_for: { type: "number" },
                                    goals_against: { type: "number" },
                                    points: { type: "number" }
                                }
                            }
                        }
                    }
                }
            });

            if (result.teams && result.teams.length > 0) {
                let updated = 0;
                for (const table of tables) {
                    // Only update if stats are missing
                    if (table.points === 0 || table.played === 0) {
                        const aiStats = result.teams.find(t => t.position === table.position) || result.teams[table.position - 1];
                        if (aiStats) {
                            const statsToUpdate = {
                                played: aiStats.played,
                                won: aiStats.won,
                                drawn: aiStats.drawn,
                                lost: aiStats.lost,
                                goals_for: aiStats.goals_for,
                                goals_against: aiStats.goals_against,
                                goal_difference: aiStats.goals_for - aiStats.goals_against,
                                points: aiStats.points
                            };
                            
                            await updateTableMutation.mutateAsync({
                                id: table.id,
                                data: statsToUpdate
                            });
                            
                            // Also update the club's all-time stats if sync is enabled
                            if (syncClubStats && table.club_id) {
                                const club = allClubs.find(c => c.id === table.club_id);
                                if (club) {
                                    await base44.entities.Club.update(club.id, {
                                        total_wins: (club.total_wins || 0) + aiStats.won,
                                        total_draws: (club.total_draws || 0) + aiStats.drawn,
                                        total_losses: (club.total_losses || 0) + aiStats.lost,
                                        total_goals_scored: (club.total_goals_scored || 0) + aiStats.goals_for,
                                        total_goals_conceded: (club.total_goals_conceded || 0) + aiStats.goals_against
                                    });
                                }
                            }
                            updated++;
                        }
                    }
                }
                return { season: season.year, success: true, updated };
            }
            return { season: season.year, success: false, error: 'No AI response' };
        } catch (err) {
            return { season: season.year, success: false, error: err.message };
        }
    };

    const handleGenerate = async () => {
        setProcessing(true);
        setResults([]);
        setProgress({ current: 0, total: incompleteSeasons.length, currentSeason: '' });

        const newResults = [];
        for (let i = 0; i < incompleteSeasons.length; i++) {
            const season = incompleteSeasons[i];
            setProgress({ current: i + 1, total: incompleteSeasons.length, currentSeason: season.year });
            
            const result = await generateStatsForSeason(season);
            newResults.push(result);
            setResults([...newResults]);
        }

        setProcessing(false);
        queryClient.invalidateQueries(['leagueTables']);
        if (syncClubStats) {
            queryClient.invalidateQueries(['clubs']);
            queryClient.invalidateQueries(['nationClubs']);
        }
    };

    if (incompleteSeasons.length === 0) {
        return null;
    }

    return (
        <>
            <Button 
                onClick={() => setOpen(true)}
                variant="outline"
                className="border-purple-300 text-purple-700 hover:bg-purple-50"
            >
                <Wand2 className="w-4 h-4 mr-2" />
                AI Fill Missing Stats ({incompleteSeasons.length} seasons)
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Wand2 className="w-5 h-5 text-purple-500" />
                            AI Generate Missing Statistics
                        </DialogTitle>
                    </DialogHeader>

                    <div className="py-4 space-y-4">
                        {!processing && results.length === 0 && (
                            <>
                                <p className="text-slate-600">
                                    Found <strong>{incompleteSeasons.length}</strong> seasons with missing statistics (W/D/L/GF/GA/Pts).
                                </p>
                                <div className="max-h-40 overflow-y-auto bg-slate-50 rounded-lg p-3">
                                    <div className="text-sm text-slate-600 space-y-1">
                                        {incompleteSeasons.map(s => (
                                            <div key={s.id}>{s.year} - {s.champion_name || 'Unknown champion'}</div>
                                        ))}
                                    </div>
                                </div>
                                <p className="text-sm text-slate-500">
                                    AI will generate realistic stats based on league position and team count.
                                </p>
                                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                                    <Checkbox 
                                        id="syncClubs" 
                                        checked={syncClubStats}
                                        onCheckedChange={setSyncClubStats}
                                    />
                                    <Label htmlFor="syncClubs" className="text-sm text-blue-800 cursor-pointer">
                                        Also update club all-time statistics (W/D/L/GF/GA)
                                    </Label>
                                </div>
                                <Button onClick={handleGenerate} className="w-full bg-purple-600 hover:bg-purple-700">
                                    <Wand2 className="w-4 h-4 mr-2" />
                                    Generate Stats for All Seasons
                                </Button>
                            </>
                        )}

                        {processing && (
                            <div className="text-center py-6">
                                <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-4" />
                                <p className="font-medium">Processing {progress.currentSeason}...</p>
                                <p className="text-sm text-slate-500">
                                    {progress.current} of {progress.total} seasons
                                </p>
                                <div className="w-full bg-slate-200 rounded-full h-2 mt-4">
                                    <div 
                                        className="bg-purple-600 h-2 rounded-full transition-all"
                                        style={{ width: `${(progress.current / progress.total) * 100}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {!processing && results.length > 0 && (
                            <>
                                <div className="max-h-60 overflow-y-auto space-y-2">
                                    {results.map((r, idx) => (
                                        <div 
                                            key={idx}
                                            className={`flex items-center justify-between p-2 rounded ${
                                                r.success ? 'bg-green-50' : 'bg-red-50'
                                            }`}
                                        >
                                            <span className="font-medium">{r.season}</span>
                                            <span className="flex items-center gap-1 text-sm">
                                                {r.success ? (
                                                    <>
                                                        <Check className="w-4 h-4 text-green-600" />
                                                        <span className="text-green-700">{r.updated} updated</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <AlertCircle className="w-4 h-4 text-red-600" />
                                                        <span className="text-red-700">{r.error}</span>
                                                    </>
                                                )}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                <Button onClick={() => setOpen(false)} className="w-full">
                                    Done
                                </Button>
                            </>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}