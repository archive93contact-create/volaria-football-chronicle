import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Star, ChevronRight, Flag, Edit2, Users, Eye } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import AdminOnly from '@/components/common/AdminOnly';
import MatchLineupEditor from '@/components/continental/MatchLineupEditor';
import MatchDetailView from '@/components/continental/MatchDetailView';

const ROUND_ORDER = ['Round of 32', 'Round of 16', 'Quarter-final', 'Semi-final', 'Final'];

export default function EnhancedBracketView({ matches, getNationFlag, clubs = [], nations = [], competition, onEditMatch }) {
    const [lineupEditMatch, setLineupEditMatch] = useState(null);
    const [detailViewMatch, setDetailViewMatch] = useState(null);
    
    // Get custom round names from competition
    const getRoundDisplayName = (roundName) => {
        if (competition?.round_names && competition.round_names[roundName]) {
            return competition.round_names[roundName];
        }
        return roundName;
    };
    // Group matches by round
    const matchesByRound = useMemo(() => {
        return matches.reduce((acc, match) => {
            if (!acc[match.round]) acc[match.round] = [];
            acc[match.round].push(match);
            return acc;
        }, {});
    }, [matches]);

    // Reverse order - Final first
    const sortedRounds = ROUND_ORDER.filter(r => matchesByRound[r]).reverse();

    // Helper to find club
    const getClubByName = (name) => {
        if (!name) return null;
        return clubs.find(c => c.name.toLowerCase().trim() === name.toLowerCase().trim());
    };

    // Helper to find nation
    const getNationByName = (name) => {
        if (!name) return null;
        return nations.find(n => n.name.toLowerCase().trim() === name.toLowerCase().trim());
    };

    // Build path for each club - trace their journey through the tournament
    const clubPaths = useMemo(() => {
        const paths = {};
        
        // For each club that appears, find all their matches
        matches.forEach(match => {
            [match.home_club_name, match.away_club_name].forEach(clubName => {
                if (!clubName) return;
                if (!paths[clubName]) paths[clubName] = [];
                paths[clubName].push({
                    round: match.round,
                    match,
                    isHome: match.home_club_name === clubName,
                    won: match.winner === clubName
                });
            });
        });
        
        // Sort each club's path by round order
        Object.keys(paths).forEach(clubName => {
            paths[clubName].sort((a, b) => 
                ROUND_ORDER.indexOf(a.round) - ROUND_ORDER.indexOf(b.round)
            );
        });
        
        return paths;
    }, [matches]);

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

    const MatchCard = ({ match, isFinal, showRound = false }) => {
        const homeClub = getClubByName(match.home_club_name);
        const awayClub = getClubByName(match.away_club_name);
        const homeIsWinner = match.winner === match.home_club_name;
        const awayIsWinner = match.winner === match.away_club_name;
        
        const homeScore = match.is_single_leg ? match.home_score_leg1 : match.home_aggregate;
        const awayScore = match.is_single_leg ? match.away_score_leg1 : match.away_aggregate;

        const ClubRow = ({ name, nation, club, isWinner, score, isHome }) => {
            const flag = getNationFlag(nation);
            
            return (
                <div className={`flex items-center gap-3 p-3 ${isWinner ? 'bg-emerald-50' : 'hover:bg-slate-50'} transition-colors`}>
                    <div className="w-6 text-center">
                        {flag && <img src={flag} alt="" className="w-6 h-4 object-cover rounded-sm inline-block" />}
                    </div>
                    {club?.logo_url && (
                        <img src={club.logo_url} alt="" className="w-6 h-6 object-contain flex-shrink-0" />
                    )}
                    {club ? (
                        <Link 
                            to={createPageUrl(`ClubDetail?id=${club.id}`)}
                            className={`flex-1 truncate hover:underline ${isWinner ? 'font-bold text-emerald-700' : 'text-slate-700'}`}
                        >
                            {name}
                        </Link>
                    ) : (
                        <span className={`flex-1 truncate ${isWinner ? 'font-bold text-emerald-700' : 'text-slate-700'}`}>
                            {name}
                        </span>
                    )}
                    <span className={`text-xl font-mono min-w-[28px] text-center ${isWinner ? 'font-bold text-emerald-700' : 'text-slate-500'}`}>
                        {score ?? '-'}
                    </span>
                    {isWinner && <Trophy className="w-4 h-4 text-amber-500 flex-shrink-0" />}
                </div>
            );
        };

        return (
            <div className={`bg-white rounded-xl shadow-sm border-2 overflow-hidden ${isFinal ? 'border-amber-400 ring-2 ring-amber-200' : 'border-slate-200'}`}>
                {isFinal && (
                    <div className="bg-gradient-to-r from-amber-400 to-yellow-400 text-amber-900 text-sm font-bold text-center py-2 flex items-center justify-center gap-2">
                        <Star className="w-4 h-4" /> FINAL <Star className="w-4 h-4" />
                    </div>
                )}
                {showRound && !isFinal && (
                    <div className="bg-slate-100 text-slate-600 text-xs font-medium text-center py-1.5">
                        {getRoundDisplayName(match.round)}
                    </div>
                )}
                <ClubRow 
                    name={match.home_club_name} 
                    nation={match.home_club_nation}
                    club={homeClub}
                    isWinner={homeIsWinner}
                    score={homeScore}
                    isHome={true}
                />
                <div className="border-t border-slate-200" />
                <ClubRow 
                    name={match.away_club_name} 
                    nation={match.away_club_nation}
                    club={awayClub}
                    isWinner={awayIsWinner}
                    score={awayScore}
                    isHome={false}
                />
                {!match.is_single_leg && (match.home_score_leg1 != null || match.away_score_leg1 != null) && (
                    <div className="bg-slate-50 px-3 py-2 text-xs text-slate-600 border-t flex justify-center gap-4">
                        <span>1st: {match.home_score_leg1 ?? '-'}-{match.away_score_leg1 ?? '-'}</span>
                        <span className="text-slate-300">|</span>
                        <span>2nd: {match.away_score_leg2 ?? '-'}-{match.home_score_leg2 ?? '-'}</span>
                    </div>
                )}
                {match.penalties && (
                    <div className="bg-blue-50 px-3 py-2 text-xs text-blue-700 text-center border-t font-semibold">
                        Penalties: {match.penalties}
                    </div>
                )}
                {match.venue && isFinal && (
                    <div className="bg-slate-50 px-3 py-1.5 text-xs text-slate-500 text-center border-t">
                        📍 {match.venue}
                    </div>
                )}
                <div className="border-t border-slate-100 flex">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="flex-1 text-xs text-slate-500 hover:text-slate-700 h-8"
                        onClick={() => setDetailViewMatch(match)}
                    >
                        <Eye className="w-3 h-3 mr-1" /> View Details
                    </Button>
                    {onEditMatch && (
                        <AdminOnly>
                            <div className="flex border-l">
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="text-xs text-slate-500 hover:text-slate-700 h-8"
                                    onClick={() => setLineupEditMatch(match)}
                                >
                                    <Users className="w-3 h-3 mr-1" /> Lineups
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="text-xs text-slate-500 hover:text-slate-700 h-8"
                                    onClick={() => onEditMatch(match)}
                                >
                                    <Edit2 className="w-3 h-3 mr-1" /> Edit
                                </Button>
                            </div>
                        </AdminOnly>
                    )}
                </div>
            </div>
        );
    };

    // Get the final match
    const finalMatch = matchesByRound['Final']?.[0];
    const semiMatches = matchesByRound['Semi-final'] || [];
    const quarterMatches = matchesByRound['Quarter-final'] || [];
    const r16Matches = matchesByRound['Round of 16'] || [];
    const r32Matches = matchesByRound['Round of 32'] || [];

    return (
        <div className="space-y-8">
            {/* Final - Most Prominent */}
            {finalMatch && (
                <div className="max-w-md mx-auto">
                    <MatchCard match={finalMatch} isFinal={true} />
                </div>
            )}

            {/* Semi-finals */}
            {semiMatches.length > 0 && (
                <div>
                    <h3 className="text-center text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
                        {getRoundDisplayName('Semi-final')}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
                        {semiMatches.sort((a, b) => (a.match_number || 0) - (b.match_number || 0)).map(match => (
                            <MatchCard key={match.id} match={match} />
                        ))}
                    </div>
                </div>
            )}

            {/* Quarter-finals */}
            {quarterMatches.length > 0 && (
                <div>
                    <h3 className="text-center text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
                        {getRoundDisplayName('Quarter-final')}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {quarterMatches.sort((a, b) => (a.match_number || 0) - (b.match_number || 0)).map(match => (
                            <MatchCard key={match.id} match={match} />
                        ))}
                    </div>
                </div>
            )}

            {/* Round of 16 */}
            {r16Matches.length > 0 && (
                <div>
                    <h3 className="text-center text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
                        {getRoundDisplayName('Round of 16')}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {r16Matches.sort((a, b) => (a.match_number || 0) - (b.match_number || 0)).map(match => (
                            <MatchCard key={match.id} match={match} />
                        ))}
                    </div>
                </div>
            )}

            {/* Round of 32 */}
            {r32Matches.length > 0 && (
                <div>
                    <h3 className="text-center text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
                        {getRoundDisplayName('Round of 32')}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {r32Matches.sort((a, b) => (a.match_number || 0) - (b.match_number || 0)).map(match => (
                            <MatchCard key={match.id} match={match} />
                        ))}
                    </div>
                </div>
            )}

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 text-sm text-slate-500 pt-4 border-t">
                <span className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-emerald-100 border-2 border-emerald-300 rounded" />
                    Winner
                </span>
                <span className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    Advanced
                </span>
            </div>

            <MatchLineupEditor 
                match={lineupEditMatch}
                isOpen={!!lineupEditMatch}
                onClose={() => setLineupEditMatch(null)}
            />

            <MatchDetailView 
                match={detailViewMatch}
                isOpen={!!detailViewMatch}
                onClose={() => setDetailViewMatch(null)}
            />
        </div>
    );
}