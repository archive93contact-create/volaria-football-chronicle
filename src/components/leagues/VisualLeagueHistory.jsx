import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Crown, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function VisualLeagueHistory({ league, seasons = [], clubs = [] }) {
    const historyData = useMemo(() => {
        if (seasons.length === 0) return null;

        const sortedSeasons = [...seasons].sort((a, b) => a.year.localeCompare(b.year));
        
        // Count titles per club
        const titleCounts = {};
        sortedSeasons.forEach(s => {
            if (s.champion_name) {
                const name = s.champion_name.trim();
                if (!titleCounts[name]) {
                    titleCounts[name] = { count: 0, years: [], firstTitle: s.year, lastTitle: s.year };
                }
                titleCounts[name].count++;
                titleCounts[name].years.push(s.year);
                titleCounts[name].lastTitle = s.year;
            }
        });

        // Find dynasties (3+ consecutive titles)
        const dynasties = [];
        Object.entries(titleCounts).forEach(([club, data]) => {
            const years = data.years.sort();
            let streak = 1;
            let streakStart = years[0];
            
            for (let i = 1; i < years.length; i++) {
                const prevYear = parseInt(years[i - 1]);
                const currYear = parseInt(years[i]);
                
                if (currYear - prevYear === 1) {
                    streak++;
                } else {
                    if (streak >= 3) {
                        dynasties.push({ club, start: streakStart, end: years[i - 1], count: streak });
                    }
                    streak = 1;
                    streakStart = years[i];
                }
            }
            if (streak >= 3) {
                dynasties.push({ club, start: streakStart, end: years[years.length - 1], count: streak });
            }
        });

        // Top champions
        const topChampions = Object.entries(titleCounts)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 10);

        // Identify eras (periods dominated by certain clubs)
        const eras = [];
        let currentEra = null;
        const WINDOW_SIZE = 5;
        
        for (let i = 0; i <= sortedSeasons.length - WINDOW_SIZE; i++) {
            const window = sortedSeasons.slice(i, i + WINDOW_SIZE);
            const champCounts = {};
            window.forEach(s => {
                if (s.champion_name) {
                    champCounts[s.champion_name] = (champCounts[s.champion_name] || 0) + 1;
                }
            });
            const dominant = Object.entries(champCounts).find(([_, count]) => count >= 3);
            
            if (dominant) {
                if (currentEra && currentEra.club === dominant[0]) {
                    currentEra.end = window[window.length - 1].year;
                } else {
                    if (currentEra) eras.push(currentEra);
                    currentEra = {
                        club: dominant[0],
                        start: window[0].year,
                        end: window[window.length - 1].year
                    };
                }
            }
        }
        if (currentEra) eras.push(currentEra);

        return {
            totalSeasons: sortedSeasons.length,
            firstSeason: sortedSeasons[0]?.year,
            lastSeason: sortedSeasons[sortedSeasons.length - 1]?.year,
            uniqueChampions: Object.keys(titleCounts).length,
            topChampions,
            dynasties,
            eras,
            seasons: sortedSeasons
        };
    }, [seasons]);

    const getClubId = (clubName) => {
        const club = clubs.find(c => c.name.toLowerCase() === clubName?.toLowerCase());
        return club?.id;
    };

    // Get club's actual primary color, fallback to generated color
    const getClubColor = (clubName) => {
        const club = clubs.find(c => c.name?.toLowerCase() === clubName?.toLowerCase());
        if (club?.primary_color) {
            return club.primary_color;
        }
        // Fallback: generate a color based on their name
        const colors = [
            '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', 
            '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
            '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e'
        ];
        let hash = 0;
        for (let i = 0; i < (clubName || '').length; i++) {
            hash = clubName.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    };

    if (!historyData) {
        return null;
    }

    return (
        <Card className="border-0 shadow-sm mb-8">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-indigo-500" />
                    League History Timeline
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Stats Overview */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 bg-slate-50 rounded-lg text-center">
                        <div className="text-2xl font-bold text-slate-800">{historyData.totalSeasons}</div>
                        <div className="text-xs text-slate-500">Seasons Played</div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg text-center">
                        <div className="text-2xl font-bold text-slate-800">{historyData.uniqueChampions}</div>
                        <div className="text-xs text-slate-500">Different Champions</div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg text-center">
                        <div className="text-lg font-bold text-slate-800">{historyData.firstSeason}</div>
                        <div className="text-xs text-slate-500">First Season</div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg text-center">
                        <div className="text-lg font-bold text-slate-800">{historyData.lastSeason}</div>
                        <div className="text-xs text-slate-500">Latest Season</div>
                    </div>
                </div>

                {/* Visual Timeline */}
                <div className="mt-6">
                    <h4 className="font-semibold text-slate-700 mb-3">Champions Timeline</h4>
                    <div className="overflow-x-auto pb-2">
                        <div className="flex gap-1 min-w-max">
                            {historyData.seasons.map((season, idx) => {
                                const color = season.champion_name ? getClubColor(season.champion_name) : '#cbd5e1';
                                const clubId = getClubId(season.champion_name);
                                return (
                                    <div 
                                        key={season.id || idx}
                                        className="group relative"
                                    >
                                        <div 
                                            className="w-6 h-12 rounded cursor-pointer transition-transform hover:scale-110"
                                            style={{ backgroundColor: color }}
                                            title={`${season.year}: ${season.champion_name || 'Unknown'}`}
                                        />
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                                            <div className="bg-slate-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                                                <div className="font-bold">{season.year}</div>
                                                <div>{season.champion_name || 'Unknown'}</div>
                                            </div>
                                        </div>
                                        {idx % 10 === 0 && (
                                            <div className="text-xs text-slate-400 mt-1 text-center" style={{ fontSize: '10px' }}>
                                                {season.year}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Top Champions */}
                <div>
                    <h4 className="font-semibold text-slate-700 mb-3">Most Successful Clubs</h4>
                    <div className="space-y-2">
                        {historyData.topChampions.map(([club, data], idx) => {
                            const maxTitles = historyData.topChampions[0][1].count;
                            const width = (data.count / maxTitles) * 100;
                            const clubId = getClubId(club);
                            
                            return (
                                <div key={club} className="flex items-center gap-3">
                                    <div className="w-6 text-center font-bold text-slate-400">
                                        {idx === 0 ? <Crown className="w-4 h-4 text-amber-500 mx-auto" /> : idx + 1}
                                    </div>
                                    <div className="w-32 md:w-48 truncate font-medium text-sm">
                                        {clubId ? (
                                            <Link to={createPageUrl('ClubDetail') + `?id=${clubId}`} className="hover:text-emerald-600 hover:underline">
                                                {club}
                                            </Link>
                                        ) : club}
                                    </div>
                                    <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden">
                                        <div 
                                            className="h-full rounded-full flex items-center justify-end pr-2 transition-all duration-500"
                                            style={{ 
                                                width: `${width}%`, 
                                                backgroundColor: getClubColor(club),
                                                minWidth: '2rem'
                                            }}
                                        >
                                            <span className="text-white text-xs font-bold">{data.count}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Dynasties */}
                {historyData.dynasties.length > 0 && (
                    <div>
                        <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                            <Trophy className="w-4 h-4 text-amber-500" />
                            Dynasties (3+ Consecutive Titles)
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {historyData.dynasties.map((dynasty, idx) => {
                                const clubId = getClubId(dynasty.club);
                                return (
                                    <div 
                                        key={idx}
                                        className="px-3 py-2 rounded-lg border"
                                        style={{ 
                                            backgroundColor: `${getClubColor(dynasty.club)}15`,
                                            borderColor: getClubColor(dynasty.club)
                                        }}
                                    >
                                        <div className="font-bold text-sm" style={{ color: getClubColor(dynasty.club) }}>
                                            {clubId ? (
                                                <Link to={createPageUrl('ClubDetail') + `?id=${clubId}`} className="hover:underline">
                                                    {dynasty.club}
                                                </Link>
                                            ) : dynasty.club}
                                        </div>
                                        <div className="text-xs text-slate-600">
                                            {dynasty.count} titles ({dynasty.start}–{dynasty.end})
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Legend */}
                <div className="pt-4 border-t">
                    <h4 className="text-xs font-semibold text-slate-500 mb-2">CLUB COLORS</h4>
                    <div className="flex flex-wrap gap-2">
                        {historyData.topChampions.slice(0, 8).map(([club]) => (
                            <div key={club} className="flex items-center gap-1.5">
                                <div 
                                    className="w-3 h-3 rounded"
                                    style={{ backgroundColor: getClubColor(club) }}
                                />
                                <span className="text-xs text-slate-600">{club}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}