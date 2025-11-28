import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trophy, Target, TrendingUp, Users } from 'lucide-react';

const ROUND_ORDER = ['Round of 32', 'Round of 16', 'Quarter-final', 'Semi-final', 'Final'];

export default function ParticipantsList({ matches, season, clubs = [], nations = [], competition, allSeasons = [], allMatches = [] }) {
    // Get custom round names
    const getRoundDisplayName = (roundName) => {
        if (competition?.round_names && competition.round_names[roundName]) {
            return competition.round_names[roundName];
        }
        return roundName;
    };

    const participants = useMemo(() => {
        if (!matches || matches.length === 0) return [];

        const clubData = {};

        // Process all matches to build club data
        matches.forEach(match => {
            [
                { name: match.home_club_name, nation: match.home_club_nation, isHome: true },
                { name: match.away_club_name, nation: match.away_club_nation, isHome: false }
            ].forEach(({ name, nation }) => {
                if (!name) return;
                
                if (!clubData[name]) {
                    clubData[name] = {
                        name,
                        nation,
                        rounds: [],
                        wins: 0,
                        losses: 0,
                        goalsScored: 0,
                        goalsConceded: 0,
                        matchesPlayed: 0
                    };
                }
                
                clubData[name].rounds.push(match.round);
                clubData[name].matchesPlayed++;
                
                // Calculate goals
                const isHome = match.home_club_name === name;
                if (isHome) {
                    clubData[name].goalsScored += (match.home_score_leg1 || 0) + (match.home_score_leg2 || 0);
                    clubData[name].goalsConceded += (match.away_score_leg1 || 0) + (match.away_score_leg2 || 0);
                } else {
                    clubData[name].goalsScored += (match.away_score_leg1 || 0) + (match.away_score_leg2 || 0);
                    clubData[name].goalsConceded += (match.home_score_leg1 || 0) + (match.home_score_leg2 || 0);
                }
                
                // Track wins/losses
                if (match.winner === name) {
                    clubData[name].wins++;
                } else if (match.winner) {
                    clubData[name].losses++;
                }
            });
        });

        // Calculate entry round, exit round, and furthest progress
        Object.values(clubData).forEach(club => {
            const uniqueRounds = [...new Set(club.rounds)];
            const sortedRounds = uniqueRounds.sort((a, b) => 
                ROUND_ORDER.indexOf(a) - ROUND_ORDER.indexOf(b)
            );
            
            club.entryRound = sortedRounds[0];
            club.exitRound = sortedRounds[sortedRounds.length - 1];
            club.roundsProgressed = sortedRounds.length;
            
            // Determine if they won
            club.isChampion = season?.champion_name === club.name;
            club.isRunnerUp = season?.runner_up === club.name;
        });

        // Get last appearance for each club from all seasons
        const getLastAppearance = (clubName) => {
            const compSeasons = allSeasons.filter(s => s.competition_id === competition?.id);
            const clubAppearances = compSeasons.filter(s => {
                const seasonMatches = allMatches.filter(m => m.season_id === s.id);
                return seasonMatches.some(m => 
                    m.home_club_name === clubName || m.away_club_name === clubName
                );
            }).map(s => s.year).sort().reverse();
            
            // Find the previous appearance (not this season)
            const previousAppearances = clubAppearances.filter(y => y !== season?.year);
            return previousAppearances[0] || null;
        };

        // Add last appearance data
        Object.values(clubData).forEach(club => {
            club.lastAppearance = getLastAppearance(club.name);
        });

        // Sort by furthest progress, then by goals scored
        return Object.values(clubData).sort((a, b) => {
            // Champions first
            if (a.isChampion) return -1;
            if (b.isChampion) return 1;
            if (a.isRunnerUp) return -1;
            if (b.isRunnerUp) return 1;
            
            // Then by round reached
            const aRoundIdx = ROUND_ORDER.indexOf(a.exitRound);
            const bRoundIdx = ROUND_ORDER.indexOf(b.exitRound);
            if (aRoundIdx !== bRoundIdx) return bRoundIdx - aRoundIdx;
            
            // Then by goals scored
            return b.goalsScored - a.goalsScored;
        });
    }, [matches, season, competition, allSeasons, allMatches]);

    const getNation = (nationName) => nations.find(n => n.name === nationName);
    const getClub = (clubName) => clubs.find(c => c.name === clubName);

    // Stats summary
    const stats = useMemo(() => {
        const nationCounts = {};
        participants.forEach(p => {
            if (p.nation) {
                nationCounts[p.nation] = (nationCounts[p.nation] || 0) + 1;
            }
        });
        const topNations = Object.entries(nationCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);
        
        return {
            totalClubs: participants.length,
            totalNations: Object.keys(nationCounts).length,
            topNations
        };
    }, [participants]);

    if (participants.length === 0) {
        return (
            <Card className="border-dashed border-2 border-slate-300">
                <CardContent className="flex flex-col items-center justify-center py-12">
                    <Users className="w-12 h-12 text-slate-300 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">No Participants Yet</h3>
                    <p className="text-slate-500">Add matches to see participating clubs</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-4 text-center">
                        <Users className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                        <div className="text-2xl font-bold">{stats.totalClubs}</div>
                        <div className="text-xs text-slate-500">Clubs</div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-4 text-center">
                        <Target className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                        <div className="text-2xl font-bold">{stats.totalNations}</div>
                        <div className="text-xs text-slate-500">Nations</div>
                    </CardContent>
                </Card>
                {stats.topNations[0] && (
                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold">{stats.topNations[0][1]}</div>
                            <div className="text-xs text-slate-500">{stats.topNations[0][0]} clubs</div>
                        </CardContent>
                    </Card>
                )}
                {stats.topNations[1] && (
                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold">{stats.topNations[1][1]}</div>
                            <div className="text-xs text-slate-500">{stats.topNations[1][0]} clubs</div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Participants Table */}
            <Card className="border-0 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        All Participants
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50">
                                <TableHead className="w-8">#</TableHead>
                                <TableHead>Club</TableHead>
                                <TableHead>Nation</TableHead>
                                <TableHead className="text-center">Entry Round</TableHead>
                                <TableHead className="text-center">Exited</TableHead>
                                <TableHead className="text-center">W</TableHead>
                                <TableHead className="text-center">L</TableHead>
                                <TableHead className="text-center">GF</TableHead>
                                <TableHead className="text-center">GA</TableHead>
                                <TableHead className="text-center">GD</TableHead>
                                <TableHead className="hidden md:table-cell">Last App.</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {participants.map((p, idx) => {
                                const nation = getNation(p.nation);
                                const club = getClub(p.name);
                                const gd = p.goalsScored - p.goalsConceded;
                                
                                return (
                                    <TableRow key={p.name} className={p.isChampion ? 'bg-amber-50' : p.isRunnerUp ? 'bg-slate-50' : ''}>
                                        <TableCell className="font-medium text-slate-400">{idx + 1}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {p.isChampion && <Trophy className="w-4 h-4 text-amber-500" />}
                                                {club ? (
                                                    <Link to={createPageUrl(`ClubDetail?id=${club.id}`)} className="font-medium hover:text-emerald-600 hover:underline">
                                                        {p.name}
                                                    </Link>
                                                ) : (
                                                    <span className="font-medium">{p.name}</span>
                                                )}
                                                {p.isChampion && <Badge className="bg-amber-100 text-amber-700 text-xs">Winner</Badge>}
                                                {p.isRunnerUp && <Badge variant="outline" className="text-xs">Runner-up</Badge>}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {nation?.flag_url && (
                                                    <img src={nation.flag_url} alt="" className="w-6 h-4 object-cover rounded-sm" />
                                                )}
                                                {nation ? (
                                                    <Link to={createPageUrl(`NationDetail?id=${nation.id}`)} className="text-sm text-slate-600 hover:text-emerald-600">
                                                        {p.nation}
                                                    </Link>
                                                ) : (
                                                    <span className="text-sm text-slate-600">{p.nation}</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className="text-xs bg-slate-100 px-2 py-1 rounded">
                                                {getRoundDisplayName(p.entryRound)}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className={`text-xs px-2 py-1 rounded ${
                                                p.isChampion ? 'bg-amber-100 text-amber-700' : 
                                                p.exitRound === 'Final' ? 'bg-blue-100 text-blue-700' : 
                                                'bg-slate-100'
                                            }`}>
                                                {p.isChampion ? 'Winner' : getRoundDisplayName(p.exitRound)}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-center font-medium text-emerald-600">{p.wins}</TableCell>
                                        <TableCell className="text-center text-slate-500">{p.losses}</TableCell>
                                        <TableCell className="text-center">{p.goalsScored}</TableCell>
                                        <TableCell className="text-center">{p.goalsConceded}</TableCell>
                                        <TableCell className={`text-center font-medium ${gd > 0 ? 'text-emerald-600' : gd < 0 ? 'text-red-500' : ''}`}>
                                            {gd > 0 ? `+${gd}` : gd}
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell text-sm text-slate-500">
                                            {p.lastAppearance || '-'}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}