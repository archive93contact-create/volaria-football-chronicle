import { base44 } from '@/api/base44Client';
import { estimateNationPopulation, estimateSustainableProClubs } from '@/components/common/populationUtils';

// Get nation strength modifier (1-10 scale, default 5)
const getNationModifier = (nationStrength) => {
    const strength = nationStrength || 5;
    return Math.round((strength - 5) * 0.8);
};

// Get base stability points by tier
const getBaseStabilityByTier = (tier, nationStrength) => {
    let base;
    if (tier >= 1 && tier <= 4) base = 20;
    else if (tier === 5) base = 16;
    else if (tier >= 6 && tier <= 9) base = 14;
    else if (tier >= 10 && tier <= 11) base = 12;
    else if (tier >= 12 && tier <= 14) base = 10;
    else base = 8;
    
    return base + getNationModifier(nationStrength);
};

// Champion bonus by tier
const getChampionBonus = (tier) => {
    if (tier === 1) return 4;
    if (tier === 2) return 3;
    if (tier <= 4) return 2;
    return 1;
};

// Promotion bonus by tier promoted TO
const getPromotionBonus = (tier) => {
    if (tier === 1) return 3;
    if (tier === 2) return 2;
    return 1;
};

// Calculate stability for a single club
export const calculateClubStability = (clubId, leagueTables, leagues, seasons, nationStrength = 5) => {
    const clubSeasons = leagueTables
        .filter(lt => lt.club_id === clubId)
        .sort((a, b) => a.year.localeCompare(b.year));

    if (clubSeasons.length === 0) {
        return { points: 0, status: 'stable' };
    }

    let currentPoints = 0;

    clubSeasons.forEach((season, index) => {
        const league = leagues.find(l => l.id === season.league_id);
        const tier = league?.tier || 1;
        const seasonData = seasons.find(s => s.league_id === season.league_id && s.year === season.year);
        const teamsInLeague = seasonData?.number_of_teams || 20;

        if (index === 0) {
            currentPoints = getBaseStabilityByTier(tier, nationStrength);
        }

        if (season.status === 'champion' || season.position === 1) {
            currentPoints += getChampionBonus(tier);
        } else if (season.status === 'promoted' || season.status === 'playoff_winner') {
            currentPoints += getPromotionBonus(tier);
        } else if (season.status === 'relegated') {
            currentPoints -= season.position === teamsInLeague ? 3 : 2;
        } else if (season.position <= Math.floor(teamsInLeague / 2)) {
            currentPoints += 1;
        }
    });

    let status = 'stable';
    if (currentPoints <= -5) status = 'critical';
    else if (currentPoints <= 0) status = 'at_risk';

    return { points: currentPoints, status };
};

// Estimate nation strength score (same logic as Nations page)
function estimateStrength(clubs, leagues, membership) {
    let score = membership === 'VCC' ? 15 : membership === 'CCC' ? 5 : 0;
    
    score += clubs.filter(c => c.vcc_titles > 0).length * 10;
    score += clubs.filter(c => c.ccc_titles > 0).length * 5;
    
    const maxTier = Math.max(...leagues.map(l => l.tier || 1), 1);
    score += maxTier * 3;
    
    const topFlightLeagues = leagues.filter(l => l.tier === 1);
    const topFlightTeams = topFlightLeagues.reduce((sum, l) => sum + (l.number_of_teams || 12), 0);
    score += Math.min(topFlightTeams, 20);
    
    return Math.min(score, 100);
}

/**
 * Assign professional status using the same estimateSustainableProClubs logic from Nations page
 * This ensures consistency between the displayed "Pro Clubs" estimate and actual assignments
 */
