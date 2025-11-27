import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Trophy, Shield, ChevronRight, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function LeaguePyramid({ leagues, seasons, clubs }) {
    if (!leagues || leagues.length === 0) return null;

    // Find most recent season for each league to get current tier
    const getLeagueCurrentTier = (league) => {
        const leagueSeasons = seasons.filter(s => s.league_id === league.id);
        if (leagueSeasons.length === 0) return league.tier || 1;
        
        // Sort by year descending
        const sorted = [...leagueSeasons].sort((a, b) => b.year.localeCompare(a.year));
        const mostRecent = sorted[0];
        
        // Use season tier override if exists, otherwise league tier
        return mostRecent.tier || league.tier || 1;
    };

    // Find most recent season year overall
    const mostRecentYear = seasons.length > 0 
        ? [...seasons].sort((a, b) => b.year.localeCompare(a.year))[0]?.year 
        : null;

    // Get division info for most recent season
    const getLeagueDivisionInfo = (league) => {
        const leagueSeasons = seasons.filter(s => s.league_id === league.id && s.year === mostRecentYear);
        if (leagueSeasons.length === 0) {
            // Check if there are any seasons for this league at all
            const allLeagueSeasons = seasons.filter(s => s.league_id === league.id);
            if (allLeagueSeasons.length > 0) {
                const sorted = [...allLeagueSeasons].sort((a, b) => b.year.localeCompare(a.year));
                return {
                    divisions: sorted.filter(s => s.year === sorted[0].year),
                    year: sorted[0].year
                };
            }
            return { divisions: [], year: null };
        }
        return { divisions: leagueSeasons, year: mostRecentYear };
    };

    // Build pyramid structure based on current tiers
    const pyramidByTier = {};
    
    leagues.forEach(league => {
        const currentTier = getLeagueCurrentTier(league);
        const divisionInfo = getLeagueDivisionInfo(league);
        const leagueClubs = clubs.filter(c => c.league_id === league.id);
        
        if (!pyramidByTier[currentTier]) {
            pyramidByTier[currentTier] = [];
        }
        
        // If league has multiple divisions in current season
        if (divisionInfo.divisions.length > 1) {
            divisionInfo.divisions.forEach(div => {
                pyramidByTier[currentTier].push({
                    ...league,
                    displayName: div.division_name ? `${league.name} ${div.division_name}` : league.name,
                    divisionName: div.division_name,
                    seasonId: div.id,
                    teamCount: div.number_of_teams || leagueClubs.length,
                    champion: div.champion_name,
                    year: divisionInfo.year
                });
            });
        } else {
            const season = divisionInfo.divisions[0];
            pyramidByTier[currentTier].push({
                ...league,
                displayName: league.name,
                divisionName: null,
                seasonId: season?.id,
                teamCount: season?.number_of_teams || leagueClubs.length,
                champion: season?.champion_name,
                year: divisionInfo.year
            });
        }
    });

    const sortedTiers = Object.keys(pyramidByTier).map(Number).sort((a, b) => a - b);
    const maxWidth = Math.max(...sortedTiers.map(t => pyramidByTier[t].length));

    return (
        <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-amber-500" />
                        League Pyramid
                    </CardTitle>
                    {mostRecentYear && (
                        <Badge variant="outline" className="text-xs">
                            {mostRecentYear}
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {sortedTiers.map((tier, tierIdx) => {
                        const tierLeagues = pyramidByTier[tier];
                        const isTopTier = tier === 1;
                        
                        return (
                            <div key={tier} className="relative">
                                {/* Tier label */}
                                <div className="flex items-center gap-2 mb-2">
                                    <div className={`text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded ${
                                        isTopTier 
                                            ? 'bg-amber-100 text-amber-700' 
                                            : 'bg-slate-100 text-slate-600'
                                    }`}>
                                        {isTopTier ? 'Top Division' : `Tier ${tier}`}
                                    </div>
                                    <div className="flex-1 h-px bg-slate-200" />
                                    <span className="text-xs text-slate-400">
                                        {tierLeagues.reduce((sum, l) => sum + (l.teamCount || 0), 0)} clubs
                                    </span>
                                </div>
                                
                                {/* Leagues at this tier */}
                                <div className={`grid gap-2 ${
                                    tierLeagues.length === 1 
                                        ? 'grid-cols-1' 
                                        : tierLeagues.length === 2 
                                            ? 'grid-cols-2' 
                                            : tierLeagues.length === 3
                                                ? 'grid-cols-3'
                                                : 'grid-cols-2 lg:grid-cols-4'
                                }`}>
                                    {tierLeagues.map((league, idx) => (
                                        <Link 
                                            key={`${league.id}-${idx}`}
                                            to={createPageUrl(`LeagueDetail?id=${league.id}`)}
                                            className="block"
                                        >
                                            <div className={`p-3 rounded-lg border transition-all hover:shadow-md hover:-translate-y-0.5 ${
                                                isTopTier 
                                                    ? 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200 hover:border-amber-300' 
                                                    : 'bg-white border-slate-200 hover:border-slate-300'
                                            }`}>
                                                <div className="flex items-center gap-2">
                                                    {league.logo_url ? (
                                                        <img 
                                                            src={league.logo_url} 
                                                            alt={league.name}
                                                            className="w-8 h-8 object-contain"
                                                        />
                                                    ) : (
                                                        <div className={`w-8 h-8 rounded flex items-center justify-center ${
                                                            isTopTier ? 'bg-amber-200' : 'bg-slate-200'
                                                        }`}>
                                                            <Trophy className={`w-4 h-4 ${
                                                                isTopTier ? 'text-amber-600' : 'text-slate-500'
                                                            }`} />
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-medium text-sm truncate">
                                                            {league.displayName}
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                                            <span className="flex items-center gap-0.5">
                                                                <Users className="w-3 h-3" />
                                                                {league.teamCount || '?'}
                                                            </span>
                                                            {league.champion && (
                                                                <span className="text-emerald-600 truncate">
                                                                    🏆 {league.champion}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                                
                                {/* Connection lines to next tier */}
                                {tierIdx < sortedTiers.length - 1 && (
                                    <div className="flex justify-center my-2">
                                        <div className="w-px h-4 bg-slate-300" />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
                
                {sortedTiers.length === 0 && (
                    <p className="text-slate-500 text-sm text-center py-4">
                        No league structure data available
                    </p>
                )}
            </CardContent>
        </Card>
    );
}