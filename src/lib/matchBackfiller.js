// Deterministic backfiller: generates round-robin fixtures + results that
// reproduce a season's final LeagueTable stats (W/D/L/points exact, goals best-effort exact).

// ── Round-robin fixture generation (circle method) ──────────────────────────
function generateRoundRobinFixtures(teams, doubleRound) {
    const n = teams.length;
    let teamList = [...teams];
    if (n % 2 !== 0) teamList.push(null); // bye
    const totalRounds = teamList.length - 1;
    const firstHalf = [];
    for (let r = 0; r < totalRounds; r++) {
        const round = [];
        for (let i = 0; i < teamList.length / 2; i++) {
            const home = teamList[i];
            const away = teamList[teamList.length - 1 - i];
            if (home && away) round.push({ home, away });
        }
        firstHalf.push(round);
        teamList.splice(1, 0, teamList.pop());
    }
    if (!doubleRound) return firstHalf;
    const secondHalf = firstHalf.map(round =>
        round.map(m => ({ home: m.away, away: m.home }))
    );
    return [...firstHalf, ...secondHalf];
}

// ── Result assignment (W/D/L) ───────────────────────────────────────────────
function tryAssignResults(matches, tableMap, seed) {
    const remaining = {};
    for (const [id, row] of Object.entries(tableMap)) {
        remaining[id] = { w: row.won || 0, d: row.drawn || 0, l: row.lost || 0 };
    }
    let s = seed;
    const rng = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };

    const assigned = matches.map(m => ({ ...m, result: null }));
    const order = [...Array(matches.length).keys()];
    for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
    }

    let deficit = 0;
    for (const idx of order) {
        const m = assigned[idx];
        const hr = remaining[m.home.id];
        const ar = remaining[m.away.id];
        const opts = [
            { r: 'H', h: 'w', a: 'l' },
            { r: 'D', h: 'd', a: 'd' },
            { r: 'A', h: 'l', a: 'w' },
        ];
        const feasible = opts.filter(o => hr[o.h] > 0 && ar[o.a] > 0);
        let choice;
        if (feasible.length > 0) {
            choice = feasible[Math.floor(rng() * feasible.length)];
        } else {
            choice = opts.reduce((best, o) => {
                const cost = Math.max(0, 1 - hr[o.h]) + Math.max(0, 1 - ar[o.a]);
                const bestCost = Math.max(0, 1 - hr[best.h]) + Math.max(0, 1 - ar[best.a]);
                return cost < bestCost ? o : best;
            });
            deficit += Math.max(0, 1 - hr[choice.h]) + Math.max(0, 1 - ar[choice.a]);
        }
        m.result = choice.r;
        hr[choice.h] = Math.max(0, hr[choice.h] - 1);
        ar[choice.a] = Math.max(0, ar[choice.a] - 1);
    }
    return { assigned, deficit };
}

// Contribution of a result to a team's W/D/L
function resultContribution(result, side) {
    if (result === 'H') return side === 'home' ? { w: 1, d: 0, l: 0 } : { w: 0, d: 0, l: 1 };
    if (result === 'D') return { w: 0, d: 1, l: 0 };
    return side === 'home' ? { w: 0, d: 0, l: 1 } : { w: 1, d: 0, l: 0 };
}