export const assignProfessionalStatusForNation = (nationClubs, nation, nationLeagues) => {
    // Filter to active clubs only
    const activeClubs = nationClubs.filter(c => !c.is_defunct && !c.is_former_name);
    if (activeClubs.length === 0) return {};
    
    // Calculate nation stats (same as Nations page)
    const maxTier = Math.max(...nationLeagues.map(l => l.tier || 1), 1);
    const topFlightLeagues = nationLeagues.filter(l => l.tier === 1);
    let topDivisionSize = topFlightLeagues.reduce((max, l) => Math.max(max, l.number_of_teams || 0), 0);
    
    if (topDivisionSize === 0 && topFlightLeagues.length > 0) {
        const topFlightLeagueIds = topFlightLeagues.map(l => l.id);
        const topFlightClubs = activeClubs.filter(c => topFlightLeagueIds.includes(c.league_id));
        topDivisionSize = topFlightClubs.length || 8;
    }
    if (topDivisionSize === 0) topDivisionSize = 12; // Default
    
    // Calculate population estimate
    const geoRegions = new Set(activeClubs.map(c => c.region).filter(Boolean));
    const geoDistricts = new Set(activeClubs.map(c => c.district).filter(Boolean));
    const geoSettlements = new Set(activeClubs.map(c => c.settlement || c.city).filter(Boolean));
    
    const populationData = estimateNationPopulation(
        activeClubs.length, 
        nationLeagues.length, 
        nation?.membership, 
        maxTier, 
        {
            topDivisionSize,
            avgDivisionSize: topDivisionSize,
            totalDivisions: nationLeagues.length,
            regionCount: geoRegions.size,
            districtCount: geoDistricts.size,
            settlementCount: geoSettlements.size
        }
    );
    
    // Calculate strength score
    const strengthScore = estimateStrength(activeClubs, nationLeagues, nation?.membership);
    
    // Get sustainable pro clubs estimate
    const proClubsEstimate = estimateSustainableProClubs(
        populationData.value, 
        topDivisionSize, 
        maxTier, 
        nation?.membership, 
        strengthScore
    );
    
    // Use the estimated value as our target
    const targetProClubs = proClubsEstimate.value || topDivisionSize;
    const targetSemiProClubs = Math.round(targetProClubs * 0.75); // ~75% more as semi-pro
    
    // Sort clubs by stability points (highest first), then by tier (lower tier = better)
    const sortedClubs = [...activeClubs]
        .map(c => {
            const league = nationLeagues.find(l => l.id === c.league_id);
            return { ...c, tier: league?.tier || 99 };
        })
        .sort((a, b) => {
            // First by stability (desc)
            const stabilityDiff = (b.stability_points || 0) - (a.stability_points || 0);
            if (stabilityDiff !== 0) return stabilityDiff;
            // Then by tier (asc - lower tier is better)
            return (a.tier || 99) - (b.tier || 99);
        });
    
    const assignments = {};
    let proCount = 0;
    let semiProCount = 0;
    
    sortedClubs.forEach((club) => {
        const tier = club.tier;
        const stability = club.stability_points || 0;
        
        // Professional: 
        // - Must be in top N clubs by stability (where N = targetProClubs)
        // - Must be in tier 1-2 (or tier 3 with exceptional stability)
        // - Must have positive stability
        if (proCount < targetProClubs && stability >= 0) {
            if (tier <= 2) {
                assignments[club.id] = 'professional';
                proCount++;
                return;
            }
            // Tier 3 can be pro with very high stability
            if (tier === 3 && stability >= 25) {
                assignments[club.id] = 'professional';
                proCount++;
                return;
            }
        }
        
        // Semi-Professional:
        // - Within semi-pro limit
        // - In tiers 1-4
        // - OR any tier 1-2 club that didn't make pro cut
        if (tier <= 2 && stability >= -5) {
            // Tier 1-2 clubs that didn't make pro are at least semi-pro
            assignments[club.id] = 'semi-professional';
            semiProCount++;
        } else if (semiProCount < targetSemiProClubs && tier <= 4 && stability >= 0) {
            assignments[club.id] = 'semi-professional';
            semiProCount++;
        } else {
            // Amateur: everyone else
            assignments[club.id] = 'amateur';
        }
    });
    
    return assignments;
};

// Update stability for all clubs
export const updateStabilityForClubs = async (clubIds, leagueTables, leagues, seasons, nations, allClubs) => {
    const updates = [];
    
    // Group clubs by nation
    const clubsByNation = {};
    clubIds.forEach(clubId => {
        const club = allClubs.find(c => c.id === clubId);
        if (!club) return;
        if (!clubsByNation[club.nation_id]) {
            clubsByNation[club.nation_id] = [];
        }
        clubsByNation[club.nation_id].push(club);
    });
    
    // Process each nation
    for (const nationId of Object.keys(clubsByNation)) {
        const nation = nations.find(n => n.id === nationId);
        const nationStrength = nation?.nation_strength || 5;
        const nationClubs = allClubs.filter(c => c.nation_id === nationId);
        const nationLeagues = leagues.filter(l => l.nation_id === nationId);
        
        // First, calculate stability for all requested clubs in this nation
        const stabilityUpdates = {};
        for (const club of clubsByNation[nationId]) {
            const { points, status } = calculateClubStability(club.id, leagueTables, leagues, seasons, nationStrength);
            stabilityUpdates[club.id] = { points, status };
        }
        
        // Update the stability in our working copy of ALL nation clubs
        const updatedNationClubs = nationClubs.map(c => {
            if (stabilityUpdates[c.id]) {
                return { ...c, stability_points: stabilityUpdates[c.id].points };
            }
            return c;
        });
        
        // Now assign professional status for the whole nation using the populationUtils logic
        const proStatusAssignments = assignProfessionalStatusForNation(updatedNationClubs, nation, nationLeagues);
        
        // Save updates for requested clubs
        for (const club of clubsByNation[nationId]) {
            const { points, status } = stabilityUpdates[club.id];
            const proStatus = proStatusAssignments[club.id] || 'amateur';
            
            await base44.entities.Club.update(club.id, {
                stability_points: points,
                stability_status: status,
                professional_status: proStatus
            });
            
            updates.push({ clubId: club.id, points, status, proStatus });
        }
    }
    
    return updates;
};

// Recalculate ALL clubs in a nation
export const recalculateNationStability = async (nationId) => {
    const [allLeagueTables, allLeagues, allSeasons, allNations, allClubs] = await Promise.all([
        base44.entities.LeagueTable.list(),
        base44.entities.League.list(),
        base44.entities.Season.list(),
        base44.entities.Nation.list(),
        base44.entities.Club.list()
    ]);
    
    const nationClubs = allClubs.filter(c => c.nation_id === nationId);
    const clubIds = nationClubs.map(c => c.id);
    
    return updateStabilityForClubs(clubIds, allLeagueTables, allLeagues, allSeasons, allNations, allClubs);
};

// Helper to get all data and update clubs after a season is saved
export const recalculateStabilityAfterSeason = async (affectedClubIds) => {
    const [allLeagueTables, allLeagues, allSeasons, allNations, allClubs] = await Promise.all([
        base44.entities.LeagueTable.list(),
        base44.entities.League.list(),
        base44.entities.Season.list(),
        base44.entities.Nation.list(),
        base44.entities.Club.list()
    ]);
    
    return updateStabilityForClubs(affectedClubIds, allLeagueTables, allLeagues, allSeasons, allNations, allClubs);
};