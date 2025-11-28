import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calculator, AlertTriangle, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';

// Get base stability points by tier
const getBaseStabilityByTier = (tier) => {
    if (tier >= 1 && tier <= 4) return 20;      // TFA Football League
    if (tier === 5) return 16;                   // National Alliance League
    if (tier >= 6 && tier <= 9) return 14;       // South/Midlands/North Leagues
    if (tier >= 10 && tier <= 11) return 12;     // Regional Leagues
    if (tier >= 12 && tier <= 14) return 10;     // County Leagues
    return 8;                                     // District and City leagues (15+)
};

// Get champion bonus by tier
const getChampionBonus = (tier) => {
    if (tier === 1) return 7;
    if (tier === 2) return 6;
    if (tier === 3) return 5;
    if (tier === 4) return 4;
    if (tier === 5) return 4;
    if (tier >= 6 && tier <= 9) return 3;
    if (tier >= 10 && tier <= 11) return 2;
    return 1; // Tiers 12+
};

// Get promotion bonus by tier (non-champions)
const getPromotionBonus = (tier) => {
    if (tier === 1) return 0; // Can't be promoted to tier 1
    if (tier === 2) return 5;
    if (tier === 3) return 4;
    if (tier === 4) return 3;
    if (tier === 5) return 3;
    if (tier >= 6 && tier <= 9) return 2;
    return 1; // Tiers 10+
};

// Calculate stability points for a club based on all their seasons
export const calculateClubStability = (clubId, leagueTables, leagues, seasons) => {
    // Get all seasons for this club, sorted by year
    const clubSeasons = leagueTables
        .filter(lt => lt.club_id === clubId)
        .sort((a, b) => a.year.localeCompare(b.year));

    if (clubSeasons.length === 0) {
        return { points: 0, history: [], status: 'stable' };
    }

    // Find the earliest tier to set base points
    let basePoints = 0;
    let history = [];
    let currentPoints = 0;

    clubSeasons.forEach((season, index) => {
        const league = leagues.find(l => l.id === season.league_id);
        const tier = league?.tier || 1;
        const seasonData = seasons.find(s => s.league_id === season.league_id && s.year === season.year);
        const teamsInLeague = seasonData?.number_of_teams || 20;

        // For first season, set base points
        if (index === 0) {
            basePoints = getBaseStabilityByTier(tier);
            currentPoints = basePoints;
            history.push({
                year: season.year,
                event: 'Base',
                change: basePoints,
                total: currentPoints,
                tier,
                position: season.position
            });
        }

        let seasonChange = 0;
        let events = [];

        // Check for champion
        if (season.status === 'champion' || season.position === 1) {
            const bonus = getChampionBonus(tier);
            seasonChange += bonus;
            events.push(`Champion (+${bonus})`);
        }
        // Check for promotion (non-champion)
        else if (season.status === 'promoted' || season.status === 'playoff_winner') {
            const bonus = getPromotionBonus(tier);
            seasonChange += bonus;
            events.push(`Promoted (+${bonus})`);
        }
        // Check for relegation
        else if (season.status === 'relegated') {
            if (season.position === teamsInLeague) {
                // Bottom of table
                seasonChange -= 3;
                events.push('Bottom (-3)');
            } else {
                // Regular relegation
                seasonChange -= 2;
                events.push('Relegated (-2)');
            }
        }
        // Mid-table finish (top half but not promoted/champion)
        else if (season.position <= Math.floor(teamsInLeague / 2)) {
            seasonChange += 1;
            events.push('Mid-table (+1)');
        }
        // Lower half but not relegated = 0 points

        if (seasonChange !== 0 || index > 0) {
            currentPoints += seasonChange;
            if (events.length > 0) {
                history.push({
                    year: season.year,
                    event: events.join(', '),
                    change: seasonChange,
                    total: currentPoints,
                    tier,
                    position: season.position
                });
            }
        }
    });

    // Determine status
    let status = 'stable';
    if (currentPoints <= -5) {
        status = 'critical'; // At risk of folding
    } else if (currentPoints <= 0) {
        status = 'at_risk';
    }

    return {
        points: currentPoints,
        basePoints,
        history,
        status,
        seasonsProcessed: clubSeasons.length
    };
};

