import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Target, ArrowRightLeft } from 'lucide-react';

export default function MatchDetailView({ match, isOpen, onClose }) {
    // Fetch all clubs to look up club IDs from names
    const { data: clubs = [] } = useQuery({
        queryKey: ['allClubs'],
        queryFn: () => base44.entities.Club.list(),
    });

    // Get club IDs from names if not directly available
    const homeClubId = match?.home_club_id || clubs.find(c => c.name === match?.home_club_name)?.id;
    const awayClubId = match?.away_club_id || clubs.find(c => c.name === match?.away_club_name)?.id;

    const { data: homePlayers = [] } = useQuery({
        queryKey: ['players', homeClubId],
        queryFn: () => base44.entities.Player.filter({ club_id: homeClubId }),
        enabled: !!homeClubId,
    });

    const { data: awayPlayers = [] } = useQuery({
        queryKey: ['players', awayClubId],
        queryFn: () => base44.entities.Player.filter({ club_id: awayClubId }),
        enabled: !!awayClubId,
    });

    const { data: nations = [] } = useQuery({
        queryKey: ['nations'],
        queryFn: () => base44.entities.Nation.list(),
    });

    if (!match) return null;

    const homeLineupPlayers = (match.home_lineup || []).map(id => homePlayers.find(p => p.id === id)).filter(Boolean);
    const awayLineupPlayers = (match.away_lineup || []).map(id => awayPlayers.find(p => p.id === id)).filter(Boolean);
    const homeSubsPlayers = (match.home_subs || []).map(id => homePlayers.find(p => p.id === id)).filter(Boolean);
    const awaySubsPlayers = (match.away_subs || []).map(id => awayPlayers.find(p => p.id === id)).filter(Boolean);

    const sortedHomeLineup = [...homeLineupPlayers].sort((a, b) => (a.shirt_number || 99) - (b.shirt_number || 99));
    const sortedAwayLineup = [...awayLineupPlayers].sort((a, b) => (a.shirt_number || 99) - (b.shirt_number || 99));
    const sortedHomeSubs = [...homeSubsPlayers].sort((a, b) => (a.shirt_number || 99) - (b.shirt_number || 99));
    const sortedAwaySubs = [...awaySubsPlayers].sort((a, b) => (a.shirt_number || 99) - (b.shirt_number || 99));

    const PlayerRow = ({ player }) => {
        const nation = nations.find(n => n.name === player.nationality);
        return (
            <Link to={createPageUrl(`PlayerDetail?id=${player.id}`)} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded group">
                <span className="font-mono text-sm text-slate-500 w-8">{player.shirt_number}</span>
                <span className="flex-1">{player.full_name}</span>
                {nation?.flag_url && <img src={nation.flag_url} alt="" className="w-5 h-3 object-contain" />}
                <Badge variant="outline" className="text-xs">{player.position}</Badge>
            </Link>
        );
    };

    const goals = match.goals || [];
    const substitutions = match.substitutions || [];

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-center">
                        <div className="flex items-center justify-center gap-4">
                            <span className="font-bold">{match.home_club_name}</span>
                            <span className="text-2xl text-emerald-600">
                                {match.is_single_leg ? `${match.home_score_leg1 ?? '-'} - ${match.away_score_leg1 ?? '-'}` : `${match.home_aggregate ?? '-'} - ${match.away_aggregate ?? '-'}`}
                            </span>
                            <span className="font-bold">{match.away_club_name}</span>
                        </div>
                        <div className="text-sm text-slate-500 font-normal mt-1">{match.round}</div>
                    </DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Home Team */}
                    <Card className="border-0 shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Users className="w-5 h-5 text-blue-600" />
                                {match.home_club_name}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {sortedHomeLineup.length > 0 ? (
                                <>
                                    <div className="mb-4">
                                        <div className="text-sm font-semibold text-slate-600 mb-2">Starting XI</div>
                                        <div className="space-y-1">
                                            {sortedHomeLineup.map(player => <PlayerRow key={player.id} player={player} />)}
                                        </div>
                                    </div>
                                    {sortedHomeSubs.length > 0 && (
                                        <div>
                                            <div className="text-sm font-semibold text-slate-600 mb-2">Substitutes</div>
                                            <div className="space-y-1">
                                                {sortedHomeSubs.map(player => <PlayerRow key={player.id} player={player} />)}
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-8 text-slate-400">
                                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">No lineup set</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Away Team */}
                    <Card className="border-0 shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Users className="w-5 h-5 text-red-600" />
                                {match.away_club_name}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {sortedAwayLineup.length > 0 ? (
                                <>
                                    <div className="mb-4">
                                        <div className="text-sm font-semibold text-slate-600 mb-2">Starting XI</div>
                                        <div className="space-y-1">
                                            {sortedAwayLineup.map(player => <PlayerRow key={player.id} player={player} />)}
                                        </div>
                                    </div>
                                    {sortedAwaySubs.length > 0 && (
                                        <div>
                                            <div className="text-sm font-semibold text-slate-600 mb-2">Substitutes</div>
                                            <div className="space-y-1">
                                                {sortedAwaySubs.map(player => <PlayerRow key={player.id} player={player} />)}
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-8 text-slate-400">
                                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">No lineup set</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Match Events */}
                {(goals.length > 0 || substitutions.length > 0) && (
                    <Card className="border-0 shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg">Match Events</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {/* Goals */}
                                {goals.sort((a, b) => a.minute - b.minute).map((goal, index) => {
                                    const players = goal.is_home ? homePlayers : awayPlayers;
                                    const player = players.find(p => p.id === goal.player_id);
                                    const nation = nations.find(n => n.name === player?.nationality);
                                    return (
                                        <div key={index} className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
                                            <Target className="w-5 h-5 text-emerald-600" />
                                            <span className="font-mono text-sm text-emerald-700 font-bold w-12">{goal.minute}'</span>
                                            {player ? (
                                                <Link to={createPageUrl(`PlayerDetail?id=${player.id}`)} className="flex-1 hover:underline">
                                                    {player.full_name}
                                                </Link>
                                            ) : (
                                                <span className="flex-1">Unknown Player</span>
                                            )}
                                            {nation?.flag_url && <img src={nation.flag_url} alt="" className="w-5 h-3 object-contain" />}
                                            <Badge className={goal.is_home ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"}>
                                                {goal.is_home ? match.home_club_name : match.away_club_name}
                                            </Badge>
                                        </div>
                                    );
                                })}
                                
                                {/* Substitutions */}
                                {substitutions.sort((a, b) => a.minute - b.minute).map((sub, index) => {
                                    const players = sub.is_home ? homePlayers : awayPlayers;
                                    const playerIn = players.find(p => p.id === sub.player_in_id);
                                    const playerOut = players.find(p => p.id === sub.player_out_id);
                                    return (
                                        <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                            <ArrowRightLeft className="w-5 h-5 text-slate-600" />
                                            <span className="font-mono text-sm text-slate-700 font-bold w-12">{sub.minute}'</span>
                                            <div className="flex-1">
                                                <div className="text-sm">
                                                    <span className="text-green-600">IN: </span>
                                                    {playerIn ? (
                                                        <Link to={createPageUrl(`PlayerDetail?id=${playerIn.id}`)} className="hover:underline">{playerIn.full_name}</Link>
                                                    ) : 'Unknown'}
                                                </div>
                                                <div className="text-sm">
                                                    <span className="text-red-600">OUT: </span>
                                                    {playerOut ? (
                                                        <Link to={createPageUrl(`PlayerDetail?id=${playerOut.id}`)} className="hover:underline">{playerOut.full_name}</Link>
                                                    ) : 'Unknown'}
                                                </div>
                                            </div>
                                            <Badge variant="outline">{sub.is_home ? match.home_club_name : match.away_club_name}</Badge>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </DialogContent>
        </Dialog>
    );
}