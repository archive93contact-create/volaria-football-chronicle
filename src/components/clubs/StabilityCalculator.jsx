import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, RefreshCw, AlertTriangle, TrendingUp, TrendingDown, Shield, CheckCircle2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Get base stability points by tier
const getBaseStabilityByTier = (tier) => {
    if (tier >= 1 && tier <= 4) return 20;      // TFA Football League
    if (tier === 5) return 16;                   // National Alliance League
    if (tier >= 6 && tier <= 9) return 14;       // South/Midlands/North Leagues
    if (tier >= 10 && tier <= 11) return 12;     // Regional Leagues
    if (tier >= 12 && tier <= 14) return 10;     // County Leagues
    return 8;                                     // Tier 15+ District/City leagues
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
    return 1; // Tier 12+
};

// Get promotion bonus by tier (non-champions)
const getPromotionBonus = (tier) => {
    if (tier === 1) return 0; // N/A - can't be promoted to tier 1 as non-champion typically
    if (tier === 2) return 5;
    if (tier === 3) return 4;
    if (tier === 4) return 3;
    if (tier === 5) return 3;
    if (tier >= 6 && tier <= 9) return 2;
    return 1; // Tier 10+
};

// Determine stability status from points
const getStabilityStatus = (points) => {
    if (points >= 25) return { status: 'thriving', label: 'Thriving', color: 'bg-emerald-500', textColor: 'text-emerald-700' };
    if (points >= 15) return { status: 'stable', label: 'Stable', color: 'bg-blue-500', textColor: 'text-blue-700' };
    if (points >= 5) return { status: 'struggling', label: 'Struggling', color: 'bg-amber-500', textColor: 'text-amber-700' };
    if (points >= -4) return { status: 'at_risk', label: 'At Risk', color: 'bg-red-500', textColor: 'text-red-700' };
    return { status: 'folded', label: 'Folded', color: 'bg-slate-500', textColor: 'text-slate-700' };
};

// Calculate stability for a single club based on all their seasons
const calculateClubStability = (club, leagueTables, leagues, seasons) => {
    // Find highest tier the club has played in to determine base
    const clubSeasons = leagueTables.filter(lt => lt.club_id === club.id);
    
    if (clubSeasons.length === 0) {
        // No season data - use current league tier
        const currentLeague = leagues.find(l => l.id === club.league_id);
        const baseTier = currentLeague?.tier || 10;
        return {
            points: getBaseStabilityByTier(baseTier),
            breakdown: [{ type: 'base', description: `Base points for Tier ${baseTier}`, points: getBaseStabilityByTier(baseTier) }]
        };
    }

    // Find highest tier played
    let highestTier = 99;
    clubSeasons.forEach(cs => {
        const league = leagues.find(l => l.id === cs.league_id);
        if (league?.tier && league.tier < highestTier) {
            highestTier = league.tier;
        }
    });
    if (highestTier === 99) highestTier = 10;

    let points = getBaseStabilityByTier(highestTier);
    const breakdown = [{ type: 'base', description: `Base points (highest tier: ${highestTier})`, points: getBaseStabilityByTier(highestTier) }];

    // Sort seasons chronologically
    const sortedSeasons = [...clubSeasons].sort((a, b) => a.year.localeCompare(b.year));

    // Process each season
    sortedSeasons.forEach(cs => {
        const league = leagues.find(l => l.id === cs.league_id);
        const season = seasons.find(s => s.id === cs.season_id);
        const tier = league?.tier || 5;
        const numTeams = season?.number_of_teams || cs.played ? Math.round(cs.played / 2) + 1 : 20;
        const midPoint = Math.ceil(numTeams / 2);

        // Champion
        if (cs.status === 'champion' || cs.position === 1) {
            const bonus = getChampionBonus(tier);
            points += bonus;
            breakdown.push({ type: 'champion', description: `${cs.year}: Champion (Tier ${tier})`, points: bonus });
        }
        // Promoted (non-champion)
        else if (cs.status === 'promoted' || cs.status === 'playoff_winner') {
            const bonus = getPromotionBonus(tier);
            points += bonus;
            breakdown.push({ type: 'promoted', description: `${cs.year}: Promoted (Tier ${tier})`, points: bonus });
        }
        // Relegated
        else if (cs.status === 'relegated') {
            points -= 2;
            breakdown.push({ type: 'relegated', description: `${cs.year}: Relegated`, points: -2 });
            // Additional penalty for bottom
            if (cs.position === numTeams) {
                points -= 1;
                breakdown.push({ type: 'bottom', description: `${cs.year}: Bottom of table`, points: -1 });
            }
        }
        // Mid-table (upper half but not promoted)
        else if (cs.position <= midPoint) {
            points += 1;
            breakdown.push({ type: 'midtable', description: `${cs.year}: Mid-table finish (${cs.position}/${numTeams})`, points: 1 });
        }
        // Lower half but not relegated - no change
    });

    return { points, breakdown };
};

