// Pure analytics functions computed from Match records.
// All functions are deterministic and take already-fetched match arrays.

// ── Club head-to-head ───────────────────────────────────────────────────────
// Given a club and all matches it played in, compute per-opponent records.
export function computeClubHeadToHead(club, matches) {
    if (!club || !matches || matches.length === 0) return { opponents: [], summary: null };

    const oppMap = {};

    const getOppKey = (m, isHome) => {
        if (isHome) return m.away_club_id || m.away_club_name;
        return m.home_club_id || m.home_club_name;
    };
    const getOppName = (m, isHome) => isHome ? m.away_club_name : m.home_club_name;
    const getOppId = (m, isHome) => isHome ? m.away_club_id : m.home_club_id;

    const clubId = club.id;
    const clubName = (club.name || '').toLowerCase();

    const involvesClub = (m) =>
        m.home_club_id === clubId || m.away_club_id === clubId ||
        (m.home_club_name && m.home_club_name.toLowerCase() === clubName) ||
        (m.away_club_name && m.away_club_name.toLowerCase() === clubName);

    const relevant = matches.filter(involvesClub);

    // Sort by year then matchday for streak detection
    const sorted = [...relevant].sort((a, b) => {
        const ya = (a.year || '').localeCompare(b.year || '');
        if (ya !== 0) return ya;
        return (a.matchday || 0) - (b.matchday || 0);
    });

    sorted.forEach(m => {
        const isHome = m.home_club_id === clubId || (m.home_club_name && m.home_club_name.toLowerCase() === clubName);
        if (!isHome && !(m.away_club_id === clubId || (m.away_club_name && m.away_club_name.toLowerCase() === clubName))) return;

        const oppId = getOppId(m, isHome);
        const oppName = getOppName(m, isHome);
        const key = oppId || oppName;
        if (!key) return;

        if (!oppMap[key]) {
            oppMap[key] = {
                oppId, oppName,
                played: 0, won: 0, drawn: 0, lost: 0,
                gf: 0, ga: 0,
                biggestWin: null, biggestLoss: null,
                results: [], // chronological 'W'/'D'/'L' for streak
            };
        }
        const rec = oppMap[key];
        const myScore = isHome ? (m.home_score ?? 0) : (m.away_score ?? 0);
        const oppScore = isHome ? (m.away_score ?? 0) : (m.home_score ?? 0);
        rec.played++;
        rec.gf += myScore;
        rec.ga += oppScore;

        let outcome;
        if (myScore > oppScore) { rec.won++; outcome = 'W'; }
        else if (myScore < oppScore) { rec.lost++; outcome = 'L'; }
        else { rec.drawn++; outcome = 'D'; }
        rec.results.push({ outcome, year: m.year, matchday: m.matchday, myScore, oppScore, isHome });

        const margin = myScore - oppScore;
        const matchInfo = { year: m.year, score: `${myScore}-${oppScore}`, isHome };
        if (margin > 0) {
            if (!rec.biggestWin || margin > (rec.biggestWin.margin || 0)) {
                rec.biggestWin = { ...matchInfo, margin };
            }
        } else if (margin < 0) {
            if (!rec.biggestLoss || margin < (rec.biggestLoss.margin || 0)) {
                rec.biggestLoss = { ...matchInfo, margin };
            }
        }
    });

    // Compute current streak (from most recent result backward)
    Object.values(oppMap).forEach(rec => {
        const r = [...rec.results].reverse();
        let streak = 0;
        let streakType = r[0]?.outcome || null;
        if (streakType) {
            for (const x of r) {
                if (x.outcome === streakType) streak++;
                else break;
            }
        }
        rec.currentStreak = streak > 0 ? `${streak}${streakType === 'W' ? 'W' : streakType === 'L' ? 'L' : 'D'}` : null;
    });

    const opponents = Object.values(oppMap).sort((a, b) => b.played - a.played || a.oppName.localeCompare(b.oppName));

    const summary = {
        totalMatches: relevant.length,
        totalWon: opponents.reduce((s, o) => s + o.won, 0),
        totalDrawn: opponents.reduce((s, o) => s + o.drawn, 0),
        totalLost: opponents.reduce((s, o) => s + o.lost, 0),
        totalGf: opponents.reduce((s, o) => s + o.gf, 0),
        totalGa: opponents.reduce((s, o) => s + o.ga, 0),
        opponentCount: opponents.length,
    };

    return { opponents, summary };
}

