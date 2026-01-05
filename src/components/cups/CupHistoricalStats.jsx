import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Clock, Crown, Calendar, Award, Shield, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function CupHistoricalStats({ seasons, clubs, isNational = true }) {
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
            const totalEditions = Object.values(champions).reduce((sum, count) => sum + count, 0);
            const uniqueChampions = Object.keys(champions).length;
            return {
                decade: `${decade}s`,
                champion: topChampion[0],
                titles: topChampion[1],
                totalEditions,
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

        // Title defenses (back-to-back wins)
        const titleDefenses = [];
        const sortedSeasons = [...seasons].sort((a, b) => a.year.localeCompare(b.year));
        for (let i = 1; i < sortedSeasons.length; i++) {
            const prev = sortedSeasons[i - 1];
            const curr = sortedSeasons[i];
            if (prev.champion_name && prev.champion_name === curr.champion_name) {
                const existing = titleDefenses.find(td => td.club === prev.champion_name);
                if (existing) {
                    existing.count++;
                    if (!existing.streakYears.includes(curr.year)) existing.streakYears.push(curr.year);
                    if (!existing.streakYears.includes(prev.year)) existing.streakYears.unshift(prev.year);
                } else {
                    titleDefenses.push({
                        club: prev.champion_name,
                        nation: prev.champion_nation,
                        count: 1,
                        streakYears: [prev.year, curr.year]
                    });
                }
            }
        }
        const mostTitleDefenses = titleDefenses.sort((a, b) => b.count - a.count).slice(0, 3);

        // One-time champions
        const titleCounts = {};
        seasons.forEach(s => {
            if (s.champion_name) {
                const name = s.champion_name.trim();
                titleCounts[name] = (titleCounts[name] || 0) + 1;
            }
        });
        const oneTimeChampions = Object.entries(titleCounts)
            .filter(([name, count]) => count === 1)
            .map(([name]) => {
                const season = seasons.find(s => s.champion_name?.trim() === name);
                return { 
                    name, 
                    year: season?.year,
                    nation: season?.champion_nation
                };
            })
            .sort((a, b) => (b.year || '').localeCompare(a.year || ''));

        // Different champions
        const uniqueChampions = [...new Set(seasons.map(s => s.champion_name).filter(Boolean))];

        // For continental cups - titles by nation
        const titlesByNation = {};
        if (!isNational) {
            seasons.forEach(s => {
                if (s.champion_nation) {
                    titlesByNation[s.champion_nation] = (titlesByNation[s.champion_nation] || 0) + 1;
                }
            });
        }
        const mostSuccessfulNations = Object.entries(titlesByNation)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        return {
            decadeStats,
            mostRunnerUps,
            mostTitleDefenses,
            oneTimeChampions,
            uniqueChampions: uniqueChampions.length,
            mostSuccessfulNations
        };
    }, [seasons, isNational]);

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
                            {stats.decadeStats.map(({ decade, champion, titles, totalEditions, uniqueChampions, allChampions }) => (
                                <div key={decade} className="p-4 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-3">
                                            <div className="text-2xl font-bold text-purple-700">{decade}</div>
                                            <div className="text-slate-500 text-sm">({totalEditions} edition{totalEditions > 1 ? 's' : ''})</div>
                                        </div>
                                        <Badge className="bg-purple-500">
                                            {uniqueChampions} different winner{uniqueChampions > 1 ? 's' : ''}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Crown className="w-5 h-5 text-amber-500" />
                                        <span className="font-bold text-lg">{champion}</span>
                                        <span className="text-purple-600">won {titles}/{totalEditions}</span>
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
                {/* Title Defenses */}
                {stats.mostTitleDefenses.length > 0 && (
                    <Card className="border-0 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Trophy className="w-5 h-5 text-amber-500" />
                                Back-to-Back Champions
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {stats.mostTitleDefenses.map(({ club, nation, count, streakYears }, idx) => {
                                    const clubData = clubs.find(c => c.name === club);
                                    return (
                                        <div key={club} className="flex items-center gap-3 p-3 rounded-lg bg-amber-50">
                                            <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold">
                                                {idx + 1}
                                            </div>
                                            {clubData?.logo_url && <img src={clubData.logo_url} alt="" className="w-8 h-8 object-contain" />}
                                            <div className="flex-1">
                                                <div className="font-bold">{club}</div>
                                                {!isNational && nation && <div className="text-xs text-slate-500">{nation}</div>}
                                                <div className="text-sm text-amber-700">
                                                    {count} successful defense{count > 1 ? 's' : ''}
                                                    <span className="text-xs text-amber-600 ml-1">({streakYears.join(', ')})</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                )}

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
            </div>

            {/* Most Successful Nations (Continental only) */}
            {!isNational && stats.mostSuccessfulNations.length > 0 && (
                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-blue-500" />
                            Most Successful Nations
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            {stats.mostSuccessfulNations.map(([nation, count], idx) => (
                                <div key={nation} className="p-4 rounded-lg bg-blue-50 text-center">
                                    <div className="text-3xl font-bold text-blue-600 mb-1">{count}</div>
                                    <div className="text-sm font-medium text-slate-700">{nation}</div>
                                    {idx === 0 && (
                                        <Crown className="w-4 h-4 text-amber-500 mx-auto mt-2" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* One-Time Champions */}
            {stats.oneTimeChampions.length > 0 && (
                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Award className="w-5 h-5 text-emerald-500" />
                            One-Time Champions ({stats.oneTimeChampions.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {stats.oneTimeChampions.map(({ name, year, nation }) => {
                                const club = clubs.find(c => c.name === name);
                                return (
                                    <div key={name} className="px-3 py-2 bg-emerald-50 rounded-lg border border-emerald-200">
                                        {club ? (
                                            <Link to={createPageUrl(`ClubDetail?id=${club.id}`)} className="hover:text-emerald-700">
                                                <span className="font-medium">{name}</span>
                                                {!isNational && nation && <span className="text-xs text-emerald-600 ml-1">({nation})</span>}
                                                <span className="text-xs text-emerald-600 ml-1">{year}</span>
                                            </Link>
                                        ) : (
                                            <>
                                                <span className="font-medium">{name}</span>
                                                {!isNational && nation && <span className="text-xs text-emerald-600 ml-1">({nation})</span>}
                                                <span className="text-xs text-emerald-600 ml-1">{year}</span>
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        <p className="text-xs text-slate-500 mt-3 italic">
                            Clubs that won the cup exactly once - their moment of glory
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Competition Summary */}
            <Card className="border-0 shadow-sm bg-gradient-to-r from-slate-50 to-slate-100">
                <CardContent className="p-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-center">
                        <div>
                            <Trophy className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                            <div className="text-3xl font-bold text-slate-700">{seasons.length}</div>
                            <div className="text-sm text-slate-500">Total Editions</div>
                        </div>
                        <div>
                            <Shield className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                            <div className="text-3xl font-bold text-emerald-600">{stats.uniqueChampions}</div>
                            <div className="text-sm text-slate-500">Different Champions</div>
                        </div>
                        <div>
                            <Award className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                            <div className="text-3xl font-bold text-purple-600">{stats.oneTimeChampions.length}</div>
                            <div className="text-sm text-slate-500">One-Time Winners</div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}