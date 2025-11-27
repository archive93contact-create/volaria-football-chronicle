import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Swords, MapPin, Trophy, Calendar, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Badge } from "@/components/ui/badge";

export default function RivalryTracker({ club, allClubs = [], allLeagueTables = [] }) {
    // Fetch continental data for continental rivalries
    const { data: continentalMatches = [] } = useQuery({
        queryKey: ['continentalMatchesForRivalry'],
        queryFn: () => base44.entities.ContinentalMatch.list(),
        enabled: !!club?.id,
    });

    const { data: nations = [] } = useQuery({
        queryKey: ['nationsForRivalry'],
        queryFn: () => base44.entities.Nation.list(),
    });

    // Fetch ALL clubs for continental rivalries (need to match by name across nations)
    const { data: allClubsData = [] } = useQuery({
        queryKey: ['allClubsForRivalry'],
        queryFn: () => base44.entities.Club.list(),
        enabled: !!club?.id,
    });

    // Fetch clubs from same nation (for domestic rivalries)
    const { data: fetchedNationClubs = [] } = useQuery({
        queryKey: ['nationClubsForRivalry', club?.nation_id],
        queryFn: () => base44.entities.Club.filter({ nation_id: club.nation_id }),
        enabled: !!club?.nation_id,
    });

    // Fetch league tables for this nation's leagues
    const { data: fetchedLeagueTables = [] } = useQuery({
        queryKey: ['leagueTablesForRivalry'],
        queryFn: () => base44.entities.LeagueTable.list(),
        enabled: !!club?.nation_id,
    });

    // Use provided data if available, otherwise use fetched data
    const domesticClubs = (allClubs && allClubs.length > 0) ? allClubs : fetchedNationClubs;
    const leagueTables = (allLeagueTables && allLeagueTables.length > 0) ? allLeagueTables : fetchedLeagueTables;

    const rivalries = useMemo(() => {
        if (!club) return [];

        const rivalryScores = {};
        const clubTables = leagueTables.filter(t => t.club_id === club.id);

        // Find nation name for this club
        const clubNation = nations.find(n => n.id === club.nation_id);
        const clubNationName = clubNation?.name;

        // Continental matches for this club
        const clubContinentalMatches = continentalMatches.filter(m => 
            m.home_club_name === club.name || m.away_club_name === club.name
        );

        // Build set of opponent names from continental matches
        const continentalOpponentNames = new Set();
        clubContinentalMatches.forEach(m => {
            if (m.home_club_name === club.name) {
                continentalOpponentNames.add(m.away_club_name);
            } else {
                continentalOpponentNames.add(m.home_club_name);
            }
        });

        // Combine domestic clubs with continental opponents (from all clubs)
        const continentalOpponents = allClubsData.filter(c => 
            c.id !== club.id && 
            c.nation_id !== club.nation_id && 
            continentalOpponentNames.has(c.name)
        );
        
        // All clubs to check: domestic + continental opponents
        const allRivalCandidates = [...domesticClubs.filter(c => c.id !== club.id), ...continentalOpponents];
        
        // Dedupe by id
        const uniqueCandidates = Array.from(new Map(allRivalCandidates.map(c => [c.id, c])).values());

        uniqueCandidates.forEach(otherClub => {
            let score = 0;
            const reasons = [];
            let isContinentalRival = false;
            let continentalDetails = null;

            // 1. Explicit rivals (from rival_club_ids)
            if (club.rival_club_ids?.includes(otherClub.id)) {
                score += 50;
                reasons.push('Official rivalry');
            }

            // 2. Geographic proximity (same settlement/district/region)
            if (club.settlement && club.settlement === otherClub.settlement) {
                score += 40;
                reasons.push('Same city');
            } else if (club.district && club.district === otherClub.district) {
                score += 25;
                reasons.push('Same district');
            } else if (club.region && club.region === otherClub.region) {
                score += 15;
                reasons.push('Same region');
            }

            // 3. Shared league seasons
            const otherClubTables = leagueTables.filter(t => t.club_id === otherClub.id);
            const sharedSeasons = clubTables.filter(ct => 
                otherClubTables.some(ot => ot.season_id === ct.season_id || (ot.league_id === ct.league_id && ot.year === ct.year))
            );
            if (sharedSeasons.length > 0) {
                score += Math.min(sharedSeasons.length * 2, 30);
                reasons.push(`${sharedSeasons.length} shared seasons`);
            }

            // 4. Close finishes (both in top 3 same season)
            const closeFinishes = clubTables.filter(ct => {
                const otherInSeason = otherClubTables.find(ot => 
                    (ot.season_id === ct.season_id || (ot.league_id === ct.league_id && ot.year === ct.year))
                );
                return otherInSeason && ct.position <= 3 && otherInSeason.position <= 3;
            }).length;
            if (closeFinishes > 0) {
                score += closeFinishes * 5;
                reasons.push(`${closeFinishes} title battles`);
            }

            // 5. Similar trophy count (competitive equals)
            const clubTrophies = (club.league_titles || 0) + (club.domestic_cup_titles || 0);
            const otherTrophies = (otherClub.league_titles || 0) + (otherClub.domestic_cup_titles || 0);
            if (Math.abs(clubTrophies - otherTrophies) <= 3 && clubTrophies > 0) {
                score += 10;
                reasons.push('Similar success');
            }

            // 6. Continental rivalries (check for matches against this opponent)
            const continentalVsOpponent = clubContinentalMatches.filter(m => 
                m.home_club_name === otherClub.name || m.away_club_name === otherClub.name
            );

            if (continentalVsOpponent.length >= 1) {
                let finals = 0, semis = 0, quarters = 0;
                continentalVsOpponent.forEach(m => {
                    if (m.round === 'Final') finals++;
                    else if (m.round?.includes('Semi')) semis++;
                    else if (m.round?.includes('Quarter')) quarters++;
                });

                const otherNation = nations.find(n => n.id === otherClub.nation_id);
                const isSameNation = otherNation?.name === clubNationName;

                // Continental rivalry if: met in final, or met in semi (especially domestic), or multiple knockout meetings
                const hasSignificantMeeting = finals >= 1 || semis >= 1 || (continentalVsOpponent.length >= 2 && (quarters >= 1 || continentalVsOpponent.length >= 3));
                
                if (hasSignificantMeeting) {
                    score += finals * 100 + semis * 50 + quarters * 20 + continentalVsOpponent.length * 10;
                    isContinentalRival = true;
                    
                    if (finals >= 1) {
                        reasons.push(`${finals} continental final${finals > 1 ? 's' : ''}`);
                    }
                    if (semis >= 1) {
                        reasons.push(`${semis} continental semi${semis > 1 ? 's' : ''}`);
                    }
                    if (quarters >= 1 && !finals && !semis) {
                        reasons.push(`${quarters} QF meeting${quarters > 1 ? 's' : ''}`);
                    }
                    if (isSameNation) {
                        reasons.push('Domestic clash on continental stage');
                    }
                    if (continentalVsOpponent.length >= 2 && !finals && !semis) {
                        reasons.push(`${continentalVsOpponent.length} continental meetings`);
                    }
                    
                    continentalDetails = {
                        matches: continentalVsOpponent.length,
                        finals,
                        semis,
                        quarters,
                        isSameNation,
                        nationName: otherNation?.name
                    };
                }
            }

            if (score > 0) {
                const otherNation = nations.find(n => n.id === otherClub.nation_id);
                rivalryScores[otherClub.id] = {
                    club: otherClub,
                    score,
                    reasons,
                    sharedSeasons: sharedSeasons.length,
                    closeFinishes,
                    isContinentalRival,
                    continentalDetails,
                    nationName: otherNation?.name,
                    nationFlag: otherNation?.flag_url
                };
            }
        });

        return Object.values(rivalryScores)
            .filter(r => r.score > 0) // Show any rivalry with a score
            .sort((a, b) => b.score - a.score)
            .slice(0, 8);
    }, [club, domesticClubs, allClubsData, leagueTables, continentalMatches, nations]);

    if (rivalries.length === 0) return null;

    const getIntensityLabel = (score, isContinental) => {
        if (score >= 150) return { label: 'Legendary', color: 'text-purple-600', bg: 'bg-purple-50' };
        if (score >= 100) return { label: 'Fierce', color: 'text-red-600', bg: 'bg-red-50' };
        if (score >= 60) return { label: 'Intense', color: 'text-orange-600', bg: 'bg-orange-50' };
        if (score >= 40) return { label: 'Strong', color: 'text-amber-600', bg: 'bg-amber-50' };
        return { label: 'Rivals', color: 'text-slate-600', bg: 'bg-slate-50' };
    };

    return (
        <Card className="border-0 shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Swords className="w-5 h-5 text-red-500" />
                    Fierce Rivalries
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {rivalries.map(rivalry => {
                        const intensity = getIntensityLabel(rivalry.score, rivalry.isContinentalRival);
                        return (
                            <div 
                                key={rivalry.club.id} 
                                className={`p-3 rounded-lg ${intensity.bg} border border-slate-200`}
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    {rivalry.nationFlag && (
                                        <img src={rivalry.nationFlag} alt="" className="w-5 h-3 object-cover rounded" />
                                    )}
                                    {rivalry.club.logo_url ? (
                                        <img src={rivalry.club.logo_url} alt="" className="w-8 h-8 object-contain" />
                                    ) : (
                                        <div className="w-8 h-8 bg-slate-200 rounded-full" />
                                    )}
                                    <div className="flex-1">
                                        <Link 
                                            to={createPageUrl(`ClubDetail?id=${rivalry.club.id}`)}
                                            className="font-semibold hover:underline"
                                        >
                                            {rivalry.club.name}
                                        </Link>
                                        {rivalry.nationName && (
                                            <div className="text-xs text-slate-500">{rivalry.nationName}</div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {rivalry.isContinentalRival && (
                                            <Globe className="w-4 h-4 text-purple-500" title="Continental Rival" />
                                        )}
                                        <span className={`text-xs font-bold px-2 py-1 rounded ${intensity.color} ${intensity.bg}`}>
                                            {intensity.label}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-1.5 text-xs text-slate-600">
                                    {rivalry.reasons.map((reason, i) => (
                                        <span key={i} className="bg-white/50 px-2 py-0.5 rounded">
                                            {reason}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}