// Simulated-annealing repair: reassign match results to minimize W/D/L deficit
function repairResults(matches, tableMap) {
    const targets = {};
    for (const [id, row] of Object.entries(tableMap)) {
        targets[id] = { w: row.won || 0, d: row.drawn || 0, l: row.lost || 0 };
    }
    const deficit = {};
    for (const [id, t] of Object.entries(targets)) deficit[id] = { w: t.w, d: t.d, l: t.l };
    for (const m of matches) {
        const c = resultContribution(m.result, 'home'), ca = resultContribution(m.result, 'away');
        deficit[m.home.id].w -= c.w; deficit[m.home.id].d -= c.d; deficit[m.home.id].l -= c.l;
        deficit[m.away.id].w -= ca.w; deficit[m.away.id].d -= ca.d; deficit[m.away.id].l -= ca.l;
    }
    let total = 0;
    for (const id of Object.keys(deficit)) total += Math.abs(deficit[id].w) + Math.abs(deficit[id].d) + Math.abs(deficit[id].l);

    let bestTotal = total;
    let bestSnapshot = matches.map(m => m.result);
    let s = 98765;
    const rng = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    const maxIter = Math.min(200000, 1000 * matches.length);

    for (let iter = 0; iter < maxIter && total > 0; iter++) {
        const mi = Math.floor(rng() * matches.length);
        const m = matches[mi];
        const old = m.result;
        const opts = ['H', 'D', 'A'].filter(r => r !== old);
        const nr = opts[Math.floor(rng() * opts.length)];
        const hd = deficit[m.home.id], ad = deficit[m.away.id];
        const hO = resultContribution(old, 'home'), hN = resultContribution(nr, 'home');
        const aO = resultContribution(old, 'away'), aN = resultContribution(nr, 'away');
        let delta = 0;
        delta += Math.abs(hd.w + hO.w - hN.w) - Math.abs(hd.w);
        delta += Math.abs(hd.d + hO.d - hN.d) - Math.abs(hd.d);
        delta += Math.abs(hd.l + hO.l - hN.l) - Math.abs(hd.l);
        delta += Math.abs(ad.w + aO.w - aN.w) - Math.abs(ad.w);
        delta += Math.abs(ad.d + aO.d - aN.d) - Math.abs(ad.d);
        delta += Math.abs(ad.l + aO.l - aN.l) - Math.abs(ad.l);
        const temp = Math.max(0.05, 2.5 * (1 - iter / maxIter));
        if (delta <= 0 || rng() < Math.exp(-delta / temp)) {
            hd.w += hO.w - hN.w; hd.d += hO.d - hN.d; hd.l += hO.l - hN.l;
            ad.w += aO.w - aN.w; ad.d += aO.d - aN.d; ad.l += aO.l - aN.l;
            total += delta;
            m.result = nr;
            if (total < bestTotal) {
                bestTotal = total;
                bestSnapshot = matches.map(mm => mm.result);
            }
        }
    }
    matches.forEach((m, i) => { m.result = bestSnapshot[i]; });
    return { matches, resultDeficit: bestTotal };
}

function assignResults(matches, tableMap) {
    // Try greedy first (fast path)
    for (let seed = 1; seed <= 20; seed++) {
        const { assigned, deficit } = tryAssignResults(matches, tableMap, seed);
        if (deficit === 0) return { matches: assigned, resultDeficit: 0 };
    }
    // Fallback: greedy best + hill-climbing repair
    let best = null;
    for (let seed = 1; seed <= 10; seed++) {
        const { assigned, deficit } = tryAssignResults(matches, tableMap, seed);
        if (!best || deficit < best.resultDeficit) best = { matches: assigned, resultDeficit: deficit };
    }
    return repairResults(best.matches, tableMap);
}

// ── Score assignment (GF/GA) ────────────────────────────────────────────────
function assignScores(matches, tableMap) {
    const gf = {}, ga = {}, games = {};
    for (const [id, row] of Object.entries(tableMap)) {
        gf[id] = row.goals_for || 0;
        ga[id] = row.goals_against || 0;
        games[id] = row.played || 0;
    }

    // Cap individual match scores so the repair can't manufacture 6-0 / 7-1
    // hammerings even when a team's season goal total is high.
    const MAX_MATCH_GOALS = 5;
    for (const m of matches) {
        const hGames = games[m.home.id] || 1;
        const aGames = games[m.away.id] || 1;
        // Floor (not round): base score sits at a low realistic 0-1, and the
        // repair only adds goals where the season totals actually require it —
        // so most matches land at 1-0 / 1-1 / 2-1 instead of 3-0 / 4-1.
        let hs = Math.floor((gf[m.home.id] || 0) / hGames);
        let as = Math.floor((gf[m.away.id] || 0) / aGames);

        if (m.result === 'H') { if (hs <= as) hs = as + 1; }
        else if (m.result === 'D') { hs = as = Math.max(hs, as); }
        else if (m.result === 'A') { if (as <= hs) as = hs + 1; }

        hs = Math.max(0, Math.min(MAX_MATCH_GOALS, hs));
        as = Math.max(0, Math.min(MAX_MATCH_GOALS, as));

        m.home_score = hs;
        m.away_score = as;
        gf[m.home.id] = (gf[m.home.id] || 0) - hs;
        ga[m.home.id] = (ga[m.home.id] || 0) - as;
        gf[m.away.id] = (gf[m.away.id] || 0) - as;
        ga[m.away.id] = (ga[m.away.id] || 0) - hs;
        games[m.home.id] = Math.max(0, (games[m.home.id] || 0) - 1);
        games[m.away.id] = Math.max(0, (games[m.away.id] || 0) - 1);
    }

    const goalError = repairScores(matches, tableMap);
    return { goalError };
}

