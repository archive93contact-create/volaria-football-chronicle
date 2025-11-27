import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createPageUrl } from '@/utils';
import { MapPin, Users, Globe, Trophy, BarChart3, Languages } from 'lucide-react';

// Analyze patterns from club/league names to determine cultural identity
function analyzeNamingPatterns(clubs, leagues) {
    const allNames = [
        ...clubs.map(c => c.name),
        ...clubs.map(c => c.city).filter(Boolean),
        ...clubs.map(c => c.settlement).filter(Boolean),
        ...leagues.map(l => l.name)
    ].join(' ').toLowerCase();
    
    // Count linguistic markers
    const patterns = {
        nordic: (allNames.match(/borg|heim|stad|vik|fjord|dal|sen|sson|berg|lund|by/g) || []).length,
        germanic: (allNames.match(/burg|stein|wald|dorf|hausen|bach|brück|thal|kirch|feld/g) || []).length,
        slavic: (allNames.match(/grad|gorod|ovic|enko|owski|czyk|ska|pol|mir|slav/g) || []).length,
        romance: (allNames.match(/ville|mont|port|mare|lago|torre|campo|rio|valle|bella/g) || []).length,
        celtic: (allNames.match(/glen|loch|ben|dun|kil|aber|inver|bally|rath|caer/g) || []).length,
        iberian: (allNames.match(/nueva|nuevo|san\s|santa|del\s|real|athletic|deportivo|vila/g) || []).length,
        turkic: (allNames.match(/köy|tepe|dağ|su|gol|bey|han|pazar|kale|ova/g) || []).length,
        anglo: (allNames.match(/ton|ham|ley|ford|wich|bury|field|chester|pool|wood|bridge|gate|worth/g) || []).length
    };
    
    // Find dominant pattern
    let maxCount = 0;
    let dominant = null;
    for (const [key, count] of Object.entries(patterns)) {
        if (count > maxCount) {
            maxCount = count;
            dominant = key;
        }
    }
    
    return { patterns, dominant, strength: maxCount };
}

// Generate a fictional language based on nation name patterns and club/league names
function generateLanguage(nationName, clubs = [], leagues = []) {
    if (!nationName) return null;
    
    const name = nationName.toLowerCase();
    const naming = analyzeNamingPatterns(clubs, leagues);
    
    // If we have strong naming patterns from clubs/leagues, use those
    if (naming.strength >= 3) {
        const langMap = {
            nordic: { name: 'Nordisk', family: 'North Volarian' },
            germanic: { name: 'Germisch', family: 'Central Volarian' },
            slavic: { name: 'Slavnik', family: 'East Volarian' },
            romance: { name: 'Romanik', family: 'South Volarian' },
            celtic: { name: 'Celtish', family: 'West Volarian' },
            iberian: { name: 'Iberish', family: 'South-West Volarian' },
            turkic: { name: 'Turkik', family: 'Far East Volarian' },
            anglo: { name: 'Anglish', family: 'Maritime Volarian' }
        };
        if (naming.dominant && langMap[naming.dominant]) {
            return langMap[naming.dominant];
        }
    }
    
    // Fall back to nation name analysis
    // Nordic patterns
    if (/land$|heim$|borg$|stad$|mark$|vik$/i.test(nationName) || /^(nord|ost|syd|vest)/i.test(name)) {
        return { name: 'Nordisk', family: 'North Volarian' };
    }
    // Germanic patterns
    if (/reich$|burg$|berg$|stein$|wald$/i.test(nationName) || /^(gross|klein|alt|neu)/i.test(name)) {
        return { name: 'Germisch', family: 'Central Volarian' };
    }
    // Slavic patterns
    if (/ia$|ovia$|slav|grad$|gorod$/i.test(nationName)) {
        return { name: 'Slavnik', family: 'East Volarian' };
    }
    // Romance/Latin patterns
    if (/ia$|onia$|ania$|ana$/i.test(nationName) && !/slav/i.test(name)) {
        return { name: 'Romanik', family: 'South Volarian' };
    }
    // Celtic patterns
    if (/ire$|alba$|cymr|gael/i.test(name)) {
        return { name: 'Celtish', family: 'West Volarian' };
    }
    // Mediterranean patterns
    if (/^(san|santa|monte|porto|costa)/i.test(name) || /ino$|ese$/i.test(nationName)) {
        return { name: 'Mediterran', family: 'Coastal Volarian' };
    }
    // Iberian patterns
    if (/^(nueva|nuevo|el\s|la\s)/i.test(name) || /ón$|án$/i.test(nationName)) {
        return { name: 'Iberish', family: 'South-West Volarian' };
    }
    // Turkic/Eastern patterns
    if (/stan$|istan$|kaz|turk|azer/i.test(name)) {
        return { name: 'Turkik', family: 'Far East Volarian' };
    }
    // Default based on first letter groups
    const firstChar = name.charAt(0);
    if ('aeiou'.includes(firstChar)) {
        return { name: 'Aelian', family: 'Island Volarian' };
    } else if ('bcdgkpt'.includes(firstChar)) {
        return { name: 'Balrik', family: 'Highland Volarian' };
    } else if ('fhjlmnrsw'.includes(firstChar)) {
        return { name: 'Fenrik', family: 'Lowland Volarian' };
    }
    
    return { name: 'Volarian Common', family: 'Standard Volarian' };
}

