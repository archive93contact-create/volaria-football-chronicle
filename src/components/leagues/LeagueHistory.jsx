import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Trophy, Star, Calendar, Users, Flame, TrendingUp } from 'lucide-react';

export default function LeagueHistory({ league, seasons = [], nation }) {
    const events = useMemo(() => {
        if (!league || seasons.length === 0) return [];

        const sortedSeasons = [...seasons].sort((a, b) => a.year.localeCompare(b.year));
        const results = [];

        // Founding
        if (league.founded_year) {
            results.push({
                year: league.founded_year,
                icon: Calendar,
                color: 'text-slate-600',
                text: `The ${league.name} was established${nation ? ` in ${nation.name}` : ''}.`
            });
        }

        // First season - handle multiple divisions
        const firstYear = sortedSeasons[0]?.year;
        const firstYearSeasons = sortedSeasons.filter(s => s.year === firstYear);
        if (firstYearSeasons.length > 0) {
            const yearNum = parseInt(firstYear.split('-')[0]);
            const champions = firstYearSeasons.map(s => s.champion_name).filter(Boolean);
            
            let championText = '';
            if (champions.length === 1) {
                championText = `, with ${champions[0]} crowned first champions`;
            } else if (champions.length > 1) {
                championText = `, with champions crowned across ${champions.length} divisions: ${champions.join(', ')}`;
            }
            
            results.push({
                year: yearNum,
                icon: BookOpen,
                color: 'text-blue-500',
                text: `Inaugural season${championText}.`
            });
        }

        // Track champions and dynasties - group by year first to handle divisions
        const championCounts = {};
        const yearlyChampions = {};
        
        sortedSeasons.forEach(s => {
            if (s.champion_name) {
                championCounts[s.champion_name] = (championCounts[s.champion_name] || 0) + 1;
                if (!yearlyChampions[s.year]) yearlyChampions[s.year] = [];
                yearlyChampions[s.year].push(s.champion_name);
            }
        });
        
        // Dynasty tracking using unique years (not division count)
        const uniqueYears = Object.keys(yearlyChampions).sort();
        let currentDynasty = { club: null, count: 0, startYear: null };
        
        uniqueYears.forEach((year, idx) => {
            const champions = yearlyChampions[year];
            // For multi-division, check if one club won multiple divisions
            const uniqueChamps = [...new Set(champions)];
            
            if (uniqueChamps.length === 1) {
                const champ = uniqueChamps[0];
                if (champ === currentDynasty.club) {
                    currentDynasty.count++;
                } else {
                    // Check if previous dynasty was notable
                    if (currentDynasty.count >= 3) {
                        results.push({
                            year: parseInt(uniqueYears[idx - 1]?.split('-')[0] || year.split('-')[0]),
                            icon: Flame,
                            color: 'text-orange-500',
                            text: `${currentDynasty.club} completed ${currentDynasty.count} consecutive titles.`
                        });
                    }
                    currentDynasty = { club: champ, count: 1, startYear: year };
                }
            }
        });

        // Check final dynasty
        if (currentDynasty.count >= 3) {
            const lastYear = uniqueYears[uniqueYears.length - 1];
            results.push({
                year: parseInt(lastYear.split('-')[0]),
                icon: Flame,
                color: 'text-orange-500',
                text: `${currentDynasty.club} ${currentDynasty.count >= 4 ? 'dominating with' : 'secured'} ${currentDynasty.count} titles in a row.`
            });
        }

        // First-time champions - track unique champions by year (not by division)
        const seenChampions = new Set();
        uniqueYears.forEach(year => {
            const champions = [...new Set(yearlyChampions[year])];
            champions.forEach(champ => {
                if (!seenChampions.has(champ)) {
                    seenChampions.add(champ);
                    if (seenChampions.size > 1 && seenChampions.size <= 5) {
                        const divisionSuffix = yearlyChampions[year].length > 1 
                            ? ` (${sortedSeasons.find(s => s.year === year && s.champion_name === champ)?.division_name || 'division'})` 
                            : '';
                        results.push({
                            year: parseInt(year.split('-')[0]),
                            icon: Star,
                            color: 'text-amber-500',
                            text: `${champ} won their first ${league.name} title${divisionSuffix}.`
                        });
                    }
                }
            });
        });

        // Milestone seasons
        const milestones = [10, 25, 50, 100];
        milestones.forEach(milestone => {
            if (sortedSeasons.length >= milestone) {
                const milestoneSeason = sortedSeasons[milestone - 1];
                results.push({
                    year: parseInt(milestoneSeason.year.split('-')[0]),
                    icon: Trophy,
                    color: 'text-purple-500',
                    text: `The league celebrated its ${milestone}${milestone === 1 ? 'st' : milestone === 2 ? 'nd' : milestone === 3 ? 'rd' : 'th'} season.`
                });
            }
        });

        // Most successful club reaching milestone
        const topClub = Object.entries(championCounts).sort((a, b) => b[1] - a[1])[0];
        if (topClub && topClub[1] >= 5) {
            const fifthTitle = sortedSeasons.filter(s => s.champion_name === topClub[0])[4];
            if (fifthTitle) {
                results.push({
                    year: parseInt(fifthTitle.year.split('-')[0]),
                    icon: Trophy,
                    color: 'text-amber-600',
                    text: `${topClub[0]} became the league's most decorated club.`
                });
            }
        }

        // Format expansion
        const teamCounts = sortedSeasons.map(s => s.number_of_teams).filter(Boolean);
        if (teamCounts.length > 1) {
            const maxTeams = Math.max(...teamCounts);
            const expansionSeason = sortedSeasons.find(s => s.number_of_teams === maxTeams);
            if (expansionSeason && maxTeams > teamCounts[0]) {
                results.push({
                    year: parseInt(expansionSeason.year.split('-')[0]),
                    icon: Users,
                    color: 'text-blue-500',
                    text: `The league expanded to ${maxTeams} teams.`
                });
            }
        }

        return results
            .sort((a, b) => a.year - b.year)
            .filter((event, idx, arr) => {
                // Remove duplicates by year
                return idx === arr.findIndex(e => e.year === event.year && e.text === event.text);
            })
            .slice(0, 8);
    }, [league, seasons, nation]);

    if (events.length === 0) return null;

    return (
        <Card className="border-0 shadow-sm mb-6">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <BookOpen className="w-5 h-5 text-emerald-600" />
                    League History
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