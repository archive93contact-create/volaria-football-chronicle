import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Trophy, Shield, Users, ArrowUp, ArrowDown, ChevronRight } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

export default function EnhancedLeaguePyramid({ leagues, seasons, clubs, leagueTables = [] }) {
    const pyramidData = useMemo(() => {
        if (!leagues || leagues.length === 0) return { tiers: [], mostRecentYear: null };

        // Find most recent season year overall
        const mostRecentYear = seasons.length > 0 
            ? [...seasons].sort((a, b) => b.year.localeCompare(a.year))[0]?.year 
            : null;

        // Get current tier for each league
        const getLeagueCurrentTier = (league) => {
            const leagueSeasons = seasons.filter(s => s.league_id === league.id);
            if (leagueSeasons.length === 0) return league.tier || 1;
            const sorted = [...leagueSeasons].sort((a, b) => b.year.localeCompare(a.year));
            return sorted[0].tier || league.tier || 1;
        };

        // Get season info for most recent year
        const getLeagueSeasonInfo = (league) => {
            const leagueSeasons = seasons.filter(s => s.league_id === league.id);
            if (leagueSeasons.length === 0) return null;
            
            const sorted = [...leagueSeasons].sort((a, b) => b.year.localeCompare(a.year));
            const latestYear = sorted[0]?.year;
            return sorted.filter(s => s.year === latestYear);
        };

        // Get promotion/relegation data from latest season
        const getPromotionRelegationData = (league, seasonInfo) => {
            if (!seasonInfo || seasonInfo.length === 0) return { promoted: [], relegated: [], promotionSpots: 0, relegationSpots: 0 };
            
            const season = seasonInfo[0];
            const promoted = season.promoted_teams?.split(',').map(t => t.trim()).filter(Boolean) || [];
            const relegated = season.relegated_teams?.split(',').map(t => t.trim()).filter(Boolean) || [];
            
            return {
                promoted,
                relegated,
                promotionSpots: season.promotion_spots || promoted.length,
                relegationSpots: season.relegation_spots || relegated.length,
                playoffWinner: season.playoff_winner
            };
        };

        // Build pyramid structure
        const pyramidByTier = {};
        
        leagues.forEach(league => {
            const currentTier = getLeagueCurrentTier(league);
            const seasonInfo = getLeagueSeasonInfo(league);
            const promoReleg = getPromotionRelegationData(league, seasonInfo);
            const leagueClubs = clubs.filter(c => c.league_id === league.id);
            
            if (!pyramidByTier[currentTier]) {
                pyramidByTier[currentTier] = [];
            }
            
            // Handle multiple divisions at same tier
            if (seasonInfo && seasonInfo.length > 1) {
                seasonInfo.forEach(div => {
                    pyramidByTier[currentTier].push({
                        ...league,
                        displayName: div.division_name ? `${league.name} ${div.division_name}` : league.name,
                        divisionName: div.division_name,
                        seasonId: div.id,
                        teamCount: div.number_of_teams || leagueClubs.length,
                        champion: div.champion_name,
                        year: div.year,
                        ...getPromotionRelegationData(league, [div])
                    });
                });
            } else {
                const season = seasonInfo?.[0];
                pyramidByTier[currentTier].push({
                    ...league,
                    displayName: league.name,
                    divisionName: null,
                    seasonId: season?.id,
                    teamCount: season?.number_of_teams || leagueClubs.length,
                    champion: season?.champion_name,
                    year: season?.year,
                    ...promoReleg
                });
            }
        });

        const sortedTiers = Object.keys(pyramidByTier).map(Number).sort((a, b) => a - b);
        
        return { 
            tiers: sortedTiers.map(tier => ({
                tier,
                leagues: pyramidByTier[tier]
            })),
            mostRecentYear
        };
    }, [leagues, seasons, clubs]);

    if (pyramidData.tiers.length === 0) return null;

    const maxLeaguesInTier = Math.max(...pyramidData.tiers.map(t => t.leagues.length));

    return (
        <div className="bg-gradient-to-b from-slate-50 to-white rounded-xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="bg-slate-800 text-white px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Trophy className="w-6 h-6 text-amber-400" />
                    <h2 className="text-xl font-bold">League Pyramid</h2>
                </div>
                {pyramidData.mostRecentYear && (
                    <Badge className="bg-white/20 text-white border-0">
                        {pyramidData.mostRecentYear} Season
                    </Badge>
                )}
            </div>

            {/* Pyramid */}
            <div className="p-6">
                {pyramidData.tiers.map((tierData, tierIdx) => {
                    const isTopTier = tierData.tier === 1;
                    const nextTier = pyramidData.tiers[tierIdx + 1];
                    const prevTier = pyramidData.tiers[tierIdx - 1];
                    
                    // Calculate total promotion from this tier and relegation to this tier
                    const totalPromotion = tierData.leagues.reduce((sum, l) => sum + (l.promotionSpots || 0), 0);
                    const totalRelegation = prevTier ? prevTier.leagues.reduce((sum, l) => sum + (l.relegationSpots || 0), 0) : 0;
                    
                    // Calculate relegation from this tier and promotion to this tier
                    const totalRelegationDown = tierData.leagues.reduce((sum, l) => sum + (l.relegationSpots || 0), 0);
                    const totalPromotionUp = nextTier ? nextTier.leagues.reduce((sum, l) => sum + (l.promotionSpots || 0), 0) : 0;
                    
                    return (
                        <div key={tierData.tier} className="relative">
                            {/* Incoming arrows from tier above (relegation coming down) */}
                            {tierIdx > 0 && totalRelegation > 0 && (
                                <div className="flex justify-center mb-2">
                                    <div className="flex items-center gap-2 px-3 py-1 bg-red-50 rounded-full border border-red-200">
                                        <ArrowDown className="w-4 h-4 text-red-500" />
                                        <span className="text-xs font-semibold text-red-600">{totalRelegation} relegated</span>
                                    </div>
                                </div>
                            )}
                            
                            {/* Tier Label */}
                            <div className="flex items-center gap-3 mb-3">
                                <div className={`px-3 py-1.5 rounded-lg font-bold text-sm ${
                                    isTopTier 
                                        ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-lg shadow-amber-200' 
                                        : 'bg-slate-200 text-slate-700'
                                }`}>
                                    {isTopTier ? '★ Top Division' : `Tier ${tierData.tier}`}
                                </div>
                                <div className="flex-1 h-px bg-gradient-to-r from-slate-300 to-transparent" />
                                <span className="text-sm text-slate-500 font-medium">
                                    {tierData.leagues.reduce((sum, l) => sum + (l.teamCount || 0), 0)} clubs
                                </span>
                            </div>
                            
                            {/* Leagues Grid */}
                            <div className={`grid gap-3 ${
                                tierData.leagues.length === 1 
                                    ? 'grid-cols-1 max-w-xl mx-auto' 
                                    : tierData.leagues.length === 2 
                                        ? 'grid-cols-2 max-w-2xl mx-auto' 
                                        : tierData.leagues.length === 3
                                            ? 'grid-cols-3'
                                            : 'grid-cols-2 lg:grid-cols-4'
                            }`}>
                                {tierData.leagues.map((league, idx) => (
                                    <Link 
                                        key={`${league.id}-${idx}`}
                                        to={createPageUrl(`LeagueDetail?id=${league.id}`)}
                                        className="block group"
                                    >
                                        <div className={`relative p-4 rounded-xl border-2 transition-all duration-300 group-hover:shadow-lg group-hover:-translate-y-1 ${
                                            isTopTier 
                                                ? 'bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 border-amber-300 group-hover:border-amber-400' 
                                                : 'bg-white border-slate-200 group-hover:border-slate-300'
                                        }`}>
                                            {/* Champion badge */}
                                            {league.champion && (
                                                <div className="absolute -top-2 -right-2">
                                                    <div className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-lg">
                                                        🏆
                                                    </div>
                                                </div>
                                            )}
                                            
                                            <div className="flex items-start gap-3">
                                                {league.logo_url ? (
                                                    <img 
                                                        src={league.logo_url} 
                                                        alt={league.name}
                                                        className="w-12 h-12 object-contain rounded-lg bg-white p-1 border border-slate-100"
                                                    />
                                                ) : (
                                                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                                                        isTopTier ? 'bg-amber-200' : 'bg-slate-100'
                                                    }`}>
                                                        <Trophy className={`w-6 h-6 ${
                                                            isTopTier ? 'text-amber-600' : 'text-slate-400'
                                                        }`} />
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-bold text-slate-800 truncate group-hover:text-amber-700 transition-colors">
                                                        {league.displayName}
                                                    </h4>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="flex items-center gap-1 text-xs text-slate-500">
                                                            <Users className="w-3 h-3" />
                                                            {league.teamCount || '?'}
                                                        </span>
                                                    </div>
                                                    {league.champion && (
                                                        <p className="text-xs text-emerald-600 font-medium mt-1 truncate">
                                                            Champion: {league.champion}
                                                        </p>
                                                    )}
                                                </div>
                                                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-500 transition-colors flex-shrink-0" />
                                            </div>
                                            
                                            {/* Promotion/Relegation indicators */}
                                            {(league.promotionSpots > 0 || league.relegationSpots > 0) && (
                                                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                                                    {league.promotionSpots > 0 && !isTopTier && (
                                                        <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                                                            <ArrowUp className="w-3 h-3" />
                                                            {league.promotionSpots}↑
                                                        </span>
                                                    )}
                                                    {league.playoffWinner && (
                                                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                                                            +PO
                                                        </span>
                                                    )}
                                                    {league.relegationSpots > 0 && (
                                                        <span className="flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                                                            <ArrowDown className="w-3 h-3" />
                                                            {league.relegationSpots}↓
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </Link>
                                ))}
                            </div>
                            
                            {/* Connection to next tier */}
                            {tierIdx < pyramidData.tiers.length - 1 && (
                                <div className="flex justify-center my-4">
                                    <div className="flex flex-col items-center">
                                        {/* Relegation going down */}
                                        {totalRelegationDown > 0 && (
                                            <div className="flex items-center gap-1 mb-1">
                                                <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-red-400 to-transparent" />
                                            </div>
                                        )}
                                        
                                        {/* Vertical connector */}
                                        <div className="relative h-8 w-px">
                                            <div className="absolute inset-0 bg-gradient-to-b from-slate-300 via-slate-400 to-slate-300" />
                                            {/* Promotion arrow going up */}
                                            {totalPromotionUp > 0 && (
                                                <div className="absolute -left-3 top-1/2 -translate-y-1/2">
                                                    <ArrowUp className="w-3 h-3 text-green-500" />
                                                </div>
                                            )}
                                            {/* Relegation arrow going down */}
                                            {totalRelegationDown > 0 && (
                                                <div className="absolute -right-3 top-1/2 -translate-y-1/2">
                                                    <ArrowDown className="w-3 h-3 text-red-500" />
                                                </div>
                                            )}
                                        </div>
                                        
                                        {/* Promotion coming up */}
                                        {totalPromotionUp > 0 && (
                                            <div className="flex items-center gap-1 mt-1">
                                                <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-green-400 to-transparent" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            
            {/* Legend */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                    <ArrowUp className="w-3 h-3 text-green-500" /> Promotion
                </span>
                <span className="flex items-center gap-1">
                    <ArrowDown className="w-3 h-3 text-red-500" /> Relegation
                </span>
                <span className="flex items-center gap-1">
                    <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-xs">+PO</span> Playoff promotion
                </span>
            </div>
        </div>
    );
}