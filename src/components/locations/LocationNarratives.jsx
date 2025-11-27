import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Trophy, TrendingUp, Users, MapPin, Star, Clock, Shield, Landmark, History } from 'lucide-react';

export default function LocationNarratives({ locationName, locationType, clubs = [], leagues = [], nation, isCapital = false }) {
    const narratives = useMemo(() => {
        if (!locationName || clubs.length === 0) return [];
        
        const stories = [];
        const totalClubs = clubs.length;
        
        // Get club statistics
        const totalLeagueTitles = clubs.reduce((sum, c) => sum + (c.league_titles || 0), 0);
        const totalCupTitles = clubs.reduce((sum, c) => sum + (c.domestic_cup_titles || 0), 0);
        const totalContinental = clubs.reduce((sum, c) => sum + (c.vcc_titles || 0) + (c.ccc_titles || 0), 0);
        const topFlightClubs = clubs.filter(c => {
            const league = leagues.find(l => l.id === c.league_id);
            return league?.tier === 1;
        });
        
        // Find oldest club
        const clubsWithYear = clubs.filter(c => c.founded_year);
        const oldestClub = clubsWithYear.sort((a, b) => a.founded_year - b.founded_year)[0];
        
        // Find most successful club
        const mostSuccessful = [...clubs].sort((a, b) => 
            ((b.league_titles || 0) + (b.domestic_cup_titles || 0)) - 
            ((a.league_titles || 0) + (a.domestic_cup_titles || 0))
        )[0];
        
        // Capital city narrative
        if (isCapital) {
            stories.push({
                icon: Landmark,
                title: 'National Capital',
                text: `As the capital of ${nation?.name || 'the nation'}, ${locationName} is the political and cultural heart of the country. The city's status brings prestige to its football clubs and attracts talent from across the nation.`,
                color: 'text-purple-600',
                bg: 'bg-purple-50'
            });
        }
        
        // Location size narrative
        if (locationType === 'region') {
            if (totalClubs >= 20) {
                stories.push({
                    icon: MapPin,
                    title: 'Major Football Region',
                    text: `With ${totalClubs} clubs, this is one of the most significant football regions in the country. The depth of footballing infrastructure here speaks to a passionate sporting culture.`,
                    color: 'text-emerald-600',
                    bg: 'bg-emerald-50'
                });
            } else if (totalClubs >= 10) {
                stories.push({
                    icon: MapPin,
                    title: 'Established Football Region',
                    text: `Home to ${totalClubs} clubs across various tiers, this region has a well-developed football ecosystem with competitive leagues at multiple levels.`,
                    color: 'text-blue-600',
                    bg: 'bg-blue-50'
                });
            } else {
                stories.push({
                    icon: MapPin,
                    title: 'Developing Football Region',
                    text: `With ${totalClubs} club${totalClubs !== 1 ? 's' : ''}, football in this region is growing. Local communities are building the foundations for future success.`,
                    color: 'text-slate-600',
                    bg: 'bg-slate-50'
                });
            }
        } else if (locationType === 'district') {
            if (totalClubs >= 10) {
                stories.push({
                    icon: MapPin,
                    title: 'Football Hotbed',
                    text: `This district punches above its weight with ${totalClubs} clubs. Local rivalries and passionate supporters make matchdays special occasions.`,
                    color: 'text-emerald-600',
                    bg: 'bg-emerald-50'
                });
            } else if (totalClubs >= 5) {
                stories.push({
                    icon: MapPin,
                    title: 'Active Football District',
                    text: `${totalClubs} clubs call this district home, creating a vibrant local football scene with regular derby matches and community engagement.`,
                    color: 'text-blue-600',
                    bg: 'bg-blue-50'
                });
            }
        } else {
            // Settlement
            if (totalClubs >= 5) {
                stories.push({
                    icon: MapPin,
                    title: 'Football City',
                    text: `A true football city with ${totalClubs} clubs competing at various levels. The local population has plenty of teams to support and rivalries to follow.`,
                    color: 'text-emerald-600',
                    bg: 'bg-emerald-50'
                });
            } else if (totalClubs >= 2) {
                stories.push({
                    icon: Users,
                    title: 'Local Derby Town',
                    text: `With ${totalClubs} clubs, this town enjoys the passion of local derbies. These matches are the highlight of the sporting calendar.`,
                    color: 'text-blue-600',
                    bg: 'bg-blue-50'
                });
            } else {
                stories.push({
                    icon: Shield,
                    title: 'One-Club Town',
                    text: `The town rallies behind its sole representative in the football pyramid. United support gives the club a strong identity and passionate fanbase.`,
                    color: 'text-amber-600',
                    bg: 'bg-amber-50'
                });
            }
        }
        
        // Football history - oldest club
        if (oldestClub && oldestClub.founded_year) {
            const age = 2024 - oldestClub.founded_year;
            if (age >= 100) {
                stories.push({
                    icon: History,
                    title: 'Century of Football',
                    text: `Football has been played here for over ${age} years. ${oldestClub.name}, founded in ${oldestClub.founded_year}, is the oldest club and a cornerstone of local sporting heritage.`,
                    color: 'text-amber-600',
                    bg: 'bg-amber-50'
                });
            } else if (age >= 50) {
                stories.push({
                    icon: Clock,
                    title: 'Established Football Heritage',
                    text: `${oldestClub.name} has been representing the area since ${oldestClub.founded_year}, laying the foundations for ${age} years of local football history.`,
                    color: 'text-slate-600',
                    bg: 'bg-slate-50'
                });
            }
        }
        
        // Success narrative
        if (totalLeagueTitles > 0 || totalCupTitles > 0) {
            const totalTrophies = totalLeagueTitles + totalCupTitles;
            if (totalTrophies >= 20) {
                stories.push({
                    icon: Trophy,
                    title: 'Trophy Heartland',
                    text: `Clubs from this area have claimed an impressive ${totalTrophies} major domestic trophies (${totalLeagueTitles} league, ${totalCupTitles} cup). This is one of the most successful footballing regions in the country.`,
                    color: 'text-amber-600',
                    bg: 'bg-amber-50'
                });
            } else if (totalTrophies >= 5) {
                stories.push({
                    icon: Trophy,
                    title: 'Winning Tradition',
                    text: `Local clubs have won ${totalTrophies} major trophies between them, establishing a proud winning tradition in the area.`,
                    color: 'text-amber-600',
                    bg: 'bg-amber-50'
                });
            } else {
                stories.push({
                    icon: Trophy,
                    title: 'Taste of Glory',
                    text: `The area has produced ${totalTrophies} major trophy winner${totalTrophies !== 1 ? 's' : ''}, giving locals moments of sporting glory to celebrate.`,
                    color: 'text-yellow-600',
                    bg: 'bg-yellow-50'
                });
            }
        }
        
        // Continental success
        if (totalContinental > 0) {
            stories.push({
                icon: Star,
                title: 'Continental Fame',
                text: `Clubs from this area have achieved ${totalContinental} continental title${totalContinental !== 1 ? 's' : ''}, putting this location on the map of Volarian football.`,
                color: 'text-purple-600',
                bg: 'bg-purple-50'
            });
        }
        
        // Top flight presence
        if (topFlightClubs.length > 0) {
            if (topFlightClubs.length >= 3) {
                stories.push({
                    icon: TrendingUp,
                    title: 'Elite Football Hub',
                    text: `With ${topFlightClubs.length} clubs in the top flight, this area is heavily represented at the highest level of the domestic game.`,
                    color: 'text-emerald-600',
                    bg: 'bg-emerald-50'
                });
            } else {
                stories.push({
                    icon: TrendingUp,
                    title: 'Top Flight Representation',
                    text: `${topFlightClubs.map(c => c.name).join(' and ')} represent${topFlightClubs.length === 1 ? 's' : ''} the area in the top division, flying the flag at the highest level.`,
                    color: 'text-blue-600',
                    bg: 'bg-blue-50'
                });
            }
        }
        
        // Most successful club spotlight
        if (mostSuccessful && ((mostSuccessful.league_titles || 0) + (mostSuccessful.domestic_cup_titles || 0)) > 0) {
            const titles = (mostSuccessful.league_titles || 0) + (mostSuccessful.domestic_cup_titles || 0);
            stories.push({
                icon: Shield,
                title: 'Local Powerhouse',
                text: `${mostSuccessful.name} stands as the most successful club in the area with ${titles} major trophies, dominating local football and inspiring generations.`,
                color: 'text-indigo-600',
                bg: 'bg-indigo-50'
            });
        }
        
        // Rivalry detection
        const clubsWithRivals = clubs.filter(c => c.rival_club_ids?.length > 0);
        const localRivalries = [];
        clubsWithRivals.forEach(club => {
            club.rival_club_ids?.forEach(rivalId => {
                if (clubs.find(c => c.id === rivalId)) {
                    const rival = clubs.find(c => c.id === rivalId);
                    if (rival && !localRivalries.find(r => 
                        (r.a === club.name && r.b === rival.name) || 
                        (r.a === rival.name && r.b === club.name)
                    )) {
                        localRivalries.push({ a: club.name, b: rival.name });
                    }
                }
            });
        });
        
        if (localRivalries.length > 0) {
            const rivalryText = localRivalries.length === 1 
                ? `The rivalry between ${localRivalries[0].a} and ${localRivalries[0].b} defines local football, with derby matches the most anticipated fixtures of the season.`
                : `Multiple local derbies including ${localRivalries.slice(0, 2).map(r => `${r.a} vs ${r.b}`).join(' and ')} create an intense football atmosphere.`;
            
            stories.push({
                icon: Users,
                title: 'Derby Fever',
                text: rivalryText,
                color: 'text-red-600',
                bg: 'bg-red-50'
            });
        }
        
        return stories.slice(0, 6);
    }, [locationName, locationType, clubs, leagues, nation, isCapital]);

    if (narratives.length === 0) return null;

    return (
        <Card className="border-0 shadow-sm mb-6">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <BookOpen className="w-5 h-5 text-emerald-600" />
                    {locationName} Football Story
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {narratives.map((story, idx) => (
                        <div key={idx} className={`p-4 rounded-lg ${story.bg}`}>
                            <div className="flex items-start gap-3">
                                <story.icon className={`w-5 h-5 ${story.color} mt-0.5`} />
                                <div>
                                    <h4 className={`font-semibold ${story.color}`}>{story.title}</h4>
                                    <p className="text-sm text-slate-600 mt-1">{story.text}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}