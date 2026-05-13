import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Activity, Calendar, Filter, Trophy, Shield, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ClubMatchHistory({ club, leagues }) {
    const [filterComp, setFilterComp] = useState('all');

    const { data: matches = [], isLoading } = useQuery({
        queryKey: ['clubMatches', club.id],
        queryFn: () => base44.entities.Match.filter(
            { $or: [{ home_club_id: club.id }, { away_club_id: club.id }] }
        ).catch(() => base44.entities.Match.list('-match_date', 500).then(all =>
            all.filter(m => m.home_club_id === club.id || m.away_club_id === club.id)
        )),
        staleTime: 2 * 60 * 1000,
    });

    // Filter by fetching all and filtering client-side (since OR filter may not be supported)
    const { data: allMatches = [] } = useQuery({
        queryKey: ['allMatchesForClub', club.id],
        queryFn: async () => {
            const all = await base44.entities.Match.list('-match_date', 500);
            return all.filter(m => m.home_club_id === club.id || m.away_club_id === club.id);
        },
        staleTime: 2 * 60 * 1000,
    });

    const played = allMatches.filter(m => m.home_score !== null && m.home_score !== undefined);
    const upcoming = allMatches.filter(m => m.home_score === null || m.home_score === undefined);

    const getResult = (m) => {
        const isHome = m.home_club_id === club.id;
        const scored = isHome ? m.home_score : m.away_score;
        const conceded = isHome ? m.away_score : m.home_score;
        if (scored > conceded) return 'W';
        if (scored === conceded) return 'D';
        return 'L';
    };

    const getOpponent = (m) => m.home_club_id === club.id ? m.away_club_name : m.home_club_name;

    const getScore = (m) => {
        const isHome = m.home_club_id === club.id;
        return isHome ? `${m.home_score}–${m.away_score}` : `${m.away_score}–${m.home_score}`;
    };

    const filteredPlayed = filterComp === 'all' ? played : played.filter(m => m.league_id === filterComp);
    const filteredUpcoming = filterComp === 'all' ? upcoming : upcoming.filter(m => m.league_id === filterComp);

    // Win/Draw/Loss stats
    const wins = played.filter(m => getResult(m) === 'W').length;
    const draws = played.filter(m => getResult(m) === 'D').length;
    const losses = played.filter(m => getResult(m) === 'L').length;

    const uniqueLeagueIds = [...new Set(allMatches.map(m => m.league_id).filter(Boolean))];
    const matchLeagues = leagues.filter(l => uniqueLeagueIds.includes(l.id));

    if (isLoading) return null;

    return (
        <div className="space-y-4">
            {/* Summary bar */}
            {played.length > 0 && (
                <div className="grid grid-cols-4 gap-3">
                    <div className="text-center p-3 bg-slate-50 rounded-lg">
                        <div className="text-xl font-bold">{played.length}</div>
                        <div className="text-xs text-slate-500">Played</div>
                    </div>
                    <div className="text-center p-3 bg-emerald-50 rounded-lg">
                        <div className="text-xl font-bold text-emerald-700">{wins}</div>
                        <div className="text-xs text-emerald-600">Won</div>
                    </div>
                    <div className="text-center p-3 bg-slate-50 rounded-lg">
                        <div className="text-xl font-bold text-slate-600">{draws}</div>
                        <div className="text-xs text-slate-500">Drawn</div>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                        <div className="text-xl font-bold text-red-700">{losses}</div>
                        <div className="text-xs text-red-600">Lost</div>
                    </div>
                </div>
            )}

            {/* Filter */}
            {matchLeagues.length > 1 && (
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-slate-400" />
                    <Select value={filterComp} onValueChange={setFilterComp}>
                        <SelectTrigger className="w-44">
                            <SelectValue placeholder="All competitions" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All competitions</SelectItem>
                            {matchLeagues.map(l => (
                                <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            <Tabs defaultValue="results">
                <TabsList>
                    <TabsTrigger value="results">
                        <Activity className="w-4 h-4 mr-1" /> Results ({filteredPlayed.length})
                    </TabsTrigger>
                    <TabsTrigger value="fixtures">
                        <Calendar className="w-4 h-4 mr-1" /> Fixtures ({filteredUpcoming.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="results">
                    {filteredPlayed.length === 0 ? (
                        <Card className="border-dashed border-2 border-slate-200 mt-3">
                            <CardContent className="py-10 text-center text-slate-400">No results yet</CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-2 mt-3">
                            {filteredPlayed.map(m => {
                                const result = getResult(m);
                                const league = leagues.find(l => l.id === m.league_id);
                                return (
                                    <div key={m.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-100 hover:border-slate-300 transition-colors">
                                        <span className={`w-7 h-7 rounded flex items-center justify-center text-xs font-bold text-white shrink-0 ${result === 'W' ? 'bg-emerald-500' : result === 'D' ? 'bg-slate-400' : 'bg-red-500'}`}>
                                            {result}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-medium text-sm">{getOpponent(m)}</span>
                                                <span className="text-xs text-slate-400">
                                                    {m.home_club_id === club.id ? 'H' : 'A'}
                                                </span>
                                                {m.is_derby && <Badge className="text-xs bg-red-100 text-red-700">Derby</Badge>}
                                            </div>
                                            <div className="text-xs text-slate-400 flex items-center gap-2">
                                                {league && <span>{league.name}</span>}
                                                {m.matchday && <span>· MD{m.matchday}</span>}
                                                {m.match_date && <span>· {m.match_date}</span>}
                                            </div>
                                        </div>
                                        <div className="font-bold text-sm shrink-0 bg-slate-800 text-white px-2 py-1 rounded">
                                            {getScore(m)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="fixtures">
                    {filteredUpcoming.length === 0 ? (
                        <Card className="border-dashed border-2 border-slate-200 mt-3">
                            <CardContent className="py-10 text-center text-slate-400">No upcoming fixtures</CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-2 mt-3">
                            {filteredUpcoming.map(m => {
                                const league = leagues.find(l => l.id === m.league_id);
                                const isHome = m.home_club_id === club.id;
                                const opponent = isHome ? m.away_club_name : m.home_club_name;
                                return (
                                    <div key={m.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-100">
                                        <Calendar className="w-5 h-5 text-slate-400 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-sm">{opponent}</div>
                                            <div className="text-xs text-slate-400 flex items-center gap-2">
                                                {isHome ? 'Home' : 'Away'}
                                                {league && <span>· {league.name}</span>}
                                                {m.matchday && <span>· MD{m.matchday}</span>}
                                            </div>
                                        </div>
                                        <Badge variant="outline" className="text-xs text-slate-500 shrink-0">
                                            {m.match_date || 'TBD'}
                                        </Badge>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}