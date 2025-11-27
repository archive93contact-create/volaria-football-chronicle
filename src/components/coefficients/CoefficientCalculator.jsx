// VCC Points per round (win, draw, loss)
const VCC_POINTS = {
    'Qualifying Round': { win: 0.2, draw: 0.1, loss: 0.05 },
    'Round of 32': { win: 0.2, draw: 0.1, loss: 0.05 },
    'Round of 16': { win: 0.5, draw: 0.25, loss: 0.12 },
    'Round 1': { win: 0.5, draw: 0.25, loss: 0.12 },
    'Quarter-final': { win: 0.7, draw: 0.35, loss: 0.17 },
    'Quarter-finals': { win: 0.7, draw: 0.35, loss: 0.17 },
    'Semi-final': { win: 1.0, draw: 0.5, loss: 0.25 },
    'Semi-finals': { win: 1.0, draw: 0.5, loss: 0.25 },
    'Final': { win: 1.2, draw: 0.8, loss: 0.4 },
};

// CCC Points per round (win, draw, loss)
const CCC_POINTS = {
    'Qualifying Round': { win: 0.05, draw: 0.025, loss: 0.015 },
    'Round of 32': { win: 0.05, draw: 0.025, loss: 0.015 },
    'Round of 16': { win: 0.1, draw: 0.05, loss: 0.025 },
    'Round 1': { win: 0.1, draw: 0.05, loss: 0.025 },
    'Quarter-final': { win: 0.25, draw: 0.12, loss: 0.07 },
    'Quarter-finals': { win: 0.25, draw: 0.12, loss: 0.07 },
    'Semi-final': { win: 0.35, draw: 0.25, loss: 0.1 },
    'Semi-finals': { win: 0.35, draw: 0.25, loss: 0.1 },
    'Final': { win: 0.5, draw: 0.35, loss: 0.12 },
};

// Get the result for a club in a match (for each leg)
function getMatchResults(match, clubName, isHome) {
    const results = [];
    
    // Leg 1
    if (match.home_score_leg1 !== null && match.home_score_leg1 !== undefined && 
        match.away_score_leg1 !== null && match.away_score_leg1 !== undefined) {
        const homeScore = match.home_score_leg1;
        const awayScore = match.away_score_leg1;
        
        if (isHome) {
            if (homeScore > awayScore) results.push('win');
            else if (homeScore < awayScore) results.push('loss');
            else results.push('draw');
        } else {
            if (awayScore > homeScore) results.push('win');
            else if (awayScore < homeScore) results.push('loss');
            else results.push('draw');
        }
    }
    
    // Leg 2 (if not single leg)
    if (!match.is_single_leg && 
        match.home_score_leg2 !== null && match.home_score_leg2 !== undefined &&
        match.away_score_leg2 !== null && match.away_score_leg2 !== undefined) {
        // In leg 2, teams swap home/away
        const homeScore = match.home_score_leg2;
        const awayScore = match.away_score_leg2;
        
        // In leg 2, the original away team is now at home
        if (isHome) {
            // Original home team is now away in leg 2
            if (awayScore > homeScore) results.push('win');
            else if (awayScore < homeScore) results.push('loss');
            else results.push('draw');
        } else {
            // Original away team is now home in leg 2
            if (homeScore > awayScore) results.push('win');
            else if (homeScore < awayScore) results.push('loss');
            else results.push('draw');
        }
    }
    
    return results;
}

// Calculate points for a single match for a specific club
function calculateMatchPoints(match, clubName, clubNation, pointsTable) {
    const roundPoints = pointsTable[match.round];
    if (!roundPoints) return 0;
    
    const isHome = match.home_club_name === clubName;
    const isAway = match.away_club_name === clubName;
    
    if (!isHome && !isAway) return 0;
    
    const results = getMatchResults(match, clubName, isHome);
    
    let totalPoints = 0;
    for (const result of results) {
        totalPoints += roundPoints[result] || 0;
    }
    
    return totalPoints;
}

