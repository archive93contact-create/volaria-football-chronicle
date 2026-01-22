import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, Trophy, Calendar, Star, Clock } from 'lucide-react';

export default function LeagueAllTimeClubs({ league, allTables = [], clubs = [] }) {
    const clubData = useMemo(() => {
        if (!allTables || allTables.length === 0) return { allTime: [], current: [] };

        // Get all unique clubs that have ever been in this league
        const clubSeasons = {};
        const currentYear = Math.max(...allTables.map(t => t.year || '').filter(Boolean));

        allTables.forEach(table => {
            if (!table.club_name) return;
            
            if (!clubSeasons[table.club_name]) {
                clubSeasons[table.club_name] = {
                    name: table.club_name,
                    clubId: table.club_id,
                    seasons: [],
                    totalAppearances: 0,
                    titles: 0,
                    consecutiveSeasons: 0,
                    currentStreak: 0,
                    isCurrentlyIn: false,
                };
            }

            clubSeasons[table.club_name].seasons.push(table.year);
            clubSeasons[table.club_name].totalAppearances++;
            if (table.status === 'champion') {
                clubSeasons[table.club_name].titles++;
            }
            if (table.year === currentYear) {
                clubSeasons[table.club_name].isCurrentlyIn = true;
            }
        });

        // Calculate longest consecutive run for each club
        Object.values(clubSeasons).forEach(club => {
            const sortedYears = [...club.seasons].sort();
            let maxStreak = 0;
            let currentStreak = 1;

            for (let i = 1; i < sortedYears.length; i++) {
                const prevYear = parseInt(sortedYears[i - 1]);
                const currYear = parseInt(sortedYears[i]);
                
                if (currYear === prevYear + 1) {
                    currentStreak++;
                } else {
                    maxStreak = Math.max(maxStreak, currentStreak);
                    currentStreak = 1;
                }
            }
            maxStreak = Math.max(maxStreak, currentStreak);
            club.consecutiveSeasons = maxStreak;

            // Calculate current active streak (ending in current year)
            if (club.isCurrentlyIn) {
                let streak = 1;
                for (let i = sortedYears.length - 2; i >= 0; i--) {
                    const year = parseInt(sortedYears[i]);
                    const nextYear = parseInt(sortedYears[i + 1]);
                    if (nextYear === year + 1) {
                        streak++;
                    } else {
                        break;
                    }
                }
                club.currentStreak = streak;
            }
        });

        const allTimeClubs = Object.values(clubSeasons)
            .sort((a, b) => b.totalAppearances - a.totalAppearances);

        const currentClubs = Object.values(clubSeasons)
            .filter(c => c.isCurrentlyIn)
            .sort((a, b) => b.currentStreak - a.currentStreak);

        return { allTime: allTimeClubs, current: currentClubs };
    }, [allTables]);

    return (
        <div className="space-y-6">
            {/* Current Clubs - Longest Stays */}
            {clubData.current.length > 0 && (
                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="w-5 h-5 text-emerald-600" />
                            Current Clubs - Longest Consecutive Stays
                            <Badge variant="outline" className="ml-2">{clubData.current.length} clubs</Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50">
                                    <TableHead className="w-12">#</TableHead>
                                    <TableHead>Club</TableHead>
                                    <TableHead className="text-center">Current Streak</TableHead>
                                    <TableHead className="text-center hidden md:table-cell">Total Appearances</TableHead>
                                    <TableHead className="text-center hidden lg:table-cell">Championships</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {clubData.current.map((club, idx) => {
                                    const clubObj = clubs.find(c => c.id === club.clubId || c.name === club.name);
                                    return (
                                        <TableRow key={club.name} className={idx < 3 ? 'bg-emerald-50/30' : ''}>
                                            <TableCell className="font-bold text-slate-400">{idx + 1}</TableCell>
                                            <TableCell>
                                                {club.clubId ? (
                                                    <Link 
                                                        to={createPageUrl(`ClubDetail?id=${club.clubId}`)}
                                                        className="font-medium hover:text-emerald-600 hover:underline flex items-center gap-2"
                                                    >
                                                        {clubObj?.logo_url && (
                                                            <img src={clubObj.logo_url} alt={club.name} className="w-6 h-6 object-contain bg-white rounded p-0.5" />
                                                        )}
                                                        {club.name}
                                                    </Link>
                                                ) : (
                                                    <span className="font-medium">{club.name}</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge className="bg-emerald-600 text-white">
                                                    {club.currentStreak} {club.currentStreak === 1 ? 'season' : 'seasons'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center hidden md:table-cell">
                                                <span className="font-semibold">{club.totalAppearances}</span>
                                            </TableCell>
                                            <TableCell className="text-center hidden lg:table-cell">
                                                {club.titles > 0 ? (
                                                    <span className="flex items-center justify-center gap-1 text-amber-600 font-bold">
                                                        <Trophy className="w-4 h-4" />
                                                        {club.titles}
                                                    </span>
                                                ) : '-'}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {/* All-Time Clubs List */}
            <Card className="border-0 shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-blue-600" />
                        All-Time Clubs in {league.name}
                        <Badge variant="outline" className="ml-2">{clubData.allTime.length} clubs</Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {clubData.allTime.length === 0 ? (
                        <p className="text-center py-8 text-slate-500">No clubs found in league history</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50">
                                    <TableHead className="w-12">#</TableHead>
                                    <TableHead>Club</TableHead>
                                    <TableHead className="text-center">Total Seasons</TableHead>
                                    <TableHead className="text-center hidden md:table-cell">Longest Run</TableHead>
                                    <TableHead className="text-center hidden lg:table-cell">Championships</TableHead>
                                    <TableHead className="text-center hidden xl:table-cell">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {clubData.allTime.map((club, idx) => {
                                    const clubObj = clubs.find(c => c.id === club.clubId || c.name === club.name);
                                    return (
                                        <TableRow key={club.name} className={club.isCurrentlyIn ? 'bg-blue-50/30' : ''}>
                                            <TableCell className="font-bold text-slate-400">{idx + 1}</TableCell>
                                            <TableCell>
                                                {club.clubId ? (
                                                    <Link 
                                                        to={createPageUrl(`ClubDetail?id=${club.clubId}`)}
                                                        className="font-medium hover:text-emerald-600 hover:underline flex items-center gap-2"
                                                    >
                                                        {clubObj?.logo_url && (
                                                            <img src={clubObj.logo_url} alt={club.name} className="w-6 h-6 object-contain bg-white rounded p-0.5" />
                                                        )}
                                                        {club.name}
                                                    </Link>
                                                ) : (
                                                    <span className="font-medium">{club.name}</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center font-semibold">{club.totalAppearances}</TableCell>
                                            <TableCell className="text-center hidden md:table-cell">
                                                {club.consecutiveSeasons > 1 ? (
                                                    <Badge variant="outline" className="bg-slate-100">
                                                        {club.consecutiveSeasons} consecutive
                                                    </Badge>
                                                ) : '-'}
                                            </TableCell>
                                            <TableCell className="text-center hidden lg:table-cell">
                                                {club.titles > 0 ? (
                                                    <span className="flex items-center justify-center gap-1 text-amber-600 font-bold">
                                                        <Trophy className="w-4 h-4" />
                                                        {club.titles}
                                                    </span>
                                                ) : '-'}
                                            </TableCell>
                                            <TableCell className="text-center hidden xl:table-cell">
                                                {club.isCurrentlyIn ? (
                                                    <Badge className="bg-blue-600 text-white">Active</Badge>
                                                ) : (
                                                    <span className="text-slate-400 text-sm">Former</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}