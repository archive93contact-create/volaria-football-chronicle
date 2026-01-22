import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Star, Shield, Medal, MapPin } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function LocationRankings({ allLocations, allClubs, allLeagues, locationType = 'all' }) {
    const rankedLocations = useMemo(() => {
        if (!allLocations || allLocations.length === 0) return [];

        // Filter by location type if specified
        const locations = locationType === 'all' 
            ? allLocations 
            : allLocations.filter(loc => loc.type === locationType);

        // Calculate scores for each location
        const scoredLocations = locations.map(location => {
            // Get clubs in this location
            const locationClubs = allClubs.filter(club => {
                if (location.type === 'settlement') {
                    return club.settlement === location.name;
                } else if (location.type === 'district') {
                    return club.district === location.name;
                } else if (location.type === 'region') {
                    return club.region === location.name;
                }
                return false;
            });

            // Calculate metrics
            const totalClubs = locationClubs.length;
            const leagueTitles = locationClubs.reduce((sum, c) => sum + (c.league_titles || 0), 0);
            const cupTitles = locationClubs.reduce((sum, c) => sum + (c.domestic_cup_titles || 0), 0);
            const vccTitles = locationClubs.reduce((sum, c) => sum + (c.vcc_titles || 0), 0);
            const cccTitles = locationClubs.reduce((sum, c) => sum + (c.ccc_titles || 0), 0);
            const topFlightClubs = locationClubs.filter(c => {
                const league = allLeagues.find(l => l.id === c.league_id);
                return league?.tier === 1;
            }).length;
            const professionalClubs = locationClubs.filter(c => c.professional_status === 'professional').length;

            // Scoring system
            const score = (
                (vccTitles * 100) +
                (cccTitles * 50) +
                (leagueTitles * 20) +
                (cupTitles * 5) +
                (topFlightClubs * 10) +
                (professionalClubs * 3) +
                (totalClubs * 1)
            );

            return {
                location,
                totalClubs,
                leagueTitles,
                cupTitles,
                vccTitles,
                cccTitles,
                topFlightClubs,
                professionalClubs,
                score,
                population: location.population || 0,
            };
        });

        // Sort by score descending
        return scoredLocations
            .filter(sl => sl.totalClubs > 0) // Only locations with clubs
            .sort((a, b) => b.score - a.score);
    }, [allLocations, allClubs, allLeagues, locationType]);

    if (rankedLocations.length === 0) {
        return (
            <Card className="border-dashed border-2 border-slate-300">
                <CardContent className="flex flex-col items-center justify-center py-12">
                    <MapPin className="w-12 h-12 text-slate-300 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">No Rankings Available</h3>
                    <p className="text-slate-500">Add clubs to locations to generate rankings</p>
                </CardContent>
            </Card>
        );
    }

    const getRankBadge = (rank) => {
        if (rank === 1) return <Medal className="w-5 h-5 text-amber-500 fill-amber-500" />;
        if (rank === 2) return <Medal className="w-5 h-5 text-slate-400 fill-slate-400" />;
        if (rank === 3) return <Medal className="w-5 h-5 text-orange-600 fill-orange-600" />;
        return <span className="w-5 text-center font-bold text-slate-400">{rank}</span>;
    };

    return (
        <Card className="border-0 shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-500" />
                    Location Football Rankings
                    <Badge variant="outline" className="ml-2">{rankedLocations.length} Ranked</Badge>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50">
                            <TableHead className="w-16">#</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead className="text-center">Type</TableHead>
                            <TableHead className="text-center hidden md:table-cell">Clubs</TableHead>
                            <TableHead className="text-center hidden lg:table-cell">Top Flight</TableHead>
                            <TableHead className="text-center">League 🏆</TableHead>
                            <TableHead className="text-center hidden md:table-cell">Cups</TableHead>
                            <TableHead className="text-center hidden lg:table-cell">Continental</TableHead>
                            <TableHead className="text-center font-bold">Score</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rankedLocations.map((ranked, idx) => {
                            const rank = idx + 1;
                            const location = ranked.location;
                            
                            return (
                                <TableRow 
                                    key={location.id}
                                    className={`hover:bg-slate-50 ${rank <= 3 ? 'bg-amber-50/30' : ''}`}
                                >
                                    <TableCell className="font-bold">
                                        <div className="flex items-center justify-center">
                                            {getRankBadge(rank)}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Link 
                                            to={createPageUrl(`LocationDetail?id=${location.id}`)}
                                            className="font-medium hover:text-emerald-600 hover:underline flex items-center gap-2"
                                        >
                                            {location.name}
                                            {location.is_capital && <Star className="w-4 h-4 text-amber-500 fill-amber-500" />}
                                        </Link>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant="outline" className="text-xs">
                                            {location.type === 'settlement' ? location.settlement_size || 'town' : location.type}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-center font-semibold hidden md:table-cell">
                                        {ranked.totalClubs}
                                    </TableCell>
                                    <TableCell className="text-center hidden lg:table-cell">
                                        {ranked.topFlightClubs > 0 ? (
                                            <span className="font-semibold text-amber-600">{ranked.topFlightClubs}</span>
                                        ) : (
                                            <span className="text-slate-300">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {ranked.leagueTitles > 0 ? (
                                            <span className="font-bold text-emerald-600">{ranked.leagueTitles}</span>
                                        ) : (
                                            <span className="text-slate-300">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center hidden md:table-cell">
                                        {ranked.cupTitles > 0 ? (
                                            <span className="font-semibold text-orange-600">{ranked.cupTitles}</span>
                                        ) : (
                                            <span className="text-slate-300">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center hidden lg:table-cell">
                                        {(ranked.vccTitles + ranked.cccTitles) > 0 ? (
                                            <span className="font-bold text-purple-600">
                                                {ranked.vccTitles + ranked.cccTitles}
                                            </span>
                                        ) : (
                                            <span className="text-slate-300">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <span className="font-bold text-lg text-slate-900">{ranked.score}</span>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}