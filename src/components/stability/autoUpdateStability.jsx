import { base44 } from '@/api/base44Client';

// Get nation strength modifier (1-10 scale, default 5)
const getNationModifier = (nationStrength) => {
    const strength = nationStrength || 5;
    // Returns -4 to +4 modifier based on nation strength
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
    
    // Apply nation modifier
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

/**
 * Determine professional status based on simple rules:
 * 1. Get nation's max_professional_clubs (or estimate from strength)
 * 2. Rank ALL clubs in nation by stability points
 * 3. Top N by stability + in tier 1-2 = Professional
 * 4. Next batch with decent stability = Semi-Professional  
 * 5. Everyone else = Amateur
 */
export const assignProfessionalStatusForNation = (nationClubs, nation, leagues) => {
    const nationStrength = nation?.nation_strength || 5;
    
    // Determine how many pro/semi-pro slots this nation has
    // Default: ~20-30% of clubs can be pro, ~30% semi-pro in strong nations
    // Weak nations: maybe only top 2-3 clubs are pro
    const maxProClubs = nation?.max_professional_clubs || Math.max(2, Math.round(nationStrength * 2));
    const maxSemiProClubs = Math.round(maxProClubs * 1.5);
    
    // Sort all clubs by stability points (highest first)
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
    
    sortedClubs.forEach((club, rank) => {
        const stability = club.stability_points || 0;
        const tier = club.tier;
        
        // Professional criteria:
        // - Within nation's pro club limit
        // - In top 2 tiers (or tier 3 with very high stability)
        // - Minimum stability threshold
        if (proCount < maxProClubs && stability >= 15 && (tier <= 2 || (tier === 3 && stability >= 30))) {
            assignments[club.id] = 'professional';
            proCount++;
        }
        // Semi-Professional criteria:
        // - Within nation's semi-pro limit
        // - In top 4 tiers
        // - Decent stability
        else if (semiProCount < maxSemiProClubs && stability >= 5 && tier <= 4) {
            assignments[club.id] = 'semi-professional';
            semiProCount++;
        }
        // Also semi-pro: tier 1-2 clubs that didn't make pro cut but have some stability
        else if (tier <= 2 && stability >= 0) {
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
        const nationStrength = nation?.nation_strength || 5;
        const nationClubs = allClubs.filter(c => c.nation_id === nationId);
        
        // First, calculate stability for all requested clubs in this nation
        const stabilityUpdates = {};
        for (const club of clubsByNation[nationId]) {
            const { points, status } = calculateClubStability(club.id, leagueTables, leagues, seasons, nationStrength);
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