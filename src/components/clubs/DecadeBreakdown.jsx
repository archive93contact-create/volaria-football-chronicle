import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, TrendingDown, Award, Target } from 'lucide-react';

export default function DecadeBreakdown({ club, leagueTables, leagues }) {
    const decadeData = useMemo(() => {
        if (!leagueTables || leagueTables.length === 0) return [];

        const decades = {};

        leagueTables.forEach(entry => {
            const year = parseInt(entry.year);
            const decade = Math.floor(year / 10) * 10;
            const decadeLabel = `${decade}s`;

            if (!decades[decadeLabel]) {
                decades[decadeLabel] = {
                    decade: decadeLabel,
                    startYear: decade,
                    seasons: [],
                    titles: 0,
                    promotions: 0,
                    relegations: 0,
                    topThreeFinishes: 0,
                    avgPosition: 0,
                    bestFinish: 999,
                    worstFinish: 0,
                    bestFinishYear: '',
                    worstFinishYear: '',
                    totalSeasons: 0,
                    tierBreakdown: {}
                };
            }

            const tier = entry.tier || leagues?.find(l => l.id === entry.league_id)?.tier || 1;

            decades[decadeLabel].seasons.push({
                year: entry.year,
                position: entry.position,
                tier: tier,
                status: entry.status
            });

            decades[decadeLabel].totalSeasons++;
            decades[decadeLabel].avgPosition += entry.position;

            // Track tier breakdown
            decades[decadeLabel].tierBreakdown[tier] = (decades[decadeLabel].tierBreakdown[tier] || 0) + 1;

            if (entry.position < decades[decadeLabel].bestFinish) {
                decades[decadeLabel].bestFinish = entry.position;
                decades[decadeLabel].bestFinishYear = entry.year;
                decades[decadeLabel].bestFinishTier = tier;
            }

            if (entry.position > decades[decadeLabel].worstFinish) {
                decades[decadeLabel].worstFinish = entry.position;
                decades[decadeLabel].worstFinishYear = entry.year;
                decades[decadeLabel].worstFinishTier = tier;
            }

            if (entry.status === 'champion') {
                decades[decadeLabel].titles++;
            }
            if (entry.status === 'promoted' || entry.status === 'playoff_winner') {
                decades[decadeLabel].promotions++;
            }
            if (entry.status === 'relegated') {
                decades[decadeLabel].relegations++;
            }
            if (entry.position <= 3 && tier === 1) {
                decades[decadeLabel].topThreeFinishes++;
            }
        });

        // Calculate averages and assess era quality
        Object.values(decades).forEach(decade => {
            decade.avgPosition = (decade.avgPosition / decade.totalSeasons).toFixed(1);
            
            // Determine era quality
            const topTierSeasons = decade.tierBreakdown[1] || 0;
            const topTierPercentage = (topTierSeasons / decade.totalSeasons) * 100;

            if (decade.titles >= 2 || (decade.titles >= 1 && decade.topThreeFinishes >= 3)) {
                decade.eraQuality = 'golden';
                decade.eraLabel = '🏆 Golden Era';
                decade.eraColor = 'bg-amber-50 border-amber-300';
            } else if (topTierPercentage >= 70 && decade.avgPosition <= 8) {
                decade.eraQuality = 'strong';
                decade.eraLabel = '💪 Strong Period';
                decade.eraColor = 'bg-emerald-50 border-emerald-300';
            } else if (decade.relegations >= 2 || topTierPercentage < 30) {
                decade.eraQuality = 'struggling';
                decade.eraLabel = '📉 Difficult Times';
                decade.eraColor = 'bg-red-50 border-red-300';
            } else if (decade.promotions >= 1 && decade.relegations === 0) {
                decade.eraQuality = 'rising';
                decade.eraLabel = '📈 On the Rise';
                decade.eraColor = 'bg-blue-50 border-blue-300';
            } else {
                decade.eraQuality = 'stable';
                decade.eraLabel = '⚖️ Stable';
                decade.eraColor = 'bg-slate-50 border-slate-300';
            }
        });

        return Object.values(decades).sort((a, b) => b.startYear - a.startYear);
    }, [leagueTables, leagues]);

    if (decadeData.length === 0) {
        return (
            <Card>
                <CardContent className="py-8">
                    <p className="text-slate-500 text-center">No historical data available for decade breakdown</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {decadeData.map((decade) => (
                <Card key={decade.decade} className={`border-2 ${decade.eraColor}`}>
                    <CardHeader>
                        <div className="flex items-start justify-between">
                            <div>
                                <CardTitle className="text-2xl">{decade.decade}</CardTitle>
                                <CardDescription>
                                    {decade.totalSeasons} {decade.totalSeasons === 1 ? 'season' : 'seasons'} tracked
                                </CardDescription>
                            </div>
                            <Badge className="text-base px-3 py-1">{decade.eraLabel}</Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            {/* Titles */}
                            <div className="bg-white rounded-lg p-3 border">
                                <div className="flex items-center gap-2 text-amber-600 mb-1">
                                    <Trophy className="w-4 h-4" />
                                    <span className="text-xs font-medium uppercase">Titles</span>
                                </div>
                                <p className="text-2xl font-bold text-slate-900">{decade.titles}</p>
                            </div>

                            {/* Top 3 Finishes */}
                            <div className="bg-white rounded-lg p-3 border">
                                <div className="flex items-center gap-2 text-emerald-600 mb-1">
                                    <Award className="w-4 h-4" />
                                    <span className="text-xs font-medium uppercase">Top 3</span>
                                </div>
                                <p className="text-2xl font-bold text-slate-900">{decade.topThreeFinishes}</p>
                            </div>

                            {/* Avg Position */}
                            <div className="bg-white rounded-lg p-3 border">
                                <div className="flex items-center gap-2 text-blue-600 mb-1">
                                    <Target className="w-4 h-4" />
                                    <span className="text-xs font-medium uppercase">Avg Position</span>
                                </div>
                                <p className="text-2xl font-bold text-slate-900">{decade.avgPosition}</p>
                            </div>

                            {/* Promotions/Relegations */}
                            <div className="bg-white rounded-lg p-3 border">
                                <div className="flex items-center gap-2 text-slate-600 mb-1">
                                    <TrendingUp className="w-4 h-4" />
                                    <span className="text-xs font-medium uppercase">↑/↓</span>
                                </div>
                                <p className="text-2xl font-bold">
                                    <span className="text-green-600">{decade.promotions}</span>
                                    <span className="text-slate-400 mx-1">/</span>
                                    <span className="text-red-600">{decade.relegations}</span>
                                </p>
                            </div>
                        </div>

                        {/* Best/Worst */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                                <p className="text-xs font-medium text-green-700 mb-1 uppercase">Best Finish</p>
                                <p className="text-lg font-bold text-green-900">
                                    {decade.bestFinish === 1 ? '🏆 Champion' : `${decade.bestFinish}${decade.bestFinish === 2 ? 'nd' : decade.bestFinish === 3 ? 'rd' : 'th'} place`}
                                    <span className="text-sm font-normal ml-2 text-green-700">
                                        ({decade.bestFinishYear}, Tier {decade.bestFinishTier})
                                    </span>
                                </p>
                            </div>
                            <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                                <p className="text-xs font-medium text-red-700 mb-1 uppercase">Worst Finish</p>
                                <p className="text-lg font-bold text-red-900">
                                    {decade.worstFinish}th place
                                    <span className="text-sm font-normal ml-2 text-red-700">
                                        ({decade.worstFinishYear}, Tier {decade.worstFinishTier})
                                    </span>
                                </p>
                            </div>
                        </div>

                        {/* Tier Distribution */}
                        <div className="bg-white rounded-lg p-3 border">
                            <p className="text-xs font-medium text-slate-700 mb-2 uppercase">Time by Tier</p>
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(decade.tierBreakdown)
                                    .sort(([a], [b]) => parseInt(a) - parseInt(b))
                                    .map(([tier, count]) => (
                                        <Badge key={tier} variant="outline" className="text-sm">
                                            Tier {tier}: {count} {count === 1 ? 'season' : 'seasons'}
                                        </Badge>
                                    ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}