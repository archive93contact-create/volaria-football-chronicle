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
        // Need club to work with
        if (!club) return [];
        
        // Determine which data sources to use - prefer fetched data over props since props may be empty
        const workingDomesticClubs = fetchedNationClubs.length > 0 ? fetchedNationClubs : domesticClubs;
        const workingLeagueTables = fetchedLeagueTables.length > 0 ? fetchedLeagueTables : leagueTables;
        
        // If no clubs loaded yet, wait
        if (workingDomesticClubs.length === 0) return [];

        const rivalryScores = {};
        const clubTables = workingLeagueTables.filter(t => t.club_id === club.id);
        
        // Determine recent vs historic (for fading rivalries)
        const allYears = clubTables.map(t => parseInt(t.year?.split('-')[0] || '0')).filter(y => y > 0).sort((a, b) => b - a);
        const mostRecentYear = allYears[0] || new Date().getFullYear();
        const recentCutoff = mostRecentYear - 10; // Last 10 years = "recent"

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
        const allRivalCandidates = [...workingDomesticClubs.filter(c => c.id !== club.id), ...continentalOpponents];
        
        // Dedupe by id
        const uniqueCandidates = Array.from(new Map(allRivalCandidates.map(c => [c.id, c])).values());

        uniqueCandidates.forEach(otherClub => {
            let score = 0;
            const reasons = [];
            let isContinentalRival = false;
            let continentalDetails = null;
            let recentScore = 0; // Track recent activity for fading detection
            let historicScore = 0; // Track historic activity

            // 1. Explicit rivals (from rival_club_ids)
            if (club.rival_club_ids?.includes(otherClub.id)) {
                score += 50;
                recentScore += 25;
                historicScore += 25;
                reasons.push('Official rivalry');
            }

            // 2. Geographic proximity (same settlement/district/region)
            if (club.settlement && club.settlement === otherClub.settlement) {
                score += 40;
                recentScore += 20;
                historicScore += 20;
                reasons.push('Same city');
            } else if (club.district && club.district === otherClub.district) {
                score += 25;
                recentScore += 12;
                historicScore += 13;
                reasons.push('Same district');
            } else if (club.region && club.region === otherClub.region) {
                score += 15;
                recentScore += 7;
                historicScore += 8;
                reasons.push('Same region');
            }

            // 3. Shared league seasons (split recent vs historic)
            const otherClubTables = workingLeagueTables.filter(t => t.club_id === otherClub.id);
            const sharedSeasons = clubTables.filter(ct => 
                otherClubTables.some(ot => ot.season_id === ct.season_id || (ot.league_id === ct.league_id && ot.year === ct.year))
            );
            const recentShared = sharedSeasons.filter(s => parseInt(s.year?.split('-')[0] || '0') >= recentCutoff);
            const historicShared = sharedSeasons.filter(s => parseInt(s.year?.split('-')[0] || '0') < recentCutoff);
            
            if (sharedSeasons.length > 0) {
                const sharedScore = Math.min(sharedSeasons.length * 2, 30);
                score += sharedScore;
                recentScore += Math.min(recentShared.length * 3, 20);
                historicScore += Math.min(historicShared.length * 2, 15);
                reasons.push(`${sharedSeasons.length} shared seasons`);
            }

            // 4. ENHANCED rivalry dynamics - title races, promotions, close finishes, relegation battles
            
            // Title battles (both top 3 in same season)
            const titleBattles = clubTables.filter(ct => {
                const otherInSeason = otherClubTables.find(ot => 
                    (ot.season_id === ct.season_id || (ot.league_id === ct.league_id && ot.year === ct.year))
                );
                return otherInSeason && ct.position <= 3 && otherInSeason.position <= 3;
            });
            const recentTitleBattles = titleBattles.filter(s => parseInt(s.year?.split('-')[0] || '0') >= recentCutoff);
            
            if (titleBattles.length > 0) {
                score += titleBattles.length * 8;
                recentScore += recentTitleBattles.length * 10;
                historicScore += (titleBattles.length - recentTitleBattles.length) * 5;
                reasons.push(`${titleBattles.length} title battle${titleBattles.length > 1 ? 's' : ''}`);
            }
            
            // Promoted together (both promoted same year)
            const promotedTogether = clubTables.filter(ct => {
                if (ct.status !== 'promoted') return false;
                const otherInSeason = otherClubTables.find(ot => 
                    (ot.season_id === ct.season_id || (ot.league_id === ct.league_id && ot.year === ct.year)) &&
                    ot.status === 'promoted'
                );
                return !!otherInSeason;
            });
            const recentPromotions = promotedTogether.filter(s => parseInt(s.year?.split('-')[0] || '0') >= recentCutoff);
            
            if (promotedTogether.length > 0) {
                score += promotedTogether.length * 12;
                recentScore += recentPromotions.length * 15;
                historicScore += (promotedTogether.length - recentPromotions.length) * 8;
                reasons.push(`Promoted together ${promotedTogether.length}x`);
            }
            
            // Relegated together (shared misery)
            const relegatedTogether = clubTables.filter(ct => {
                if (ct.status !== 'relegated') return false;
                const otherInSeason = otherClubTables.find(ot => 
                    (ot.season_id === ct.season_id || (ot.league_id === ct.league_id && ot.year === ct.year)) &&
                    ot.status === 'relegated'
                );
                return !!otherInSeason;
            });
            
            if (relegatedTogether.length >= 2) {
                score += relegatedTogether.length * 8;
                recentScore += relegatedTogether.filter(s => parseInt(s.year?.split('-')[0] || '0') >= recentCutoff).length * 10;
                reasons.push(`Relegated together ${relegatedTogether.length}x`);
            }
            
            // Finished within 2 positions frequently (consistently close)
            const closeFinishes = clubTables.filter(ct => {
                const otherInSeason = otherClubTables.find(ot => 
                    (ot.season_id === ct.season_id || (ot.league_id === ct.league_id && ot.year === ct.year))
                );
                if (!otherInSeason) return false;
                const posDiff = Math.abs(ct.position - otherInSeason.position);
                return posDiff <= 2 && posDiff > 0;
            });
            const recentCloseFinishes = closeFinishes.filter(s => parseInt(s.year?.split('-')[0] || '0') >= recentCutoff);
            
            if (closeFinishes.length >= 5) {
                score += closeFinishes.length * 4;
                recentScore += recentCloseFinishes.length * 6;
                historicScore += (closeFinishes.length - recentCloseFinishes.length) * 3;
                reasons.push(`Finished within 2 places ${closeFinishes.length}x`);
            }
            
            // Champions in same tier, same season (direct title fight)
            const directTitleFights = clubTables.filter(ct => {
                if (ct.status !== 'champion') return false;
                const otherInSeason = otherClubTables.find(ot => 
                    (ot.season_id === ct.season_id || (ot.league_id === ct.league_id && ot.year === ct.year)) &&
                    ot.position === 2 // They were runner-up when we won
                );
                return !!otherInSeason;
            });
            
            if (directTitleFights.length > 0) {
                score += directTitleFights.length * 15;
                recentScore += directTitleFights.filter(s => parseInt(s.year?.split('-')[0] || '0') >= recentCutoff).length * 20;
                reasons.push(`Direct title deciders ${directTitleFights.length}x`);
            }

            // 5. Similar trophy count (competitive equals)
            const clubTrophies = (club.league_titles || 0) + (club.domestic_cup_titles || 0);
            const otherTrophies = (otherClub.league_titles || 0) + (otherClub.domestic_cup_titles || 0);
            if (Math.abs(clubTrophies - otherTrophies) <= 3 && clubTrophies > 0) {
                score += 10;
                recentScore += 5;
                historicScore += 5;
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
                
                // Determine rivalry status
                let rivalryStatus = 'active';
                let statusNote = null;
                
                // Fading rivalry detection
                if (historicScore > 30 && recentScore < 10 && sharedSeasons.length >= 5) {
                    const lastSharedYear = sharedSeasons.sort((a, b) => b.year.localeCompare(a.year))[0]?.year;
                    const yearsSinceShared = lastSharedYear ? mostRecentYear - parseInt(lastSharedYear.split('-')[0]) : 0;
                    
                    if (yearsSinceShared >= 10) {
                        rivalryStatus = 'fading';
                        statusNote = `Once fierce rivals, haven't met since ${lastSharedYear}`;
                        score = score * 0.6; // Reduce score for sorting
                    } else if (yearsSinceShared >= 5 && recentScore < 5) {
                        rivalryStatus = 'cooling';
                        statusNote = `Rivalry cooling - last met ${lastSharedYear}`;
                        score = score * 0.8;
                    }
                }
                
                // Emerging rivalry (new but heating up)
                if (recentScore >= 20 && historicScore < 10) {
                    rivalryStatus = 'emerging';
                    statusNote = 'Rivalry heating up in recent years';
                }
                
                rivalryScores[otherClub.id] = {
                    club: otherClub,
                    score,
                    recentScore,
                    historicScore,
                    reasons,
                    sharedSeasons: sharedSeasons.length,
                    closeFinishes,
                    isContinentalRival,
                    continentalDetails,
                    nationName: otherNation?.name,
                    nationFlag: otherNation?.flag_url,
                    rivalryStatus,
                    statusNote
                };
            }
        });

        return Object.values(rivalryScores)
            .filter(r => r.score >= 30) // Lower threshold to include emerging/fading
            .sort((a, b) => {
                // Sort by status priority: active > emerging > cooling > fading
                const statusPriority = { active: 4, emerging: 3, cooling: 2, fading: 1 };
                if (statusPriority[a.rivalryStatus] !== statusPriority[b.rivalryStatus]) {
                    return statusPriority[b.rivalryStatus] - statusPriority[a.rivalryStatus];
                }
                return b.score - a.score;
            })
            .slice(0, 12); // Increased to show more rivalries including fading ones
    }, [club, domesticClubs, fetchedNationClubs, allClubsData, leagueTables, fetchedLeagueTables, continentalMatches, nations]);

    if (rivalries.length === 0) return null;

    const getIntensityLabel = (score, isContinental, rivalryStatus) => {
        if (rivalryStatus === 'fading') {
            return { label: 'Fading', color: 'text-slate-500', bg: 'bg-slate-100' };
        }
        if (rivalryStatus === 'cooling') {
            return { label: 'Cooling', color: 'text-slate-600', bg: 'bg-slate-50' };
        }
        if (rivalryStatus === 'emerging') {
            return { label: 'Emerging', color: 'text-cyan-600', bg: 'bg-cyan-50' };
        }
        
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
                        const intensity = getIntensityLabel(rivalry.score, rivalry.isContinentalRival, rivalry.rivalryStatus);
                        return (
                            <div 
                                key={rivalry.club.id} 
                                className={`p-3 rounded-lg ${intensity.bg} border ${rivalry.rivalryStatus === 'fading' ? 'border-dashed border-slate-300' : 'border-slate-200'}`}
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
                                        {rivalry.statusNote && (
                                            <div className={`text-xs italic mt-1 ${rivalry.rivalryStatus === 'fading' ? 'text-slate-400' : rivalry.rivalryStatus === 'emerging' ? 'text-cyan-600' : 'text-slate-500'}`}>
                                                {rivalry.statusNote}
                                            </div>
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
                                        <span key={i} className={`${rivalry.rivalryStatus === 'fading' ? 'bg-slate-100 text-slate-400' : 'bg-white/50'} px-2 py-0.5 rounded`}>
                                            {reason}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
                
                {/* Legend */}
                <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded bg-red-50 border-2 border-red-500" />
                        <span className="text-slate-600">Active rivalry</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded bg-cyan-50 border-2 border-cyan-500" />
                        <span className="text-slate-600">Emerging rivalry</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded bg-slate-100 border-2 border-slate-400" />
                        <span className="text-slate-600">Cooling down</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded bg-slate-100 border-2 border-dashed border-slate-300" />
                        <span className="text-slate-600">Fading rivalry</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}