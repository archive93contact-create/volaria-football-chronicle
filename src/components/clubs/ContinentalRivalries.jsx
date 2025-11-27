import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Trophy, Shield, Swords, TrendingUp, TrendingDown, Minus, Star, Flame } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ContinentalRivalries({ club, nationName }) {
    const { data: matches = [] } = useQuery({
        queryKey: ['continentalMatchesForClub', club?.name],
        queryFn: () => base44.entities.ContinentalMatch.list(),
        enabled: !!club?.name,
    });

    const { data: competitions = [] } = useQuery({
        queryKey: ['continentalCompetitions'],
        queryFn: () => base44.entities.ContinentalCompetition.list(),
    });

    const { data: seasons = [] } = useQuery({
        queryKey: ['continentalSeasons'],
        queryFn: () => base44.entities.ContinentalSeason.list(),
    });

    const { data: nations = [] } = useQuery({
        queryKey: ['nations'],
        queryFn: () => base44.entities.Nation.list(),
    });

    const { data: clubs = [] } = useQuery({
        queryKey: ['allClubs'],
        queryFn: () => base44.entities.Club.list(),
    });

    if (!club) return null;

    // Find all matches involving this club
    const clubMatches = matches.filter(m => 
        m.home_club_name === club.name || m.away_club_name === club.name
    );

    if (clubMatches.length === 0) return null;

    // Build head-to-head records against other clubs
    const h2hRecords = {};

    clubMatches.forEach(match => {
        const isHome = match.home_club_name === club.name;
        const opponentName = isHome ? match.away_club_name : match.home_club_name;
        const opponentNation = isHome ? match.away_club_nation : match.home_club_nation;
        
        // Skip domestic opponents
        if (opponentNation === nationName) return;

        if (!h2hRecords[opponentName]) {
            h2hRecords[opponentName] = {
                name: opponentName,
                nation: opponentNation,
                matches: 0,
                wins: 0,
                draws: 0,
                losses: 0,
                goalsFor: 0,
                goalsAgainst: 0,
                finals: 0,
                semis: 0,
                quarters: 0,
                matchDetails: [],
            };
        }

        const record = h2hRecords[opponentName];
        const season = seasons.find(s => s.id === match.season_id);
        const comp = competitions.find(c => c.id === season?.competition_id);

        // Count leg results
        const processLeg = (homeScore, awayScore, legNum) => {
            if (homeScore === null || homeScore === undefined) return;
            record.matches++;
            
            const clubScore = isHome ? (legNum === 1 ? homeScore : awayScore) : (legNum === 1 ? awayScore : homeScore);
            const oppScore = isHome ? (legNum === 1 ? awayScore : homeScore) : (legNum === 1 ? homeScore : awayScore);
            
            // For leg 2, home/away swap
            const leg1ClubScore = isHome ? homeScore : awayScore;
            const leg1OppScore = isHome ? awayScore : homeScore;
            
            if (legNum === 1) {
                record.goalsFor += leg1ClubScore;
                record.goalsAgainst += leg1OppScore;
                if (leg1ClubScore > leg1OppScore) record.wins++;
                else if (leg1ClubScore < leg1OppScore) record.losses++;
                else record.draws++;
            } else {
                // Leg 2: original away team is now home
                const leg2ClubScore = isHome ? awayScore : homeScore;
                const leg2OppScore = isHome ? homeScore : awayScore;
                record.goalsFor += leg2ClubScore;
                record.goalsAgainst += leg2OppScore;
                if (leg2ClubScore > leg2OppScore) record.wins++;
                else if (leg2ClubScore < leg2OppScore) record.losses++;
                else record.draws++;
            }
        };

        processLeg(match.home_score_leg1, match.away_score_leg1, 1);
        if (!match.is_single_leg) {
            processLeg(match.home_score_leg2, match.away_score_leg2, 2);
        }

        // Track round importance
        if (match.round === 'Final') record.finals++;
        else if (match.round?.includes('Semi')) record.semis++;
        else if (match.round?.includes('Quarter')) record.quarters++;

        record.matchDetails.push({
            year: season?.year,
            round: match.round,
            competition: comp?.short_name || comp?.name,
            winner: match.winner,
        });
    });

    // Convert to array and filter for rivalries (at least 2 meetings)
    const rivalries = Object.values(h2hRecords)
        .filter(r => r.matches >= 2)
        .sort((a, b) => {
            // Sort by importance (finals > semis > quarters) then by matches
            const aImportance = a.finals * 100 + a.semis * 10 + a.quarters * 5 + a.matches;
            const bImportance = b.finals * 100 + b.semis * 10 + b.quarters * 5 + b.matches;
            return bImportance - aImportance;
        })
        .slice(0, 5);

    if (rivalries.length === 0) return null;

    const getRecordColor = (wins, losses) => {
        if (wins > losses) return 'text-green-600';
        if (wins < losses) return 'text-red-600';
        return 'text-slate-600';
    };

    const getRivalryIntensity = (rivalry) => {
        if (rivalry.finals >= 1) return { label: 'Fierce Rivals', color: 'bg-red-100 text-red-700' };
        if (rivalry.semis >= 2) return { label: 'Major Rivals', color: 'bg-orange-100 text-orange-700' };
        if (rivalry.matches >= 6) return { label: 'Regular Opponents', color: 'bg-amber-100 text-amber-700' };
        return { label: 'Emerging Rivalry', color: 'bg-blue-100 text-blue-700' };
    };

    const generateNarrative = (rivalry) => {
        const { name, nation, wins, draws, losses, finals, semis, matches, goalsFor, goalsAgainst } = rivalry;
        const parts = [];

        if (finals >= 1) {
            parts.push(`Met ${name} in ${finals} continental final${finals > 1 ? 's' : ''}`);
        }
        
        if (wins > losses) {
            parts.push(`holds the edge with ${wins} wins from ${matches} meetings`);
        } else if (losses > wins) {
            parts.push(`trails with ${wins} wins from ${matches} meetings against the ${nation} side`);
        } else {
            parts.push(`evenly matched with ${wins} wins each from ${matches} meetings`);
        }

        if (goalsFor > goalsAgainst) {
            parts.push(`outscoring them ${goalsFor}-${goalsAgainst}`);
        } else if (goalsAgainst > goalsFor) {
            parts.push(`being outscored ${goalsAgainst}-${goalsFor}`);
        }

        return parts.join(', ') + '.';
    };

    const getNationFlag = (natName) => {
        const nation = nations.find(n => n.name === natName);
        return nation?.flag_url;
    };

    const getClubId = (clubName) => {
        const foundClub = clubs.find(c => c.name === clubName);
        return foundClub?.id;
    };

    return (
        <Card className="border-0 shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Swords className="w-5 h-5 text-purple-500" />
                    Continental Rivalries
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {rivalries.map((rivalry, idx) => {
                    const intensity = getRivalryIntensity(rivalry);
                    const clubId = getClubId(rivalry.name);
                    
                    return (
                        <div key={rivalry.name} className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    {getNationFlag(rivalry.nation) && (
                                        <img src={getNationFlag(rivalry.nation)} alt="" className="w-6 h-4 object-cover rounded" />
                                    )}
                                    <div>
                                        {clubId ? (
                                            <Link to={createPageUrl(`ClubDetail?id=${clubId}`)} className="font-bold text-lg hover:text-emerald-600">
                                                {rivalry.name}
                                            </Link>
                                        ) : (
                                            <span className="font-bold text-lg">{rivalry.name}</span>
                                        )}
                                        <div className="text-sm text-slate-500">{rivalry.nation}</div>
                                    </div>
                                </div>
                                <Badge className={intensity.color}>
                                    {intensity.label}
                                </Badge>
                            </div>

                            <div className="grid grid-cols-4 gap-4 text-center mb-3">
                                <div>
                                    <div className="text-lg font-bold">{rivalry.matches}</div>
                                    <div className="text-xs text-slate-500">Matches</div>
                                </div>
                                <div>
                                    <div className={`text-lg font-bold ${getRecordColor(rivalry.wins, rivalry.losses)}`}>
                                        {rivalry.wins}
                                    </div>
                                    <div className="text-xs text-slate-500">Wins</div>
                                </div>
                                <div>
                                    <div className="text-lg font-bold text-slate-600">{rivalry.draws}</div>
                                    <div className="text-xs text-slate-500">Draws</div>
                                </div>
                                <div>
                                    <div className={`text-lg font-bold ${getRecordColor(rivalry.losses, rivalry.wins)}`}>
                                        {rivalry.losses}
                                    </div>
                                    <div className="text-xs text-slate-500">Losses</div>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2 mb-3">
                                {rivalry.finals > 0 && (
                                    <Badge variant="outline" className="border-amber-500 text-amber-600">
                                        <Trophy className="w-3 h-3 mr-1" /> {rivalry.finals} Final{rivalry.finals > 1 ? 's' : ''}
                                    </Badge>
                                )}
                                {rivalry.semis > 0 && (
                                    <Badge variant="outline" className="border-purple-500 text-purple-600">
                                        {rivalry.semis} Semi-final{rivalry.semis > 1 ? 's' : ''}
                                    </Badge>
                                )}
                                {rivalry.quarters > 0 && (
                                    <Badge variant="outline" className="border-blue-500 text-blue-600">
                                        {rivalry.quarters} Quarter-final{rivalry.quarters > 1 ? 's' : ''}
                                    </Badge>
                                )}
                            </div>

                            <p className="text-sm text-slate-600 italic">
                                {generateNarrative(rivalry)}
                            </p>
                        </div>
                    );
                })}
            </CardContent>
        </Card>
    );
}