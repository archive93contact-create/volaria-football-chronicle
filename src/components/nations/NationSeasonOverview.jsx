import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Trophy, Calendar, Sparkles, Globe, Shield, ChevronRight } from 'lucide-react';
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

    const { data: yearMatches = [] } = useQuery({
        queryKey: ['yearMatches', selectedYear, allLeagues],
        queryFn: async () => {
            const leagueIds = allLeagues.map(l => l.id);
            if (leagueIds.length === 0) return [];
            const allMatches = await base44.entities.Match.filter({
                league_id: { $in: leagueIds },
                year: selectedYear
            }, 'matchday');
            return allMatches;
        },
        enabled: !!selectedYear && allLeagues.length > 0,
    });

    const generateOverview = async () => {
        if (!selectedYear) return;
        setGenerating(true);

        // Sort leagues by tier (Tier 1 first)
        const sortedSeasons = [...yearSeasons].sort((a, b) => {
            const leagueA = allLeagues.find(l => l.id === a.league_id);
            const leagueB = allLeagues.find(l => l.id === b.league_id);
            return (leagueA?.tier || 999) - (leagueB?.tier || 999);
        });

        const leagueData = sortedSeasons.map(s => {
            const league = allLeagues.find(l => l.id === s.league_id);
            const table = yearTables.filter(t => t.league_id === s.league_id && t.year === selectedYear).sort((a, b) => a.position - b.position);
            const champion = table.find(t => t.position === 1);
            const runnerUp = table.find(t => t.position === 2);
            const relegated = table.filter(t => t.status === 'relegated');
            const promoted = table.filter(t => t.status === 'promoted' || t.status === 'playoff_winner');
            const topScorer = s.top_scorer || 'N/A';
            
            return {
                leagueName: league?.name || 'Unknown League',
                tier: league?.tier || 999,
                champion: s.champion_name || 'N/A',
                championPoints: champion?.points || 0,
                runnerUp: s.runner_up || runnerUp?.club_name || 'N/A',
                runnerUpPoints: runnerUp?.points || 0,
                topScorer,
                promoted: promoted.map(p => p.club_name).filter(Boolean),
                relegated: relegated.map(r => r.club_name).filter(Boolean),
                notes: s.notes || '',
                tableData: table.slice(0, 10).map(t => `${t.position}. ${t.club_name} (${t.points} pts)`)
            };
        });

        const cupData = cupSeasons.map(cs => ({
            cupName: cs.cup_id,
            winner: cs.champion_name || 'N/A',
            runnerUp: cs.runner_up || 'N/A',
            finalScore: cs.final_score || '',
            notes: cs.notes || ''
        }));

        const dataString = `
LEAGUE CHAMPIONS & STANDINGS (Tier 1 = Top Division):
${leagueData.map(ld => `
${ld.leagueName} (Tier ${ld.tier}):
Champion: ${ld.champion} (${ld.championPoints} pts)
Runner-up: ${ld.runnerUp} (${ld.runnerUpPoints} pts)
Top Scorer: ${ld.topScorer}
${ld.promoted.length > 0 ? `Promoted to this tier: ${ld.promoted.join(', ')}` : ''}
${ld.relegated.length > 0 ? `Relegated: ${ld.relegated.join(', ')}` : ''}
${ld.notes ? `Notes: ${ld.notes}` : ''}

Top 10 Final Standings:
${ld.tableData.join('\n')}
`).join('\n---\n')}

${cupData.length > 0 ? `CUP WINNERS:
${cupData.map(cd => `${cd.cupName}: ${cd.winner} defeated ${cd.runnerUp}${cd.finalScore ? ` (${cd.finalScore})` : ''}`).join('\n')}` : ''}
`;

        const prompt = `You are a football journalist writing a season review for ${nation.name} in ${selectedYear}.

ACTUAL DATA FROM THIS SEASON:
${dataString}

CRITICAL INSTRUCTIONS:
- ONLY use club names that appear in the data above
- DO NOT invent or make up any club names
- Focus on the ACTUAL champions, runners-up, promoted and relegated teams listed
- Use the actual points totals and standings provided
- Reference the top scorers that are listed
- Tier 1 is the TOP division, Tier 2 is second tier, etc.

Write a compelling 300-word narrative covering:
1. Top division title race and champion
2. Notable performances across all tiers
3. Promotion/relegation drama
4. Cup competition results
5. Emerging or declining clubs based on the standings
6. Overall atmosphere of the season

Use past tense, journalistic style. Make it engaging but stick to the facts provided.`;

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

                    {/* Key Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        {(() => {
                            // Find first-time winners
                            const allPreviousSeasons = allSeasons.filter(s => parseInt(s.year) < parseInt(selectedYear));
                            const previousChampions = new Set(allPreviousSeasons.map(s => s.champion_name?.toLowerCase()).filter(Boolean));
                            const firstTimeWinners = yearSeasons.filter(s => 
                                s.champion_name && !previousChampions.has(s.champion_name.toLowerCase())
                            );

                            // Find new clubs (clubs in this year that weren't in previous year)
                            const thisYearClubs = new Set(yearTables.map(t => t.club_name?.toLowerCase()));
                            const prevYearTables = allSeasons
                                .filter(s => parseInt(s.year) === parseInt(selectedYear) - 1)
                                .map(s => s.league_id);
                            const prevYearClubNames = new Set();
                            
                            return (
                                <>
                                    <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-yellow-50">
                                        <CardContent className="p-4">
                                            <div className="flex items-center gap-3">
                                                <Trophy className="w-8 h-8 text-amber-500" />
                                                <div>
                                                    <div className="text-2xl font-bold">{yearSeasons.length}</div>
                                                    <div className="text-sm text-slate-600">Champions Crowned</div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-green-50">
                                        <CardContent className="p-4">
                                            <div className="flex items-center gap-3">
                                                <Shield className="w-8 h-8 text-emerald-500" />
                                                <div>
                                                    <div className="text-2xl font-bold">{firstTimeWinners.length}</div>
                                                    <div className="text-sm text-slate-600">First-Time Winners</div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50">
                                        <CardContent className="p-4">
                                            <div className="flex items-center gap-3">
                                                <Globe className="w-8 h-8 text-blue-500" />
                                                <div>
                                                    <div className="text-2xl font-bold">{cupSeasons.length}</div>
                                                    <div className="text-sm text-slate-600">Cup Competitions</div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </>
                            );
                        })()}
                    </div>

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
                                {yearSeasons
                                    .sort((a, b) => {
                                        const leagueA = allLeagues.find(l => l.id === a.league_id);
                                        const leagueB = allLeagues.find(l => l.id === b.league_id);
                                        return (leagueA?.tier || 999) - (leagueB?.tier || 999);
                                    })
                                    .map(season => {
                                        const league = allLeagues.find(l => l.id === season.league_id);
                                        const table = yearTables.filter(t => t.league_id === season.league_id);
                                        const champion = table.find(t => t.position === 1);
                                        const championClub = allClubs.find(c => c.id === champion?.club_id);
                                        
                                        // Check if first-time winner
                                        const allPreviousSeasons = allSeasons.filter(s => parseInt(s.year) < parseInt(selectedYear) && s.league_id === season.league_id);
                                        const previousChampions = new Set(allPreviousSeasons.map(s => s.champion_name?.toLowerCase()).filter(Boolean));
                                        const isFirstTime = season.champion_name && !previousChampions.has(season.champion_name.toLowerCase());
                                        
                                        return (
                                            <div key={season.id} className="border-l-4 border-emerald-500 pl-4 hover:bg-slate-50 rounded-r-lg transition-colors p-2">
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex items-start gap-3 flex-1">
                                                        {championClub?.logo_url && (
                                                            <img 
                                                                src={championClub.logo_url} 
                                                                alt={season.champion_name} 
                                                                className="w-12 h-12 object-contain bg-white rounded-lg p-1 shadow-sm"
                                                            />
                                                        )}
                                                        <div className="flex-1">
                                                            <Link to={createPageUrl(`LeagueDetail?id=${league?.id}`)} className="font-bold text-lg hover:text-emerald-600">
                                                                {league?.name} <span className="text-slate-500 text-sm">(Tier {league?.tier})</span>
                                                            </Link>
                                                            <div className="mt-1 space-y-1 text-sm">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <Trophy className="w-4 h-4 text-amber-500" />
                                                                    <span className="font-semibold text-emerald-600">{season.champion_name}</span>
                                                                    {champion && <span className="text-slate-500">({champion.points} pts)</span>}
                                                                    {isFirstTime && (
                                                                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded">
                                                                            First Title!
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {season.runner_up && (
                                                                    <div className="text-slate-600">Runner-up: {season.runner_up}</div>
                                                                )}
                                                                {season.top_scorer && (
                                                                    <div className="text-slate-600">⚽ {season.top_scorer}</div>
                                                                )}
                                                            </div>
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
                                    {cupSeasons.map(cs => {
                                        const winnerClub = allClubs.find(c => c.name === cs.champion_name);
                                        return (
                                            <div key={cs.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    {winnerClub?.logo_url && (
                                                        <img 
                                                            src={winnerClub.logo_url} 
                                                            alt={cs.champion_name} 
                                                            className="w-10 h-10 object-contain bg-white rounded-lg p-1 shadow-sm"
                                                        />
                                                    )}
                                                    <div>
                                                        <div className="font-semibold">{cs.cup_id}</div>
                                                        <div className="text-sm text-slate-600">
                                                            Winner: <span className="font-medium text-blue-600">{cs.champion_name}</span>
                                                            {cs.runner_up && <> vs {cs.runner_up}</>}
                                                            {cs.final_score && <> ({cs.final_score})</>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Match Results by League */}
                    {yearMatches.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-emerald-500" />
                                    Match Results ({yearMatches.length} matches)
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-6">
                                    {allLeagues
                                        .sort((a, b) => (a.tier || 999) - (b.tier || 999))
                                        .map(league => {
                                            const leagueMatches = yearMatches.filter(m => m.league_id === league.id);
                                            if (leagueMatches.length === 0) return null;
                                            
                                            // Group by matchday
                                            const matchesByMatchday = leagueMatches.reduce((acc, match) => {
                                                const md = match.matchday || 1;
                                                if (!acc[md]) acc[md] = [];
                                                acc[md].push(match);
                                                return acc;
                                            }, {});

                                            return (
                                                <div key={league.id}>
                                                    <div className="flex items-center justify-between mb-3">
                                                        <h4 className="font-bold text-slate-900">
                                                            {league.name} <span className="text-slate-500 text-sm">(Tier {league.tier})</span>
                                                        </h4>
                                                        <Link to={createPageUrl(`LeagueDetail?id=${league.id}`)}>
                                                            <Button variant="ghost" size="sm">
                                                                View Full Table <ChevronRight className="w-4 h-4 ml-1" />
                                                            </Button>
                                                        </Link>
                                                    </div>
                                                    <div className="space-y-3">
                                                        {Object.entries(matchesByMatchday)
                                                            .sort(([a], [b]) => parseInt(a) - parseInt(b))
                                                            .slice(0, 3)
                                                            .map(([matchday, matches]) => (
                                                                <div key={matchday} className="border rounded-lg p-3 bg-white">
                                                                    <div className="text-xs font-semibold text-slate-500 mb-2">Matchday {matchday}</div>
                                                                    <div className="space-y-1">
                                                                        {matches.slice(0, 5).map(match => (
                                                                            <div key={match.id} className="flex items-center justify-between text-sm py-1 px-2 hover:bg-slate-50 rounded">
                                                                                <span className="flex-1 truncate">{match.home_club_name}</span>
                                                                                <span className="font-bold mx-3">{match.home_score} - {match.away_score}</span>
                                                                                <span className="flex-1 truncate text-right">{match.away_club_name}</span>
                                                                            </div>
                                                                        ))}
                                                                        {matches.length > 5 && (
                                                                            <div className="text-xs text-slate-500 text-center pt-1">
                                                                                +{matches.length - 5} more matches
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        {Object.keys(matchesByMatchday).length > 3 && (
                                                            <div className="text-sm text-slate-500 text-center">
                                                                Showing first 3 matchdays • {Object.keys(matchesByMatchday).length} total matchdays
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
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