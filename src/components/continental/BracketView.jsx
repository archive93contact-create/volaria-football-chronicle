import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy } from 'lucide-react';

const ROUND_ORDER = ['Round of 32', 'Round of 16', 'Quarter-final', 'Semi-final', 'Final'];

export default function BracketView({ matches, getNationFlag, onEdit, onDelete }) {
    // Group matches by round
    const matchesByRound = matches.reduce((acc, match) => {
        if (!acc[match.round]) acc[match.round] = [];
        acc[match.round].push(match);
        return acc;
    }, {});

    const sortedRounds = ROUND_ORDER.filter(r => matchesByRound[r]);

    if (sortedRounds.length === 0) {
        return (
            <Card className="border-dashed border-2 border-slate-300">
                <CardContent className="flex flex-col items-center justify-center py-12">
                    <Trophy className="w-12 h-12 text-slate-300 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">No Knockout Matches Yet</h3>
                    <p className="text-slate-500">Add matches to build the bracket</p>
                </CardContent>
            </Card>
        );
    }

    const MatchCard = ({ match }) => (
        <div 
            className="bg-white border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer min-w-[200px]"
            onClick={() => onEdit(match)}
        >
            <div className={`flex items-center gap-2 py-1 ${match.winner === match.home_club_name ? 'font-bold text-emerald-700' : ''}`}>
                {getNationFlag(match.home_club_nation) && (
                    <img src={getNationFlag(match.home_club_nation)} alt="" className="w-4 h-3 object-contain" />
                )}
                <span className="flex-1 text-sm truncate">{match.home_club_name}</span>
                <span className="text-sm font-mono">
                    {match.is_single_leg 
                        ? (match.home_score_leg1 ?? '-')
                        : `${match.home_aggregate ?? '-'}`
                    }
                </span>
            </div>
            <div className={`flex items-center gap-2 py-1 ${match.winner === match.away_club_name ? 'font-bold text-emerald-700' : ''}`}>
                {getNationFlag(match.away_club_nation) && (
                    <img src={getNationFlag(match.away_club_nation)} alt="" className="w-4 h-3 object-contain" />
                )}
                <span className="flex-1 text-sm truncate">{match.away_club_name}</span>
                <span className="text-sm font-mono">
                    {match.is_single_leg 
                        ? (match.away_score_leg1 ?? '-')
                        : `${match.away_aggregate ?? '-'}`
                    }
                </span>
            </div>
            {match.penalties && (
                <div className="text-xs text-center text-slate-500 mt-1 border-t pt-1">
                    pen: {match.penalties}
                </div>
            )}
        </div>
    );

    return (
        <div className="overflow-x-auto pb-4">
            <div className="flex gap-6 min-w-max">
                {sortedRounds.map((round, roundIdx) => {
                    const roundMatches = matchesByRound[round]?.sort((a, b) => (a.match_number || 0) - (b.match_number || 0)) || [];
                    const isFinal = round === 'Final';
                    
                    return (
                        <div key={round} className="flex flex-col">
                            <h3 className={`text-sm font-semibold text-center mb-4 px-4 py-2 rounded-full ${isFinal ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'}`}>
                                {round}
                            </h3>
                            <div 
                                className="flex flex-col justify-around flex-1 gap-4"
                                style={{ minHeight: roundMatches.length > 1 ? `${roundMatches.length * 80}px` : 'auto' }}
                            >
                                {roundMatches.map((match, idx) => (
                                    <div key={match.id} className="flex items-center">
                                        <MatchCard match={match} />
                                        {roundIdx < sortedRounds.length - 1 && (
                                            <div className="w-6 h-px bg-slate-300 ml-2" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}