function repairScores(matches, tableMap) {
    const ids = Object.keys(tableMap);
    const computeErrors = () => {
        const actGf = {}, actGa = {};
        ids.forEach(id => { actGf[id] = 0; actGa[id] = 0; });
        for (const m of matches) {
            actGf[m.home.id] += m.home_score; actGa[m.home.id] += m.away_score;
            actGf[m.away.id] += m.away_score; actGa[m.away.id] += m.home_score;
        }
        let total = 0;
        const errors = {};
        for (const id of ids) {
            errors[id] = {
                gf: (tableMap[id].goals_for || 0) - actGf[id],
                ga: (tableMap[id].goals_against || 0) - actGa[id]
            };
            total += Math.abs(errors[id].gf) + Math.abs(errors[id].ga);
        }
        return { errors, total };
    };

    const canAdjust = (m, dh, da) => {
        const nh = m.home_score + dh, na = m.away_score + da;
        if (nh < 0 || na < 0) return false;
        if (nh > 5 || na > 5) return false; // keep scorelines realistic
        if (m.result === 'H' && !(nh > na)) return false;
        if (m.result === 'D' && !(nh === na)) return false;
        if (m.result === 'A' && !(nh < na)) return false;
        return true;
    };

    let { errors, total } = computeErrors();
    let bestTotal = total;
    let bestSnapshot = matches.map(m => ({ h: m.home_score, a: m.away_score }));
    let s = 54321;
    const rng = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    const maxIter = Math.min(200000, 1000 * matches.length);
    let sinceImprove = 0;

    for (let iter = 0; iter < maxIter && total > 0; iter++) {
        const m = matches[Math.floor(rng() * matches.length)];
        const moves = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1]].filter(([dh, da]) => canAdjust(m, dh, da));
        if (moves.length === 0) continue;
        const [dh, da] = moves[Math.floor(rng() * moves.length)];
        const he = errors[m.home.id], ae = errors[m.away.id];
        let delta = 0;
        if (dh !== 0) {
            delta += Math.abs(he.gf - dh) - Math.abs(he.gf);
            delta += Math.abs(ae.ga - dh) - Math.abs(ae.ga);
        }
        if (da !== 0) {
            delta += Math.abs(ae.gf - da) - Math.abs(ae.gf);
            delta += Math.abs(he.ga - da) - Math.abs(he.ga);
        }
        let temp = Math.max(0.05, 2.0 * (1 - iter / maxIter));
        if (sinceImprove > maxIter * 0.1) temp = Math.max(temp, 1.5);
        if (delta <= 0 || rng() < Math.exp(-delta / temp)) {
            m.home_score += dh; m.away_score += da;
            if (dh !== 0) { he.gf -= dh; ae.ga -= dh; }
            if (da !== 0) { ae.gf -= da; he.ga -= da; }
            total += delta;
            sinceImprove++;
            if (total < bestTotal) {
                bestTotal = total;
                bestSnapshot = matches.map(mm => ({ h: mm.home_score, a: mm.away_score }));
                sinceImprove = 0;
            }
        }
    }
    matches.forEach((m, i) => { m.home_score = bestSnapshot[i].h; m.away_score = bestSnapshot[i].a; });
    return bestTotal;
}

// ── Verify generated matches against the table ──────────────────────────────
function verifyMatches(matches, tableMap) {
    const agg = {};
    for (const [id, row] of Object.entries(tableMap)) {
        agg[id] = { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 };
    }
    for (const m of matches) {
        const h = agg[m.home.id], a = agg[m.away.id];
        if (!h || !a) continue;
        h.played++; a.played++;
        h.gf += m.home_score; h.ga += m.away_score;
        a.gf += m.away_score; a.ga += m.home_score;
        if (m.home_score > m.away_score) { h.won++; a.lost++; h.points += 3; }
        else if (m.home_score < m.away_score) { a.won++; h.lost++; a.points += 3; }
        else { h.drawn++; a.drawn++; h.points++; a.points++; }
    }
    const mismatches = [];
    for (const [id, row] of Object.entries(tableMap)) {
        const a = agg[id];
        if (a.played !== (row.played || 0)) mismatches.push(`${row.club_name}: played ${a.played}/${row.played}`);
        if (a.won !== (row.won || 0)) mismatches.push(`${row.club_name}: W ${a.won}/${row.won}`);
        if (a.drawn !== (row.drawn || 0)) mismatches.push(`${row.club_name}: D ${a.drawn}/${row.drawn}`);
        if (a.lost !== (row.lost || 0)) mismatches.push(`${row.club_name}: L ${a.lost}/${row.lost}`);
        if (a.gf !== (row.goals_for || 0)) mismatches.push(`${row.club_name}: GF ${a.gf}/${row.goals_for}`);
        if (a.ga !== (row.goals_against || 0)) mismatches.push(`${row.club_name}: GA ${a.ga}/${row.goals_against}`);
        if (a.points !== (row.points || 0)) mismatches.push(`${row.club_name}: Pts ${a.points}/${row.points}`);
    }
    return { agg, mismatches };
}

