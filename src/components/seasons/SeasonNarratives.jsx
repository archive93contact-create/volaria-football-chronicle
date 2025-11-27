import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Trophy, Star, Globe, Flame, Award, TrendingUp, Shield, Zap, Target, Crown, MapPin } from 'lucide-react';

export default function SeasonNarratives({ 
    selectedYear, 
    seasons = [], 
    continentalSeasons = [], 
    leagues = [], 
    nations = [],
    allSeasons = [],
    allContinentalSeasons = []
}) {
    const narratives = useMemo(() => {
        if (!selectedYear || seasons.length === 0) return [];
        
        const results = [];
        
        // Helper to get league info
        const getLeague = (leagueId) => leagues.find(l => l.id === leagueId);
        const getNation = (nationId) => nations.find(n => n.id === nationId);
        
        // Get top flight champions for this year
        const topFlightChampions = seasons
            .filter(s => {
                const league = getLeague(s.league_id);
                return league?.tier === 1 && s.champion_name;
            })
            .map(s => ({
                ...s,
                league: getLeague(s.league_id),
                nation: getNation(getLeague(s.league_id)?.nation_id)
            }));

        // Count unique champions
        const uniqueChampions = new Set(topFlightChampions.map(c => c.champion_name));
        
        // Find first-time champions by checking all previous seasons
        const previousChampions = new Set();
        allSeasons
            .filter(s => s.year < selectedYear)
            .forEach(s => {
                const league = getLeague(s.league_id);
                if (league?.tier === 1 && s.champion_name) {
                    previousChampions.add(s.champion_name);
                }
            });
        
        const firstTimeChampions = topFlightChampions.filter(c => !previousChampions.has(c.champion_name));
        
        if (firstTimeChampions.length > 0) {
            if (firstTimeChampions.length === 1) {
                const c = firstTimeChampions[0];
                results.push({
                    icon: Star,
                    color: 'text-amber-500',
                    bg: 'bg-amber-50',
                    title: 'New Champions Crowned',
                    text: `${c.champion_name} won their first ever ${c.league?.name || 'top-flight'} title${c.nation ? ` in ${c.nation.name}` : ''} - a historic achievement.`
                });
            } else {
                results.push({
                    icon: Star,
                    color: 'text-amber-500',
                    bg: 'bg-amber-50',
                    title: 'Season of Firsts',
                    text: `${firstTimeChampions.length} clubs won their first ever top-flight title: ${firstTimeChampions.map(c => c.champion_name).join(', ')}.`
                });
            }
        }

        // Title retentions
        const retentions = topFlightChampions.filter(c => {
            const prevYearSeasons = allSeasons.filter(s => {
                const league = getLeague(s.league_id);
                return s.year === String(parseInt(selectedYear) - 1) && 
                       league?.id === c.league?.id && 
                       s.champion_name === c.champion_name;
            });
            return prevYearSeasons.length > 0;
        });

        if (retentions.length > 0) {
            if (retentions.length === 1) {
                const r = retentions[0];
                results.push({
                    icon: Trophy,
                    color: 'text-yellow-600',
                    bg: 'bg-yellow-50',
                    title: 'Title Defended',
                    text: `${r.champion_name} successfully defended their ${r.league?.name || ''} crown${r.nation ? ` in ${r.nation.name}` : ''}.`
                });
            } else {
                results.push({
                    icon: Trophy,
                    color: 'text-yellow-600',
                    bg: 'bg-yellow-50',
                    title: 'Champions Retained',
                    text: `${retentions.length} clubs defended their titles: ${retentions.map(r => r.champion_name).join(', ')}.`
                });
            }
        }

        // Continental double (same club won VCC/CCC and domestic league)
        const continentalWinners = continentalSeasons.map(cs => cs.champion_name).filter(Boolean);
        const continentalDoubles = topFlightChampions.filter(c => continentalWinners.includes(c.champion_name));
        
        if (continentalDoubles.length > 0) {
            continentalDoubles.forEach(d => {
                const contSeason = continentalSeasons.find(cs => cs.champion_name === d.champion_name);
                results.push({
                    icon: Award,
                    color: 'text-purple-500',
                    bg: 'bg-purple-50',
                    title: 'Continental & Domestic Glory',
                    text: `${d.champion_name} achieved the remarkable feat of winning both their domestic league and a continental trophy.`
                });
            });
        }

        // Same nation winning both continental cups
        const vccSeason = continentalSeasons.find(cs => cs.champion_name);
        const cccSeason = continentalSeasons.find(cs => cs !== vccSeason && cs.champion_name);
        
        if (vccSeason?.champion_nation && cccSeason?.champion_nation && vccSeason.champion_nation === cccSeason.champion_nation) {
            results.push({
                icon: Globe,
                color: 'text-emerald-500',
                bg: 'bg-emerald-50',
                title: 'Continental Dominance',
                text: `${vccSeason.champion_nation} clubs swept both continental competitions - ${vccSeason.champion_name} and ${cccSeason.champion_name}.`
            });
        }

        // First-time continental winners
        if (allContinentalSeasons.length > 0) {
            const previousContinentalWinners = new Set(
                allContinentalSeasons
                    .filter(cs => cs.year < selectedYear && cs.champion_name)
                    .map(cs => cs.champion_name)
            );
            
            continentalSeasons.forEach(cs => {
                if (cs.champion_name && !previousContinentalWinners.has(cs.champion_name)) {
                    results.push({
                        icon: Crown,
                        color: 'text-amber-600',
                        bg: 'bg-amber-50',
                        title: 'First Continental Crown',
                        text: `${cs.champion_name} won their first ever continental trophy - a historic moment for the club and ${cs.champion_nation || 'their nation'}.`
                    });
                }
            });
        }

        // Continental title retained
        continentalSeasons.forEach(cs => {
            if (cs.champion_name) {
                const prevYearSeason = allContinentalSeasons.find(
                    pcs => pcs.competition_id === cs.competition_id && 
                           pcs.year === String(parseInt(selectedYear) - 1) &&
                           pcs.champion_name === cs.champion_name
                );
                if (prevYearSeason) {
                    results.push({
                        icon: Trophy,
                        color: 'text-yellow-600',
                        bg: 'bg-yellow-50',
                        title: 'Continental Reign Extended',
                        text: `${cs.champion_name} defended their continental crown, winning back-to-back titles.`
                    });
                }
            }
        });

        // Small nation success
        continentalSeasons.forEach(cs => {
            if (cs.champion_nation) {
                const nation = nations.find(n => n.name === cs.champion_nation);
                if (nation?.membership === 'CCC') {
                    results.push({
                        icon: MapPin,
                        color: 'text-blue-500',
                        bg: 'bg-blue-50',
                        title: 'Giant Killing Nation',
                        text: `${cs.champion_name} from ${cs.champion_nation} (an associate member nation) won continental glory.`
                    });
                }
            }
        });

        // All-nation final
        continentalSeasons.forEach(cs => {
            if (cs.champion_nation && cs.runner_up_nation && cs.champion_nation === cs.runner_up_nation) {
                results.push({
                    icon: Shield,
                    color: 'text-indigo-500',
                    bg: 'bg-indigo-50',
                    title: 'Domestic Showdown',
                    text: `An all-${cs.champion_nation} final saw ${cs.champion_name} defeat ${cs.runner_up} for continental glory.`
                });
            }
        });

        // Count nations with champions
        const nationsWithChampions = new Set(topFlightChampions.map(c => c.nation?.id).filter(Boolean));
        if (nationsWithChampions.size >= 5) {
            results.push({
                icon: Globe,
                color: 'text-blue-500',
                bg: 'bg-blue-50',
                title: 'Continent-Wide Competition',
                text: `${nationsWithChampions.size} nations crowned top-flight champions this season, showcasing the depth of Volarian football.`
            });
        }

        // Dramatic finals
        continentalSeasons.forEach(cs => {
            if (cs.final_score) {
                const scores = cs.final_score.match(/(\d+)/g);
                if (scores && scores.length >= 2) {
                    const diff = Math.abs(parseInt(scores[0]) - parseInt(scores[1]));
                    const total = parseInt(scores[0]) + parseInt(scores[1]);
                    
                    if (total >= 6) {
                        results.push({
                            icon: Zap,
                            color: 'text-red-500',
                            bg: 'bg-red-50',
                            title: 'Goal-Fest Final',
                            text: `A thrilling ${cs.final_score} final saw ${cs.champion_name} triumph over ${cs.runner_up} in a high-scoring encounter.`
                        });
                    } else if (diff === 0 || cs.final_score.includes('pen') || cs.final_score.includes('aet')) {
                        results.push({
                            icon: Flame,
                            color: 'text-orange-500',
                            bg: 'bg-orange-50',
                            title: 'Dramatic Finale',
                            text: `${cs.champion_name} edged past ${cs.runner_up} in a tense final (${cs.final_score}).`
                        });
                    }
                }
            }
        });

        // Most active leagues
        const seasonsByNation = {};
        seasons.forEach(s => {
            const league = getLeague(s.league_id);
            if (league) {
                const nationId = league.nation_id;
                seasonsByNation[nationId] = (seasonsByNation[nationId] || 0) + 1;
            }
        });
        
        const mostActive = Object.entries(seasonsByNation).sort((a, b) => b[1] - a[1])[0];
        if (mostActive && mostActive[1] >= 4) {
            const nation = getNation(mostActive[0]);
            if (nation) {
                results.push({
                    icon: TrendingUp,
                    color: 'text-green-500',
                    bg: 'bg-green-50',
                    title: 'Deepest Pyramid',
                    text: `${nation.name} had the most league action with ${mostActive[1]} divisions completing their seasons.`
                });
            }
        }

        // Promoted champions (won title after coming up)
        const promotedChampions = topFlightChampions.filter(c => {
            // Check if they were promoted the previous season
            const prevSeasons = allSeasons.filter(s => {
                const league = getLeague(s.league_id);
                return s.year === String(parseInt(selectedYear) - 1) && 
                       league?.tier === 2 && // Tier 2 previous season
                       (s.champion_name === c.champion_name || s.promoted_teams?.includes(c.champion_name));
            });
            return prevSeasons.length > 0;
        });

        if (promotedChampions.length > 0) {
            const pc = promotedChampions[0];
            results.push({
                icon: Target,
                color: 'text-emerald-600',
                bg: 'bg-emerald-50',
                title: 'From Promotion to Glory',
                text: `${pc.champion_name} went from promoted side to champions in just one season - a remarkable achievement.`
            });
        }

        // Season total stats
        const totalSeasons = seasons.length;
        if (totalSeasons >= 20) {
            results.push({
                icon: Shield,
                color: 'text-slate-500',
                bg: 'bg-slate-50',
                title: 'Comprehensive Coverage',
                text: `${totalSeasons} league seasons completed across the continent, with ${uniqueChampions.size} different clubs lifting silverware.`
            });
        }

        return results.slice(0, 6);
    }, [selectedYear, seasons, continentalSeasons, leagues, nations, allSeasons]);

    if (narratives.length === 0) return null;

    return (
        <Card className="border-0 shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-emerald-600" />
                    Season {selectedYear} Highlights
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid gap-3 md:grid-cols-2">
                    {narratives.map((narrative, idx) => (
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