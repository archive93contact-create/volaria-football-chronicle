import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Calendar, Globe, Star, TrendingUp, Award, Users, MapPin } from 'lucide-react';

export default function ContinentalNarratives({ competition, seasons, nations = [] }) {
    if (!competition) return null;

    const narratives = [];

    // 1. Competition Age / Heritage - show for any competition with a founded year
    if (competition.founded_year) {
        const age = new Date().getFullYear() - competition.founded_year;
        if (age >= 50) {
            narratives.push({
                icon: Calendar,
                title: age >= 100 ? 'Century of Competition' : 'Historic Tournament',
                text: `Established in ${competition.founded_year}, this competition has ${age} years of continental history.`,
                color: 'text-amber-600',
                bg: 'bg-amber-50'
            });
        } else if (age >= 1) {
            narratives.push({
                icon: Calendar,
                title: age <= 5 ? 'New Era' : 'Growing Legacy',
                text: `Founded in ${competition.founded_year}, this competition is ${age} year${age > 1 ? 's' : ''} into its journey.`,
                color: 'text-emerald-600',
                bg: 'bg-emerald-50'
            });
        }
    }

    // 2. Total Editions - show even with few seasons
    if (seasons.length >= 10) {
        narratives.push({
            icon: Trophy,
            title: 'Prestigious Tournament',
            text: `With ${seasons.length} editions completed, this is one of Volaria's most established continental competitions.`,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50'
        });
    } else if (seasons.length >= 1) {
        narratives.push({
            icon: Trophy,
            title: seasons.length === 1 ? 'Inaugural Chapter' : 'Building History',
            text: seasons.length === 1 
                ? `The first edition has been completed, marking the beginning of continental glory.`
                : `${seasons.length} editions have been contested so far, with more history yet to be written.`,
            color: 'text-blue-600',
            bg: 'bg-blue-50'
        });
    }

    // 3. Most Successful Club
    const titleCounts = {};
    seasons.forEach(s => {
        if (s.champion_name) {
            const name = s.champion_name.trim();
            if (!titleCounts[name]) titleCounts[name] = { count: 0, years: [], nation: s.champion_nation };
            titleCounts[name].count++;
            titleCounts[name].years.push(s.year);
        }
    });

    const sortedClubs = Object.entries(titleCounts).sort((a, b) => b[1].count - a[1].count);
    if (sortedClubs.length > 0 && sortedClubs[0][1].count >= 2) {
        const [clubName, data] = sortedClubs[0];
        narratives.push({
            icon: Star,
            title: 'Dominant Force',
            text: `${clubName} leads with ${data.count} title${data.count > 1 ? 's' : ''}, establishing themselves as the competition's most successful club.`,
            color: 'text-amber-600',
            bg: 'bg-amber-50'
        });
    } else if (sortedClubs.length === 1) {
        // Only one edition - show the inaugural champion
        const [clubName, data] = sortedClubs[0];
        narratives.push({
            icon: Star,
            title: 'Inaugural Champion',
            text: `${clubName} etched their name in history as the first ever winners of this continental competition.`,
            color: 'text-amber-600',
            bg: 'bg-amber-50'
        });
    }

    // 4. Competitive Balance - Different Winners
    const uniqueWinners = Object.keys(titleCounts).length;
    if (uniqueWinners >= 5 && seasons.length >= 10) {
        const ratio = (uniqueWinners / seasons.length * 100).toFixed(0);
        narratives.push({
            icon: TrendingUp,
            title: 'Competitive Balance',
            text: `${uniqueWinners} different clubs have won the trophy, with ${ratio}% of editions producing unique champions.`,
            color: 'text-blue-600',
            bg: 'bg-blue-50'
        });
    }

    // 5. Most Represented Nation
    const nationCounts = {};
    seasons.forEach(s => {
        if (s.champion_nation) {
            const nation = s.champion_nation.trim();
            if (!nationCounts[nation]) nationCounts[nation] = 0;
            nationCounts[nation]++;
        }
    });

    const sortedNations = Object.entries(nationCounts).sort((a, b) => b[1] - a[1]);
    if (sortedNations.length > 0 && sortedNations[0][1] >= 3) {
        const [nationName, count] = sortedNations[0];
        const percentage = ((count / seasons.length) * 100).toFixed(0);
        narratives.push({
            icon: Globe,
            title: 'National Powerhouse',
            text: `Clubs from ${nationName} have won ${count} titles (${percentage}% of all editions), making them the dominant nation.`,
            color: 'text-indigo-600',
            bg: 'bg-indigo-50'
        });
    } else if (sortedNations.length === 1 && seasons.length >= 1) {
        const [nationName] = sortedNations[0];
        narratives.push({
            icon: Globe,
            title: 'First Nation',
            text: `${nationName} is the first nation to produce continental champions in this competition.`,
            color: 'text-indigo-600',
            bg: 'bg-indigo-50'
        });
    }

    // 6. Nations Represented
    const uniqueNations = Object.keys(nationCounts).length;
    if (uniqueNations >= 5) {
        narratives.push({
            icon: MapPin,
            title: 'Continental Reach',
            text: `Clubs from ${uniqueNations} different nations have lifted the trophy, showcasing the competition's continental appeal.`,
            color: 'text-purple-600',
            bg: 'bg-purple-50'
        });
    } else if (uniqueNations >= 2) {
        narratives.push({
            icon: MapPin,
            title: 'Growing Footprint',
            text: `Clubs from ${uniqueNations} nations have won the trophy so far.`,
            color: 'text-purple-600',
            bg: 'bg-purple-50'
        });
    }

    // 7. Recent Dominance
    const recentSeasons = seasons.slice(0, 5);
    const recentWinners = {};
    recentSeasons.forEach(s => {
        if (s.champion_name) {
            const name = s.champion_name.trim();
            if (!recentWinners[name]) recentWinners[name] = 0;
            recentWinners[name]++;
        }
    });
    
    const recentDominant = Object.entries(recentWinners).find(([_, count]) => count >= 3);
    if (recentDominant) {
        narratives.push({
            icon: Award,
            title: 'Current Dynasty',
            text: `${recentDominant[0]} has won ${recentDominant[1]} of the last ${recentSeasons.length} editions, establishing recent dominance.`,
            color: 'text-red-600',
            bg: 'bg-red-50'
        });
    }

    // 8. Back-to-back winners
    let consecutiveWins = 0;
    let consecutiveClub = '';
    let maxConsecutive = 0;
    let maxConsecutiveClub = '';
    
    const sortedSeasons = [...seasons].sort((a, b) => a.year.localeCompare(b.year));
    sortedSeasons.forEach((s, idx) => {
        if (idx > 0 && s.champion_name === sortedSeasons[idx - 1].champion_name) {
            consecutiveWins++;
            if (consecutiveWins > maxConsecutive) {
                maxConsecutive = consecutiveWins;
                maxConsecutiveClub = s.champion_name;
            }
        } else {
            consecutiveWins = 1;
            consecutiveClub = s.champion_name;
        }
    });

    if (maxConsecutive >= 3) {
        narratives.push({
            icon: Trophy,
            title: 'Historic Streak',
            text: `${maxConsecutiveClub} achieved a remarkable ${maxConsecutive} consecutive titles at one point in the competition's history.`,
            color: 'text-amber-600',
            bg: 'bg-amber-50'
        });
    }

    // 9. Number of Participating Teams
    if (competition.number_of_teams) {
        narratives.push({
            icon: Users,
            title: 'Elite Tournament',
            text: `Only ${competition.number_of_teams} clubs qualify for this prestigious tournament each season.`,
            color: 'text-slate-600',
            bg: 'bg-slate-50'
        });
    }

    // 10. Show finalist info for single/few seasons
    if (seasons.length >= 1 && seasons.length <= 3) {
        const latestSeason = seasons[0];
        if (latestSeason.runner_up) {
            narratives.push({
                icon: Award,
                title: 'Final Showdown',
                text: `The ${latestSeason.year} final saw ${latestSeason.champion_name} triumph over ${latestSeason.runner_up}${latestSeason.final_score ? ` (${latestSeason.final_score})` : ''}.`,
                color: 'text-slate-600',
                bg: 'bg-slate-100'
            });
        }
    }

    if (narratives.length === 0) return null;

    return (
        <Card className="border-0 shadow-sm mb-8">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-500" />
                    Competition Story
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {narratives.slice(0, 6).map((narrative, idx) => (
                        <div key={idx} className={`p-4 rounded-lg ${narrative.bg}`}>
                            <div className="flex items-start gap-3">
                                <narrative.icon className={`w-5 h-5 ${narrative.color} mt-0.5 flex-shrink-0`} />
                                <div>
                                    <h4 className={`font-semibold ${narrative.color}`}>{narrative.title}</h4>
                                    <p className="text-sm text-slate-600 mt-1">{narrative.text}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}