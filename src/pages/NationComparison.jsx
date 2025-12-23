import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import { Globe, Trophy, Shield, Users, Star, BarChart3, ArrowLeftRight, Target } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from '@/components/common/PageHeader';
import { Badge } from "@/components/ui/badge";

export default function NationComparison() {
    const [nation1Id, setNation1Id] = useState('');
    const [nation2Id, setNation2Id] = useState('');

    const { data: nations = [] } = useQuery({
        queryKey: ['nations'],
        queryFn: () => base44.entities.Nation.list('name'),
    });

    const { data: leagues = [] } = useQuery({
        queryKey: ['leagues'],
        queryFn: () => base44.entities.League.list(),
    });

    const { data: clubs = [] } = useQuery({
        queryKey: ['clubs'],
        queryFn: () => base44.entities.Club.list(),
    });

    const { data: players = [] } = useQuery({
        queryKey: ['players'],
        queryFn: () => base44.entities.Player.list(),
    });

    const { data: coefficients = [] } = useQuery({
        queryKey: ['coefficients'],
        queryFn: () => base44.entities.CountryCoefficient.list(),
    });

    const compareStats = useMemo(() => {
        if (!nation1Id || !nation2Id) return null;

        const getNationStats = (nationId) => {
            const nation = nations.find(n => n.id === nationId);
            if (!nation) return null;

            const nationLeagues = leagues.filter(l => l.nation_id === nationId);
            const nationClubs = clubs.filter(c => c.nation_id === nationId);
            const nationPlayers = players.filter(p => p.nation_id === nationId);
            const coeff = coefficients.find(c => c.nation_id === nationId);

            // National team strength (top 22 players)
            let nationalTeamOVR = null;
            if (nationPlayers.length > 0) {
                const sortedPlayers = nationPlayers
                    .filter(p => p.overall_rating)
                    .sort((a, b) => b.overall_rating - a.overall_rating);
                const top22 = sortedPlayers.slice(0, 22);
                nationalTeamOVR = top22.length > 0 ? Math.round(top22.reduce((sum, p) => sum + p.overall_rating, 0) / top22.length) : null;
            }

            // Continental success
            const vccTitles = nationClubs.reduce((sum, c) => sum + (c.vcc_titles || 0), 0);
            const cccTitles = nationClubs.reduce((sum, c) => sum + (c.ccc_titles || 0), 0);

            // League pyramid depth
            const maxTier = Math.max(...nationLeagues.map(l => l.tier || 1), 1);

            // Total stadium capacity
            const totalCapacity = nationClubs.reduce((sum, c) => sum + (c.stadium_capacity || 0), 0);

            // Professional clubs
            const proClubs = nationClubs.filter(c => c.professional_status === 'professional').length;

            return {
                nation,
                leagueCount: nationLeagues.length,
                clubCount: nationClubs.length,
                playerCount: nationPlayers.length,
                rank: coeff?.rank || 999,
                coefficientPoints: coeff?.total_points || 0,
                nationalTeamOVR,
                vccTitles,
                cccTitles,
                maxTier,
                totalCapacity,
                proClubs,
                vccSpots: coeff?.vcc_spots || 0,
                cccSpots: coeff?.ccc_spots || 0
            };
        };

        return {
            nation1: getNationStats(nation1Id),
            nation2: getNationStats(nation2Id)
        };
    }, [nation1Id, nation2Id, nations, leagues, clubs, players, coefficients]);

    const renderComparison = (label, val1, val2, icon, higherBetter = true) => {
        const better1 = higherBetter ? val1 > val2 : val1 < val2;
        const better2 = higherBetter ? val2 > val1 : val2 < val1;
        
        return (
            <div className="grid grid-cols-3 gap-4 py-3 border-b border-slate-100">
                <div className={`text-right text-lg font-bold ${better1 ? 'text-emerald-600' : 'text-slate-700'}`}>
                    {val1}
                </div>
                <div className="text-center flex items-center justify-center gap-2 text-slate-500">
                    {icon}
                    <span className="text-sm">{label}</span>
                </div>
                <div className={`text-left text-lg font-bold ${better2 ? 'text-emerald-600' : 'text-slate-700'}`}>
                    {val2}
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <PageHeader 
                title="Nation Comparison"
                subtitle="Compare two nations side by side"
                breadcrumbs={[
                    { label: 'Nations', url: createPageUrl('Nations') },
                    { label: 'Nation Comparison' }
                ]}
            />

            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Nation Selectors */}
                <Card className="border-0 shadow-sm mb-8">
                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                            <Select value={nation1Id} onValueChange={setNation1Id}>
                                <SelectTrigger className="h-12">
                                    <SelectValue placeholder="Select first nation" />
                                </SelectTrigger>
                                <SelectContent>
                                    {nations.map(nation => (
                                        <SelectItem key={nation.id} value={nation.id}>
                                            {nation.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <div className="flex justify-center">
                                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                                    <ArrowLeftRight className="w-6 h-6 text-slate-400" />
                                </div>
                            </div>

                            <Select value={nation2Id} onValueChange={setNation2Id}>
                                <SelectTrigger className="h-12">
                                    <SelectValue placeholder="Select second nation" />
                                </SelectTrigger>
                                <SelectContent>
                                    {nations.map(nation => (
                                        <SelectItem key={nation.id} value={nation.id}>
                                            {nation.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* Comparison Results */}
                {compareStats?.nation1 && compareStats?.nation2 && (
                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-6">
                            {/* Headers */}
                            <div className="grid grid-cols-3 gap-4 mb-6 pb-4 border-b-2 border-slate-200">
                                <div className="text-right">
                                    <Link to={createPageUrl(`NationDetail?id=${nation1Id}`)} className="hover:text-emerald-600">
                                        <div className="flex items-center justify-end gap-2 mb-2">
                                            {compareStats.nation1.nation.flag_url && (
                                                <img src={compareStats.nation1.nation.flag_url} alt="" className="w-8 h-5 object-cover rounded" />
                                            )}
                                        </div>
                                        <h3 className="text-xl font-bold">{compareStats.nation1.nation.name}</h3>
                                        {compareStats.nation1.nation.membership && (
                                            <Badge className={compareStats.nation1.nation.membership === 'VCC' ? 'bg-amber-500 text-white mt-2' : 'bg-blue-500 text-white mt-2'}>
                                                {compareStats.nation1.nation.membership}
                                            </Badge>
                                        )}
                                    </Link>
                                </div>
                                <div className="text-center">
                                    <BarChart3 className="w-8 h-8 text-slate-300 mx-auto" />
                                </div>
                                <div className="text-left">
                                    <Link to={createPageUrl(`NationDetail?id=${nation2Id}`)} className="hover:text-emerald-600">
                                        <div className="flex items-center gap-2 mb-2">
                                            {compareStats.nation2.nation.flag_url && (
                                                <img src={compareStats.nation2.nation.flag_url} alt="" className="w-8 h-5 object-cover rounded" />
                                            )}
                                        </div>
                                        <h3 className="text-xl font-bold">{compareStats.nation2.nation.name}</h3>
                                        {compareStats.nation2.nation.membership && (
                                            <Badge className={compareStats.nation2.nation.membership === 'VCC' ? 'bg-amber-500 text-white mt-2' : 'bg-blue-500 text-white mt-2'}>
                                                {compareStats.nation2.nation.membership}
                                            </Badge>
                                        )}
                                    </Link>
                                </div>
                            </div>

                            {/* Stats */}
                            {renderComparison('Coefficient Rank', 
                                compareStats.nation1.rank < 999 ? `#${compareStats.nation1.rank}` : '—', 
                                compareStats.nation2.rank < 999 ? `#${compareStats.nation2.rank}` : '—', 
                                <Star className="w-4 h-4" />, 
                                false
                            )}
                            {renderComparison('Coefficient Points', 
                                compareStats.nation1.coefficientPoints.toFixed(1), 
                                compareStats.nation2.coefficientPoints.toFixed(1), 
                                <Target className="w-4 h-4" />
                            )}
                            {renderComparison('National Team OVR', 
                                compareStats.nation1.nationalTeamOVR || '—', 
                                compareStats.nation2.nationalTeamOVR || '—', 
                                <Users className="w-4 h-4" />
                            )}
                            {renderComparison('Leagues', 
                                compareStats.nation1.leagueCount, 
                                compareStats.nation2.leagueCount, 
                                <Trophy className="w-4 h-4" />
                            )}
                            {renderComparison('Pyramid Depth', 
                                `${compareStats.nation1.maxTier} tier${compareStats.nation1.maxTier > 1 ? 's' : ''}`, 
                                `${compareStats.nation2.maxTier} tier${compareStats.nation2.maxTier > 1 ? 's' : ''}`, 
                                <BarChart3 className="w-4 h-4" />
                            )}
                            {renderComparison('Total Clubs', 
                                compareStats.nation1.clubCount, 
                                compareStats.nation2.clubCount, 
                                <Shield className="w-4 h-4" />
                            )}
                            {renderComparison('Professional Clubs', 
                                compareStats.nation1.proClubs, 
                                compareStats.nation2.proClubs, 
                                <Shield className="w-4 h-4" />
                            )}
                            {renderComparison('Total Players', 
                                compareStats.nation1.playerCount, 
                                compareStats.nation2.playerCount, 
                                <Users className="w-4 h-4" />
                            )}
                            {renderComparison('VCC Titles', 
                                compareStats.nation1.vccTitles, 
                                compareStats.nation2.vccTitles, 
                                <Trophy className="w-4 h-4" />
                            )}
                            {renderComparison('CCC Titles', 
                                compareStats.nation1.cccTitles, 
                                compareStats.nation2.cccTitles, 
                                <Trophy className="w-4 h-4" />
                            )}
                            {renderComparison('VCC Spots', 
                                compareStats.nation1.vccSpots, 
                                compareStats.nation2.vccSpots, 
                                <Star className="w-4 h-4" />
                            )}
                            {renderComparison('CCC Spots', 
                                compareStats.nation1.cccSpots, 
                                compareStats.nation2.cccSpots, 
                                <Star className="w-4 h-4" />
                            )}
                            {renderComparison('Total Capacity', 
                                compareStats.nation1.totalCapacity.toLocaleString(), 
                                compareStats.nation2.totalCapacity.toLocaleString(), 
                                <Users className="w-4 h-4" />
                            )}
                        </CardContent>
                    </Card>
                )}

                {(!nation1Id || !nation2Id) && (
                    <div className="text-center py-16 text-slate-500">
                        <Globe className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                        <p>Select two nations above to compare them</p>
                    </div>
                )}
            </div>
        </div>
    );
}