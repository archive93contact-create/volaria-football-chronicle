const yearNumber = (value) => {
    const match = String(value || '').match(/\d{4}/);
    return match ? Number(match[0]) : 0;
};

export const getHistoricalTier = (season, leagues = []) => {
    const league = leagues.find(l => l.id === season?.league_id);
    return Number(season?.tier || league?.tier || 0) || null;
};

const ordinal = (n) => {
    const value = Number(n);
    if (!Number.isFinite(value)) return '—';
    const mod100 = value % 100;
    if (mod100 >= 11 && mod100 <= 13) return `${value}th`;
    if (value % 10 === 1) return `${value}st`;
    if (value % 10 === 2) return `${value}nd`;
    if (value % 10 === 3) return `${value}rd`;
    return `${value}th`;
};

const seasonScore = (season, leagues) => {
    const tier = getHistoricalTier(season, leagues) || 99;
    const pos = Number(season?.position || 50);
    return tier * 100 + pos;
};

const sortChronologically = (seasons = []) => [...seasons].sort((a, b) => {
    const ay = yearNumber(a.year);
    const by = yearNumber(b.year);
    return ay !== by ? ay - by : String(a.year || '').localeCompare(String(b.year || ''));
});

const consecutiveRuns = (seasons, predicate) => {
    const filtered = sortChronologically(seasons).filter(predicate);
    const runs = [];
    let current = [];
    filtered.forEach(season => {
        const previous = current[current.length - 1];
        if (!previous || yearNumber(season.year) - yearNumber(previous.year) <= 1) current.push(season);
        else {
            if (current.length) runs.push(current);
            current = [season];
        }
    });
    if (current.length) runs.push(current);
    return runs;
};

const era = (type, label, seasons, summary, score) => ({
    type,
    label,
    startYear: seasons[0]?.year,
    endYear: seasons[seasons.length - 1]?.year,
    summary,
    score,
});

