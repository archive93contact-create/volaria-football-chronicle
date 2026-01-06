import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Award, Star, Shield, Crown } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

export default function TrophyHaul({ club, combinedStats, seasons = [], allLeagues = [] }) {
    const trophyData = useMemo(() => {
        if (!club) return null;

        // Major Trophies
        const majorTrophies = [];
        
        // Top Flight Titles (Tier 1 only)
        if (combinedStats?.league_titles > 0) {
            majorTrophies.push({
                name: 'League Championships',
                count: combinedStats.league_titles,
                years: combinedStats.title_years,
                icon: Trophy,
                color: 'amber',
                gradient: 'from-amber-50 to-yellow-50',
                borderColor: 'border-amber-200'
            });
        }

        // Domestic Cup
        if (combinedStats?.domestic_cup_titles > 0) {
            majorTrophies.push({
                name: 'Domestic Cup',
                count: combinedStats.domestic_cup_titles,
                years: combinedStats.domestic_cup_title_years,
                icon: Award,
                color: 'orange',
                gradient: 'from-orange-50 to-amber-50',
                borderColor: 'border-orange-200'
            });
        }

        // VCC
        if (combinedStats?.vcc_titles > 0) {
            majorTrophies.push({
                name: 'Volarian Champions Cup',
                count: combinedStats.vcc_titles,
                years: combinedStats.vcc_title_years,
                icon: Star,
                color: 'purple',
                gradient: 'from-purple-50 to-fuchsia-50',
                borderColor: 'border-purple-200'
            });
        }

        // CCC
        if (combinedStats?.ccc_titles > 0) {
            majorTrophies.push({
                name: 'Continental Challenge Cup',
                count: combinedStats.ccc_titles,
                years: combinedStats.ccc_title_years,
                icon: Star,
                color: 'blue',
                gradient: 'from-blue-50 to-indigo-50',
                borderColor: 'border-blue-200'
            });
        }

        const totalMajorTrophies = majorTrophies.reduce((sum, t) => sum + t.count, 0);

        // Minor Trophies (Lower Tier Championships)
        const minorTrophies = [];
        
        // Count championships by tier
        const championshipsByTier = {};
        seasons.forEach(s => {
            if (s.status === 'champion') {
                const tier = s.tier || allLeagues.find(l => l.id === s.league_id)?.tier || 1;
                if (tier > 1) { // Only lower tiers
                    if (!championshipsByTier[tier]) {
                        championshipsByTier[tier] = { count: 0, years: [], leagueName: '' };
                    }
                    championshipsByTier[tier].count++;
                    championshipsByTier[tier].years.push(s.year);
                    if (!championshipsByTier[tier].leagueName) {
                        championshipsByTier[tier].leagueName = allLeagues.find(l => l.id === s.league_id)?.name || `Tier ${tier}`;
                    }
                }
            }
        });

        // Convert to array
        Object.entries(championshipsByTier)
            .sort((a, b) => parseInt(a[0]) - parseInt(b[0])) // Sort by tier
            .forEach(([tier, data]) => {
                minorTrophies.push({
                    name: data.leagueName,
                    count: data.count,
                    years: data.years.sort().join(', '),
                    tier: parseInt(tier),
                    icon: Shield,
                    color: 'slate',
                    gradient: 'from-slate-50 to-gray-50',
                    borderColor: 'border-slate-200'
                });
            });

        const totalMinorTrophies = minorTrophies.reduce((sum, t) => sum + t.count, 0);

        return {
            majorTrophies,
            minorTrophies,
            totalMajorTrophies,
            totalMinorTrophies
        };
    }, [club, combinedStats, seasons, allLeagues]);

    if (!trophyData || (trophyData.majorTrophies.length === 0 && trophyData.minorTrophies.length === 0)) {
        return (
            <Card className="border-dashed border-2 border-slate-300">
                <CardContent className="flex flex-col items-center justify-center py-16">
                    <Trophy className="w-16 h-16 text-slate-300 mb-4" />
                    <h3 className="text-xl font-semibold text-slate-700 mb-2">No Trophies Yet</h3>
                    <p className="text-slate-500">The trophy cabinet awaits its first silverware</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Total Count Header */}
            <div className="text-center p-8 bg-gradient-to-br from-amber-100 via-yellow-100 to-amber-50 rounded-2xl shadow-lg border-2 border-amber-200">
                <Crown className="w-16 h-16 text-amber-600 mx-auto mb-4" />
                <div className="text-6xl font-bold text-amber-700 mb-2">{trophyData.totalMajorTrophies}</div>
                <div className="text-xl text-amber-800 font-semibold">Major Honours</div>
                {trophyData.totalMinorTrophies > 0 && (
                    <div className="text-sm text-amber-600 mt-2">+ {trophyData.totalMinorTrophies} lower tier titles</div>
                )}
            </div>

            {/* Major Trophies */}
            {trophyData.majorTrophies.length > 0 && (
                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-amber-500" />
                            Major Honours
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {trophyData.majorTrophies.map((trophy, idx) => (
                                <div 
                                    key={idx} 
                                    className={`p-4 rounded-xl border bg-gradient-to-r ${trophy.gradient} ${trophy.borderColor}`}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={`p-3 bg-white rounded-lg shadow-sm`}>
                                            <trophy.icon className={`w-8 h-8 text-${trophy.color}-500`} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <h3 className="font-bold text-lg">{trophy.name}</h3>
                                                <Badge 
                                                    className={`bg-${trophy.color}-500 text-white`}
                                                    style={{ 
                                                        backgroundColor: trophy.color === 'amber' ? '#f59e0b' : 
                                                                       trophy.color === 'orange' ? '#fb923c' :
                                                                       trophy.color === 'purple' ? '#a855f7' :
                                                                       trophy.color === 'blue' ? '#3b82f6' : undefined
                                                    }}
                                                >
                                                    {trophy.count} {trophy.count === 1 ? 'Title' : 'Titles'}
                                                </Badge>
                                            </div>
                                            {trophy.years && (
                                                <div className="text-sm text-slate-700 font-medium">
                                                    {trophy.years}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Minor Trophies */}
            {trophyData.minorTrophies.length > 0 && (
                <Card className="border-0 shadow-sm bg-slate-50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="w-5 h-5 text-slate-500" />
                            Lower Tier Championships
                            <Badge variant="outline" className="ml-2 text-xs">Not counted in major honours</Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {trophyData.minorTrophies.map((trophy, idx) => (
                                <div 
                                    key={idx} 
                                    className={`p-4 rounded-lg border bg-gradient-to-r ${trophy.gradient} ${trophy.borderColor}`}
                                >
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-3 flex-1">
                                            <div className="p-2 bg-white rounded-lg shadow-sm">
                                                <trophy.icon className="w-6 h-6 text-slate-500" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-semibold">{trophy.name}</h4>
                                                    <Badge variant="outline" className="text-xs">Tier {trophy.tier}</Badge>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-bold text-slate-700">{trophy.count}</div>
                                            <div className="text-xs text-slate-500">{trophy.count === 1 ? 'Title' : 'Titles'}</div>
                                        </div>
                                    </div>
                                    {trophy.years && (
                                        <div className="text-xs text-slate-600 mt-2 pl-12">
                                            {trophy.years}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 p-3 bg-white rounded-lg text-center text-sm text-slate-500">
                            Total lower tier championships: <span className="font-bold text-slate-700">{trophyData.totalMinorTrophies}</span>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}