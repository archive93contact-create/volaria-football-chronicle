import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Wand2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function AIStatsGenerator({ tableRows, setTableRows, seasonData, league }) {
    const [loading, setLoading] = useState(false);

    const hasIncompleteStats = tableRows.some(row => 
        row.club_name && (row.points === 0 || row.played === 0)
    );

    const generateStats = async () => {
        setLoading(true);

        const numTeams = tableRows.filter(r => r.club_name).length;
        const gamesPerTeam = (numTeams - 1) * 2; // Home and away
        
        // Build context about what we know
        const knownData = tableRows
            .filter(r => r.club_name)
            .map((r, idx) => `${idx + 1}. ${r.club_name}${r.points > 0 ? ` (${r.points} pts)` : ''}${r.goals_for > 0 ? ` GF:${r.goals_for}` : ''}`)
            .join('\n');

        // Randomly determine season characteristics for variety
        const seasonTypes = ['close', 'dominant', 'chaotic', 'normal'];
        const seasonType = seasonTypes[Math.floor(Math.random() * seasonTypes.length)];

        const prompt = `Generate realistic and VARIED football league table statistics for a ${numTeams}-team league season.

LEAGUE: ${league?.name || 'Football League'} (Tier ${league?.tier || 1})
SEASON: ${seasonData?.year || 'Current'}
GAMES PER TEAM: ${gamesPerTeam}

SEASON TYPE: ${seasonType.toUpperCase()}
${seasonType === 'close' ? '- This was a TIGHT title race! Top 2-3 teams within 3-5 points. Relegation battle also close.' : ''}
${seasonType === 'dominant' ? '- Champion was DOMINANT! Won by 10-15+ points. Mid-table competitive.' : ''}
${seasonType === 'chaotic' ? '- UNPREDICTABLE season! Surprise results, unusual stats, maybe high-scoring team mid-table.' : ''}
${seasonType === 'normal' ? '- Standard season with realistic gaps (2-4 points between positions).' : ''}

TEAMS IN ORDER (1st to last):
${knownData}

CRITICAL REQUIREMENTS:
1. W + D + L MUST equal exactly ${gamesPerTeam} for every team
2. Points = (W × 3) + D - calculate correctly!
3. GD = GF - GA
4. Add REALISTIC VARIETY:
   - Some defensive teams (low GF, low GA)
   - Some attacking but leaky (high GF, high GA)
   - Some draw specialists
   - Bottom teams still score 30-50 goals
5. Create interesting storylines:
   - Maybe 2nd has better GD but fewer points
   - A high-scoring team finishes 4th-6th
   - Relegated team might outscore team above them

Generate UNIQUE stats - not linear progression!`;

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
                const updatedRows = tableRows.map((row, idx) => {
                    if (!row.club_name) return row;
                    
                    const aiStats = result.teams.find(t => t.position === idx + 1) || result.teams[idx];
                    if (!aiStats) return row;

                    // Only update if the current stats are empty/zero
                    return {
                        ...row,
                        played: row.played || aiStats.played,
                        won: row.won || aiStats.won,
                        drawn: row.drawn || aiStats.drawn,
                        lost: row.lost || aiStats.lost,
                        goals_for: row.goals_for || aiStats.goals_for,
                        goals_against: row.goals_against || aiStats.goals_against,
                        goal_difference: (row.goals_for || aiStats.goals_for) - (row.goals_against || aiStats.goals_against),
                        points: row.points || aiStats.points
                    };
                });

                setTableRows(updatedRows);
            }
        } catch (err) {
            console.error('Failed to generate stats:', err);
        } finally {
            setLoading(false);
        }
    };

    if (!hasIncompleteStats) {
        return null;
    }

    return (
        <Button 
            onClick={generateStats} 
            disabled={loading}
            variant="outline"
            className="border-purple-300 text-purple-700 hover:bg-purple-50"
        >
            {loading ? (
                <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating Stats...
                </>
            ) : (
                <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    AI Generate Missing Stats
                </>
            )}
        </Button>
    );
}