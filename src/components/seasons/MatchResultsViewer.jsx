import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CalendarDays } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

export default function MatchResultsViewer({ seasonId, leagueId, seasonYear }) {
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
                                    <div 
                                        key={idx}
                                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border hover:border-emerald-300 transition-colors"
                                    >
                                        <div className="flex-1 text-right pr-4">
                                            <span className="font-medium">{match.home_club_name}</span>
                                        </div>
                                        <div className="flex items-center gap-2 px-4 py-1 bg-white rounded-lg border-2 min-w-[80px] justify-center">
                                            <span className="text-lg font-bold">{match.home_score}</span>
                                            <span className="text-slate-400">-</span>
                                            <span className="text-lg font-bold">{match.away_score}</span>
                                        </div>
                                        <div className="flex-1 pl-4">
                                            <span className="font-medium">{match.away_club_name}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}