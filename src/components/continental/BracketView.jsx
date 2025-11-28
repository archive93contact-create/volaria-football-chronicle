import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Shield, ChevronRight, Edit2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import AdminOnly from '@/components/common/AdminOnly';

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
            <div className={`flex items-center gap-3 py-3 px-4 ${isWinner ? 'bg-emerald-50' : 'hover:bg-slate-50'} transition-colors`}>
                {flag && (
                    <img src={flag} alt="" className="w-6 h-4 object-cover rounded-sm flex-shrink-0 shadow-sm" />
                )}
                {club?.logo_url && (
                    <img src={club.logo_url} alt="" className="w-5 h-5 object-contain flex-shrink-0" />
                )}
                {club ? (
                    <Link 
                        to={createPageUrl(`ClubDetail?id=${club.id}`)}
                        className={`flex-1 truncate hover:underline ${isWinner ? 'font-bold text-emerald-700 text-base' : 'text-slate-700'}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {name}
                    </Link>
                ) : (
                    <span className={`flex-1 truncate ${isWinner ? 'font-bold text-emerald-700 text-base' : 'text-slate-700'}`}>
                        {name}
                    </span>
                )}
                {showScore && (
                    <span className={`text-lg font-mono min-w-[24px] text-center ${isWinner ? 'font-bold text-emerald-700' : 'text-slate-500'}`}>
                        {score ?? '-'}
                    </span>
                )}
                {isWinner && (
                    <Trophy className="w-4 h-4 text-amber-500 flex-shrink-0" />
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
                className={`bg-white border-2 rounded-xl shadow-sm hover:shadow-lg transition-all overflow-hidden relative group ${isFinal ? 'ring-4 ring-amber-400 border-amber-300' : 'border-slate-200 hover:border-slate-300'}`}
                style={{ minWidth: '260px', maxWidth: '320px' }}
            >
                {isFinal && (
                    <div className="bg-gradient-to-r from-amber-400 to-yellow-400 text-amber-900 text-sm font-bold text-center py-2">
                        <Trophy className="w-4 h-4 inline mr-2" /> FINAL
                    </div>
                )}
                <div className={`${isFinal ? '' : 'pt-2'}`}>
                    <ClubLink 
                        name={match.home_club_name} 
                        nation={match.home_club_nation}
                        isWinner={homeIsWinner}
                        score={homeScore}
                        cameFromMatch={homeCameFrom}
                    />
                    <div className="border-t border-slate-200 mx-2" />
                    <ClubLink 
                        name={match.away_club_name} 
                        nation={match.away_club_nation}
                        isWinner={awayIsWinner}
                        score={awayScore}
                        cameFromMatch={awayCameFrom}
                    />
                </div>
                {!match.is_single_leg && (match.home_score_leg1 !== null || match.away_score_leg1 !== null) && (
                    <div className="bg-slate-100 px-3 py-2 text-xs text-slate-600 border-t flex justify-center gap-4">
                        <span className="font-medium">1st Leg: {match.home_score_leg1 ?? '-'} - {match.away_score_leg1 ?? '-'}</span>
                        <span className="text-slate-300">|</span>
                        <span className="font-medium">2nd Leg: {match.away_score_leg2 ?? '-'} - {match.home_score_leg2 ?? '-'}</span>
                    </div>
                )}
                {match.penalties && (
                    <div className="bg-blue-100 px-3 py-2 text-xs text-blue-700 text-center border-t font-semibold">
                        After Penalties: {match.penalties}
                    </div>
                )}
                {match.venue && isFinal && (
                    <div className="bg-slate-50 px-3 py-1 text-xs text-slate-500 text-center border-t">
                        {match.venue}
                    </div>
                )}
                <AdminOnly>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 p-0 bg-white/80"
                        onClick={(e) => { e.stopPropagation(); onEdit && onEdit(match); }}
                    >
                        <Edit2 className="w-3 h-3" />
                    </Button>
                </AdminOnly>
            </div>
        );
    };

    // Calculate spacing for proper bracket alignment
    const getSpacingMultiplier = (roundIndex, totalRounds) => {
        return Math.pow(2, roundIndex);
    };

    return (
        <div className="overflow-x-auto pb-4">
            <Card className="border-0 shadow-sm bg-gradient-to-br from-slate-50 to-slate-100 p-6">
                <div className="flex gap-12 min-w-max">
                    {sortedRounds.map((round, roundIdx) => {
                        const roundMatches = matchesByRound[round]?.sort((a, b) => (a.match_number || 0) - (b.match_number || 0)) || [];
                        const isFinal = round === 'Final';
                        const spacingMultiplier = getSpacingMultiplier(roundIdx, sortedRounds.length);
                        
                        return (
                            <div key={round} className="flex flex-col">
                                <h3 className={`text-sm font-bold text-center mb-6 px-6 py-2 rounded-lg shadow-sm ${
                                    isFinal ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-amber-900' : 'bg-white text-slate-700 border'
                                }`}>
                                    {round}
                                    <span className="ml-2 text-xs font-normal opacity-70">({roundMatches.length})</span>
                                </h3>
                                <div 
                                    className="flex flex-col justify-around flex-1"
                                    style={{ 
                                        gap: `${spacingMultiplier * 20}px`,
                                        paddingTop: `${(spacingMultiplier - 1) * 50}px`,
                                        paddingBottom: `${(spacingMultiplier - 1) * 50}px`
                                    }}
                                >
                                    {roundMatches.map((match, matchIdx) => (
                                        <div key={match.id} className="flex items-center">
                                            {roundIdx > 0 && (
                                                <div className="w-8 flex items-center mr-2">
                                                    <div className="w-full h-0.5 bg-gradient-to-r from-slate-300 to-slate-400 rounded" />
                                                </div>
                                            )}
                                            <MatchCard match={match} isFinal={isFinal} roundIdx={roundIdx} />
                                            {roundIdx < sortedRounds.length - 1 && (
                                                <div className="flex items-center">
                                                    <div className="w-8 h-0.5 bg-gradient-to-r from-slate-400 to-slate-300 rounded" />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Card>

            {/* Legend */}
            <div className="flex items-center justify-center gap-8 mt-6 text-sm text-slate-500">
                <span className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-emerald-100 border-2 border-emerald-300 rounded" />
                    Winner advances
                </span>
                <span className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    Tie winner
                </span>
                <span className="text-slate-400">Click club name to view profile</span>
            </div>
        </div>
    );
}