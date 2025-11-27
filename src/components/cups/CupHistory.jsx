import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Trophy, Star, Calendar, Flame, Award, Zap } from 'lucide-react';

export default function CupHistory({ cup, seasons = [], clubs = [] }) {
    const events = useMemo(() => {
        if (!cup || seasons.length === 0) return [];

        const sortedSeasons = [...seasons].sort((a, b) => a.year.localeCompare(b.year));
        const results = [];

        // Founding
        if (cup.founded_year) {
            results.push({
                year: cup.founded_year,
                icon: Calendar,
                color: 'text-slate-600',
                text: `The ${cup.name} was established.`
            });
        }

        // First edition
        const firstSeason = sortedSeasons[0];
        if (firstSeason) {
            const yearNum = parseInt(firstSeason.year.split('-')[0]);
            results.push({
                year: yearNum,
                icon: BookOpen,
                color: 'text-blue-500',
                text: firstSeason.champion_name 
                    ? `Inaugural edition won by ${firstSeason.champion_name}${firstSeason.final_score ? `, defeating ${firstSeason.runner_up} ${firstSeason.final_score}` : ''}.`
                    : `First edition of the competition.`
            });
        }

        // Track winners and dynasties
        const winnerCounts = {};
        let currentDynasty = { club: null, count: 0 };
        
        sortedSeasons.forEach((s, idx) => {
            if (s.champion_name) {
                winnerCounts[s.champion_name] = (winnerCounts[s.champion_name] || 0) + 1;
                
                if (s.champion_name === currentDynasty.club) {
                    currentDynasty.count++;
                    if (currentDynasty.count === 2) {
                        results.push({
                            year: parseInt(s.year.split('-')[0]),
                            icon: Flame,
                            color: 'text-orange-500',
                            text: `${s.champion_name} retained the cup.`
                        });
                    } else if (currentDynasty.count === 3) {
                        results.push({
                            year: parseInt(s.year.split('-')[0]),
                            icon: Star,
                            color: 'text-amber-500',
                            text: `${s.champion_name} made it three in a row.`
                        });
                    }
                } else {
                    currentDynasty = { club: s.champion_name, count: 1 };
                }
            }
        });

        // First-time winners
        const seenWinners = new Set();
        sortedSeasons.forEach(s => {
            if (s.champion_name && !seenWinners.has(s.champion_name)) {
                seenWinners.add(s.champion_name);
                if (seenWinners.size > 1) {
                    const club = clubs.find(c => c.name === s.champion_name || c.id === s.champion_id);
                    const tier = club?.league_id ? clubs.find(c => c.id === club.id) : null;
                    
                    results.push({
                        year: parseInt(s.year.split('-')[0]),
                        icon: Trophy,
                        color: 'text-amber-500',
                        text: `${s.champion_name} lifted the trophy for the first time.`
                    });
                }
            }
        });

        // Notable finals
        sortedSeasons.forEach(s => {
            if (s.final_score && s.champion_name && s.runner_up) {
                // Check for high-scoring finals
                const scores = s.final_score.match(/(\d+)/g);
                if (scores && scores.length >= 2) {
                    const totalGoals = parseInt(scores[0]) + parseInt(scores[1]);
                    if (totalGoals >= 6) {
                        results.push({
                            year: parseInt(s.year.split('-')[0]),
                            icon: Zap,
                            color: 'text-red-500',
                            text: `A ${s.final_score} thriller saw ${s.champion_name} triumph over ${s.runner_up}.`
                        });
                    }
                }
            }
        });

        // Milestone editions
        const milestones = [10, 25, 50, 100];
        milestones.forEach(milestone => {
            if (sortedSeasons.length >= milestone) {
                const milestoneSeason = sortedSeasons[milestone - 1];
                results.push({
                    year: parseInt(milestoneSeason.year.split('-')[0]),
                    icon: Award,
                    color: 'text-purple-500',
                    text: `The ${milestone}${milestone === 1 ? 'st' : milestone === 2 ? 'nd' : milestone === 3 ? 'rd' : 'th'} edition of the cup${milestoneSeason.champion_name ? `, won by ${milestoneSeason.champion_name}` : ''}.`
                });
            }
        });

        // Most successful club milestone
        const topWinner = Object.entries(winnerCounts).sort((a, b) => b[1] - a[1])[0];
        if (topWinner && topWinner[1] >= 3) {
            const thirdWin = sortedSeasons.filter(s => s.champion_name === topWinner[0])[2];
            if (thirdWin) {
                results.push({
                    year: parseInt(thirdWin.year.split('-')[0]),
                    icon: Star,
                    color: 'text-amber-600',
                    text: `${topWinner[0]} became the cup's most successful club.`
                });
            }
        }

        return results
            .sort((a, b) => a.year - b.year)
            .filter((event, idx, arr) => {
                return idx === arr.findIndex(e => e.year === event.year && e.text === event.text);
            })
            .slice(0, 8);
    }, [cup, seasons, clubs]);

    if (events.length === 0) return null;

    return (
        <Card className="border-0 shadow-sm mb-6">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <BookOpen className="w-5 h-5 text-emerald-600" />
                    Cup History
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="relative">
                    <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-200" />
                    <div className="space-y-4">
                        {events.map((event, idx) => (
                            <div key={idx} className="flex items-start gap-4 relative">
                                <div className={`w-8 h-8 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center z-10 ${event.color}`}>
                                    <event.icon className="w-4 h-4" />
                                </div>
                                <div className="flex-1 pb-2">
                                    <div className="text-xs font-bold text-slate-400 mb-1">{event.year}</div>
                                    <p className="text-slate-700 text-sm">{event.text}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}