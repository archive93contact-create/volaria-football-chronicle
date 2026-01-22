import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, TrendingDown, Award, Target, Calendar, Star } from 'lucide-react';

export default function DecadeBreakdown({ seasons = [], allLeagues = [] }) {
    const decadeStats = useMemo(() => {
        if (!seasons || seasons.length === 0) return [];

        // Group seasons by decade
        const decades = {};

        seasons.forEach(season => {
            if (!season.year) return;
            
            const year = parseInt(season.year);
            const decade = Math.floor(year / 10) * 10;
            const league = allLeagues.find(l => l.id === season.league_id);
            const tier = season.tier || league?.tier || 1;

            if (!decades[decade]) {
                decades[decade] = {
                    decade,
                    decadeLabel: `${decade}s`,
                    seasons: 0,
                    wins: 0,
                    draws: 0,
                    losses: 0,
                    goalsFor: 0,
                    goalsAgainst: 0,
                    points: 0,
                    titles: 0,
                    promotions: 0,
                    relegations: 0,
                    bestFinish: 99,
                    bestFinishYear: null,
                    worstFinish: 0,
                    worstFinishYear: null,
                    avgPosition: 0,
                    seasonsInTopFlight: 0,
                    highestTier: 99,
                    lowestTier: 0,
                };
            }

            const d = decades[decade];
            d.seasons++;
            d.wins += season.won || 0;
            d.draws += season.drawn || 0;
            d.losses += season.lost || 0;
            d.goalsFor += season.goals_for || 0;
            d.goalsAgainst += season.goals_against || 0;
            d.points += season.points || 0;
            d.avgPosition += season.position || 0;

            if (tier === 1) d.seasonsInTopFlight++;
            d.highestTier = Math.min(d.highestTier, tier);
            d.lowestTier = Math.max(d.lowestTier, tier);

            if (season.status === 'champion') d.titles++;
            if (season.status === 'promoted') d.promotions++;
            if (season.status === 'relegated') d.relegations++;

            if (season.position < d.bestFinish) {
                d.bestFinish = season.position;
                d.bestFinishYear = season.year;
            }
            if (season.position > d.worstFinish) {
                d.worstFinish = season.position;
                d.worstFinishYear = season.year;
            }
        });

        // Calculate averages
        Object.values(decades).forEach(d => {
            d.avgPosition = d.seasons > 0 ? (d.avgPosition / d.seasons).toFixed(1) : 0;
            d.winRate = d.seasons > 0 ? ((d.wins / (d.wins + d.draws + d.losses)) * 100).toFixed(1) : 0;
            d.goalsPerSeason = d.seasons > 0 ? (d.goalsFor / d.seasons).toFixed(1) : 0;
        });

        return Object.values(decades).sort((a, b) => b.decade - a.decade);
    }, [seasons, allLeagues]);

    if (decadeStats.length === 0) {
        return null;
    }

    const getDecadeQuality = (decade) => {
        const score = 
            (decade.titles * 50) + 
            (decade.seasonsInTopFlight * 10) + 
            (decade.promotions * 5) - 
            (decade.relegations * 5) +
            (decade.avgPosition < 5 ? 20 : decade.avgPosition < 10 ? 10 : 0);
        
        if (score > 100) return { label: 'Golden Era', color: 'bg-amber-500', textColor: 'text-amber-700' };
        if (score > 50) return { label: 'Strong Period', color: 'bg-emerald-500', textColor: 'text-emerald-700' };
        if (score > 20) return { label: 'Stable', color: 'bg-blue-500', textColor: 'text-blue-700' };
        if (score > 0) return { label: 'Rebuilding', color: 'bg-slate-400', textColor: 'text-slate-700' };
        return { label: 'Difficult Era', color: 'bg-red-500', textColor: 'text-red-700' };
    };

    return (
        <Card className="border-0 shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    Decade-by-Decade Performance Breakdown
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {decadeStats.map((decade, idx) => {
                        const quality = getDecadeQuality(decade);
                        
                        return (
                            <div 
                                key={decade.decade}
                                className="relative p-6 rounded-xl border-2 border-slate-200 hover:shadow-lg transition-all bg-gradient-to-r from-slate-50 to-white"
                            >
                                {/* Decade Header */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className="text-4xl font-bold text-slate-800">{decade.decadeLabel}</div>
                                        <Badge className={`${quality.color} text-white`}>
                                            {quality.label}
                                        </Badge>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm text-slate-500">{decade.seasons} seasons played</div>
                                        {decade.highestTier === decade.lowestTier ? (
                                            <Badge variant="outline">Tier {decade.highestTier} only</Badge>
                                        ) : (
                                            <div className="text-xs text-slate-600">
                                                Tiers {decade.highestTier}-{decade.lowestTier}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Key Stats Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-4">
                                    {decade.titles > 0 && (
                                        <div className="p-3 bg-amber-50 rounded-lg text-center border border-amber-200">
                                            <Trophy className="w-5 h-5 text-amber-600 mx-auto mb-1" />
                                            <div className="text-2xl font-bold text-amber-700">{decade.titles}</div>
                                            <div className="text-xs text-amber-600">Titles</div>
                                        </div>
                                    )}
                                    <div className="p-3 bg-slate-50 rounded-lg text-center">
                                        <Target className="w-5 h-5 text-slate-600 mx-auto mb-1" />
                                        <div className="text-xl font-bold text-slate-700">{decade.avgPosition}</div>
                                        <div className="text-xs text-slate-500">Avg Position</div>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-lg text-center">
                                        <div className="text-xl font-bold text-green-600">{decade.winRate}%</div>
                                        <div className="text-xs text-slate-500">Win Rate</div>
                                    </div>
                                    {decade.seasonsInTopFlight > 0 && (
                                        <div className="p-3 bg-blue-50 rounded-lg text-center border border-blue-200">
                                            <Star className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                                            <div className="text-xl font-bold text-blue-700">{decade.seasonsInTopFlight}</div>
                                            <div className="text-xs text-blue-600">Top Flight</div>
                                        </div>
                                    )}
                                    {decade.promotions > 0 && (
                                        <div className="p-3 bg-green-50 rounded-lg text-center">
                                            <TrendingUp className="w-5 h-5 text-green-600 mx-auto mb-1" />
                                            <div className="text-xl font-bold text-green-700">{decade.promotions}</div>
                                            <div className="text-xs text-green-600">Promoted</div>
                                        </div>
                                    )}
                                    {decade.relegations > 0 && (
                                        <div className="p-3 bg-red-50 rounded-lg text-center">
                                            <TrendingDown className="w-5 h-5 text-red-600 mx-auto mb-1" />
                                            <div className="text-xl font-bold text-red-700">{decade.relegations}</div>
                                            <div className="text-xs text-red-600">Relegated</div>
                                        </div>
                                    )}
                                </div>

                                {/* Secondary Stats */}
                                <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-center text-sm">
                                    <div className="p-2 bg-green-50 rounded">
                                        <div className="font-bold text-green-700">{decade.wins}</div>
                                        <div className="text-xs text-slate-500">W</div>
                                    </div>
                                    <div className="p-2 bg-slate-50 rounded">
                                        <div className="font-bold text-slate-700">{decade.draws}</div>
                                        <div className="text-xs text-slate-500">D</div>
                                    </div>
                                    <div className="p-2 bg-red-50 rounded">
                                        <div className="font-bold text-red-700">{decade.losses}</div>
                                        <div className="text-xs text-slate-500">L</div>
                                    </div>
                                    <div className="p-2 bg-blue-50 rounded">
                                        <div className="font-bold text-blue-700">{decade.goalsFor}</div>
                                        <div className="text-xs text-slate-500">GF</div>
                                    </div>
                                    <div className="p-2 bg-slate-50 rounded">
                                        <div className="font-bold text-slate-700">{decade.goalsAgainst}</div>
                                        <div className="text-xs text-slate-500">GA</div>
                                    </div>
                                    <div className="p-2 bg-amber-50 rounded">
                                        <div className="font-bold text-amber-700">{decade.points}</div>
                                        <div className="text-xs text-slate-500">Pts</div>
                                    </div>
                                </div>

                                {/* Best/Worst */}
                                <div className="flex items-center justify-around mt-4 pt-4 border-t">
                                    <div className="text-center">
                                        <div className="text-xs text-slate-500 mb-1">Best Finish</div>
                                        <div className="font-bold text-emerald-700">
                                            {decade.bestFinish === 1 ? '1st' : decade.bestFinish === 2 ? '2nd' : decade.bestFinish === 3 ? '3rd' : `${decade.bestFinish}th`}
                                        </div>
                                        <div className="text-xs text-slate-400">{decade.bestFinishYear}</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-xs text-slate-500 mb-1">Worst Finish</div>
                                        <div className="font-bold text-slate-600">
                                            {decade.worstFinish === 1 ? '1st' : decade.worstFinish === 2 ? '2nd' : decade.worstFinish === 3 ? '3rd' : `${decade.worstFinish}th`}
                                        </div>
                                        <div className="text-xs text-slate-400">{decade.worstFinishYear}</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-xs text-slate-500 mb-1">Avg Goals/Season</div>
                                        <div className="font-bold text-blue-700">{decade.goalsPerSeason}</div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}