// ── Main entry: backfill one season ────────────────────────────────────────
export function backfillSeason(tableRows, seasonId, leagueId, year) {
    const validRows = tableRows.filter(r => r.club_name && r.club_id);
    if (validRows.length < 2) {
        return { ok: false, error: 'Need at least 2 clubs with names and IDs in the table' };
    }

    const n = validRows.length;
    const played = validRows[0].played || 0;
    const expectedDouble = 2 * (n - 1);
    const expectedSingle = n - 1;
    let doubleRound;
    if (played === expectedDouble) doubleRound = true;
    else if (played === expectedSingle) doubleRound = false;
    else if (validRows.every(r => (r.played || 0) === expectedDouble)) doubleRound = true;
    else doubleRound = played > expectedSingle;

    // Build teams + tableMap
    const teams = validRows.map(r => ({ id: r.club_id, name: r.club_name }));
    const tableMap = {};
    validRows.forEach(r => { tableMap[r.club_id] = r; });

    // Generate fixtures
    const rounds = generateRoundRobinFixtures(teams, doubleRound);
    const matches = [];
    rounds.forEach((round, ri) => {
        round.forEach(f => matches.push({
            home: f.home, away: f.away, matchday: ri + 1,
            result: null, home_score: 0, away_score: 0
        }));
    });

    // Assign results (W/D/L)
    const { matches: withResults, resultDeficit } = assignResults(matches, tableMap);

    // Assign scores (GF/GA)
    const { goalError } = assignScores(withResults, tableMap);

    // Verify
    const { mismatches } = verifyMatches(withResults, tableMap);

    // Build Match entity records
    const matchRecords = withResults.map(m => ({
        season_id: seasonId,
        league_id: leagueId,
        year: year,
        matchday: m.matchday,
        home_club_id: m.home.id,
        home_club_name: m.home.name,
        away_club_id: m.away.id,
        away_club_name: m.away.name,
        home_score: m.home_score,
        away_score: m.away_score,
    }));

    return {
        ok: true,
        matchRecords,
        stats: {
            teams: n,
            matchdays: rounds.length,
            matches: matchRecords.length,
            doubleRound,
            resultDeficit,
            goalError,
            mismatches,
        }
    };
}

