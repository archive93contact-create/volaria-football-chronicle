import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function PersonalizedLeagueStory({ league, nation, seasons, clubs, allLeagueTables }) {
    if (!league || !seasons || seasons.length === 0 || !clubs || !allLeagueTables) return null;

    const story = useMemo(() => {
        const paragraphs = [];
        const sortedSeasons = [...seasons].sort((a, b) => a.year.localeCompare(b.year));
        const firstYear = sortedSeasons[0]?.year;
        const latestYear = sortedSeasons[sortedSeasons.length - 1]?.year;

        // Get all clubs that have competed
        const allCompetingClubIds = new Set(allLeagueTables.filter(t => t.league_id === league.id).map(t => t.club_id));
        const competingClubs = clubs.filter(c => allCompetingClubIds.has(c.id));

        // Find most successful clubs
        const championshipCounts = {};
        seasons.forEach(s => {
            if (s.champion_id) {
                championshipCounts[s.champion_id] = (championshipCounts[s.champion_id] || 0) + 1;
            }
        });
        const sortedChampions = Object.entries(championshipCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([id, count]) => ({ club: clubs.find(c => c.id === id), count }))
            .filter(item => item.club);

        const dominantClub = sortedChampions[0];
        const isDominated = dominantClub && dominantClub.count >= seasons.length * 0.4; // 40%+ dominance

        // Calculate competitiveness
        const uniqueChampions = Object.keys(championshipCounts).length;
        const competitivenessRatio = uniqueChampions / seasons.length;
        const isVeryCompetitive = competitivenessRatio > 0.5;
        const isMildlyCompetitive = competitivenessRatio > 0.3;

        // OPENING - League identity and tier
        const tierText = league.tier === 1 ? 'the pinnacle of' :
                        league.tier === 2 ? 'the second tier of' :
                        league.tier === 3 ? 'the third tier of' :
                        `Tier ${league.tier} of`;
        
        const foundingText = league.founded_year ? `Founded in ${league.founded_year}` : 'Established years ago';
        const isTuruliandTFA = nation?.name === 'Turuliand' && league.tier <= 4;

        if (isTuruliandTFA) {
            paragraphs.push(
                `${foundingText}, ${league.name} sits at ${tierText} Turuliand's football pyramid - crucially, within the TFA system. That means structure, stability, and legitimacy. For clubs competing here, this is organized football: regular fixtures, proper infrastructure, nationwide recognition. ${league.tier === 1 ? 'This is the summit, where champions are crowned and dreams are realized.' : league.tier === 2 ? 'One step below the elite, but still firmly within the organized tiers.' : league.tier === 3 ? 'The heart of the TFA - far from the glamour of the top flight, but miles ahead of the non-league wilderness.' : 'The final frontier of organized football - one tier below lies chaos.'}`
            );
        } else if (league.tier > 4 && nation?.name === 'Turuliand') {
            paragraphs.push(
                `${foundingText}, ${league.name} exists in the shadow realm beyond the TFA. This is Tier ${league.tier} - non-league football where fixtures are sparse, crowds are thin, and stability is a luxury. ${competingClubs.length} clubs compete here, in a world far removed from organized football's structure. For these clubs, the TFA is the dream - regular games, proper recognition, and a place in the national pyramid.`
            );
        } else {
            paragraphs.push(
                `${foundingText}, ${league.name} represents ${tierText} ${nation?.name || 'the nation'}'s football. ${league.tier === 1 ? 'This is where glory is won, where legends are made, and where every match carries the weight of national attention.' : league.tier === 2 ? 'A proving ground for ambitious clubs and fallen giants alike.' : `At this level, football is about community, survival, and the long climb toward something greater.`}`
            );
        }

        // HISTORY & EVOLUTION
        if (firstYear && latestYear !== firstYear) {
            const seasonCount = seasons.length;
            paragraphs.push(
                `Since ${firstYear}, ${league.name} has hosted ${seasonCount} season${seasonCount > 1 ? 's' : ''} of competition${competingClubs.length > 0 ? `, with ${competingClubs.length} different clubs having graced its ranks` : ''}. ${league.renamed_year ? `Originally known as ${league.former_name}, it was rebranded in ${league.renamed_year}${league.rename_reason ? ` due to ${league.rename_reason.toLowerCase()}` : ''}.` : ''}`
            );
        }

        // COMPETITIVE LANDSCAPE
        if (isDominated && dominantClub) {
            const dominancePercentage = Math.round((dominantClub.count / seasons.length) * 100);
            paragraphs.push(
                `Make no mistake - this is ${dominantClub.club.name}'s league. They've claimed ${dominantClub.count} of ${seasons.length} titles (${dominancePercentage}%), turning ${league.name} into their personal kingdom. ${sortedChampions[1] ? `${sortedChampions[1].club.name} (${sortedChampions[1].count} titles) and ${sortedChampions[2]?.club.name || 'others'} have challenged, but none have truly broken the stranglehold.` : 'The rest compete for scraps.'}`
            );
        } else if (isVeryCompetitive) {
            paragraphs.push(
                `This is a league defined by unpredictability. ${uniqueChampions} different clubs have won titles across ${seasons.length} seasons - the championship is genuinely up for grabs every year. ${sortedChampions.length >= 2 ? `${sortedChampions[0].club.name} (${sortedChampions[0].count}), ${sortedChampions[1].club.name} (${sortedChampions[1].count})${sortedChampions[2] ? `, and ${sortedChampions[2].club.name} (${sortedChampions[2].count})` : ''} have all claimed glory, but no one truly dominates.` : 'Anyone can win.'}`
            );
        } else if (isMildlyCompetitive && sortedChampions.length >= 2) {
            paragraphs.push(
                `Power shifts here, but slowly. ${sortedChampions[0].club.name} leads the way with ${sortedChampions[0].count} title${sortedChampions[0].count > 1 ? 's' : ''}, but ${sortedChampions[1].club.name} (${sortedChampions[1].count}) and others have proven they can compete. It's not wide open, but it's not a one-club show either.`
            );
        } else if (sortedChampions.length > 0) {
            paragraphs.push(
                `Championship glory has been achieved by ${uniqueChampions} club${uniqueChampions > 1 ? 's' : ''} over the years, with ${dominantClub.club.name} establishing themselves as the benchmark with ${dominantClub.count} title${dominantClub.count > 1 ? 's' : ''}.`
            );
        }

        // FORMAT & STRUCTURE
        if (league.number_of_teams) {
            const promotionText = league.promotion_spots > 0 ? `${league.promotion_spots} automatic promotion spot${league.promotion_spots > 1 ? 's' : ''}` : null;
            const relegationText = league.relegation_spots > 0 ? `${league.relegation_spots} facing relegation` : null;
            
            if (promotionText || relegationText) {
                paragraphs.push(
                    `Currently, ${league.number_of_teams} clubs battle it out${promotionText ? ` with ${promotionText}` : ''}${relegationText ? ` and ${relegationText}` : ''} each season. Every point matters. Every match is a battle for position, pride, and survival.`
                );
            }
        }

        // CLOSING - Current state
        const latestSeason = sortedSeasons[sortedSeasons.length - 1];
        const currentChampion = clubs.find(c => c.id === latestSeason?.champion_id);
        
        if (currentChampion && latestYear) {
            paragraphs.push(
                `${latestYear} belongs to ${currentChampion.name}, ${league.name} champions. ${currentChampion.id === dominantClub?.club.id ? 'The dynasty continues.' : isDominated ? 'The old order has been challenged.' : isVeryCompetitive ? 'Another champion crowned in an ever-changing landscape.' : 'Glory etched in club history.'} The story of ${league.name} continues, written one season at a time.`
            );
        } else {
            paragraphs.push(
                `The story of ${league.name} continues, season after season, match after match. For the clubs who compete here, this league represents ${league.tier === 1 ? 'everything - glory, pride, and immortality' : league.tier <= 4 && nation?.name === 'Turuliand' ? 'organized football and stability' : 'survival, ambition, and the dream of climbing higher'}.`
            );
        }

        return paragraphs;
    }, [league, seasons, clubs, allLeagueTables, nation]);

    return (
        <Card 
            className="border-0 shadow-sm mb-6"
            style={{
                borderLeft: league.accent_color ? `4px solid ${league.accent_color}` : undefined,
                backgroundColor: league.primary_color ? `${league.primary_color}03` : undefined
            }}
        >
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5" style={{ color: league.accent_color || league.primary_color || '#10b981' }} />
                    The {league.name} Story
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="prose prose-slate max-w-none">
                    {story.map((para, idx) => (
                        <p key={idx} className="text-slate-700 leading-relaxed mb-4">
                            {para}
                        </p>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}