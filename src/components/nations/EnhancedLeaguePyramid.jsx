import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Trophy, Shield, Users, ArrowUp, ArrowDown, ChevronRight, Settings } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import AdminOnly from '@/components/common/AdminOnly';
import PyramidStructureManager from './PyramidStructureManager';

export default function EnhancedLeaguePyramid({ leagues, seasons, clubs, leagueTables = [], nationId }) {
    const [showManager, setShowManager] = React.useState(false);
    const pyramidData = useMemo(() => {
        if (!leagues || leagues.length === 0) return { tiers: [], mostRecentYear: null, connections: [] };

        const activeLeagues = leagues.filter(l => l.is_active !== false);
        const mostRecentYear = seasons.length > 0 
            ? [...seasons].sort((a, b) => b.year.localeCompare(a.year))[0]?.year 
            : null;

        const getLeagueCurrentTier = (league) => {
            const leagueSeasons = seasons.filter(s => s.league_id === league.id);
            if (leagueSeasons.length === 0) return league.tier || 1;
            const sorted = [...leagueSeasons].sort((a, b) => b.year.localeCompare(a.year));
            return sorted[0].tier || league.tier || 1;
        };

        const getLeagueSeasonInfo = (league) => {
            const leagueSeasons = seasons.filter(s => s.league_id === league.id);
            if (leagueSeasons.length === 0) return null;
            
            const sorted = [...leagueSeasons].sort((a, b) => b.year.localeCompare(a.year));
            const latestYear = sorted[0]?.year;
            return sorted.filter(s => s.year === latestYear);
        };

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

        // Build league data with positioning info
        const leagueDataMap = {};
        const pyramidByTier = {};
        
        activeLeagues.forEach(league => {
            const currentTier = getLeagueCurrentTier(league);
            const seasonInfo = getLeagueSeasonInfo(league);
            const promoReleg = getPromotionRelegationData(league, seasonInfo);
            const leagueClubs = clubs.filter(c => c.league_id === league.id);
            
            if (!pyramidByTier[currentTier]) {
                pyramidByTier[currentTier] = [];
            }
            
            const season = seasonInfo?.[0];
            const leagueData = {
                ...league,
                displayName: league.name,
                divisionName: null,
                seasonId: season?.id,
                teamCount: season?.number_of_teams || leagueClubs.length,
                champion: season?.champion_name,
                year: season?.year,
                ...promoReleg,
                tier: currentTier
            };
            
            pyramidByTier[currentTier].push(leagueData);
            leagueDataMap[league.id] = leagueData;
        });

        const sortedTiers = Object.keys(pyramidByTier).map(Number).sort((a, b) => a - b);
        
        // Position leagues based on parent relationships
        const positionedTiers = sortedTiers.map(tier => {
            const tierLeagues = pyramidByTier[tier];
            
            // Separate leagues with and without parents
            const withParent = tierLeagues.filter(l => l.parent_league_id);
            const withoutParent = tierLeagues.filter(l => !l.parent_league_id);
            
            // Group leagues by their parent
            const groupedByParent = {};
            withParent.forEach(league => {
                const parentId = league.parent_league_id;
                if (!groupedByParent[parentId]) {
                    groupedByParent[parentId] = [];
                }
                groupedByParent[parentId].push(league);
            });
            
            // Order: place leagues with parents first, grouped together, then independent leagues
            const ordered = [];
            Object.values(groupedByParent).forEach(group => {
                ordered.push(...group);
            });
            ordered.push(...withoutParent);
            
            return {
                tier,
                leagues: ordered
            };
        });
        
        // Build connection data for SVG lines
        const connections = [];
        activeLeagues.forEach(league => {
            if (league.parent_league_id) {
                const parent = leagueDataMap[league.parent_league_id];
                if (parent) {
                    connections.push({
                        from: league.id,
                        to: league.parent_league_id,
                        fromLeague: league,
                        toLeague: parent
                    });
                }
            }
        });
        
        return { 
            tiers: positionedTiers,
            mostRecentYear,
            connections
        };
    }, [leagues, seasons, clubs]);

    if (pyramidData.tiers.length === 0) return null;

    return (
        <div className="space-y-6">
            <AdminOnly>
                {!showManager ? (
                    <Button onClick={() => setShowManager(true)} variant="outline" size="sm">
                        <Settings className="w-4 h-4 mr-2" />
                        Manage Pyramid Structure
                    </Button>
                ) : (
                    <div>
                        <Button onClick={() => setShowManager(false)} variant="outline" size="sm" className="mb-4">
                            Hide Manager
                        </Button>
                        <PyramidStructureManager leagues={leagues} nationId={nationId} />
                    </div>
                )}
            </AdminOnly>

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

            {/* Pyramid with SVG connections */}
            <div className="p-6 relative">
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
                            <div className={`grid gap-3 relative ${
                                tierData.leagues.length === 1 
                                    ? 'grid-cols-1 max-w-xl mx-auto' 
                                    : tierData.leagues.length === 2 
                                        ? 'grid-cols-2 max-w-2xl mx-auto' 
                                        : tierData.leagues.length === 3
                                            ? 'grid-cols-3'
                                            : 'grid-cols-2 lg:grid-cols-4'
                            }`}>
                                {/* SVG Layer for connections within tier */}
                                <svg 
                                    className="absolute inset-0 pointer-events-none -z-10" 
                                    style={{ width: '100%', height: '100%', overflow: 'visible' }}
                                >
                                    {pyramidData.connections
                                        .filter(conn => {
                                            const fromLeague = tierData.leagues.find(l => l.id === conn.from);
                                            const toTier = pyramidData.tiers.find(t => t.leagues.some(l => l.id === conn.to));
                                            return fromLeague && toTier && toTier.tier === tierData.tier - 1;
                                        })
                                        .map((conn, connIdx) => {
                                            const fromIdx = tierData.leagues.findIndex(l => l.id === conn.from);
                                            const prevTier = pyramidData.tiers.find(t => t.tier === tierData.tier - 1);
                                            const toIdx = prevTier?.leagues.findIndex(l => l.id === conn.to) ?? -1;
                                            
                                            if (fromIdx === -1 || toIdx === -1) return null;
                                            
                                            // Calculate positions (rough estimation)
                                            const cols = tierData.leagues.length <= 3 ? tierData.leagues.length : 4;
                                            const cardWidth = 100 / cols;
                                            const fromX = (fromIdx % cols) * cardWidth + cardWidth / 2;
                                            
                                            return (
                                                <g key={connIdx}>
                                                    <line
                                                        x1={`${fromX}%`}
                                                        y1="0"
                                                        x2={`${fromX}%`}
                                                        y2="-40"
                                                        stroke="#10b981"
                                                        strokeWidth="2"
                                                        strokeDasharray="4 2"
                                                    />
                                                    <circle
                                                        cx={`${fromX}%`}
                                                        cy="-40"
                                                        r="4"
                                                        fill="#10b981"
                                                    />
                                                </g>
                                            );
                                        })}
                                </svg>

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

                                            {/* Connection indicator */}
                                            {league.parent_league_id && (() => {
                                                const parent = leagues.find(l => l.id === league.parent_league_id);
                                                return parent ? (
                                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-0.5 h-3 bg-emerald-400" />
                                                ) : null;
                                            })()}

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
        </div>
    );
}