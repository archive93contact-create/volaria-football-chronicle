import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Trophy, TrendingUp, Users, MapPin, Star, Clock, Shield, Landmark, History, Mountain, Trees, Waves, Building, Factory, Globe } from 'lucide-react';

// Detect geographical features from location name
function detectGeography(name) {
    const lowerName = name.toLowerCase();
    const features = [];
    
    // Terrain keywords
    if (/hill|mount|peak|ridge|highland|height|fell|tor|crag/.test(lowerName)) features.push({ type: 'hills', desc: 'hilly terrain' });
    if (/valley|vale|dale|glen|hollow|basin/.test(lowerName)) features.push({ type: 'valley', desc: 'sheltered valley' });
    if (/plain|flat|field|meadow|green|lea/.test(lowerName)) features.push({ type: 'plains', desc: 'open plains' });
    if (/forest|wood|grove|oak|elm|birch|pine|tree/.test(lowerName)) features.push({ type: 'forest', desc: 'forested area' });
    if (/river|stream|brook|water|lake|pond|mere|bay|port|harbour|coast|sea|beach|shore/.test(lowerName)) features.push({ type: 'water', desc: 'waterside location' });
    if (/marsh|fen|bog|moor|heath|swamp/.test(lowerName)) features.push({ type: 'wetland', desc: 'marshy lowlands' });
    if (/stone|rock|cliff|crag|quarry/.test(lowerName)) features.push({ type: 'rocky', desc: 'rocky landscape' });
    if (/bridge|ford|cross|gate|way/.test(lowerName)) features.push({ type: 'crossing', desc: 'historic crossing point' });
    if (/castle|fort|tower|burgh|chester/.test(lowerName)) features.push({ type: 'historic', desc: 'historic fortification' });
    if (/mill|mine|forge|works|pit/.test(lowerName)) features.push({ type: 'industrial', desc: 'industrial heritage' });
    if (/north|south|east|west|upper|lower|mid|central/.test(lowerName)) features.push({ type: 'directional', desc: 'geographic position' });
    if (/new|old|great|little|high|low/.test(lowerName)) features.push({ type: 'descriptive', desc: 'settlement character' });
    
    return features;
}

