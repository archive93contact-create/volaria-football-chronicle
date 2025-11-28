import { base44 } from '@/api/base44Client';

// Get base stability points by tier
const getBaseStabilityByTier = (tier) => {
    if (tier >= 1 && tier <= 4) return 20;
    if (tier === 5) return 16;
    if (tier >= 6 && tier <= 9) return 14;
    if (tier >= 10 && tier <= 11) return 12;
    if (tier >= 12 && tier <= 14) return 10;
    return 8;
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

// Update stability for all clubs in a league table
export const updateStabilityForClubs = async (clubIds, leagueTables, leagues, seasons) => {
    const updates = [];
    
    for (const clubId of clubIds) {
        const { points, status } = calculateClubStability(clubId, leagueTables, leagues, seasons);
        
        await base44.entities.Club.update(clubId, {
            stability_points: points,
            stability_status: status
        });
        
        updates.push({ clubId, points, status });
    }
    
    return updates;
};

// Helper to get all data and update clubs after a season is saved
export const recalculateStabilityAfterSeason = async (affectedClubIds) => {
    // Fetch fresh data
    const [allLeagueTables, allLeagues, allSeasons] = await Promise.all([
        base44.entities.LeagueTable.list(),
        base44.entities.League.list(),
        base44.entities.Season.list()
    ]);
    
    return updateStabilityForClubs(affectedClubIds, allLeagueTables, allLeagues, allSeasons);
};