// ── League match analytics ──────────────────────────────────────────────────
export function computeLeagueMatchStats(matches) {
    if (!matches || matches.length === 0) return null;

    const completed = matches.filter(m =>
        m.home_score != null && m.away_score != null &&
        m.home_club_name && m.away_club_name
    );

    if (completed.length === 0) return null;

    let totalGoals = 0;
    let homeWins = 0, awayWins = 0, draws = 0;
    const scorelines = {};
    let highestScoring = null;
    let biggestHomeWin = null;
    let biggestAwayWin = null;

    completed.forEach(m => {
        const hs = m.home_score, as = m.away_score;
        const total = hs + as;
        totalGoals += total;

        const key = `${hs}-${as}`;
        scorelines[key] = (scorelines[key] || 0) + 1;

        const info = {
            year: m.year, matchday: m.matchday,
            home: m.home_club_name, away: m.away_club_name,
            homeScore: hs, awayScore: as, total,
            homeId: m.home_club_id, awayId: m.away_club_id,
        };

        if (!highestScoring || total > highestScoring.total) highestScoring = info;

        if (hs > as) {
            homeWins++;
            const margin = hs - as;
            if (!biggestHomeWin || margin > biggestHomeWin.margin) biggestHomeWin = { ...info, margin };
        } else if (as > hs) {
            awayWins++;
            const margin = as - hs;
            if (!biggestAwayWin || margin > biggestAwayWin.margin) biggestAwayWin = { ...info, margin };
        } else {
            draws++;
        }
    });

    const topScorelines = Object.entries(scorelines)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([score, count]) => ({ score, count }));

    return {
        totalMatches: completed.length,
        totalGoals,
        avgGoals: (totalGoals / completed.length).toFixed(2),
        homeWins, awayWins, draws,
        homeWinRate: ((homeWins / completed.length) * 100).toFixed(1),
        awayWinRate: ((awayWins / completed.length) * 100).toFixed(1),
        drawRate: ((draws / completed.length) * 100).toFixed(1),
        topScorelines,
        highestScoring,
        biggestHomeWin,
        biggestAwayWin,
    };
}

// ── Local derby dominance ───────────────────────────────────────────────────
// Matches between clubs that are all in the same location.
// Returns a ranked table with a 0-100 dominance score per club.
export function computeLocalDerbyTable(locationClubs, matches) {
    if (!locationClubs || locationClubs.length < 2 || !matches || matches.length === 0) {
        return { table: [], matches: [] };
    }

    const clubIdSet = new Set(locationClubs.map(c => c.id).filter(Boolean));
    const nameToId = {};
    locationClubs.forEach(c => { if (c.name) nameToId[c.name.toLowerCase()] = c.id; });

    const bothLocal = matches.filter(m => {
        const hId = m.home_club_id || nameToId[(m.home_club_name || '').toLowerCase()];
        const aId = m.away_club_id || nameToId[(m.away_club_name || '').toLowerCase()];
        return hId && aId && clubIdSet.has(hId) && clubIdSet.has(aId);
    });

    if (bothLocal.length === 0) return { table: [], matches: bothLocal };

    const stats = {};
    locationClubs.forEach(c => {
        stats[c.id] = {
            club: c, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0,
        };
    });

    bothLocal.forEach(m => {
        const hId = m.home_club_id || nameToId[(m.home_club_name || '').toLowerCase()];
        const aId = m.away_club_id || nameToId[(m.away_club_name || '').toLowerCase()];
        if (!hId || !aId || hId === aId) return;
        const hs = m.home_score ?? 0, as = m.away_score ?? 0;
        const h = stats[hId], a = stats[aId];
        if (!h || !a) return;
        h.played++; a.played++;
        h.gf += hs; h.ga += as;
        a.gf += as; a.ga += hs;
        if (hs > as) { h.won++; a.lost++; h.points += 3; }
        else if (as > hs) { a.won++; h.lost++; a.points += 3; }
        else { h.drawn++; a.drawn++; h.points++; a.points++; }
    });

    const table = Object.values(stats).filter(s => s.played > 0);
    // Sort by points, then GD, then GF
    table.sort((a, b) =>
        b.points - a.points ||
        (b.gf - b.ga) - (a.gf - a.ga) ||
        b.gf - a.gf
    );

    // Dominance score: points% + win rate bonus, scaled 0-100
    // max possible points = played * 3; score = points/maxPoints * 70 + winRate * 30
    table.forEach((row, idx) => {
        const maxPoints = row.played * 3;
        const pointsPct = maxPoints > 0 ? (row.points / maxPoints) : 0;
        const winRate = row.played > 0 ? (row.won / row.played) : 0;
        row.dominanceScore = Math.round(pointsPct * 70 + winRate * 30);
        row.rank = idx + 1;
        row.goalDifference = row.gf - row.ga;
    });

    return { table, matches: bothLocal };
}

// Compute the dominance score for a single club given its local rivals and matches.
export function computeClubDominance(club, locationClubs, matches) {
    if (!locationClubs || locationClubs.length < 2) return { score: null, rank: null };
    const { table } = computeLocalDerbyTable(locationClubs, matches);
    const row = table.find(r => r.club.id === club.id);
    return row
        ? { score: row.dominanceScore, rank: row.rank, played: row.played, won: row.won, drawn: row.drawn, lost: row.lost }
        : { score: null, rank: null };
}