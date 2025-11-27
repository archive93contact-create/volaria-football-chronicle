import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Shield, ChevronRight } from 'lucide-react';

const ROUND_ORDER = ['Round of 32', 'Round of 16', 'Quarter-final', 'Semi-final', 'Final'];

export default function BracketView({ matches, getNationFlag, clubs = [], onEdit }) {
    // Group matches by round
    const matchesByRound = matches.reduce((acc, match) => {
        if (!acc[match.round]) acc[match.round] = [];
        acc[match.round].push(match);
        return acc;
    }, {});

    const sortedRounds = ROUND_ORDER.filter(r => matchesByRound[r]);

    // Build progression map: which clubs came from which previous round matches
    const progressionMap = useMemo(() => {
        const map = {};
        for (let i = 1; i < sortedRounds.length; i++) {
            const currentRound = sortedRounds[i];
            const prevRound = sortedRounds[i - 1];
            const currentMatches = matchesByRound[currentRound] || [];
            const prevMatches = matchesByRound[prevRound] || [];
            
            currentMatches.forEach(match => {
                // Find which previous match each club came from
                [match.home_club_name, match.away_club_name].forEach(clubName => {
                    const sourceMatch = prevMatches.find(pm => pm.winner === clubName);
                    if (sourceMatch) {
                        if (!map[match.id]) map[match.id] = {};
                        map[match.id][clubName] = sourceMatch.id;
                    }
                });
            });
        }
        return map;
    }, [sortedRounds, matchesByRound]);

    // Helper to find club ID by name
    const getClubByName = (name) => {
        if (!name) return null;
        return clubs.find(c => c.name.toLowerCase().trim() === name.toLowerCase().trim());
    };

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

    const ClubLink = ({ name, nation, isWinner, score, showScore = true, cameFromMatch }) => {
        const club = getClubByName(name);
        const flag = getNationFlag(nation);
        
        return (
            <div className={`flex items-center gap-2 py-2 px-3 ${isWinner ? 'bg-emerald-50' : ''}`}>
                {cameFromMatch && (
                    <ChevronRight className="w-3 h-3 text-slate-300 flex-shrink-0" />
                )}
                {flag && (
                    <img src={flag} alt="" className="w-5 h-3 object-contain flex-shrink-0" />
                )}
                {club ? (
                    <Link 
                        to={createPageUrl(`ClubDetail?id=${club.id}`)}
                        className={`flex-1 text-sm truncate hover:underline ${isWinner ? 'font-bold text-emerald-700' : 'text-slate-700'}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {name}
                    </Link>
                ) : (
                    <span className={`flex-1 text-sm truncate ${isWinner ? 'font-bold text-emerald-700' : 'text-slate-700'}`}>
                        {name}
                    </span>
                )}
                {showScore && (
                    <span className={`text-sm font-mono ${isWinner ? 'font-bold' : ''}`}>
                        {score ?? '-'}
                    </span>
                )}
            </div>
        );
    };

    const MatchCard = ({ match, isFinal, roundIdx }) => {
        const homeIsWinner = match.winner === match.home_club_name;
        const awayIsWinner = match.winner === match.away_club_name;
        
        // For two-leg ties, show aggregate
        const homeScore = match.is_single_leg ? match.home_score_leg1 : match.home_aggregate;
        const awayScore = match.is_single_leg ? match.away_score_leg1 : match.away_aggregate;

        // Check if clubs came from previous round
        const matchProgression = progressionMap[match.id] || {};
        const homeCameFrom = matchProgression[match.home_club_name];
        const awayCameFrom = matchProgression[match.away_club_name];

        return (
            <div 
                className={`bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden ${isFinal ? 'ring-2 ring-amber-400' : ''}`}
                style={{ minWidth: '220px', maxWidth: '280px' }}
                onClick={() => onEdit && onEdit(match)}
            >
                {isFinal && (
                    <div className="bg-amber-400 text-amber-900 text-xs font-bold text-center py-1">
                        <Trophy className="w-3 h-3 inline mr-1" /> FINAL
                    </div>
                )}
                <ClubLink 
                    name={match.home_club_name} 
                    nation={match.home_club_nation}
                    isWinner={homeIsWinner}
                    score={homeScore}
                    cameFromMatch={homeCameFrom}
                />
                <div className="border-t border-slate-100" />
                <ClubLink 
                    name={match.away_club_name} 
                    nation={match.away_club_nation}
                    isWinner={awayIsWinner}
                    score={awayScore}
                    cameFromMatch={awayCameFrom}
                />
                {!match.is_single_leg && (match.home_score_leg1 !== null || match.away_score_leg1 !== null) && (
                    <div className="bg-slate-50 px-3 py-1 text-xs text-slate-500 border-t">
                        <span>1st: {match.home_score_leg1 ?? '-'}-{match.away_score_leg1 ?? '-'}</span>
                        <span className="mx-2">|</span>
                        <span>2nd: {match.away_score_leg2 ?? '-'}-{match.home_score_leg2 ?? '-'}</span>
                    </div>
                )}
                {match.penalties && (
                    <div className="bg-blue-50 px-3 py-1 text-xs text-blue-600 text-center border-t">
                        Penalties: {match.penalties}
                    </div>
                )}
            </div>
        );
    };

    // Calculate spacing for proper bracket alignment
    const getSpacingMultiplier = (roundIndex, totalRounds) => {
        return Math.pow(2, roundIndex);
    };

    return (
        <div className="overflow-x-auto pb-4">
            <div className="flex gap-8 min-w-max p-4">
                {sortedRounds.map((round, roundIdx) => {
                    const roundMatches = matchesByRound[round]?.sort((a, b) => (a.match_number || 0) - (b.match_number || 0)) || [];
                    const isFinal = round === 'Final';
                    const spacingMultiplier = getSpacingMultiplier(roundIdx, sortedRounds.length);
                    
                    return (
                        <div key={round} className="flex flex-col">
                            <h3 className={`text-sm font-semibold text-center mb-4 px-4 py-2 rounded-full ${
                                isFinal ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                            }`}>
                                {round}
                            </h3>
                            <div 
                                className="flex flex-col justify-around flex-1"
                                style={{ 
                                    gap: `${spacingMultiplier * 16}px`,
                                    paddingTop: `${(spacingMultiplier - 1) * 40}px`,
                                    paddingBottom: `${(spacingMultiplier - 1) * 40}px`
                                }}
                            >
                                {roundMatches.map((match, matchIdx) => (
                                    <div key={match.id} className="flex items-center">
                                        {roundIdx > 0 && (
                                            <div className="w-6 flex flex-col items-center mr-1">
                                                <div className="w-px h-4 bg-slate-300" />
                                                <div className="w-3 h-px bg-slate-300" />
                                            </div>
                                        )}
                                        <MatchCard match={match} isFinal={isFinal} roundIdx={roundIdx} />
                                        {roundIdx < sortedRounds.length - 1 && (
                                            <div className="flex items-center">
                                                <div className="w-4 h-px bg-slate-300" />
                                                <div className="w-px h-8 bg-slate-300" style={{ marginTop: matchIdx % 2 === 0 ? '0' : '-32px', marginBottom: matchIdx % 2 === 0 ? '-32px' : '0' }} />
                                                <div className="w-4 h-px bg-slate-300" />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t text-xs text-slate-500">
                <span className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-emerald-50 border border-emerald-200 rounded" />
                    Winner
                </span>
                <span>Click match to edit</span>
                <span>Click club name to view profile</span>
            </div>
        </div>
    );
}