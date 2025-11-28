import { base44 } from '@/api/base44Client';
import { estimateNationPopulation, estimateSustainableProClubs } from '@/components/common/populationUtils';

// Get base stability points by tier - adjusted for nation size
// Smaller nations (fewer tiers) = lower base points
const getBaseStabilityByTier = (tier, maxTierInNation = 4) => {
    // Nation size adjustment: fewer tiers = smaller nation = lower base
    // 1-tier nation: -6, 2-tier: -4, 3-tier: -2, 4+ tier: 0
    const nationSizeAdjust = Math.min(0, (maxTierInNation - 4) * 2);
    
    let base;
    if (tier === 1) base = 18;
    else if (tier === 2) base = 16;
    else if (tier === 3) base = 14;
    else if (tier === 4) base = 12;
    else if (tier <= 6) base = 10;
    else if (tier <= 9) base = 8;
    else base = 6;
    
    return Math.max(5, base + nationSizeAdjust);
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
export const calculateClubStability = (clubId, leagueTables, leagues, seasons, maxTierInNation = 4) => {
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
        const teamsInLeague = seasonData?.number_of_teams || 12;

        if (index === 0) {
            currentPoints = getBaseStabilityByTier(tier, maxTierInNation);
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
 * Simple rule: Pro clubs = what the estimate says. 
 * Top N by stability in tier 1-2 get PRO, rest get semi-pro or amateur.
 */
export const assignProfessionalStatusForNation = (nationClubs, nation, leagues) => {
    const nationLeagues = leagues.filter(l => l.nation_id === nation?.id);
    const { proClubsMax, topDivisionSize, maxTier } = calculateProClubEstimate(nationClubs, nationLeagues, nation);
    
    // For small nations (1-2 tiers), all tier 1 clubs should be pro
    const isSmallNation = maxTier <= 2;
    
    // Sort all active clubs by: tier first (lower=better), then stability
    const sortedClubs = [...nationClubs]
        .filter(c => !c.is_defunct && !c.is_former_name)
        .map(c => {
            const league = leagues.find(l => l.id === c.league_id);
            return { ...c, tier: league?.tier || 99 };
        })
        .sort((a, b) => {
            // First by tier (lower is better)
            if (a.tier !== b.tier) return a.tier - b.tier;
            // Then by stability (higher is better)
            return (b.stability_points || 0) - (a.stability_points || 0);
        });
    
    const assignments = {};
    let proCount = 0;
    
    // For small nations: ALL tier 1 clubs are professional
    // For larger nations: use the pro clubs estimate
    const tier1Clubs = sortedClubs.filter(c => c.tier === 1);
    const tier2Clubs = sortedClubs.filter(c => c.tier === 2);
    
    // Small nations: all tier 1 = pro
    if (isSmallNation) {
        tier1Clubs.forEach(club => {
            assignments[club.id] = 'professional';
            proCount++;
        });
        // Tier 2 in small nations = semi-pro
        tier2Clubs.forEach(club => {
            assignments[club.id] = 'semi-professional';
        });
    } else {
        // Larger nations: use estimate, but ensure at least top division is pro
        const targetPro = Math.max(proClubsMax, topDivisionSize);
        
        sortedClubs.forEach((club) => {
            if (proCount < targetPro && club.tier <= 2) {
                assignments[club.id] = 'professional';
                proCount++;
            } else if (club.tier <= 2) {
                // Tier 1-2 that didn't make pro cut = semi-pro
                assignments[club.id] = 'semi-professional';
            } else if (club.tier <= 4) {
                assignments[club.id] = 'semi-professional';
            } else {
                assignments[club.id] = 'amateur';
            }
        });
    }
    
    // Fill in any remaining as amateur
    sortedClubs.forEach(club => {
        if (!assignments[club.id]) {
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
        const nationLeagues = leagues.filter(l => l.nation_id === nationId);
        const maxTierInNation = Math.max(...nationLeagues.map(l => l.tier || 1), 1);
        
        // First, calculate stability for all requested clubs in this nation
        const stabilityUpdates = {};
        for (const club of clubsByNation[nationId]) {
            const { points, status } = calculateClubStability(club.id, leagueTables, leagues, seasons, maxTierInNation);
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