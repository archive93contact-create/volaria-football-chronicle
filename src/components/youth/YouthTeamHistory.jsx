import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, Award, TrendingUp } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function YouthTeamHistory({ youthTeam, allLeagues }) {
    // Filter seasons for this youth team's league
    const teamSeasons = seasons
        .filter(s => s.league_id === youthTeam.league_id)
        .sort((a, b) => b.year.localeCompare(a.year));

    const league = allLeagues.find(l => l.id === youthTeam.league_id);

    return (
        <div className="space-y-6">
            {/* Trophy Haul */}
            <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-yellow-50">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-amber-600" />
                        Youth Trophy Haul
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-white rounded-lg text-center">
                            <Trophy className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                            <div className="text-3xl font-bold text-amber-700">{youthTeam.youth_league_titles || 0}</div>
                            <div className="text-sm text-slate-600">League Titles</div>
                            {youthTeam.youth_league_title_years && (
                                <div className="text-xs text-slate-500 mt-1">{youthTeam.youth_league_title_years}</div>
                            )}
                        </div>
                        <div className="p-4 bg-white rounded-lg text-center">
                            <Award className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                            <div className="text-3xl font-bold text-orange-700">{youthTeam.youth_cup_titles || 0}</div>
                            <div className="text-sm text-slate-600">Cup Titles</div>
                            {youthTeam.youth_cup_title_years && (
                                <div className="text-xs text-slate-500 mt-1">{youthTeam.youth_cup_title_years}</div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Season History */}
            {teamSeasons.length > 0 ? (
                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle>Season History</CardTitle>
                        {league && (
                            <div className="text-sm text-slate-600">
                                <Link to={createPageUrl(`LeagueDetail?id=${league.id}`)} className="text-indigo-600 hover:underline">
                                    {league.name}
                                </Link>
                            </div>
                        )}
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-100">
                                    <TableHead>Season</TableHead>
                                    <TableHead className="text-center">Pos</TableHead>
                                    <TableHead className="text-center">P</TableHead>
                                    <TableHead className="text-center">W</TableHead>
                                    <TableHead className="text-center">D</TableHead>
                                    <TableHead className="text-center">L</TableHead>
                                    <TableHead className="text-center">Pts</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {teamSeasons.map((season) => (
                                    <TableRow key={season.id}>
                                        <TableCell className="font-medium">{season.year}</TableCell>
                                        <TableCell className="text-center">
                                            <span className="flex items-center justify-center gap-1">
                                                {season.position}
                                                {season.status === 'champion' && <Trophy className="w-4 h-4 text-amber-500" />}
                                                {season.status === 'promoted' && <TrendingUp className="w-4 h-4 text-green-500" />}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-center">{season.played}</TableCell>
                                        <TableCell className="text-center">{season.won}</TableCell>
                                        <TableCell className="text-center">{season.drawn}</TableCell>
                                        <TableCell className="text-center">{season.lost}</TableCell>
                                        <TableCell className="text-center font-bold">{season.points}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            ) : (
                <Card className="border-dashed border-2 border-slate-300">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Trophy className="w-12 h-12 text-slate-300 mb-3" />
                        <p className="text-slate-500">No season history recorded yet</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}