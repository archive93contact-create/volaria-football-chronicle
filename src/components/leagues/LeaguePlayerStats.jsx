import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Globe, TrendingUp, Award, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function LeaguePlayerStats({ league, clubs, nation }) {
    const { data: players = [], isLoading } = useQuery({
        queryKey: ['leaguePlayers', league.id],
        queryFn: async () => {
            const clubIds = clubs.map(c => c.id);
            const allPlayers = await base44.entities.Player.list();
            return allPlayers.filter(p => clubIds.includes(p.club_id) && !p.is_youth_player);
        },
        enabled: clubs.length > 0,
    });

    const { data: allNations = [] } = useQuery({
        queryKey: ['allNations'],
        queryFn: () => base44.entities.Nation.list(),
    });

    if (isLoading) {
        return (
            <Card className="border-0 shadow-sm">
                <CardContent className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                </CardContent>
            </Card>
        );
    }

    if (players.length === 0) {
        return (
            <Card className="border-0 shadow-sm">
                <CardHeader><CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" /> Player Statistics</CardTitle></CardHeader>
                <CardContent className="py-8 text-center text-slate-500">
                    No player data available yet
                </CardContent>
            </Card>
        );
    }

    // Calculate stats
    const nationalityCount = {};
    players.forEach(p => {
        if (p.nationality) {
            nationalityCount[p.nationality] = (nationalityCount[p.nationality] || 0) + 1;
        }
    });

    const homegrown = nationalityCount[nation?.name] || 0;
    const homegrownPercent = ((homegrown / players.length) * 100).toFixed(1);

    const avgAge = (players.reduce((sum, p) => sum + (p.age || 0), 0) / players.length).toFixed(1);
    
    const avgSquadSize = (players.length / clubs.length).toFixed(1);

    // Top nationalities
    const topNationalities = Object.entries(nationalityCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count]) => ({
            name,
            count,
            percentage: ((count / players.length) * 100).toFixed(1),
            isHome: name === nation?.name
        }));

    // Best players
    const bestPlayers = [...players]
        .filter(p => p.overall_rating)
        .sort((a, b) => b.overall_rating - a.overall_rating)
        .slice(0, 10);

    const avgRating = players.filter(p => p.overall_rating).reduce((sum, p) => sum + p.overall_rating, 0) / players.filter(p => p.overall_rating).length;

    return (
        <div className="space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50">
                    <CardContent className="p-4 text-center">
                        <Users className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                        <div className="text-2xl font-bold">{players.length}</div>
                        <div className="text-xs text-slate-500">Total Players</div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-teal-50">
                    <CardContent className="p-4 text-center">
                        <Globe className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                        <div className="text-2xl font-bold">{homegrownPercent}%</div>
                        <div className="text-xs text-slate-500">Homegrown</div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-pink-50">
                    <CardContent className="p-4 text-center">
                        <TrendingUp className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                        <div className="text-2xl font-bold">{avgAge}</div>
                        <div className="text-xs text-slate-500">Avg Age</div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-yellow-50">
                    <CardContent className="p-4 text-center">
                        <Award className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                        <div className="text-2xl font-bold">{avgRating ? avgRating.toFixed(1) : 'N/A'}</div>
                        <div className="text-xs text-slate-500">Avg Rating</div>
                    </CardContent>
                </Card>
            </div>

            {/* Nationality Distribution */}
            <Card className="border-0 shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Globe className="w-5 h-5 text-emerald-600" />
                        Player Nationalities
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {topNationalities.map(({ name, count, percentage, isHome }) => {
                            const flagNation = allNations.find(n => n.name === name);
                            return (
                                <div key={name} className={`flex items-center gap-3 p-3 rounded-lg ${isHome ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50'}`}>
                                    <div className="flex items-center gap-2 flex-1">
                                        {flagNation?.flag_url && (
                                            <img src={flagNation.flag_url} alt={name} className="w-8 h-6 object-cover rounded shadow-sm" />
                                        )}
                                        <Link 
                                            to={createPageUrl(`NationDetail?id=${flagNation?.id}`)} 
                                            className={`font-medium hover:underline ${isHome ? 'text-emerald-700 font-bold' : 'text-slate-700'}`}
                                        >
                                            {name} {isHome && '🏠'}
                                        </Link>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-lg">{count}</div>
                                        <div className="text-xs text-slate-500">{percentage}%</div>
                                    </div>
                                    <div className="w-32">
                                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full ${isHome ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Best Players */}
            {bestPlayers.length > 0 && (
                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Award className="w-5 h-5 text-amber-600" />
                            Top Players
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {bestPlayers.map((player, idx) => {
                                const playerClub = clubs.find(c => c.id === player.club_id);
                                const playerNation = allNations.find(n => n.name === player.nationality);
                                return (
                                    <div key={player.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white font-bold text-sm">
                                            {idx + 1}
                                        </div>
                                        {player.photo_url && (
                                            <img src={player.photo_url} alt={player.full_name} className="w-12 h-12 rounded-full object-cover" />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <Link to={createPageUrl(`PlayerDetail?id=${player.id}`)} className="font-semibold hover:text-emerald-600 hover:underline truncate block">
                                                {player.full_name}
                                            </Link>
                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                <span className="font-medium text-slate-700">{player.overall_rating} OVR</span>
                                                <span>•</span>
                                                <span>{player.position}</span>
                                                {playerNation?.flag_url && (
                                                    <>
                                                        <span>•</span>
                                                        <img src={playerNation.flag_url} alt={player.nationality} className="w-4 h-3 object-cover rounded" />
                                                    </>
                                                )}
                                            </div>
                                            {playerClub && (
                                                <Link to={createPageUrl(`ClubDetail?id=${playerClub.id}`)} className="text-xs text-slate-500 hover:text-emerald-600 truncate block">
                                                    {playerClub.name}
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}