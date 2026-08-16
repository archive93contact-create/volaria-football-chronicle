import { base44 } from '@/api/base44Client';

const normalise = (value) => String(value || '').trim().toLowerCase();

const yearSort = (a, b) => String(a || '').localeCompare(String(b || ''), undefined, { numeric: true });

const FINISH_RANK = {
    Winner: 0,
    Final: 1,
    'Semi-final': 2,
    'Semi-Final': 2,
    'Semi-finals': 2,
    'Quarter-final': 3,
    'Quarter-Final': 3,
    'Quarter-finals': 3,
    'Round of 16': 4,
    'Round of 32': 5,
    'Group Stage': 6,
};

const displayFinish = (round) => {
    if (!round) return null;
    if (/^semi/i.test(round)) return 'Semi-final';
    if (/^quarter/i.test(round)) return 'Quarter-final';
    return round;
};

const resolveClub = (clubs, id, name) => {
    if (id) {
        const byId = clubs.find(c => c.id === id);
        if (byId) return byId;
    }
    const key = normalise(name);
    if (!key) return null;
    return clubs.find(c => normalise(c.name) === key || normalise(c.shortened_name) === key) || null;
};

const resolveNation = (nations, id, name) => {
    if (id) {
        const byId = nations.find(n => n.id === id);
        if (byId) return byId;
    }
    const key = normalise(name);
    if (!key) return null;
    return nations.find(n => normalise(n.name) === key) || null;
};

const competitionPrefix = (competition) => {
    const short = String(competition?.short_name || '').trim().toUpperCase();
    if (short === 'VCC') return 'vcc';
    if (short === 'CCC') return 'ccc';
    if (competition?.tier === 1) return 'vcc';
    if (competition?.tier === 2) return 'ccc';
    return null;
};

const getWinnerClub = (match, clubs) => {
    if (match.winner_id) return resolveClub(clubs, match.winner_id, match.winner);
    if (match.winner) return resolveClub(clubs, null, match.winner);

    const homeScore = match.is_single_leg ? match.home_score_leg1 : match.home_aggregate;
    const awayScore = match.is_single_leg ? match.away_score_leg1 : match.away_aggregate;
    if (homeScore == null || awayScore == null) return null;
    if (homeScore > awayScore) return resolveClub(clubs, match.home_club_id, match.home_club_name);
    if (awayScore > homeScore) return resolveClub(clubs, match.away_club_id, match.away_club_name);
    if (match.penalties) {
        const [homePens, awayPens] = String(match.penalties).split('-').map(Number);
        if (Number.isFinite(homePens) && Number.isFinite(awayPens)) {
            return homePens > awayPens
                ? resolveClub(clubs, match.home_club_id, match.home_club_name)
                : resolveClub(clubs, match.away_club_id, match.away_club_name);
        }
    }
    return null;
};

/**
 * Rebuild continental aggregate stats from ContinentalSeason + ContinentalMatch.
 * This is deliberately idempotent: running it repeatedly produces the same totals.
 */
