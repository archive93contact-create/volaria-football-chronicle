import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, Area, AreaChart } from 'recharts';
import { Trophy, TrendingUp, Home, Plane, Swords, Star, Users, Activity, Flame, Award } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function ClubAnalytics({ club, seasons = [], allLeagues = [], allClubs = [], allLeagueTables = [] }) {
    const analytics = useMemo(() => {
        if (!club || seasons.length === 0) return null;

        // Performance trends
        const performanceTrends = seasons.map(s => {
            const league = allLeagues.find(l => l.id === s.league_id);
            const winRate = s.played > 0 ? ((s.won / s.played) * 100).toFixed(1) : 0;
            const ppg = s.played > 0 ? (s.points / s.played).toFixed(2) : 0;
            return {
                year: s.year,
                position: s.position,
                points: s.points,
                winRate: parseFloat(winRate),
                ppg: parseFloat(ppg),
                tier: league?.tier || s.tier || 1,
                goalsFor: s.goals_for,
                goalsAgainst: s.goals_against
            };
        }).sort((a, b) => a.year.localeCompare(b.year));

        // Home vs Away (estimated - split stats roughly 60/40)
        const totalHome = { wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, games: 0 };
        const totalAway = { wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, games: 0 };
        seasons.forEach(s => {
            const homeGames = Math.ceil(s.played / 2);
            const awayGames = Math.floor(s.played / 2);
            // Estimate home bias (typically 55% of wins are at home)
            const homeWins = Math.round(s.won * 0.55);
            const awayWins = s.won - homeWins;
            const homeDraws = Math.round(s.drawn * 0.5);
            const awayDraws = s.drawn - homeDraws;
            const homeLosses = homeGames - homeWins - homeDraws;
            const awayLosses = awayGames - awayWins - awayDraws;
            
            totalHome.wins += homeWins;
            totalHome.draws += homeDraws;
            totalHome.losses += homeLosses;
            totalHome.games += homeGames;
            totalHome.goalsFor += Math.round(s.goals_for * 0.57);
            totalHome.goalsAgainst += Math.round(s.goals_against * 0.43);
            
            totalAway.wins += awayWins;
            totalAway.draws += awayDraws;
            totalAway.losses += awayLosses;
            totalAway.games += awayGames;
            totalAway.goalsFor += s.goals_for - totalHome.goalsFor;
            totalAway.goalsAgainst += s.goals_against - totalHome.goalsAgainst;
        });

        // Rival head-to-head (using league tables data)
        const rivalRecords = [];
        if (club.rival_club_ids && club.rival_club_ids.length > 0) {
            club.rival_club_ids.forEach(rivalId => {
                const rival = allClubs.find(c => c.id === rivalId);
                if (!rival) return;
                
                // Count seasons where both clubs were in same league
                let meetings = 0;
                let clubBetterFinishes = 0;
                let rivalBetterFinishes = 0;
                let draws = 0;
                
                seasons.forEach(s => {
                    const rivalSeason = allLeagueTables.find(t => 
                        (t.club_id === rivalId || t.club_name === rival.name) && 
                        t.league_id === s.league_id && 
                        t.year === s.year
                    );
                    if (rivalSeason) {
                        meetings++;
                        if (s.position < rivalSeason.position) clubBetterFinishes++;
                        else if (s.position > rivalSeason.position) rivalBetterFinishes++;
                        else draws++;
                    }
                });
                
                if (meetings > 0) {
                    rivalRecords.push({
                        rival: rival.name,
                        rivalId: rival.id,
                        meetings,
                        wins: clubBetterFinishes,
                        draws,
                        losses: rivalBetterFinishes
                    });
                }
            });
        }

        // Peak years detection (3+ consecutive top-3 finishes or title wins)
        const peakYears = [];
        let currentPeak = null;
        performanceTrends.forEach((season, idx) => {
            if (season.position <= 3 || seasons.find(s => s.year === season.year && s.champion_name === club.name)) {
                if (!currentPeak) {
                    currentPeak = { start: season.year, end: season.year, titles: 0, topThree: 0 };
                }
                currentPeak.end = season.year;
                if (seasons.find(s => s.year === season.year && s.champion_name === club.name)) currentPeak.titles++;
                if (season.position <= 3) currentPeak.topThree++;
            } else if (currentPeak) {
                const years = parseInt(currentPeak.end) - parseInt(currentPeak.start) + 1;
                if (years >= 3) peakYears.push(currentPeak);
                currentPeak = null;
            }
        });
        if (currentPeak) {
            const years = parseInt(currentPeak.end) - parseInt(currentPeak.start) + 1;
            if (years >= 3) peakYears.push(currentPeak);
        }

        // Streaks & Records
        const streaks = { longestWinStreak: 0, longestUnbeaten: 0, currentForm: [] };
        // Note: Would need match-by-match data for accurate streaks, using season-level approximations

        // Trophy timeline
        const trophyTimeline = [];
        if (club.title_years) {
            club.title_years.split(',').forEach(year => {
                trophyTimeline.push({ year: year.trim(), trophy: 'League Title', icon: Trophy });
            });
        }
        if (club.vcc_title_years) {
            club.vcc_title_years.split(',').forEach(year => {
                trophyTimeline.push({ year: year.trim(), trophy: 'VCC', icon: Star });
            });
        }
        if (club.ccc_title_years) {
            club.ccc_title_years.split(',').forEach(year => {
                trophyTimeline.push({ year: year.trim(), trophy: 'CCC', icon: Award });
            });
        }
        trophyTimeline.sort((a, b) => a.year.localeCompare(b.year));

        // Stability trajectory
        const stabilityData = performanceTrends.map(s => ({
            year: s.year,
            stability: club.stability_points || 50 // Would need historical data
        }));

        return {
            performanceTrends,
            homeAway: { home: totalHome, away: totalAway },
            rivalRecords,
            peakYears,
            streaks,
            trophyTimeline,
            stabilityData
        };
    }, [club, seasons, allLeagues, allClubs, allLeagueTables]);

    if (!analytics) {
        return (
            <Card className="border-0 shadow-sm">
                <CardContent className="p-8 text-center text-slate-500">
                    No season data available for analytics
                </CardContent>
            </Card>
        );
    }

    const { performanceTrends, homeAway, rivalRecords, peakYears, trophyTimeline } = analytics;

    return (
        <div className="space-y-6">
            {/* Performance Trends */}
            <Card className="border-0 shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-blue-500" />
                        Performance Trends
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={performanceTrends}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="year" />
                            <YAxis yAxisId="left" reversed domain={[1, 'dataMax']} label={{ value: 'Position', angle: -90, position: 'insideLeft' }} />
                            <YAxis yAxisId="right" orientation="right" label={{ value: 'Points', angle: 90, position: 'insideRight' }} />
                            <Tooltip />
                            <Legend />
                            <Line yAxisId="left" type="monotone" dataKey="position" stroke="#ef4444" name="Position" strokeWidth={2} />
                            <Line yAxisId="right" type="monotone" dataKey="points" stroke="#10b981" name="Points" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Home vs Away */}
                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Home className="w-5 h-5 text-emerald-500" />
                            Home vs Away
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="p-4 bg-emerald-50 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-semibold text-emerald-800">Home</span>
                                    <Home className="w-5 h-5 text-emerald-600" />
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-sm">
                                    <div className="text-center">
                                        <div className="font-bold text-lg text-green-600">{homeAway.home.wins}</div>
                                        <div className="text-xs text-slate-600">Wins</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="font-bold text-lg">{homeAway.home.draws}</div>
                                        <div className="text-xs text-slate-600">Draws</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="font-bold text-lg text-red-600">{homeAway.home.losses}</div>
                                        <div className="text-xs text-slate-600">Losses</div>
                                    </div>
                                </div>
                                <div className="mt-2 text-center text-sm">
                                    <span className="font-semibold">{homeAway.home.goalsFor}-{homeAway.home.goalsAgainst}</span>
                                    <span className="text-slate-500 ml-2">({homeAway.home.games} games)</span>
                                </div>
                            </div>
                            <div className="p-4 bg-blue-50 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-semibold text-blue-800">Away</span>
                                    <Plane className="w-5 h-5 text-blue-600" />
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-sm">
                                    <div className="text-center">
                                        <div className="font-bold text-lg text-green-600">{homeAway.away.wins}</div>
                                        <div className="text-xs text-slate-600">Wins</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="font-bold text-lg">{homeAway.away.draws}</div>
                                        <div className="text-xs text-slate-600">Draws</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="font-bold text-lg text-red-600">{homeAway.away.losses}</div>
                                        <div className="text-xs text-slate-600">Losses</div>
                                    </div>
                                </div>
                                <div className="mt-2 text-center text-sm">
                                    <span className="font-semibold">{homeAway.away.goalsFor}-{homeAway.away.goalsAgainst}</span>
                                    <span className="text-slate-500 ml-2">({homeAway.away.games} games)</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Peak Years */}
                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Flame className="w-5 h-5 text-orange-500" />
                            Golden Eras
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {peakYears.length === 0 ? (
                            <p className="text-slate-500 text-sm">No sustained peak periods detected yet</p>
                        ) : (
                            <div className="space-y-3">
                                {peakYears.map((peak, idx) => (
                                    <div key={idx} className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200">
                                        <div className="font-semibold text-amber-800">{peak.start} - {peak.end}</div>
                                        <div className="text-sm text-slate-600 mt-1">
                                            {peak.titles > 0 && <span className="mr-3">🏆 {peak.titles} title{peak.titles > 1 ? 's' : ''}</span>}
                                            <span>📊 {peak.topThree} top-3 finishes</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Rival Head-to-Head */}
            {rivalRecords.length > 0 && (
                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Swords className="w-5 h-5 text-red-500" />
                            Rival Head-to-Head
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {rivalRecords.map((record, idx) => (
                                <div key={idx} className="p-4 bg-slate-50 rounded-lg flex items-center justify-between">
                                    <Link to={createPageUrl(`ClubDetail?id=${record.rivalId}`)} className="font-semibold text-slate-800 hover:text-indigo-600">
                                        vs {record.rival}
                                    </Link>
                                    <div className="flex items-center gap-6 text-sm">
                                        <span className="text-slate-500">{record.meetings} meetings</span>
                                        <div className="flex items-center gap-3">
                                            <span className="text-green-600 font-bold">{record.wins}W</span>
                                            <span className="text-slate-600">{record.draws}D</span>
                                            <span className="text-red-600 font-bold">{record.losses}L</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Trophy Timeline */}
            {trophyTimeline.length > 0 && (
                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-amber-500" />
                            Trophy Timeline
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="relative">
                            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />
                            <div className="space-y-4">
                                {trophyTimeline.map((trophy, idx) => (
                                    <div key={idx} className="flex items-center gap-4 relative">
                                        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center z-10 border-2 border-white">
                                            <trophy.icon className="w-4 h-4 text-amber-600" />
                                        </div>
                                        <div className="flex-1 p-3 bg-slate-50 rounded-lg">
                                            <div className="font-semibold text-slate-800">{trophy.trophy}</div>
                                            <div className="text-sm text-slate-500">{trophy.year}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Win Rate & PPG */}
            <Card className="border-0 shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-emerald-500" />
                        Historical Win Rate & Points Per Game
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                        <AreaChart data={performanceTrends}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="year" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Area type="monotone" dataKey="winRate" stroke="#10b981" fill="#d1fae5" name="Win Rate %" />
                            <Area type="monotone" dataKey="ppg" stroke="#3b82f6" fill="#dbeafe" name="Points Per Game" />
                        </AreaChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
}