// ── Normalize tables so totals are mathematically consistent ────────────────
// sum(W) must equal sum(L); sum(GF) must equal sum(GA). Adjusts minimally,
// preferring bottom-table teams to protect top standings.
export function normalizeTables(tableRows, targetGames) {
    const rows = tableRows
        .filter(r => r.club_name && r.club_id)
        .map(r => ({ ...r }));
    if (rows.length < 2) return { rows, adjustments: [] };

    rows.sort((a, b) => (a.position || 99) - (b.position || 99));
    const adjustments = [];

    const n = rows.length;
    const tg = targetGames || rows[0].played || (2 * (n - 1));

    // Fix each team's W+D+L to equal the target games per team
    for (const r of rows) {
        let sum = (r.won || 0) + (r.drawn || 0) + (r.lost || 0);
        r.played = tg;
        while (sum > tg) {
            if ((r.won || 0) >= (r.drawn || 0) && (r.won || 0) >= (r.lost || 0)) { r.won = (r.won || 0) - 1; adjustments.push({ team: r.club_name, change: 'W−1 (trim)' }); }
            else if ((r.lost || 0) >= (r.drawn || 0)) { r.lost = (r.lost || 0) - 1; adjustments.push({ team: r.club_name, change: 'L−1 (trim)' }); }
            else { r.drawn = (r.drawn || 0) - 1; adjustments.push({ team: r.club_name, change: 'D−1 (trim)' }); }
            sum--;
        }
        while (sum < tg) {
            r.drawn = (r.drawn || 0) + 1;
            adjustments.push({ team: r.club_name, change: 'D+1 (pad)' });
            sum++;
        }
    }

    // Clamp per-team goals to a realistic band (0.55x–2.0x games played) so
    // the LLM can't inject arcade scorelines even when it ignores the prompt.
    const gfMin = Math.floor(tg * 0.55);
    const gfMax = Math.ceil(tg * 1.6);
    for (const r of rows) {
        const gf = r.goals_for || 0;
        if (gf > gfMax) {
            r.goals_for = gfMax;
            adjustments.push({ team: r.club_name, change: `GF ${gf}→${gfMax} (clamp)` });
        } else if (gf < gfMin && gf > 0) {
            r.goals_for = gfMin;
            adjustments.push({ team: r.club_name, change: `GF ${gf}→${gfMin} (floor)` });
        }
        const ga = r.goals_against || 0;
        if (ga > gfMax) {
            r.goals_against = gfMax;
            adjustments.push({ team: r.club_name, change: `GA ${ga}→${gfMax} (clamp)` });
        } else if (ga < gfMin && ga > 0) {
            r.goals_against = gfMin;
            adjustments.push({ team: r.club_name, change: `GA ${ga}→${gfMin} (floor)` });
        }
    }

    // W/L balance
    let sumW = rows.reduce((s, r) => s + (r.won || 0), 0);
    let sumL = rows.reduce((s, r) => s + (r.lost || 0), 0);
    let gap = sumW - sumL;
    let guard = 0;
    while (gap !== 0 && guard++ < 1000) {
        if (gap > 0) {
            // Protect a 1-win floor: prefer reducing from teams that can spare a
            // win (won >= 2) so the bottom sides aren't systematically zeroed out.
            const pickWinnerToReduce = () => {
                const pool = [...rows].reverse().filter(r => (r.won || 0) >= 2);
                return pool[0] || [...rows].reverse().find(r => (r.won || 0) > 0);
            };
            if (gap >= 2) {
                const t = pickWinnerToReduce();
                if (!t) break;
                t.won--; t.lost++;
                adjustments.push({ team: t.club_name, change: 'W→L', points: -3 });
                gap -= 2;
            } else {
                const t = pickWinnerToReduce();
                if (!t) break;
                t.won--; t.drawn++;
                adjustments.push({ team: t.club_name, change: 'W→D', points: -2 });
                gap -= 1;
            }
        } else {
            if (gap <= -2) {
                const t = rows.find(r => (r.lost || 0) > 0);
                if (!t) break;
                t.lost--; t.won++;
                adjustments.push({ team: t.club_name, change: 'L→W', points: +3 });
                gap += 2;
            } else {
                const t = rows.find(r => (r.lost || 0) > 0);
                if (!t) break;
                t.lost--; t.drawn++;
                adjustments.push({ team: t.club_name, change: 'L→D', points: +1 });
                gap += 1;
            }
        }
    }

    // GF/GA balance
    let sumGF = rows.reduce((s, r) => s + (r.goals_for || 0), 0);
    let sumGA = rows.reduce((s, r) => s + (r.goals_against || 0), 0);
    let gGap = sumGF - sumGA;
    guard = 0;
    while (gGap !== 0 && guard++ < 5000) {
        if (gGap > 0) {
            const t = [...rows].reverse().find(r => (r.goals_for || 0) > 0);
            if (!t) break;
            t.goals_for--;
            adjustments.push({ team: t.club_name, change: 'GF −1' });
            gGap--;
        } else {
            const t = [...rows].reverse().find(r => (r.goals_against || 0) > 0);
            if (!t) break;
            t.goals_against--;
            adjustments.push({ team: t.club_name, change: 'GA −1' });
            gGap++;
        }
    }

    // Recompute GD + points
    rows.forEach(r => {
        r.goal_difference = (r.goals_for || 0) - (r.goals_against || 0);
        r.points = (r.won || 0) * 3 + (r.drawn || 0);
    });

    return { rows, adjustments };
}

// Check consistency without modifying
export function checkConsistency(tableRows) {
    const rows = tableRows.filter(r => r.club_name && r.club_id);
    const sumW = rows.reduce((s, r) => s + (r.won || 0), 0);
    const sumL = rows.reduce((s, r) => s + (r.lost || 0), 0);
    const sumGF = rows.reduce((s, r) => s + (r.goals_for || 0), 0);
    const sumGA = rows.reduce((s, r) => s + (r.goals_against || 0), 0);
    return {
        wlGap: sumW - sumL,
        gfGaGap: sumGF - sumGA,
        consistent: sumW === sumL && sumGF === sumGA,
    };
}

export { generateRoundRobinFixtures };