import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Trophy, TrendingUp, TrendingDown, Star, Target, Calendar, Award, Flame, Shield, Clock } from 'lucide-react';

export default function ClubNarratives({ club, seasons, leagues }) {
    const narratives = [];
    
    if (!club || seasons.length === 0) return null;

    // Sort seasons chronologically
    const sortedSeasons = [...seasons].sort((a, b) => a.year.localeCompare(b.year));
    const latestSeason = sortedSeasons[sortedSeasons.length - 1];
    const firstSeason = sortedSeasons[0];

    // Helper to get league tier
    const getLeagueTier = (leagueId) => {
        const league = leagues.find(l => l.id === leagueId);
        return league?.tier || 1;
    };

    const getLeagueName = (leagueId) => {
        const league = leagues.find(l => l.id === leagueId);
        return league?.name || 'Unknown League';
    };

    // Find first top-flight season
    const firstTopFlight = sortedSeasons.find(s => getLeagueTier(s.league_id) === 1);
    if (firstTopFlight) {
        narratives.push({
            icon: Star,
            color: 'text-amber-500',
            bg: 'bg-amber-50',
            title: 'Top Flight Debut',
            text: `Made their top-flight debut in ${firstTopFlight.year}, entering the elite tier of football.`
        });
    }

    // First ever championship
    const firstTitle = sortedSeasons.find(s => s.status === 'champion');
    if (firstTitle) {
        const tier = getLeagueTier(firstTitle.league_id);
        narratives.push({
            icon: Trophy,
            color: 'text-yellow-500',
            bg: 'bg-yellow-50',
            title: tier === 1 ? 'First League Title' : `First Tier ${tier} Title`,
            text: `Claimed their maiden ${tier === 1 ? 'top-flight' : `Tier ${tier}`} championship in ${firstTitle.year}, a historic moment for the club.`
        });
    }

    // Multiple titles - dynasty narrative
    const championships = sortedSeasons.filter(s => s.status === 'champion' && getLeagueTier(s.league_id) === 1);
    if (championships.length >= 3) {
        narratives.push({
            icon: Award,
            color: 'text-purple-500',
            bg: 'bg-purple-50',
            title: 'Dominant Force',
            text: `With ${championships.length} top-flight titles, the club has established itself as one of the most successful in history.`
        });
    }

    // Back-to-back titles
    for (let i = 1; i < championships.length; i++) {
        const prevYear = championships[i - 1].year;
        const currYear = championships[i].year;
        if (currYear.split('-')[0] === (parseInt(prevYear.split('-')[0]) + 1).toString()) {
            narratives.push({
                icon: Flame,
                color: 'text-orange-500',
                bg: 'bg-orange-50',
                title: 'Back-to-Back Champions',
                text: `Defended their title successfully in ${currYear}, showing remarkable consistency at the top.`
            });
            break;
        }
    }

    // Back-to-back promotions
    const promotions = sortedSeasons.filter(s => s.status === 'promoted');
    for (let i = 1; i < promotions.length; i++) {
        const prevYear = promotions[i - 1].year;
        const currYear = promotions[i].year;
        if (currYear.split('-')[0] === (parseInt(prevYear.split('-')[0]) + 1).toString()) {
            narratives.push({
                icon: TrendingUp,
                color: 'text-green-600',
                bg: 'bg-green-50',
                title: 'Back-to-Back Promotions',
                text: `Achieved consecutive promotions in ${prevYear} and ${currYear}, rocketing up the pyramid.`
            });
            break;
        }
    }

    // Back-to-back relegations
    const relegations = sortedSeasons.filter(s => s.status === 'relegated');
    for (let i = 1; i < relegations.length; i++) {
        const prevYear = relegations[i - 1].year;
        const currYear = relegations[i].year;
        if (currYear.split('-')[0] === (parseInt(prevYear.split('-')[0]) + 1).toString()) {
            narratives.push({
                icon: TrendingDown,
                color: 'text-red-600',
                bg: 'bg-red-50',
                title: 'Freefall',
                text: `Suffered back-to-back relegations in ${prevYear} and ${currYear}, a desperate period for the club.`
            });
            break;
        }
    }

    // Won title after promotion
    for (let i = 1; i < sortedSeasons.length; i++) {
        if (sortedSeasons[i].status === 'champion' && sortedSeasons[i - 1].status === 'promoted') {
            narratives.push({
                icon: Trophy,
                color: 'text-amber-600',
                bg: 'bg-amber-50',
                title: 'From Promoted to Champions',
                text: `Won the title in ${sortedSeasons[i].year} just one season after promotion - a remarkable achievement.`
            });
            break;
        }
    }

    // Relegated after being champions (same tier only)
    for (let i = 1; i < sortedSeasons.length; i++) {
        const prevTier = getLeagueTier(sortedSeasons[i - 1].league_id);
        const currTier = getLeagueTier(sortedSeasons[i].league_id);
        if (sortedSeasons[i].status === 'relegated' && sortedSeasons[i - 1].status === 'champion' && prevTier === currTier) {
            narratives.push({
                icon: TrendingDown,
                color: 'text-red-500',
                bg: 'bg-red-50',
                title: 'Fall from Grace',
                text: `Relegated in ${sortedSeasons[i].year} just one year after winning the title - a stunning collapse.`
            });
            break;
        }
    }

    // Promoted as champions (won the league to get promoted)
    const promotedAsChamps = sortedSeasons.filter(s => s.status === 'promoted' && s.position === 1);
    if (promotedAsChamps.length > 0) {
        narratives.push({
            icon: Trophy,
            color: 'text-green-500',
            bg: 'bg-green-50',
            title: 'Champions & Promoted',
            text: `Won ${promotedAsChamps.length} lower-tier title${promotedAsChamps.length > 1 ? 's' : ''} to earn promotion.`
        });
    }

    // First relegation
    const firstRelegation = sortedSeasons.find(s => s.status === 'relegated');
    if (firstRelegation) {
        narratives.push({
            icon: TrendingDown,
            color: 'text-red-500',
            bg: 'bg-red-50',
            title: 'First Relegation',
            text: `Suffered their first relegation in ${firstRelegation.year}, a difficult chapter in the club's history.`
        });
    }

    // Promotion story
    const firstPromotion = sortedSeasons.find(s => s.status === 'promoted');
    if (firstPromotion) {
        narratives.push({
            icon: TrendingUp,
            color: 'text-green-500',
            bg: 'bg-green-50',
            title: 'Rising Up',
            text: `Earned promotion in ${firstPromotion.year}, taking a step up the football pyramid.`
        });
    }

    // Best ever finish
    if (club.best_finish && club.best_finish_year) {
        const tierText = club.best_finish_tier ? ` in Tier ${club.best_finish_tier}` : '';
        const posText = club.best_finish === 1 ? '1st' : club.best_finish === 2 ? '2nd' : club.best_finish === 3 ? '3rd' : `${club.best_finish}th`;
        narratives.push({
            icon: Target,
            color: 'text-emerald-500',
            bg: 'bg-emerald-50',
            title: 'Peak Performance',
            text: `Achieved their best ever league finish of ${posText}${tierText} in ${club.best_finish_year}.`
        });
    }

    // VCC success
    if (club.vcc_titles > 0) {
        narratives.push({
            icon: Star,
            color: 'text-blue-500',
            bg: 'bg-blue-50',
            title: 'Continental Glory',
            text: `Lifted the Volaria Champions Cup ${club.vcc_titles} time${club.vcc_titles > 1 ? 's' : ''} (${club.vcc_title_years}), reaching the pinnacle of continental football.`
        });
    } else if (club.vcc_best_finish === 'Final') {
        narratives.push({
            icon: Shield,
            color: 'text-blue-400',
            bg: 'bg-blue-50',
            title: 'So Close to Glory',
            text: `Reached the VCC Final in ${club.vcc_best_finish_year}, falling agonisingly short of continental triumph.`
        });
    }

    // CCC success
    if (club.ccc_titles > 0) {
        narratives.push({
            icon: Trophy,
            color: 'text-indigo-500',
            bg: 'bg-indigo-50',
            title: 'Continental Cup Winners',
            text: `Won the Continental Cup ${club.ccc_titles} time${club.ccc_titles > 1 ? 's' : ''} (${club.ccc_title_years}).`
        });
    } else if (club.ccc_best_finish === 'Final') {
        narratives.push({
            icon: Shield,
            color: 'text-indigo-400',
            bg: 'bg-indigo-50',
            title: 'CCC Heartbreak',
            text: `Reached the CCC Final in ${club.ccc_best_finish_year}, narrowly missing out on continental silverware.`
        });
    }

    // Multiple VCC appearances
    if (club.vcc_appearances >= 5) {
        narratives.push({
            icon: Star,
            color: 'text-amber-500',
            bg: 'bg-amber-50',
            title: 'VCC Regulars',
            text: `Made ${club.vcc_appearances} appearances in the Volaria Champions Cup, a fixture on the continental stage.`
        });
    }

    // Continental double (VCC + league in same era)
    if (club.vcc_titles > 0 && club.league_titles > 0) {
        narratives.push({
            icon: Award,
            color: 'text-yellow-600',
            bg: 'bg-yellow-50',
            title: 'Domestic & Continental Success',
            text: `One of the elite clubs to have won both domestic league titles and the VCC.`
        });
    }

    // Won both VCC and CCC
    if (club.vcc_titles > 0 && club.ccc_titles > 0) {
        narratives.push({
            icon: Star,
            color: 'text-purple-500',
            bg: 'bg-purple-50',
            title: 'Complete Continental Set',
            text: `Won both the VCC and CCC, conquering both continental competitions.`
        });
    }

    // Longevity narrative
    if (club.seasons_played >= 20) {
        narratives.push({
            icon: Calendar,
            color: 'text-slate-500',
            bg: 'bg-slate-50',
            title: 'Established Institution',
            text: `With ${club.seasons_played} seasons of recorded history, the club is a cornerstone of their nation's football.`
        });
    }

    // Top flight mainstay
    if (club.seasons_top_flight >= 10) {
        narratives.push({
            icon: Star,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
            title: 'Top Flight Regulars',
            text: `Spent ${club.seasons_top_flight} seasons in the top division, demonstrating sustained excellence.`
        });
    }

    // Yo-yo club (multiple promotions and relegations)
    if ((club.promotions || 0) >= 3 && (club.relegations || 0) >= 3) {
        narratives.push({
            icon: TrendingUp,
            color: 'text-orange-500',
            bg: 'bg-orange-50',
            title: 'The Yo-Yo Years',
            text: `A turbulent history with ${club.promotions} promotions and ${club.relegations} relegations - never a dull moment.`
        });
    }

    // Goal machine
    if (club.total_goals_scored >= 500) {
        narratives.push({
            icon: Flame,
            color: 'text-red-500',
            bg: 'bg-red-50',
            title: 'Goal Machine',
            text: `Scored ${club.total_goals_scored} goals across their recorded history, averaging ${(club.total_goals_scored / club.seasons_played).toFixed(1)} per season.`
        });
    }

    // Founding narrative
    if (club.founded_year) {
        const age = new Date().getFullYear() - club.founded_year;
        if (age >= 100) {
            narratives.push({
                icon: BookOpen,
                color: 'text-amber-700',
                bg: 'bg-amber-50',
                title: 'Century of History',
                text: `Founded in ${club.founded_year}, the club has over a century of footballing tradition.`
            });
        } else if (age >= 50) {
            narratives.push({
                icon: BookOpen,
                color: 'text-slate-600',
                bg: 'bg-slate-50',
                title: 'Half Century Club',
                text: `Established in ${club.founded_year}, with ${age} years of history behind them.`
            });
        }
    }

    // TFA-specific narratives (Turuliand top 4 tiers)
    const isTuruliand = club.nation_id && leagues.some(l => l.nation_id === club.nation_id && l.name?.includes('TFA'));
    if (isTuruliand && sortedSeasons.length > 0) {
        const tfaSeasons = sortedSeasons.filter(s => {
            const tier = getLeagueTier(s.league_id);
            return tier && tier <= 4;
        });
        const nonTfaSeasons = sortedSeasons.filter(s => {
            const tier = getLeagueTier(s.league_id);
            return tier && tier > 4;
        });

        // First time joining TFA
        if (tfaSeasons.length > 0) {
            const firstTfaSeason = [...tfaSeasons].sort((a, b) => a.year.localeCompare(b.year))[0];
            const seasonsBeforeTfa = sortedSeasons.filter(s => s.year < firstTfaSeason.year);
            if (seasonsBeforeTfa.length > 0 && seasonsBeforeTfa.every(s => getLeagueTier(s.league_id) > 4)) {
                narratives.push({
                    icon: TrendingUp,
                    color: 'text-emerald-600',
                    bg: 'bg-emerald-50',
                    title: 'Welcome to the TFA',
                    text: `Joined the TFA Football League for the first time in ${firstTfaSeason.year}, reaching the top 4 tiers.`
                });
            }
        }

        // Dropped out of TFA for the first time
        if (nonTfaSeasons.length > 0 && tfaSeasons.length > 0) {
            const firstNonTfaSeason = [...nonTfaSeasons].sort((a, b) => a.year.localeCompare(b.year))[0];
            const tfaSeasonsBeforeDrop = tfaSeasons.filter(s => s.year < firstNonTfaSeason.year);
            if (tfaSeasonsBeforeDrop.length > 0) {
                const allSeasonsBefore = sortedSeasons.filter(s => s.year < firstNonTfaSeason.year);
                if (allSeasonsBefore.every(s => getLeagueTier(s.league_id) <= 4)) {
                    narratives.push({
                        icon: TrendingDown,
                        color: 'text-red-600',
                        bg: 'bg-red-50',
                        title: 'Farewell to the TFA',
                        text: `Dropped out of the TFA Football League for the first time in ${firstNonTfaSeason.year}.`
                    });
                }
            }
        }

        // Currently outside TFA - how long away
        const mostRecentSeason = sortedSeasons[0];
        const mostRecentTier = getLeagueTier(mostRecentSeason?.league_id);
        if (mostRecentTier && mostRecentTier > 4 && tfaSeasons.length > 0) {
            const lastTfaSeason = [...tfaSeasons].sort((a, b) => b.year.localeCompare(a.year))[0];
            const seasonsAway = sortedSeasons.filter(s => s.year > lastTfaSeason.year).length;
            if (seasonsAway >= 2) {
                narratives.push({
                    icon: Clock,
                    color: 'text-slate-500',
                    bg: 'bg-slate-100',
                    title: 'TFA Exile',
                    text: `${seasonsAway} seasons since last playing in the TFA Football League (${lastTfaSeason.year}).`
                });
            }
        }
    }

    // Club reformation/name change narratives
    if (club.predecessor_club_id && !club.predecessor_club_2_id) {
        narratives.push({
            icon: Shield,
            color: 'text-blue-500',
            bg: 'bg-blue-50',
            title: 'Reborn',
            text: `This club continues the legacy of a predecessor, carrying forward their history and traditions.`
        });
    }

    // Merger narrative
    if (club.predecessor_club_id && club.predecessor_club_2_id) {
        narratives.push({
            icon: Shield,
            color: 'text-purple-500',
            bg: 'bg-purple-50',
            title: 'United as One',
            text: `Formed from a merger of two clubs, combining their histories and fanbases into one entity.`
        });
    }

    // Defunct club narrative
    if (club.is_defunct) {
        narratives.push({
            icon: BookOpen,
            color: 'text-slate-500',
            bg: 'bg-slate-100',
            title: 'End of an Era',
            text: club.defunct_year 
                ? `The club ceased operations in ${club.defunct_year}, but their legacy lives on.`
                : `This club is no longer active, but their story remains part of football history.`
        });
    }

    if (narratives.length === 0) return null;

    return (
        <Card className="border-0 shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-emerald-600" />
                    Club Story
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid gap-3 md:grid-cols-2">
                    {narratives.slice(0, 8).map((narrative, idx) => (
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