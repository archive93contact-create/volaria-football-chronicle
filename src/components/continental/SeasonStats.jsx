import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Target, Flag, TrendingUp, Award, Users, Globe, Zap } from 'lucide-react';

export default function SeasonStats({ matches, season, clubs = [], nations = [] }) {
    const stats = useMemo(() => {
        if (!matches || matches.length === 0) return null;

        // Calculate total goals
        let totalGoals = 0;
        const clubGoals = {};
        const clubAppearances = {};
        const nationGoals = {};
        const nationAppearances = {};
        const nationWins = {};
        
        matches.forEach(match => {
            // Count goals from all legs
            const homeGoals = (match.home_score_leg1 || 0) + (match.home_score_leg2 || 0);
            const awayGoals = (match.away_score_leg1 || 0) + (match.away_score_leg2 || 0);
            totalGoals += homeGoals + awayGoals;
            
            // Track club goals
            if (match.home_club_name) {
                clubGoals[match.home_club_name] = (clubGoals[match.home_club_name] || 0) + homeGoals;
                clubAppearances[match.home_club_name] = (clubAppearances[match.home_club_name] || 0) + 1;
            }
            if (match.away_club_name) {
                clubGoals[match.away_club_name] = (clubGoals[match.away_club_name] || 0) + awayGoals;
                clubAppearances[match.away_club_name] = (clubAppearances[match.away_club_name] || 0) + 1;
            }
            
            // Track nation stats
            if (match.home_club_nation) {
                nationGoals[match.home_club_nation] = (nationGoals[match.home_club_nation] || 0) + homeGoals;
                nationAppearances[match.home_club_nation] = (nationAppearances[match.home_club_nation] || 0) + 1;
                if (match.winner === match.home_club_name) {
                    nationWins[match.home_club_nation] = (nationWins[match.home_club_nation] || 0) + 1;
                }
            }
            if (match.away_club_nation) {
                nationGoals[match.away_club_nation] = (nationGoals[match.away_club_nation] || 0) + awayGoals;
                nationAppearances[match.away_club_nation] = (nationAppearances[match.away_club_nation] || 0) + 1;
                if (match.winner === match.away_club_name) {
                    nationWins[match.away_club_nation] = (nationWins[match.away_club_nation] || 0) + 1;
                }
            }
        });

        // Top scoring clubs
        const topScoringClubs = Object.entries(clubGoals)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, goals]) => ({ name, goals, matches: clubAppearances[name] }));

        // Best performing nations (by wins)
        const bestNations = Object.entries(nationWins)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, wins]) => ({ 
                name, 
                wins, 
                goals: nationGoals[name], 
                matches: nationAppearances[name] 
            }));

        // Top scoring nations
        const topScoringNations = Object.entries(nationGoals)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, goals]) => ({ name, goals, matches: nationAppearances[name] }));

        // Unique clubs and nations
        const uniqueClubs = new Set([
            ...matches.map(m => m.home_club_name),
            ...matches.map(m => m.away_club_name)
        ].filter(Boolean));

        const uniqueNations = new Set([
            ...matches.map(m => m.home_club_nation),
            ...matches.map(m => m.away_club_nation)
        ].filter(Boolean));

        // Count matches per round
        const roundCounts = {};
        matches.forEach(m => {
            roundCounts[m.round] = (roundCounts[m.round] || 0) + 1;
        });

        // Highest scoring match
        let highestScoringMatch = null;
        let maxGoals = 0;
        matches.forEach(match => {
            const matchGoals = (match.home_score_leg1 || 0) + (match.away_score_leg1 || 0) + 
                              (match.home_score_leg2 || 0) + (match.away_score_leg2 || 0);
            if (matchGoals > maxGoals) {
                maxGoals = matchGoals;
                highestScoringMatch = { ...match, totalGoals: matchGoals };
            }
        });

        return {
            totalGoals,
            totalMatches: matches.length,
            avgGoalsPerMatch: (totalGoals / matches.length).toFixed(1),
            uniqueClubs: uniqueClubs.size,
            uniqueNations: uniqueNations.size,
            topScoringClubs,
            bestNations,
            topScoringNations,
            roundCounts,
            highestScoringMatch
        };
    }, [matches]);

    if (!stats) return null;

    const getClub = (name) => clubs.find(c => c.name === name);
    const getNation = (name) => nations.find(n => n.name === name);

    return (
        <div className="space-y-6">
            {/* Key Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-4 text-center">
                        <Target className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-slate-800">{stats.totalGoals}</div>
                        <div className="text-xs text-slate-500">Total Goals</div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-4 text-center">
                        <Zap className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-slate-800">{stats.avgGoalsPerMatch}</div>
                        <div className="text-xs text-slate-500">Goals/Match</div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-4 text-center">
                        <Trophy className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-slate-800">{stats.totalMatches}</div>
                        <div className="text-xs text-slate-500">Matches</div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-4 text-center">
                        <Users className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-slate-800">{stats.uniqueClubs}</div>
                        <div className="text-xs text-slate-500">Clubs</div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-4 text-center">
                        <Globe className="w-6 h-6 text-teal-500 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-slate-800">{stats.uniqueNations}</div>
                        <div className="text-xs text-slate-500">Nations</div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Top Scoring Clubs */}
                <Card className="border-0 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Target className="w-4 h-4 text-emerald-500" />
                            Top Scoring Clubs
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {stats.topScoringClubs.map((item, idx) => {
                                const club = getClub(item.name);
                                return (
                                    <Link 
                                        key={item.name}
                                        to={club ? createPageUrl(`ClubDetail?id=${club.id}`) : '#'}
                                        className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
                                                {idx + 1}
                                            </span>
                                            {club?.logo_url && (
                                                <img src={club.logo_url} alt="" className="w-5 h-5 object-contain" />
                                            )}
                                            <span className="text-sm font-medium text-slate-700 truncate hover:text-emerald-600">
                                                {item.name}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <span className="font-bold text-emerald-600">{item.goals}</span>
                                            <span className="text-xs text-slate-400 ml-1">({item.matches}m)</span>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* Best Performing Nations */}
                <Card className="border-0 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Award className="w-4 h-4 text-amber-500" />
                            Best Nations (by wins)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {stats.bestNations.map((item, idx) => {
                                const nation = getNation(item.name);
                                return (
                                    <Link 
                                        key={item.name}
                                        to={nation ? createPageUrl(`NationDetail?id=${nation.id}`) : '#'}
                                        className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">
                                                {idx + 1}
                                            </span>
                                            {nation?.flag_url && (
                                                <img src={nation.flag_url} alt="" className="w-6 h-4 object-cover rounded-sm" />
                                            )}
                                            <span className="text-sm font-medium text-slate-700 truncate hover:text-amber-600">
                                                {item.name}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <span className="font-bold text-amber-600">{item.wins}W</span>
                                            <span className="text-xs text-slate-400 ml-1">{item.goals}g</span>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* Top Scoring Nations */}
                <Card className="border-0 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Flag className="w-4 h-4 text-blue-500" />
                            Top Scoring Nations
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {stats.topScoringNations.map((item, idx) => {
                                const nation = getNation(item.name);
                                return (
                                    <Link 
                                        key={item.name}
                                        to={nation ? createPageUrl(`NationDetail?id=${nation.id}`) : '#'}
                                        className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                                                {idx + 1}
                                            </span>
                                            {nation?.flag_url && (
                                                <img src={nation.flag_url} alt="" className="w-6 h-4 object-cover rounded-sm" />
                                            )}
                                            <span className="text-sm font-medium text-slate-700 truncate hover:text-blue-600">
                                                {item.name}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <span className="font-bold text-blue-600">{item.goals}</span>
                                            <span className="text-xs text-slate-400 ml-1">({item.matches}m)</span>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Highest Scoring Match */}
            {stats.highestScoringMatch && (
                <Card className="border-0 shadow-sm bg-gradient-to-r from-orange-50 to-amber-50">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <Zap className="w-8 h-8 text-orange-500" />
                            <div>
                                <div className="text-sm text-orange-600 font-medium">Highest Scoring Tie</div>
                                <div className="font-bold text-slate-800">
                                    {stats.highestScoringMatch.home_club_name} vs {stats.highestScoringMatch.away_club_name}
                                </div>
                                <div className="text-sm text-slate-500">
                                    {stats.highestScoringMatch.totalGoals} total goals in {stats.highestScoringMatch.round}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}