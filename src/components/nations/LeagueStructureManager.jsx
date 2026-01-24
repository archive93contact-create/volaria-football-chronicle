import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Plus, Trophy, ChevronDown, ChevronUp, Edit2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import AdminOnly from '@/components/common/AdminOnly';

export default function LeagueStructureManager({ leagues = [], seasons = [], clubs = [], nationId }) {
    // Filter out youth and reserve leagues - only manage professional leagues
    const professionalLeagues = leagues.filter(l => l.league_type !== 'youth' && l.league_type !== 'reserve');
    
    // Group professional leagues by tier
    const leaguesByTier = useMemo(() => {
        return professionalLeagues.reduce((acc, league) => {
            const tier = league.tier || 1;
            if (!acc[tier]) acc[tier] = [];
            acc[tier].push(league);
            return acc;
        }, {});
    }, [professionalLeagues]);

    // Calculate which leagues are active (have recent season data and not defunct)
    const leagueActivity = useMemo(() => {
        const activity = {};
        const allYears = seasons.map(s => parseInt(s.year.split('-')[0])).filter(Boolean);
        const mostRecentYear = allYears.length > 0 ? Math.max(...allYears) : null;
        
        professionalLeagues.forEach(league => {
            const leagueSeasons = seasons.filter(s => s.league_id === league.id);
            const hasRecentData = leagueSeasons.length > 0;
            const latestYear = leagueSeasons.length > 0 
                ? Math.max(...leagueSeasons.map(s => parseInt(s.year.split('-')[0])))
                : null;
            
            // Consider inactive if: no data, or data is old (>5 years behind most recent), or marked as defunct
            const isDefunct = league.is_active === false;
            const isStale = mostRecentYear && latestYear && (mostRecentYear - latestYear > 5);
            
            activity[league.id] = {
                isActive: hasRecentData && !isDefunct && !isStale,
                latestYear,
                seasonCount: leagueSeasons.length,
                isDefunct,
                isStale
            };
        });
        return activity;
    }, [professionalLeagues, seasons]);

    // Track open/closed tiers
    const [openTiers, setOpenTiers] = useState(() => {
        // Default to opening tier 1
        return { 1: true };
    });

    const toggleTier = (tier) => {
        setOpenTiers(prev => ({ ...prev, [tier]: !prev[tier] }));
    };

    // Group leagues by governing body within each tier
    const getLeaguesByGoverningBody = (tierLeagues) => {
        const grouped = {};
        tierLeagues.forEach(league => {
            const body = league.governing_body || 'Independent';
            if (!grouped[body]) grouped[body] = [];
            grouped[body].push(league);
        });
        return grouped;
    };

    if (professionalLeagues.length === 0) {
        return (
            <Card className="border-dashed border-2 border-slate-300">
                <CardContent className="flex flex-col items-center justify-center py-12">
                    <Trophy className="w-12 h-12 text-slate-300 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">No Leagues Yet</h3>
                    <p className="text-slate-500 mb-4">Start building the league structure</p>
                    <AdminOnly>
                        <Link to={createPageUrl(`AddLeague?nation_id=${nationId}`)}>
                            <Button>Add First League</Button>
                        </Link>
                    </AdminOnly>
                </CardContent>
            </Card>
        );
    }

    const sortedTiers = Object.keys(leaguesByTier).sort((a, b) => parseInt(a) - parseInt(b));

    return (
        <div className="space-y-3">
            {sortedTiers.map(tier => {
                const tierLeagues = leaguesByTier[tier];
                const isOpen = openTiers[tier];
                const activeTierLeagues = tierLeagues.filter(l => leagueActivity[l.id]?.isActive);
                const leaguesByBody = getLeaguesByGoverningBody(tierLeagues);

                return (
                    <Collapsible key={tier} open={isOpen} onOpenChange={() => toggleTier(tier)}>
                        <Card className="border-0 shadow-sm">
                            <CollapsibleTrigger className="w-full">
                                <div className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tier === '1' ? 'bg-amber-100' : 'bg-slate-100'}`}>
                                            <Trophy className={`w-5 h-5 ${tier === '1' ? 'text-amber-600' : 'text-slate-600'}`} />
                                        </div>
                                        <div className="text-left">
                                            <h3 className="font-bold text-slate-900">
                                                {tier === '1' ? 'Top Division' : `Tier ${tier}`}
                                            </h3>
                                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                                <span>{tierLeagues.length} {tierLeagues.length === 1 ? 'league' : 'leagues'}</span>
                                                <span>•</span>
                                                <span className="flex items-center gap-1">
                                                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                                                    {activeTierLeagues.length} active
                                                </span>
                                                {activeTierLeagues.length !== tierLeagues.length && (
                                                    <>
                                                        <span>•</span>
                                                        <span className="flex items-center gap-1 text-slate-400">
                                                            <AlertCircle className="w-3 h-3" />
                                                            {tierLeagues.length - activeTierLeagues.length} inactive
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <AdminOnly>
                                            <Link to={createPageUrl(`AddLeague?nation_id=${nationId}&tier=${tier}`)}>
                                                <Button size="sm" variant="outline" onClick={(e) => e.stopPropagation()}>
                                                    <Plus className="w-4 h-4 mr-1" />
                                                    Add
                                                </Button>
                                            </Link>
                                        </AdminOnly>
                                        {isOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                                    </div>
                                </div>
                            </CollapsibleTrigger>

                            <CollapsibleContent>
                                <div className="px-4 pb-4 space-y-4">
                                    {Object.entries(leaguesByBody).map(([body, bodyLeagues]) => (
                                        <div key={body}>
                                            {Object.keys(leaguesByBody).length > 1 && (
                                                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                                                    <div className="h-px flex-1 bg-slate-200" />
                                                    {body}
                                                    <div className="h-px flex-1 bg-slate-200" />
                                                </div>
                                            )}
                                            <div className="space-y-2">
                                                {bodyLeagues.map(league => {
                                                    const activity = leagueActivity[league.id];
                                                    const leagueClubs = clubs.filter(c => c.league_id === league.id && !c.is_defunct);
                                                    const isActive = activity?.isActive;
                                                    const isDefunct = activity?.isDefunct;
                                                    const isStale = activity?.isStale;

                                                    return (
                                                        <div 
                                                            key={league.id}
                                                            className={`p-3 rounded-lg border transition-all ${
                                                                isActive 
                                                                    ? 'bg-white border-slate-200 hover:border-emerald-300' 
                                                                    : 'bg-slate-50 border-slate-200 opacity-50 grayscale'
                                                            }`}
                                                        >
                                                            <Link 
                                                                to={createPageUrl(`LeagueDetail?id=${league.id}`)}
                                                                className="flex items-center gap-3"
                                                            >
                                                                {league.logo_url ? (
                                                                    <img 
                                                                        src={league.logo_url} 
                                                                        alt={league.name}
                                                                        className="w-12 h-12 object-contain rounded-lg bg-slate-100 p-2"
                                                                    />
                                                                ) : (
                                                                    <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center">
                                                                        <Trophy className="w-5 h-5 text-slate-400" />
                                                                    </div>
                                                                )}
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2">
                                                                        <h4 className="font-bold text-slate-900 truncate">{league.name}</h4>
                                                                        {isDefunct && (
                                                                            <Badge variant="outline" className="text-xs bg-red-50 text-red-600 border-red-200">
                                                                                Defunct
                                                                            </Badge>
                                                                        )}
                                                                        {!isActive && !isDefunct && (
                                                                            <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                                                                                {isStale ? 'Dormant' : 'No Data'}
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                                                                        <span>{leagueClubs.length} clubs</span>
                                                                        {activity?.seasonCount > 0 && (
                                                                            <>
                                                                                <span>•</span>
                                                                                <span>{activity.seasonCount} seasons</span>
                                                                                {activity.latestYear && (
                                                                                    <>
                                                                                        <span>•</span>
                                                                                        <span>Latest: {activity.latestYear}</span>
                                                                                    </>
                                                                                )}
                                                                            </>
                                                                        )}
                                                                        {league.current_champion && (
                                                                            <>
                                                                                <span>•</span>
                                                                                <span className="text-emerald-600 font-medium">
                                                                                    🏆 {league.current_champion}
                                                                                </span>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                    {league.inactivity_reason && (
                                                                        <div className="mt-2 text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded inline-block">
                                                                            <AlertCircle className="w-3 h-3 inline mr-1" />
                                                                            {league.inactivity_reason}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <AdminOnly>
                                                                    <Link 
                                                                        to={createPageUrl(`LeagueDetail?id=${league.id}`)}
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    >
                                                                        <Button size="sm" variant="ghost">
                                                                            <Edit2 className="w-4 h-4" />
                                                                        </Button>
                                                                    </Link>
                                                                </AdminOnly>
                                                            </Link>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CollapsibleContent>
                        </Card>
                    </Collapsible>
                );
            })}
        </div>
    );
}