export default function LocationNarratives({ locationName, locationType, clubs = [], leagues = [], nation, isCapital = false, parentRegion, parentDistrict }) {
    const narratives = useMemo(() => {
        if (!locationName || clubs.length === 0) return [];
        
        const stories = [];
        const totalClubs = clubs.length;
        
        // Geographic features narrative
        const geoFeatures = detectGeography(locationName);
        const parentGeo = parentRegion ? detectGeography(parentRegion) : [];
        const districtGeo = parentDistrict ? detectGeography(parentDistrict) : [];
        
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
        
        // Geographic narrative
        if (geoFeatures.length > 0) {
            const feature = geoFeatures[0];
            let geoIcon = MapPin;
            let geoText = '';
            
            if (feature.type === 'hills' || feature.type === 'rocky') {
                geoIcon = Mountain;
                geoText = `Nestled in ${feature.desc}, ${locationName} has a rugged character that shapes its football culture. The challenging terrain has bred tough, resilient clubs known for their fighting spirit.`;
            } else if (feature.type === 'water') {
                geoIcon = Waves;
                geoText = `${locationName}'s ${feature.desc} has historically connected it to trade and travel. This cosmopolitan influence is reflected in diverse playing styles and strong community support for local clubs.`;
            } else if (feature.type === 'forest') {
                geoIcon = Trees;
                geoText = `Surrounded by ${feature.desc}, ${locationName} has a distinctive identity rooted in its natural setting. Local clubs often bear names and colours inspired by the woodland heritage.`;
            } else if (feature.type === 'industrial') {
                geoIcon = Factory;
                geoText = `With its ${feature.desc}, ${locationName} developed a strong working-class football tradition. Clubs here emerged from factories and mines, carrying the pride of the local workforce.`;
            } else if (feature.type === 'historic') {
                geoIcon = Building;
                geoText = `The ${feature.desc} of ${locationName} speaks to its ancient roots. Football here carries centuries of local pride and tradition, with clubs deeply embedded in the community fabric.`;
            } else if (feature.type === 'valley') {
                geoIcon = Mountain;
                geoText = `Protected by the surrounding hills, the ${feature.desc} of ${locationName} has fostered close-knit communities with fierce loyalty to their local clubs.`;
            } else if (feature.type === 'crossing') {
                geoIcon = Building;
                geoText = `As a ${feature.desc}, ${locationName} has long been a meeting place of people and ideas. This heritage of connection shows in the passionate, well-supported football scene.`;
            }
            
            if (geoText) {
                stories.push({
                    icon: geoIcon,
                    title: 'Landscape & Character',
                    text: geoText,
                    color: 'text-teal-600',
                    bg: 'bg-teal-50'
                });
            }
        }
        
        // Regional context narrative
        if (parentRegion && locationType !== 'region') {
            const regionGeo = detectGeography(parentRegion);
            if (regionGeo.length > 0) {
                const regionFeature = regionGeo[0];
                stories.push({
                    icon: Globe,
                    title: `Part of ${parentRegion}`,
                    text: `Located within the ${parentRegion} region${regionFeature ? `, known for its ${regionFeature.desc}` : ''}. ${locationName} shares the regional football traditions while maintaining its own distinct identity.`,
                    color: 'text-slate-600',
                    bg: 'bg-slate-50'
                });
            }
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
        
        // Rivalry detection - both explicit and dynamic (location-based)
        const clubsWithRivals = clubs.filter(c => c.rival_club_ids?.length > 0);
        const localRivalries = [];
        
        // Explicit rivalries
        clubsWithRivals.forEach(club => {
            club.rival_club_ids?.forEach(rivalId => {
                if (clubs.find(c => c.id === rivalId)) {
                    const rival = clubs.find(c => c.id === rivalId);
                    if (rival && !localRivalries.find(r => 
                        (r.a === club.name && r.b === rival.name) || 
                        (r.a === rival.name && r.b === club.name)
                    )) {
                        localRivalries.push({ a: club.name, b: rival.name, type: 'historic' });
                    }
                }
            });
        });
        
        // Dynamic rivalries - clubs in same settlement/town become natural rivals
        if (locationType === 'settlement' && clubs.length >= 2) {
            // Find top clubs to create natural derby
            const sortedBySuccess = [...clubs].sort((a, b) => 
                ((b.league_titles || 0) + (b.seasons_top_flight || 0)) - 
                ((a.league_titles || 0) + (a.seasons_top_flight || 0))
            );
            
            for (let i = 0; i < Math.min(sortedBySuccess.length - 1, 3); i++) {
                for (let j = i + 1; j < Math.min(sortedBySuccess.length, 4); j++) {
                    const clubA = sortedBySuccess[i];
                    const clubB = sortedBySuccess[j];
                    // Check if this rivalry already exists
                    if (!localRivalries.find(r => 
                        (r.a === clubA.name && r.b === clubB.name) || 
                        (r.a === clubB.name && r.b === clubA.name)
                    )) {
                        localRivalries.push({ a: clubA.name, b: clubB.name, type: 'local' });
                    }
                }
            }
        }
        
        if (localRivalries.length > 0) {
            const historicRivalries = localRivalries.filter(r => r.type === 'historic');
            const localDerbies = localRivalries.filter(r => r.type === 'local');
            
            if (historicRivalries.length > 0) {
                const rivalryText = historicRivalries.length === 1 
                    ? `The historic rivalry between ${historicRivalries[0].a} and ${historicRivalries[0].b} defines local football, with derby matches the most anticipated fixtures of the season.`
                    : `Historic derbies including ${historicRivalries.slice(0, 2).map(r => `${r.a} vs ${r.b}`).join(' and ')} create an intense football atmosphere.`;
                
                stories.push({
                    icon: Users,
                    title: 'Historic Rivalries',
                    text: rivalryText,
                    color: 'text-red-600',
                    bg: 'bg-red-50'
                });
            }
            
            if (localDerbies.length > 0 && historicRivalries.length === 0) {
                const derbyText = localDerbies.length === 1 
                    ? `${localDerbies[0].a} and ${localDerbies[0].b} contest the local derby, a fixture born from shared streets and neighbourhood pride.`
                    : `Multiple local derbies fuel the passion here, with ${localDerbies.slice(0, 2).map(r => `${r.a} vs ${r.b}`).join(' and ')} being the most intense.`;
                
                stories.push({
                    icon: Users,
                    title: 'Local Derbies',
                    text: derbyText,
                    color: 'text-orange-600',
                    bg: 'bg-orange-50'
                });
            }
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