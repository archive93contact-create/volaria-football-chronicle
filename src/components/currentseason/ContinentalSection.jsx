import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Trophy, Star, Shield, ChevronRight, Swords } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ContinentalSection({ competition, continentalSeasons, continentalMatches, color, currentYear }) {
    if (!competition) return (
        <Card className="border-0 shadow-sm bg-white opacity-60">
            <CardContent className="p-4 flex items-center justify-center h-full min-h-[120px]">
                <p className="text-slate-400 text-sm">Continental competition not configured</p>
            </CardContent>
        </Card>
    );

    const season = continentalSeasons.find(s => s.competition_id === competition.id && s.year === currentYear)
        || continentalSeasons.find(s => s.competition_id === competition.id);

    // Recent matches for this competition season
    const seasonMatches = season
        ? continentalMatches.filter(m => m.season_id === season.id)
        : [];

    // Get latest round with results
    const completedMatches = seasonMatches.filter(m => m.winner || m.home_aggregate !== null);
    const latestRound = completedMatches.length > 0
        ? completedMatches[completedMatches.length - 1].round
        : null;
    const latestRoundMatches = latestRound
        ? completedMatches.filter(m => m.round === latestRound).slice(0, 3)
        : [];

    // Upcoming round (first round without winners)
    const pendingMatches = seasonMatches.filter(m => !m.winner && m.home_aggregate === null);
    const nextRound = pendingMatches.length > 0 ? pendingMatches[0].round : null;

    const colorMap = {
        amber: { bg: 'from-amber-500 to-yellow-500', icon: 'text-amber-500', badge: 'bg-amber-100 text-amber-700', border: 'border-amber-200' },
        blue: { bg: 'from-blue-500 to-indigo-500', icon: 'text-blue-500', badge: 'bg-blue-100 text-blue-700', border: 'border-blue-200' },
    };
    const c = colorMap[color] || colorMap.amber;
    const Icon = color === 'amber' ? Star : Shield;

    return (
        <Card className={`border-0 shadow-lg overflow-hidden`}>
            <div className={`bg-gradient-to-r ${c.bg} p-3`}>
                <div className="flex items-center justify-between text-white">
                    <div className="flex items-center gap-2">
                        <Icon className="w-5 h-5" />
                        <span className="font-bold text-sm">{competition.name}</span>
                    </div>
                    <Link to={createPageUrl(`ContinentalCompetitions`)} className="flex items-center gap-1 text-white/80 hover:text-white text-xs">
                        View <ChevronRight className="w-3 h-3" />
                    </Link>
                </div>
            </div>
            <CardContent className="p-4">
                {season?.champion_name ? (
                    <div className="flex items-center gap-2 mb-3 pb-3 border-b">
                        <Trophy className={`w-4 h-4 ${c.icon}`} />
                        <div>
                            <span className="font-bold text-sm">{season.champion_name}</span>
                            {season.champion_nation && <span className="text-xs text-slate-500 ml-1">({season.champion_nation})</span>}
                        </div>
                        <Badge className={`ml-auto text-xs ${c.badge}`}>{season.year} Champions</Badge>
                    </div>
                ) : (
                    <div className="text-xs text-slate-500 mb-3 pb-3 border-b">Season in progress — {currentYear}</div>
                )}

                {latestRoundMatches.length > 0 && (
                    <div className="mb-3">
                        <div className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">{latestRound}</div>
                        <div className="space-y-1.5">
                            {latestRoundMatches.map((m, i) => (
                                <div key={i} className="flex items-center gap-2 text-xs">
                                    <span className="truncate flex-1 text-right font-medium">{m.home_club_name}</span>
                                    <span className="font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                                        {m.is_single_leg
                                            ? `${m.home_score_leg1 ?? '?'} - ${m.away_score_leg1 ?? '?'}`
                                            : `${m.home_aggregate ?? '?'} - ${m.away_aggregate ?? '?'}`
                                        }
                                    </span>
                                    <span className="truncate flex-1 font-medium">{m.away_club_name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {nextRound && (
                    <div className={`flex items-center gap-2 text-xs p-2 rounded ${c.badge} mt-1`}>
                        <Swords className="w-3 h-3 shrink-0" />
                        <span>Next up: <strong>{nextRound}</strong> — {pendingMatches.length} ties to play</span>
                    </div>
                )}

                {!latestRoundMatches.length && !nextRound && (
                    <p className="text-xs text-slate-400">No match data available yet</p>
                )}
            </CardContent>
        </Card>
    );
}