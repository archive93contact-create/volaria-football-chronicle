import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, TrendingUp, Users, Target } from 'lucide-react';

export default function LeagueCompetitiveness({ seasons = [], leagueTables = [] }) {
    const stats = useMemo(() => {
        if (seasons.length === 0) return null;

        const sortedSeasons = [...seasons].sort((a, b) => a.year.localeCompare(b.year));

        // Count unique champions
        const champions = sortedSeasons.map(s => s.champion_name).filter(Boolean);
        const uniqueChampions = [...new Set(champions)];
        
        // Count champion frequencies
        const championCounts = {};
        champions.forEach(c => {
            championCounts[c] = (championCounts[c] || 0) + 1;
        });
        
        // Find dynasties (3+ consecutive titles)
        const dynasties = [];
        let currentDynasty = null;
        sortedSeasons.forEach(s => {
            if (!s.champion_name) return;
            if (currentDynasty && currentDynasty.club === s.champion_name) {
                currentDynasty.years.push(s.year);
            } else {
                if (currentDynasty && currentDynasty.years.length >= 3) {
                    dynasties.push(currentDynasty);
                }
                currentDynasty = { club: s.champion_name, years: [s.year] };
            }
        });
        if (currentDynasty && currentDynasty.years.length >= 3) {
            dynasties.push(currentDynasty);
        }

        // Top champions
        const topChampions = Object.entries(championCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        // Group tables by season
        const tablesBySeason = {};
        leagueTables.forEach(t => {
            if (!tablesBySeason[t.season_id]) tablesBySeason[t.season_id] = [];
            tablesBySeason[t.season_id].push(t);
        });

        // Close finishes (1-3 point gaps at top)
        let closeFinishes = 0;
        let totalPointGap = 0;
        let gapCount = 0;
        Object.values(tablesBySeason).forEach(tables => {
            const sorted = tables.sort((a, b) => a.position - b.position);
            const first = sorted.find(t => t.position === 1);
            const second = sorted.find(t => t.position === 2);
            if (first && second && first.points && second.points) {
                const gap = first.points - second.points;
                totalPointGap += gap;
                gapCount++;
                if (gap <= 3) closeFinishes++;
            }
        });
        const avgTitleGap = gapCount > 0 ? totalPointGap / gapCount : 0;

        // ===== NEW METRICS =====

        // 1. Promoted club success - how often do promoted clubs finish top half?
        let promotedClubsTracked = 0;
        let promotedTopHalf = 0;
        let promotedTopQuarter = 0;
        let promotedChampions = 0;
        
        sortedSeasons.forEach((season, idx) => {
            if (idx === 0) return; // Skip first season
            const prevSeason = sortedSeasons[idx - 1];
            const promotedTeams = prevSeason.promoted_teams?.split(',').map(t => t.trim()).filter(Boolean) || [];
            
            const currentTables = tablesBySeason[season.id] || [];
            const leagueSize = currentTables.length;
            
            promotedTeams.forEach(team => {
                const teamTable = currentTables.find(t => t.club_name?.toLowerCase() === team.toLowerCase());
                if (teamTable && leagueSize > 0) {
                    promotedClubsTracked++;
                    if (teamTable.position <= Math.ceil(leagueSize / 2)) promotedTopHalf++;
                    if (teamTable.position <= Math.ceil(leagueSize / 4)) promotedTopQuarter++;
                    if (teamTable.position === 1) promotedChampions++;
                }
            });
        });
        const promotedSuccessRate = promotedClubsTracked > 0 ? (promotedTopHalf / promotedClubsTracked) * 100 : 0;

        // 2. Top 5/6 variety - how many different clubs appear in top positions?
        const top5Clubs = new Set();
        const top6Clubs = new Set();
        const top3Clubs = new Set();
        let seasonsWithTables = 0;
        
        Object.values(tablesBySeason).forEach(tables => {
            if (tables.length === 0) return;
            seasonsWithTables++;
            tables.forEach(t => {
                if (t.position <= 3 && t.club_name) top3Clubs.add(t.club_name);
                if (t.position <= 5 && t.club_name) top5Clubs.add(t.club_name);
                if (t.position <= 6 && t.club_name) top6Clubs.add(t.club_name);
            });
        });
        
        // Calculate how often the same clubs dominate top positions
        const top5Appearances = {};
        const top3Appearances = {};
        Object.values(tablesBySeason).forEach(tables => {
            tables.forEach(t => {
                if (t.position <= 5 && t.club_name) {
                    top5Appearances[t.club_name] = (top5Appearances[t.club_name] || 0) + 1;
                }
                if (t.position <= 3 && t.club_name) {
                    top3Appearances[t.club_name] = (top3Appearances[t.club_name] || 0) + 1;
                }
            });
        });
        
        // Concentration score - if same 5 clubs always in top 5, score is high (less competitive)
        const top5AppearanceValues = Object.values(top5Appearances);
        const maxPossibleTop5 = seasonsWithTables * 5;
        const topClubsDominance = top5AppearanceValues.length > 0 
            ? top5AppearanceValues.slice(0, 5).reduce((a, b) => a + b, 0) / maxPossibleTop5
            : 0;

        // 3. Back-to-back champions frequency
        let backToBackCount = 0;
        for (let i = 1; i < sortedSeasons.length; i++) {
            if (sortedSeasons[i].champion_name && sortedSeasons[i].champion_name === sortedSeasons[i-1].champion_name) {
                backToBackCount++;
            }
        }
        const backToBackRate = sortedSeasons.length > 1 ? backToBackCount / (sortedSeasons.length - 1) : 0;

        // 4. Title concentration - what % of titles does the top club have?
        const mostTitles = topChampions.length > 0 ? topChampions[0][1] : 0;
        const titleConcentration = champions.length > 0 ? mostTitles / champions.length : 0;

        // 5. How often does champion change?
        let championChanges = 0;
        for (let i = 1; i < sortedSeasons.length; i++) {
            if (sortedSeasons[i].champion_name && sortedSeasons[i-1].champion_name && 
                sortedSeasons[i].champion_name !== sortedSeasons[i-1].champion_name) {
                championChanges++;
            }
        }
        const turnoverRate = sortedSeasons.length > 1 ? championChanges / (sortedSeasons.length - 1) : 0;

        // ===== COMPETITIVENESS SCORE CALCULATION =====
        // Weight different factors
        let score = 0;
        
        // Unique champions factor (0-25 points) - more unique = better
        const uniqueRatio = seasons.length > 0 ? uniqueChampions.length / seasons.length : 0;
        score += Math.min(25, uniqueRatio * 40);
        
        // Title turnover (0-20 points) - higher turnover = more competitive
        score += turnoverRate * 20;
        
        // Low title concentration (0-15 points) - less concentration = better
        score += (1 - titleConcentration) * 15;
        
        // Close finishes (0-15 points)
        const closeFinishRate = seasons.length > 0 ? closeFinishes / seasons.length : 0;
        score += closeFinishRate * 15;
        
        // Low back-to-back rate (0-10 points)
        score += (1 - backToBackRate) * 10;
        
        // Top 5 variety (0-10 points) - more variety = better
        const top5Variety = seasonsWithTables > 0 ? top5Clubs.size / (seasonsWithTables * 2) : 0; // Expect ~10 different clubs per 5 seasons
        score += Math.min(10, top5Variety * 10);
        
        // Promoted club success (0-5 points) - promoted doing well = competitive
        score += Math.min(5, (promotedSuccessRate / 100) * 10);

        const competitivenessScore = Math.round(Math.min(100, Math.max(0, score)));

        return {
            totalSeasons: seasons.length,
            uniqueChampions: uniqueChampions.length,
            competitivenessScore,
            dynasties,
            topChampions,
            closeFinishes,
            avgTitleGap: Math.round(avgTitleGap * 10) / 10,
            mostDominant: topChampions[0],
            // New stats
            promotedStats: {
                tracked: promotedClubsTracked,
                topHalf: promotedTopHalf,
                topQuarter: promotedTopQuarter,
                champions: promotedChampions,
                successRate: Math.round(promotedSuccessRate)
            },
            top5Variety: top5Clubs.size,
            top6Variety: top6Clubs.size,
            top3Variety: top3Clubs.size,
            backToBackRate: Math.round(backToBackRate * 100),
            turnoverRate: Math.round(turnoverRate * 100),
            titleConcentration: Math.round(titleConcentration * 100),
            topClubsDominance: Math.round(topClubsDominance * 100)
        };
    }, [seasons, leagueTables]);

    if (!stats) return null;

    const getCompetitivenessLabel = (score) => {
        if (score >= 70) return { label: 'Highly Competitive', color: 'text-emerald-600', bg: 'bg-emerald-50' };
        if (score >= 50) return { label: 'Competitive', color: 'text-blue-600', bg: 'bg-blue-50' };
        if (score >= 30) return { label: 'Moderately Competitive', color: 'text-amber-600', bg: 'bg-amber-50' };
        return { label: 'Dominated', color: 'text-red-600', bg: 'bg-red-50' };
    };

    const compLabel = getCompetitivenessLabel(stats.competitivenessScore);

    return (
        <Card className="border-0 shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-blue-500" />
                    League Competitiveness
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className={`p-4 rounded-lg ${compLabel.bg}`}>
                        <div className="text-2xl font-bold">{stats.competitivenessScore}%</div>
                        <div className={`text-sm font-medium ${compLabel.color}`}>{compLabel.label}</div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg">
                        <div className="text-2xl font-bold">{stats.uniqueChampions}</div>
                        <div className="text-sm text-slate-500">Different Champions</div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg">
                        <div className="text-2xl font-bold">{stats.turnoverRate}%</div>
                        <div className="text-sm text-slate-500">Champion Turnover</div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg">
                        <div className="text-2xl font-bold">{stats.dynasties.length}</div>
                        <div className="text-sm text-slate-500">Dynasties (3+ in a row)</div>
                    </div>
                </div>

                {/* Additional Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 text-sm">
                    <div className="p-3 bg-slate-50 rounded-lg">
                        <div className="font-bold text-lg">{stats.closeFinishes}</div>
                        <div className="text-slate-500">Close Title Races (≤3pts)</div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                        <div className="font-bold text-lg">{stats.avgTitleGap} pts</div>
                        <div className="text-slate-500">Avg Title-Winning Margin</div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                        <div className="font-bold text-lg">{stats.top5Variety}</div>
                        <div className="text-slate-500">Clubs in Top 5 (all time)</div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                        <div className="font-bold text-lg">{stats.titleConcentration}%</div>
                        <div className="text-slate-500">Titles by Top Club</div>
                    </div>
                </div>

                {/* Promoted Club Success */}
                {stats.promotedStats.tracked > 0 && (
                    <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-100">
                        <h4 className="font-semibold text-sm text-green-800 mb-2 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" />
                            Promoted Club Performance
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            <div>
                                <div className="font-bold text-green-700">{stats.promotedStats.successRate}%</div>
                                <div className="text-green-600">Finish Top Half</div>
                            </div>
                            <div>
                                <div className="font-bold text-green-700">{stats.promotedStats.topQuarter}</div>
                                <div className="text-green-600">Top Quarter Finishes</div>
                            </div>
                            <div>
                                <div className="font-bold text-green-700">{stats.promotedStats.champions}</div>
                                <div className="text-green-600">Won Title After Promotion</div>
                            </div>
                            <div>
                                <div className="font-bold text-green-700">{stats.promotedStats.tracked}</div>
                                <div className="text-green-600">Promoted Clubs Tracked</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Top Champions */}
                {stats.topChampions.length > 0 && (
                    <div className="mb-6">
                        <h4 className="font-semibold text-sm text-slate-700 mb-3">Most Successful Clubs</h4>
                        <div className="space-y-2">
                            {stats.topChampions.map(([club, count], idx) => (
                                <div key={club} className="flex items-center gap-3">
                                    <span className="w-6 text-center font-bold text-slate-400">{idx + 1}</span>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{club}</span>
                                            <span className="text-amber-600 font-bold">{count} titles</span>
                                        </div>
                                        <div className="h-2 bg-slate-100 rounded-full mt-1">
                                            <div 
                                                className="h-full bg-amber-500 rounded-full"
                                                style={{ width: `${(count / stats.totalSeasons) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Dynasties */}
                {stats.dynasties.length > 0 && (
                    <div>
                        <h4 className="font-semibold text-sm text-slate-700 mb-3 flex items-center gap-2">
                            <Trophy className="w-4 h-4 text-amber-500" />
                            Dynasties
                        </h4>
                        <div className="space-y-2">
                            {stats.dynasties.map((dynasty, idx) => (
                                <div key={idx} className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                                    <div className="font-semibold text-amber-800">{dynasty.club}</div>
                                    <div className="text-sm text-amber-600">
                                        {dynasty.years.length} consecutive titles ({dynasty.years[0]} - {dynasty.years[dynasty.years.length - 1]})
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}