import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Trophy, TrendingUp, TrendingDown, Star, Calendar, Award, Shield, Users, Flame } from 'lucide-react';

export default function LeagueNarratives({ league, seasons, clubs }) {
    const narratives = [];
    
    if (!league || seasons.length === 0) return null;

    // Sort seasons chronologically
    const sortedSeasons = [...seasons].sort((a, b) => a.year.localeCompare(b.year));
    const latestSeason = sortedSeasons[sortedSeasons.length - 1];
    const firstSeason = sortedSeasons[0];

    // Founding narrative
    if (league.founded_year) {
        const age = new Date().getFullYear() - league.founded_year;
        if (age >= 100) {
            narratives.push({
                icon: BookOpen,
                color: 'text-amber-700',
                bg: 'bg-amber-50',
                title: 'Century of Competition',
                text: `Founded in ${league.founded_year}, this league has over a century of footballing tradition.`
            });
        } else if (age >= 50) {
            narratives.push({
                icon: BookOpen,
                color: 'text-slate-600',
                bg: 'bg-slate-50',
                title: 'Established Competition',
                text: `Established in ${league.founded_year}, with ${age} years of competitive football.`
            });
        }
    }

    // Most titles - dominant club
    const titleCounts = {};
    sortedSeasons.forEach(season => {
        if (season.champion_name) {
            const name = season.champion_name.trim();
            titleCounts[name] = (titleCounts[name] || 0) + 1;
        }
    });

    const sortedByTitles = Object.entries(titleCounts).sort((a, b) => b[1] - a[1]);
    if (sortedByTitles.length > 0) {
        const [topClub, topCount] = sortedByTitles[0];
        const percentage = Math.round((topCount / sortedSeasons.length) * 100);
        
        if (percentage >= 50) {
            narratives.push({
                icon: Trophy,
                color: 'text-amber-600',
                bg: 'bg-amber-50',
                title: 'One-Club Dominance',
                text: `${topClub} has won ${topCount} of ${sortedSeasons.length} titles (${percentage}%), dominating this league.`
            });
        } else if (topCount >= 5) {
            narratives.push({
                icon: Trophy,
                color: 'text-amber-500',
                bg: 'bg-amber-50',
                title: 'Most Successful Club',
                text: `${topClub} leads the all-time standings with ${topCount} championship titles.`
            });
        }
    }

    // Competitive league - many different winners
    const uniqueWinners = Object.keys(titleCounts).length;
    if (uniqueWinners >= 5 && sortedSeasons.length >= 10) {
        narratives.push({
            icon: Users,
            color: 'text-blue-500',
            bg: 'bg-blue-50',
            title: 'Competitive Balance',
            text: `${uniqueWinners} different clubs have won the title, showing the competitive nature of this league.`
        });
    }

    // Back-to-back champions
    for (let i = 1; i < sortedSeasons.length; i++) {
        if (sortedSeasons[i].champion_name === sortedSeasons[i - 1].champion_name && sortedSeasons[i].champion_name) {
            // Check for dynasty (3+)
            let dynastyCount = 2;
            let j = i + 1;
            while (j < sortedSeasons.length && sortedSeasons[j].champion_name === sortedSeasons[i].champion_name) {
                dynastyCount++;
                j++;
            }
            
            if (dynastyCount >= 3) {
                narratives.push({
                    icon: Flame,
                    color: 'text-orange-500',
                    bg: 'bg-orange-50',
                    title: 'Dynasty Era',
                    text: `${sortedSeasons[i].champion_name} won ${dynastyCount} consecutive titles from ${sortedSeasons[i - 1].year} to ${sortedSeasons[j - 1].year}.`
                });
                break;
            }
        }
    }

    // First ever champion
    if (firstSeason.champion_name) {
        narratives.push({
            icon: Star,
            color: 'text-yellow-500',
            bg: 'bg-yellow-50',
            title: 'Inaugural Champions',
            text: `${firstSeason.champion_name} won the first ever title in ${firstSeason.year}.`
        });
    }

    // Longevity
    if (sortedSeasons.length >= 50) {
        narratives.push({
            icon: Calendar,
            color: 'text-slate-500',
            bg: 'bg-slate-50',
            title: 'Golden Jubilee',
            text: `${sortedSeasons.length} seasons of history make this one of the most storied leagues.`
        });
    } else if (sortedSeasons.length >= 25) {
        narratives.push({
            icon: Calendar,
            color: 'text-slate-500',
            bg: 'bg-slate-50',
            title: 'Quarter Century',
            text: `${sortedSeasons.length} seasons of recorded history in this competition.`
        });
    }

    // Top tier narrative
    if (league.tier === 1) {
        narratives.push({
            icon: Award,
            color: 'text-emerald-500',
            bg: 'bg-emerald-50',
            title: 'Premier Competition',
            text: `The top-flight division and pinnacle of domestic football in this nation.`
        });
    }

    // Current champion defending
    if (latestSeason.champion_name && sortedSeasons.length >= 2) {
        const prevSeason = sortedSeasons[sortedSeasons.length - 2];
        if (latestSeason.champion_name === prevSeason.champion_name) {
            narratives.push({
                icon: Shield,
                color: 'text-purple-500',
                bg: 'bg-purple-50',
                title: 'Reigning Supremacy',
                text: `${latestSeason.champion_name} are the current back-to-back champions.`
            });
        }
    }

    // Clubs in league
    if (clubs && clubs.length >= 20) {
        narratives.push({
            icon: Users,
            color: 'text-blue-500',
            bg: 'bg-blue-50',
            title: 'Large Division',
            text: `${clubs.length} clubs currently compete in this division.`
        });
    }

    if (narratives.length === 0) return null;

    return (
        <Card className="border-0 shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-emerald-600" />
                    League Story
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid gap-3 md:grid-cols-2">
                    {narratives.slice(0, 6).map((narrative, idx) => (
                        <div key={idx} className={`flex gap-3 p-3 rounded-lg ${narrative.bg}`}>
                            <narrative.icon className={`w-5 h-5 ${narrative.color} flex-shrink-0 mt-0.5`} />
                            <div>
                                <h4 className="font-semibold text-slate-800 text-sm">{narrative.title}</h4>
                                <p className="text-slate-600 text-sm">{narrative.text}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}