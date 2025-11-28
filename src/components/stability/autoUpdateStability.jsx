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

// Get champion bonus by tier
const getChampionBonus = (tier) => {
    if (tier === 1) return 7;
    if (tier === 2) return 6;
    if (tier === 3) return 5;
    if (tier === 4) return 4;
    if (tier === 5) return 4;
    if (tier >= 6 && tier <= 9) return 3;
    if (tier >= 10 && tier <= 11) return 2;
    return 1;
};

// Get promotion bonus by tier
const getPromotionBonus = (tier) => {
    if (tier === 1) return 0;
    if (tier === 2) return 5;
    if (tier === 3) return 4;
    if (tier === 4) return 3;
    if (tier === 5) return 3;
    if (tier >= 6 && tier <= 9) return 2;
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

// Determine professional status based on stability and nation's max pro clubs
export const determineProfessionalStatus = (club, allClubsInNation, nation, league) => {
    const tier = league?.tier || 99;
    const stabilityPoints = club.stability_points || 0;
    const maxProClubs = nation?.max_professional_clubs || 20;
    
    // Sort all clubs by stability to determine who qualifies as professional
    const sortedClubs = [...allClubsInNation]
        .filter(c => c.stability_points !== undefined)
        .sort((a, b) => (b.stability_points || 0) - (a.stability_points || 0));
    
    const clubRank = sortedClubs.findIndex(c => c.id === club.id) + 1;
    
    // Professional: top N clubs by stability AND in tier 1-2 usually, or very high stability
    if (clubRank <= maxProClubs && (tier <= 2 || stabilityPoints >= 25)) {
        return 'professional';
    }
    
    // Semi-professional: next tier down or tier 3-4 clubs with decent stability
    if (tier <= 4 && stabilityPoints >= 10) {
        return 'semi-professional';
    }
    if (clubRank <= maxProClubs * 2 && stabilityPoints >= 5) {
        return 'semi-professional';
    }
    
    // Amateur: everyone else
    return 'amateur';
};

// Update stability for all clubs in a league table
export const updateStabilityForClubs = async (clubIds, leagueTables, leagues, seasons, nations, allClubs) => {
    const updates = [];
    
    for (const clubId of clubIds) {
        const club = allClubs.find(c => c.id === clubId);
        if (!club) continue;
        
        const nation = nations.find(n => n.id === club.nation_id);
        const nationStrength = nation?.nation_strength || 5;
        const league = leagues.find(l => l.id === club.league_id);
        
        const { points, status } = calculateClubStability(clubId, leagueTables, leagues, seasons, nationStrength);
        
        // Calculate professional status
        const clubsInNation = allClubs.filter(c => c.nation_id === club.nation_id);
        // Temporarily update this club's points for ranking
        const tempClubs = clubsInNation.map(c => c.id === clubId ? {...c, stability_points: points} : c);
        const proStatus = determineProfessionalStatus({...club, stability_points: points}, tempClubs, nation, league);
        
        await base44.entities.Club.update(clubId, {
            stability_points: points,
            stability_status: status,
            professional_status: proStatus
        });
        
        updates.push({ clubId, points, status, proStatus });
    }
    
    return updates;
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