import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Star, Shield, TrendingUp, Medal, Award } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function LocationRankings({ allLocations, allClubs, allLeagues, allLeagueTables = [], locationType }) {
    const rankings = useMemo(() => {
        if (!allLocations || allLocations.length === 0) return [];

        return allLocations
            .filter(loc => loc.type === locationType)
            .map(location => {
                const locationClubs = allClubs.filter(c => {
                    if (locationType === 'region') return c.region === location.name;
                    if (locationType === 'district') return c.district === location.name;
                    if (locationType === 'settlement') return c.settlement === location.name || c.city === location.name;
                    return false;
                });

                // Calculate metrics
                const totalClubs = locationClubs.length;
                const topFlightClubs = locationClubs.filter(c => {
                    const league = allLeagues.find(l => l.id === c.league_id);
                    return league?.tier === 1;
                }).length;

                const totalLeagueTitles = locationClubs.reduce((sum, c) => sum + (c.league_titles || 0), 0);
                const totalCupTitles = locationClubs.reduce((sum, c) => sum + (c.domestic_cup_titles || 0), 0);
                const totalContinentalTitles = locationClubs.reduce((sum, c) => sum + (c.vcc_titles || 0) + (c.ccc_titles || 0), 0);
                const totalPromotions = locationClubs.reduce((sum, c) => sum + (c.promotions || 0), 0);
                const totalRelegations = locationClubs.reduce((sum, c) => sum + (c.relegations || 0), 0);

                // Trophy score for ranking
                const trophyScore = (totalLeagueTitles * 10) + (totalCupTitles * 5) + (totalContinentalTitles * 20);

                // Activity score (clubs * promotions)
                const activityScore = totalClubs + totalPromotions;

                // Current form (last 3 seasons average position in top flight)
                const recentTables = allLeagueTables
                    .filter(t => locationClubs.some(c => c.id === t.club_id))
                    .sort((a, b) => b.year.localeCompare(a.year))
                    .slice(0, locationClubs.length * 3);

                const avgRecentPosition = recentTables.length > 0
                    ? recentTables.reduce((sum, t) => sum + (t.position || 99), 0) / recentTables.length
                    : 99;

                return {
                    location,
                    totalClubs,
                    topFlightClubs,
                    totalLeagueTitles,
                    totalCupTitles,
                    totalContinentalTitles,
                    totalPromotions,
                    totalRelegations,
                    trophyScore,
                    activityScore,
                    avgRecentPosition,
                    population: location.population || 0
                };
            })
            .filter(r => r.totalClubs > 0)
            .sort((a, b) => b.trophyScore - a.trophyScore);
    }, [allLocations, allClubs, allLeagues, allLeagueTables, locationType]);

    if (rankings.length === 0) {
        return null;
    }

    const locationTypeLabel = locationType.charAt(0).toUpperCase() + locationType.slice(1);

    return (
        <Card className="border-0 shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Medal className="w-5 h-5 text-amber-500" />
                    {locationTypeLabel} Rankings
                </CardTitle>
                <p className="text-sm text-slate-500 mt-1">Ranked by trophy success and football heritage</p>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-12">#</TableHead>
                            <TableHead>{locationTypeLabel}</TableHead>
                            <TableHead className="text-center">Clubs</TableHead>
                            <TableHead className="text-center">Top Flight</TableHead>
                            <TableHead className="text-center hidden md:table-cell">League Titles</TableHead>
                            <TableHead className="text-center hidden lg:table-cell">Cups</TableHead>
                            <TableHead className="text-center hidden lg:table-cell">Continental</TableHead>
                            <TableHead className="text-center">Trophy Score</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rankings.map((rank, idx) => (
                            <TableRow key={rank.location.id} className="hover:bg-slate-50">
                                <TableCell className="font-bold text-slate-400">{idx + 1}</TableCell>
                                <TableCell>
                                    <Link 
                                        to={createPageUrl(`LocationDetail?id=${rank.location.id}`)}
                                        className="font-medium hover:text-emerald-600 flex items-center gap-2"
                                    >
                                        {rank.location.name}
                                        {rank.location.is_capital && (
                                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                                                Capital
                                            </Badge>
                                        )}
                                    </Link>
                                    {rank.population > 0 && (
                                        <div className="text-xs text-slate-500">Pop: {rank.population.toLocaleString()}</div>
                                    )}
                                </TableCell>
                                <TableCell className="text-center">
                                    <Badge variant="outline">{rank.totalClubs}</Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                    {rank.topFlightClubs > 0 ? (
                                        <Badge className="bg-amber-100 text-amber-700">{rank.topFlightClubs}</Badge>
                                    ) : (
                                        <span className="text-slate-400">-</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-center hidden md:table-cell">
                                    {rank.totalLeagueTitles > 0 ? (
                                        <span className="font-bold text-emerald-600">{rank.totalLeagueTitles}</span>
                                    ) : (
                                        <span className="text-slate-400">-</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-center hidden lg:table-cell">
                                    {rank.totalCupTitles > 0 ? (
                                        <span className="font-semibold text-orange-600">{rank.totalCupTitles}</span>
                                    ) : (
                                        <span className="text-slate-400">-</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-center hidden lg:table-cell">
                                    {rank.totalContinentalTitles > 0 ? (
                                        <span className="font-semibold text-purple-600">{rank.totalContinentalTitles}</span>
                                    ) : (
                                        <span className="text-slate-400">-</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-center">
                                    <div className="flex items-center justify-center gap-1">
                                        <Trophy className="w-4 h-4 text-amber-500" />
                                        <span className="font-bold">{rank.trophyScore}</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}