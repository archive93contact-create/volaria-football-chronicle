import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Trophy, ChevronRight, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ROUND_ORDER = {
    'Final': 1,
    'Semi-Final': 2,
    'Quarter-Final': 3,
    'Round of 16': 4,
    'Round of 32': 5,
};

export default function CompetitionSeasonDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    const seasonId = urlParams.get('id');

    const { data: season } = useQuery({
        queryKey: ['season', seasonId],
        queryFn: async () => {
            const seasons = await base44.entities.ContinentalSeason.filter({ id: seasonId });
            return seasons[0];
        },
        enabled: !!seasonId,
    });

    const { data: competition } = useQuery({
        queryKey: ['competition', season?.competition_id],
        queryFn: async () => {
            const comps = await base44.entities.ContinentalCompetition.filter({ id: season.competition_id });
            return comps[0];
        },
        enabled: !!season?.competition_id,
    });

    const { data: matches = [] } = useQuery({
        queryKey: ['seasonMatches', seasonId],
        queryFn: () => base44.entities.CompetitionMatch.filter({ season_id: seasonId }),
        enabled: !!seasonId,
    });

    const { data: nations = [] } = useQuery({
        queryKey: ['nations'],
        queryFn: () => base44.entities.Nation.list(),
    });

    const getNationFlag = (nationId) => {
        const nation = nations.find(n => n.id === nationId);
        return nation?.flag_url;
    };

    const getNationName = (nationId) => {
        const nation = nations.find(n => n.id === nationId);
        return nation?.name;
    };

    // Group matches by round
    const matchesByRound = matches.reduce((acc, match) => {
        if (!acc[match.round]) acc[match.round] = [];
        acc[match.round].push(match);
        return acc;
    }, {});

    // Sort rounds
    const sortedRounds = Object.keys(matchesByRound).sort((a, b) => 
        (ROUND_ORDER[a] || 99) - (ROUND_ORDER[b] || 99)
    );

    if (!season || !competition) {
        return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Hero */}
            <div className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${competition.primary_color || '#1e40af'}, ${competition.secondary_color || '#fbbf24'})` }}>
                <div className="absolute inset-0 bg-black/20" />
                <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <nav className="flex items-center gap-2 text-sm text-white/70 mb-4 flex-wrap">
                        <Link to={createPageUrl('ContinentalCompetitions')} className="hover:text-white">Continental Competitions</Link>
                        <ChevronRight className="w-4 h-4" />
                        <Link to={createPageUrl(`CompetitionDetail?id=${competition.id}`)} className="hover:text-white">{competition.name}</Link>
                        <ChevronRight className="w-4 h-4" />
                        <span className="text-white">{season.year}</span>
                    </nav>
                    <h1 className="text-3xl md:text-4xl font-bold text-white">{competition.name} {season.year}</h1>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Final Result Card */}
                <Card className="border-0 shadow-lg mb-8 bg-gradient-to-r from-amber-50 to-yellow-50">
                    <CardContent className="p-6">
                        <div className="text-center mb-4">
                            <Trophy className="w-10 h-10 text-amber-500 mx-auto mb-2" />
                            <div className="text-sm text-slate-500 uppercase tracking-wide">Final</div>
                        </div>
                        <div className="flex items-center justify-center gap-6 flex-wrap">
                            <div className="text-center">
                                {getNationFlag(matches.find(m => m.round === 'Final' && m.home_club_name === season.champion_name)?.home_nation_id || 
                                              matches.find(m => m.round === 'Final' && m.away_club_name === season.champion_name)?.away_nation_id) && (
                                    <img 
                                        src={getNationFlag(matches.find(m => m.round === 'Final' && m.home_club_name === season.champion_name)?.home_nation_id || 
                                                          matches.find(m => m.round === 'Final' && m.away_club_name === season.champion_name)?.away_nation_id)} 
                                        alt="" 
                                        className="w-8 h-5 object-contain mx-auto mb-2" 
                                    />
                                )}
                                <div className="text-xl font-bold text-emerald-700">{season.champion_name}</div>
                                <div className="text-sm text-slate-500">{season.champion_nation}</div>
                            </div>
                            <div className="text-2xl font-bold text-slate-800 px-4">{season.final_score}</div>
                            <div className="text-center">
                                {getNationFlag(matches.find(m => m.round === 'Final' && m.home_club_name === season.runner_up)?.home_nation_id || 
                                              matches.find(m => m.round === 'Final' && m.away_club_name === season.runner_up)?.away_nation_id) && (
                                    <img 
                                        src={getNationFlag(matches.find(m => m.round === 'Final' && m.home_club_name === season.runner_up)?.home_nation_id || 
                                                          matches.find(m => m.round === 'Final' && m.away_club_name === season.runner_up)?.away_nation_id)} 
                                        alt="" 
                                        className="w-8 h-5 object-contain mx-auto mb-2" 
                                    />
                                )}
                                <div className="text-xl font-bold text-slate-700">{season.runner_up}</div>
                                <div className="text-sm text-slate-500">{season.runner_up_nation}</div>
                            </div>
                        </div>
                        {season.final_venue && (
                            <div className="text-center mt-4 text-sm text-slate-500">
                                Venue: {season.final_venue}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Season Stats */}
                {season.top_scorer && (
                    <Card className="border-0 shadow-sm mb-6">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="text-2xl">⚽</div>
                            <div>
                                <div className="text-sm text-slate-500">Top Scorer</div>
                                <div className="font-semibold">{season.top_scorer}</div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Bracket / Matches */}
                {matches.length > 0 ? (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-slate-900">Full Bracket</h2>
                        {sortedRounds.map(round => (
                            <Card key={round} className="border-0 shadow-sm">
                                <CardHeader className="pb-2">
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        {round === 'Final' && <Trophy className="w-5 h-5 text-amber-500" />}
                                        {round}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {matchesByRound[round]
                                            .sort((a, b) => a.match_number - b.match_number)
                                            .map((match, idx) => (
                                                <div key={idx} className="bg-slate-50 rounded-lg p-4">
                                                    <div className="flex items-center justify-between">
                                                        {/* Home Team */}
                                                        <div className="flex items-center gap-3 flex-1">
                                                            {match.home_nation_id && getNationFlag(match.home_nation_id) && (
                                                                <img src={getNationFlag(match.home_nation_id)} alt="" className="w-6 h-4 object-contain" />
                                                            )}
                                                            <span className={`font-medium ${match.home_score > match.away_score ? 'text-emerald-700' : ''}`}>
                                                                {match.home_club_name}
                                                            </span>
                                                        </div>
                                                        
                                                        {/* Score */}
                                                        <div className="px-4 flex items-center gap-2">
                                                            <span className={`font-bold text-lg ${match.home_score > match.away_score ? 'text-emerald-600' : ''}`}>
                                                                {match.home_score}
                                                            </span>
                                                            <span className="text-slate-400">-</span>
                                                            <span className={`font-bold text-lg ${match.away_score > match.home_score ? 'text-emerald-600' : ''}`}>
                                                                {match.away_score}
                                                            </span>
                                                            {match.penalties && (
                                                                <span className="text-xs text-slate-500">({match.penalties} pen)</span>
                                                            )}
                                                        </div>
                                                        
                                                        {/* Away Team */}
                                                        <div className="flex items-center gap-3 flex-1 justify-end">
                                                            <span className={`font-medium ${match.away_score > match.home_score ? 'text-emerald-700' : ''}`}>
                                                                {match.away_club_name}
                                                            </span>
                                                            {match.away_nation_id && getNationFlag(match.away_nation_id) && (
                                                                <img src={getNationFlag(match.away_nation_id)} alt="" className="w-6 h-4 object-contain" />
                                                            )}
                                                        </div>
                                                    </div>
                                                    {match.venue && (
                                                        <div className="text-xs text-slate-500 mt-2 text-center">{match.venue}</div>
                                                    )}
                                                </div>
                                            ))}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <Card className="border-0 shadow-sm">
                        <CardContent className="py-12 text-center text-slate-500">
                            No bracket data available for this season
                        </CardContent>
                    </Card>
                )}

                {/* Notes */}
                {season.notes && (
                    <Card className="border-0 shadow-sm mt-6">
                        <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
                        <CardContent><p className="text-slate-600 whitespace-pre-line">{season.notes}</p></CardContent>
                    </Card>
                )}

                <div className="mt-8">
                    <Link to={createPageUrl(`CompetitionDetail?id=${competition.id}`)}>
                        <Button variant="outline">
                            <ArrowLeft className="w-4 h-4 mr-2" /> Back to {competition.name}
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}