export function detectClubEras(seasons = [], leagues = []) {
    const ordered = sortChronologically(seasons).filter(s => s.year);
    if (ordered.length < 3) return [];
    const eras = [];

    // Long continuous spells at one broad level.
    const topFlightRuns = consecutiveRuns(ordered, s => getHistoricalTier(s, leagues) === 1).filter(run => run.length >= 5);
    topFlightRuns.forEach(run => {
        const titles = run.filter(s => s.status === 'champion' || Number(s.position) === 1).length;
        eras.push(era(
            titles >= 2 ? 'golden_era' : 'top_flight_stability',
            titles >= 2 ? 'Top-flight golden era' : 'Established top-flight era',
            run,
            `${run.length} consecutive recorded top-flight seasons${titles ? ` with ${titles} title${titles === 1 ? '' : 's'}` : ''}.`,
            run.length + titles * 4
        ));
    });

    const lowerRuns = consecutiveRuns(ordered, s => (getHistoricalTier(s, leagues) || 0) >= 5).filter(run => run.length >= 7);
    lowerRuns.forEach(run => eras.push(era(
        'wilderness',
        'Lower-league wilderness',
        run,
        `${run.length} consecutive recorded seasons at Tier ${Math.min(...run.map(s => getHistoricalTier(s, leagues) || 99))} or below.`,
        run.length
    )));

    // Clusters of honours within a compact period.
    for (let i = 0; i < ordered.length; i++) {
        const start = yearNumber(ordered[i].year);
        const window = ordered.filter(s => yearNumber(s.year) >= start && yearNumber(s.year) <= start + 8);
        const majorWins = window.filter(s => getHistoricalTier(s, leagues) === 1 && (s.status === 'champion' || Number(s.position) === 1));
        if (majorWins.length >= 2) {
            eras.push(era('dynasty', 'Championship era', window, `${majorWins.length} top-flight championships arrived within a nine-year spell.`, 12 + majorWins.length * 4));
        }
    }

    // Movement-heavy spells.
    for (let i = 0; i < ordered.length; i++) {
        const start = yearNumber(ordered[i].year);
        const window = ordered.filter(s => yearNumber(s.year) >= start && yearNumber(s.year) <= start + 6);
        const movements = window.filter(s => ['promoted', 'playoff_winner', 'relegated'].includes(s.status));
        if (movements.length >= 3) {
            eras.push(era('yo_yo', 'Yo-yo years', window, `${movements.length} promotions/relegations were recorded in a seven-year spell.`, 9 + movements.length * 2));
        }
    }

    // Strongest rise/fall over roughly five recorded seasons.
    let bestRise = null;
    let worstFall = null;
    for (let i = 0; i < ordered.length; i++) {
        for (let j = i + 2; j < Math.min(ordered.length, i + 7); j++) {
            const delta = seasonScore(ordered[i], leagues) - seasonScore(ordered[j], leagues);
            if (!bestRise || delta > bestRise.delta) bestRise = { delta, slice: ordered.slice(i, j + 1) };
            if (!worstFall || delta < worstFall.delta) worstFall = { delta, slice: ordered.slice(i, j + 1) };
        }
    }
    if (bestRise?.delta >= 90) eras.push(era('rise', 'Rapid rise', bestRise.slice, `The club improved by roughly ${Math.round(bestRise.delta / 100)} pyramid tier${bestRise.delta >= 190 ? 's' : ''} across this spell.`, Math.round(bestRise.delta / 15)));
    if (worstFall?.delta <= -90) eras.push(era('decline', 'Major decline', worstFall.slice, `The recorded league position deteriorated sharply across this spell, falling through the pyramid.`, Math.round(Math.abs(worstFall.delta) / 15)));

    // Recent revival/decline from rolling windows.
    if (ordered.length >= 8) {
        const window = Math.min(5, Math.floor(ordered.length / 2));
        const recent = ordered.slice(-window);
        const previous = ordered.slice(-(window * 2), -window);
        const avg = arr => arr.reduce((sum, s) => sum + seasonScore(s, leagues), 0) / arr.length;
        const delta = avg(previous) - avg(recent);
        if (delta >= 45) eras.push(era('revival', 'Modern revival', recent, `The latest ${window} seasons are materially stronger than the preceding ${window}-season period.`, Math.round(delta / 8)));
        if (delta <= -45) eras.push(era('decline', 'Recent decline', recent, `The latest ${window} seasons show a marked drop from the preceding ${window}-season period.`, Math.round(Math.abs(delta) / 8)));
    }

    // Keep the strongest non-near-duplicate eras.
    return eras
        .filter(e => e.startYear && e.endYear)
        .sort((a, b) => b.score - a.score)
        .filter((candidate, index, arr) => {
            const cStart = yearNumber(candidate.startYear);
            const cEnd = yearNumber(candidate.endYear);
            return arr.slice(0, index).every(existing => {
                const eStart = yearNumber(existing.startYear);
                const eEnd = yearNumber(existing.endYear);
                const overlap = Math.max(0, Math.min(cEnd, eEnd) - Math.max(cStart, eStart) + 1);
                const candidateLength = Math.max(1, cEnd - cStart + 1);
                return candidate.type !== existing.type || overlap / candidateLength < 0.65;
            });
        })
        .slice(0, 6)
        .sort((a, b) => yearNumber(a.startYear) - yearNumber(b.startYear));
}

