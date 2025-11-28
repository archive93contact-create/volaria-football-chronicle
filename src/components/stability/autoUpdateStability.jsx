import { base44 } from '@/api/base44Client';
import { estimateNationPopulation, estimateSustainableProClubs } from '@/components/common/populationUtils';

// Get base stability points by tier
const getBaseStabilityByTier = (tier) => {
    if (tier >= 1 && tier <= 4) return 20;
    if (tier === 5) return 16;
    if (tier >= 6 && tier <= 9) return 14;
    if (tier >= 10 && tier <= 11) return 12;
    if (tier >= 12 && tier <= 14) return 10;
    return 8;
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
export const calculateClubStability = (clubId, leagueTables, leagues, seasons) => {
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
            currentPoints = getBaseStabilityByTier(tier);
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

/**
 * Calculate pro club estimate using the same logic as Nations page
 */
const calculateProClubEstimate = (nationClubs, nationLeagues, nation) => {
    const membership = nation?.membership;
    const maxTier = Math.max(...nationLeagues.map(l => l.tier || 1), 1);
    
    // Get top division size
    const topFlightLeagues = nationLeagues.filter(l => l.tier === 1);
    let topDivisionSize = topFlightLeagues.reduce((max, l) => Math.max(max, l.number_of_teams || 0), 0);
    if (topDivisionSize === 0 && topFlightLeagues.length > 0) {
        const topFlightLeagueIds = topFlightLeagues.map(l => l.id);
        const topFlightClubs = nationClubs.filter(c => topFlightLeagueIds.includes(c.league_id));
        topDivisionSize = topFlightClubs.length || 8;
    }
    if (topDivisionSize === 0) topDivisionSize = 12; // fallback
    
    // Calculate population estimate
    const geoRegions = new Set(nationClubs.map(c => c.region).filter(Boolean));
    const geoDistricts = new Set(nationClubs.map(c => c.district).filter(Boolean));
    const geoSettlements = new Set(nationClubs.map(c => c.settlement || c.city).filter(Boolean));
    
    const leaguesWithTeams = nationLeagues.filter(l => l.number_of_teams > 0);
    const avgDivisionSize = leaguesWithTeams.length > 0 
        ? leaguesWithTeams.reduce((sum, l) => sum + l.number_of_teams, 0) / leaguesWithTeams.length 
        : topDivisionSize;
    
    const populationData = estimateNationPopulation(nationClubs.length, nationLeagues.length, membership, maxTier, {
        topDivisionSize,
        avgDivisionSize,
        totalDivisions: nationLeagues.length,
        regionCount: geoRegions.size,
        districtCount: geoDistricts.size,
        settlementCount: geoSettlements.size
    });
    
    // Simple strength score
    let strengthScore = membership === 'VCC' ? 50 : membership === 'CCC' ? 30 : 20;
    strengthScore += nationClubs.filter(c => c.vcc_titles > 0).length * 10;
    strengthScore += nationClubs.filter(c => c.ccc_titles > 0).length * 5;
    strengthScore += maxTier * 3;
    strengthScore = Math.min(strengthScore, 100);
    
    const proClubs = estimateSustainableProClubs(populationData.value, topDivisionSize, maxTier, membership, strengthScore);
    
    return {
        proClubsMax: proClubs.max,
        proClubsMin: proClubs.min,
        topDivisionSize,
        maxTier
    };
};

/**
 * Determine professional status using the Nations page pro clubs estimate.
 * Rules:
 * 1. Calculate sustainable pro clubs using population/strength formulas
 * 2. Top N clubs by stability (within pro estimate) in tier 1-2 = Professional
 * 3. Next tier down = Semi-Professional
 * 4. Everyone else = Amateur
 */
export const assignProfessionalStatusForNation = (nationClubs, nation, leagues) => {
    const nationLeagues = leagues.filter(l => l.nation_id === nation?.id);
    const { proClubsMax, topDivisionSize, maxTier } = calculateProClubEstimate(nationClubs, nationLeagues, nation);
    
    // Semi-pro slots = roughly 1.5x pro slots, capped reasonably
    const semiProSlots = Math.round(proClubsMax * 1.5);
    
    // Sort all active clubs by stability points (highest first)
    const sortedClubs = [...nationClubs]
        .filter(c => !c.is_defunct && !c.is_former_name)
        .map(c => {
            const league = leagues.find(l => l.id === c.league_id);
            return { ...c, tier: league?.tier || 99 };
        })
        .sort((a, b) => (b.stability_points || 0) - (a.stability_points || 0));
    
    const assignments = {};
    let proCount = 0;
    let semiProCount = 0;
    
    sortedClubs.forEach((club) => {
        const stability = club.stability_points || 0;
        const tier = club.tier;
        
        // Professional: 
        // - Within sustainable pro club limit
        // - In tier 1 or 2 (or tier 3 with exceptional stability for small nations)
        // - Has positive stability
        const canBePro = tier <= 2 || (maxTier <= 2 && tier <= maxTier);
        
        if (proCount < proClubsMax && canBePro && stability >= 0) {
            assignments[club.id] = 'professional';
            proCount++;
        }
        // Semi-Professional:
        // - Beyond pro limit but within semi-pro range
        // - In reasonable tiers (1-4)
        // - Or: tier 1-2 club that didn't make pro cut
        else if (semiProCount < semiProSlots && tier <= 4 && stability >= -5) {
            assignments[club.id] = 'semi-professional';
            semiProCount++;
        }
        else if (tier <= 2 && stability >= -10) {
            // Any top 2 tier club gets at least semi-pro
            assignments[club.id] = 'semi-professional';
            semiProCount++;
        }
        // Amateur: everyone else
        else {
            assignments[club.id] = 'amateur';
        }
    });
    
    return assignments;
};

// Update stability for all clubs in a nation
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
        const nationClubs = allClubs.filter(c => c.nation_id === nationId);
        
        // First, calculate stability for all requested clubs in this nation
        const stabilityUpdates = {};
        for (const club of clubsByNation[nationId]) {
            const { points, status } = calculateClubStability(club.id, leagueTables, leagues, seasons);
            stabilityUpdates[club.id] = { points, status };
        }
        
        // Update the stability in our working copy
        const updatedNationClubs = nationClubs.map(c => {
            if (stabilityUpdates[c.id]) {
                return { ...c, stability_points: stabilityUpdates[c.id].points };
            }
            return c;
        });
        
        // Now assign professional status for the whole nation
        const proStatusAssignments = assignProfessionalStatusForNation(updatedNationClubs, nation, leagues);
        
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

// Recalculate ALL clubs in a nation (useful for bulk updates)
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
    // Fetch fresh data
    const [allLeagueTables, allLeagues, allSeasons, allNations, allClubs] = await Promise.all([
        base44.entities.LeagueTable.list(),
        base44.entities.League.list(),
        base44.entities.Season.list(),
        base44.entities.Nation.list(),
        base44.entities.Club.list()
    ]);
    
    return updateStabilityForClubs(affectedClubIds, allLeagueTables, allLeagues, allSeasons, allNations, allClubs);
};