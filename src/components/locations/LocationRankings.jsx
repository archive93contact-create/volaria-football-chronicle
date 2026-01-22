import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Star, Shield, Medal, MapPin } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function LocationRankings({ location, allClubs, allLeagues }) {
    const rankedClubs = useMemo(() => {
        if (!location || !allClubs || allClubs.length === 0) return [];

        // Get clubs in this specific location
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

        // Calculate scores for each club
        const scoredClubs = locationClubs.map(club => {
            const league = allLeagues.find(l => l.id === club.league_id);

            // Calculate club metrics
            const leagueTitles = club.league_titles || 0;
            const lowerTierTitles = club.lower_tier_titles || 0;
            const cupTitles = club.domestic_cup_titles || 0;
            const vccTitles = club.vcc_titles || 0;
            const cccTitles = club.ccc_titles || 0;
            const seasonsTopFlight = club.seasons_top_flight || 0;
            const currentTier = league?.tier || 99;
            const bestFinish = club.best_finish || 99;
            const bestFinishTier = club.best_finish_tier || 99;

            // Comprehensive scoring system
            const score = (
                // Major trophies (highest weight)
                (vccTitles * 100) +
                (cccTitles * 50) +
                (leagueTitles * 20) +
                
                // Minor trophies (lower weight)
                (cupTitles * 8) +
                (lowerTierTitles * 3) +
                
                // Historical presence (longevity and tier)
                (seasonsTopFlight * 2) +
                
                // Current status (tier bonus)
                (currentTier === 1 ? 15 : currentTier === 2 ? 8 : currentTier === 3 ? 4 : currentTier === 4 ? 2 : 0) +
                
                // Best finish bonus (only if in top tier)
                (bestFinishTier === 1 && bestFinish <= 3 ? (4 - bestFinish) * 5 : 0) +
                (bestFinishTier === 1 && bestFinish <= 10 ? 2 : 0)
            );

            return {
                club,
                leagueTitles,
                cupTitles,
                vccTitles,
                cccTitles,
                isTopFlight,
                score,
                league,
            };
        });

        // Sort by score descending
        return scoredClubs.sort((a, b) => b.score - a.score);
    }, [location, allClubs, allLeagues]);

    if (rankedClubs.length === 0) {
        return (
            <Card className="border-dashed border-2 border-slate-300">
                <CardContent className="flex flex-col items-center justify-center py-12">
                    <Shield className="w-12 h-12 text-slate-300 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">No Clubs Found</h3>
                    <p className="text-slate-500">No clubs in this {location?.type}</p>
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
                    Club Rankings in {location?.name}
                    <Badge variant="outline" className="ml-2">{rankedClubs.length} Clubs</Badge>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50">
                            <TableHead className="w-16">#</TableHead>
                            <TableHead>Club</TableHead>
                            <TableHead className="text-center">Current League</TableHead>
                            <TableHead className="text-center">League 🏆</TableHead>
                            <TableHead className="text-center hidden md:table-cell">Cups</TableHead>
                            <TableHead className="text-center hidden lg:table-cell">VCC</TableHead>
                            <TableHead className="text-center hidden lg:table-cell">CCC</TableHead>
                            <TableHead className="text-center font-bold">Score</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rankedClubs.map((ranked, idx) => {
                            const rank = idx + 1;
                            const club = ranked.club;
                            
                            return (
                                <TableRow 
                                    key={club.id}
                                    className={`hover:bg-slate-50 ${rank <= 3 ? 'bg-amber-50/30' : ''}`}
                                >
                                    <TableCell className="font-bold">
                                        <div className="flex items-center justify-center">
                                            {getRankBadge(rank)}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Link 
                                            to={createPageUrl(`ClubDetail?id=${club.id}`)}
                                            className="font-medium hover:text-emerald-600 hover:underline flex items-center gap-2"
                                        >
                                            {club.logo_url && (
                                                <img src={club.logo_url} alt={club.name} className="w-6 h-6 object-contain bg-white rounded p-0.5" />
                                            )}
                                            {club.name}
                                        </Link>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {ranked.league ? (
                                            <Badge variant="outline" className={`text-xs ${ranked.isTopFlight ? 'border-amber-500 text-amber-700' : ''}`}>
                                                {ranked.league.name}
                                            </Badge>
                                        ) : (
                                            <span className="text-slate-300 text-xs">-</span>
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
                                        {ranked.vccTitles > 0 ? (
                                            <span className="font-bold text-purple-600">{ranked.vccTitles}</span>
                                        ) : (
                                            <span className="text-slate-300">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center hidden lg:table-cell">
                                        {ranked.cccTitles > 0 ? (
                                            <span className="font-bold text-blue-600">{ranked.cccTitles}</span>
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