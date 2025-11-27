import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Trophy, TrendingUp, TrendingDown, Star, Calendar, Award, Flame, Shield } from 'lucide-react';

export default function ClubHistory({ club, nation, league, seasons = [], leagues = [] }) {
    const events = useMemo(() => {
        if (!club || seasons.length === 0) return [];

        const sortedSeasons = [...seasons].sort((a, b) => a.year.localeCompare(b.year));
        const results = [];
        
        const getLeagueTier = (leagueId) => leagues.find(l => l.id === leagueId)?.tier || 1;
        const getLeagueName = (leagueId) => leagues.find(l => l.id === leagueId)?.name || 'the league';
        
        const firstSeason = sortedSeasons[0];
        const foundingYear = club.founded_year || parseInt(firstSeason?.year?.split('-')[0]);

        // Founding event
        if (foundingYear) {
            const locations = [club.settlement, club.district, club.region].filter(Boolean);
            const locationText = locations.length > 0 ? locations[0] : nation?.name;
            
            const foundingPhrases = [
                `${club.name} was established in ${foundingYear}${locationText ? ` in ${locationText}` : ''}.`,
                `The club was founded in ${foundingYear}${locationText ? `, representing ${locationText}` : ''}.`,
                `${foundingYear} saw the formation of ${club.name}${locationText ? ` in ${locationText}` : ''}.`,
            ];
            results.push({
                year: foundingYear,
                icon: Calendar,
                color: 'text-slate-600',
                text: foundingPhrases[Math.floor(club.name.length % foundingPhrases.length)]
            });
        }

        // First recorded season
        if (firstSeason) {
            const leagueName = getLeagueName(firstSeason.league_id);
            results.push({
                year: parseInt(firstSeason.year.split('-')[0]),
                icon: BookOpen,
                color: 'text-blue-500',
                text: `First recorded season in ${leagueName}, finishing ${firstSeason.position}${firstSeason.position === 1 ? 'st' : firstSeason.position === 2 ? 'nd' : firstSeason.position === 3 ? 'rd' : 'th'}.`
            });
        }

        // First top flight season
        const firstTopFlight = sortedSeasons.find(s => getLeagueTier(s.league_id) === 1);
        if (firstTopFlight && getLeagueTier(firstSeason.league_id) !== 1) {
            results.push({
                year: parseInt(firstTopFlight.year.split('-')[0]),
                icon: Star,
                color: 'text-amber-500',
                text: `Reached the top flight for the first time.`
            });
        }

        // Championships
        const championships = sortedSeasons.filter(s => s.status === 'champion');
        championships.forEach((s, idx) => {
            const tier = getLeagueTier(s.league_id);
            const leagueName = getLeagueName(s.league_id);
            const yearNum = parseInt(s.year.split('-')[0]);
            
            if (idx === 0) {
                results.push({
                    year: yearNum,
                    icon: Trophy,
                    color: 'text-amber-500',
                    text: tier === 1 
                        ? `Won their first league title, claiming the ${leagueName} championship.`
                        : `Secured their first ${leagueName} title.`
                });
            } else {
                const prevChamp = championships[idx - 1];
                const prevYear = parseInt(prevChamp.year.split('-')[0]);
                if (yearNum === prevYear + 1) {
                    results.push({
                        year: yearNum,
                        icon: Trophy,
                        color: 'text-amber-600',
                        text: `Defended the title successfully.`
                    });
                } else if (tier === 1) {
                    results.push({
                        year: yearNum,
                        icon: Trophy,
                        color: 'text-amber-500',
                        text: `Lifted the ${leagueName} trophy once again.`
                    });
                }
            }
        });

        // Domestic cup wins
        if (club.domestic_cup_titles > 0 && club.domestic_cup_title_years) {
            const cupYears = club.domestic_cup_title_years.split(',').map(y => y.trim());
            cupYears.forEach((year, idx) => {
                results.push({
                    year: parseInt(year),
                    icon: Award,
                    color: 'text-orange-500',
                    text: idx === 0 
                        ? `Captured their first domestic cup.`
                        : `Added another cup to the trophy cabinet.`
                });
            });
        }

        // Cup final losses
        if (club.domestic_cup_runner_up > 0 && club.domestic_cup_best_finish_year && club.domestic_cup_titles === 0) {
            results.push({
                year: parseInt(club.domestic_cup_best_finish_year),
                icon: Shield,
                color: 'text-slate-500',
                text: `Reached the cup final but fell at the last hurdle.`
            });
        }

        // VCC wins
        if (club.vcc_titles > 0 && club.vcc_title_years) {
            const vccYears = club.vcc_title_years.split(',').map(y => y.trim());
            vccYears.forEach((year, idx) => {
                results.push({
                    year: parseInt(year),
                    icon: Star,
                    color: 'text-yellow-500',
                    text: idx === 0 
                        ? `Conquered the continent, winning the Volarian Champions Cup.`
                        : `European glory once more with another VCC triumph.`
                });
            });
        }

        // Promotions
        const promotions = sortedSeasons.filter(s => s.status === 'promoted' || s.status === 'playoff_winner');
        promotions.slice(0, 3).forEach((s, idx) => {
            const yearNum = parseInt(s.year.split('-')[0]);
            if (idx === 0) {
                results.push({
                    year: yearNum,
                    icon: TrendingUp,
                    color: 'text-green-500',
                    text: s.status === 'playoff_winner' 
                        ? `Earned promotion through the playoffs.`
                        : `Secured promotion to the higher division.`
                });
            }
        });

        // First relegation
        const firstRelegation = sortedSeasons.find(s => s.status === 'relegated');
        if (firstRelegation) {
            results.push({
                year: parseInt(firstRelegation.year.split('-')[0]),
                icon: TrendingDown,
                color: 'text-red-500',
                text: `Suffered relegation for the first time.`
            });
        }

        // Best ever finish (if not a title)
        if (club.best_finish && club.best_finish > 1 && club.best_finish <= 3 && club.best_finish_year) {
            const pos = club.best_finish === 2 ? '2nd' : '3rd';
            results.push({
                year: parseInt(club.best_finish_year),
                icon: Flame,
                color: 'text-orange-500',
                text: `Achieved their highest ever finish of ${pos} place.`
            });
        }

        // Sort by year and take top events
        return results
            .sort((a, b) => a.year - b.year)
            .slice(0, 6);
    }, [club, seasons, leagues, nation]);

    if (events.length === 0) return null;

    return (
        <Card className="border-0 shadow-sm mb-6">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <BookOpen className="w-5 h-5 text-emerald-600" />
                    Club History
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