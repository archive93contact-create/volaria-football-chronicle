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

        const prompt = `Generate realistic football league table statistics for a ${numTeams}-team league season.

LEAGUE: ${league?.name || 'Football League'} (Tier ${league?.tier || 1})
SEASON: ${seasonData?.year || 'Current'}
GAMES PER TEAM: ${gamesPerTeam}

TEAMS IN ORDER (1st to last):
${knownData}

For EACH team, generate realistic stats that:
1. Match their league position (1st should have most points, last should have fewest)
2. Are mathematically consistent (W+D+L = games played, GD = GF-GA)
3. Points = W*3 + D
4. Have realistic goal totals (top teams 60-90 GF, bottom teams 30-50 GF typically)
5. Champions should have 70-95 points in a 38 game season, scale appropriately
6. Relegated teams should have significant gaps from safety

Generate stats for all ${numTeams} teams.`;

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