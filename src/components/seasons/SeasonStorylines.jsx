import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
    BookOpen, Trophy, Star, TrendingUp, TrendingDown, Flame, 
    Target, Shield, Zap, Award, Crown, Swords, MapPin, History,
    Users, Gauge, TrendingDownIcon
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function SeasonStorylines({ season, league, leagueTable = [], allSeasons = [], allLeagueTables = [], clubs = [] }) {
    const storylines = useMemo(() => {
        if (!season || !league) return [];
        
        const results = [];
        const year = season.year;
        const previousYear = String(parseInt(year) - 1);
        
        // Get tables sorted by position
        const sortedTable = [...leagueTable].sort((a, b) => a.position - b.position);
        const champion = sortedTable[0];
        const runnerUp = sortedTable[1];
        const lastPlace = sortedTable[sortedTable.length - 1];
        
        // Get previous season data
        const prevSeasons = allSeasons.filter(s => s.league_id === league.id && s.year === previousYear);
        const prevSeason = prevSeasons[0];
        const prevTable = allLeagueTables.filter(t => 
            prevSeasons.some(ps => ps.id === t.season_id) || 
            (t.league_id === league.id && t.year === previousYear)
        );
        
        // Get club data for enriching narratives
        const getClub = (name) => clubs.find(c => c.name === name);
        
        // NEW: Rivalry Title Battle
        if (champion && runnerUp) {
            const champClub = getClub(champion.club_name);
            const runnerClub = getClub(runnerUp.club_name);
            const margin = (champion.points || 0) - (runnerUp.points || 0);
            
            // Check if they're rivals
            const areRivals = champClub && runnerClub && (
                (champClub.rival_club_ids || []).includes(runnerClub.id) ||
                (runnerClub.rival_club_ids || []).includes(champClub.id)
            );
            
            if (areRivals && margin <= 5) {
                results.push({
                    icon: Swords,
                    color: 'text-red-600',
                    bg: 'bg-gradient-to-r from-red-50 to-orange-50',
                    title: '🔥 Rivalry Decides Title',
                    text: `The bitter rivalry between ${champion.club_name} and ${runnerUp.club_name} came to a head as they battled for the championship, with ${champion.club_name} prevailing by just ${margin} point${margin !== 1 ? 's' : ''} to claim bragging rights.`,
                    clubId: champClub?.id
                });
            }
        }
        
        // NEW: Regional Dominance
        const regionCounts = {};
        sortedTable.forEach(t => {
            const club = getClub(t.club_name);
            if (club?.region) {
                regionCounts[club.region] = (regionCounts[club.region] || 0) + 1;
            }
        });
        const dominantRegion = Object.entries(regionCounts).sort((a, b) => b[1] - a[1])[0];
        if (dominantRegion && dominantRegion[1] >= Math.ceil(sortedTable.length * 0.3)) {
            const regionClubs = sortedTable.filter(t => getClub(t.club_name)?.region === dominantRegion[0]);
            const topRegionalClub = regionClubs[0];
            results.push({
                icon: MapPin,
                color: 'text-indigo-500',
                bg: 'bg-gradient-to-r from-indigo-50 to-blue-50',
                title: 'Regional Power',
                text: `${dominantRegion[0]} dominated the division with ${dominantRegion[1]} clubs, led by ${topRegionalClub.club_name} in ${topRegionalClub.position}${topRegionalClub.position === 1 ? 'st' : topRegionalClub.position === 2 ? 'nd' : topRegionalClub.position === 3 ? 'rd' : 'th'} place.`,
            });
        }
        
        // NEW: Fallen Giants (historically successful clubs struggling)
        for (const entry of sortedTable) {
            const club = getClub(entry.club_name);
            if (!club) continue;
            
            const hasMultipleTitles = (club.league_titles || 0) >= 3;
            const hasRecentTopFlightHistory = (club.seasons_top_flight || 0) >= 10;
            const isInLowerTier = (season.tier || league.tier || 1) >= 3;
            
            if (hasMultipleTitles && isInLowerTier && entry.position >= sortedTable.length - 5) {
                results.push({
                    icon: TrendingDownIcon,
                    color: 'text-slate-600',
                    bg: 'bg-gradient-to-r from-slate-100 to-slate-50',
                    title: 'Fallen Giants',
                    text: `${club.name}, ${club.league_titles}-time champions, are languishing in Tier ${season.tier || league.tier}, finishing ${entry.position}${entry.position === 2 ? 'nd' : entry.position === 3 ? 'rd' : 'th'} - a far cry from their glory days.`,
                    clubId: club.id
                });
                break; // Only show one fallen giant story
            } else if (hasMultipleTitles && isInLowerTier && entry.position <= 3) {
                results.push({
                    icon: TrendingUp,
                    color: 'text-emerald-600',
                    bg: 'bg-gradient-to-r from-emerald-50 to-green-50',
                    title: 'Giants Awakening',
                    text: `Former champions ${club.name} (${club.league_titles} league titles) are showing signs of a revival, finishing ${entry.position}${entry.position === 1 ? 'st' : entry.position === 2 ? 'nd' : 'rd'} in Tier ${season.tier || league.tier}.`,
                    clubId: club.id
                });
                break;
            }
        }
        
        // NEW: Record-Breaking Points Total
        if (champion && champion.points >= 90 && champion.played >= 30) {
            const club = getClub(champion.club_name);
            const avgPoints = (champion.points / champion.played).toFixed(2);
            results.push({
                icon: Gauge,
                color: 'text-purple-600',
                bg: 'bg-gradient-to-r from-purple-50 to-fuchsia-50',
                title: 'Record-Breaking Season',
                text: `${champion.club_name} shattered expectations with ${champion.points} points from ${champion.played} games (${avgPoints} per game), one of the highest totals in league history.`,
                clubId: club?.id
            });
        }
        
        // NEW: Rivalry in Top 4 (multiple rivals finishing close)
        const top4 = sortedTable.slice(0, 4);
        let rivalPairs = [];
        for (let i = 0; i < top4.length; i++) {
            for (let j = i + 1; j < top4.length; j++) {
                const club1 = getClub(top4[i].club_name);
                const club2 = getClub(top4[j].club_name);
                if (club1 && club2) {
                    const areRivals = (club1.rival_club_ids || []).includes(club2.id) ||
                                     (club2.rival_club_ids || []).includes(club1.id);
                    if (areRivals) {
                        rivalPairs.push({ 
                            club1: top4[i], 
                            club2: top4[j],
                            club1Data: club1,
                            club2Data: club2
                        });
                    }
                }
            }
        }
        if (rivalPairs.length > 0 && !results.some(r => r.title.includes('Rivalry'))) {
            const pair = rivalPairs[0];
            results.push({
                icon: Swords,
                color: 'text-orange-600',
                bg: 'bg-gradient-to-r from-orange-50 to-amber-50',
                title: 'Rivalry in the Spotlight',
                text: `Fierce rivals ${pair.club1.club_name} and ${pair.club2.club_name} both secured top-4 finishes, finishing ${pair.club1.position}${pair.club1.position === 1 ? 'st' : pair.club1.position === 2 ? 'nd' : pair.club1.position === 3 ? 'rd' : 'th'} and ${pair.club2.position}${pair.club2.position === 1 ? 'st' : pair.club2.position === 2 ? 'nd' : pair.club2.position === 3 ? 'rd' : 'th'} respectively in a season where local pride was at stake.`,
            });
        }
        
        // 1. Title Race Analysis
        if (champion && runnerUp) {
            const margin = (champion.points || 0) - (runnerUp.points || 0);
            const championClub = getClub(champion.club_name);
            
            if (margin <= 2) {
                results.push({
                    icon: Flame,
                    color: 'text-orange-500',
                    bg: 'bg-gradient-to-r from-orange-50 to-red-50',
                    title: 'Title Decided on Final Day',
                    text: `${champion.club_name} edged out ${runnerUp.club_name} by just ${margin} point${margin !== 1 ? 's' : ''} in a nail-biting title race that went down to the wire.`,
                    clubId: championClub?.id
                });
            } else if (margin >= 15) {
                results.push({
                    icon: Crown,
                    color: 'text-amber-500',
                    bg: 'bg-gradient-to-r from-amber-50 to-yellow-50',
                    title: 'Dominant Champions',
                    text: `${champion.club_name} romped to the title with a commanding ${margin}-point margin over ${runnerUp.club_name}, leaving the competition in their wake.`,
                    clubId: championClub?.id
                });
            } else if (margin <= 5) {
                results.push({
                    icon: Swords,
                    color: 'text-red-500',
                    bg: 'bg-gradient-to-r from-red-50 to-pink-50',
                    title: 'Hard-Fought Championship',
                    text: `${champion.club_name} held off ${runnerUp.club_name} by ${margin} points in a closely contested title battle.`,
                    clubId: championClub?.id
                });
            }
        }
        
        // 2. First Title Check
        if (champion && season.champion_name) {
            const allPreviousSeasons = allSeasons.filter(s => 
                s.league_id === league.id && s.year < year
            );
            const previousChampions = new Set(allPreviousSeasons.map(s => s.champion_name).filter(Boolean));
            
            if (!previousChampions.has(season.champion_name)) {
                const championClub = getClub(season.champion_name);
                results.push({
                    icon: Star,
                    color: 'text-amber-500',
                    bg: 'bg-gradient-to-r from-amber-50 to-orange-50',
                    title: 'History Made',
                    text: `${season.champion_name} claimed their first ever ${league.name} championship, writing their name into the history books.`,
                    clubId: championClub?.id
                });
            }
        }
        
        // 3. Title Defense
        if (prevSeason?.champion_name && season.champion_name === prevSeason.champion_name) {
            const championClub = getClub(season.champion_name);
            results.push({
                icon: Trophy,
                color: 'text-yellow-600',
                bg: 'bg-gradient-to-r from-yellow-50 to-amber-50',
                title: 'Champions Retain Crown',
                text: `${season.champion_name} successfully defended their title, proving their dominance was no flash in the pan.`,
                clubId: championClub?.id
            });
        }
        
        // 3b. Defending Champion's Performance (if not retained)
        if (prevSeason?.champion_name && season.champion_name !== prevSeason.champion_name) {
            const prevChampEntry = sortedTable.find(t => t.club_name === prevSeason.champion_name);
            if (prevChampEntry) {
                const prevChampClub = getClub(prevSeason.champion_name);
                if (prevChampEntry.position === 2) {
                    results.push({
                        icon: Trophy,
                        color: 'text-slate-500',
                        bg: 'bg-slate-50',
                        title: 'Defending Champions Fall Short',
                        text: `${prevSeason.champion_name} came close to retaining their crown but had to settle for runners-up spot, finishing ${(champion?.points || 0) - (prevChampEntry.points || 0)} points behind ${champion?.club_name}.`,
                        clubId: prevChampClub?.id
                    });
                } else if (prevChampEntry.position <= 4) {
                    results.push({
                        icon: Trophy,
                        color: 'text-slate-500',
                        bg: 'bg-slate-50',
                        title: 'Title Hangover',
                        text: `Defending champions ${prevSeason.champion_name} could not mount a successful defence, slipping to ${prevChampEntry.position}${prevChampEntry.position === 2 ? 'nd' : prevChampEntry.position === 3 ? 'rd' : 'th'} place.`,
                        clubId: prevChampClub?.id
                    });
                } else if (prevChampEntry.position >= sortedTable.length - 3 && prevChampEntry.position > 4) {
                    results.push({
                        icon: TrendingDown,
                        color: 'text-red-500',
                        bg: 'bg-gradient-to-r from-red-50 to-rose-50',
                        title: 'Defending Champions Collapse',
                        text: `In a stunning fall from grace, ${prevSeason.champion_name} plummeted to ${prevChampEntry.position}${prevChampEntry.position === 2 ? 'nd' : prevChampEntry.position === 3 ? 'rd' : 'th'} place, fighting relegation rather than defending their title.`,
                        clubId: prevChampClub?.id
                    });
                }
            }
        }
        
        // 4. Promoted Club Performance Analysis
        // Get clubs that were promoted from lower tiers last season
        const lowerTierPrevSeasons = allSeasons.filter(s => 
            s.year === previousYear && s.league_id !== league.id
        );
        const allPromotedToThisLeague = [];
        lowerTierPrevSeasons.forEach(s => {
            if (s.promoted_teams) {
                s.promoted_teams.split(',').forEach(t => {
                    if (t.trim()) allPromotedToThisLeague.push(t.trim());
                });
            }
            // Champions from lower leagues also get promoted
            if (s.champion_name) {
                allPromotedToThisLeague.push(s.champion_name.trim());
            }
        });
        
        // Also check promoted_teams from previous season of THIS league (for clubs promoted into tier above)
        const promotedFromBelow = prevSeason?.promoted_teams?.split(',').map(t => t.trim()).filter(Boolean) || [];
        
        // Combine both sources
        const allNewlyPromoted = [...new Set([...allPromotedToThisLeague, ...promotedFromBelow])];
        
        // Find promoted clubs in this season's table
        const promotedClubsInTable = sortedTable.filter(t => 
            allNewlyPromoted.some(p => p === t.club_name || t.club_name.includes(p) || p.includes(t.club_name))
        );
        
        if (promotedClubsInTable.length > 0) {
            // Check if any promoted club won the title
            const promotedChampion = promotedClubsInTable.find(c => c.position === 1);
            if (promotedChampion) {
                const club = getClub(promotedChampion.club_name);
                results.push({
                    icon: TrendingUp,
                    color: 'text-emerald-500',
                    bg: 'bg-gradient-to-r from-emerald-50 to-green-50',
                    title: 'From Promotion to Glory',
                    text: `Remarkably, ${promotedChampion.club_name} went from promoted side to champions in a single season - a truly extraordinary achievement.`,
                    clubId: club?.id
                });
            } else {
                // Analyze how promoted sides did overall
                const topHalf = Math.ceil(sortedTable.length / 2);
                const promotedInTopHalf = promotedClubsInTable.filter(c => c.position <= topHalf);
                const promotedRelegated = promotedClubsInTable.filter(c => 
                    season.relegated_teams?.split(',').map(t => t.trim()).includes(c.club_name)
                );
                
                // Best performing promoted side
                const bestPromoted = promotedClubsInTable.sort((a, b) => a.position - b.position)[0];
                if (bestPromoted && bestPromoted.position <= 3) {
                    const club = getClub(bestPromoted.club_name);
                    results.push({
                        icon: TrendingUp,
                        color: 'text-emerald-500',
                        bg: 'bg-gradient-to-r from-emerald-50 to-green-50',
                        title: 'Promoted Side Shines',
                        text: `${bestPromoted.club_name} made an immediate impact after promotion, finishing in an impressive ${bestPromoted.position}${bestPromoted.position === 1 ? 'st' : bestPromoted.position === 2 ? 'nd' : 'rd'} place.`,
                        clubId: club?.id
                    });
                } else if (promotedRelegated.length > 0 && promotedRelegated.length === promotedClubsInTable.length) {
                    // All promoted sides went straight back down
                    results.push({
                        icon: TrendingDown,
                        color: 'text-orange-500',
                        bg: 'bg-gradient-to-r from-orange-50 to-amber-50',
                        title: 'Promoted Sides Struggle',
                        text: `All ${promotedRelegated.length} promoted club${promotedRelegated.length > 1 ? 's' : ''} (${promotedRelegated.map(c => c.club_name).join(', ')}) failed to survive, going straight back down.`,
                    });
                } else if (promotedRelegated.length > 0) {
                    const strugglers = promotedRelegated.map(c => c.club_name).join(', ');
                    results.push({
                        icon: TrendingDown,
                        color: 'text-orange-500',
                        bg: 'bg-gradient-to-r from-orange-50 to-amber-50',
                        title: 'Yo-Yo Club',
                        text: `${strugglers} couldn't handle the step up, going straight back down after just one season.`,
                    });
                } else if (promotedInTopHalf.length === promotedClubsInTable.length && promotedClubsInTable.length > 1) {
                    results.push({
                        icon: TrendingUp,
                        color: 'text-green-500',
                        bg: 'bg-gradient-to-r from-green-50 to-teal-50',
                        title: 'Promoted Sides Flourish',
                        text: `All ${promotedClubsInTable.length} promoted clubs adapted well to life in this division, with all finishing in the top half of the table.`,
                    });
                }
            }
        }
        
        // 5. Big Club Falls - Previous champion relegated
        if (prevSeason?.champion_name && season.relegated_teams) {
            const relegated = season.relegated_teams.split(',').map(t => t.trim());
            if (relegated.includes(prevSeason.champion_name)) {
                const relegatedClub = getClub(prevSeason.champion_name);
                results.push({
                    icon: TrendingDown,
                    color: 'text-red-600',
                    bg: 'bg-gradient-to-r from-red-50 to-rose-50',
                    title: 'Fallen Giants',
                    text: `In a shocking turn of events, defending champions ${prevSeason.champion_name} suffered the ignominy of relegation just one year after lifting the trophy.`,
                    clubId: relegatedClub?.id
                });
            }
        }
        
        // 6. Goal-Scoring Records
        if (sortedTable.length > 0) {
            const topScorer = [...sortedTable].sort((a, b) => (b.goals_for || 0) - (a.goals_for || 0))[0];
            const worstDefense = [...sortedTable].sort((a, b) => (b.goals_against || 0) - (a.goals_against || 0))[0];
            
            if (topScorer && topScorer.goals_for >= 80) {
                const club = getClub(topScorer.club_name);
                results.push({
                    icon: Zap,
                    color: 'text-blue-500',
                    bg: 'bg-gradient-to-r from-blue-50 to-indigo-50',
                    title: 'Attacking Masterclass',
                    text: `${topScorer.club_name} lit up the league with ${topScorer.goals_for} goals, averaging ${(topScorer.goals_for / (topScorer.played || 1)).toFixed(1)} per game.`,
                    clubId: club?.id
                });
            }
            
            if (worstDefense && worstDefense.goals_against >= 70 && worstDefense.position >= sortedTable.length - 3) {
                const club = getClub(worstDefense.club_name);
                results.push({
                    icon: Shield,
                    color: 'text-slate-500',
                    bg: 'bg-slate-50',
                    title: 'Defensive Woes',
                    text: `${worstDefense.club_name} struggled all season, conceding ${worstDefense.goals_against} goals as they battled against the drop.`,
                    clubId: club?.id
                });
            }
        }
        
        // 7. Dramatic Survival
        if (sortedTable.length > 0 && season.relegation_spots) {
            const survivalPosition = sortedTable.length - season.relegation_spots;
            const survivor = sortedTable[survivalPosition - 1];
            const relegated = sortedTable[survivalPosition];
            
            if (survivor && relegated) {
                const margin = (survivor.points || 0) - (relegated.points || 0);
                if (margin <= 2) {
                    const club = getClub(survivor.club_name);
                    results.push({
                        icon: Target,
                        color: 'text-green-600',
                        bg: 'bg-gradient-to-r from-green-50 to-emerald-50',
                        title: 'Great Escape',
                        text: `${survivor.club_name} survived by the skin of their teeth, finishing just ${margin} point${margin !== 1 ? 's' : ''} above the drop zone.`,
                        clubId: club?.id
                    });
                }
            }
        }
        
        // 8. Unbeaten/Invincible Run
        if (champion && champion.lost === 0 && champion.played >= 20) {
            const club = getClub(champion.club_name);
            results.push({
                icon: Award,
                color: 'text-purple-500',
                bg: 'bg-gradient-to-r from-purple-50 to-fuchsia-50',
                title: 'The Invincibles',
                text: `${champion.club_name} completed the season unbeaten - ${champion.won} wins and ${champion.drawn} draws in a perfect campaign.`,
                clubId: club?.id
            });
        } else if (champion && champion.lost <= 2 && champion.played >= 20) {
            const club = getClub(champion.club_name);
            results.push({
                icon: Award,
                color: 'text-purple-500',
                bg: 'bg-gradient-to-r from-purple-50 to-violet-50',
                title: 'Near-Perfect Campaign',
                text: `${champion.club_name} lost just ${champion.lost} game${champion.lost !== 1 ? 's' : ''} all season in a remarkable title-winning run.`,
                clubId: club?.id
            });
        }
        
        // 9. Playoff Drama
        if (season.playoff_winner && season.playoff_notes) {
            const club = getClub(season.playoff_winner);
            results.push({
                icon: Flame,
                color: 'text-orange-500',
                bg: 'bg-gradient-to-r from-orange-50 to-yellow-50',
                title: 'Playoff Glory',
                text: `${season.playoff_winner} emerged victorious from the playoffs to secure promotion. ${season.playoff_notes}`,
                clubId: club?.id
            });
        } else if (season.playoff_winner) {
            const club = getClub(season.playoff_winner);
            results.push({
                icon: TrendingUp,
                color: 'text-green-500',
                bg: 'bg-gradient-to-r from-green-50 to-teal-50',
                title: 'Playoff Winners',
                text: `${season.playoff_winner} won the promotion playoffs to secure their place in the higher division.`,
                clubId: club?.id
            });
        }
        
        // 10. New Club in League - only impressive if they were PROMOTED (came from below), not relegated
        const prevClubNames = new Set(prevTable.map(t => t.club_name));
        const newClubs = sortedTable.filter(t => !prevClubNames.has(t.club_name));
        
        // Check if club was promoted from below (not relegated from above)
        const trulyPromotedNewcomers = newClubs.filter(c => allNewlyPromoted.includes(c.club_name));
        
        if (trulyPromotedNewcomers.length > 0 && trulyPromotedNewcomers.some(c => c.position <= 6)) {
            const impressiveNew = trulyPromotedNewcomers.filter(c => c.position <= 6)[0];
            if (impressiveNew) {
                const club = getClub(impressiveNew.club_name);
                results.push({
                    icon: Star,
                    color: 'text-blue-500',
                    bg: 'bg-gradient-to-r from-blue-50 to-cyan-50',
                    title: 'Impressive Newcomers',
                    text: `${impressiveNew.club_name} made an immediate impact after promotion, finishing in ${impressiveNew.position}${impressiveNew.position === 1 ? 'st' : impressiveNew.position === 2 ? 'nd' : impressiveNew.position === 3 ? 'rd' : 'th'} place.`,
                    clubId: club?.id
                });
            }
        }
        
        // 11. Relegated Club Performance Analysis
        // Get clubs that were relegated from higher tier last season
        const higherTierPrevSeasons = allSeasons.filter(s => s.year === previousYear && s.league_id !== league.id);
        const allRelegatedToThisLeague = [];
        higherTierPrevSeasons.forEach(s => {
            if (s.relegated_teams) {
                s.relegated_teams.split(',').forEach(t => {
                    if (t.trim()) allRelegatedToThisLeague.push(t.trim());
                });
            }
        });
        
        // Find relegated clubs in this season's table
        const relegatedClubsInTable = sortedTable.filter(t => 
            allRelegatedToThisLeague.some(r => r === t.club_name || t.club_name.includes(r) || r.includes(t.club_name))
        );
        
        if (relegatedClubsInTable.length > 0) {
            // Check if any relegated club bounced straight back
            const bouncedBack = relegatedClubsInTable.filter(c => 
                season.promoted_teams?.split(',').map(t => t.trim()).includes(c.club_name) || c.position === 1
            );
            
            if (bouncedBack.length > 0) {
                const bouncer = bouncedBack[0];
                const club = getClub(bouncer.club_name);
                if (bouncer.position === 1) {
                    results.push({
                        icon: Trophy,
                        color: 'text-amber-500',
                        bg: 'bg-gradient-to-r from-amber-50 to-yellow-50',
                        title: 'Bounce Back Champions',
                        text: `${bouncer.club_name} responded to relegation in style, winning the title and securing immediate promotion back.`,
                        clubId: club?.id
                    });
                } else {
                    results.push({
                        icon: TrendingUp,
                        color: 'text-green-500',
                        bg: 'bg-gradient-to-r from-green-50 to-emerald-50',
                        title: 'Immediate Return',
                        text: `${bouncer.club_name} bounced straight back after last season's relegation, securing promotion at the first attempt.`,
                        clubId: club?.id
                    });
                }
            }
            
            // Check if relegated club got relegated again (double relegation)
            if (season.relegated_teams) {
                const relegatedThisYear = season.relegated_teams.split(',').map(t => t.trim());
                const doubleRelegation = relegatedClubsInTable.filter(c => relegatedThisYear.includes(c.club_name));
                
                if (doubleRelegation.length > 0) {
                    const fallenClub = doubleRelegation[0];
                    const club = getClub(fallenClub.club_name);
                    results.push({
                        icon: TrendingDown,
                        color: 'text-red-600',
                        bg: 'bg-gradient-to-r from-red-50 to-rose-50',
                        title: 'Freefall Continues',
                        text: `${fallenClub.club_name} suffered back-to-back relegations, unable to arrest their slide down the pyramid.`,
                        clubId: club?.id
                    });
                }
            }
            
            // Check for mid-table mediocrity
            const topHalf = Math.ceil(sortedTable.length / 2);
            const relegatedMidTable = relegatedClubsInTable.filter(c => 
                c.position > topHalf && 
                !season.relegated_teams?.split(',').map(t => t.trim()).includes(c.club_name) &&
                !season.promoted_teams?.split(',').map(t => t.trim()).includes(c.club_name)
            );
            
            if (relegatedMidTable.length > 0 && bouncedBack.length === 0) {
                const struggler = relegatedMidTable[0];
                const club = getClub(struggler.club_name);
                results.push({
                    icon: Shield,
                    color: 'text-slate-500',
                    bg: 'bg-slate-50',
                    title: 'Relegated Side Struggles',
                    text: `${struggler.club_name} failed to make an immediate impact after dropping down, finishing in ${struggler.position}${struggler.position === 2 ? 'nd' : struggler.position === 3 ? 'rd' : 'th'} place.`,
                    clubId: club?.id
                });
            }
        }
        
        // 12. Successive promotions - promoted again after being promoted last year
        if (prevSeason?.promoted_teams && season.promoted_teams) {
            const promotedThisYear = season.promoted_teams.split(',').map(t => t.trim());
            const promotedLastYear = prevSeason.promoted_teams.split(',').map(t => t.trim());
            
            // Find clubs that appear in promoted this year AND were promoted last year (back-to-back promotions)
            const backToBackPromotions = promotedThisYear.filter(clubName => {
                // Check if this club was in this league because they were promoted last year from lower tier
                return trulyPromotedNewcomers.some(c => c.club_name === clubName);
            });
            
            if (backToBackPromotions.length > 0) {
                const risingClub = backToBackPromotions[0];
                const club = getClub(risingClub);
                results.push({
                    icon: TrendingUp,
                    color: 'text-emerald-600',
                    bg: 'bg-gradient-to-r from-emerald-50 to-green-50',
                    title: 'Unstoppable Rise',
                    text: `${risingClub} achieved back-to-back promotions, continuing their remarkable ascent through the pyramid.`,
                    clubId: club?.id
                });
            }
        }
        
        // 13. First-time tier promotions and historic moments
        if (season.promoted_teams) {
            const promotedThisYear = season.promoted_teams.split(',').map(t => t.trim()).filter(Boolean);
            const currentTier = season.tier || league.tier || 1;
            const promotedToTier = currentTier - 1; // They're going UP to a higher tier (lower number)
            
            for (const promotedClubName of promotedThisYear) {
                const club = getClub(promotedClubName);
                if (!club) continue;
                
                // Get all historical seasons for this club
                const clubHistory = allLeagueTables.filter(t => t.club_id === club.id || t.club_name === club.name);
                const clubSeasonTiers = clubHistory.map(h => {
                    const seasonData = allSeasons.find(s => s.id === h.season_id || (s.league_id === h.league_id && s.year === h.year));
                    if (seasonData) return seasonData.tier || 1;
                    return null;
                }).filter(Boolean);
                
                // Check if they've ever been in the tier they're being promoted to
                const everBeenInHigherTier = clubSeasonTiers.some(t => t <= promotedToTier);
                
                if (!everBeenInHigherTier && promotedToTier === 1) {
                    // First ever top-flight promotion!
                    results.push({
                        icon: Star,
                        color: 'text-amber-500',
                        bg: 'bg-gradient-to-r from-amber-50 to-yellow-50',
                        title: 'Top-Flight Debut',
                        text: `${promotedClubName} earned promotion to the top flight for the first time in their history, finishing ${sortedTable.find(t => t.club_name === promotedClubName)?.position || ''}${['', 'st', 'nd', 'rd'][sortedTable.find(t => t.club_name === promotedClubName)?.position] || 'th'} in the table.`,
                        clubId: club.id
                    });
                } else if (!everBeenInHigherTier && promotedToTier > 1) {
                    // First time reaching this tier
                    results.push({
                        icon: TrendingUp,
                        color: 'text-blue-500',
                        bg: 'bg-gradient-to-r from-blue-50 to-indigo-50',
                        title: 'New Heights',
                        text: `${promotedClubName} reached Tier ${promotedToTier} for the first time in their history after a successful campaign.`,
                        clubId: club.id
                    });
                }
            }
        }
        
        // 14. Lowest-ever tier relegation
        if (season.relegated_teams) {
            const relegatedThisYear = season.relegated_teams.split(',').map(t => t.trim()).filter(Boolean);
            const currentTier = season.tier || league.tier || 1;
            const relegatedToTier = currentTier + 1; // They're going DOWN to a lower tier (higher number)
            
            for (const relegatedClubName of relegatedThisYear) {
                const club = getClub(relegatedClubName);
                if (!club) continue;
                
                // Get all historical seasons for this club - need to look up league tiers properly
                const clubHistory = allLeagueTables.filter(t => t.club_id === club.id || t.club_name === club.name);
                const clubSeasonTiers = [];
                
                for (const h of clubHistory) {
                    // First try to get tier from the season record
                    const seasonData = allSeasons.find(s => s.id === h.season_id || (s.league_id === h.league_id && s.year === h.year));
                    if (seasonData?.tier) {
                        clubSeasonTiers.push(seasonData.tier);
                    } else if (h.league_id) {
                        // Fall back to looking up the league's tier from allSeasons for that league
                        const leagueSeasons = allSeasons.filter(s => s.league_id === h.league_id);
                        if (leagueSeasons.length > 0 && leagueSeasons[0].tier) {
                            clubSeasonTiers.push(leagueSeasons[0].tier);
                        }
                    }
                }
                
                // Check if they've ever been in a tier as low as where they're being relegated to
                const lowestTierEver = clubSeasonTiers.length > 0 ? Math.max(...clubSeasonTiers) : 0;
                const clubEntry = sortedTable.find(t => t.club_name === relegatedClubName);
                
                if (relegatedToTier > lowestTierEver && lowestTierEver > 0) {
                    // Dropping to their lowest ever tier
                    results.push({
                        icon: TrendingDown,
                        color: 'text-red-600',
                        bg: 'bg-gradient-to-r from-red-50 to-rose-50',
                        title: 'Historic Low',
                        text: `${relegatedClubName} will drop to Tier ${relegatedToTier} - the lowest level in their history - after finishing ${clubEntry?.position || 'bottom'} of the table.`,
                        clubId: club.id
                    });
                }
            }
        }
        
        // NEW: Small club overperforming (no major titles, small town, top 6 finish)
        for (const entry of sortedTable.slice(0, 6)) {
            const club = getClub(entry.club_name);
            if (!club) continue;
            
            const hasNoMajorTitles = (club.league_titles || 0) === 0 && (club.vcc_titles || 0) === 0;
            const isSmallTown = club.settlement && !['city'].includes(club.settlement_size);
            const topPosition = entry.position;
            
            if (hasNoMajorTitles && topPosition <= 3 && topPosition !== 1) {
                results.push({
                    icon: Star,
                    color: 'text-cyan-500',
                    bg: 'bg-gradient-to-r from-cyan-50 to-blue-50',
                    title: 'Underdogs Shine',
                    text: `${club.name}${isSmallTown ? ` from ${club.settlement}` : ''} defied expectations to finish ${topPosition}${topPosition === 2 ? 'nd' : 'rd'}, punching well above their weight in a remarkable campaign.`,
                    clubId: club.id
                });
                break;
            }
        }
        
        // 15. Season notes if provided
        if (season.notes) {
            results.push({
                icon: BookOpen,
                color: 'text-slate-600',
                bg: 'bg-slate-50',
                title: 'Season Notes',
                text: season.notes
            });
        }
        
        return results.slice(0, 10);
    }, [season, league, leagueTable, allSeasons, allLeagueTables, clubs]);

    if (storylines.length === 0) return null;

    return (
        <Card className="border-0 shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <History className="w-5 h-5 text-indigo-500" />
                    Season Storylines
                    {season?.year && (
                        <Badge variant="outline" className="ml-2">{season.year}</Badge>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid gap-3 md:grid-cols-2">
                    {storylines.map((story, idx) => (
                        <div key={idx} className={`p-4 rounded-xl border border-slate-100 ${story.bg}`}>
                            <div className="flex gap-3">
                                <div className={`p-2 rounded-lg bg-white shadow-sm`}>
                                    <story.icon className={`w-5 h-5 ${story.color}`} />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-slate-800 mb-1">{story.title}</h4>
                                    <p className="text-sm text-slate-600 leading-relaxed">{story.text}</p>
                                    {story.clubId && (
                                        <Link 
                                            to={createPageUrl(`ClubDetail?id=${story.clubId}`)}
                                            className="inline-block mt-2 text-xs font-medium text-indigo-600 hover:text-indigo-800"
                                        >
                                            View club →
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}