// Estimate population based on football infrastructure and membership
function estimatePopulation(clubs, leagues, membership) {
    const clubCount = clubs.length;
    const maxTier = Math.max(...leagues.map(l => l.tier || 1), 1);
    const divisionsCount = leagues.length;
    
    // Base population per club (varies by tier structure)
    let basePerClub = 50000; // 50k per club baseline
    
    if (maxTier >= 4) basePerClub = 80000; // Deep pyramid = larger nation
    if (maxTier >= 6) basePerClub = 100000;
    if (maxTier <= 2) basePerClub = 40000; // Shallow pyramid = smaller
    
    // VCC members tend to be larger nations
    let membershipMultiplier = 1.0;
    if (membership === 'VCC') {
        membershipMultiplier = 1.3; // Full members are typically larger
    } else if (membership === 'CCC') {
        membershipMultiplier = 0.85; // Associate members typically smaller
    }
    
    // Factor in divisions (more leagues = bigger nation)
    const divisionMultiplier = 1 + (divisionsCount * 0.05);
    
    const estimated = Math.round(clubCount * basePerClub * divisionMultiplier * membershipMultiplier);
    
    // Return formatted with tier description
    if (estimated >= 10000000) {
        return { value: estimated, display: `${(estimated / 1000000).toFixed(1)}M`, tier: 'Major Power' };
    } else if (estimated >= 5000000) {
        return { value: estimated, display: `${(estimated / 1000000).toFixed(1)}M`, tier: 'Large Nation' };
    } else if (estimated >= 2000000) {
        return { value: estimated, display: `${(estimated / 1000000).toFixed(1)}M`, tier: 'Medium Nation' };
    } else if (estimated >= 500000) {
        return { value: estimated, display: `${Math.round(estimated / 1000)}K`, tier: 'Small Nation' };
    } else {
        return { value: estimated, display: `${Math.round(estimated / 1000)}K`, tier: 'Micro State' };
    }
}

