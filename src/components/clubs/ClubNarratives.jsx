import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Trophy, TrendingUp, TrendingDown, Star, Target, Calendar, Award, Flame, Shield, Clock, Zap } from 'lucide-react';
import { selectBestNarratives, deduplicateNarratives } from './improvedNarratives';

export default function ClubNarratives({ club, seasons, leagues, allClubs = [], allLeagueTables = [] }) {
    const narratives = [];
    
    if (!club || seasons.length === 0) return null;

    // Pattern overlay generator
    const getPatternStyle = (pattern) => {
        if (!pattern || pattern === 'solid') return {};
        
        const patterns = {
            'vertical_stripes': 'repeating-linear-gradient(90deg, rgba(0,0,0,0.02) 0px, transparent 2px, transparent 12px, rgba(0,0,0,0.02) 14px)',
            'horizontal_hoops': 'repeating-linear-gradient(0deg, rgba(0,0,0,0.02) 0px, transparent 2px, transparent 12px, rgba(0,0,0,0.02) 14px)',
            'diagonal_stripe': 'repeating-linear-gradient(45deg, rgba(0,0,0,0.02) 0px, transparent 2px, transparent 20px, rgba(0,0,0,0.02) 22px)',
        };
        
        return { backgroundImage: patterns[pattern] || 'none' };
    };

    // Calculate club stature/size for narrative
    const calculateClubStature = () => {
        // Continental elite: VCC/CCC titles - VCC weighted more heavily
        const vccTitles = club.vcc_titles || 0;
        const cccTitles = club.ccc_titles || 0;
        const vccAppearances = club.vcc_appearances || 0;
        const cccAppearances = club.ccc_appearances || 0;
        const vccRunnerUp = club.vcc_runner_up || 0;
        const cccRunnerUp = club.ccc_runner_up || 0;
        
        // Best continental finish scoring
        const vccBest = club.vcc_best_finish;
        const cccBest = club.ccc_best_finish;
        const vccBestScore = vccBest === 'Winner' ? 10 : vccBest === 'Final' ? 8 : vccBest === 'Semi-final' ? 5 : vccBest === 'Quarter-final' ? 3 : vccAppearances > 0 ? 1 : 0;
        const cccBestScore = cccBest === 'Winner' ? 4 : cccBest === 'Final' ? 3 : cccBest === 'Semi-final' ? 2 : cccBest === 'Quarter-final' ? 1 : 0;
        
        // Weighted appearances: VCC counts full, CCC counts as 0.3
        const weightedAppearances = vccAppearances + (cccAppearances * 0.3);
        const domesticTitles = (club.league_titles || 0);
        const cupTitles = (club.domestic_cup_titles || 0);
        const topFlightSeasons = club.seasons_top_flight || 0;
        const totalSeasons = club.seasons_played || seasons.length;
        
        // Calculate "historic peak" - what was their best era?
        const historicPeak = vccTitles * 50 + cccTitles * 20 + vccRunnerUp * 25 + cccRunnerUp * 10 + 
                           vccBestScore * 5 + cccBestScore * 2 + domesticTitles * 10 + vccAppearances * 8 + cccAppearances * 2;
        
        // Check if fallen giant - had success but now outside top flight
        const currentLeague = leagues.find(l => l.id === club.league_id);
        const currentTier = currentLeague?.tier || 1;
        const isOutsideTopFlight = currentTier > 1;
        
        // How long since top flight?
        const topFlightSeasonsList = seasons.filter(s => {
            const league = leagues.find(l => l.id === s.league_id);
            return league?.tier === 1;
        }).map(s => s.year).sort();
        const lastTopFlightYear = topFlightSeasonsList.length > 0 ? topFlightSeasonsList[topFlightSeasonsList.length - 1] : null;
        const yearsAwayFromTopFlight = lastTopFlightYear ? (parseInt(seasons[seasons.length - 1]?.year?.split('-')[0] || '2024') - parseInt(lastTopFlightYear.split('-')[0])) : 999;
        
        // Fallen giant detection
        const wasPowerhouse = historicPeak >= 100 || vccTitles > 0 || (domesticTitles >= 3 && vccAppearances >= 3);
        const wasEstablished = historicPeak >= 40 || domesticTitles >= 1 || vccAppearances >= 2 || (topFlightSeasons >= 10 && cupTitles >= 1);
        const isFallenGiant = isOutsideTopFlight && wasPowerhouse && yearsAwayFromTopFlight >= 1;
        const isFadingForce = isOutsideTopFlight && wasEstablished && !wasPowerhouse && yearsAwayFromTopFlight >= 2;
        
        // Memory fading factor - how much do people still remember?
        const memoryFactor = yearsAwayFromTopFlight <= 2 ? 1.0 : 
                            yearsAwayFromTopFlight <= 5 ? 0.8 : 
                            yearsAwayFromTopFlight <= 10 ? 0.5 : 
                            yearsAwayFromTopFlight <= 20 ? 0.3 : 0.15;
        
        // Build continental achievements text
        const buildContinentalText = () => {
            const parts = [];
            if (vccTitles > 0) parts.push(`${vccTitles} VCC title${vccTitles !== 1 ? 's' : ''}`);
            if (cccTitles > 0) parts.push(`${cccTitles} CCC title${cccTitles !== 1 ? 's' : ''}`);
            if (vccRunnerUp > 0 && vccTitles === 0) parts.push(`${vccRunnerUp} VCC final${vccRunnerUp !== 1 ? 's' : ''}`);
            if (parts.length === 0 && vccBest === 'Semi-final') parts.push('a VCC semi-final');
            if (parts.length === 0 && vccAppearances > 0) parts.push(`${vccAppearances} VCC appearance${vccAppearances !== 1 ? 's' : ''}`);
            return parts.join(' and ');
        };
        
        // FALLEN GIANT - was great, now struggling
        if (isFallenGiant) {
            const continentalText = buildContinentalText();
            const fadeText = yearsAwayFromTopFlight <= 3 
                ? "The memories are fresh, and fans dream of a swift return."
                : yearsAwayFromTopFlight <= 8 
                ? "Older supporters still remember the glory days, hoping to see them return."
                : yearsAwayFromTopFlight <= 15
                ? "A generation has grown up without seeing them at the top, though the legend endures."
                : "For younger fans, the glory years are history lessons, but the name still carries weight.";
            
            return {
                tier: 'Fallen Giant',
                description: `Once among the elite with ${continentalText || `${domesticTitles} league titles`}, ${club.name} now finds themselves in Tier ${currentTier}. ${fadeText}`,
                color: 'text-amber-700',
                bg: 'bg-gradient-to-r from-amber-50 to-orange-50'
            };
        }
        
        // FADING FORCE - was established, now lower leagues
        if (isFadingForce) {
            const fadeText = yearsAwayFromTopFlight <= 5 
                ? "Still well-remembered, they battle to reclaim their place."
                : yearsAwayFromTopFlight <= 12
                ? "The top flight feels increasingly distant, but hope remains."
                : "Once a familiar name in the top division, now a fading memory for many.";
            
            return {
                tier: 'Fading Force',
                description: `${club.name} spent ${topFlightSeasons} seasons in the top flight${domesticTitles > 0 ? ` and won ${domesticTitles} title${domesticTitles !== 1 ? 's' : ''}` : ''}, but now compete in Tier ${currentTier}. ${fadeText}`,
                color: 'text-slate-600',
                bg: 'bg-gradient-to-r from-slate-100 to-slate-50'
            };
        }
        
        // CONTINENTAL GIANT - VCC winners or multiple continental titles
        if (vccTitles >= 1 || (vccTitles + cccTitles >= 2)) {
            const titleText = buildContinentalText();
            return {
                tier: 'Continental Giant',
                description: `A true continental powerhouse, ${club.name} is known across all of Volaria. With ${titleText}, they are among the elite clubs that have conquered the continent.`,
                color: 'text-amber-500',
                bg: 'bg-gradient-to-r from-amber-50 to-yellow-50'
            };
        }
        
        // CONTINENTAL CONTENDER - VCC finalist or regular VCC participant
        if (vccRunnerUp >= 1 || vccBest === 'Semi-final' || vccAppearances >= 5) {
            const achievementText = vccRunnerUp > 0 
                ? `reached ${vccRunnerUp} VCC final${vccRunnerUp !== 1 ? 's' : ''}`
                : vccBest === 'Semi-final' 
                ? 'reached the VCC semi-finals'
                : `made ${vccAppearances} VCC appearances`;
            return {
                tier: 'Continental Contender',
                description: `${club.name} has ${achievementText}, proving they belong among Europe's elite. They are a household name and regular continental competitors.`,
                color: 'text-yellow-600',
                bg: 'bg-gradient-to-r from-yellow-50 to-amber-50'
            };
        }
        
        // NATIONAL POWERHOUSE - multiple VCC appearances or strong domestic + some continental
        if (vccAppearances >= 3 || (weightedAppearances >= 4 && domesticTitles >= 3)) {
            const appText = vccAppearances > 0 
                ? `${vccAppearances} VCC appearance${vccAppearances !== 1 ? 's' : ''}${cccAppearances > 0 ? ` and ${cccAppearances} CCC` : ''}`
                : `${cccAppearances} CCC appearances`;
            return {
                tier: 'National Powerhouse',
                description: `One of the biggest clubs in their nation, ${club.name} is a household name domestically with ${appText} on the continental stage.`,
                color: 'text-emerald-500',
                bg: 'bg-gradient-to-r from-emerald-50 to-green-50'
            };
        }
        
        // MAJOR CLUB - CCC title, some VCC experience, or dominant domestically
        if (cccTitles >= 1 || vccAppearances >= 2 || cccRunnerUp >= 1 || (domesticTitles >= 5 && topFlightSeasons >= 15)) {
            const continentalNote = cccTitles > 0 ? 'They have lifted the CCC trophy.' 
                : vccAppearances > 0 ? `Their ${vccAppearances} VCC appearance${vccAppearances !== 1 ? 's' : ''} show they can compete at the highest level.`
                : cccRunnerUp > 0 ? 'They reached a CCC final.'
                : 'A respected name nationally.';
            return {
                tier: 'Major Club',
                description: `${club.name} is a major force with ${domesticTitles} league title${domesticTitles !== 1 ? 's' : ''}. ${continentalNote}`,
                color: 'text-indigo-500',
                bg: 'bg-gradient-to-r from-indigo-50 to-purple-50'
            };
        }
        
        // ESTABLISHED CLUB - league winner or long top-flight presence with VCC/cup
        if (domesticTitles >= 1 || (topFlightSeasons >= 10 && cupTitles >= 1) || vccAppearances >= 1) {
            const vccNote = vccAppearances > 0 ? ` They have appeared in the VCC${vccBest ? `, reaching the ${vccBest.toLowerCase()}` : ''}.` : '';
            return {
                tier: 'Established Club',
                description: `${club.name} is well-established with ${domesticTitles} league title${domesticTitles !== 1 ? 's' : ''} and ${topFlightSeasons} top-flight seasons.${vccNote} Recognized throughout the nation.`,
                color: 'text-blue-500',
                bg: 'bg-gradient-to-r from-blue-50 to-indigo-50'
            };
        }
        
        // AMBITIOUS CLUB - some top flight or CCC experience
        if (topFlightSeasons >= 5 || cccAppearances >= 1) {
            const cccNote = cccAppearances > 0 ? ` Their ${cccAppearances} CCC appearance${cccAppearances !== 1 ? 's' : ''}${cccBest ? ` (best: ${cccBest.toLowerCase()})` : ''} hint at bigger things to come.` : '';
            return {
                tier: 'Ambitious Club',
                description: `A club with ${topFlightSeasons} top-flight season${topFlightSeasons !== 1 ? 's' : ''} and ambitions to climb higher, ${club.name} is known regionally.${cccNote}`,
                color: 'text-purple-500',
                bg: 'bg-purple-50'
            };
        }
        
        // RISING CLUB - tasted top flight or long history
        if (topFlightSeasons >= 1 || totalSeasons >= 10) {
            const topFlightText = topFlightSeasons >= 1 
                ? 'has tasted top-flight football and is building towards becoming an established force' 
                : 'is steadily building their reputation through the divisions';
            return {
                tier: 'Rising Club',
                description: `${club.name} ${topFlightText}. Well-known locally and growing their reputation.`,
                color: 'text-cyan-500',
                bg: 'bg-cyan-50'
            };
        }
        
        // LOCAL CLUB
        if (totalSeasons >= 5) {
            return {
                tier: 'Local Club',
                description: `A community club with loyal support, ${club.name} represents grassroots football. The pride of ${club.settlement || club.district || club.region || 'their town'}.`,
                color: 'text-slate-500',
                bg: 'bg-slate-50'
            };
        }
        
        // NEWCOMER
        return {
            tier: 'Newcomer',
            description: `${club.name} is a newer addition to organized football, still building their history. Every legendary club started somewhere.`,
            color: 'text-green-500',
            bg: 'bg-green-50'
        };
    };

    const clubStature = calculateClubStature();

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

    // Back-to-back lower league titles
    const lowerLeagueTitles = sortedSeasons.filter(s => s.status === 'champion' && getLeagueTier(s.league_id) > 1);
    for (let i = 1; i < lowerLeagueTitles.length; i++) {
        const prevYear = lowerLeagueTitles[i - 1].year;
        const currYear = lowerLeagueTitles[i].year;
        if (currYear.split('-')[0] === (parseInt(prevYear.split('-')[0]) + 1).toString()) {
            narratives.push({
                icon: Trophy,
                color: 'text-emerald-500',
                bg: 'bg-emerald-50',
                title: 'Lower League Dominance',
                text: `Won back-to-back lower league titles in ${prevYear} and ${currYear}, storming through the divisions.`
            });
            break;
        }
    }

    // Multiple lower league titles in short period (3+ in 5 years)
    if (lowerLeagueTitles.length >= 3) {
        for (let i = 2; i < lowerLeagueTitles.length; i++) {
            const startYear = parseInt(lowerLeagueTitles[i - 2].year.split('-')[0]);
            const endYear = parseInt(lowerLeagueTitles[i].year.split('-')[0]);
            if (endYear - startYear <= 5) {
                narratives.push({
                    icon: Flame,
                    color: 'text-amber-600',
                    bg: 'bg-amber-50',
                    title: 'Promotion Machine',
                    text: `Won 3 lower league titles in just ${endYear - startYear + 1} seasons - an unstoppable rise through the pyramid.`
                });
                break;
            }
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

    // Multiple promotions in short period (3+ in 5 years)
    if (promotions.length >= 3) {
        for (let i = 2; i < promotions.length; i++) {
            const startYear = parseInt(promotions[i - 2].year.split('-')[0]);
            const endYear = parseInt(promotions[i].year.split('-')[0]);
            if (endYear - startYear <= 5) {
                narratives.push({
                    icon: TrendingUp,
                    color: 'text-green-700',
                    bg: 'bg-green-100',
                    title: 'Meteoric Rise',
                    text: `3 promotions in just ${endYear - startYear + 1} seasons - a club climbing the pyramid at breakneck speed.`
                });
                break;
            }
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

    // Multiple relegations in short period (3+ in 5 years)
    if (relegations.length >= 3) {
        for (let i = 2; i < relegations.length; i++) {
            const startYear = parseInt(relegations[i - 2].year.split('-')[0]);
            const endYear = parseInt(relegations[i].year.split('-')[0]);
            if (endYear - startYear <= 5) {
                narratives.push({
                    icon: TrendingDown,
                    color: 'text-red-700',
                    bg: 'bg-red-100',
                    title: 'Complete Collapse',
                    text: `3 relegations in just ${endYear - startYear + 1} seasons - a club in total freefall through the pyramid.`
                });
                break;
            }
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

    // Remarkable season after promotion (high finish relative to league size)
    for (let i = 1; i < sortedSeasons.length; i++) {
        if (sortedSeasons[i - 1].status === 'promoted' && sortedSeasons[i].status !== 'champion') {
            const leagueSize = sortedSeasons[i].played ? Math.round((sortedSeasons[i].played / 2) + 1) : null;
            const position = sortedSeasons[i].position;
            
            if (leagueSize && position) {
                const topHalf = position <= Math.ceil(leagueSize / 2);
                const topQuarter = position <= Math.ceil(leagueSize / 4);
                const topThird = position <= Math.ceil(leagueSize / 3);
                
                if (topQuarter && position <= 3) {
                    narratives.push({
                        icon: TrendingUp,
                        color: 'text-emerald-600',
                        bg: 'bg-emerald-50',
                        title: 'Sensational First Season',
                        text: `Finished ${position === 2 ? '2nd' : '3rd'} in ${sortedSeasons[i].year} immediately after promotion - an incredible debut.`
                    });
                    break;
                } else if (topQuarter) {
                    narratives.push({
                        icon: TrendingUp,
                        color: 'text-green-600',
                        bg: 'bg-green-50',
                        title: 'Outstanding First Season',
                        text: `Finished ${position}${position === 1 ? 'st' : position === 2 ? 'nd' : position === 3 ? 'rd' : 'th'} out of ${leagueSize} in ${sortedSeasons[i].year} straight after promotion.`
                    });
                    break;
                } else if (topThird && leagueSize >= 12) {
                    narratives.push({
                        icon: TrendingUp,
                        color: 'text-green-500',
                        bg: 'bg-green-50',
                        title: 'Impressive First Season',
                        text: `Finished ${position}${position === 1 ? 'st' : position === 2 ? 'nd' : position === 3 ? 'rd' : 'th'} of ${leagueSize} in ${sortedSeasons[i].year} after promotion - a strong debut.`
                    });
                    break;
                }
            }
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

    // Promoted via playoffs - only count actual playoff winners
    const playoffPromotions = sortedSeasons.filter(s => s.status === 'playoff_winner');
    if (playoffPromotions.length > 0) {
        narratives.push({
            icon: Award,
            color: 'text-blue-500',
            bg: 'bg-blue-50',
            title: 'Playoff Specialists',
            text: `Earned promotion via the playoffs ${playoffPromotions.length} time${playoffPromotions.length > 1 ? 's' : ''} - thriving under pressure.`
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

    // Domestic Cup success - check runner-up count as a proxy for "Final" best finish
    if (club.domestic_cup_titles > 0) {
        narratives.push({
            icon: Trophy,
            color: 'text-amber-500',
            bg: 'bg-amber-50',
            title: 'Cup Kings',
            text: `Won ${club.domestic_cup_titles} domestic cup title${club.domestic_cup_titles > 1 ? 's' : ''}${club.domestic_cup_title_years ? ` (${club.domestic_cup_title_years})` : ''}.`
        });
    } else if (club.domestic_cup_best_finish === 'Final' || club.domestic_cup_runner_up > 0) {
        narratives.push({
            icon: Shield,
            color: 'text-amber-400',
            bg: 'bg-amber-50',
            title: 'Cup Final Heartbreak',
            text: club.domestic_cup_runner_up > 1 
                ? `Reached ${club.domestic_cup_runner_up} cup finals without winning - the wait continues.`
                : `Reached the domestic cup final${club.domestic_cup_best_finish_year ? ` in ${club.domestic_cup_best_finish_year}` : ''}, falling at the last hurdle.`
        });
    } else if (club.domestic_cup_best_finish === 'Semi-final') {
        narratives.push({
            icon: Target,
            color: 'text-blue-500',
            bg: 'bg-blue-50',
            title: 'Cup Semi-Finalists',
            text: `Best cup run ended at the semi-final stage${club.domestic_cup_best_finish_year ? ` in ${club.domestic_cup_best_finish_year}` : ''}.`
        });
    } else if (club.domestic_cup_best_finish === 'Quarter-final') {
        narratives.push({
            icon: Target,
            color: 'text-blue-400',
            bg: 'bg-blue-50',
            title: 'Cup Quarter-Finalists',
            text: `Best cup run reached the quarter-finals${club.domestic_cup_best_finish_year ? ` in ${club.domestic_cup_best_finish_year}` : ''}.`
        });
    } else if (club.domestic_cup_best_finish && club.domestic_cup_best_finish !== 'Winner' && club.domestic_cup_best_finish !== 'Final') {
        narratives.push({
            icon: Award,
            color: 'text-slate-500',
            bg: 'bg-slate-50',
            title: 'Cup Competitors',
            text: `Best domestic cup performance: ${club.domestic_cup_best_finish}${club.domestic_cup_best_finish_year ? ` (${club.domestic_cup_best_finish_year})` : ''}.`
        });
    }

    // Domestic cup runner-up
    if (club.domestic_cup_runner_up >= 2) {
        narratives.push({
            icon: Award,
            color: 'text-slate-500',
            bg: 'bg-slate-50',
            title: 'Cup Final Veterans',
            text: `Reached ${club.domestic_cup_runner_up} cup finals without winning - the heartbreak continues.`
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

    // Domestic Double (league + cup in same year)
    if (club.league_titles > 0 && club.domestic_cup_titles > 0 && club.title_years && club.domestic_cup_title_years) {
        const leagueYears = club.title_years.split(',').map(y => y.trim());
        const cupYears = club.domestic_cup_title_years.split(',').map(y => y.trim());
        const doubleYears = leagueYears.filter(y => cupYears.includes(y));
        if (doubleYears.length > 0) {
            narratives.push({
                icon: Award,
                color: 'text-yellow-600',
                bg: 'bg-yellow-100',
                title: doubleYears.length > 1 ? 'Serial Double Winners' : 'The Double',
                text: doubleYears.length > 1 
                    ? `Won the domestic double ${doubleYears.length} times (${doubleYears.join(', ')}) - league and cup in the same season.`
                    : `Achieved the prestigious domestic double in ${doubleYears[0]}, winning both league and cup.`
            });
        }
    }

    // Treble (league + cup + continental)
    if (club.league_titles > 0 && club.domestic_cup_titles > 0 && (club.vcc_titles > 0 || club.ccc_titles > 0)) {
        const leagueYears = club.title_years?.split(',').map(y => y.trim()) || [];
        const cupYears = club.domestic_cup_title_years?.split(',').map(y => y.trim()) || [];
        const vccYears = club.vcc_title_years?.split(',').map(y => y.trim()) || [];
        const cccYears = club.ccc_title_years?.split(',').map(y => y.trim()) || [];
        const continentalYears = [...vccYears, ...cccYears];
        
        const trebleYears = leagueYears.filter(y => cupYears.includes(y) && continentalYears.includes(y));
        if (trebleYears.length > 0) {
            narratives.push({
                icon: Star,
                color: 'text-amber-600',
                bg: 'bg-gradient-to-r from-amber-100 to-yellow-100',
                title: 'The Treble',
                text: `Achieved the legendary treble in ${trebleYears.join(', ')} - league, cup, and continental glory in one season.`
            });
        }
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

    // League and Cup double without treble
    if (club.league_titles > 0 && club.domestic_cup_titles > 0 && !(club.vcc_titles > 0 || club.ccc_titles > 0)) {
        narratives.push({
            icon: Trophy,
            color: 'text-amber-500',
            bg: 'bg-amber-50',
            title: 'Domestic Dominance',
            text: `Won both league (${club.league_titles}) and cup (${club.domestic_cup_titles}) titles domestically.`
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

    // Founding narrative with cultural/linguistic context
    if (club.founded_year || club.name) {
        const name = club.name || '';
        const foundedYear = club.founded_year;
        const age = foundedYear ? new Date().getFullYear() - foundedYear : null;
        
        // Analyze the club name for cultural/linguistic origins
        let foundingNarrative = null;
        
        // Germanic/Nordic patterns
        if (/^(FK|IF|BK|SK|IK|FC)\s/i.test(name) || /\s(FK|IF|BK|SK|IK)$/i.test(name)) {
            const prefix = name.match(/^(FK|IF|BK|SK|IK|FC)/i)?.[0]?.toUpperCase();
            const meanings = {
                'FK': 'Fotbollsklubb (Football Club)',
                'IF': 'Idrottsförening (Sports Association)',
                'BK': 'Bollklubb (Ball Club)',
                'SK': 'Sportklubb (Sports Club)',
                'IK': 'Idrottsklubb (Sports Club)',
                'FC': 'Football Club'
            };
            foundingNarrative = {
                icon: BookOpen,
                color: 'text-blue-600',
                bg: 'bg-blue-50',
                title: 'Nordic Traditions',
                text: foundedYear 
                    ? `Founded in ${foundedYear} following Nordic sporting traditions. ${prefix ? `The prefix "${prefix}" stands for ${meanings[prefix] || 'a sporting organization'}.` : ''}`
                    : `A club rooted in Nordic sporting heritage, following traditional naming conventions.`
            };
        }
        // Celtic/Gaelic patterns
        else if (/Celtic|Gaelic|Hibernian|Shamrock|Harps|Rovers|Wanderers|Athletic/i.test(name)) {
            const type = /Celtic|Gaelic|Hibernian|Shamrock|Harps/i.test(name) ? 'Celtic' : 'British Isles';
            foundingNarrative = {
                icon: BookOpen,
                color: 'text-green-600',
                bg: 'bg-green-50',
                title: type === 'Celtic' ? 'Celtic Heritage' : 'British Football Roots',
                text: foundedYear
                    ? `Established in ${foundedYear}, the club name reflects ${type === 'Celtic' ? 'proud Celtic and Irish cultural roots' : 'the wandering spirit of early British football clubs'}.`
                    : `The name evokes ${type === 'Celtic' ? 'Celtic identity and cultural pride' : 'the adventurous nature of pioneering football clubs'}.`
            };
        }
        // Spanish/Latin patterns
        else if (/^(Real|Atlético|Deportivo|Club|CF|CD|UD|SD)\s/i.test(name) || /\sFC$|Unidos?$/i.test(name)) {
            const hasReal = /Real/i.test(name);
            const hasAtletico = /Atlético|Athletic/i.test(name);
            foundingNarrative = {
                icon: BookOpen,
                color: 'text-red-600',
                bg: 'bg-red-50',
                title: hasReal ? 'Royal Patronage' : 'Latin Football Culture',
                text: foundedYear
                    ? `Founded in ${foundedYear}. ${hasReal ? 'The "Real" prefix denotes royal patronage and prestige.' : hasAtletico ? 'The "Atlético" name reflects athletic sporting origins.' : 'Named in the Latin football tradition.'}`
                    : `${hasReal ? 'A club bearing the royal "Real" title, signifying prestige and tradition.' : 'Named following Latin American and Iberian football conventions.'}`
            };
        }
        // Eastern European patterns
        else if (/^(Dynamo|Dinamo|Spartak|Lokomotiv|CSKA|Torpedo|Shakhtar|Zenit|Partizan)/i.test(name)) {
            const origin = name.match(/^(Dynamo|Dinamo|Spartak|Lokomotiv|CSKA|Torpedo|Shakhtar|Zenit|Partizan)/i)?.[0];
            const meanings = {
                'Dynamo': 'associated with power and electricity workers',
                'Dinamo': 'associated with power and electricity workers',
                'Spartak': 'named after Spartacus, representing workers and sport',
                'Lokomotiv': 'representing railway workers',
                'CSKA': 'the Central Sports Club of the Army',
                'Torpedo': 'representing factory and automobile workers',
                'Shakhtar': 'meaning "miner" in Ukrainian',
                'Zenit': 'meaning "zenith" or peak',
                'Partizan': 'representing resistance fighters'
            };
            foundingNarrative = {
                icon: BookOpen,
                color: 'text-red-700',
                bg: 'bg-red-50',
                title: 'Eastern Bloc Heritage',
                text: foundedYear
                    ? `Founded in ${foundedYear}, ${meanings[origin] ? `the name "${origin}" is ${meanings[origin]}` : 'carrying Eastern European football traditions'}.`
                    : `The name reflects Eastern European sporting culture, ${meanings[origin] ? meanings[origin] : 'with deep historical roots'}.`
            };
        }
        // Germanic patterns
        else if (/^(Borussia|Bayern|Eintracht|Fortuna|Schalke|Werder|Hamburger|VfB|VfL|TSV|1\.\s?FC)/i.test(name)) {
            const hasBorussia = /Borussia/i.test(name);
            const hasEintracht = /Eintracht/i.test(name);
            foundingNarrative = {
                icon: BookOpen,
                color: 'text-slate-700',
                bg: 'bg-slate-100',
                title: 'Germanic Tradition',
                text: foundedYear
                    ? `Established in ${foundedYear}. ${hasBorussia ? '"Borussia" is the Latin name for Prussia, reflecting regional pride.' : hasEintracht ? '"Eintracht" means "unity" or "harmony" in German.' : 'Following German football naming conventions.'}`
                    : `A club with Germanic roots${hasBorussia ? ', with "Borussia" representing Prussian heritage' : hasEintracht ? ', with "Eintracht" symbolizing unity' : ''}.`
            };
        }
        // Italian patterns
        else if (/^(AC|AS|SS|US|Inter|Juventus|Lazio|Roma|Milan|Napoli|Fiorentina)/i.test(name) || /1\d{3}$/i.test(name)) {
            const hasInter = /Inter/i.test(name);
            const hasJuventus = /Juventus/i.test(name);
            const yearInName = name.match(/1\d{3}$/)?.[0];
            foundingNarrative = {
                icon: BookOpen,
                color: 'text-emerald-700',
                bg: 'bg-emerald-50',
                title: 'Italian Football Culture',
                text: foundedYear
                    ? `Founded in ${foundedYear}. ${hasInter ? '"Inter" represents internationalism and inclusivity.' : hasJuventus ? '"Juventus" means "youth" in Latin, symbolizing vitality.' : yearInName ? `The year ${yearInName} in the name marks the founding date.` : 'Following Italian calcio traditions.'}`
                    : `A club rooted in Italian football culture${hasJuventus ? ', with "Juventus" meaning "youth"' : ''}.`
            };
        }
        // Dutch patterns
        else if (/^(Ajax|PSV|Feyenoord|AZ|SC|Willem|Vitesse|Twente|Groningen)/i.test(name)) {
            const hasAjax = /Ajax/i.test(name);
            foundingNarrative = {
                icon: BookOpen,
                color: 'text-orange-600',
                bg: 'bg-orange-50',
                title: 'Dutch Football Heritage',
                text: foundedYear
                    ? `Founded in ${foundedYear}. ${hasAjax ? 'Named after the Greek hero Ajax, symbolizing strength and bravery.' : 'Part of the rich Dutch footballing tradition.'}`
                    : `${hasAjax ? 'Named after the legendary Greek warrior Ajax.' : 'A club born from Dutch footballing culture.'}`
            };
        }
        // Worker/Industry clubs
        else if (/United|Town|City|County|Borough|Works|Athletic|Albion|Rangers|Rovers/i.test(name)) {
            const type = /United/i.test(name) ? 'United' : 
                        /Town|City|County|Borough/i.test(name) ? 'Civic' :
                        /Works/i.test(name) ? 'Industrial' :
                        /Rangers|Rovers/i.test(name) ? 'Pioneer' : 'Athletic';
            const descriptions = {
                'United': 'formed from a merger or representing unity in the community',
                'Civic': 'representing the pride of their town or city',
                'Industrial': 'originating from factory or workplace teams',
                'Pioneer': 'embodying the pioneering spirit of early football',
                'Athletic': 'emphasizing the athletic and sporting nature of the club'
            };
            foundingNarrative = {
                icon: BookOpen,
                color: 'text-indigo-600',
                bg: 'bg-indigo-50',
                title: type === 'Industrial' ? 'Working Class Roots' : 'Community Foundation',
                text: foundedYear
                    ? `Established in ${foundedYear}, ${descriptions[type]}.`
                    : `A club ${descriptions[type]}, reflecting grassroots football traditions.`
            };
        }
        // Portuguese/Brazilian patterns
        else if (/^(Sporting|Benfica|Porto|Flamengo|Fluminense|Corinthians|Palmeiras|Santos|Grêmio|Cruzeiro|Botafogo)/i.test(name) || /Esporte\s?Clube|Sport\s?Club/i.test(name)) {
            const hasSporting = /Sporting/i.test(name);
            foundingNarrative = {
                icon: BookOpen,
                color: 'text-green-700',
                bg: 'bg-green-50',
                title: 'Lusophone Football',
                text: foundedYear
                    ? `Founded in ${foundedYear} in the Portuguese/Brazilian football tradition. ${hasSporting ? '"Sporting" reflects the club\'s multi-sport origins.' : ''}`
                    : `Rooted in Lusophone football culture, following naming traditions from Portugal and Brazil.`
            };
        }
        // Default founding story based on age
        else if (age) {
            if (age >= 100) {
                foundingNarrative = {
                    icon: BookOpen,
                    color: 'text-amber-700',
                    bg: 'bg-amber-50',
                    title: 'Century of History',
                    text: `Founded in ${foundedYear}, the club has over a century of footballing tradition, making them one of the oldest in the region.`
                };
            } else if (age >= 75) {
                foundingNarrative = {
                    icon: BookOpen,
                    color: 'text-amber-600',
                    bg: 'bg-amber-50',
                    title: 'Historic Foundation',
                    text: `Established in ${foundedYear}, the club has ${age} years of history and tradition behind them.`
                };
            } else if (age >= 50) {
                foundingNarrative = {
                    icon: BookOpen,
                    color: 'text-slate-600',
                    bg: 'bg-slate-50',
                    title: 'Half Century Club',
                    text: `Founded in ${foundedYear}, with ${age} years of building their legacy.`
                };
            } else if (age >= 25) {
                foundingNarrative = {
                    icon: BookOpen,
                    color: 'text-blue-500',
                    bg: 'bg-blue-50',
                    title: 'Modern Era Club',
                    text: `A relatively young club, established in ${foundedYear}, still writing their story.`
                };
            } else if (age >= 10) {
                foundingNarrative = {
                    icon: BookOpen,
                    color: 'text-emerald-500',
                    bg: 'bg-emerald-50',
                    title: 'Rising Force',
                    text: `Founded just ${age} years ago in ${foundedYear}, a new chapter in football history.`
                };
            }
        }
        
        if (foundingNarrative) {
            narratives.push(foundingNarrative);
        }
    }

    // Longest stint in a tier narrative
    if (sortedSeasons.length >= 3) {
        const tierCounts = {};
        sortedSeasons.forEach(s => {
            const tier = getLeagueTier(s.league_id);
            if (tier) {
                tierCounts[tier] = (tierCounts[tier] || 0) + 1;
            }
        });

        const longestTier = Object.entries(tierCounts).reduce((max, [tier, count]) => {
            return count > max.count ? { tier: parseInt(tier), count } : max;
        }, { tier: 0, count: 0 });

        if (longestTier.count >= 3) {
            const tierName = longestTier.tier === 1 ? 'top flight' : `Tier ${longestTier.tier}`;
            const percentage = Math.round((longestTier.count / sortedSeasons.length) * 100);
            narratives.push({
                icon: Calendar,
                color: longestTier.tier === 1 ? 'text-amber-600' : 'text-blue-500',
                bg: longestTier.tier === 1 ? 'bg-amber-50' : 'bg-blue-50',
                title: longestTier.tier === 1 ? 'Top Flight Stalwarts' : `Tier ${longestTier.tier} Specialists`,
                text: `Spent ${longestTier.count} seasons in the ${tierName} (${percentage}% of their recorded history).`
            });
        }
    }

    // Long absence from top flight narratives
    const topFlightSeasonsList = sortedSeasons.filter(s => {
        const tier = s.tier || getLeagueTier(s.league_id);
        return tier === 1;
    });
    const currentLeague = leagues.find(l => l.id === club.league_id);
    const currentTier = currentLeague?.tier || 1;
    
    if (topFlightSeasonsList.length > 0 && currentTier > 1) {
        const lastTopFlightSeason = [...topFlightSeasonsList].sort((a, b) => b.year.localeCompare(a.year))[0];
        const seasonsAway = sortedSeasons.filter(s => {
            const tier = s.tier || getLeagueTier(s.league_id);
            return s.year > lastTopFlightSeason.year && tier > 1;
        }).length;
        
        if (seasonsAway >= 30) {
            narratives.push({
                icon: Clock,
                color: 'text-slate-600',
                bg: 'bg-slate-100',
                title: 'Lost Generation',
                text: `${seasonsAway} seasons since last gracing the top flight (${lastTopFlightSeason.year}). A whole generation has grown up without seeing them at the highest level.`
            });
        } else if (seasonsAway >= 20) {
            narratives.push({
                icon: Clock,
                color: 'text-slate-500',
                bg: 'bg-slate-50',
                title: 'The Long Road Back',
                text: `${seasonsAway} years away from the top flight since ${lastTopFlightSeason.year}. The memories are fading, but the dream remains.`
            });
        } else if (seasonsAway >= 10) {
            narratives.push({
                icon: Clock,
                color: 'text-orange-600',
                bg: 'bg-orange-50',
                title: 'Top Flight Absence',
                text: `${seasonsAway} seasons since their last top-flight campaign (${lastTopFlightSeason.year}). Fans yearn for a return to the elite.`
            });
        } else if (seasonsAway >= 5) {
            narratives.push({
                icon: Clock,
                color: 'text-amber-600',
                bg: 'bg-amber-50',
                title: 'Rebuilding Years',
                text: `${seasonsAway} seasons away from the top flight since ${lastTopFlightSeason.year}. Working to reclaim their place among the elite.`
            });
        }
        
        // Return to top flight after long absence
        if (currentTier === 1 && seasonsAway === 0) {
            const yearsInWilderness = topFlightSeasonsList.length > 1 ? 
                sortedSeasons.filter(s => {
                    const year = s.year;
                    const secondLastTopFlight = [...topFlightSeasonsList].sort((a, b) => b.year.localeCompare(a.year))[1];
                    return secondLastTopFlight && year > secondLastTopFlight.year && year < lastTopFlightSeason.year && getLeagueTier(s.league_id) > 1;
                }).length : 0;
            
            if (yearsInWilderness >= 15) {
                narratives.push({
                    icon: Star,
                    color: 'text-emerald-700',
                    bg: 'bg-emerald-100',
                    title: 'The Great Return',
                    text: `Returned to the top flight in ${lastTopFlightSeason.year} after ${yearsInWilderness} seasons away. A triumphant homecoming after years in the wilderness.`
                });
            } else if (yearsInWilderness >= 10) {
                narratives.push({
                    icon: Star,
                    color: 'text-emerald-600',
                    bg: 'bg-emerald-100',
                    title: 'Back Where They Belong',
                    text: `Returned to the top flight in ${lastTopFlightSeason.year} after ${yearsInWilderness} seasons in the wilderness. The long wait is over.`
                });
            } else if (yearsInWilderness >= 5) {
                narratives.push({
                    icon: TrendingUp,
                    color: 'text-green-600',
                    bg: 'bg-green-50',
                    title: 'Return to the Elite',
                    text: `Back in the top flight as of ${lastTopFlightSeason.year} after ${yearsInWilderness} seasons away.`
                });
            }
        }
    }

    // Brief top flight appearance (only 1-3 seasons total)
    if (topFlightSeasonsList.length >= 1 && topFlightSeasonsList.length <= 3 && currentTier > 1 && sortedSeasons.length >= 10) {
        const years = topFlightSeasonsList.map(s => s.year).sort().join(', ');
        narratives.push({
            icon: Star,
            color: 'text-blue-500',
            bg: 'bg-blue-50',
            title: 'Brief Taste of Glory',
            text: `Had ${topFlightSeasonsList.length} fleeting season${topFlightSeasonsList.length > 1 ? 's' : ''} in the top flight (${years}), a proud memory in the club's history.`
        });
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

        // Return to TFA after exile
        if (mostRecentTier <= 4 && tfaSeasons.length > 0 && nonTfaSeasons.length > 0) {
            const lastNonTfaSeason = [...nonTfaSeasons].sort((a, b) => b.year.localeCompare(a.year))[0];
            const returnToTfaSeason = [...tfaSeasons]
                .filter(s => s.year > lastNonTfaSeason.year)
                .sort((a, b) => a.year.localeCompare(b.year))[0];
            
            if (returnToTfaSeason) {
                const yearsAway = sortedSeasons.filter(s => 
                    s.year >= lastNonTfaSeason.year && 
                    s.year < returnToTfaSeason.year &&
                    getLeagueTier(s.league_id) > 4
                ).length;
                
                if (yearsAway >= 10) {
                    narratives.push({
                        icon: Star,
                        color: 'text-emerald-700',
                        bg: 'bg-emerald-100',
                        title: 'Back in the TFA',
                        text: `Rejoined the TFA Football League in ${returnToTfaSeason.year} after ${yearsAway} seasons in non-league football. A remarkable comeback.`
                    });
                } else if (yearsAway >= 5) {
                    narratives.push({
                        icon: Star,
                        color: 'text-emerald-600',
                        bg: 'bg-emerald-50',
                        title: 'TFA Redemption',
                        text: `Returned to the TFA Football League in ${returnToTfaSeason.year} after ${yearsAway} seasons outside the system.`
                    });
                }
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

    // Recent decade rise/fall narratives
    const recentSeasons = sortedSeasons.filter(s => {
        const yearStr = s.year.split('-')[0];
        const year = parseInt(yearStr);
        return year >= new Date().getFullYear() - 10;
    });

    if (recentSeasons.length >= 3) {
        const recentPromotions = recentSeasons.filter(s => s.status === 'promoted').length;
        const recentRelegations = recentSeasons.filter(s => s.status === 'relegated').length;

        if (recentPromotions >= 3) {
            narratives.push({
                icon: TrendingUp,
                color: 'text-green-600',
                bg: 'bg-green-50',
                title: 'Rapid Rise',
                text: `${recentPromotions} promotions in the last decade - a club on the up with serious momentum.`
            });
        } else if (recentPromotions === 2) {
            narratives.push({
                icon: TrendingUp,
                color: 'text-green-500',
                bg: 'bg-green-50',
                title: 'Climbing the Ladder',
                text: `Two promotions in the last decade, steadily working their way up the pyramid.`
            });
        }

        if (recentRelegations >= 3) {
            narratives.push({
                icon: TrendingDown,
                color: 'text-red-600',
                bg: 'bg-red-50',
                title: 'Steep Decline',
                text: `${recentRelegations} relegations in the last decade - a turbulent period for the club.`
            });
        } else if (recentRelegations === 2) {
            narratives.push({
                icon: TrendingDown,
                color: 'text-red-500',
                bg: 'bg-red-50',
                title: 'Troubled Times',
                text: `Two relegations in the last decade, struggling to find stability.`
            });
        }
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

    // Location-based narratives
    if (club.settlement) {
        const sameSettlementClubs = allClubs.filter(c => c.id !== club.id && c.settlement === club.settlement);
        if (sameSettlementClubs.length >= 2) {
            narratives.push({
                icon: Shield,
                color: 'text-purple-500',
                bg: 'bg-purple-50',
                title: 'Local Football Hub',
                text: `One of ${sameSettlementClubs.length + 1} clubs in ${club.settlement}, making it a footballing hotbed.`
            });
        } else if (sameSettlementClubs.length === 1) {
            narratives.push({
                icon: Shield,
                color: 'text-purple-500',
                bg: 'bg-purple-50',
                title: 'Town Rivals',
                text: `Shares ${club.settlement} with ${sameSettlementClubs[0].name} - a natural local rivalry.`
            });
        }
    }

    if (club.district && !club.settlement) {
        const sameDistrictClubs = allClubs.filter(c => c.id !== club.id && c.district === club.district);
        if (sameDistrictClubs.length >= 3) {
            narratives.push({
                icon: Shield,
                color: 'text-blue-500',
                bg: 'bg-blue-50',
                title: 'District Football',
                text: `Part of a strong footballing tradition in ${club.district} with ${sameDistrictClubs.length} other clubs.`
            });
        }
    }

    if (club.region) {
        const sameRegionClubs = allClubs.filter(c => c.id !== club.id && c.region === club.region);
        const regionChampions = sameRegionClubs.filter(c => (c.league_titles || 0) > 0);
        if ((club.league_titles || 0) > 0 && regionChampions.length === 0) {
            narratives.push({
                icon: Trophy,
                color: 'text-amber-600',
                bg: 'bg-amber-50',
                title: 'Regional Pride',
                text: `The only club from ${club.region} to have won a top-flight title.`
            });
        }
    }

    // Manual rivalries narrative
    if (club.rival_club_ids && club.rival_club_ids.length > 0) {
        const rivalNames = club.rival_club_ids
            .map(id => allClubs.find(c => c.id === id)?.name)
            .filter(Boolean)
            .slice(0, 3);
        if (rivalNames.length > 0) {
            narratives.push({
                icon: Flame,
                color: 'text-red-500',
                bg: 'bg-red-50',
                title: 'Fierce Rivalries',
                text: `Historic rivals include ${rivalNames.join(', ')}${club.rival_club_ids.length > 3 ? ` and ${club.rival_club_ids.length - 3} more` : ''}.`
            });
        }
    }

    // Dynamic rivalry detection from league tables
    if (allLeagueTables.length > 0 && sortedSeasons.length >= 3) {
        const clubSeasonsByYear = {};
        sortedSeasons.forEach(s => {
            clubSeasonsByYear[s.year] = s;
        });

        // Find clubs that frequently finish close (within 2 positions)
        const closeFinishCounts = {};
        // Find clubs that battle for titles together
        const titleRaceCounts = {};
        // Find clubs that battle relegation together
        const relegationBattleCounts = {};

        Object.keys(clubSeasonsByYear).forEach(year => {
            const clubSeason = clubSeasonsByYear[year];
            const leagueId = clubSeason.league_id;
            const yearTables = allLeagueTables.filter(t => t.year === year && t.league_id === leagueId);
            
            if (yearTables.length === 0) return;
            
            const leagueSize = yearTables.length;
            const clubPos = clubSeason.position;
            
            yearTables.forEach(t => {
                if (t.club_id === club.id || !t.club_name) return;
                const otherPos = t.position;
                const posDiff = Math.abs(clubPos - otherPos);
                
                // Close finishes (within 2 positions)
                if (posDiff <= 2 && posDiff > 0) {
                    closeFinishCounts[t.club_name] = (closeFinishCounts[t.club_name] || 0) + 1;
                }
                
                // Title race (both in top 3)
                if (clubPos <= 3 && otherPos <= 3) {
                    titleRaceCounts[t.club_name] = (titleRaceCounts[t.club_name] || 0) + 1;
                }
                
                // Relegation battle (both in bottom 3)
                if (clubPos >= leagueSize - 2 && otherPos >= leagueSize - 2) {
                    relegationBattleCounts[t.club_name] = (relegationBattleCounts[t.club_name] || 0) + 1;
                }
            });
        });

        // Find most frequent close finisher
        const sortedClose = Object.entries(closeFinishCounts).sort((a, b) => b[1] - a[1]);
        if (sortedClose.length > 0 && sortedClose[0][1] >= 3) {
            narratives.push({
                icon: Target,
                color: 'text-orange-500',
                bg: 'bg-orange-50',
                title: 'Competitive Rivalry',
                text: `Finished within 2 places of ${sortedClose[0][0]} in ${sortedClose[0][1]} seasons - a competitive rivalry.`
            });
        }

        // Title race rivals
        const sortedTitleRace = Object.entries(titleRaceCounts).sort((a, b) => b[1] - a[1]);
        if (sortedTitleRace.length > 0 && sortedTitleRace[0][1] >= 3) {
            narratives.push({
                icon: Trophy,
                color: 'text-amber-500',
                bg: 'bg-amber-50',
                title: 'Title Race Rivals',
                text: `Battled for the title with ${sortedTitleRace[0][0]} in ${sortedTitleRace[0][1]} seasons.`
            });
        }

        // Relegation battle companions
        const sortedRelegation = Object.entries(relegationBattleCounts).sort((a, b) => b[1] - a[1]);
        if (sortedRelegation.length > 0 && sortedRelegation[0][1] >= 2) {
            narratives.push({
                icon: TrendingDown,
                color: 'text-red-600',
                bg: 'bg-red-50',
                title: 'Survival Rivals',
                text: `Fought against relegation alongside ${sortedRelegation[0][0]} in ${sortedRelegation[0][1]} seasons.`
            });
        }
    }

    // Longest continuous spell in a tier
    if (sortedSeasons.length >= 5) {
        let longestSpell = { tier: 0, count: 0, startYear: '', endYear: '' };
        let currentSpell = { tier: 0, count: 0, startYear: '' };

        sortedSeasons.forEach((s, idx) => {
            const tier = getLeagueTier(s.league_id);
            if (tier === currentSpell.tier) {
                currentSpell.count++;
            } else {
                if (currentSpell.count > longestSpell.count) {
                    longestSpell = { ...currentSpell, endYear: sortedSeasons[idx - 1]?.year || '' };
                }
                currentSpell = { tier, count: 1, startYear: s.year };
            }
        });
        // Check final spell
        if (currentSpell.count > longestSpell.count) {
            longestSpell = { ...currentSpell, endYear: sortedSeasons[sortedSeasons.length - 1].year };
        }

        if (longestSpell.count >= 10) {
            const tierName = longestSpell.tier === 1 ? 'top flight' : `Tier ${longestSpell.tier}`;
            narratives.push({
                icon: Clock,
                color: longestSpell.tier === 1 ? 'text-amber-600' : 'text-blue-500',
                bg: longestSpell.tier === 1 ? 'bg-amber-50' : 'bg-blue-50',
                title: 'Long-Term Resident',
                text: `Spent ${longestSpell.count} consecutive seasons in the ${tierName} (${longestSpell.startYear} to ${longestSpell.endYear}).`
            });
        }
    }

    // Perennial strugglers - frequently bottom of lowest tier
    const lowestTierSeasons = sortedSeasons.filter(s => {
        const tier = getLeagueTier(s.league_id);
        const maxTier = Math.max(...leagues.map(l => l.tier || 1));
        return tier === maxTier && s.position;
    });
    
    if (lowestTierSeasons.length >= 3) {
        // Count bottom 3 finishes
        const bottomFinishes = lowestTierSeasons.filter(s => {
            const leagueSize = s.played ? Math.round((s.played / 2) + 1) : 12;
            return s.position >= leagueSize - 2;
        });
        const deadLastFinishes = lowestTierSeasons.filter(s => {
            const leagueSize = s.played ? Math.round((s.played / 2) + 1) : 12;
            return s.position === leagueSize;
        });
        
        if (deadLastFinishes.length >= 3) {
            narratives.push({
                icon: TrendingDown,
                color: 'text-red-700',
                bg: 'bg-red-100',
                title: 'Wooden Spoon Regulars',
                text: `Finished bottom of the lowest tier ${deadLastFinishes.length} times - a club that knows the taste of rock bottom all too well.`
            });
        } else if (deadLastFinishes.length >= 2) {
            narratives.push({
                icon: TrendingDown,
                color: 'text-red-600',
                bg: 'bg-red-50',
                title: 'Basement Dwellers',
                text: `Finished dead last in the pyramid ${deadLastFinishes.length} times. Nowhere left to fall.`
            });
        } else if (bottomFinishes.length >= 4) {
            narratives.push({
                icon: TrendingDown,
                color: 'text-orange-600',
                bg: 'bg-orange-50',
                title: 'Perennial Strugglers',
                text: `Finished in the bottom 3 of the lowest tier ${bottomFinishes.length} times - survival is always the aim.`
            });
        } else if (bottomFinishes.length >= 2) {
            narratives.push({
                icon: Shield,
                color: 'text-slate-500',
                bg: 'bg-slate-50',
                title: 'Fighting for Survival',
                text: `Multiple bottom-3 finishes in the lowest tier - a club that knows the relegation battle intimately.`
            });
        }
    }

    // Unbeaten narrative - high win rate in a season
    const bestSeason = sortedSeasons.reduce((best, s) => {
        if (s.played && s.played >= 10) {
            const winRate = s.won / s.played;
            if (!best || winRate > best.winRate) {
                return { ...s, winRate };
            }
        }
        return best;
    }, null);

    if (bestSeason && bestSeason.winRate >= 0.8) {
        narratives.push({
            icon: Flame,
            color: 'text-orange-500',
            bg: 'bg-orange-50',
            title: 'Dominant Season',
            text: `Won ${bestSeason.won} of ${bestSeason.played} matches (${Math.round(bestSeason.winRate * 100)}%) in ${bestSeason.year}.`
        });
    }

    // Immediate bounce-back after relegation
    for (let i = 1; i < sortedSeasons.length; i++) {
        if (sortedSeasons[i].status === 'promoted' && sortedSeasons[i - 1].status === 'relegated') {
            narratives.push({
                icon: TrendingUp,
                color: 'text-green-500',
                bg: 'bg-green-50',
                title: 'Immediate Bounce Back',
                text: `Bounced straight back in ${sortedSeasons[i].year} after relegation the previous season.`
            });
            break;
        }
    }

    // Season record-breaking narratives - check against all league tables
    if (allLeagueTables.length > 0 && sortedSeasons.length > 0) {
        // Group league tables by league for record comparisons
        const tablesByLeague = {};
        allLeagueTables.forEach(t => {
            if (!tablesByLeague[t.league_id]) tablesByLeague[t.league_id] = [];
            tablesByLeague[t.league_id].push(t);
        });

        sortedSeasons.forEach(season => {
            const leagueTables = tablesByLeague[season.league_id] || [];
            if (leagueTables.length < 5) return; // Need enough data for meaningful records
            
            const tier = getLeagueTier(season.league_id);
            const tierText = tier === 1 ? 'top-flight' : `Tier ${tier}`;
            const leagueName = getLeagueName(season.league_id);

            // Most points ever
            if (season.points) {
                const maxPoints = Math.max(...leagueTables.filter(t => t.points).map(t => t.points));
                if (season.points === maxPoints && season.points > 0) {
                    const prevRecord = leagueTables
                        .filter(t => t.year < season.year && t.points)
                        .sort((a, b) => b.points - a.points)[0];
                    if (!prevRecord || season.points > prevRecord.points) {
                        narratives.push({
                            icon: Star,
                            color: 'text-amber-500',
                            bg: 'bg-amber-50',
                            title: 'Record Points Haul',
                            text: `Set the ${tierText} record with ${season.points} points in ${season.year}${prevRecord ? ` (breaking ${prevRecord.club_name}'s ${prevRecord.points} from ${prevRecord.year})` : ''}.`
                        });
                    }
                }
            }

            // Most goals scored ever
            if (season.goals_for) {
                const maxGoals = Math.max(...leagueTables.filter(t => t.goals_for).map(t => t.goals_for));
                if (season.goals_for === maxGoals && season.goals_for > 0) {
                    const prevRecord = leagueTables
                        .filter(t => t.year < season.year && t.goals_for)
                        .sort((a, b) => b.goals_for - a.goals_for)[0];
                    if (!prevRecord || season.goals_for > prevRecord.goals_for) {
                        narratives.push({
                            icon: Flame,
                            color: 'text-red-500',
                            bg: 'bg-red-50',
                            title: 'Record Goals Scored',
                            text: `Netted a record ${season.goals_for} goals in ${season.year}${prevRecord ? ` (surpassing ${prevRecord.club_name}'s ${prevRecord.goals_for})` : ''}.`
                        });
                    }
                }
            }

            // Fewest goals conceded (champion/top 3 only - meaningful record)
            if (season.goals_against && season.position <= 3) {
                const topTeamRecords = leagueTables.filter(t => t.goals_against && t.position <= 3);
                const minConceded = Math.min(...topTeamRecords.map(t => t.goals_against));
                if (season.goals_against === minConceded && topTeamRecords.length >= 5) {
                    const prevRecord = topTeamRecords
                        .filter(t => t.year < season.year)
                        .sort((a, b) => a.goals_against - b.goals_against)[0];
                    if (!prevRecord || season.goals_against < prevRecord.goals_against) {
                        narratives.push({
                            icon: Shield,
                            color: 'text-emerald-500',
                            bg: 'bg-emerald-50',
                            title: 'Defensive Record',
                            text: `Conceded just ${season.goals_against} goals in ${season.year} - a ${tierText} record for a top-3 finish.`
                        });
                    }
                }
            }

            // Fewest losses (champion only)
            if (season.lost !== undefined && season.status === 'champion') {
                const champRecords = leagueTables.filter(t => t.status === 'champion' && t.lost !== undefined);
                const minLosses = Math.min(...champRecords.map(t => t.lost));
                if (season.lost === minLosses && champRecords.length >= 3) {
                    const prevRecord = champRecords
                        .filter(t => t.year < season.year)
                        .sort((a, b) => a.lost - b.lost)[0];
                    if (!prevRecord || season.lost < prevRecord.lost) {
                        const lossText = season.lost === 0 ? 'unbeaten' : `losing just ${season.lost} ${season.lost === 1 ? 'game' : 'games'}`;
                        narratives.push({
                            icon: Trophy,
                            color: 'text-yellow-500',
                            bg: 'bg-yellow-50',
                            title: season.lost === 0 ? 'Invincibles' : 'Record-Breaking Champions',
                            text: `Won the ${season.year} title ${lossText} - the best defensive record by a champion.`
                        });
                    }
                }
            }

            // Most wins in a season
            if (season.won) {
                const maxWins = Math.max(...leagueTables.filter(t => t.won).map(t => t.won));
                if (season.won === maxWins && season.won > 0) {
                    const prevRecord = leagueTables
                        .filter(t => t.year < season.year && t.won)
                        .sort((a, b) => b.won - a.won)[0];
                    if (!prevRecord || season.won > prevRecord.won) {
                        narratives.push({
                            icon: Zap,
                            color: 'text-purple-500',
                            bg: 'bg-purple-50',
                            title: 'Record Wins',
                            text: `Won ${season.won} matches in ${season.year} - a ${tierText} record.`
                        });
                    }
                }
            }

            // Best goal difference
            if (season.goal_difference) {
                const maxGD = Math.max(...leagueTables.filter(t => t.goal_difference).map(t => t.goal_difference));
                if (season.goal_difference === maxGD && season.goal_difference > 30) {
                    const prevRecord = leagueTables
                        .filter(t => t.year < season.year && t.goal_difference)
                        .sort((a, b) => b.goal_difference - a.goal_difference)[0];
                    if (!prevRecord || season.goal_difference > prevRecord.goal_difference) {
                        narratives.push({
                            icon: Target,
                            color: 'text-indigo-500',
                            bg: 'bg-indigo-50',
                            title: 'Record Goal Difference',
                            text: `Achieved a ${tierText} record goal difference of +${season.goal_difference} in ${season.year}.`
                        });
                    }
                }
            }

            // NEGATIVE RECORDS - only show if they've since improved or it's historic

            // Most goals conceded (bottom half teams)
            if (season.goals_against && season.position > 5) {
                const bottomTeams = leagueTables.filter(t => t.goals_against && t.position > 5);
                const maxConceded = Math.max(...bottomTeams.map(t => t.goals_against));
                if (season.goals_against === maxConceded && bottomTeams.length >= 10 && season.goals_against >= 60) {
                    const laterSeasons = sortedSeasons.filter(s => s.year > season.year);
                    const hasRecovered = laterSeasons.some(s => s.status === 'champion' || s.status === 'promoted');
                    if (hasRecovered) {
                        narratives.push({
                            icon: TrendingDown,
                            color: 'text-red-500',
                            bg: 'bg-red-50',
                            title: 'Dark Days',
                            text: `Conceded ${season.goals_against} goals in ${season.year} - a forgettable campaign they've since recovered from.`
                        });
                    }
                }
            }

            // Most losses by a relegated team
            if (season.lost && season.status === 'relegated') {
                const relegatedTeams = leagueTables.filter(t => t.status === 'relegated' && t.lost);
                const maxLosses = Math.max(...relegatedTeams.map(t => t.lost));
                if (season.lost === maxLosses && relegatedTeams.length >= 5 && season.lost >= 20) {
                    narratives.push({
                        icon: TrendingDown,
                        color: 'text-red-600',
                        bg: 'bg-red-100',
                        title: 'Forgettable Season',
                        text: `Suffered ${season.lost} defeats in ${season.year} - a record for a relegated side.`
                    });
                }
            }

            // Fewest points ever (only show if historic/recovered)
            if (season.points && season.points > 0) {
                const allPoints = leagueTables.filter(t => t.points && t.points > 0).map(t => t.points);
                const minPoints = Math.min(...allPoints);
                if (season.points === minPoints && allPoints.length >= 20 && season.points <= 15) {
                    const laterSeasons = sortedSeasons.filter(s => s.year > season.year);
                    const hasRecovered = laterSeasons.some(s => s.position <= 3);
                    if (hasRecovered || sortedSeasons.indexOf(season) < sortedSeasons.length - 5) {
                        narratives.push({
                            icon: Clock,
                            color: 'text-slate-500',
                            bg: 'bg-slate-100',
                            title: 'Historic Low',
                            text: `Finished with just ${season.points} points in ${season.year} - the lowest in ${tierText} history.`
                        });
                    }
                }
            }
        });
    }

    // Never relegated narrative
    if (club.seasons_played >= 10 && (club.relegations || 0) === 0) {
        narratives.push({
            icon: Shield,
            color: 'text-emerald-500',
            bg: 'bg-emerald-50',
            title: 'Never Relegated',
            text: `${club.seasons_played} seasons without a single relegation - remarkable stability.`
        });
    }
    
    // Never reached top flight (but came close)
    if (topFlightSeasonsList.length === 0 && sortedSeasons.length >= 5) {
        const tier2Seasons = sortedSeasons.filter(s => getLeagueTier(s.league_id) === 2);
        const runnerUps = tier2Seasons.filter(s => s.position === 2);
        const top3 = tier2Seasons.filter(s => s.position && s.position <= 3);
        
        if (runnerUps.length >= 2) {
            narratives.push({
                icon: Target,
                color: 'text-blue-600',
                bg: 'bg-blue-50',
                title: 'So Close, Yet So Far',
                text: `Finished 2nd in the second tier ${runnerUps.length} times but never made it to the top flight. The dream remains alive.`
            });
        } else if (top3.length >= 3) {
            narratives.push({
                icon: TrendingUp,
                color: 'text-blue-500',
                bg: 'bg-blue-50',
                title: 'Knocking on the Door',
                text: `Finished in the top 3 of the second tier ${top3.length} times. The top flight beckons.`
            });
        } else if (tier2Seasons.length >= 5) {
            narratives.push({
                icon: Shield,
                color: 'text-indigo-500',
                bg: 'bg-indigo-50',
                title: 'Second Tier Stalwarts',
                text: `${tier2Seasons.length} seasons in the second tier. Never reached the promised land of top-flight football.`
            });
        }
    }
    
    // Perpetual lower league club with brief top flight spell
    if (topFlightSeasonsList.length >= 1 && topFlightSeasonsList.length <= 5) {
        const lowestTier = Math.max(...sortedSeasons.map(s => getLeagueTier(s.league_id)));
        const lowestTierSeasons = sortedSeasons.filter(s => getLeagueTier(s.league_id) === lowestTier);
        
        if (lowestTierSeasons.length >= 10 && lowestTier >= 4) {
            const topFlightYears = topFlightSeasonsList.map(s => s.year).join(', ');
            narratives.push({
                icon: Star,
                color: 'text-purple-500',
                bg: 'bg-purple-50',
                title: 'Unlikely Heroes',
                text: `A lower-league club who defied the odds with ${topFlightSeasonsList.length} magical season${topFlightSeasonsList.length > 1 ? 's' : ''} in the top flight (${topFlightYears}). Most of their history has been in Tier ${lowestTier}.`
            });
        }
    }
    
    // Wilderness years between top flight spells
    if (topFlightSeasonsList.length >= 2) {
        const topFlightYears = [...topFlightSeasonsList].sort((a, b) => a.year.localeCompare(b.year));
        let longestGap = { years: 0, start: '', end: '' };
        
        for (let i = 1; i < topFlightYears.length; i++) {
            const gap = sortedSeasons.filter(s => 
                s.year > topFlightYears[i-1].year && 
                s.year < topFlightYears[i].year &&
                getLeagueTier(s.league_id) > 1
            ).length;
            
            if (gap > longestGap.years) {
                longestGap = { years: gap, start: topFlightYears[i-1].year, end: topFlightYears[i].year };
            }
        }
        
        if (longestGap.years >= 15) {
            narratives.push({
                icon: Clock,
                color: 'text-orange-700',
                bg: 'bg-orange-100',
                title: 'The Wilderness Years',
                text: `Endured ${longestGap.years} seasons outside the top flight between ${longestGap.start} and ${longestGap.end}. Dark days before their eventual return.`
            });
        } else if (longestGap.years >= 8) {
            narratives.push({
                icon: Clock,
                color: 'text-orange-600',
                bg: 'bg-orange-50',
                title: 'Lost Decade',
                text: `Spent ${longestGap.years} seasons away from the top flight between ${longestGap.start} and ${longestGap.end} before returning.`
            });
        }
    }

    if (isTuruliand) {
        const tfaSeasons = sortedSeasons.filter(s => {
            const tier = s.tier || getLeagueTier(s.league_id);
            return tier && tier <= 4;
        });
        const nonTfaSeasons = sortedSeasons.filter(s => {
            const tier = s.tier || getLeagueTier(s.league_id);
            return tier && tier > 4;
        });

        // Always been TFA - never dropped below tier 4
        if (tfaSeasons.length > 0 && nonTfaSeasons.length === 0 && sortedSeasons.length >= 5) {
            narratives.push({
                icon: Shield,
                color: 'text-blue-700',
                bg: 'bg-blue-100',
                title: 'TFA Stalwarts',
                text: `A proud TFA club throughout their entire ${sortedSeasons.length}-season history. Never dropped below the organized leagues.`
            });
        }
        
        // First time joining TFA
        else if (tfaSeasons.length > 0) {
            const firstTfaSeason = [...tfaSeasons].sort((a, b) => a.year.localeCompare(b.year))[0];
            const seasonsBeforeTfa = sortedSeasons.filter(s => s.year < firstTfaSeason.year);
            if (seasonsBeforeTfa.length > 0 && seasonsBeforeTfa.every(s => {
                const tier = s.tier || getLeagueTier(s.league_id);
                return tier > 4;
            })) {
                narratives.push({
                    icon: TrendingUp,
                    color: 'text-emerald-600',
                    bg: 'bg-emerald-50',
                    title: 'Welcome to the TFA',
                    text: `Joined the TFA Football League for the first time in ${firstTfaSeason.year}, reaching the top 4 tiers of organized football.`
                });
            }
        }

        // Former TFA mainstay now in non-league - EMPHASIZE THE FALL
        if (tfaSeasons.length >= 10 && mostRecentTier > 4) {
            const tfaPercentage = Math.round((tfaSeasons.length / sortedSeasons.length) * 100);
            const lastTfaSeason = [...tfaSeasons].sort((a, b) => b.year.localeCompare(a.year))[0];
            const seasonsAway = sortedSeasons.filter(s => s.year > lastTfaSeason.year).length;
            
            narratives.push({
                icon: TrendingDown,
                color: 'text-red-700',
                bg: 'bg-red-100',
                title: 'Fallen from Grace',
                text: `Once spent ${tfaSeasons.length} seasons (${tfaPercentage}% of their history) in the TFA Football League. Now languish in Tier ${mostRecentTier} - ${seasonsAway} seasons since organized football. A painful decline.`
            });
        }
        
        // Former top-flight club now far down the pyramid
        if (topFlightSeasonsList.length >= 5 && mostRecentTier >= 4) {
            const lastTopFlight = [...topFlightSeasonsList].sort((a, b) => b.year.localeCompare(a.year))[0];
            const seasonsAway = sortedSeasons.filter(s => {
                const tier = s.tier || getLeagueTier(s.league_id);
                return s.year > lastTopFlight.year && tier > 1;
            }).length;
            
            narratives.push({
                icon: Clock,
                color: 'text-orange-800',
                bg: 'bg-orange-100',
                title: 'The Great Fall',
                text: `Spent ${topFlightSeasonsList.length} seasons among the elite in the top flight. Now compete in Tier ${mostRecentTier}, ${seasonsAway} seasons removed from their glory days. How the mighty have fallen.`
            });
        }
        
        // Never reached TFA - solid non-league side
        if (tfaSeasons.length === 0 && sortedSeasons.length >= 5) {
            const tier5Seasons = sortedSeasons.filter(s => {
                const tier = s.tier || getLeagueTier(s.league_id);
                return tier === 5;
            });
            const bestNonLeagueFinish = sortedSeasons.reduce((best, s) => {
                const tier = s.tier || getLeagueTier(s.league_id);
                if (tier > 4 && s.position) {
                    if (!best || tier < best.tier || (tier === best.tier && s.position < best.position)) {
                        return { tier, position: s.position, year: s.year };
                    }
                }
                return best;
            }, null);
            
            if (tier5Seasons.length >= 10) {
                narratives.push({
                    icon: Shield,
                    color: 'text-purple-600',
                    bg: 'bg-purple-50',
                    title: 'Non-League Mainstays',
                    text: `A solid Tier 5 club with ${tier5Seasons.length} seasons. So close to the TFA, yet always just outside the organized leagues.`
                });
            } else if (bestNonLeagueFinish && bestNonLeagueFinish.tier === 5 && bestNonLeagueFinish.position <= 3) {
                narratives.push({
                    icon: Target,
                    color: 'text-indigo-600',
                    bg: 'bg-indigo-50',
                    title: 'Knocking on TFA\'s Door',
                    text: `Finished ${bestNonLeagueFinish.position}${bestNonLeagueFinish.position === 1 ? 'st' : bestNonLeagueFinish.position === 2 ? 'nd' : 'rd'} in Tier 5 (${bestNonLeagueFinish.year}). The TFA beckons, but remains elusive.`
                });
            } else if (sortedSeasons.length >= 8) {
                const lowestTier = Math.max(...sortedSeasons.map(s => s.tier || getLeagueTier(s.league_id)));
                narratives.push({
                    icon: Shield,
                    color: 'text-slate-600',
                    bg: 'bg-slate-100',
                    title: 'Community Club',
                    text: `A small community club competing in Tier ${lowestTier}. Pride of their locality, focused on grassroots football.`
                });
            }
        }
        
        // Dropped out of TFA for the first time
        else if (nonTfaSeasons.length > 0 && tfaSeasons.length > 0) {
            const firstNonTfaSeason = [...nonTfaSeasons].sort((a, b) => a.year.localeCompare(b.year))[0];
            const tfaSeasonsBeforeDrop = tfaSeasons.filter(s => s.year < firstNonTfaSeason.year);
            if (tfaSeasonsBeforeDrop.length > 0) {
                const allSeasonsBefore = sortedSeasons.filter(s => s.year < firstNonTfaSeason.year);
                if (allSeasonsBefore.every(s => {
                    const tier = s.tier || getLeagueTier(s.league_id);
                    return tier <= 4;
                })) {
                    narratives.push({
                        icon: TrendingDown,
                        color: 'text-red-600',
                        bg: 'bg-red-50',
                        title: 'Farewell to the TFA',
                        text: `Dropped out of the TFA Football League for the first time in ${firstNonTfaSeason.year}, falling into the regional leagues.`
                    });
                }
            }
        }
        
        // Return to TFA after exile
        if (mostRecentTier <= 4 && tfaSeasons.length > 0 && nonTfaSeasons.length > 0) {
            const lastNonTfaSeason = [...nonTfaSeasons].sort((a, b) => b.year.localeCompare(a.year))[0];
            const returnToTfaSeason = [...tfaSeasons]
                .filter(s => s.year > lastNonTfaSeason.year)
                .sort((a, b) => a.year.localeCompare(b.year))[0];
            
            if (returnToTfaSeason) {
                const yearsAway = sortedSeasons.filter(s => {
                    const tier = s.tier || getLeagueTier(s.league_id);
                    return s.year >= lastNonTfaSeason.year && 
                        s.year < returnToTfaSeason.year &&
                        tier > 4;
                }).length;
                
                if (yearsAway >= 15) {
                    narratives.push({
                        icon: Star,
                        color: 'text-emerald-800',
                        bg: 'bg-emerald-100',
                        title: 'TFA Resurrection',
                        text: `Rejoined the TFA Football League in ${returnToTfaSeason.year} after ${yearsAway} seasons lost in the non-league abyss. An incredible resurrection.`
                    });
                } else if (yearsAway >= 10) {
                    narratives.push({
                        icon: Star,
                        color: 'text-emerald-700',
                        bg: 'bg-emerald-100',
                        title: 'Back in the TFA',
                        text: `Rejoined the TFA Football League in ${returnToTfaSeason.year} after ${yearsAway} seasons in non-league football. A remarkable comeback.`
                    });
                } else if (yearsAway >= 5) {
                    narratives.push({
                        icon: Star,
                        color: 'text-emerald-600',
                        bg: 'bg-emerald-50',
                        title: 'TFA Redemption',
                        text: `Returned to the TFA Football League in ${returnToTfaSeason.year} after ${yearsAway} seasons outside the system.`
                    });
                }
            }
        }
        
        // Yo-yo between TFA and non-league
        if (tfaSeasons.length >= 3 && nonTfaSeasons.length >= 3) {
            const transitions = [];
            for (let i = 1; i < sortedSeasons.length; i++) {
                const prevTier = sortedSeasons[i-1].tier || getLeagueTier(sortedSeasons[i-1].league_id);
                const currTier = sortedSeasons[i].tier || getLeagueTier(sortedSeasons[i].league_id);
                if ((prevTier <= 4 && currTier > 4) || (prevTier > 4 && currTier <= 4)) {
                    transitions.push(sortedSeasons[i].year);
                }
            }
            
            if (transitions.length >= 4) {
                narratives.push({
                    icon: TrendingUp,
                    color: 'text-purple-600',
                    bg: 'bg-purple-50',
                    title: 'TFA Yo-Yo Club',
                    text: `Bounced between TFA and non-league football ${transitions.length} times. A turbulent existence on the edge of organized football.`
                });
            }
        }
        
        // Currently outside TFA - enhanced duration-based narratives
        if (mostRecentTier && mostRecentTier > 4 && tfaSeasons.length > 0) {
            const lastTfaSeason = [...tfaSeasons].sort((a, b) => b.year.localeCompare(a.year))[0];
            const seasonsAway = sortedSeasons.filter(s => s.year > lastTfaSeason.year).length;

            if (seasonsAway >= 25) {
                narratives.push({
                    icon: Clock,
                    color: 'text-slate-700',
                    bg: 'bg-slate-200',
                    title: 'Deep Non-League Exile',
                    text: `${seasonsAway} seasons banished from the TFA system since ${lastTfaSeason.year}. TFA football is now just folklore for the younger fans.`
                });
            } else if (seasonsAway >= 15) {
                narratives.push({
                    icon: Clock,
                    color: 'text-slate-600',
                    bg: 'bg-slate-100',
                    title: 'Non-League Wanderers',
                    text: `${seasonsAway} seasons in non-league football since ${lastTfaSeason.year}. A whole generation has grown up without TFA football.`
                });
            } else if (seasonsAway >= 10) {
                narratives.push({
                    icon: Clock,
                    color: 'text-orange-700',
                    bg: 'bg-orange-100',
                    title: 'TFA Exile',
                    text: `${seasonsAway} seasons outside the TFA since ${lastTfaSeason.year}. The gap back to organized football grows wider each year.`
                });
            } else if (seasonsAway >= 5) {
                narratives.push({
                    icon: Clock,
                    color: 'text-orange-600',
                    bg: 'bg-orange-50',
                    title: 'Non-League Reality',
                    text: `${seasonsAway} seasons outside the TFA Football League since ${lastTfaSeason.year}. Established in regional football but dreaming of organized league return.`
                });
            } else if (seasonsAway >= 2) {
                narratives.push({
                    icon: Clock,
                    color: 'text-amber-500',
                    bg: 'bg-amber-50',
                    title: 'TFA Return Quest',
                    text: `${seasonsAway} seasons since last competing in the TFA (${lastTfaSeason.year}). Working hard to regain their place in organized football.`
                });
            }
        }
    }

    // High scoring club
    if (club.total_goals_scored && club.seasons_played && club.seasons_played >= 5) {
        const avgGoals = club.total_goals_scored / club.seasons_played;
        if (avgGoals >= 60) {
            narratives.push({
                icon: Flame,
                color: 'text-red-500',
                bg: 'bg-red-50',
                title: 'Attack-Minded',
                text: `Averaging ${avgGoals.toFixed(1)} goals per season across ${club.seasons_played} campaigns.`
            });
        }
    }

    if (narratives.length === 0 && !clubStature) return null;

    // Deduplicate and prioritize narratives
    const uniqueNarratives = deduplicateNarratives(narratives);
    const bestNarratives = selectBestNarratives(uniqueNarratives, club, sortedSeasons, 10);

    const patternStyle = getPatternStyle(club.pattern_preference);

    return (
        <Card 
            className="border-0 shadow-sm" 
            style={{ 
                borderLeft: club.accent_color ? `4px solid ${club.accent_color}` : undefined,
                backgroundColor: club.primary_color ? `${club.primary_color}03` : undefined
            }}
        >
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5" style={{ color: club.accent_color || '#10b981' }} />
                    Club Story
                </CardTitle>
            </CardHeader>
            <CardContent>
                {/* Club Stature Section */}
                {clubStature && (
                    <div 
                        className={`mb-4 p-4 rounded-xl ${clubStature.bg} border`}
                        style={{ 
                            borderColor: club.accent_color ? `${club.accent_color}30` : undefined,
                            ...patternStyle
                        }}
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <Star className={`w-5 h-5 ${clubStature.color}`} />
                            <h4 className={`font-bold ${clubStature.color}`}>{clubStature.tier}</h4>
                        </div>
                        <p className="text-slate-700 text-sm leading-relaxed">{clubStature.description}</p>
                    </div>
                )}

                <div className="grid gap-3 md:grid-cols-2">
                    {bestNarratives.map((narrative, idx) => (
                        <div 
                            key={idx} 
                            className={`flex gap-3 p-3 rounded-lg ${narrative.bg} border border-transparent`}
                            style={patternStyle}
                        >
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