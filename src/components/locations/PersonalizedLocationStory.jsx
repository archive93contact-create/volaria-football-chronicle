import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function PersonalizedLocationStory({ 
    location, 
    clubs, 
    leagueTables, 
    leagues, 
    nation,
    subLocations = [],
    parentLocation = null
}) {
    if (!location) return null;

    const generateStory = () => {
        const paragraphs = [];
        
        // Helper to get league tier
        const getLeagueTier = (leagueId) => {
            const league = leagues.find(l => l.id === leagueId);
            return league?.tier || 1;
        };

        // Sort clubs by importance (titles, top flight seasons)
        const rankedClubs = [...clubs].sort((a, b) => {
            const aTitles = (a.league_titles || 0) + (a.vcc_titles || 0) * 5;
            const bTitles = (b.league_titles || 0) + (b.vcc_titles || 0) * 5;
            if (aTitles !== bTitles) return bTitles - aTitles;
            return (b.seasons_top_flight || 0) - (a.seasons_top_flight || 0);
        });

        const topClub = rankedClubs[0];
        const hasMultipleClubs = clubs.length > 1;

        // Calculate club stats
        const totalTitles = clubs.reduce((sum, c) => sum + (c.league_titles || 0), 0);
        const totalVCC = clubs.reduce((sum, c) => sum + (c.vcc_titles || 0), 0);
        const totalCCC = clubs.reduce((sum, c) => sum + (c.ccc_titles || 0), 0);
        const topFlightClubs = clubs.filter(c => (c.seasons_top_flight || 0) > 0);

        // Check if Turuliand
        const isTuruliand = nation?.name === 'Turuliand' || leagues.some(l => l.name?.includes('TFA'));
        
        // Calculate TFA vs non-league for each club
        const clubTfaStatus = clubs.map(club => {
            const clubSeasons = leagueTables.filter(t => t.club_id === club.id);
            const tfaSeasons = clubSeasons.filter(s => getLeagueTier(s.league_id) <= 4);
            const currentTier = getLeagueTier(club.league_id);
            return {
                club,
                tfaSeasons: tfaSeasons.length,
                totalSeasons: clubSeasons.length,
                currentlyInTFA: currentTier <= 4,
                tfaPercentage: clubSeasons.length > 0 ? tfaSeasons.length / clubSeasons.length : 0
            };
        });

        // OPENING - Location identity
        const sizeText = location.settlement_size === 'city' ? 'city' : 
                        location.settlement_size === 'town' ? 'town' : 
                        location.settlement_size === 'village' ? 'village' :
                        location.type === 'settlement' ? 'settlement' :
                        location.type === 'district' ? 'district' : 'region';
        
        const locationName = location.name;
        const locationType = location.type;

        if (locationType === 'settlement') {
            const parentText = location.parent_district 
                ? ` in ${location.parent_district}${location.parent_region ? `, ${location.parent_region}` : ''}`
                : location.parent_region 
                ? ` in ${location.parent_region}` 
                : '';
            
            if (location.is_capital) {
                paragraphs.push(
                    `${locationName} is the beating heart of ${nation?.name || 'the nation'} - the capital ${sizeText}${parentText}. ${location.population ? `With a population of ${location.population.toLocaleString()}, it's` : 'It\'s'} where power, culture, and football converge. ${clubs.length === 0 ? 'Curiously, despite its importance, no major football clubs call it home.' : ''}`
                );
            } else if (clubs.length === 0) {
                paragraphs.push(
                    `${locationName} is a ${sizeText}${parentText} ${location.population ? `of ${location.population.toLocaleString()} people ` : ''}without professional football. The beautiful game exists here in parks and school fields, but no organized club represents the community.`
                );
            } else {
                paragraphs.push(
                    `${locationName} is a ${sizeText}${parentText}${location.population ? ` of ${location.population.toLocaleString()} people` : ''} where football is woven into the fabric of daily life.`
                );
            }
        } else if (locationType === 'district') {
            const parentText = location.parent_region ? ` in ${location.parent_region}` : '';
            paragraphs.push(
                `${locationName} is a district${parentText}, a patchwork of communities ${subLocations.length > 0 ? `including ${subLocations.slice(0, 3).map(s => s.name).join(', ')}${subLocations.length > 3 ? ` and ${subLocations.length - 3} more` : ''}` : 'spread across the landscape'}.`
            );
        } else {
            // Region
            const districtCount = subLocations.filter(s => s.type === 'district').length;
            const settlementCount = subLocations.filter(s => s.type === 'settlement').length;
            paragraphs.push(
                `${locationName} is a region of ${nation?.name || 'the nation'}${districtCount > 0 ? `, encompassing ${districtCount} district${districtCount > 1 ? 's' : ''}` : ''}${settlementCount > 0 ? ` and ${settlementCount} settlement${settlementCount > 1 ? 's' : ''}` : ''}.`
            );
        }

        // CLUB LANDSCAPE
        if (clubs.length > 0) {
            if (isTuruliand) {
                const tfaClubs = clubTfaStatus.filter(c => c.currentlyInTFA);
                const nonLeagueClubs = clubTfaStatus.filter(c => !c.currentlyInTFA);
                const alwaysTfaClubs = clubTfaStatus.filter(c => c.tfaSeasons === c.totalSeasons && c.totalSeasons > 0);
                const neverTfaClubs = clubTfaStatus.filter(c => c.tfaSeasons === 0 && c.totalSeasons > 0);
                const formerTfaClubs = clubTfaStatus.filter(c => !c.currentlyInTFA && c.tfaSeasons > 0);

                if (clubs.length === 1) {
                    const status = clubTfaStatus[0];
                    if (status.currentlyInTFA) {
                        const league = leagues.find(l => l.id === status.club.league_id);
                        paragraphs.push(
                            `Football here means ${status.club.name}, who compete in ${league?.name || 'the TFA'}. ${alwaysTfaClubs.length > 0 ? 'They\'ve always been part of the organized tiers - TFA football is all they know.' : status.tfaSeasons > 0 ? `After ${status.tfaSeasons} seasons in the TFA system, they remain within the structure of organized football.` : 'Remarkably, they compete in the TFA system.'}`
                        );
                    } else if (status.tfaSeasons > 0) {
                        paragraphs.push(
                            `Football here means ${status.club.name}, though they've fallen from grace. Once part of the TFA for ${status.tfaSeasons} season${status.tfaSeasons > 1 ? 's' : ''}, they now compete in the non-league wilderness - a bitter reality for a community that once knew organized football.`
                        );
                    } else {
                        paragraphs.push(
                            `Football here means ${status.club.name}, a non-league club that has never broken into the TFA system. ${status.totalSeasons >= 5 ? `For all ${status.totalSeasons} seasons, they've` : 'They\'ve'} remained in the regional leagues, outside the structure of organized football.`
                        );
                    }
                } else {
                    // Multiple clubs
                    if (tfaClubs.length === clubs.length) {
                        paragraphs.push(
                            `Football runs deep here with ${clubs.length} clubs - ${rankedClubs.slice(0, 3).map(c => c.name).join(', ')}${clubs.length > 3 ? ` and ${clubs.length - 3} more` : ''}. ${alwaysTfaClubs.length === clubs.length ? 'All compete in the TFA system - this is a community where organized football is simply the norm.' : `All ${tfaClubs.length} currently play TFA football, representing the area in the organized tiers.`}`
                        );
                    } else if (tfaClubs.length > 0 && nonLeagueClubs.length > 0) {
                        paragraphs.push(
                            `Football here is a tale of two worlds. ${tfaClubs.map(c => c.club.name).join(' and ')} compete in the TFA's organized structure, while ${nonLeagueClubs.slice(0, 2).map(c => c.club.name).join(' and ')}${nonLeagueClubs.length > 2 ? ` and others` : ''} battle in the non-league wilderness. The divide is stark - one side has regular fixtures and recognition, the other fights for scraps.`
                        );
                    } else {
                        // All non-league
                        paragraphs.push(
                            `Football here exists entirely outside the TFA system. ${clubs.slice(0, 3).map(c => c.name).join(', ')}${clubs.length > 3 ? ` and ${clubs.length - 3} more` : ''} all compete in regional non-league football. ${neverTfaClubs.length === clubs.length ? 'None have ever reached the TFA - organized football remains a distant dream.' : formerTfaClubs.length > 0 ? `${formerTfaClubs.map(c => c.club.name).join(' and ')} remember their TFA days, but now all are trapped in non-league obscurity.` : ''}`
                        );
                    }
                }
            } else {
                // Non-Turuliand standard
                if (hasMultipleClubs) {
                    paragraphs.push(
                        `Football here is fiercely competitive. ${clubs.length} clubs call ${locationName} home: ${rankedClubs.slice(0, 3).map(c => c.name).join(', ')}${clubs.length > 3 ? `, and ${clubs.length - 3} more` : ''}. Derby days are when the ${sizeText} stops - local pride, bragging rights, and supremacy on the line.`
                    );
                } else {
                    const currentLeague = leagues.find(l => l.id === topClub.league_id);
                    const tierText = currentLeague?.tier === 1 ? 'the top flight' : 
                                   currentLeague?.tier === 2 ? 'the second tier' :
                                   currentLeague?.name || 'the leagues';
                    paragraphs.push(
                        `Football here means ${topClub.name}. They represent the community in ${tierText}, carrying the pride of ${locationName} onto the pitch${topClub.stadium ? ` at ${topClub.stadium}` : ''}.`
                    );
                }
            }
        }

        // ACHIEVEMENTS & GLORY
        if (totalTitles > 0 || totalVCC > 0 || totalCCC > 0) {
            const achievementParts = [];
            if (totalTitles > 0) achievementParts.push(`${totalTitles} league title${totalTitles > 1 ? 's' : ''}`);
            if (totalVCC > 0) achievementParts.push(`${totalVCC} VCC title${totalVCC > 1 ? 's' : ''}`);
            if (totalCCC > 0) achievementParts.push(`${totalCCC} CCC title${totalCCC > 1 ? 's' : ''}`);
            
            if (hasMultipleClubs) {
                const titleClubs = clubs.filter(c => (c.league_titles || 0) > 0);
                paragraphs.push(
                    `Between them, the clubs of ${locationName} have claimed ${achievementParts.join(', ')}. ${titleClubs.length > 1 ? `${titleClubs.map(c => c.name).join(' and ')} have both tasted championship glory.` : `${titleClubs[0]?.name || 'The dominant club'} stands above the rest in terms of silverware.`}`
                );
            } else {
                paragraphs.push(
                    `Glory has visited ${locationName}. ${topClub.name} has brought home ${achievementParts.join(' and ')}, giving the community something to celebrate${topClub.title_years ? ` in ${topClub.title_years.split(',').slice(-3).join(', ')}` : ''}.`
                );
            }
        } else if (topFlightClubs.length > 0) {
            if (hasMultipleClubs) {
                paragraphs.push(
                    `${topFlightClubs.length} of the ${clubs.length} clubs have competed in the top flight. ${topFlightClubs[0].name} leads the way with ${topFlightClubs[0].seasons_top_flight} top-tier season${topFlightClubs[0].seasons_top_flight > 1 ? 's' : ''}, proving ${locationName} can compete at the highest level.`
                );
            } else {
                paragraphs.push(
                    `${topClub.name} has represented ${locationName} in the top flight for ${topClub.seasons_top_flight} season${topClub.seasons_top_flight > 1 ? 's' : ''}, proving this community belongs among the elite.`
                );
            }
        } else if (clubs.some(c => (c.promotions || 0) > 0)) {
            const promotionClubs = clubs.filter(c => (c.promotions || 0) > 0);
            paragraphs.push(
                `The clubs here are climbers. ${promotionClubs.length > 1 ? `${promotionClubs.map(c => c.name).join(' and ')} have all` : `${promotionClubs[0].name} has`} earned promotion, fighting their way up the pyramid.`
            );
        }

        // CLOSING - Character and culture
        if (location.culture_description) {
            paragraphs.push(location.culture_description);
        } else if (clubs.length > 0) {
            if (hasMultipleClubs) {
                const rivalText = clubs.length === 2 ? 'Their rivalry' : 'The competition between them';
                paragraphs.push(
                    `${rivalText} defines ${locationName}. In pubs, at work, in schools - everyone has their team, and derby week is when the ${sizeText} comes alive. This is where football fandom isn't just watched - it's lived.`
                );
            } else {
                paragraphs.push(
                    `${topClub.name} is more than a club here - it's identity, community, and pride rolled into one. Match days bring ${locationName} together, united in hope, heartbreak, and unwavering support.`
                );
            }
        } else if (location.landmarks || location.industries) {
            const feature = location.landmarks || location.industries;
            paragraphs.push(
                `Known for ${feature}, ${locationName} awaits the day when organized football takes root. The passion for the game exists - it just needs a team to channel it.`
            );
        }

        return paragraphs;
    };

    const story = generateStory();

    if (story.length === 0) return null;

    return (
        <Card className="border-0 shadow-sm mb-6">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    {location.type === 'settlement' ? <Building2 className="w-5 h-5 text-blue-600" /> : <MapPin className="w-5 h-5 text-emerald-600" />}
                    The Story of {location.name}
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