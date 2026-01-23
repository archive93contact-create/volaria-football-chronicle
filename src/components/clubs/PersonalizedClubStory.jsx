import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function PersonalizedClubStory({ club, nation, league, seasons, leagues, allClubs, location }) {
    if (!club || seasons.length === 0) return null;

    const generateStory = () => {
        const paragraphs = [];
        const sortedSeasons = [...seasons].sort((a, b) => a.year.localeCompare(b.year));
        
        // Helper functions
        const getLeagueTier = (leagueId) => {
            const l = leagues.find(lg => lg.id === leagueId);
            return l?.tier || 1;
        };

        // Location context
        const locationText = club.settlement 
            ? `the ${club.district ? `${club.district} town` : 'town'} of ${club.settlement}${club.region ? ` in ${club.region}` : ''}`
            : club.district 
            ? `${club.district}${club.region ? ` in ${club.region}` : ''}`
            : club.region || club.city || 'their homeland';

        // Club identity and origins
        const foundingText = club.founded_year 
            ? `Founded in ${club.founded_year}`
            : 'Established in the early days of football';
        
        // Check if Turuliand for TFA context
        const isTuruliand = nation?.name === 'Turuliand' || leagues.some(l => l.name?.includes('TFA'));
        const tfaSeasons = isTuruliand ? sortedSeasons.filter(s => getLeagueTier(s.league_id) <= 4) : [];
        const nonTfaSeasons = isTuruliand ? sortedSeasons.filter(s => getLeagueTier(s.league_id) > 4) : [];
        const currentTier = getLeagueTier(club.league_id);

        // OPENING - Location & Identity
        if (isTuruliand) {
            if (tfaSeasons.length === 0 && sortedSeasons.length > 0) {
                // Never reached TFA
                paragraphs.push(
                    `${foundingText} in ${locationText}, ${club.name} has spent their entire ${sortedSeasons.length}-season existence competing in the non-league wilderness beyond the TFA system. While others dream of the bright lights of organized football, this is a club that knows only the grind of regional leagues - sparse fixtures, small crowds, and the anonymity that comes with being outside the top four tiers. ${club.stadium ? `${club.stadium} has never hosted a TFA match.` : 'They remain unknown to most football fans.'}`
                );
            } else if (tfaSeasons.length === sortedSeasons.length) {
                // Always been in TFA
                const highestTier = Math.min(...tfaSeasons.map(s => getLeagueTier(s.league_id)));
                const tierText = highestTier === 1 ? 'the pinnacle of Turuliand football' : 
                               highestTier === 2 ? 'the upper reaches of the TFA' :
                               highestTier === 3 ? 'the heart of the TFA system' : 
                               'the organized tiers';
                paragraphs.push(
                    `${foundingText} in ${locationText}, ${club.name} has been a TFA club from the very beginning. For all ${sortedSeasons.length} seasons of their recorded history, they've competed within the structure and stability of organized football - never knowing the chaos of non-league existence. ${highestTier <= 2 ? `Reaching ${tierText}, they're` : `They're`} a club built for the TFA, where regular fixtures, proper infrastructure, and nationwide recognition are simply the norm.`
                );
            } else if (currentTier > 4 && tfaSeasons.length > 0) {
                // Currently outside TFA, but had TFA history
                const lastTfaYear = [...tfaSeasons].sort((a, b) => b.year.localeCompare(a.year))[0]?.year;
                const seasonsAway = sortedSeasons.filter(s => s.year > lastTfaYear && getLeagueTier(s.league_id) > 4).length;
                const percentage = Math.round((tfaSeasons.length / sortedSeasons.length) * 100);
                
                if (seasonsAway >= 15) {
                    paragraphs.push(
                        `The glory days feel like ancient history for ${club.name}. ${foundingText} in ${locationText}, they spent ${tfaSeasons.length} seasons (${percentage}% of their existence) competing in the TFA before it all fell apart. It's been ${seasonsAway} seasons since ${lastTfaYear}, and the club now languishes in ${league?.name || 'the regional leagues'}, where football is barely recognizable. Fixtures are few, crowds are thin, and the structured world of the TFA feels like a lifetime ago. Younger fans have never seen them play organized football.`
                    );
                } else if (seasonsAway >= 5) {
                    paragraphs.push(
                        `${foundingText} in ${locationText}, ${club.name} knew the stability of TFA football for ${tfaSeasons.length} seasons before dropping into the non-league abyss ${seasonsAway} seasons ago. The contrast is stark - from regular fixtures and proper organization to the chaotic reality of ${league?.name || 'regional football'}, where matches are sparse and infrastructure is minimal. They're ${seasonsAway} seasons removed from ${lastTfaYear}, fighting to reclaim what they once had.`
                    );
                } else {
                    paragraphs.push(
                        `${foundingText} in ${locationText}, ${club.name} is still adjusting to life outside the TFA. After ${tfaSeasons.length} seasons in organized football, they've spent the last ${seasonsAway} season${seasonsAway > 1 ? 's' : ''} in ${league?.name || 'the regional leagues'} since ${lastTfaYear}. The drop is jarring - from the structure of the TFA to the wilderness of non-league football. But the memory of organized football is fresh, and the determination to return burns bright.`
                    );
                }
            } else if (currentTier <= 4 && nonTfaSeasons.length > 0) {
                // Currently in TFA, but came from non-league
                const firstTfaYear = [...tfaSeasons].sort((a, b) => a.year.localeCompare(b.year))[0]?.year;
                const yearsBeforeTfa = sortedSeasons.filter(s => s.year < firstTfaYear).length;
                
                paragraphs.push(
                    `${foundingText} in ${locationText}, ${club.name} knows both worlds intimately. They spent ${yearsBeforeTfa} season${yearsBeforeTfa > 1 ? 's' : ''} battling in non-league obscurity before breaking into the TFA in ${firstTfaYear}. The transformation was profound - from sparse fixtures and anonymity to the structure, stability, and recognition of organized football. Now competing in ${league?.name || 'the TFA'}, they've earned their place among the organized tiers, but they remember where they came from.`
                );
            }
        } else {
            // Non-Turuliand clubs - standard opening
            const currentLeagueType = currentTier === 1 ? 'top flight' : 
                                    currentTier === 2 ? 'second tier' :
                                    currentTier === 3 ? 'third tier' :
                                    `Tier ${currentTier}`;
            paragraphs.push(
                `${foundingText} in ${locationText}, ${club.name} has carved out their place in ${nation?.name || 'their nation'}'s football landscape. ${sortedSeasons.length >= 10 ? `Over ${sortedSeasons.length} recorded seasons, they've` : 'They\'ve'} competed in ${currentLeagueType}, representing their community${club.stadium ? ` at ${club.stadium}` : ''}.`
            );
        }

        // Rivals and local context
        const sameLocationClubs = allClubs.filter(c => 
            c.id !== club.id && 
            (c.settlement === club.settlement || 
             (!club.settlement && c.district === club.district) ||
             (!club.settlement && !club.district && c.region === club.region))
        );

        if (sameLocationClubs.length > 0) {
            const rivalNames = sameLocationClubs.slice(0, 2).map(c => c.name).join(' and ');
            const additionalRivals = sameLocationClubs.length > 2 ? ` and ${sameLocationClubs.length - 2} other${sameLocationClubs.length - 2 > 1 ? 's' : ''}` : '';
            
            paragraphs.push(
                `Football runs deep in ${club.settlement || club.district || club.region}. ${club.name} shares their hometown with ${rivalNames}${additionalRivals}, creating a rich tapestry of local derbies and fierce competition. Every match against their neighbors carries extra weight - pride, bragging rights, and local supremacy are on the line.`
            );
        } else if (club.rival_club_ids?.length > 0) {
            const rivals = club.rival_club_ids
                .map(id => allClubs.find(c => c.id === id))
                .filter(Boolean)
                .slice(0, 2);
            if (rivals.length > 0) {
                const rivalText = rivals.map(r => {
                    const rivalLocation = r.settlement || r.district || r.region;
                    return rivalLocation ? `${r.name} of ${rivalLocation}` : r.name;
                }).join(' and ');
                paragraphs.push(
                    `Their fiercest battles are reserved for clashes with ${rivalText}. These are the matches that define seasons - where history, pride, and passion collide.`
                );
            }
        }

        // Journey and achievements
        const titles = club.league_titles || 0;
        const topFlightSeasons = seasons.filter(s => getLeagueTier(s.league_id) === 1);
        const promotions = club.promotions || 0;
        const relegations = club.relegations || 0;

        if (titles > 0) {
            const titleYears = club.title_years?.split(',').map(y => y.trim()) || [];
            const recentTitle = titleYears.length > 0 ? titleYears[titleYears.length - 1] : null;
            const titleText = titles === 1 ? 'a solitary championship' : `${titles} league titles`;
            
            paragraphs.push(
                `Glory has visited ${club.stadium || 'their ground'}${recentTitle ? ` as recently as ${recentTitle}` : ''}. With ${titleText} to their name, they've proven they can compete at the highest level. ${club.vcc_titles > 0 ? `Their ${club.vcc_titles} VCC title${club.vcc_titles > 1 ? 's' : ''} elevated them to continental royalty.` : club.ccc_titles > 0 ? `Add ${club.ccc_titles} CCC title${club.ccc_titles > 1 ? 's' : ''} and they've tasted continental success too.` : ''}`
            );
        } else if (topFlightSeasons.length > 0) {
            const bestFinish = club.best_finish;
            if (bestFinish && bestFinish <= 3) {
                const finishText = bestFinish === 2 ? 'runners-up' : 'top-three';
                paragraphs.push(
                    `While silverware has remained elusive, ${club.name} has come agonizingly close, finishing ${finishText} in ${club.best_finish_year || 'their best season'}. ${topFlightSeasons.length >= 10 ? `With ${topFlightSeasons.length} seasons in the top flight, they're` : 'They\'re'} perennial contenders, always dangerous, always knocking on the door.`
                );
            } else {
                paragraphs.push(
                    `${club.name} has ${topFlightSeasons.length} top-flight season${topFlightSeasons.length > 1 ? 's' : ''} in their history, proving they belong among the elite. ${club.best_finish ? `Their best finish of ${club.best_finish}${club.best_finish === 1 ? 'st' : club.best_finish === 2 ? 'nd' : club.best_finish === 3 ? 'rd' : 'th'} place ${club.best_finish_year ? `in ${club.best_finish_year}` : ''} remains a source of pride.` : ''}`
                );
            }
        } else if (promotions > 0) {
            paragraphs.push(
                `This is a club that knows the joy of promotion - they've climbed the pyramid ${promotions} time${promotions > 1 ? 's' : ''}${relegations > 0 ? `, though they've also endured ${relegations} relegation${relegations > 1 ? 's' : ''}` : ''}. The journey has been turbulent, but every step up brings them closer to their dreams.`
            );
        } else if (sortedSeasons.length >= 5) {
            const lowestTier = Math.max(...sortedSeasons.map(s => getLeagueTier(s.league_id)));
            const highestTier = Math.min(...sortedSeasons.map(s => getLeagueTier(s.league_id)));
            
            if (lowestTier === highestTier) {
                paragraphs.push(
                    `For all ${sortedSeasons.length} seasons of their recorded history, ${club.name} has remained in Tier ${highestTier}. Consistency is their hallmark - no dramatic rises, no crushing falls, just steady presence at this level.`
                );
            } else {
                paragraphs.push(
                    `Their journey has taken them from Tier ${highestTier} to Tier ${lowestTier} and everywhere in between. ${club.name} is still finding their level, still building toward something greater.`
                );
            }
        }

        // Closing - current status and ambition
        const currentPos = seasons.length > 0 ? seasons[seasons.length - 1].position : null;
        const currentStatus = seasons.length > 0 ? seasons[seasons.length - 1].status : null;

        if (isTuruliand && currentTier > 4 && tfaSeasons.length > 0) {
            paragraphs.push(
                `Today, ${club.name} fights on in ${league?.name || 'the regional leagues'}, far from the TFA structure they once knew. The fixtures are irregular, the crowds are small, and the infrastructure is basic. But within the club, the dream of returning to organized football burns eternal. They've been there before. They can get back.`
            );
        } else if (currentStatus === 'champion') {
            paragraphs.push(
                `The latest chapter? Champions. ${club.name} sit atop ${league?.name || 'their division'}, and the celebrations echo through ${club.settlement || club.district || club.region}. This is their moment.`
            );
        } else if (currentStatus === 'promoted') {
            paragraphs.push(
                `Rising. ${club.name} earned promotion, and next season brings a new challenge at a higher level. The trajectory is upward, the momentum undeniable.`
            );
        } else if (currentStatus === 'relegated') {
            paragraphs.push(
                `The latest season ended in heartbreak - relegation. ${club.name} now regroups, rebuilds, and plots their return. This club has survived worse. They'll be back.`
            );
        } else if (currentPos && currentPos <= 3) {
            paragraphs.push(
                `Currently, ${club.name} sits in ${currentPos === 1 ? '1st' : currentPos === 2 ? '2nd' : '3rd'} place in ${league?.name || 'their league'}. The fight continues, the ambition undimmed.`
            );
        } else {
            paragraphs.push(
                `The story of ${club.name} continues to be written in ${league?.name || 'their current division'}. Every match, every season, another chapter. The ending is yet unwritten.`
            );
        }

        return paragraphs;
    };

    const story = generateStory();

    if (story.length === 0) return null;

    return (
        <Card 
            className="border-0 shadow-sm mb-6" 
            style={{ 
                borderLeft: club.accent_color ? `4px solid ${club.accent_color}` : undefined,
                backgroundColor: club.primary_color ? `${club.primary_color}03` : undefined
            }}
        >
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5" style={{ color: club.accent_color || '#10b981' }} />
                    The {club.name} Story
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