export function buildHistoricalInsights(club, seasons = [], leagues = []) {
    const ordered = sortChronologically(seasons);
    if (!ordered.length) return [];
    const insights = [];
    const first = ordered[0];
    const latest = ordered[ordered.length - 1];
    const firstTop = ordered.find(s => getHistoricalTier(s, leagues) === 1);
    const titles = ordered.filter(s => getHistoricalTier(s, leagues) === 1 && (s.status === 'champion' || Number(s.position) === 1));
    const movements = ordered.filter(s => ['promoted', 'playoff_winner', 'relegated'].includes(s.status));

    insights.push({ category: 'milestone', headline: 'Recorded history begins', detail: `${first.year}: ${ordinal(first.position)} in ${leagues.find(l => l.id === first.league_id)?.name || `Tier ${getHistoricalTier(first, leagues) || '?'}`}.` });
    if (firstTop) insights.push({ category: 'milestone', headline: 'First recorded top-flight season', detail: `${firstTop.year}${firstTop.position ? ` — finished ${ordinal(firstTop.position)}` : ''}.` });
    if (titles.length) insights.push({ category: 'record', headline: titles.length > 1 ? 'Championship tradition' : 'Championship breakthrough', detail: `${titles.length} recorded top-flight title${titles.length === 1 ? '' : 's'}; first in ${titles[0].year}${titles.length > 1 ? `, latest in ${titles[titles.length - 1].year}` : ''}.` });
    if (movements.length >= 3) insights.push({ category: 'movement', headline: 'A club shaped by movement', detail: `${movements.filter(s => s.status === 'promoted' || s.status === 'playoff_winner').length} promotions and ${movements.filter(s => s.status === 'relegated').length} relegations are visible in the recorded table history.` });

    const topRuns = consecutiveRuns(ordered, s => getHistoricalTier(s, leagues) === 1).sort((a, b) => b.length - a.length);
    if (topRuns[0]?.length >= 3) insights.push({ category: 'trend', headline: 'Longest top-flight stay', detail: `${topRuns[0].length} consecutive recorded seasons from ${topRuns[0][0].year} to ${topRuns[0][topRuns[0].length - 1].year}.` });

    const latestTier = getHistoricalTier(latest, leagues);
    const historicalTiers = ordered.map(s => getHistoricalTier(s, leagues)).filter(Boolean);
    const bestTier = historicalTiers.length ? Math.min(...historicalTiers) : null;
    if (latestTier && bestTier && latestTier > bestTier) insights.push({ category: 'comparison', headline: 'Below historical peak', detail: `Currently recorded at Tier ${latestTier}; the club has previously reached Tier ${bestTier}.` });
    if (latestTier && bestTier && latestTier === bestTier) insights.push({ category: 'comparison', headline: 'At its highest recorded level', detail: `The latest season is at Tier ${latestTier}, matching the club's highest recorded tier.` });

    return insights.slice(0, 6);
}

export function buildComparativeInsights(club, allClubs = [], seasons = [], leagues = []) {
    const peers = allClubs.filter(c => !c.is_former_name && c.id !== club.id && (c.seasons_played || 0) > 0);
    const population = [club, ...peers];
    const rankBy = (field) => {
        const sorted = [...population].sort((a, b) => (Number(b[field]) || 0) - (Number(a[field]) || 0));
        return sorted.findIndex(c => c.id === club.id) + 1;
    };
    const percentile = (rank) => population.length > 1 ? Math.round((1 - (rank - 1) / population.length) * 100) : 100;
    const topFlightRank = rankBy('seasons_top_flight');
    const titleRank = rankBy('league_titles');
    const seasonRank = rankBy('seasons_played');

    const ordered = sortChronologically(seasons);
    let recentDelta = null;
    if (ordered.length >= 8) {
        const window = Math.min(5, Math.floor(ordered.length / 2));
        const avg = arr => arr.reduce((sum, s) => sum + seasonScore(s, leagues), 0) / arr.length;
        recentDelta = avg(ordered.slice(-(window * 2), -window)) - avg(ordered.slice(-window));
    }

    const localScope = club.district || club.region || club.settlement;
    const localPeers = localScope ? population.filter(c => (club.district && c.district === club.district) || (!club.district && club.region && c.region === club.region) || (!club.district && !club.region && club.settlement && c.settlement === club.settlement)) : [];
    const localSorted = [...localPeers].sort((a, b) => ((b.league_titles || 0) * 50 + (b.seasons_top_flight || 0)) - ((a.league_titles || 0) * 50 + (a.seasons_top_flight || 0)));
    const localRank = localSorted.findIndex(c => c.id === club.id) + 1;

    return [
        { label: 'Top-flight longevity', value: `#${topFlightRank}`, detail: `Top ${100 - percentile(topFlightRank) + 1}% of ${population.length} tracked clubs by top-flight seasons` },
        { label: 'League-title rank', value: `#${titleRank}`, detail: `${club.league_titles || 0} top-flight titles across the national club record` },
        { label: 'Historical longevity', value: `#${seasonRank}`, detail: `${club.seasons_played || seasons.length} tracked league seasons` },
        localRank > 0 && { label: `${club.district ? 'District' : club.region ? 'Regional' : 'Local'} stature`, value: `#${localRank}`, detail: `${localScope} clubs ranked by titles and top-flight presence` },
        recentDelta != null && { label: 'Recent direction', value: recentDelta > 35 ? 'Improving' : recentDelta < -35 ? 'Declining' : 'Stable', detail: `Recent five-season pyramid level versus the preceding period` },
    ].filter(Boolean);
}

