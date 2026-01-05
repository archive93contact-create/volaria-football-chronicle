import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Crown, Award, Shield, Target, Users, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function CupHistoricalStats({ seasons, clubs, cup }) {
    const stats = useMemo(() => {
        if (!seasons || seasons.length === 0) return null;

        // Most successful clubs per decade
        const decadeChampions = {};
        seasons.forEach(season => {
            if (!season.champion_name || !season.year) return;
            const year = parseInt(season.year.split('-')[0]);
            const decade = Math.floor(year / 10) * 10;
            if (!decadeChampions[decade]) decadeChampions[decade] = {};
            const champ = season.champion_name.trim();
            decadeChampions[decade][champ] = (decadeChampions[decade][champ] || 0) + 1;
        });

        const decadeStats = Object.entries(decadeChampions).map(([decade, champions]) => {
            const topChampion = Object.entries(champions).sort((a, b) => b[1] - a[1])[0];
            const totalSeasons = Object.values(champions).reduce((sum, count) => sum + count, 0);
            const uniqueChampions = Object.keys(champions).length;
            return {
                decade: `${decade}s`,
                champion: topChampion[0],
                titles: topChampion[1],
                totalSeasons,
                uniqueChampions,
                allChampions: champions
            };
        }).sort((a, b) => b.decade.localeCompare(a.decade));

        // Most runner-up finishes
        const runnerUpCounts = {};
        seasons.forEach(season => {
            if (season.runner_up) {
                const name = season.runner_up.trim();
                runnerUpCounts[name] = (runnerUpCounts[name] || 0) + 1;
            }
        });
        const mostRunnerUps = Object.entries(runnerUpCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        // Different champions (competitiveness)
        const uniqueChampions = [...new Set(seasons.map(s => s.champion_name).filter(Boolean))];

        // Back-to-back winners
        const backToBackWins = [];
        const sortedSeasons = [...seasons].sort((a, b) => a.year.localeCompare(b.year));
        for (let i = 1; i < sortedSeasons.length; i++) {
            const prev = sortedSeasons[i - 1];
            const curr = sortedSeasons[i];
            if (prev.champion_name && prev.champion_name === curr.champion_name) {
                const existing = backToBackWins.find(b => b.club === prev.champion_name);
                if (existing) {
                    existing.count++;
                    if (!existing.years.includes(curr.year)) existing.years.push(curr.year);
                    if (!existing.years.includes(prev.year)) existing.years.unshift(prev.year);
                } else {
                    backToBackWins.push({
                        club: prev.champion_name,
                        count: 1,
                        years: [prev.year, curr.year]
                    });
                }
            }
        }
        const mostBackToBack = backToBackWins.sort((a, b) => b.count - a.count).slice(0, 3);

        // One-time winners
        const titleCounts = {};
        seasons.forEach(s => {
            if (s.champion_name) {
                const name = s.champion_name.trim();
                titleCounts[name] = (titleCounts[name] || 0) + 1;
            }
        });
        const oneTimeWinners = Object.entries(titleCounts)
            .filter(([name, count]) => count === 1)
            .map(([name]) => {
                const season = seasons.find(s => s.champion_name?.trim() === name);
                return { name, year: season?.year };
            })
            .sort((a, b) => (b.year || '').localeCompare(a.year || ''));

        // Most finals reached
        const finalsCounts = {};
        seasons.forEach(s => {
            if (s.champion_name) {
                const name = s.champion_name.trim();
                finalsCounts[name] = (finalsCounts[name] || 0) + 1;
            }
            if (s.runner_up) {
                const name = s.runner_up.trim();
                finalsCounts[name] = (finalsCounts[name] || 0) + 1;
            }
        });
        const mostFinals = Object.entries(finalsCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8);

        return {
            decadeStats,
            mostRunnerUps,
            uniqueChampions: uniqueChampions.length,
            mostBackToBack,
            oneTimeWinners,
            mostFinals
        };
    }, [seasons]);

    if (!stats) return null;

    return (
        <div className="space-y-6">
            {/* Decade by Decade Dominance */}
            {stats.decadeStats.length > 0 && (
                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-purple-500" />
                            Decade by Decade Dominance
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {stats.decadeStats.map(({ decade, champion, titles, totalSeasons, uniqueChampions, allChampions }) => (
                                <div key={decade} className="p-4 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-3">
                                            <div className="text-2xl font-bold text-purple-700">{decade}</div>
                                            <div className="text-slate-500 text-sm">({totalSeasons} edition{totalSeasons > 1 ? 's' : ''})</div>
                                        </div>
                                        <Badge className="bg-purple-500">
                                            {uniqueChampions} different winner{uniqueChampions > 1 ? 's' : ''}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Crown className="w-5 h-5 text-amber-500" />
                                        <span className="font-bold text-lg">{champion}</span>
                                        <span className="text-purple-600">won {titles}/{totalSeasons}</span>
                                    </div>
                                    {uniqueChampions > 1 && (
                                        <div className="mt-2 text-xs text-slate-600">
                                            Also won: {Object.entries(allChampions)
                                                .filter(([name]) => name !== champion)
                                                .sort((a, b) => b[1] - a[1])
                                                .map(([name, count]) => `${name} (${count})`)
                                                .join(', ')}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Most Finals Reached */}
                {stats.mostFinals.length > 0 && (
                    <Card className="border-0 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Trophy className="w-5 h-5 text-blue-500" />
                                Most Finals Reached
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50">
                                        <TableHead className="w-12">#</TableHead>
                                        <TableHead>Club</TableHead>
                                        <TableHead className="text-center">Finals</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {stats.mostFinals.map(([name, count], idx) => {
                                        const club = clubs.find(c => c.name === name);
                                        return (
                                            <TableRow key={name}>
                                                <TableCell className="font-bold text-slate-400">{idx + 1}</TableCell>
                                                <TableCell className="font-medium">
                                                    {club ? (
                                                        <Link to={createPageUrl(`ClubDetail?id=${club.id}`)} className="hover:text-emerald-600 hover:underline flex items-center gap-2">
                                                            {club.logo_url && <img src={club.logo_url} alt="" className="w-6 h-6 object-contain" />}
                                                            {name}
                                                        </Link>
                                                    ) : name}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <span className="font-bold text-blue-600">{count}</span>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}

                {/* Back-to-Back Winners */}
                {stats.mostBackToBack.length > 0 && (
                    <Card className="border-0 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Trophy className="w-5 h-5 text-amber-500" />
                                Consecutive Wins
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {stats.mostBackToBack.map(({ club, count, years }, idx) => {
                                    const clubData = clubs.find(c => c.name === club);
                                    return (
                                        <div key={club} className="flex items-center gap-3 p-3 rounded-lg bg-amber-50">
                                            <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold">
                                                {idx + 1}
                                            </div>
                                            {clubData?.logo_url && <img src={clubData.logo_url} alt="" className="w-8 h-8 object-contain" />}
                                            <div className="flex-1">
                                                <div className="font-bold">{club}</div>
                                                <div className="text-sm text-amber-700">
                                                    {count + 1} in a row
                                                    <span className="text-xs text-amber-600 ml-1">({years.join(', ')})</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Most Runner-Up Finishes */}
                {stats.mostRunnerUps.length > 0 && (
                    <Card className="border-0 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Target className="w-5 h-5 text-slate-500" />
                                Most Runner-Up Finishes
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50">
                                        <TableHead>Club</TableHead>
                                        <TableHead className="text-center">2nd Place</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {stats.mostRunnerUps.map(([name, count]) => {
                                        const club = clubs.find(c => c.name === name);
                                        const hasWon = seasons.some(s => s.champion_name?.trim() === name);
                                        return (
                                            <TableRow key={name}>
                                                <TableCell className="font-medium">
                                                    {club ? (
                                                        <Link to={createPageUrl(`ClubDetail?id=${club.id}`)} className="hover:text-emerald-600 hover:underline flex items-center gap-2">
                                                            {club.logo_url && <img src={club.logo_url} alt="" className="w-6 h-6 object-contain" />}
                                                            {name}
                                                        </Link>
                                                    ) : name}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <span className={hasWon ? 'text-slate-600' : 'text-red-600 font-bold'}>
                                                        {count}
                                                        {!hasWon && <span className="text-xs ml-1">(never won)</span>}
                                                    </span>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}

                {/* One-Time Winners */}
                {stats.oneTimeWinners.length > 0 && (
                    <Card className="border-0 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Award className="w-5 h-5 text-emerald-500" />
                                One-Time Winners ({stats.oneTimeWinners.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-2">
                                {stats.oneTimeWinners.map(({ name, year }) => {
                                    const club = clubs.find(c => c.name === name);
                                    return (
                                        <div key={name} className="px-3 py-2 bg-emerald-50 rounded-lg border border-emerald-200">
                                            {club ? (
                                                <Link to={createPageUrl(`ClubDetail?id=${club.id}`)} className="hover:text-emerald-700">
                                                    <span className="font-medium">{name}</span>
                                                    <span className="text-xs text-emerald-600 ml-1">({year})</span>
                                                </Link>
                                            ) : (
                                                <>
                                                    <span className="font-medium">{name}</span>
                                                    <span className="text-xs text-emerald-600 ml-1">({year})</span>
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            <p className="text-xs text-slate-500 mt-3 italic">
                                Clubs that lifted the cup exactly once - unforgettable moments
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Competition Summary */}
            <Card className="border-0 shadow-sm bg-gradient-to-r from-slate-50 to-slate-100">
                <CardContent className="p-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                        <div>
                            <Users className="w-6 h-6 text-slate-500 mx-auto mb-2" />
                            <div className="text-3xl font-bold text-slate-700">{stats.uniqueChampions.length}</div>
                            <div className="text-sm text-slate-500">Different Winners</div>
                        </div>
                        <div>
                            <Trophy className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                            <div className="text-3xl font-bold text-amber-600">{seasons.length}</div>
                            <div className="text-sm text-slate-500">Total Editions</div>
                        </div>
                        <div>
                            <Target className="w-6 h-6 text-slate-500 mx-auto mb-2" />
                            <div className="text-3xl font-bold text-slate-600">{stats.mostRunnerUps.length > 0 ? stats.mostRunnerUps[0][1] : 0}</div>
                            <div className="text-sm text-slate-500">Most Finals Lost</div>
                        </div>
                        <div>
                            <Award className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                            <div className="text-3xl font-bold text-emerald-600">{stats.oneTimeWinners.length}</div>
                            <div className="text-sm text-slate-500">One-Time Winners</div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}