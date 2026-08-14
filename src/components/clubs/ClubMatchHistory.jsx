import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Activity, Calendar, Filter, ChevronDown } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const sortDate = (a, b) => {
    const da = a.match_date || '', db = b.match_date || '';
    if (da !== db) return da.localeCompare(db);
    return (a.matchday || 0) - (b.matchday || 0);
};

export default function ClubMatchHistory({ club, leagues }) {
    const [selectedYear, setSelectedYear] = useState(null);
    const [filterComp, setFilterComp] = useState('all');

    const { data: allMatches = [], isLoading } = useQuery({
        queryKey: ['clubMatches', club.id],
        queryFn: async () => {
            const all = await base44.entities.Match.list('-match_date', 500);
            return all.filter(m => m.home_club_id === club.id || m.away_club_id === club.id);
        },
        staleTime: 2 * 60 * 1000,
    });

    // Chronological (oldest first) for head-to-head "last 5 before this match"
    const chrono = useMemo(() => [...allMatches].sort(sortDate), [allMatches]);

    // Unique seasons, most recent first
    const years = useMemo(
        () => [...new Set(allMatches.map(m => m.year).filter(Boolean))].sort((a, b) => b.localeCompare(a)),
        [allMatches]
    );
    const currentYear = selectedYear || years[0] || null;

    // Opponent identifier (club_id preferred, fall back to name)
    const oppKey = (m) => {
        const isHome = m.home_club_id === club.id;
        const oid = isHome ? m.away_club_id : m.home_club_id;
        return oid || (isHome ? m.away_club_name : m.home_club_name);
    };
    const oppName = (m) => (m.home_club_id === club.id ? m.away_club_name : m.home_club_name);

    // Map opponent -> chronological list of all matches vs that opponent
    const h2hMap = useMemo(() => {
        const map = {};
        for (const m of chrono) {
            const k = oppKey(m);
            if (!map[k]) map[k] = [];
            map[k].push(m);
        }
        return map;
    }, [chrono]);

    const resultOf = (m) => {
        const isHome = m.home_club_id === club.id;
        const scored = isHome ? m.home_score : m.away_score;
        const conceded = isHome ? m.away_score : m.home_score;
        if (scored === null || scored === undefined) return null;
        if (scored > conceded) return 'W';
        if (scored === conceded) return 'D';
        return 'L';
    };

    // Head-to-head context for a single match
    const getH2H = (m) => {
        const key = oppKey(m);
        const allVs = h2hMap[key] || [];
        let w = 0, d = 0, l = 0;
        for (const x of allVs) {
            const r = resultOf(x);
            if (r === 'W') w++; else if (r === 'D') d++; else if (r === 'L') l++;
        }
        const idx = allVs.findIndex(x => x.id === m.id);
        const last5Raw = idx >= 0 ? allVs.slice(Math.max(0, idx - 5), idx) : [];
        const last5 = last5Raw.map(x => ({ r: resultOf(x), score: x }));
        return { w, d, l, total: w + d + l, last5 };
    };

    // Season matches
    const seasonMatches = currentYear ? allMatches.filter(m => m.year === currentYear) : [];
    const played = seasonMatches.filter(m => resultOf(m) !== null);
    const upcoming = seasonMatches.filter(m => resultOf(m) === null);

    const filteredPlayed = filterComp === 'all' ? played : played.filter(m => m.league_id === filterComp);
    const filteredUpcoming = filterComp === 'all' ? upcoming : upcoming.filter(m => m.league_id === filterComp);

    const playedSorted = [...filteredPlayed].sort((a, b) => -sortDate(a, b)); // most recent first
    const upcomingSorted = [...filteredUpcoming].sort(sortDate); // chronological

    // Summary for selected season
    const wins = played.filter(m => resultOf(m) === 'W').length;
    const draws = played.filter(m => resultOf(m) === 'D').length;
    const losses = played.filter(m => resultOf(m) === 'L').length;

    const uniqueLeagueIds = [...new Set(seasonMatches.map(m => m.league_id).filter(Boolean))];
    const matchLeagues = leagues.filter(l => uniqueLeagueIds.includes(l.id));

    if (isLoading) return null;

    const renderH2H = (m) => {
        const h = getH2H(m);
        if (h.total === 0 && h.last5.length === 0) return null;
        return (
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-[11px] text-slate-400">H2H:</span>
                <span className="text-[11px] font-medium text-slate-500">
                    {h.w}-{h.d}-{h.l}
                </span>
                {h.last5.length > 0 && (
                    <div className="flex items-center gap-1">
                        <span className="text-[11px] text-slate-400">L5</span>
                        {h.last5.map((g, i) => (
                            <span
                                key={i}
                                className={`w-4 h-4 rounded-sm flex items-center justify-center text-[9px] font-bold text-white ${
                                    g.r === 'W' ? 'bg-emerald-500' : g.r === 'D' ? 'bg-slate-400' : 'bg-red-500'
                                }`}
                                title={g.score ? `${g.score.match_date || ''} ${g.score.home_club_name} ${g.score.home_score}-${g.score.away_score} ${g.score.away_club_name}` : ''}
                            >
                                {g.r}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-4">
            {/* Season + competition controls */}
            <div className="flex flex-wrap items-center gap-3">
                {years.length > 0 && (
                    <Select value={currentYear || ''} onValueChange={setSelectedYear}>
                        <SelectTrigger className="w-40">
                            <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                            <SelectValue placeholder="Season" />
                        </SelectTrigger>
                        <SelectContent>
                            {years.map(y => (
                                <SelectItem key={y} value={y}>{y}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
                {matchLeagues.length > 1 && (
                    <Select value={filterComp} onValueChange={setFilterComp}>
                        <SelectTrigger className="w-44">
                            <Filter className="w-4 h-4 mr-2 text-slate-400" />
                            <SelectValue placeholder="All competitions" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All competitions</SelectItem>
                            {matchLeagues.map(l => (
                                <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </div>

            {/* Season summary */}
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

            <Tabs defaultValue="results">
                <TabsList>
                    <TabsTrigger value="results">
                        <Activity className="w-4 h-4 mr-1" /> Results ({playedSorted.length})
                    </TabsTrigger>
                    <TabsTrigger value="fixtures">
                        <Calendar className="w-4 h-4 mr-1" /> Fixtures ({upcomingSorted.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="results">
                    {playedSorted.length === 0 ? (
                        <Card className="border-dashed border-2 border-slate-200 mt-3">
                            <CardContent className="py-10 text-center text-slate-400">No results this season</CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-2 mt-3">
                            {playedSorted.map(m => {
                                const result = resultOf(m);
                                const league = leagues.find(l => l.id === m.league_id);
                                const isHome = m.home_club_id === club.id;
                                const score = isHome ? `${m.home_score}–${m.away_score}` : `${m.away_score}–${m.home_score}`;
                                return (
                                    <div key={m.id} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-slate-100 hover:border-slate-300 transition-colors">
                                        <span className={`w-7 h-7 rounded flex items-center justify-center text-xs font-bold text-white shrink-0 ${result === 'W' ? 'bg-emerald-500' : result === 'D' ? 'bg-slate-400' : 'bg-red-500'}`}>
                                            {result}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-medium text-sm">{oppName(m)}</span>
                                                <span className="text-xs text-slate-400">{isHome ? 'H' : 'A'}</span>
                                                {m.is_derby && <Badge className="text-xs bg-red-100 text-red-700">Derby</Badge>}
                                            </div>
                                            <div className="text-xs text-slate-400 flex items-center gap-2">
                                                {league && <span>{league.name}</span>}
                                                {m.matchday && <span>· MD{m.matchday}</span>}
                                                {m.match_date && <span>· {m.match_date}</span>}
                                            </div>
                                            {renderH2H(m)}
                                        </div>
                                        <div className="font-bold text-sm shrink-0 bg-slate-800 text-white px-2 py-1 rounded mt-0.5">
                                            {score}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="fixtures">
                    {upcomingSorted.length === 0 ? (
                        <Card className="border-dashed border-2 border-slate-200 mt-3">
                            <CardContent className="py-10 text-center text-slate-400">No upcoming fixtures this season</CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-2 mt-3">
                            {upcomingSorted.map(m => {
                                const league = leagues.find(l => l.id === m.league_id);
                                const isHome = m.home_club_id === club.id;
                                const opponent = isHome ? m.away_club_name : m.home_club_name;
                                return (
                                    <div key={m.id} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-slate-100">
                                        <Calendar className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-sm">{opponent}</div>
                                            <div className="text-xs text-slate-400 flex items-center gap-2">
                                                {isHome ? 'Home' : 'Away'}
                                                {league && <span>· {league.name}</span>}
                                                {m.matchday && <span>· MD{m.matchday}</span>}
                                            </div>
                                            {renderH2H(m)}
                                        </div>
                                        <Badge variant="outline" className="text-xs text-slate-500 shrink-0 mt-0.5">
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