export function buildLivingNarrative(club, seasons = [], leagues = []) {
    const ordered = sortChronologically(seasons);
    if (!ordered.length) return 'No season-by-season league record has been entered yet, so the living historical narrative will begin when the first season is added.';
    const eras = detectClubEras(ordered, leagues);
    const insights = buildHistoricalInsights(club, ordered, leagues);
    const first = ordered[0];
    const latest = ordered[ordered.length - 1];
    const firstLeague = leagues.find(l => l.id === first.league_id);
    const latestLeague = leagues.find(l => l.id === latest.league_id);
    const movements = ordered.filter(s => ['promoted', 'playoff_winner', 'relegated'].includes(s.status));
    const titleSeasons = ordered.filter(s => getHistoricalTier(s, leagues) === 1 && (s.status === 'champion' || Number(s.position) === 1));

    const paragraphs = [];
    paragraphs.push(`The recorded competitive story of ${club.name} begins in ${first.year}, when the club finished ${ordinal(first.position)} in ${firstLeague?.name || `Tier ${getHistoricalTier(first, leagues) || '?'}`}. From that starting point, the archive now contains ${ordered.length} league season${ordered.length === 1 ? '' : 's'}, ending with ${latest.year} in ${latestLeague?.name || `Tier ${getHistoricalTier(latest, leagues) || '?'}`}.`);

    if (titleSeasons.length || movements.length) {
        const achievements = [];
        if (titleSeasons.length) achievements.push(`${titleSeasons.length} top-flight title${titleSeasons.length === 1 ? '' : 's'}${titleSeasons.length ? ` (${titleSeasons.map(s => s.year).join(', ')})` : ''}`);
        const promotions = movements.filter(s => s.status === 'promoted' || s.status === 'playoff_winner').length;
        const relegations = movements.filter(s => s.status === 'relegated').length;
        if (promotions) achievements.push(`${promotions} recorded promotion${promotions === 1 ? '' : 's'}`);
        if (relegations) achievements.push(`${relegations} relegation${relegations === 1 ? '' : 's'}`);
        paragraphs.push(`The season record is defined by ${achievements.join(', ')}. These are not separate biography claims: they are drawn directly from the club's entered league tables and therefore evolve as new seasons are added.`);
    }

    if (eras.length) {
        paragraphs.push(`Several distinct eras emerge from the results. ${eras.slice(0, 4).map(e => `${e.startYear}–${e.endYear}: ${e.label.toLowerCase()} (${e.summary})`).join(' ')}`);
    }

    if (insights.length) paragraphs.push(`In historical context, ${insights.slice(1, 4).map(i => `${i.headline.toLowerCase()}: ${i.detail}`).join(' ')}`);

    return paragraphs.join('\n\n');
}

export { yearNumber, ordinal, sortChronologically };
