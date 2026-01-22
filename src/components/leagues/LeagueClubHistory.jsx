import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, Calendar, TrendingUp, TrendingDown } from 'lucide-react';

export default function LeagueClubHistory({ league, leagueTables, clubs }) {
    const clubHistory = useMemo(() => {
        if (!leagueTables || leagueTables.length === 0) return { allClubs: [], currentClubs: [] };

        const clubStats = {};
        const sortedSeasons = [...leagueTables].sort((a, b) => a.year.localeCompare(b.year));
        const latestYear = sortedSeasons[sortedSeasons.length - 1]?.year;

        // Build club history
        sortedSeasons.forEach((entry, index) => {
            const clubId = entry.club_id || entry.club_name;
            if (!clubStats[clubId]) {
                clubStats[clubId] = {
                    club_id: entry.club_id,
                    club_name: entry.club_name,
                    seasons: [],
                    totalSeasons: 0,
                    titles: 0,
                    bestFinish: 999,
                    worstFinish: 0,
                    firstSeason: entry.year,
                    lastSeason: entry.year,
                    currentConsecutive: 0,
                    isCurrentlyInLeague: false
                };
            }

            clubStats[clubId].seasons.push({
                year: entry.year,
                position: entry.position,
                status: entry.status
            });
            clubStats[clubId].totalSeasons++;
            clubStats[clubId].lastSeason = entry.year;

            if (entry.position < clubStats[clubId].bestFinish) {
                clubStats[clubId].bestFinish = entry.position;
            }
            if (entry.position > clubStats[clubId].worstFinish) {
                clubStats[clubId].worstFinish = entry.position;
            }
            if (entry.status === 'champion') {
                clubStats[clubId].titles++;
            }
        });

        // Calculate consecutive stays for current clubs
        Object.values(clubStats).forEach(club => {
            if (club.lastSeason === latestYear) {
                club.isCurrentlyInLeague = true;
                // Count backwards to find consecutive seasons
                const sortedClubSeasons = club.seasons.sort((a, b) => b.year.localeCompare(a.year));
                let consecutive = 1;
                for (let i = 1; i < sortedClubSeasons.length; i++) {
                    const currentYear = parseInt(sortedClubSeasons[i - 1].year);
                    const prevYear = parseInt(sortedClubSeasons[i].year);
                    if (currentYear - prevYear === 1) {
                        consecutive++;
                    } else {
                        break;
                    }
                }
                club.currentConsecutive = consecutive;
            }
        });

        const allClubs = Object.values(clubStats).sort((a, b) => b.totalSeasons - a.totalSeasons);
        const currentClubs = allClubs
            .filter(c => c.isCurrentlyInLeague)
            .sort((a, b) => b.currentConsecutive - a.currentConsecutive);

        return { allClubs, currentClubs };
    }, [leagueTables]);

    const getClubLogo = (clubId) => {
        const club = clubs?.find(c => c.id === clubId);
        return club?.logo_url;
    };

    return (
        <div className="space-y-6">
            {/* Current Clubs - Consecutive Stays */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        Current Members - Consecutive Seasons
                    </CardTitle>
                    <CardDescription>
                        Clubs currently in {league.name} and their unbroken tenure
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {clubHistory.currentClubs.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-12">#</TableHead>
                                    <TableHead>Club</TableHead>
                                    <TableHead className="text-center">Consecutive</TableHead>
                                    <TableHead className="text-center">Titles</TableHead>
                                    <TableHead className="text-center">Best</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {clubHistory.currentClubs.map((club, idx) => (
                                    <TableRow key={club.club_id || club.club_name}>
                                        <TableCell className="font-medium">{idx + 1}</TableCell>
                                        <TableCell>
                                            <Link 
                                                to={createPageUrl('ClubDetail', `?id=${club.club_id}`)}
                                                className="flex items-center gap-3 hover:underline"
                                            >
                                                {club.club_id && getClubLogo(club.club_id) && (
                                                    <img 
                                                        src={getClubLogo(club.club_id)} 
                                                        alt={`${club.club_name} crest`}
                                                        className="w-6 h-6 object-contain bg-white rounded"
                                                    />
                                                )}
                                                <span className="font-medium">{club.club_name}</span>
                                            </Link>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                                {club.currentConsecutive} {club.currentConsecutive === 1 ? 'season' : 'seasons'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {club.titles > 0 ? (
                                                <span className="flex items-center justify-center gap-1 text-amber-600 font-semibold">
                                                    <Trophy className="w-4 h-4" />
                                                    {club.titles}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center font-medium">
                                            {club.bestFinish === 1 ? (
                                                <span className="text-amber-600">🏆 1st</span>
                                            ) : (
                                                `${club.bestFinish}${club.bestFinish === 2 ? 'nd' : club.bestFinish === 3 ? 'rd' : 'th'}`
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <p className="text-slate-500 text-center py-8">No current member data available</p>
                    )}
                </CardContent>
            </Card>

            {/* All-Time Clubs */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        All-Time Members
                    </CardTitle>
                    <CardDescription>
                        Every club that has competed in {league.name}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {clubHistory.allClubs.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-12">#</TableHead>
                                    <TableHead>Club</TableHead>
                                    <TableHead className="text-center">Seasons</TableHead>
                                    <TableHead className="text-center">Titles</TableHead>
                                    <TableHead className="text-center">Best</TableHead>
                                    <TableHead className="text-center">Worst</TableHead>
                                    <TableHead>Period</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {clubHistory.allClubs.map((club, idx) => (
                                    <TableRow key={club.club_id || club.club_name}>
                                        <TableCell className="font-medium">{idx + 1}</TableCell>
                                        <TableCell>
                                            <Link 
                                                to={createPageUrl('ClubDetail', `?id=${club.club_id}`)}
                                                className="flex items-center gap-3 hover:underline"
                                            >
                                                {club.club_id && getClubLogo(club.club_id) && (
                                                    <img 
                                                        src={getClubLogo(club.club_id)} 
                                                        alt={`${club.club_name} crest`}
                                                        className="w-6 h-6 object-contain bg-white rounded"
                                                    />
                                                )}
                                                <span className="font-medium">{club.club_name}</span>
                                                {club.isCurrentlyInLeague && (
                                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                                        Current
                                                    </Badge>
                                                )}
                                            </Link>
                                        </TableCell>
                                        <TableCell className="text-center font-medium">
                                            {club.totalSeasons}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {club.titles > 0 ? (
                                                <span className="flex items-center justify-center gap-1 text-amber-600 font-semibold">
                                                    <Trophy className="w-4 h-4" />
                                                    {club.titles}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center font-medium">
                                            {club.bestFinish === 1 ? (
                                                <span className="text-amber-600">🏆 1st</span>
                                            ) : (
                                                `${club.bestFinish}${club.bestFinish === 2 ? 'nd' : club.bestFinish === 3 ? 'rd' : 'th'}`
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center text-slate-600">
                                            {club.worstFinish}th
                                        </TableCell>
                                        <TableCell className="text-sm text-slate-600">
                                            {club.firstSeason} - {club.lastSeason}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <p className="text-slate-500 text-center py-8">No historical data available</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}