// Estimate league strength based on various factors including membership
function estimateLeagueStrength(clubs, leagues, coefficient, membership) {
    let score = 0;
    
    // Base from membership status - VCC members have stronger leagues
    if (membership === 'VCC') {
        score += 15; // Full members get a base boost
    } else if (membership === 'CCC') {
        score += 5; // Associates get smaller boost
    }
    
    // Base from coefficient rank
    if (coefficient?.rank) {
        if (coefficient.rank <= 5) score += 35;
        else if (coefficient.rank <= 10) score += 25;
        else if (coefficient.rank <= 20) score += 15;
        else score += 8;
    }
    
    // Clubs with continental success
    const vccWinners = clubs.filter(c => c.vcc_titles > 0).length;
    const cccWinners = clubs.filter(c => c.ccc_titles > 0).length;
    score += vccWinners * 10;
    score += cccWinners * 5;
    
    // Depth of pyramid
    const maxTier = Math.max(...leagues.map(l => l.tier || 1), 1);
    score += maxTier * 3;
    
    // Number of top-flight clubs
    const topFlightLeagues = leagues.filter(l => l.tier === 1);
    const topFlightTeams = topFlightLeagues.reduce((sum, l) => sum + (l.number_of_teams || 12), 0);
    score += Math.min(topFlightTeams, 20);
    
    // Cap at 100
    score = Math.min(score, 100);
    
    if (score >= 80) return { score, tier: 'Elite', color: 'text-amber-500', bg: 'bg-amber-50' };
    if (score >= 60) return { score, tier: 'Strong', color: 'text-emerald-500', bg: 'bg-emerald-50' };
    if (score >= 40) return { score, tier: 'Developing', color: 'text-blue-500', bg: 'bg-blue-50' };
    if (score >= 20) return { score, tier: 'Emerging', color: 'text-purple-500', bg: 'bg-purple-50' };
    return { score, tier: 'Growing', color: 'text-slate-500', bg: 'bg-slate-50' };
}

// Generate capital city name based on nation name and club/league naming patterns
function generateCapital(nationName, clubs, leagues) {
    // First check if any club is in a city that sounds like a capital
    const settlements = [...new Set(clubs.map(c => c.settlement || c.city).filter(Boolean))];
    
    // Look for common capital-sounding patterns in existing data
    const capitalPatterns = settlements.find(s => 
        /city|capital|royal|central|metro/i.test(s) ||
        s.toLowerCase().includes(nationName.toLowerCase().substring(0, 4))
    );
    if (capitalPatterns) return capitalPatterns;
    
    // Look for the settlement with most clubs (likely the capital)
    const settlementCounts = {};
    clubs.forEach(c => {
        const s = c.settlement || c.city;
        if (s) settlementCounts[s] = (settlementCounts[s] || 0) + 1;
    });
    const mostPopular = Object.entries(settlementCounts).sort((a, b) => b[1] - a[1])[0];
    if (mostPopular && mostPopular[1] >= 3) {
        return mostPopular[0]; // If a city has 3+ clubs, it's probably the capital
    }
    
    // Analyze naming patterns to determine appropriate suffix
    const naming = analyzeNamingPatterns(clubs, leagues);
    const baseName = nationName.replace(/land$|ia$|stan$|burg$|reich$|onia$|ania$/i, '');
    
    // Choose suffix based on dominant naming pattern
    const suffixMap = {
        nordic: ['borg', 'heim', 'stad', 'by'],
        germanic: ['burg', 'stadt', 'haven', 'dorf'],
        slavic: ['grad', 'gorod', 'pol', 'ov'],
        romance: ['ville', 'polis', 'monte', 'porto'],
        celtic: ['dun', 'caer', 'haven', 'ford'],
        iberian: [' Real', ' Central', 'villa', 'puerto'],
        turkic: ['kent', 'kale', 'şehir', 'abad'],
        anglo: ['ton', 'chester', 'ford', 'bury']
    };
    
    let suffixes = ['burg', 'polis', 'haven', 'ton', ' City'];
    if (naming.dominant && suffixMap[naming.dominant]) {
        suffixes = suffixMap[naming.dominant];
    }
    
    // Pick based on hash of name for consistency
    const hash = nationName.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const suffix = suffixes[hash % suffixes.length];
    
    // Handle space-prefixed suffixes
    if (suffix.startsWith(' ')) {
        return baseName + suffix;
    }
    return baseName + suffix;
}

