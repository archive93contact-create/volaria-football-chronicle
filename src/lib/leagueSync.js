import { base44 } from '@/api/base44Client';

const normalise = (value) => String(value || '').trim().toLowerCase();
const yearCompare = (a, b) => String(a || '').localeCompare(String(b || ''), undefined, { numeric: true });

const resolveClub = (clubs, row) => {
    if (row.club_id) {
        const byId = clubs.find(c => c.id === row.club_id);
        if (byId) return byId;
    }
    const key = normalise(row.club_name);
    return key ? clubs.find(c => normalise(c.name) === key || normalise(c.shortened_name) === key) : null;
};

/**
 * Rebuild senior club league aggregates and league headline stats from Season + LeagueTable.
 * The table rows are the source of truth, making this safe to run repeatedly after edits/backfills.
 */
export async function syncLeagueStatsForNation(nationId) {
    if (!nationId) return { clubsUpdated: 0, leaguesUpdated: 0, seasonsBackfilled: 0 };

    const [nationRows, allLeagues, clubs] = await Promise.all([
        base44.entities.Nation.filter({ id: nationId }),
        base44.entities.League.filter({ nation_id: nationId }),
        base44.entities.Club.filter({ nation_id: nationId }),
    ]);
    const nation = nationRows[0];
    const leagues = allLeagues.filter(l => l.league_type !== 'youth' && l.league_type !== 'reserve');
    if (!leagues.length) return { clubsUpdated: 0, leaguesUpdated: 0, seasonsBackfilled: 0 };

    const [tableSets, seasonSets] = await Promise.all([
        Promise.all(leagues.map(l => base44.entities.LeagueTable.filter({ league_id: l.id }))),
        Promise.all(leagues.map(l => base44.entities.Season.filter({ league_id: l.id }))),
    ]);
    const tables = tableSets.flat();
    const seasons = seasonSets.flat();
    const leagueById = new Map(leagues.map(l => [l.id, l]));
    const seasonById = new Map(seasons.map(s => [s.id, s]));

    // Repair missing club IDs on historical table rows when the name resolves uniquely.
    for (const row of tables) {
        if (row.club_id) continue;
        const club = resolveClub(clubs, row);
        if (club) {
            await base44.entities.LeagueTable.update(row.id, { club_id: club.id });
            row.club_id = club.id;
        }
    }

    let seasonsBackfilled = 0;
    for (const season of seasons) {
        const rows = tables.filter(t => t.season_id === season.id || (!t.season_id && t.league_id === season.league_id && t.year === season.year));
        const championRow = rows.find(r => r.status === 'champion') || rows.find(r => Number(r.position) === 1);
        const championClub = championRow ? resolveClub(clubs, championRow) : null;
        const patch = {};
        if (championClub && season.champion_id !== championClub.id) patch.champion_id = championClub.id;
        if (championClub && !season.champion_name) patch.champion_name = championClub.name;
        if (Object.keys(patch).length) {
            await base44.entities.Season.update(season.id, patch);
            Object.assign(season, patch);
            seasonsBackfilled++;
        }
    }

    const rowsByClub = new Map();
    for (const row of tables) {
        const club = resolveClub(clubs, row);
        if (!club) continue;
        if (!rowsByClub.has(club.id)) rowsByClub.set(club.id, []);
        rowsByClub.get(club.id).push(row);
    }

    let clubsUpdated = 0;
    for (const club of clubs) {
        const rows = rowsByClub.get(club.id) || [];
        if (!rows.length) continue;

        let totalWins = 0, totalDraws = 0, totalLosses = 0, totalGF = 0, totalGA = 0;
        let seasonsTopFlight = 0, seasonsInTfa = 0, promotions = 0, relegations = 0;
        let leagueTitles = 0, lowerTierTitles = 0;
        const titleYears = new Set();
        const lowerTitleYears = new Set();
        let best = null, worst = null;

        for (const row of rows) {
            totalWins += Number(row.won) || 0;
            totalDraws += Number(row.drawn) || 0;
            totalLosses += Number(row.lost) || 0;
            totalGF += Number(row.goals_for) || 0;
            totalGA += Number(row.goals_against) || 0;

            const league = leagueById.get(row.league_id);
            const season = seasonById.get(row.season_id);
            const tier = Number(row.tier || season?.tier || league?.tier) || null;
            const position = Number(row.position) || null;

            if (tier === 1) seasonsTopFlight++;
            if (nation?.name === 'Turuliand' && tier && tier <= 4) seasonsInTfa++;
            if (row.status === 'promoted' || row.status === 'playoff_winner') promotions++;
            if (row.status === 'relegated') relegations++;

            if (position === 1 || row.status === 'champion') {
                if (tier === 1) {
                    leagueTitles++;
                    if (row.year) titleYears.add(row.year);
                } else if (tier && tier > 1) {
                    lowerTierTitles++;
                    if (row.year) lowerTitleYears.add(row.year);
                }
            }

            if (tier && position) {
                const score = tier * 100 + position;
                if (!best || score < best.score) best = { score, tier, position, year: row.year };
                if (!worst || score > worst.score) worst = { score, tier, position, year: row.year };
            }
        }

        const latestRow = [...rows].sort((a, b) => yearCompare(b.year, a.year))[0];
        await base44.entities.Club.update(club.id, {
            seasons_played: rows.length,
            seasons_top_flight: seasonsTopFlight,
            seasons_in_tfa: seasonsInTfa,
            total_wins: totalWins,
            total_draws: totalDraws,
            total_losses: totalLosses,
            total_goals_scored: totalGF,
            total_goals_conceded: totalGA,
            promotions,
            relegations,
            league_titles: leagueTitles,
            title_years: [...titleYears].sort(yearCompare).join(', '),
            lower_tier_titles: lowerTierTitles,
            lower_tier_title_years: [...lowerTitleYears].sort(yearCompare).join(', '),
            best_finish: best?.position || null,
            best_finish_tier: best?.tier || null,
            best_finish_year: best?.year || null,
            worst_finish: worst?.position || null,
            worst_finish_tier: worst?.tier || null,
            worst_finish_year: worst?.year || null,
            league_id: latestRow?.league_id || club.league_id,
            last_season_year: latestRow?.year || club.last_season_year,
        });
        clubsUpdated++;
    }

    let leaguesUpdated = 0;
    for (const league of leagues) {
        const leagueSeasons = seasons.filter(s => s.league_id === league.id).sort((a, b) => yearCompare(b.year, a.year));
        if (!leagueSeasons.length) continue;
        const latest = leagueSeasons[0];
        const titleCounts = new Map();
        for (const season of leagueSeasons) {
            const name = season.champion_name;
            if (!name) continue;
            titleCounts.set(name, (titleCounts.get(name) || 0) + 1);
        }
        const leader = [...titleCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
        const latestRows = tables.filter(t => t.league_id === league.id && t.year === latest.year);
        await base44.entities.League.update(league.id, {
            current_champion: latest.champion_name || '',
            most_titles: leader?.[0] || '',
            number_of_teams: latest.number_of_teams || latestRows.length || league.number_of_teams,
        });
        leaguesUpdated++;
    }

    return { clubsUpdated, leaguesUpdated, seasonsBackfilled };
}
