import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe, BookOpen } from 'lucide-react';

export default function PersonalizedNationStory({ nation, leagues, clubs, seasons, coefficients }) {
    if (!nation || !leagues || leagues.length === 0) return null;

    const story = useMemo(() => {
        const paragraphs = [];

        // Sort leagues by tier
        const sortedLeagues = [...leagues].sort((a, b) => (a.tier || 1) - (b.tier || 1));
        const topLeague = sortedLeagues[0];
        const maxTier = Math.max(...leagues.map(l => l.tier || 1));
        
        // Get all seasons for timeline
        const allSeasons = seasons.sort((a, b) => a.year.localeCompare(b.year));
        const firstYear = allSeasons[0]?.year;
        const latestYear = allSeasons[allSeasons.length - 1]?.year;

        // Calculate pyramid depth and structure
        const tierCounts = {};
        leagues.forEach(l => {
            const tier = l.tier || 1;
            tierCounts[tier] = (tierCounts[tier] || 0) + 1;
        });

        // Turuliand specific
        const isTuruliand = nation.name === 'Turuliand';
        const tfaLeagues = isTuruliand ? leagues.filter(l => l.tier <= 4) : [];
        const nonLeagueCount = isTuruliand ? leagues.filter(l => l.tier > 4).length : 0;
        const tfaClubCount = isTuruliand ? clubs.filter(c => {
            const league = leagues.find(l => l.id === c.league_id);
            return league?.tier <= 4;
        }).length : 0;

        // OPENING - Nation identity and football culture
        const membership = nation.membership === 'VCC' ? 'VCC (Volarian Champions Cup)' : 
                          nation.membership === 'CCC' ? 'CCC (Continental Challenge Cup)' :
                          'continental football';
        
        const foundingText = nation.founded_year 
            ? `organized football began in ${nation.founded_year}`
            : 'football has deep roots';

        paragraphs.push(
            `${nation.name} - ${nation.description || `a nation where ${foundingText}`}. ${nation.membership ? `A ${nation.membership} member nation, they compete in the ${membership}.` : ''} ${nation.football_history ? nation.football_history : `With ${clubs.length} football clubs spread across the country, the beautiful game is woven into the national fabric.`}`
        );

        // LEAGUE SYSTEM STRUCTURE
        if (isTuruliand) {
            paragraphs.push(
                `The football pyramid is split into two worlds. At the top sits the TFA (Turuliand Football Association) system - Tiers 1 through 4, where ${tfaClubCount} clubs compete in organized football with structure, stability, and nationwide recognition. ${tfaLeagues[0]?.name || 'The top tier'} sits at the summit, followed by ${tfaLeagues.slice(1, 3).map(l => l.name).join(', ')}, and ${tfaLeagues.length > 3 ? `${tfaLeagues.length - 3} more TFA division${tfaLeagues.length - 3 > 1 ? 's' : ''}` : 'the lower TFA tiers'}. Below Tier 4, the structure collapses into the non-league wilderness - ${nonLeagueCount} regional league${nonLeagueCount > 1 ? 's' : ''} where fixtures are sparse, infrastructure is minimal, and clubs exist in obscurity. For Turuliand's footballers, the TFA is the dream.`
            );
        } else {
            const pyramidDescription = maxTier === 1 
                ? `a single ${topLeague.name}` 
                : maxTier <= 3 
                ? `${leagues.length} division${leagues.length > 1 ? 's' : ''} spanning ${maxTier} tier${maxTier > 1 ? 's' : ''}`
                : `${leagues.length} division${leagues.length > 1 ? 's' : ''} across ${maxTier} tier${maxTier > 1 ? 's' : ''} - a deep, complex pyramid`;

            paragraphs.push(
                `The national league system consists of ${pyramidDescription}. ${topLeague.name} crowns the structure${topLeague.founded_year ? `, established in ${topLeague.founded_year}` : ''}. ${maxTier > 1 ? `Below it, ${leagues.slice(1, 3).map(l => l.name).join(', ')}${leagues.length > 3 ? ` and ${leagues.length - 3} more division${leagues.length - 3 > 1 ? 's' : ''}` : ''} provide pathways for ambition and relegation battles for survival.` : ''}`
            );
        }

        // HISTORICAL TIMELINE
        if (firstYear && latestYear) {
            const totalSeasons = allSeasons.length;
            paragraphs.push(
                `Organized football in ${nation.name} has a recorded history stretching from ${firstYear} to ${latestYear}${totalSeasons > 10 ? ` - ${totalSeasons} seasons of competition, triumph, and heartbreak` : ''}. ${topLeague.most_titles ? `${topLeague.most_titles} has proven themselves the nation's most successful club.` : 'Multiple clubs have claimed glory over the years.'}`
            );
        }

        // CLUB DISTRIBUTION & GEOGRAPHY
        const totalClubs = clubs.length;
        if (totalClubs > 0) {
            // Find most club-dense locations
            const locationCounts = {};
            clubs.forEach(c => {
                const loc = c.settlement || c.city || c.district || c.region;
                if (loc) locationCounts[loc] = (locationCounts[loc] || 0) + 1;
            });
            const topLocations = Object.entries(locationCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3);

            paragraphs.push(
                `${totalClubs} football clubs call ${nation.name} home, spread across ${nation.capital ? `the capital ${nation.capital}` : 'the nation'}${topLocations.length > 0 ? `, ${topLocations.map(([loc, count]) => `${loc} (${count})`).join(', ')}, and beyond` : ''}. ${isTuruliand ? `${tfaClubCount} compete in the TFA system, while ${totalClubs - tfaClubCount} battle in the non-league tiers below.` : 'Each represents their community, their region, and their identity.'}`
            );
        }

        // CONTINENTAL STANDING
        if (coefficients && coefficients.length > 0) {
            const latestCoeff = coefficients.sort((a, b) => b.coefficient_year.localeCompare(a.coefficient_year))[0];
            const rankChange = latestCoeff.previous_rank 
                ? latestCoeff.rank < latestCoeff.previous_rank ? '↑' : latestCoeff.rank > latestCoeff.previous_rank ? '↓' : '='
                : '';
            
            paragraphs.push(
                `On the continental stage, ${nation.name} ranks ${latestCoeff.rank}${latestCoeff.rank === 1 ? 'st' : latestCoeff.rank === 2 ? 'nd' : latestCoeff.rank === 3 ? 'rd' : 'th'} in the ${nation.membership || 'continental'} coefficient rankings${rankChange ? ` (${rankChange})` : ''}. ${latestCoeff.vcc_spots > 0 ? `They receive ${latestCoeff.vcc_spots} VCC spot${latestCoeff.vcc_spots > 1 ? 's' : ''}${latestCoeff.ccc_spots > 0 ? ` and ${latestCoeff.ccc_spots} CCC spot${latestCoeff.ccc_spots > 1 ? 's' : ''}` : ''}.` : latestCoeff.ccc_spots > 0 ? `They receive ${latestCoeff.ccc_spots} CCC spot${latestCoeff.ccc_spots > 1 ? 's' : ''}.` : ''}`
            );
        }

        // CLOSING - National character
        if (nation.culture) {
            paragraphs.push(nation.culture);
        } else if (nation.famous_for) {
            paragraphs.push(
                `Known for ${nation.famous_for.toLowerCase()}, ${nation.name}'s football reflects the national character - ${totalClubs > 50 ? 'passionate, widespread, and deeply embedded in society' : totalClubs > 20 ? 'growing, ambitious, and increasingly competitive' : 'intimate, community-focused, and fiercely proud'}. ${topLeague.name} is more than a league - it's where the nation's identity plays out, week after week, season after season.`
            );
        } else {
            paragraphs.push(
                `Football in ${nation.name} isn't just sport - it's culture, community, and identity. ${isTuruliand ? 'The TFA system provides structure to some, while others fight in the shadows below.' : 'From the top flight to the lower tiers, every club carries the dreams of their supporters.'} This is a nation where football matters.`
            );
        }

        return paragraphs;
    }, [nation, leagues, clubs, seasons, coefficients]);

    return (
        <Card 
            className="border-0 shadow-sm mb-6"
            style={{
                borderLeft: nation.primary_color ? `4px solid ${nation.primary_color}` : undefined,
                backgroundColor: nation.primary_color ? `${nation.primary_color}03` : undefined
            }}
        >
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Globe className="w-5 h-5" style={{ color: nation.primary_color || '#10b981' }} />
                    The {nation.name} Football Story
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