// Calculate coefficients for all nations and clubs
export function calculateCoefficients(continentalSeasons, continentalMatches, competitions, nations, clubs, existingCountryCoeffs = []) {
    // Determine which competition is VCC and which is CCC
    const vccComp = competitions.find(c => c.short_name === 'VCC' || c.name.includes('Champions'));
    const cccComp = competitions.find(c => c.short_name === 'CCC' || c.name.includes('Challenge') || c.name.includes('Continental'));
    
    // Get the last 4 years
    const allYears = [...new Set(continentalSeasons.map(s => s.year))].sort().reverse();
    const last4Years = allYears.slice(0, 4);
    
    // Get previous champions for qualification spots
    const latestYear = allYears[0];
    const vccSeasons = continentalSeasons.filter(s => s.competition_id === vccComp?.id).sort((a, b) => b.year.localeCompare(a.year));
    const cccSeasons = continentalSeasons.filter(s => s.competition_id === cccComp?.id).sort((a, b) => b.year.localeCompare(a.year));
    const previousVccChampionNation = vccSeasons[0]?.champion_nation;
    const previousCccChampionNation = cccSeasons[0]?.champion_nation;
    
    // Initialize club and nation trackers
    const clubPoints = {}; // { clubName: { year1: pts, year2: pts, ... } }
    const nationPoints = {}; // { nationName: { year1: pts, year2: pts, ... } }
    
    // Process each season
    for (const season of continentalSeasons) {
        if (!last4Years.includes(season.year)) continue;
        
        const comp = competitions.find(c => c.id === season.competition_id);
        if (!comp) continue;
        
        const isVCC = comp.id === vccComp?.id;
        const isCCC = comp.id === cccComp?.id;
        
        if (!isVCC && !isCCC) continue;
        
        const pointsTable = isVCC ? VCC_POINTS : CCC_POINTS;
        const membership = isVCC ? 'VCC' : 'CCC';
        
        // Get matches for this season
        const seasonMatches = continentalMatches.filter(m => m.season_id === season.id);
        
        // Calculate points for each match
        for (const match of seasonMatches) {
            // Home club
            if (match.home_club_name && match.home_club_nation) {
                const pts = calculateMatchPoints(match, match.home_club_name, match.home_club_nation, pointsTable);
                
                const clubKey = `${match.home_club_name}|${membership}`;
                if (!clubPoints[clubKey]) {
                    clubPoints[clubKey] = { 
                        clubName: match.home_club_name, 
                        nationName: match.home_club_nation,
                        clubId: match.home_club_id,
                        membership,
                        years: {} 
                    };
                }
                clubPoints[clubKey].years[season.year] = (clubPoints[clubKey].years[season.year] || 0) + pts;
                
                const nationKey = `${match.home_club_nation}|${membership}`;
                if (!nationPoints[nationKey]) {
                    nationPoints[nationKey] = { 
                        nationName: match.home_club_nation,
                        membership,
                        years: {} 
                    };
                }
                nationPoints[nationKey].years[season.year] = (nationPoints[nationKey].years[season.year] || 0) + pts;
            }
            
            // Away club
            if (match.away_club_name && match.away_club_nation) {
                const pts = calculateMatchPoints(match, match.away_club_name, match.away_club_nation, pointsTable);
                
                const clubKey = `${match.away_club_name}|${membership}`;
                if (!clubPoints[clubKey]) {
                    clubPoints[clubKey] = { 
                        clubName: match.away_club_name, 
                        nationName: match.away_club_nation,
                        clubId: match.away_club_id,
                        membership,
                        years: {} 
                    };
                }
                clubPoints[clubKey].years[season.year] = (clubPoints[clubKey].years[season.year] || 0) + pts;
                
                const nationKey = `${match.away_club_nation}|${membership}`;
                if (!nationPoints[nationKey]) {
                    nationPoints[nationKey] = { 
                        nationName: match.away_club_nation,
                        membership,
                        years: {} 
                    };
                }
                nationPoints[nationKey].years[season.year] = (nationPoints[nationKey].years[season.year] || 0) + pts;
            }
        }
    }
    
    // Convert to arrays and calculate totals
    const clubCoefficients = Object.values(clubPoints).map(club => {
        const yearKeys = last4Years;
        const year1 = club.years[yearKeys[0]] || 0;
        const year2 = club.years[yearKeys[1]] || 0;
        const year3 = club.years[yearKeys[2]] || 0;
        const year4 = club.years[yearKeys[3]] || 0;
        const total = year1 + year2 + year3 + year4;
        
        // Try to find club ID from clubs list
        const clubRecord = clubs.find(c => c.name === club.clubName);
        const nationRecord = nations.find(n => n.name === club.nationName);
        
        return {
            club_name: club.clubName,
            club_id: club.clubId || clubRecord?.id,
            nation_name: club.nationName,
            nation_id: nationRecord?.id,
            membership: club.membership,
            year_1_points: year1,
            year_2_points: year2,
            year_3_points: year3,
            year_4_points: year4,
            total_points: total,
            coefficient_year: yearKeys[0] || 'Current',
        };
    });
    
    const nationCoefficients = Object.values(nationPoints).map(nation => {
        const yearKeys = last4Years;
        const year1 = nation.years[yearKeys[0]] || 0;
        const year2 = nation.years[yearKeys[1]] || 0;
        const year3 = nation.years[yearKeys[2]] || 0;
        const year4 = nation.years[yearKeys[3]] || 0;
        const total = year1 + year2 + year3 + year4;
        
        const nationRecord = nations.find(n => n.name === nation.nationName);
        
        // Get previous rank from existing coefficients
        const existingCoeff = existingCountryCoeffs.find(
            c => c.nation_name === nation.nationName && c.membership === nation.membership
        );
        
        return {
            nation_name: nation.nationName,
            nation_id: nationRecord?.id,
            membership: nation.membership,
            year_1_points: year1,
            year_2_points: year2,
            year_3_points: year3,
            year_4_points: year4,
            total_points: total,
            coefficient_year: yearKeys[0] || 'Current',
            previous_rank: existingCoeff?.rank || null,
        };
    });
    
    // Sort and assign ranks (separate for VCC and CCC)
    const sortAndRank = (items, isNation = false) => {
        const vcc = items.filter(i => i.membership === 'VCC').sort((a, b) => b.total_points - a.total_points);
        const ccc = items.filter(i => i.membership === 'CCC').sort((a, b) => b.total_points - a.total_points);
        
        vcc.forEach((item, idx) => { 
            item.rank = idx + 1;
            if (isNation) {
                // VCC: Top 5 nations get 2 spots, rest get 1
                // Previous champion's nation gets +1 extra spot (so they only need 1 from league)
                const isChampionNation = item.nation_name === previousVccChampionNation;
                if (idx < 5) {
                    item.vcc_spots = isChampionNation ? 1 : 2; // Champion nation only needs 1 league spot
                    item.champion_qualifier = isChampionNation;
                } else {
                    item.vcc_spots = isChampionNation ? 0 : 1;
                    item.champion_qualifier = isChampionNation;
                }
            }
        });
        ccc.forEach((item, idx) => { 
            item.rank = idx + 1;
            if (isNation) {
                // CCC: Top 9 nations get 2 spots, rest get 1
                // Previous champion's nation gets +1 extra spot
                const isChampionNation = item.nation_name === previousCccChampionNation;
                if (idx < 9) {
                    item.ccc_spots = isChampionNation ? 1 : 2;
                    item.champion_qualifier = isChampionNation;
                } else {
                    item.ccc_spots = isChampionNation ? 0 : 1;
                    item.champion_qualifier = isChampionNation;
                }
            }
        });
        
        return [...vcc, ...ccc];
    };
    
    return {
        clubCoefficients: sortAndRank(clubCoefficients, false),
        nationCoefficients: sortAndRank(nationCoefficients, true),
        years: last4Years,
        previousVccChampionNation,
        previousCccChampionNation,
    };
}