import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, ArrowUpDown, Award } from 'lucide-react';

export default function LeaguePyramidFlow({ clubs, leagueTables, leagues }) {
    const flowData = useMemo(() => {
        if (!clubs || !leagueTables || leagueTables.length === 0) return null;

        const clubMovements = {};

        // Track each club's movements
        clubs.forEach(club => {
            clubMovements[club.id] = {
                club: club,
                history: [],
                totalPromotions: 0,
                totalRelegations: 0,
                tierChanges: 0,
                highestTier: 999,
                lowestTier: 0,
                currentTier: null
            };
        });

        // Sort seasons chronologically
        const sortedTables = [...leagueTables].sort((a, b) => a.year.localeCompare(b.year));
        const latestYear = sortedTables[sortedTables.length - 1]?.year;

        sortedTables.forEach((entry, idx) => {
            if (!entry.club_id || !clubMovements[entry.club_id]) return;

            const league = leagues?.find(l => l.id === entry.league_id);
            const tier = entry.tier || league?.tier || 1;

            const movement = {
                year: entry.year,
                tier: tier,
                position: entry.position,
                status: entry.status,
                league_name: league?.name || 'Unknown League'
            };

            clubMovements[entry.club_id].history.push(movement);

            // Track tier extremes
            if (tier < clubMovements[entry.club_id].highestTier) {
                clubMovements[entry.club_id].highestTier = tier;
            }
            if (tier > clubMovements[entry.club_id].lowestTier) {
                clubMovements[entry.club_id].lowestTier = tier;
            }

            // Detect promotion/relegation
            if (idx > 0) {
                const prevEntry = sortedTables[idx - 1];
                if (prevEntry.club_id === entry.club_id) {
                    const prevLeague = leagues?.find(l => l.id === prevEntry.league_id);
                    const prevTier = prevEntry.tier || prevLeague?.tier || 1;

                    if (tier < prevTier) {
                        clubMovements[entry.club_id].totalPromotions++;
                        clubMovements[entry.club_id].tierChanges++;
                        movement.movement = 'promotion';
                    } else if (tier > prevTier) {
                        clubMovements[entry.club_id].totalRelegations++;
                        clubMovements[entry.club_id].tierChanges++;
                        movement.movement = 'relegation';
                    }
                }
            }

            if (entry.year === latestYear) {
                clubMovements[entry.club_id].currentTier = tier;
            }
        });

        // Find most dramatic journeys - only clubs with actual tier changes
        const dramaticJourneys = Object.values(clubMovements)
            .filter(cm => cm.history.length > 0 && cm.tierChanges > 0)
            .map(cm => ({
                ...cm,
                tierGap: cm.lowestTier - cm.highestTier
            }))
            .sort((a, b) => {
                // Sort by tier gap first, then by tier changes
                return (b.tierGap - a.tierGap) || (b.tierChanges - a.tierChanges);
            })
            .slice(0, 10);

        // Find yo-yo clubs
        const yoYoClubs = Object.values(clubMovements)
            .filter(cm => cm.totalPromotions >= 2 && cm.totalRelegations >= 2)
            .sort((a, b) => (b.totalPromotions + b.totalRelegations) - (a.totalPromotions + a.totalRelegations))
            .slice(0, 10);

        // Find stable clubs (never relegated)
        const stableClubs = Object.values(clubMovements)
            .filter(cm => cm.history.length >= 5 && cm.totalRelegations === 0 && cm.highestTier === 1)
            .sort((a, b) => b.history.length - a.history.length)
            .slice(0, 10);

        return {
            dramaticJourneys,
            yoYoClubs,
            stableClubs
        };
    }, [clubs, leagueTables, leagues]);

    if (!flowData || (flowData.dramaticJourneys.length === 0 && flowData.yoYoClubs.length === 0 && flowData.stableClubs.length === 0)) {
        return (
            <Card>
                <CardContent className="py-8">
                    <p className="text-slate-500 text-center">No movement data available</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Dramatic Journeys */}
            {flowData.dramaticJourneys.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ArrowUpDown className="w-5 h-5" />
                            Most Dramatic Journeys
                        </CardTitle>
                        <CardDescription>
                            Clubs with the most tier changes throughout history
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {flowData.dramaticJourneys.map((clubData, idx) => (
                                <div key={clubData.club.id} className="bg-slate-50 rounded-lg p-4 border">
                                    <div className="flex items-start justify-between mb-3">
                                        <Link 
                                            to={createPageUrl('ClubDetail', `?id=${clubData.club.id}`)}
                                            className="flex items-center gap-3 hover:underline flex-1"
                                        >
                                            {clubData.club.logo_url && (
                                                <img 
                                                    src={clubData.club.logo_url} 
                                                    alt={clubData.club.name}
                                                    className="w-8 h-8 object-contain bg-white rounded"
                                                />
                                            )}
                                            <div>
                                                <h4 className="font-bold text-slate-900">{clubData.club.name}</h4>
                                                <p className="text-sm text-slate-600">
                                                    {clubData.history.length} seasons tracked
                                                </p>
                                            </div>
                                        </Link>
                                        <span className="text-2xl font-bold text-slate-400">#{idx + 1}</span>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2 mb-2">
                                        <div className="bg-white rounded p-2 text-center">
                                            <div className="text-lg font-bold text-green-600">{clubData.totalPromotions}</div>
                                            <div className="text-xs text-slate-600">↑ Promotions</div>
                                        </div>
                                        <div className="bg-white rounded p-2 text-center">
                                            <div className="text-lg font-bold text-red-600">{clubData.totalRelegations}</div>
                                            <div className="text-xs text-slate-600">↓ Relegations</div>
                                        </div>
                                        <div className="bg-white rounded p-2 text-center">
                                            <div className="text-lg font-bold text-blue-600">{clubData.highestTier}</div>
                                            <div className="text-xs text-slate-600">Highest Tier</div>
                                        </div>
                                        <div className="bg-white rounded p-2 text-center">
                                            <div className="text-lg font-bold text-slate-600">{clubData.lowestTier}</div>
                                            <div className="text-xs text-slate-600">Lowest Tier</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline">
                                            {clubData.tierChanges} tier changes
                                        </Badge>
                                        <Badge className="bg-purple-100 text-purple-800">
                                            {clubData.tierGap} tier gap
                                        </Badge>
                                        {clubData.currentTier && (
                                            <Badge>Currently: Tier {clubData.currentTier}</Badge>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Yo-Yo Clubs */}
            {flowData.yoYoClubs.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ArrowUpDown className="w-5 h-5 text-amber-600" />
                            Yo-Yo Clubs
                        </CardTitle>
                        <CardDescription>
                            Clubs frequently bouncing between tiers
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {flowData.yoYoClubs.map((clubData) => (
                                <div key={clubData.club.id} className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                                    <Link 
                                        to={createPageUrl('ClubDetail', `?id=${clubData.club.id}`)}
                                        className="flex items-center justify-between hover:underline"
                                    >
                                        <div className="flex items-center gap-3">
                                            {clubData.club.logo_url && (
                                                <img 
                                                    src={clubData.club.logo_url} 
                                                    alt={clubData.club.name}
                                                    className="w-6 h-6 object-contain bg-white rounded"
                                                />
                                            )}
                                            <span className="font-bold text-slate-900">{clubData.club.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge className="bg-green-100 text-green-800">
                                                ↑ {clubData.totalPromotions}
                                            </Badge>
                                            <Badge className="bg-red-100 text-red-800">
                                                ↓ {clubData.totalRelegations}
                                            </Badge>
                                        </div>
                                    </Link>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Stable Clubs */}
            {flowData.stableClubs.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Award className="w-5 h-5 text-emerald-600" />
                            Ever-Present Clubs
                        </CardTitle>
                        <CardDescription>
                            Top-tier clubs that have never been relegated
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {flowData.stableClubs.map((clubData) => (
                                <div key={clubData.club.id} className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                                    <Link 
                                        to={createPageUrl('ClubDetail', `?id=${clubData.club.id}`)}
                                        className="flex items-center justify-between hover:underline"
                                    >
                                        <div className="flex items-center gap-3">
                                            {clubData.club.logo_url && (
                                                <img 
                                                    src={clubData.club.logo_url} 
                                                    alt={clubData.club.name}
                                                    className="w-6 h-6 object-contain bg-white rounded"
                                                />
                                            )}
                                            <span className="font-bold text-slate-900">{clubData.club.name}</span>
                                        </div>
                                        <Badge className="bg-emerald-100 text-emerald-800">
                                            {clubData.history.length} consecutive top-tier seasons
                                        </Badge>
                                    </Link>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}