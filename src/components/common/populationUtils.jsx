// Shared population estimation utilities for consistent calculations across the app

// Estimate nation population based on clubs, leagues, tiers, and division sizes
export function estimateNationPopulation(clubCount, leagueCount, membership, maxTier, options = {}) {
    if (clubCount === 0) return { value: 0, display: '0', tier: 'Unknown' };
    
    const { topDivisionSize = 0, avgDivisionSize = 0, totalDivisions = 0 } = options;
    
    // Base population per club varies by membership tier
    let basePerClub = membership === 'VCC' ? 75000 : membership === 'CCC' ? 45000 : 50000;
    
    // More leagues = bigger football structure = bigger country
    const leagueMultiplier = 1 + (leagueCount * 0.15);
    
    // More tiers = deeper pyramid = larger country
    const tierMultiplier = 1 + ((maxTier || 1) * 0.1);
    
    // Division size factor - larger top divisions indicate bigger economies
    // Top divisions of 20+ teams suggest a major footballing nation
    // Small top divisions (8-12) suggest smaller nation with fewer sustainable pro clubs
    let divisionSizeFactor = 1.0;
    if (topDivisionSize > 0) {
        if (topDivisionSize >= 20) {
            divisionSizeFactor = 1.4; // Large top flight = major nation
        } else if (topDivisionSize >= 16) {
            divisionSizeFactor = 1.2; // Standard size
        } else if (topDivisionSize >= 12) {
            divisionSizeFactor = 1.0; // Medium
        } else if (topDivisionSize >= 8) {
            divisionSizeFactor = 0.75; // Smaller nation
        } else {
            divisionSizeFactor = 0.5; // Very small/limited pro football
        }
    }
    
    // Professional club density - if avg division size is small relative to club count,
    // it may indicate many amateur/semi-pro clubs in a smaller nation
    let densityFactor = 1.0;
    if (avgDivisionSize > 0 && totalDivisions > 0) {
        const professionalClubs = avgDivisionSize * Math.min(totalDivisions, 4); // Top 4 tiers = pro
        const proRatio = professionalClubs / clubCount;
        // If only a small fraction are "professional tier", reduce population estimate
        if (proRatio < 0.3) {
            densityFactor = 0.7; // Many lower-league/amateur clubs
        } else if (proRatio < 0.5) {
            densityFactor = 0.85;
        }
    }
    
    const estimated = Math.round(clubCount * basePerClub * leagueMultiplier * tierMultiplier * divisionSizeFactor * densityFactor);
    
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

// Estimate the number of professional clubs a nation can sustain
export function estimateSustainableProClubs(population, topDivisionSize, maxTier, membership, strengthScore) {
    if (population === 0) return { min: 0, max: 0, display: '0' };
    
    // More realistic: 1 pro club per 200k-400k population depending on wealth
    const basePerCapita = membership === 'VCC' ? 180000 : membership === 'CCC' ? 250000 : 300000;
    
    // Calculate base sustainable clubs from population
    let baseClubs = population / basePerCapita;
    
    // Small division sizes mean less economic capacity - apply a dampening factor
    // 8-team leagues = 0.5x, 12-team = 0.75x, 16-team = 0.9x, 20+ = 1.0x
    let divisionFactor = 1.0;
    if (topDivisionSize <= 8) divisionFactor = 0.5;
    else if (topDivisionSize <= 10) divisionFactor = 0.65;
    else if (topDivisionSize <= 12) divisionFactor = 0.75;
    else if (topDivisionSize <= 14) divisionFactor = 0.85;
    else if (topDivisionSize <= 16) divisionFactor = 0.9;
    
    // Strength gives a modest boost (0-25%)
    const strengthMultiplier = 1 + (strengthScore / 400);
    
    // Professional tiers - but diminishing returns after tier 2
    // Tier 1 = full pro, Tier 2 = mostly pro, Tier 3-4 = semi-pro at best
    const proTierMultiplier = maxTier === 1 ? 1.0 : 
                              maxTier === 2 ? 1.3 : 
                              maxTier === 3 ? 1.5 : 
                              maxTier >= 4 ? 1.6 : 1.0;
    
    const estimated = Math.round(baseClubs * divisionFactor * strengthMultiplier * proTierMultiplier);
    
    // Calculate range (±20%)
    const min = Math.max(topDivisionSize || 8, Math.round(estimated * 0.8));
    const max = Math.round(estimated * 1.2);
    
    // Ensure minimum makes sense - at least enough for top division
    const finalMin = Math.max(min, topDivisionSize || 8);
    const finalMax = Math.max(max, finalMin);
    
    return {
        value: estimated,
        min: finalMin,
        max: finalMax,
        display: finalMin === finalMax ? `${finalMin}` : `${finalMin}-${finalMax}`
    };
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