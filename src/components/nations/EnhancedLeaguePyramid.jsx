import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Trophy, Shield, Users, ArrowUp, ArrowDown, ChevronRight, Settings, Target, X } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";
import AdminOnly from '@/components/common/AdminOnly';
import PyramidStructureManager from './PyramidStructureManager';

export default function EnhancedLeaguePyramid({ leagues, seasons, clubs, leagueTables = [], nationId }) {
    const [showManager, setShowManager] = useState(false);
    const [hoveredLeague, setHoveredLeague] = useState(null);
    const [selectedPathway, setSelectedPathway] = useState(null);
    const [selectedYear, setSelectedYear] = useState(null);
    const pyramidRef = useRef({});

    // Get all available years
    const availableYears = useMemo(() => {
        if (seasons.length === 0) return [];
        const years = [...new Set(seasons.map(s => s.year))].sort((a, b) => b.localeCompare(a));
        return years;
    }, [seasons]);

    // Initialize to most recent year
    useEffect(() => {
        if (!selectedYear && availableYears.length > 0) {
            setSelectedYear(availableYears[0]);
        }
    }, [availableYears, selectedYear]);

    const pyramidData = useMemo(() => {
        if (!leagues || leagues.length === 0) return { tiers: [], mostRecentYear: null, connections: [], leaguePositions: {} };

        const activeLeagues = leagues.filter(l => l.is_active !== false);
        const displayYear = selectedYear || (seasons.length > 0 
            ? [...seasons].sort((a, b) => b.year.localeCompare(a.year))[0]?.year 
            : null);

        const getLeagueCurrentTier = (league, year) => {
            const leagueSeasons = seasons.filter(s => s.league_id === league.id && (!year || s.year === year));
            if (leagueSeasons.length === 0) return league.tier || 1;
            const sorted = [...leagueSeasons].sort((a, b) => b.year.localeCompare(a.year));
            return sorted[0].tier || league.tier || 1;
        };

        const getLeagueSeasonInfo = (league, year) => {
            const leagueSeasons = seasons.filter(s => s.league_id === league.id && (!year || s.year === year));
            if (leagueSeasons.length === 0) return null;
            
            const sorted = [...leagueSeasons].sort((a, b) => b.year.localeCompare(a.year));
            const targetYear = year || sorted[0]?.year;
            return sorted.filter(s => s.year === targetYear);
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

        const leagueDataMap = {};
        const pyramidByTier = {};
        
        activeLeagues.forEach(league => {
            const currentTier = getLeagueCurrentTier(league, displayYear);
            const seasonInfo = getLeagueSeasonInfo(league, displayYear);
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
            
            const withParent = tierLeagues.filter(l => l.parent_league_id);
            const withoutParent = tierLeagues.filter(l => !l.parent_league_id);
            
            const groupedByParent = {};
            withParent.forEach(league => {
                const parentId = league.parent_league_id;
                if (!groupedByParent[parentId]) {
                    groupedByParent[parentId] = [];
                }
                groupedByParent[parentId].push(league);
            });
            
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
        
        // Build connection data
        const connections = [];
        activeLeagues.forEach(league => {
            if (league.parent_league_id) {
                const parent = leagueDataMap[league.parent_league_id];
                if (parent) {
                    const childData = leagueDataMap[league.id];
                    connections.push({
                        from: league.id,
                        to: league.parent_league_id,
                        fromLeague: childData,
                        toLeague: parent,
                        promotionSpots: childData?.promotionSpots || 0
                    });
                }
            }
        });
        
        return { 
            tiers: positionedTiers,
            mostRecentYear: displayYear,
            connections,
            leagueDataMap
        };
    }, [leagues, seasons, clubs, selectedYear]);

    // Calculate pathway to top from a league
    const getPathwayToTop = (leagueId) => {
        const pathway = [leagueId];
        let currentId = leagueId;
        let iterations = 0;
        
        while (iterations < 10) {
            const league = pyramidData.leagueDataMap[currentId];
            if (!league || !league.parent_league_id || league.tier === 1) break;
            pathway.push(league.parent_league_id);
            currentId = league.parent_league_id;
            iterations++;
        }
        
        return pathway;
    };

    // Get pathway for hovered league
    const highlightedLeagues = useMemo(() => {
        if (!hoveredLeague) return new Set();
        return new Set(getPathwayToTop(hoveredLeague));
    }, [hoveredLeague, pyramidData]);

    // Get feeders (leagues that feed into this one)
    const getFeeders = (leagueId) => {
        return pyramidData.connections
            .filter(conn => conn.to === leagueId)
            .map(conn => conn.from);
    };

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

            {/* Timeline Slider */}
            {availableYears.length > 1 && (
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-4">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-slate-700">Season Timeline</span>
                                <Badge className="bg-emerald-600 text-white">
                                    {selectedYear || pyramidData.mostRecentYear}
                                </Badge>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-xs text-slate-500">{availableYears[availableYears.length - 1]}</span>
                                <Slider
                                    value={[availableYears.indexOf(selectedYear || pyramidData.mostRecentYear)]}
                                    onValueChange={(value) => setSelectedYear(availableYears[value[0]])}
                                    max={availableYears.length - 1}
                                    step={1}
                                    className="flex-1"
                                />
                                <span className="text-xs text-slate-500">{availableYears[0]}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Selected Pathway Display */}
            {selectedPathway && (
                <Card className="border-2 border-emerald-500 shadow-lg">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Target className="w-5 h-5 text-emerald-600" />
                                <span className="font-semibold text-slate-900">Promotion Pathway to Top Flight</span>
                            </div>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setSelectedPathway(null)}
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            {selectedPathway.map((leagueId, idx) => {
                                const league = pyramidData.leagueDataMap[leagueId];
                                return (
                                    <React.Fragment key={leagueId}>
                                        <Link 
                                            to={createPageUrl(`LeagueDetail?id=${leagueId}`)}
                                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:text-emerald-600 transition-colors"
                                        >
                                            {league?.name || 'Unknown'}
                                        </Link>
                                        {idx < selectedPathway.length - 1 && (
                                            <ArrowUp className="w-4 h-4 text-emerald-500" />
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="bg-gradient-to-b from-slate-50 to-white rounded-xl border border-slate-200 overflow-hidden">
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

                <div className="p-6 relative">
                    {pyramidData.tiers.map((tierData, tierIdx) => {
                        const isTopTier = tierData.tier === 1;
                        const nextTier = pyramidData.tiers[tierIdx + 1];
                        const prevTier = pyramidData.tiers[tierIdx - 1];
                        
                        const totalPromotion = tierData.leagues.reduce((sum, l) => sum + (l.promotionSpots || 0), 0);
                        const totalRelegation = prevTier ? prevTier.leagues.reduce((sum, l) => sum + (l.relegationSpots || 0), 0) : 0;
                        const totalRelegationDown = tierData.leagues.reduce((sum, l) => sum + (l.relegationSpots || 0), 0);
                        const totalPromotionUp = nextTier ? nextTier.leagues.reduce((sum, l) => sum + (l.promotionSpots || 0), 0) : 0;
                        
                        return (
                            <div key={tierData.tier} className="relative">
                                {tierIdx > 0 && totalRelegation > 0 && (
                                    <div className="flex justify-center mb-2">
                                        <div className="flex items-center gap-2 px-3 py-1 bg-red-50 rounded-full border border-red-200">
                                            <ArrowDown className="w-4 h-4 text-red-500" />
                                            <span className="text-xs font-semibold text-red-600">{totalRelegation} relegated</span>
                                        </div>
                                    </div>
                                )}
                                
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
                                
                                <div className={`grid gap-3 relative ${
                                    tierData.leagues.length === 1 
                                        ? 'grid-cols-1 max-w-xl mx-auto' 
                                        : tierData.leagues.length === 2 
                                            ? 'grid-cols-2 max-w-2xl mx-auto' 
                                            : tierData.leagues.length === 3
                                                ? 'grid-cols-3'
                                                : 'grid-cols-2 lg:grid-cols-4'
                                }`}>
                                    {/* SVG connections */}
                                    <svg 
                                        className="absolute inset-0 pointer-events-none" 
                                        style={{ width: '100%', height: 'calc(100% + 60px)', overflow: 'visible', top: '-60px' }}
                                    >
                                        <defs>
                                            <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
                                                <polygon points="0 0, 10 5, 0 10" fill="#10b981" />
                                            </marker>
                                        </defs>
                                        {pyramidData.connections
                                            .filter(conn => tierData.leagues.some(l => l.id === conn.from))
                                            .map((conn, connIdx) => {
                                                const fromIdx = tierData.leagues.findIndex(l => l.id === conn.from);
                                                const prevTier = pyramidData.tiers.find(t => t.tier === tierData.tier - 1);
                                                const toIdx = prevTier?.leagues.findIndex(l => l.id === conn.to) ?? -1;
                                                
                                                if (fromIdx === -1 || toIdx === -1 || !prevTier) return null;
                                                
                                                const cols = tierData.leagues.length <= 3 ? tierData.leagues.length : 4;
                                                const parentCols = prevTier.leagues.length <= 3 ? prevTier.leagues.length : 4;
                                                const cardWidth = 100 / cols;
                                                const parentCardWidth = 100 / parentCols;
                                                
                                                const fromX = (fromIdx % cols) * cardWidth + cardWidth / 2;
                                                const toX = (toIdx % parentCols) * parentCardWidth + parentCardWidth / 2;
                                                
                                                const isHighlighted = highlightedLeagues.has(conn.from) && highlightedLeagues.has(conn.to);
                                                
                                                // Bezier curve
                                                const startY = 60;
                                                const endY = -10;
                                                const controlY = (startY + endY) / 2;
                                                
                                                return (
                                                    <g key={connIdx} opacity={isHighlighted ? 1 : 0.3}>
                                                        <path
                                                            d={`M ${fromX},${startY} Q ${(fromX + toX) / 2},${controlY} ${toX},${endY}`}
                                                            stroke={isHighlighted ? "#10b981" : "#94a3b8"}
                                                            strokeWidth={isHighlighted ? "3" : "2"}
                                                            fill="none"
                                                            markerEnd="url(#arrowhead)"
                                                        />
                                                        {conn.promotionSpots > 0 && (
                                                            <text
                                                                x={(fromX + toX) / 2}
                                                                y={controlY - 5}
                                                                textAnchor="middle"
                                                                className="text-xs font-bold"
                                                                fill={isHighlighted ? "#10b981" : "#64748b"}
                                                            >
                                                                {conn.promotionSpots}↑
                                                            </text>
                                                        )}
                                                    </g>
                                                );
                                            })}
                                    </svg>

                                    {tierData.leagues.map((league, idx) => {
                                        const isHighlighted = highlightedLeagues.has(league.id);
                                        const feeders = getFeeders(league.id);
                                        
                                        return (
                                            <div 
                                                key={`${league.id}-${idx}`}
                                                className="block group"
                                                onMouseEnter={() => setHoveredLeague(league.id)}
                                                onMouseLeave={() => setHoveredLeague(null)}
                                                onClick={(e) => {
                                                    if (!isTopTier) {
                                                        e.preventDefault();
                                                        setSelectedPathway(getPathwayToTop(league.id));
                                                    }
                                                }}
                                                ref={(el) => {
                                                    if (el) pyramidRef.current[league.id] = el;
                                                }}
                                            >
                                                <Link to={createPageUrl(`LeagueDetail?id=${league.id}`)}>
                                                    <div className={`relative p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer ${
                                                        isHighlighted 
                                                            ? 'shadow-xl -translate-y-2 border-emerald-500 bg-emerald-50 scale-105' 
                                                            : isTopTier 
                                                                ? 'bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 border-amber-300 group-hover:border-amber-400 group-hover:shadow-lg group-hover:-translate-y-1' 
                                                                : 'bg-white border-slate-200 group-hover:border-slate-300 group-hover:shadow-lg group-hover:-translate-y-1'
                                                    }`}>
                                                        {league.champion && (
                                                            <div className="absolute -top-2 -right-2">
                                                                <div className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-lg">
                                                                    🏆
                                                                </div>
                                                            </div>
                                                        )}

                                                        {feeders.length > 0 && (
                                                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs px-2 py-0.5 rounded-full font-bold shadow-lg">
                                                                {feeders.length} feeder{feeders.length > 1 ? 's' : ''}
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
                                                                <h4 className={`font-bold truncate transition-colors ${
                                                                    isHighlighted ? 'text-emerald-700' : 'text-slate-800 group-hover:text-amber-700'
                                                                }`}>
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
                                                            <ChevronRight className={`w-5 h-5 transition-colors flex-shrink-0 ${
                                                                isHighlighted ? 'text-emerald-500' : 'text-slate-300 group-hover:text-slate-500'
                                                            }`} />
                                                        </div>
                                                        
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
                                            </div>
                                        );
                                    })}
                                </div>
                                
                                {tierIdx < pyramidData.tiers.length - 1 && (
                                    <div className="flex justify-center my-4">
                                        <div className="flex flex-col items-center">
                                            {totalRelegationDown > 0 && (
                                                <div className="flex items-center gap-1 mb-1">
                                                    <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-red-400 to-transparent" />
                                                </div>
                                            )}
                                            
                                            <div className="relative h-8 w-px">
                                                <div className="absolute inset-0 bg-gradient-to-b from-slate-300 via-slate-400 to-slate-300" />
                                                {totalPromotionUp > 0 && (
                                                    <div className="absolute -left-3 top-1/2 -translate-y-1/2">
                                                        <ArrowUp className="w-3 h-3 text-green-500" />
                                                    </div>
                                                )}
                                                {totalRelegationDown > 0 && (
                                                    <div className="absolute -right-3 top-1/2 -translate-y-1/2">
                                                        <ArrowDown className="w-3 h-3 text-red-500" />
                                                    </div>
                                                )}
                                            </div>
                                            
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
                    <span className="flex items-center gap-1">
                        <Target className="w-3 h-3 text-emerald-500" /> Click non-top leagues to see pathway to top
                    </span>
                </div>
            </div>
        </div>
    );
}