export default function NationStats({ nation, clubs = [], leagues = [], coefficient }) {
    const stats = useMemo(() => {
        if (!nation) return null;
        
        const population = estimatePopulation(clubs, leagues, nation.membership);
        const strength = estimateLeagueStrength(clubs, leagues, coefficient, nation.membership);
        const language = nation.language ? { name: nation.language } : generateLanguage(nation.name, clubs, leagues);
        const capital = nation.capital || generateCapital(nation.name, clubs, leagues);
        
        // Get unique regions/districts
        const regions = [...new Set(clubs.map(c => c.region).filter(Boolean))];
        const districts = [...new Set(clubs.map(c => c.district).filter(Boolean))];
        const settlements = [...new Set(clubs.map(c => c.settlement || c.city).filter(Boolean))];
        
        return {
            population,
            strength,
            language,
            capital,
            regions,
            districts,
            settlements
        };
    }, [nation, clubs, leagues, coefficient]);

    if (!stats) return null;

    return (
        <Card className="border-0 shadow-sm mb-6">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Globe className="w-5 h-5 text-emerald-600" />
                    Nation Profile
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {/* Capital */}
                    <Link 
                        to={stats.capital ? createPageUrl(`LocationDetail?name=${encodeURIComponent(stats.capital)}&type=settlement&nation_id=${nation.id}`) : '#'}
                        className="p-3 bg-gradient-to-br from-amber-50 to-yellow-50 rounded-lg hover:shadow-md transition-shadow"
                    >
                        <div className="flex items-center gap-2 text-amber-600 text-xs mb-1">
                            <MapPin className="w-3 h-3" />
                            Capital ⭐
                        </div>
                        <div className="font-semibold text-amber-800">{stats.capital}</div>
                    </Link>

                    {/* Population */}
                    <div className="p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                            <Users className="w-3 h-3" />
                            Population
                        </div>
                        <div className="font-semibold text-slate-800">{stats.population.display}</div>
                        <div className="text-xs text-slate-500">{stats.population.tier}</div>
                    </div>

                    {/* Language */}
                    <div className="p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                            <Languages className="w-3 h-3" />
                            Language
                        </div>
                        <div className="font-semibold text-slate-800">{stats.language?.name}</div>
                        {stats.language?.family && (
                            <div className="text-xs text-slate-500">{stats.language.family}</div>
                        )}
                    </div>

                    {/* League Strength */}
                    <div className={`p-3 rounded-lg ${stats.strength.bg}`}>
                        <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                            <BarChart3 className="w-3 h-3" />
                            League Strength
                        </div>
                        <div className={`font-semibold ${stats.strength.color}`}>{stats.strength.tier}</div>
                        <div className="text-xs text-slate-500">Score: {stats.strength.score}/100</div>
                    </div>

                    {/* Regions */}
                    <div className="p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                            <Globe className="w-3 h-3" />
                            Regions
                        </div>
                        <div className="font-semibold text-slate-800">{stats.regions.length || '—'}</div>
                        {stats.regions.length > 0 && (
                            <Link 
                                to={createPageUrl(`Locations?nation_id=${nation.id}&type=region`)} 
                                className="text-xs text-emerald-600 hover:underline"
                            >
                                View all
                            </Link>
                        )}
                    </div>

                    {/* Settlements */}
                    <div className="p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                            <MapPin className="w-3 h-3" />
                            Settlements
                        </div>
                        <div className="font-semibold text-slate-800">{stats.settlements.length || '—'}</div>
                        {stats.settlements.length > 0 && (
                            <Link 
                                to={createPageUrl(`Locations?nation_id=${nation.id}&type=settlement`)} 
                                className="text-xs text-emerald-600 hover:underline"
                            >
                                View all
                            </Link>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}