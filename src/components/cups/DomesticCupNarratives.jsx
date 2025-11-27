import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Calendar, Star, TrendingUp, Award, Users, Zap } from 'lucide-react';

export default function DomesticCupNarratives({ cup, seasons, clubs = [] }) {
    if (!cup) return null;

    const narratives = [];

    // 1. Competition Age / Heritage
    if (cup.founded_year) {
        const age = new Date().getFullYear() - cup.founded_year;
        if (age >= 30) {
            narratives.push({
                icon: Calendar,
                title: age >= 100 ? 'Century of Tradition' : age >= 50 ? 'Historic Cup' : 'Established Competition',
                text: `Founded in ${cup.founded_year}, the ${cup.short_name || cup.name} has ${age} years of knockout drama.`,
                color: 'text-amber-600',
                bg: 'bg-amber-50'
            });
        } else if (age >= 1) {
            narratives.push({
                icon: Calendar,
                title: age <= 5 ? 'New Competition' : 'Growing Cup',
                text: `Founded in ${cup.founded_year}, this cup is building its legacy with ${age} year${age > 1 ? 's' : ''} of history.`,
                color: 'text-emerald-600',
                bg: 'bg-emerald-50'
            });
        }
    }

    // Show editions count even with few seasons
    if (seasons.length >= 1 && seasons.length < 20) {
        narratives.push({
            icon: Trophy,
            title: seasons.length === 1 ? 'Inaugural Edition' : 'Building Tradition',
            text: seasons.length === 1 
                ? `The first edition of the ${cup.short_name || cup.name} has been contested.`
                : `${seasons.length} editions have been played, with more history yet to be written.`,
            color: 'text-blue-600',
            bg: 'bg-blue-50'
        });
    }

    // 2. Most Successful Club
    const titleCounts = {};
    seasons.forEach(s => {
        if (s.champion_name) {
            const name = s.champion_name.trim();
            if (!titleCounts[name]) titleCounts[name] = { count: 0, years: [] };
            titleCounts[name].count++;
            titleCounts[name].years.push(s.year);
        }
    });

    const sortedClubs = Object.entries(titleCounts).sort((a, b) => b[1].count - a[1].count);
    if (sortedClubs.length > 0 && sortedClubs[0][1].count >= 2) {
        const [clubName, data] = sortedClubs[0];
        narratives.push({
            icon: Star,
            title: 'Cup Specialists',
            text: `${clubName} dominates with ${data.count} title${data.count > 1 ? 's' : ''}, the most in the competition's history.`,
            color: 'text-amber-600',
            bg: 'bg-amber-50'
        });
    }

    // 3. Multiple Title Holders
    const multipleWinners = sortedClubs.filter(([_, d]) => d.count >= 2).length;
    if (multipleWinners >= 3) {
        narratives.push({
            icon: Users,
            title: 'Elite Cup Winners',
            text: `${multipleWinners} clubs have won multiple titles, showing a tradition of cup pedigree among the nation's top clubs.`,
            color: 'text-blue-600',
            bg: 'bg-blue-50'
        });
    }

    // 4. Competitive Balance
    const uniqueWinners = Object.keys(titleCounts).length;
    if (uniqueWinners >= 5 && seasons.length >= 10) {
        const ratio = (uniqueWinners / seasons.length * 100).toFixed(0);
        narratives.push({
            icon: TrendingUp,
            title: 'Unpredictable Cup',
            text: `${uniqueWinners} different clubs have lifted the trophy. The cup format breeds upsets with ${ratio}% unique champions.`,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50'
        });
    }

    // 5. Recent Dynasty
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
            title: 'Current Cup Kings',
            text: `${recentDominant[0]} has won ${recentDominant[1]} of the last ${recentSeasons.length} editions, establishing cup dominance.`,
            color: 'text-red-600',
            bg: 'bg-red-50'
        });
    }

    // 6. Giant Killings / Lower Tier Winners
    // Check if any champions came from lower tiers
    const lowerTierWinners = [];
    seasons.forEach(s => {
        if (s.champion_name) {
            const club = clubs.find(c => c.name === s.champion_name);
            if (club) {
                // If club has no top tier titles but won cups, they might be a lower tier team
                if (!club.league_titles && club.lower_tier_titles > 0) {
                    lowerTierWinners.push(s.champion_name);
                }
            }
        }
    });

    if (lowerTierWinners.length >= 1) {
        narratives.push({
            icon: Zap,
            title: 'Cup Magic',
            text: `The cup has seen giant-killing stories, with clubs like ${lowerTierWinners[0]} proving the knockout format rewards brave underdogs.`,
            color: 'text-purple-600',
            bg: 'bg-purple-50'
        });
    }

    // 7. Back-to-back winners
    let maxConsecutive = 0;
    let maxConsecutiveClub = '';
    let consecutive = 1;
    
    const sortedSeasons = [...seasons].sort((a, b) => a.year.localeCompare(b.year));
    for (let i = 1; i < sortedSeasons.length; i++) {
        if (sortedSeasons[i].champion_name === sortedSeasons[i - 1].champion_name) {
            consecutive++;
            if (consecutive > maxConsecutive) {
                maxConsecutive = consecutive;
                maxConsecutiveClub = sortedSeasons[i].champion_name;
            }
        } else {
            consecutive = 1;
        }
    }

    if (maxConsecutive >= 2) {
        narratives.push({
            icon: Trophy,
            title: 'Retained Glory',
            text: `${maxConsecutiveClub} achieved ${maxConsecutive} consecutive cup triumphs, a rare feat in knockout football.`,
            color: 'text-amber-600',
            bg: 'bg-amber-50'
        });
    }

    // 8. Total editions
    if (seasons.length >= 20) {
        narratives.push({
            icon: Trophy,
            title: 'Rich History',
            text: `With ${seasons.length} editions completed, this is the nation's premier knockout competition.`,
            color: 'text-slate-600',
            bg: 'bg-slate-50'
        });
    }

    if (narratives.length === 0) return null;

    return (
        <Card className="border-0 shadow-sm mb-8">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-500" />
                    Cup Story
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