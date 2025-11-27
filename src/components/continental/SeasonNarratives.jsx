import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Flame, Trophy, Swords, Users, RefreshCw, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SeasonNarratives({ matches, season, allMatches, allSeasons, clubs }) {
    if (!matches || matches.length === 0) return null;

    const narratives = [];

    // Find rematches from previous seasons
    const previousMatches = allMatches.filter(m => {
        const mSeason = allSeasons.find(s => s.id === m.season_id);
        return mSeason && mSeason.year < season.year;
    });

    matches.forEach(match => {
        const pairKey = [match.home_club_name, match.away_club_name].sort().join('|');
        
        // Check for previous meetings
        const previousMeetings = previousMatches.filter(pm => {
            const pmPair = [pm.home_club_name, pm.away_club_name].sort().join('|');
            return pmPair === pairKey;
        });

        if (previousMeetings.length > 0) {
            const finalMeetings = previousMeetings.filter(pm => pm.round === 'Final');
            const semiMeetings = previousMeetings.filter(pm => pm.round?.includes('Semi'));
            
            if (finalMeetings.length > 0) {
                const lastFinal = finalMeetings.sort((a, b) => {
                    const aSeason = allSeasons.find(s => s.id === a.season_id);
                    const bSeason = allSeasons.find(s => s.id === b.season_id);
                    return (bSeason?.year || '').localeCompare(aSeason?.year || '');
                })[0];
                const lastFinalSeason = allSeasons.find(s => s.id === lastFinal?.season_id);
                
                narratives.push({
                    type: 'final_rematch',
                    icon: Trophy,
                    color: 'text-amber-600',
                    bgColor: 'bg-amber-50',
                    match,
                    title: 'Final Rematch',
                    description: `${match.home_club_name} and ${match.away_club_name} meet again! They previously contested the ${lastFinalSeason?.year} final.`,
                    importance: 100,
                });
            } else if (previousMeetings.length >= 3) {
                narratives.push({
                    type: 'frequent_opponents',
                    icon: RefreshCw,
                    color: 'text-purple-600',
                    bgColor: 'bg-purple-50',
                    match,
                    title: 'Familiar Foes',
                    description: `${match.home_club_name} and ${match.away_club_name} meet for the ${previousMeetings.length + 1}th time in continental competition.`,
                    importance: 50 + previousMeetings.length * 5,
                });
            } else if (semiMeetings.length > 0) {
                narratives.push({
                    type: 'semi_rematch',
                    icon: Swords,
                    color: 'text-indigo-600',
                    bgColor: 'bg-indigo-50',
                    match,
                    title: 'Semi-Final Rematch',
                    description: `${match.home_club_name} and ${match.away_club_name} previously met at the semi-final stage.`,
                    importance: 70,
                });
            }
        }

        // Same country clash
        if (match.home_club_nation === match.away_club_nation && match.home_club_nation) {
            const roundImportance = match.round === 'Final' ? 100 : match.round?.includes('Semi') ? 70 : match.round?.includes('Quarter') ? 50 : 30;
            narratives.push({
                type: 'domestic_clash',
                icon: Users,
                color: 'text-blue-600',
                bgColor: 'bg-blue-50',
                match,
                title: 'Domestic Clash',
                description: `Two clubs from ${match.home_club_nation} face off${match.round === 'Final' ? ' in the final!' : match.round?.includes('Semi') ? ' in the semi-finals!' : '.'}`,
                importance: roundImportance,
            });
        }

        // Check for club rivalries
        const homeClub = clubs.find(c => c.name === match.home_club_name);
        const awayClub = clubs.find(c => c.name === match.away_club_name);
        
        if (homeClub?.rival_club_ids?.includes(awayClub?.id) || awayClub?.rival_club_ids?.includes(homeClub?.id)) {
            narratives.push({
                type: 'rivals_meet',
                icon: Flame,
                color: 'text-red-600',
                bgColor: 'bg-red-50',
                match,
                title: 'Rivals Collide!',
                description: `Bitter rivals ${match.home_club_name} and ${match.away_club_name} face off on the continental stage!`,
                importance: 90,
            });
        }
    });

    // Check for potential title defense
    const previousSeasons = allSeasons.filter(s => s.year < season.year && s.competition_id === season.competition_id);
    const lastSeason = previousSeasons.sort((a, b) => b.year.localeCompare(a.year))[0];
    
    if (lastSeason?.champion_name) {
        const defenderMatches = matches.filter(m => 
            m.home_club_name === lastSeason.champion_name || m.away_club_name === lastSeason.champion_name
        );
        
        if (defenderMatches.length > 0) {
            const latestRound = defenderMatches.sort((a, b) => {
                const order = ['Final', 'Semi-final', 'Semi-finals', 'Quarter-final', 'Quarter-finals', 'Round of 16', 'Round 1', 'Round of 32'];
                return order.indexOf(a.round) - order.indexOf(b.round);
            })[0];

            if (latestRound.round === 'Final') {
                narratives.push({
                    type: 'title_defense',
                    icon: Star,
                    color: 'text-amber-600',
                    bgColor: 'bg-amber-50',
                    match: latestRound,
                    title: 'Title Defense',
                    description: `Defending champions ${lastSeason.champion_name} have reached the final as they seek back-to-back titles!`,
                    importance: 95,
                });
            }
        }
    }

    // Sort by importance
    const sortedNarratives = narratives.sort((a, b) => b.importance - a.importance).slice(0, 6);

    if (sortedNarratives.length === 0) return null;

    return (
        <Card className="border-0 shadow-sm mb-6">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Flame className="w-5 h-5 text-orange-500" />
                    Season Storylines
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sortedNarratives.map((narrative, idx) => (
                        <div key={idx} className={`p-4 rounded-lg ${narrative.bgColor} border border-slate-200`}>
                            <div className="flex items-start gap-3">
                                <narrative.icon className={`w-5 h-5 ${narrative.color} mt-0.5`} />
                                <div>
                                    <div className="font-semibold text-slate-800">{narrative.title}</div>
                                    <p className="text-sm text-slate-600 mt-1">{narrative.description}</p>
                                    <Badge variant="outline" className="mt-2 text-xs">
                                        {narrative.match.round}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}