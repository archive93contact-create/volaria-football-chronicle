import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Trophy, TrendingUp, TrendingDown, Star, Calendar, Award, Shield, Users, Flame, Clock } from 'lucide-react';

export default function LeagueNarratives({ league, seasons, clubs, leagueTables = [] }) {
    const narratives = [];
    
    if (!league || seasons.length === 0) return null;

    // Sort seasons chronologically
    const sortedSeasons = [...seasons].sort((a, b) => a.year.localeCompare(b.year));
    const latestSeason = sortedSeasons[sortedSeasons.length - 1];
    const firstSeason = sortedSeasons[0];

    // Get unique years from league tables
    const tablesByYear = {};
    leagueTables.forEach(t => {
        if (!tablesByYear[t.year]) tablesByYear[t.year] = [];
        tablesByYear[t.year].push(t);
    });
    const sortedYears = Object.keys(tablesByYear).sort();

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

    // League size changes over time
    if (sortedYears.length >= 2) {
        const firstYearCount = tablesByYear[sortedYears[0]]?.length || 0;
        const lastYearCount = tablesByYear[sortedYears[sortedYears.length - 1]]?.length || 0;
        
        if (lastYearCount > firstYearCount && firstYearCount > 0) {
            const increase = lastYearCount - firstYearCount;
            narratives.push({
                icon: TrendingUp,
                color: 'text-green-500',
                bg: 'bg-green-50',
                title: 'Growing Competition',
                text: `The league has grown from ${firstYearCount} to ${lastYearCount} clubs (+${increase}) since ${sortedYears[0]}.`
            });
        } else if (lastYearCount < firstYearCount && lastYearCount > 0) {
            const decrease = firstYearCount - lastYearCount;
            narratives.push({
                icon: TrendingDown,
                color: 'text-red-500',
                bg: 'bg-red-50',
                title: 'Condensed Competition',
                text: `The league has shrunk from ${firstYearCount} to ${lastYearCount} clubs (-${decrease}) since ${sortedYears[0]}.`
            });
        }

        // Find biggest single-season change
        let biggestChange = { year: '', change: 0, from: 0, to: 0 };
        for (let i = 1; i < sortedYears.length; i++) {
            const prevCount = tablesByYear[sortedYears[i - 1]]?.length || 0;
            const currCount = tablesByYear[sortedYears[i]]?.length || 0;
            const change = currCount - prevCount;
            if (Math.abs(change) > Math.abs(biggestChange.change) && Math.abs(change) >= 4) {
                biggestChange = { year: sortedYears[i], change, from: prevCount, to: currCount };
            }
        }
        if (biggestChange.change !== 0) {
            narratives.push({
                icon: biggestChange.change > 0 ? TrendingUp : TrendingDown,
                color: biggestChange.change > 0 ? 'text-green-600' : 'text-red-600',
                bg: biggestChange.change > 0 ? 'bg-green-50' : 'bg-red-50',
                title: biggestChange.change > 0 ? 'Major Expansion' : 'Major Reduction',
                text: `${biggestChange.change > 0 ? 'Expanded' : 'Reduced'} from ${biggestChange.from} to ${biggestChange.to} clubs in ${biggestChange.year}.`
            });
        }
    }

    // Long-term clubs (clubs that have been in the league a long time)
    if (sortedYears.length >= 5) {
        const clubAppearances = {};
        const mostRecentYear = sortedYears[sortedYears.length - 1];
        const mostRecentClubs = new Set((tablesByYear[mostRecentYear] || []).map(t => t.club_name));

        leagueTables.forEach(t => {
            if (t.club_name) {
                clubAppearances[t.club_name] = (clubAppearances[t.club_name] || 0) + 1;
            }
        });

        // Find ever-present clubs (in every season)
        const everPresentClubs = Object.entries(clubAppearances)
            .filter(([club, count]) => count === sortedYears.length && mostRecentClubs.has(club))
            .map(([club]) => club);

        if (everPresentClubs.length > 0 && everPresentClubs.length <= 3) {
            narratives.push({
                icon: Shield,
                color: 'text-amber-600',
                bg: 'bg-amber-50',
                title: 'Ever-Present',
                text: `${everPresentClubs.join(', ')} ${everPresentClubs.length === 1 ? 'has' : 'have'} been in every recorded season (${sortedYears.length}).`
            });
        } else if (everPresentClubs.length > 3) {
            narratives.push({
                icon: Shield,
                color: 'text-amber-600',
                bg: 'bg-amber-50',
                title: 'Ever-Present Clubs',
                text: `${everPresentClubs.length} clubs have been present in all ${sortedYears.length} recorded seasons.`
            });
        }

        // Long-serving active clubs (80%+ of seasons, still active)
        const longServingClubs = Object.entries(clubAppearances)
            .filter(([club, count]) => {
                const percentage = count / sortedYears.length;
                return percentage >= 0.8 && percentage < 1 && mostRecentClubs.has(club);
            })
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);

        if (longServingClubs.length > 0 && everPresentClubs.length === 0) {
            const names = longServingClubs.map(([club, count]) => `${club} (${count})`).join(', ');
            narratives.push({
                icon: Clock,
                color: 'text-blue-600',
                bg: 'bg-blue-50',
                title: 'Long-Term Members',
                text: `Most experienced active clubs: ${names} seasons.`
            });
        }

        // First-time entrants in most recent season
        const previousClubs = new Set();
        sortedYears.slice(0, -1).forEach(year => {
            (tablesByYear[year] || []).forEach(t => previousClubs.add(t.club_name));
        });
        const newEntrants = [...mostRecentClubs].filter(club => !previousClubs.has(club));
        if (newEntrants.length > 0 && newEntrants.length <= 4) {
            narratives.push({
                icon: Star,
                color: 'text-emerald-500',
                bg: 'bg-emerald-50',
                title: 'New Arrivals',
                text: `${newEntrants.join(', ')} ${newEntrants.length === 1 ? 'made their' : 'made their'} league debut in ${mostRecentYear}.`
            });
        } else if (newEntrants.length > 4) {
            narratives.push({
                icon: Star,
                color: 'text-emerald-500',
                bg: 'bg-emerald-50',
                title: 'Fresh Faces',
                text: `${newEntrants.length} clubs made their league debut in ${mostRecentYear}.`
            });
        }
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