export async function syncContinentalCompetition(competitionId) {
    if (!competitionId) return { clubsUpdated: 0, seasonsBackfilled: 0, matchesBackfilled: 0 };

    const [competitions, allSeasons, allMatches, clubs, nations] = await Promise.all([
        base44.entities.ContinentalCompetition.filter({ id: competitionId }),
        base44.entities.ContinentalSeason.filter({ competition_id: competitionId }),
        base44.entities.ContinentalMatch.list(),
        base44.entities.Club.list(),
        base44.entities.Nation.list(),
    ]);

    const competition = competitions[0];
    if (!competition) return { clubsUpdated: 0, seasonsBackfilled: 0, matchesBackfilled: 0 };

    const prefix = competitionPrefix(competition);
    if (!prefix) return { clubsUpdated: 0, seasonsBackfilled: 0, matchesBackfilled: 0 };

    const seasonIds = new Set(allSeasons.map(s => s.id));
    const matches = allMatches.filter(m => seasonIds.has(m.season_id));
    const seasonById = new Map(allSeasons.map(s => [s.id, s]));

    let seasonsBackfilled = 0;
    let matchesBackfilled = 0;

    // Backfill canonical relationship IDs onto historical season snapshots.
    for (const season of allSeasons) {
        const champion = resolveClub(clubs, season.champion_id, season.champion_name);
        const runnerUp = resolveClub(clubs, season.runner_up_id, season.runner_up);
        const championNation = champion
            ? resolveNation(nations, champion.nation_id, season.champion_nation)
            : resolveNation(nations, season.champion_nation_id, season.champion_nation);
        const runnerNation = runnerUp
            ? resolveNation(nations, runnerUp.nation_id, season.runner_up_nation)
            : resolveNation(nations, season.runner_up_nation_id, season.runner_up_nation);

        const patch = {};
        if (champion && season.champion_id !== champion.id) patch.champion_id = champion.id;
        if (championNation && season.champion_nation_id !== championNation.id) patch.champion_nation_id = championNation.id;
        if (runnerUp && season.runner_up_id !== runnerUp.id) patch.runner_up_id = runnerUp.id;
        if (runnerNation && season.runner_up_nation_id !== runnerNation.id) patch.runner_up_nation_id = runnerNation.id;
        if (Object.keys(patch).length) {
            await base44.entities.ContinentalSeason.update(season.id, patch);
            Object.assign(season, patch);
            seasonsBackfilled++;
        }
    }

    // Backfill IDs on match rows too, keeping names as historical snapshots.
    for (const match of matches) {
        const home = resolveClub(clubs, match.home_club_id, match.home_club_name);
        const away = resolveClub(clubs, match.away_club_id, match.away_club_name);
        const homeNation = home
            ? resolveNation(nations, home.nation_id, match.home_club_nation)
            : resolveNation(nations, match.home_nation_id, match.home_club_nation);
        const awayNation = away
            ? resolveNation(nations, away.nation_id, match.away_club_nation)
            : resolveNation(nations, match.away_nation_id, match.away_club_nation);
        const winner = getWinnerClub(match, clubs);
        const patch = {};

        if (home && match.home_club_id !== home.id) patch.home_club_id = home.id;
        if (away && match.away_club_id !== away.id) patch.away_club_id = away.id;
        if (homeNation && match.home_nation_id !== homeNation.id) patch.home_nation_id = homeNation.id;
        if (awayNation && match.away_nation_id !== awayNation.id) patch.away_nation_id = awayNation.id;
        if (winner && match.winner_id !== winner.id) patch.winner_id = winner.id;
        if (winner && !match.winner) patch.winner = winner.name;

        if (Object.keys(patch).length) {
            await base44.entities.ContinentalMatch.update(match.id, patch);
            Object.assign(match, patch);
            matchesBackfilled++;
        }
    }

    const seasonRecords = new Map();
    const ensureRecord = (club, season) => {
        if (!club || !season) return null;
        const key = `${club.id}:${season.id}`;
        if (!seasonRecords.has(key)) {
            seasonRecords.set(key, {
                club,
                season,
                finish: null,
                finishRank: 99,
                isWinner: false,
                isRunnerUp: false,
            });
        }
        return seasonRecords.get(key);
    };

    const setFinish = (record, finish, rank = FINISH_RANK[finish] ?? 99) => {
        if (!record || !finish) return;
        if (rank < record.finishRank) {
            record.finish = finish;
            record.finishRank = rank;
        }
    };

    // Participation and exit rounds are derived from the actual match rows.
    for (const match of matches) {
        const season = seasonById.get(match.season_id);
        if (!season) continue;
        const home = resolveClub(clubs, match.home_club_id, match.home_club_name);
        const away = resolveClub(clubs, match.away_club_id, match.away_club_name);
        const winner = getWinnerClub(match, clubs);
        const homeRecord = ensureRecord(home, season);
        const awayRecord = ensureRecord(away, season);

        if (winner) {
            const loserRecord = winner.id === home?.id ? awayRecord : winner.id === away?.id ? homeRecord : null;
            if (loserRecord) {
                const finish = match.round === 'Final' ? 'Final' : displayFinish(match.round);
                setFinish(loserRecord, finish, match.round === 'Final' ? FINISH_RANK.Final : (FINISH_RANK[finish] ?? 99));
                if (match.round === 'Final') loserRecord.isRunnerUp = true;
            }
        }
    }

    // Season summary remains authoritative for champion/runner-up, even for old seasons without full match data.
    for (const season of allSeasons) {
        const champion = resolveClub(clubs, season.champion_id, season.champion_name);
        const runnerUp = resolveClub(clubs, season.runner_up_id, season.runner_up);
        const championRecord = ensureRecord(champion, season);
        const runnerRecord = ensureRecord(runnerUp, season);
        if (championRecord) {
            championRecord.isWinner = true;
            setFinish(championRecord, 'Winner', FINISH_RANK.Winner);
        }
        if (runnerRecord) {
            runnerRecord.isRunnerUp = true;
            setFinish(runnerRecord, 'Final', FINISH_RANK.Final);
        }
    }

    const statsByClub = new Map();
    const ensureStats = (club) => {
        if (!club) return null;
        if (!statsByClub.has(club.id)) {
            statsByClub.set(club.id, {
                club,
                appearances: new Set(),
                titleYears: [],
                runnerUp: 0,
                bestFinish: null,
                bestRank: 99,
                bestFinishYear: null,
            });
        }
        return statsByClub.get(club.id);
    };

    for (const record of seasonRecords.values()) {
        const stats = ensureStats(record.club);
        stats.appearances.add(record.season.id);
        if (record.isWinner) stats.titleYears.push(record.season.year);
        if (record.isRunnerUp) stats.runnerUp++;
        if (record.finish && record.finishRank < stats.bestRank) {
            stats.bestFinish = record.finish;
            stats.bestRank = record.finishRank;
            stats.bestFinishYear = record.season.year;
        } else if (record.finish && record.finishRank === stats.bestRank && stats.bestFinishYear) {
            // For equal best finishes, retain the earliest historical occurrence.
            if (yearSort(record.season.year, stats.bestFinishYear) < 0) stats.bestFinishYear = record.season.year;
        }
    }

    // Include clubs carrying old aggregate stats so deleted/corrected results can reset them cleanly.
    for (const club of clubs) {
        if ((club[`${prefix}_appearances`] || 0) > 0 || (club[`${prefix}_titles`] || 0) > 0 || (club[`${prefix}_runner_up`] || 0) > 0) {
            ensureStats(club);
        }
    }

    let clubsUpdated = 0;
    for (const { club, appearances, titleYears, runnerUp, bestFinish, bestFinishYear } of statsByClub.values()) {
        const sortedTitleYears = [...new Set(titleYears.filter(Boolean))].sort(yearSort);
        await base44.entities.Club.update(club.id, {
            [`${prefix}_appearances`]: appearances.size,
            [`${prefix}_titles`]: sortedTitleYears.length,
            [`${prefix}_title_years`]: sortedTitleYears.join(', '),
            [`${prefix}_runner_up`]: runnerUp,
            [`${prefix}_best_finish`]: bestFinish || null,
            [`${prefix}_best_finish_year`]: bestFinishYear || null,
        });
        clubsUpdated++;
    }

    const sortedSeasons = [...allSeasons].sort((a, b) => yearSort(b.year, a.year));
    const latest = sortedSeasons.find(s => s.champion_name || s.champion_id);
    const titleCounts = {};
    for (const season of allSeasons) {
        const champion = resolveClub(clubs, season.champion_id, season.champion_name);
        const key = champion?.id || normalise(season.champion_name);
        if (!key) continue;
        if (!titleCounts[key]) titleCounts[key] = { count: 0, name: champion?.name || season.champion_name };
        titleCounts[key].count++;
    }
    const mostSuccessful = Object.values(titleCounts).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))[0];

    await base44.entities.ContinentalCompetition.update(competition.id, {
        current_champion: latest?.champion_name || '',
        most_titles_club: mostSuccessful?.name || '',
        most_titles_count: mostSuccessful?.count || 0,
    });

    return { clubsUpdated, seasonsBackfilled, matchesBackfilled };
}

export async function syncAllContinentalStats() {
    const competitions = await base44.entities.ContinentalCompetition.list();
    const results = [];
    for (const competition of competitions) {
        results.push({ competitionId: competition.id, ...(await syncContinentalCompetition(competition.id)) });
    }
    return results;
}
