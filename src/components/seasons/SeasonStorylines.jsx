import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
    BookOpen, Trophy, Star, TrendingUp, TrendingDown, Flame, 
    Target, Shield, Zap, Award, Crown, Swords, MapPin, History
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
        
        // 4. Promoted Club Success
        if (prevSeason?.promoted_teams && champion) {
            const promotedLast = prevSeason.promoted_teams.split(',').map(t => t.trim());
            if (promotedLast.includes(champion.club_name)) {
                const championClub = getClub(champion.club_name);
                results.push({
                    icon: TrendingUp,
                    color: 'text-emerald-500',
                    bg: 'bg-gradient-to-r from-emerald-50 to-green-50',
                    title: 'From Promotion to Glory',
                    text: `Remarkably, ${champion.club_name} went from promoted side to champions in a single season - a truly extraordinary achievement.`,
                    clubId: championClub?.id
                });
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
        const promotedFromBelow = prevSeason?.promoted_teams?.split(',').map(t => t.trim()) || [];
        const trulyPromotedNewcomers = newClubs.filter(c => promotedFromBelow.includes(c.club_name));
        
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
        
        // 11. Relegated club struggles - came down but still got relegated again
        if (prevSeason) {
            // Find clubs that were relegated to this league from above
            const relegatedFromAbove = newClubs.filter(c => !promotedFromBelow.includes(c.club_name));
            const doubleRelegation = relegatedFromAbove.filter(c => 
                season.relegated_teams?.split(',').map(t => t.trim()).includes(c.club_name)
            );
            
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
        
        // 11. Season notes if provided
        if (season.notes) {
            results.push({
                icon: BookOpen,
                color: 'text-slate-600',
                bg: 'bg-slate-50',
                title: 'Season Notes',
                text: season.notes
            });
        }
        
        return results.slice(0, 6);
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