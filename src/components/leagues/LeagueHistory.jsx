import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Trophy, Star, Calendar, Users, Flame, TrendingUp, AlertCircle, Edit, Zap, Shield, TrendingDown } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

export default function LeagueHistory({ league, seasons = [], nation }) {
    const [expandedDecades, setExpandedDecades] = useState(new Set());

    const toggleDecade = (decade) => {
        const newExpanded = new Set(expandedDecades);
        if (newExpanded.has(decade)) {
            newExpanded.delete(decade);
        } else {
            newExpanded.add(decade);
        }
        setExpandedDecades(newExpanded);
    };

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
                    text: `The league expanded to ${maxTeams} teams.`,
                    type: 'structural'
                });
            }
        }

        // League name change
        if (league.former_name && league.renamed_year) {
            results.push({
                year: league.renamed_year,
                icon: Edit,
                color: 'text-blue-600',
                text: `Renamed from "${league.former_name}" to "${league.name}".${league.rename_reason ? ` Reason: ${league.rename_reason}` : ''}`,
                type: 'structural'
            });
        }

        // Tier changes - detect from season data
        const tierChanges = [];
        sortedSeasons.forEach((season, idx) => {
            if (idx > 0) {
                const prevTier = sortedSeasons[idx - 1].tier;
                const currTier = season.tier;
                if (prevTier && currTier && prevTier !== currTier) {
                    tierChanges.push({
                        year: parseInt(season.year.split('-')[0]),
                        from: prevTier,
                        to: currTier
                    });
                }
            }
        });
        tierChanges.forEach(change => {
            results.push({
                year: change.year,
                icon: change.to < change.from ? TrendingUp : TrendingDown,
                color: change.to < change.from ? 'text-green-600' : 'text-orange-600',
                text: `${change.to < change.from ? 'Promoted' : 'Moved'} to Tier ${change.to}${change.to < change.from ? ` (previously Tier ${change.from})` : ''}.`,
                type: 'structural'
            });
        });

        // Competitive eras - detect periods with different champions
        const decades = {};
        uniqueYears.forEach(year => {
            const decade = Math.floor(parseInt(year.split('-')[0]) / 10) * 10;
            if (!decades[decade]) decades[decade] = new Set();
            const champions = [...new Set(yearlyChampions[year])];
            champions.forEach(c => decades[decade].add(c));
        });

        Object.entries(decades).forEach(([decade, champions]) => {
            if (champions.size >= 6) {
                results.push({
                    year: parseInt(decade),
                    icon: Zap,
                    color: 'text-purple-500',
                    text: `Golden era of competition - ${champions.size} different champions in the ${decade}s.`,
                    type: 'era'
                });
            } else if (champions.size === 1 && uniqueYears.filter(y => y.startsWith(decade.toString())).length >= 8) {
                results.push({
                    year: parseInt(decade),
                    icon: Shield,
                    color: 'text-amber-600',
                    text: `Complete dominance by ${[...champions][0]} throughout the ${decade}s.`,
                    type: 'era'
                });
            }
        });

        // Dormancy detection - gaps in seasons
        for (let i = 1; i < uniqueYears.length; i++) {
            const prevYear = parseInt(uniqueYears[i-1].split('-')[0]);
            const currYear = parseInt(uniqueYears[i].split('-')[0]);
            const gap = currYear - prevYear;
            if (gap >= 3) {
                results.push({
                    year: prevYear + 1,
                    icon: AlertCircle,
                    color: 'text-red-600',
                    text: `League suspended for ${gap} years${league.inactivity_reason ? ` (${league.inactivity_reason})` : ''}.`,
                    type: 'dormancy'
                });
            }
        }

        return results
            .sort((a, b) => a.year - b.year)
            .filter((event, idx, arr) => {
                // Remove duplicates by year and text
                return idx === arr.findIndex(e => e.year === event.year && e.text === event.text);
            });
    }, [league, seasons, nation]);

    const eventsByDecade = useMemo(() => {
        const grouped = {};
        events.forEach(event => {
            const decade = Math.floor(event.year / 10) * 10;
            if (!grouped[decade]) grouped[decade] = [];
            grouped[decade].push(event);
        });
        return grouped;
    }, [events]);

    if (events.length === 0) return null;

    const decades = Object.keys(eventsByDecade).map(Number).sort((a, b) => a - b);

    return (
        <Card className="border-0 shadow-sm mb-6">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <BookOpen className="w-5 h-5 text-emerald-600" />
                    League History Timeline
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="relative">
                    <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-slate-300 via-slate-200 to-slate-100" />
                    <div className="space-y-1">
                        {decades.map((decade, decadeIdx) => {
                            const decadeEvents = eventsByDecade[decade];
                            const isExpanded = expandedDecades.has(decade);
                            const isFirst = decadeIdx === 0;
                            const isLast = decadeIdx === decades.length - 1;
                            
                            // Categorize events
                            const majorEvents = decadeEvents.filter(e => ['era', 'structural', 'dormancy'].includes(e.type));
                            const minorEvents = decadeEvents.filter(e => !['era', 'structural', 'dormancy'].includes(e.type));
                            
                            return (
                                <div key={decade} className="relative">
                                    {/* Decade Header */}
                                    <button
                                        onClick={() => toggleDecade(decade)}
                                        className="w-full flex items-center gap-3 py-3 hover:bg-slate-50 rounded-lg transition-colors group"
                                    >
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center z-10 font-bold text-sm transition-all ${
                                            isExpanded 
                                                ? 'bg-emerald-500 text-white scale-110' 
                                                : 'bg-white border-2 border-slate-300 text-slate-600 group-hover:border-emerald-400'
                                        }`}>
                                            {decade}s
                                        </div>
                                        <div className="flex-1 text-left">
                                            <div className="font-semibold text-slate-800">
                                                {decade}s
                                                {majorEvents.length > 0 && (
                                                    <Badge variant="outline" className="ml-2 text-xs">
                                                        {majorEvents.length} key event{majorEvents.length !== 1 ? 's' : ''}
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                {decadeEvents.length} total event{decadeEvents.length !== 1 ? 's' : ''}
                                            </div>
                                        </div>
                                    </button>

                                    {/* Expanded Events */}
                                    {isExpanded && (
                                        <div className="ml-6 pl-8 pb-2 space-y-3 border-l-2 border-emerald-200">
                                            {/* Major Events First */}
                                            {majorEvents.map((event, idx) => (
                                                <div key={idx} className="flex items-start gap-3 relative">
                                                    <div className={`w-8 h-8 rounded-full bg-white border-2 flex items-center justify-center z-10 flex-shrink-0 ${event.color} border-current`}>
                                                        <event.icon className="w-4 h-4" />
                                                    </div>
                                                    <div className="flex-1 pt-1">
                                                        <div className="text-xs font-bold text-slate-400 mb-0.5">{event.year}</div>
                                                        <p className="text-slate-700 text-sm font-medium">{event.text}</p>
                                                    </div>
                                                </div>
                                            ))}
                                            
                                            {/* Minor Events */}
                                            {minorEvents.map((event, idx) => (
                                                <div key={`minor-${idx}`} className="flex items-start gap-3 relative">
                                                    <div className={`w-6 h-6 rounded-full bg-white border flex items-center justify-center z-10 flex-shrink-0 ${event.color}`}>
                                                        <event.icon className="w-3 h-3" />
                                                    </div>
                                                    <div className="flex-1 pt-0.5">
                                                        <div className="text-xs text-slate-400">{event.year}</div>
                                                        <p className="text-slate-600 text-xs">{event.text}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}