export default function StabilityCalculator({ nationId, onComplete }) {
    const queryClient = useQueryClient();
    const [isCalculating, setIsCalculating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [results, setResults] = useState(null);

    const { data: clubs = [] } = useQuery({
        queryKey: ['clubs', nationId],
        queryFn: () => nationId 
            ? base44.entities.Club.filter({ nation_id: nationId })
            : base44.entities.Club.list(),
    });

    const { data: leagues = [] } = useQuery({
        queryKey: ['leagues'],
        queryFn: () => base44.entities.League.list(),
    });

    const { data: leagueTables = [] } = useQuery({
        queryKey: ['allLeagueTables'],
        queryFn: () => base44.entities.LeagueTable.list(),
    });

    const { data: seasons = [] } = useQuery({
        queryKey: ['allSeasons'],
        queryFn: () => base44.entities.Season.list(),
    });

    const calculateAll = async () => {
        setIsCalculating(true);
        setProgress(0);
        setResults(null);

        const updates = [];
        const atRisk = [];
        const critical = [];

        for (let i = 0; i < clubs.length; i++) {
            const club = clubs[i];
            const stability = calculateClubStability(club.id, leagueTables, leagues, seasons);

            // Only update if there's actual season data
            if (stability.seasonsProcessed > 0) {
                updates.push({
                    id: club.id,
                    name: club.name,
                    ...stability
                });

                if (stability.status === 'at_risk') atRisk.push(club.name);
                if (stability.status === 'critical') critical.push(club.name);

                // Update the club
                await base44.entities.Club.update(club.id, {
                    stability_points: stability.points,
                    stability_status: stability.status
                });
            }

            setProgress(Math.round(((i + 1) / clubs.length) * 100));
        }

        setResults({ updates, atRisk, critical });
        setIsCalculating(false);
        queryClient.invalidateQueries(['clubs']);
        queryClient.invalidateQueries(['allClubs']);
        if (onComplete) onComplete();
    };

    return (
        <Card className="border-0 shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Calculator className="w-5 h-5" />
                    Club Stability Calculator
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-sm text-slate-600">
                    Calculate stability points for {nationId ? 'clubs in this nation' : 'all clubs'} based on their season history.
                    Points determine club financial health and facilities.
                </p>

                <div className="grid grid-cols-3 gap-3 text-sm">
                    <div className="p-3 bg-green-50 rounded-lg text-center">
                        <div className="font-bold text-green-700">Stable</div>
                        <div className="text-xs text-green-600">&gt; 0 points</div>
                    </div>
                    <div className="p-3 bg-amber-50 rounded-lg text-center">
                        <div className="font-bold text-amber-700">At Risk</div>
                        <div className="text-xs text-amber-600">0 to -4 points</div>
                    </div>
                    <div className="p-3 bg-red-50 rounded-lg text-center">
                        <div className="font-bold text-red-700">Critical</div>
                        <div className="text-xs text-red-600">≤ -5 points</div>
                    </div>
                </div>

                {isCalculating && (
                    <div className="space-y-2">
                        <Progress value={progress} className="h-2" />
                        <p className="text-sm text-slate-500 text-center">
                            Processing {clubs.length} clubs... {progress}%
                        </p>
                    </div>
                )}

                {results && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-green-700">
                            <CheckCircle className="w-5 h-5" />
                            <span className="font-medium">Updated {results.updates.length} clubs</span>
                        </div>
                        
                        {results.atRisk.length > 0 && (
                            <div className="p-3 bg-amber-50 rounded-lg">
                                <div className="flex items-center gap-2 text-amber-700 mb-2">
                                    <AlertTriangle className="w-4 h-4" />
                                    <span className="font-medium">At Risk ({results.atRisk.length})</span>
                                </div>
                                <div className="text-sm text-amber-600">
                                    {results.atRisk.slice(0, 10).join(', ')}
                                    {results.atRisk.length > 10 && ` +${results.atRisk.length - 10} more`}
                                </div>
                            </div>
                        )}

                        {results.critical.length > 0 && (
                            <div className="p-3 bg-red-50 rounded-lg">
                                <div className="flex items-center gap-2 text-red-700 mb-2">
                                    <AlertTriangle className="w-4 h-4" />
                                    <span className="font-medium">Critical - Risk of Folding ({results.critical.length})</span>
                                </div>
                                <div className="text-sm text-red-600">
                                    {results.critical.join(', ')}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <Button 
                    onClick={calculateAll} 
                    disabled={isCalculating || clubs.length === 0}
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                >
                    {isCalculating ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Calculating...</>
                    ) : (
                        <><Calculator className="w-4 h-4 mr-2" /> Calculate Stability Points</>
                    )}
                </Button>
            </CardContent>
        </Card>
    );
}