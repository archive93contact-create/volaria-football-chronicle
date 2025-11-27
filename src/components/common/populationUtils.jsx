// Shared population estimation utilities for consistent calculations across the app

// Estimate nation population based on clubs, leagues, and tiers
export function estimateNationPopulation(clubCount, leagueCount, membership, maxTier) {
    if (clubCount === 0) return { value: 0, display: '0', tier: 'Unknown' };
    
    // Base population per club varies by membership tier
    let basePerClub = membership === 'VCC' ? 75000 : membership === 'CCC' ? 45000 : 50000;
    
    // More leagues = bigger football structure = bigger country
    const leagueMultiplier = 1 + (leagueCount * 0.15);
    
    // More tiers = deeper pyramid = larger country
    const tierMultiplier = 1 + ((maxTier || 1) * 0.1);
    
    const estimated = Math.round(clubCount * basePerClub * leagueMultiplier * tierMultiplier);
    
    // Return formatted with tier description
    let display, tier;
    if (estimated >= 10000000) {
        display = `${(estimated / 1000000).toFixed(1)}M`;
        tier = 'Major Power';
    } else if (estimated >= 5000000) {
        display = `${(estimated / 1000000).toFixed(1)}M`;
        tier = 'Large Nation';
    } else if (estimated >= 2000000) {
        display = `${(estimated / 1000000).toFixed(1)}M`;
        tier = 'Medium Nation';
    } else if (estimated >= 500000) {
        display = `${Math.round(estimated / 1000)}K`;
        tier = 'Small Nation';
    } else {
        display = `${Math.round(estimated / 1000)}K`;
        tier = 'Micro State';
    }
    
    return { value: estimated, display, tier };
}

// Estimate population for a single settlement based on its clubs
export function estimateSettlementPopulation(locationName, clubs, isCapital = false, nationPopulation = 0) {
    const seed = locationName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const pseudoRandom = (min, max) => {
        const x = Math.sin(seed) * 10000;
        const rand = x - Math.floor(x);
        return Math.floor(rand * (max - min + 1)) + min;
    };
    
    // Base depends on whether it's the capital
    let base = isCapital ? 150000 : 15000;
    
    // Calculate tier bonus - higher tier clubs = larger population
    let tierBonus = 0;
    clubs.forEach(club => {
        if (club.league_id) tierBonus += 10000;
        if (club.seasons_top_flight > 0) tierBonus += club.seasons_top_flight * 1500;
        if (club.league_titles > 0) tierBonus += club.league_titles * 8000;
    });
    
    const variance = 0.8 + (pseudoRandom(0, 40) / 100);
    let population = Math.floor((clubs.length * base + tierBonus + base * 0.5) * variance);
    
    // Capital should be significant relative to nation
    if (isCapital) {
        const minCapital = nationPopulation > 0 ? nationPopulation * 0.08 : 400000;
        if (population < minCapital) {
            population = Math.floor(minCapital + pseudoRandom(10000, 99999));
        }
    }
    
    // Add some variance to avoid round numbers
    const remainder = pseudoRandom(100, 9999);
    population = Math.floor(population / 10000) * 10000 + remainder;
    
    return population;
}

// Estimate population for a region/district by aggregating settlements
export function estimateLocationPopulation(locationType, locationClubs, nation, locationName, nationPopulation = 0) {
    const seed = locationName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const pseudoRandom = (min, max) => {
        const x = Math.sin(seed) * 10000;
        const rand = x - Math.floor(x);
        return Math.floor(rand * (max - min + 1)) + min;
    };
    
    let totalPopulation = 0;
    
    if (locationType === 'settlement') {
        const isCapital = nation?.capital?.toLowerCase() === locationName.toLowerCase();
        totalPopulation = estimateSettlementPopulation(locationName, locationClubs, isCapital, nationPopulation);
    } else {
        // For regions/districts, aggregate settlement populations
        const settlements = new Map();
        locationClubs.forEach(club => {
            const settlementName = club.settlement || club.city;
            if (settlementName) {
                if (!settlements.has(settlementName)) {
                    settlements.set(settlementName, []);
                }
                settlements.get(settlementName).push(club);
            }
        });
        
        settlements.forEach((clubs, name) => {
            const isCapital = nation?.capital?.toLowerCase() === name.toLowerCase();
            totalPopulation += estimateSettlementPopulation(name, clubs, isCapital, nationPopulation);
        });
        
        // Add rural population (people not in tracked settlements)
        const ruralBase = locationType === 'region' ? 80000 : 25000;
        const ruralVariance = 0.5 + (pseudoRandom(0, 100) / 100);
        totalPopulation += Math.floor(ruralBase * ruralVariance) + pseudoRandom(1000, 9999);
    }
    
    let display;
    if (totalPopulation >= 1000000) {
        display = `${(totalPopulation / 1000000).toFixed(2)} million`;
    } else {
        display = totalPopulation.toLocaleString();
    }
    
    return { value: totalPopulation, display };
}