export default function StabilityCalculator({ nationId, onComplete }) {
    const queryClient = useQueryClient();
    const [isProcessing, setIsProcessing] = useState(false);
    const [results, setResults] = useState(null);
    const [selectedNation, setSelectedNation] = useState(nationId || 'all');

    const { data: nations = [] } = useQuery({
        queryKey: ['nations'],
        queryFn: () => base44.entities.Nation.list('name'),
    });

    const { data: clubs = [] } = useQuery({
        queryKey: ['allClubs'],
        queryFn: () => base44.entities.Club.list(),
    });

    const { data: leagues = [] } = useQuery({
        queryKey: ['allLeagues'],
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

    const filteredClubs = useMemo(() => {
        if (selectedNation === 'all') return clubs.filter(c => !c.is_former_name && !c.is_defunct);
        return clubs.filter(c => c.nation_id === selectedNation && !c.is_former_name && !c.is_defunct);
    }, [clubs, selectedNation]);

    const processStability = async () => {
        setIsProcessing(true);
        const updateResults = { updated: 0, atRisk: [], thriving: [], errors: [] };

        for (const club of filteredClubs) {
            try {
                const { points, breakdown } = calculateClubStability(club, leagueTables, leagues, seasons);
                const statusInfo = getStabilityStatus(points);

                // Only update if changed
                if (club.stability_points !== points || club.stability_status !== statusInfo.status) {
                    await base44.entities.Club.update(club.id, {
                        stability_points: points,
                        stability_status: statusInfo.status
                    });
                    updateResults.updated++;
                }

                if (statusInfo.status === 'at_risk' || statusInfo.status === 'folded') {
                    updateResults.atRisk.push({ club, points, status: statusInfo });
                }
                if (statusInfo.status === 'thriving') {
                    updateResults.thriving.push({ club, points });
                }
            } catch (error) {
                updateResults.errors.push({ club: club.name, error: error.message });
            }
        }

        setResults(updateResults);
        setIsProcessing(false);
        queryClient.invalidateQueries(['allClubs']);
        if (onComplete) onComplete(updateResults);
    };

    return (
        <Card className="border-0 shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-blue-500" />
                    Club Stability Calculator
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-sm text-slate-600">
                    Calculate stability points for all clubs based on their season history. 
                    Points are awarded for titles and promotions, deducted for relegations.
                </p>

                <div className="flex gap-4 items-end">
                    <div className="flex-1">
                        <label className="text-sm font-medium text-slate-700">Nation</label>
                        <Select value={selectedNation} onValueChange={setSelectedNation}>
                            <SelectTrigger className="mt-1">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Nations ({filteredClubs.length} clubs)</SelectItem>
                                {nations.map(n => {
                                    const count = clubs.filter(c => c.nation_id === n.id && !c.is_former_name && !c.is_defunct).length;
                                    return (
                                        <SelectItem key={n.id} value={n.id}>
                                            {n.name} ({count} clubs)
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button 
                        onClick={processStability} 
                        disabled={isProcessing}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        {isProcessing ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                        ) : (
                            <><RefreshCw className="w-4 h-4 mr-2" /> Calculate Stability</>
                        )}
                    </Button>
                </div>

                {results && (
                    <div className="space-y-4 pt-4 border-t">
                        <div className="flex items-center gap-2 text-emerald-600">
                            <CheckCircle2 className="w-5 h-5" />
                            <span className="font-medium">Updated {results.updated} clubs</span>
                        </div>

                        {results.atRisk.length > 0 && (
                            <div className="p-4 bg-red-50 rounded-lg">
                                <h4 className="font-semibold text-red-800 flex items-center gap-2 mb-2">
                                    <AlertTriangle className="w-4 h-4" />
                                    Clubs At Risk ({results.atRisk.length})
                                </h4>
                                <div className="space-y-1">
                                    {results.atRisk.slice(0, 10).map(({ club, points, status }) => (
                                        <div key={club.id} className="flex items-center justify-between text-sm">
                                            <span>{club.name}</span>
                                            <Badge className={status.color}>{points} pts</Badge>
                                        </div>
                                    ))}
                                    {results.atRisk.length > 10 && (
                                        <p className="text-xs text-red-600">...and {results.atRisk.length - 10} more</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {results.thriving.length > 0 && (
                            <div className="p-4 bg-emerald-50 rounded-lg">
                                <h4 className="font-semibold text-emerald-800 flex items-center gap-2 mb-2">
                                    <TrendingUp className="w-4 h-4" />
                                    Thriving Clubs ({results.thriving.length})
                                </h4>
                                <div className="space-y-1">
                                    {results.thriving.slice(0, 5).map(({ club, points }) => (
                                        <div key={club.id} className="flex items-center justify-between text-sm">
                                            <span>{club.name}</span>
                                            <Badge className="bg-emerald-500">{points} pts</Badge>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {results.errors.length > 0 && (
                            <div className="p-4 bg-amber-50 rounded-lg">
                                <h4 className="font-semibold text-amber-800 mb-2">Errors ({results.errors.length})</h4>
                                <div className="space-y-1 text-sm text-amber-700">
                                    {results.errors.map((e, i) => (
                                        <div key={i}>{e.club}: {e.error}</div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// Export utility functions for use elsewhere
export { getBaseStabilityByTier, getChampionBonus, getPromotionBonus, getStabilityStatus, calculateClubStability };