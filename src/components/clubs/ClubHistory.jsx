import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Trophy, TrendingUp, TrendingDown, Star, Calendar, Award, Flame, Shield, Users, Target, Zap } from 'lucide-react';

export default function ClubHistory({ club, nation, league, seasons = [], leagues = [] }) {
    const events = useMemo(() => {
        if (!club || seasons.length === 0) return [];

        const sortedSeasons = [...seasons].sort((a, b) => a.year.localeCompare(b.year));
        const results = [];
        
        const getLeagueTier = (leagueId) => leagues.find(l => l.id === leagueId)?.tier || 1;
        const getLeagueName = (leagueId, season) => {
            const leagueName = leagues.find(l => l.id === leagueId)?.name || 'the league';
            if (season?.division_name) {
                return `${leagueName} - ${season.division_name}`;
            }
            return leagueName;
        };
        
        const firstSeason = sortedSeasons[0];
        const foundingYear = club.founded_year || parseInt(firstSeason?.year?.split('-')[0]);
        const ordinal = (n) => n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`;

        // Founding event - culturally immersive based on club name
        if (foundingYear) {
            const locations = [club.settlement, club.district, club.region].filter(Boolean);
            const locationText = locations.length > 0 ? locations[0] : club.city;
            const name = club.name || '';
            
            let foundingText;
            
            // Analyze club name for cultural context
            if (/^(FK|IF|BK|SK|IK)\s/i.test(name) || /\s(FK|IF|BK|SK|IK)$/i.test(name)) {
                // Nordic
                const prefix = name.match(/^(FK|IF|BK|SK|IK)/i)?.[0]?.toUpperCase();
                const meanings = { 'FK': 'Fotbollsklubb', 'IF': 'Idrottsförening', 'BK': 'Bollklubb', 'SK': 'Sportklubb', 'IK': 'Idrottsklubb' };
                foundingText = `Founded in the Nordic sporting tradition${locationText ? ` in ${locationText}` : ''}. ${prefix && meanings[prefix] ? `"${prefix}" (${meanings[prefix]}) reflects their multi-sport origins.` : ''}`;
            } else if (/Celtic|Gaelic|Hibernian|Shamrock|Harps/i.test(name)) {
                foundingText = `Born from Celtic and Irish cultural heritage${locationText ? ` in ${locationText}` : ''}, the club carries the spirit of their community.`;
            } else if (/Rovers|Wanderers|Rangers/i.test(name)) {
                foundingText = `Established${locationText ? ` in ${locationText}` : ''} with the pioneering spirit of early football, the name reflecting the wandering nature of the game's origins.`;
            } else if (/^Real\s/i.test(name)) {
                foundingText = `Founded${locationText ? ` in ${locationText}` : ''} with royal patronage, the "Real" title bestowing prestige and tradition upon the club.`;
            } else if (/^Atlético|Athletic/i.test(name)) {
                foundingText = `Established${locationText ? ` in ${locationText}` : ''} with athletic and sporting ideals at its heart, following Iberian football traditions.`;
            } else if (/^(Dynamo|Dinamo)/i.test(name)) {
                foundingText = `Founded${locationText ? ` in ${locationText}` : ''} with links to power and industry, following the Eastern European tradition of worker-affiliated clubs.`;
            } else if (/^Spartak/i.test(name)) {
                foundingText = `Established${locationText ? ` in ${locationText}` : ''}, named after Spartacus as a symbol of workers' sport and resistance.`;
            } else if (/^Lokomotiv/i.test(name)) {
                foundingText = `Born from the railway workers${locationText ? ` of ${locationText}` : ''}, a proud tradition of industry-connected football.`;
            } else if (/^(Borussia)/i.test(name)) {
                foundingText = `Founded${locationText ? ` in ${locationText}` : ''} with "Borussia" - the Latin name for Prussia - representing regional pride and identity.`;
            } else if (/^Eintracht/i.test(name)) {
                foundingText = `Established${locationText ? ` in ${locationText}` : ''} under the name "Eintracht" - meaning unity and harmony in German.`;
            } else if (/United/i.test(name)) {
                foundingText = `Formed${locationText ? ` in ${locationText}` : ''} from the unification of local football interests, the "United" name symbolizing community togetherness.`;
            } else if (/Town|City|Borough/i.test(name)) {
                foundingText = `Established as the pride of ${locationText || 'their community'}, representing the civic spirit of their home.`;
            } else if (/^Inter/i.test(name)) {
                foundingText = `Founded${locationText ? ` in ${locationText}` : ''} with an internationalist spirit, welcoming players and fans from all backgrounds.`;
            } else if (/Juventus/i.test(name)) {
                foundingText = `Established${locationText ? ` in ${locationText}` : ''} with "Juventus" - Latin for "youth" - symbolizing vitality and ambition.`;
            } else if (/^Ajax/i.test(name)) {
                foundingText = `Named after the legendary Greek hero Ajax${locationText ? `, the club was founded in ${locationText}` : ''}, embodying strength and courage.`;
            } else if (/Sporting/i.test(name)) {
                foundingText = `Founded${locationText ? ` in ${locationText}` : ''} in the Lusophone sporting tradition, with multi-sport origins shaping their identity.`;
            } else if (/Shakhtar/i.test(name)) {
                foundingText = `Born from the mining communities${locationText ? ` of ${locationText}` : ''}, "Shakhtar" meaning "miner" - a club built on working-class foundations.`;
            } else if (club.nickname) {
                foundingText = `${club.name}, known as "${club.nickname}", was founded${locationText ? ` in ${locationText}` : ''}.`;
            } else if (locationText) {
                foundingText = `The club was established in ${locationText}, marking the beginning of a footballing journey.`;
            } else {
                foundingText = `${club.name} was formed, beginning their place in football history.`;
            }
            
            results.push({
                year: foundingYear,
                icon: Calendar,
                color: 'text-slate-600',
                text: foundingText
            });
        }

        // First recorded season with context
        if (firstSeason) {
            const leagueName = getLeagueName(firstSeason.league_id, firstSeason);
            const tier = getLeagueTier(firstSeason.league_id);
            const pos = ordinal(firstSeason.position);
            
            let seasonText;
            if (firstSeason.position === 1) {
                seasonText = `Entered the record books with a championship triumph in ${leagueName} in their first recorded campaign.`;
            } else if (firstSeason.position <= 3) {
                seasonText = `Made their mark immediately with a ${pos} place finish in ${leagueName}.`;
            } else if (tier === 1) {
                seasonText = `First recorded top-flight season in ${leagueName}, finishing in ${pos} position.`;
            } else {
                seasonText = `Earliest records show the club competing in ${leagueName}, finishing ${pos}.`;
            }
            
            results.push({
                year: parseInt(firstSeason.year.split('-')[0]),
                icon: BookOpen,
                color: 'text-blue-500',
                text: seasonText
            });
        }

        // First top flight season (only if they didn't start there)
        const firstTopFlight = sortedSeasons.find(s => getLeagueTier(s.league_id) === 1);
        if (firstTopFlight && getLeagueTier(firstSeason.league_id) !== 1) {
            const leagueName = getLeagueName(firstTopFlight.league_id, firstTopFlight);
            results.push({
                year: parseInt(firstTopFlight.year.split('-')[0]),
                icon: Star,
                color: 'text-amber-500',
                text: `Historic promotion to the ${leagueName} - the club's first taste of top-flight football.`
            });
        }

        // Track championships by tier to avoid "defended title" across tiers
        const championshipsByTier = {};
        const championships = sortedSeasons.filter(s => s.status === 'champion');
        
        championships.forEach(s => {
            const tier = getLeagueTier(s.league_id);
            if (!championshipsByTier[tier]) championshipsByTier[tier] = [];
            championshipsByTier[tier].push(s);
        });

        // First ever championship (any tier)
        if (championships.length > 0) {
            const firstChamp = championships[0];
            const tier = getLeagueTier(firstChamp.league_id);
            const leagueName = getLeagueName(firstChamp.league_id, firstChamp);
            const yearNum = parseInt(firstChamp.year.split('-')[0]);
            
            results.push({
                year: yearNum,
                icon: Trophy,
                color: 'text-amber-500',
                text: tier === 1 
                    ? `Glory days arrived! ${club.name} were crowned ${leagueName} champions for the first time.`
                    : `Lifted their first piece of silverware, winning the ${leagueName}.`
            });
        }

        // First TOP FLIGHT title (if different from first title)
        const topFlightChamps = championshipsByTier[1] || [];
        if (topFlightChamps.length > 0) {
            const firstTopFlightTitle = topFlightChamps[0];
            const leagueName = getLeagueName(firstTopFlightTitle.league_id, firstTopFlightTitle);
            const yearNum = parseInt(firstTopFlightTitle.year.split('-')[0]);
            
            // Only add if it's different from the first ever championship
            if (championships[0] && getLeagueTier(championships[0].league_id) !== 1) {
                results.push({
                    year: yearNum,
                    icon: Trophy,
                    color: 'text-yellow-500',
                    text: `The ultimate prize! Claimed their maiden ${leagueName} championship.`
                });
            }
        }

        // Back-to-back titles (only within same tier)
        Object.entries(championshipsByTier).forEach(([tier, tierChamps]) => {
            for (let i = 1; i < tierChamps.length; i++) {
                const prevYear = parseInt(tierChamps[i - 1].year.split('-')[0]);
                const currYear = parseInt(tierChamps[i].year.split('-')[0]);
                const leagueName = getLeagueName(tierChamps[i].league_id, tierChamps[i]);
                
                if (currYear === prevYear + 1) {
                    results.push({
                        year: currYear,
                        icon: Trophy,
                        color: 'text-amber-600',
                        text: parseInt(tier) === 1 
                            ? `Retained the ${leagueName} crown, cementing their status as the team to beat.`
                            : `Back-to-back ${leagueName} titles as the club continued their dominance.`
                    });
                    break; // Only show first back-to-back per tier
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
                        ? `Cup glory! Lifted the domestic cup for the first time after a triumphant final.`
                        : `Another cup triumph added to the growing collection.`
                });
            });
        }

        // Cup final losses (best finish = Final without winning)
        if (club.domestic_cup_best_finish === 'Final' && (!club.domestic_cup_titles || club.domestic_cup_titles === 0)) {
            if (club.domestic_cup_best_finish_year) {
                results.push({
                    year: parseInt(club.domestic_cup_best_finish_year),
                    icon: Shield,
                    color: 'text-slate-500',
                    text: `Heartbreak in the cup final - so close to glory but fell at the final hurdle.`
                });
            }
        }

        // Cup semi-final best finish
        if (club.domestic_cup_best_finish === 'Semi-final' && club.domestic_cup_best_finish_year) {
            results.push({
                year: parseInt(club.domestic_cup_best_finish_year),
                icon: Target,
                color: 'text-blue-500',
                text: `Best cup run ended at the semi-finals, agonisingly close to the showpiece final.`
            });
        }

        // Cup quarter-final best finish
        if (club.domestic_cup_best_finish === 'Quarter-final' && club.domestic_cup_best_finish_year) {
            results.push({
                year: parseInt(club.domestic_cup_best_finish_year),
                icon: Target,
                color: 'text-blue-400',
                text: `Memorable cup run reached the quarter-final stage before bowing out.`
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
                        ? `Continental glory! Conquered Volaria to win the Champions Cup.`
                        : `Proved their European pedigree with another VCC triumph.`
                });
            });
        }

        // VCC final loss
        if (club.vcc_best_finish === 'Final' && (!club.vcc_titles || club.vcc_titles === 0) && club.vcc_best_finish_year) {
            results.push({
                year: parseInt(club.vcc_best_finish_year),
                icon: Shield,
                color: 'text-blue-400',
                text: `Reached the VCC Final but fell agonisingly short of continental glory.`
            });
        }

        // CCC wins
        if (club.ccc_titles > 0 && club.ccc_title_years) {
            const cccYears = club.ccc_title_years.split(',').map(y => y.trim());
            cccYears.forEach((year, idx) => {
                results.push({
                    year: parseInt(year),
                    icon: Trophy,
                    color: 'text-indigo-500',
                    text: idx === 0 
                        ? `European silverware! Won the Continental Cup for the first time.`
                        : `Added another Continental Cup to the trophy cabinet.`
                });
            });
        }

        // Key promotions with context
        const promotions = sortedSeasons.filter(s => s.status === 'promoted' || s.status === 'playoff_winner');
        promotions.forEach((s, idx) => {
            const yearNum = parseInt(s.year.split('-')[0]);
            const nextSeason = sortedSeasons.find(ns => parseInt(ns.year.split('-')[0]) === yearNum + 1);
            const destLeague = nextSeason ? getLeagueName(nextSeason.league_id, nextSeason) : null;
            
            if (idx === 0) {
                results.push({
                    year: yearNum,
                    icon: TrendingUp,
                    color: 'text-green-500',
                    text: s.status === 'playoff_winner' 
                        ? `Playoff heroes! Earned promotion through the nerve-wracking playoffs${destLeague ? ` to the ${destLeague}` : ''}.`
                        : `Secured promotion${destLeague ? ` to the ${destLeague}` : ''}, stepping up to a higher level.`
                });
            } else if (idx === 1 && parseInt(promotions[0].year.split('-')[0]) === yearNum - 1) {
                results.push({
                    year: yearNum,
                    icon: Zap,
                    color: 'text-green-600',
                    text: `Back-to-back promotions! The unstoppable rise continued.`
                });
            }
        });

        // First relegation with empathy
        const firstRelegation = sortedSeasons.find(s => s.status === 'relegated');
        if (firstRelegation) {
            const tier = getLeagueTier(firstRelegation.league_id);
            const leagueName = getLeagueName(firstRelegation.league_id, firstRelegation);
            results.push({
                year: parseInt(firstRelegation.year.split('-')[0]),
                icon: TrendingDown,
                color: 'text-red-500',
                text: tier === 1 
                    ? `Dark days as ${club.name} dropped out of the ${leagueName} for the first time.`
                    : `Suffered relegation from the ${leagueName}, beginning a spell in the lower tiers.`
            });
        }

        // Immediate bounce back after relegation
        for (let i = 1; i < sortedSeasons.length; i++) {
            if (sortedSeasons[i].status === 'promoted' && sortedSeasons[i - 1].status === 'relegated') {
                results.push({
                    year: parseInt(sortedSeasons[i].year.split('-')[0]),
                    icon: Flame,
                    color: 'text-orange-500',
                    text: `Bounced straight back! One season was all it took to return.`
                });
                break;
            }
        }

        // Best ever finish (if not a title)
        if (club.best_finish && club.best_finish > 1 && club.best_finish <= 5 && club.best_finish_year) {
            const pos = ordinal(club.best_finish);
            const tierText = club.best_finish_tier === 1 ? 'top-flight' : `Tier ${club.best_finish_tier}`;
            results.push({
                year: parseInt(club.best_finish_year),
                icon: Flame,
                color: 'text-orange-500',
                text: `Record-breaking ${pos} place ${tierText} finish - the club's highest ever league position.`
            });
        }

        // Milestone seasons
        const seasonCount = sortedSeasons.length;
        if (seasonCount >= 25) {
            const season25 = sortedSeasons[24];
            results.push({
                year: parseInt(season25.year.split('-')[0]),
                icon: Users,
                color: 'text-purple-500',
                text: `Celebrated 25 seasons of football history.`
            });
        }
        if (seasonCount >= 50) {
            const season50 = sortedSeasons[49];
            results.push({
                year: parseInt(season50.year.split('-')[0]),
                icon: Star,
                color: 'text-purple-600',
                text: `Half a century of football! 50 seasons in the record books.`
            });
        }

        // Sort by year and remove duplicates
        const seen = new Set();
        return results
            .sort((a, b) => a.year - b.year)
            .filter(e => {
                const key = `${e.year}-${e.text.substring(0, 30)}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            })
            .slice(0, 10);
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