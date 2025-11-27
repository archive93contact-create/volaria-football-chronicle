import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, TrendingUp, Users, Target } from 'lucide-react';

export default function LeagueCompetitiveness({ seasons = [], leagueTables = [] }) {
    const stats = useMemo(() => {
        if (seasons.length === 0) return null;

        // Count unique champions
        const champions = seasons.map(s => s.champion_name).filter(Boolean);
        const uniqueChampions = [...new Set(champions)];
        
        // Count champion frequencies
        const championCounts = {};
        champions.forEach(c => {
            championCounts[c] = (championCounts[c] || 0) + 1;
        });
        
        // Find dynasties (3+ consecutive titles)
        const dynasties = [];
        let currentDynasty = null;
        seasons.sort((a, b) => a.year.localeCompare(b.year)).forEach(s => {
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

        // Calculate competitiveness score (more unique champions = more competitive)
        const competitivenessScore = seasons.length > 0 
            ? Math.round((uniqueChampions.length / seasons.length) * 100)
            : 0;

        // Top champions
        const topChampions = Object.entries(championCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        // Close finishes (1-3 point gaps at top)
        const closeFinishes = leagueTables.filter(t => {
            const sameSeasonTables = leagueTables.filter(lt => lt.season_id === t.season_id);
            const first = sameSeasonTables.find(st => st.position === 1);
            const second = sameSeasonTables.find(st => st.position === 2);
            if (first && second && t.position === 1) {
                return (first.points - second.points) <= 3;
            }
            return false;
        }).length;

        return {
            totalSeasons: seasons.length,
            uniqueChampions: uniqueChampions.length,
            competitivenessScore,
            dynasties,
            topChampions,
            closeFinishes,
            mostDominant: topChampions[0]
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
                        <div className="text-2xl font-bold">{stats.closeFinishes}</div>
                        <div className="text-sm text-slate-500">Close Title Races</div>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg">
                        <div className="text-2xl font-bold">{stats.dynasties.length}</div>
                        <div className="text-sm text-slate-500">Dynasties (3+ in a row)</div>
                    </div>
                </div>

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