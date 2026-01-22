import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Trophy, Calendar, Sparkles, Globe, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function NationSeasonOverview({ nation, allSeasons, allLeagues, allClubs }) {
    const [selectedYear, setSelectedYear] = useState('');
    const [narrative, setNarrative] = useState('');
    const [generating, setGenerating] = useState(false);

    // Get unique years from all seasons
    const availableYears = [...new Set(allSeasons.map(s => s.year))].sort().reverse();

    // Fetch data for selected year
    const { data: yearSeasons = [] } = useQuery({
        queryKey: ['yearSeasons', nation.id, selectedYear],
        queryFn: () => base44.entities.Season.filter({ league_id: { $in: allLeagues.map(l => l.id) }, year: selectedYear }),
        enabled: !!selectedYear && allLeagues.length > 0,
    });

    const { data: yearTables = [] } = useQuery({
        queryKey: ['yearTables', nation.id, selectedYear],
        queryFn: () => base44.entities.LeagueTable.filter({ league_id: { $in: allLeagues.map(l => l.id) }, year: selectedYear }),
        enabled: !!selectedYear && allLeagues.length > 0,
    });

    const { data: cupSeasons = [] } = useQuery({
        queryKey: ['cupSeasons', nation.id, selectedYear],
        queryFn: async () => {
            const cups = await base44.entities.DomesticCup.filter({ nation_id: nation.id });
            if (cups.length === 0) return [];
            const cupSeasonPromises = cups.map(cup => 
                base44.entities.DomesticCupSeason.filter({ cup_id: cup.id, year: selectedYear })
            );
            const results = await Promise.all(cupSeasonPromises);
            return results.flat();
        },
        enabled: !!selectedYear,
    });

    const generateOverview = async () => {
        if (!selectedYear) return;
        setGenerating(true);

        const leagueNarrative = yearSeasons.map(s => {
            const league = allLeagues.find(l => l.id === s.league_id);
            const table = yearTables.filter(t => t.league_id === s.league_id && t.year === selectedYear);
            const champion = table.find(t => t.position === 1);
            const relegated = table.filter(t => t.status === 'relegated');
            const promoted = table.filter(t => t.status === 'promoted' || t.status === 'playoff_winner');
            
            return `
**${league?.name || 'League'}** (Tier ${league?.tier || '?'})
- Champion: ${s.champion_name || 'N/A'}${champion ? ` (${champion.points} pts)` : ''}
- Runner-up: ${s.runner_up || 'N/A'}
- Top Scorer: ${s.top_scorer || 'N/A'}
${promoted.length > 0 ? `- Promoted: ${promoted.map(p => p.club_name).join(', ')}` : ''}
${relegated.length > 0 ? `- Relegated: ${relegated.map(r => r.club_name).join(', ')}` : ''}
${s.notes ? `- Notes: ${s.notes}` : ''}
`;
        }).join('\n');

        const cupNarrative = cupSeasons.map(cs => `
**${cs.cup_id}**
- Winner: ${cs.champion_name || 'N/A'}
- Runner-up: ${cs.runner_up || 'N/A'}
${cs.final_score ? `- Final Score: ${cs.final_score}` : ''}
${cs.notes ? `- ${cs.notes}` : ''}
`).join('\n');

        const prompt = `Write a comprehensive season overview for ${nation.name} football in ${selectedYear}.

LEAGUE RESULTS:
${leagueNarrative}

${cupSeasons.length > 0 ? `CUP RESULTS:\n${cupNarrative}` : ''}

Create an engaging narrative that:
1. Summarizes the major storylines across all tiers
2. Highlights surprise title winners, close races, or dominant champions
3. Notes any significant promotion/relegation stories
4. Discusses cup competitions and any upsets
5. Mentions any league structure changes (if divisions/tiers changed)
6. Comments on new clubs entering the pyramid
7. Identifies emerging powers or declining giants
8. Creates a sense of the overall season atmosphere

Write in a journalistic, engaging style - like a season retrospective. Use past tense. Keep it concise (300-400 words).`;

        try {
            const result = await base44.integrations.Core.InvokeLLM({
                prompt,
                add_context_from_internet: false
            });
            setNarrative(result);
        } catch (err) {
            console.error('Failed to generate overview:', err);
            setNarrative('Failed to generate overview. Please try again.');
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        Select Season
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                        <Select value={selectedYear} onValueChange={setSelectedYear}>
                            <SelectTrigger className="w-48">
                                <SelectValue placeholder="Choose year..." />
                            </SelectTrigger>
                            <SelectContent>
                                {availableYears.map(year => (
                                    <SelectItem key={year} value={year}>{year}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {selectedYear && (
                            <Button 
                                onClick={generateOverview} 
                                disabled={generating}
                                className="bg-purple-600 hover:bg-purple-700"
                            >
                                {generating ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4 mr-2" />
                                        Generate Season Overview
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {selectedYear && yearSeasons.length > 0 && (
                <>
                    {/* Season Narrative */}
                    {narrative && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Season {selectedYear} - The Story</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="prose max-w-none text-slate-700 whitespace-pre-line">
                                    {narrative}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* League Results */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Trophy className="w-5 h-5 text-amber-500" />
                                League Champions
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {yearSeasons.map(season => {
                                    const league = allLeagues.find(l => l.id === season.league_id);
                                    const table = yearTables.filter(t => t.league_id === season.league_id);
                                    const champion = table.find(t => t.position === 1);
                                    
                                    return (
                                        <div key={season.id} className="border-l-4 border-emerald-500 pl-4">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <Link to={createPageUrl(`LeagueDetail?id=${league?.id}`)} className="font-bold text-lg hover:text-emerald-600">
                                                        {league?.name} <span className="text-slate-500 text-sm">(Tier {league?.tier})</span>
                                                    </Link>
                                                    <div className="mt-1 space-y-1 text-sm">
                                                        <div className="flex items-center gap-2">
                                                            <Trophy className="w-4 h-4 text-amber-500" />
                                                            <span className="font-semibold text-emerald-600">{season.champion_name}</span>
                                                            {champion && <span className="text-slate-500">({champion.points} pts)</span>}
                                                        </div>
                                                        {season.runner_up && (
                                                            <div className="text-slate-600">Runner-up: {season.runner_up}</div>
                                                        )}
                                                        {season.top_scorer && (
                                                            <div className="text-slate-600">⚽ {season.top_scorer}</div>
                                                        )}
                                                    </div>
                                                </div>
                                                <Link to={createPageUrl(`LeagueDetail?id=${league?.id}`)}>
                                                    <Button variant="outline" size="sm">View Table</Button>
                                                </Link>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Cup Winners */}
                    {cupSeasons.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Trophy className="w-5 h-5 text-blue-500" />
                                    Cup Winners
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {cupSeasons.map(cs => (
                                        <div key={cs.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                            <div>
                                                <div className="font-semibold">{cs.cup_id}</div>
                                                <div className="text-sm text-slate-600">
                                                    Winner: <span className="font-medium text-blue-600">{cs.champion_name}</span>
                                                    {cs.runner_up && <> vs {cs.runner_up}</>}
                                                    {cs.final_score && <> ({cs.final_score})</>}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </>
            )}

            {selectedYear && yearSeasons.length === 0 && !generating && (
                <Card>
                    <CardContent className="text-center py-8 text-slate-500">
                        No season data found for {selectedYear}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}