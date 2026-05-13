import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Activity, Shield, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function LatestResults({ matches, leagues, nations, clubs, selectedNation }) {
    const [filterLeague, setFilterLeague] = useState('all');

    const filteredMatches = matches.filter(m => {
        if (filterLeague !== 'all' && m.league_id !== filterLeague) return false;
        if (selectedNation !== 'all') {
            const league = leagues.find(l => l.id === m.league_id);
            if (!league || league.nation_id !== selectedNation) return false;
        }
        return true;
    });

    const visibleLeagues = selectedNation === 'all'
        ? leagues
        : leagues.filter(l => l.nation_id === selectedNation);

    if (matches.length === 0) {
        return (
            <Card className="border-dashed border-2 border-slate-300">
                <CardContent className="flex flex-col items-center justify-center py-16">
                    <Activity className="w-16 h-16 text-slate-300 mb-4" />
                    <h3 className="text-xl font-semibold text-slate-700 mb-2">No Results Yet</h3>
                    <p className="text-slate-500">Use the Fixture Generator to create matches and enter scores</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <Filter className="w-4 h-4 text-slate-400" />
                <Select value={filterLeague} onValueChange={setFilterLeague}>
                    <SelectTrigger className="w-52">
                        <SelectValue placeholder="All Leagues" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Leagues</SelectItem>
                        {visibleLeagues.map(l => (
                            <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <span className="text-sm text-slate-500">{filteredMatches.length} results</span>
            </div>

            <div className="grid gap-3">
                {filteredMatches.map(match => {
                    const league = leagues.find(l => l.id === match.league_id);
                    const nation = league ? nations.find(n => n.id === league.nation_id) : null;
                    const homeClub = clubs.find(c => c.id === match.home_club_id);
                    const awayClub = clubs.find(c => c.id === match.away_club_id);
                    const homeWon = match.home_score > match.away_score;
                    const awayWon = match.away_score > match.home_score;
                    const isDraw = match.home_score === match.away_score;

                    return (
                        <Card key={match.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                            <CardContent className="p-3">
                                <div className="flex items-center gap-2 mb-2">
                                    {league?.logo_url && <img src={league.logo_url} alt="" className="w-4 h-4 object-contain" />}
                                    <span className="text-xs text-slate-500">{league?.name}</span>
                                    {nation && <span className="text-xs text-slate-400">· {nation.name}</span>}
                                    {match.matchday && <Badge variant="outline" className="text-xs ml-auto">MD {match.matchday}</Badge>}
                                    {match.is_derby && <Badge className="text-xs bg-red-100 text-red-700">Derby</Badge>}
                                </div>
                                <div className="flex items-center gap-3">
                                    {/* Home */}
                                    <div className={`flex items-center gap-2 flex-1 justify-end ${homeWon ? 'font-bold' : ''}`}>
                                        {homeClub?.logo_url && <img src={homeClub.logo_url} alt="" className="w-6 h-6 object-contain" />}
                                        <span className="text-sm truncate">{match.home_club_name}</span>
                                    </div>
                                    {/* Score */}
                                    <div className="flex items-center gap-1 shrink-0">
                                        <span className={`text-lg font-bold w-7 text-center ${homeWon ? 'text-emerald-600' : isDraw ? 'text-slate-600' : 'text-slate-400'}`}>
                                            {match.home_score}
                                        </span>
                                        <span className="text-slate-400">—</span>
                                        <span className={`text-lg font-bold w-7 text-center ${awayWon ? 'text-emerald-600' : isDraw ? 'text-slate-600' : 'text-slate-400'}`}>
                                            {match.away_score}
                                        </span>
                                    </div>
                                    {/* Away */}
                                    <div className={`flex items-center gap-2 flex-1 ${awayWon ? 'font-bold' : ''}`}>
                                        <span className="text-sm truncate">{match.away_club_name}</span>
                                        {awayClub?.logo_url && <img src={awayClub.logo_url} alt="" className="w-6 h-6 object-contain ml-auto" />}
                                    </div>
                                </div>
                                {match.goalscorers?.length > 0 && (
                                    <div className="mt-1.5 text-xs text-slate-500 flex gap-3">
                                        {match.goalscorers.slice(0, 4).map((g, i) => (
                                            <span key={i}>{g.player_name} {g.minute}'</span>
                                        ))}
                                        {match.goalscorers.length > 4 && <span>+{match.goalscorers.length - 4} more</span>}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}