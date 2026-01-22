import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CalendarDays, ChevronRight } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function MatchResultsViewer({ seasonId, leagueId, seasonYear }) {
    const [selectedMatch, setSelectedMatch] = React.useState(null);

    const { data: matches = [], isLoading } = useQuery({
        queryKey: ['matches', seasonId],
        queryFn: () => base44.entities.Match.filter({ season_id: seasonId }, 'matchday'),
        enabled: !!seasonId,
    });

    if (isLoading) {
        return <Loader2 className="w-5 h-5 animate-spin" />;
    }

    if (matches.length === 0) {
        return null;
    }

    // Group by matchday
    const matchesByDay = matches.reduce((acc, match) => {
        const day = match.matchday || 1;
        if (!acc[day]) acc[day] = [];
        acc[day].push(match);
        return acc;
    }, {});

    const matchdays = Object.keys(matchesByDay).map(Number).sort((a, b) => a - b);

    return (
        <Card className="border-0 shadow-sm mt-6">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <CalendarDays className="w-5 h-5" />
                    Match Results ({matches.length} fixtures)
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {matchdays.map(day => (
                        <div key={day}>
                            <h3 className="font-semibold text-sm text-slate-600 mb-3">Matchday {day}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {matchesByDay[day].map((match, idx) => (
                                    <button 
                                        key={idx}
                                        onClick={() => setSelectedMatch(match)}
                                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border hover:border-emerald-300 hover:bg-white transition-all cursor-pointer w-full group"
                                    >
                                        <div className="flex-1 text-right pr-4">
                                            <span className="font-medium">{match.home_club_name}</span>
                                        </div>
                                        <div className="flex items-center gap-2 px-4 py-1 bg-white rounded-lg border-2 min-w-[80px] justify-center group-hover:border-emerald-400 transition-colors">
                                            <span className="text-lg font-bold">{match.home_score}</span>
                                            <span className="text-slate-400">-</span>
                                            <span className="text-lg font-bold">{match.away_score}</span>
                                        </div>
                                        <div className="flex-1 pl-4 flex items-center gap-2">
                                            <span className="font-medium">{match.away_club_name}</span>
                                            <ChevronRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>

            {/* Match Detail Dialog */}
            <Dialog open={!!selectedMatch} onOpenChange={(open) => !open && setSelectedMatch(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Match Details - Matchday {selectedMatch?.matchday}</DialogTitle>
                    </DialogHeader>
                    {selectedMatch && (
                        <div className="space-y-6 py-4">
                            {/* Score Display */}
                            <div className="flex items-center justify-center gap-8 p-6 bg-slate-50 rounded-lg">
                                <div className="text-center flex-1">
                                    <div className="text-3xl font-bold text-slate-900">{selectedMatch.home_club_name}</div>
                                    <div className="text-sm text-slate-500 mt-1">Home</div>
                                </div>
                                <div className="flex items-center gap-4 px-6 py-4 bg-white rounded-xl border-2 shadow-sm">
                                    <span className="text-4xl font-bold">{selectedMatch.home_score}</span>
                                    <span className="text-2xl text-slate-400">-</span>
                                    <span className="text-4xl font-bold">{selectedMatch.away_score}</span>
                                </div>
                                <div className="text-center flex-1">
                                    <div className="text-3xl font-bold text-slate-900">{selectedMatch.away_club_name}</div>
                                    <div className="text-sm text-slate-500 mt-1">Away</div>
                                </div>
                            </div>

                            {/* Match Details */}
                            <div className="grid grid-cols-2 gap-4">
                                {selectedMatch.match_date && (
                                    <div className="p-3 bg-slate-50 rounded-lg">
                                        <div className="text-xs text-slate-500">Date</div>
                                        <div className="font-medium">{new Date(selectedMatch.match_date).toLocaleDateString()}</div>
                                    </div>
                                )}
                                {selectedMatch.stadium && (
                                    <div className="p-3 bg-slate-50 rounded-lg">
                                        <div className="text-xs text-slate-500">Venue</div>
                                        <div className="font-medium">{selectedMatch.stadium}</div>
                                    </div>
                                )}
                                {selectedMatch.attendance && (
                                    <div className="p-3 bg-slate-50 rounded-lg">
                                        <div className="text-xs text-slate-500">Attendance</div>
                                        <div className="font-medium">{selectedMatch.attendance.toLocaleString()}</div>
                                    </div>
                                )}
                            </div>

                            {/* Goalscorers */}
                            {selectedMatch.goalscorers && selectedMatch.goalscorers.length > 0 && (
                                <div>
                                    <h4 className="font-semibold mb-2">⚽ Goals</h4>
                                    <div className="space-y-2">
                                        {selectedMatch.goalscorers.map((goal, idx) => (
                                            <div key={idx} className="flex items-center gap-3 p-2 bg-slate-50 rounded">
                                                <Badge variant="outline" className="min-w-[50px] justify-center">
                                                    {goal.minute}'
                                                </Badge>
                                                <span className="font-medium">{goal.player_name}</span>
                                                <span className="text-slate-500 text-sm">
                                                    ({goal.is_home ? selectedMatch.home_club_name : selectedMatch.away_club_name})
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Match Report */}
                            {selectedMatch.match_report && (
                                <div>
                                    <h4 className="font-semibold mb-2">Match Report</h4>
                                    <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">
                                        {selectedMatch.match_report}
                                    </p>
                                </div>
                            )}

                            {/* Special Badges */}
                            <div className="flex gap-2 flex-wrap">
                                {selectedMatch.is_derby && (
                                    <Badge className="bg-red-100 text-red-700">Derby Match</Badge>
                                )}
                                {selectedMatch.is_title_decider && (
                                    <Badge className="bg-amber-100 text-amber-700">Title Decider</Badge>
                                )}
                            </div>

                            {selectedMatch.notes && (
                                <div className="text-sm text-slate-500 italic">
                                    {selectedMatch.notes}
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </Card>
    );
}