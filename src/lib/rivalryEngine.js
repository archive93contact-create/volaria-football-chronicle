const yearNumber = (value) => {
  const match = String(value || '').match(/\d{4}/);
  return match ? Number(match[0]) : 0;
};

const seasonKey = (row) => row?.season_id || `${row?.league_id || ''}::${row?.year || ''}`;
const pairKey = (a, b) => [a, b].sort().join('::');

const activeish = (club) => club && !club.is_former_name;

const geography = (a, b) => {
  if (a?.settlement && b?.settlement && a.settlement === b.settlement) return { level: 'settlement', score: 55, label: `Same settlement · ${a.settlement}` };
  if (a?.district && b?.district && a.district === b.district) return { level: 'district', score: 32, label: `Same district · ${a.district}` };
  if (a?.region && b?.region && a.region === b.region) return { level: 'region', score: 14, label: `Same region · ${a.region}` };
  return null;
};

const intensityFromScore = (score, status) => {
  if (status === 'historic') return { label: 'Historic', rank: 3 };
  if (status === 'fading') return { label: 'Fading', rank: 2 };
  if (status === 'cooling') return { label: 'Cooling', rank: 2 };
  if (status === 'emerging') return { label: 'Emerging', rank: 3 };
  if (score >= 150) return { label: 'Legendary', rank: 6 };
  if (score >= 105) return { label: 'Fierce', rank: 5 };
  if (score >= 72) return { label: 'Intense', rank: 4 };
  if (score >= 48) return { label: 'Strong', rank: 3 };
  return { label: 'Rivals', rank: 2 };
};

const primaryType = ({ geo, official, titleBattles, directTitleFights, promotionBattles, survivalBattles, continental, sharedSeasons, closeFinishes, isCrossNation }) => {
  if (continental?.finals > 0 || (continental?.semis > 0 && isCrossNation)) return { key: 'continental', label: 'Continental rivalry' };
  if (geo?.level === 'settlement') return { key: 'local_derby', label: 'Local derby' };
  if (geo?.level === 'district') return { key: 'district_derby', label: 'District derby' };
  if (directTitleFights > 0 || titleBattles >= 3) return { key: 'title_rivalry', label: 'Title rivalry' };
  if (promotionBattles >= 2) return { key: 'promotion_rivalry', label: 'Promotion rivalry' };
  if (survivalBattles >= 2) return { key: 'survival_rivalry', label: 'Survival rivalry' };
  if (geo?.level === 'region') return { key: 'regional_rivalry', label: 'Regional rivalry' };
  if (continental?.matches >= 3) return { key: 'continental', label: 'Continental rivalry' };
  if (official) return { key: 'historic_rivalry', label: 'Historic rivalry' };
  if (sharedSeasons >= 12 || closeFinishes >= 5) return { key: 'competitive_rivalry', label: 'Competitive rivalry' };
  return { key: 'football_rivalry', label: 'Football rivalry' };
};

export function buildRivalryForPair(a, b, leagueTables = [], continentalMatches = [], nations = [], prepared = null) {
  if (!a || !b || a.id === b.id || !activeish(a) || !activeish(b)) return null;

  const aRows = prepared?.tablesByClub?.get(a.id) || leagueTables.filter(r => r.club_id === a.id);
  const bRows = prepared?.tablesByClub?.get(b.id) || leagueTables.filter(r => r.club_id === b.id);
  const bBySeason = new Map(bRows.map(r => [seasonKey(r), r]));
  const shared = aRows.map(r => ({ a: r, b: bBySeason.get(seasonKey(r)) })).filter(x => x.b);

  const years = [...aRows, ...bRows].map(r => yearNumber(r.year)).filter(Boolean);
  const mostRecentYear = years.length ? Math.max(...years) : new Date().getFullYear();
  const recentCutoff = mostRecentYear - 10;

  let score = 0;
  let historicScore = 0;
  let recentScore = 0;
  const reasons = [];
  const types = [];

  const official = Boolean(a.rival_club_ids?.includes(b.id) || b.rival_club_ids?.includes(a.id));
  if (official) {
    score += 50; historicScore += 25; recentScore += 15;
    reasons.push('Established rivalry');
  }

  const geo = geography(a, b);
  if (geo) {
    score += geo.score;
    historicScore += Math.round(geo.score * .55);
    recentScore += Math.round(geo.score * .45);
    reasons.push(geo.label);
    if (geo.level === 'settlement') types.push('local_derby');
    if (geo.level === 'district') types.push('district_derby');
    if (geo.level === 'region') types.push('regional_rivalry');
  }

  const recentShared = shared.filter(x => yearNumber(x.a.year) >= recentCutoff);
  const historicShared = shared.length - recentShared.length;
  if (shared.length) {
    const sharedScore = Math.min(shared.length * 1.7, 32);
    score += sharedScore;
    recentScore += Math.min(recentShared.length * 2.5, 18);
    historicScore += Math.min(historicShared * 1.5, 18);
    reasons.push(`${shared.length} shared league season${shared.length === 1 ? '' : 's'}`);
  }

  const titleBattles = shared.filter(({ a: ar, b: br }) => Number(ar.position) <= 3 && Number(br.position) <= 3).length;
  const directTitleFights = shared.filter(({ a: ar, b: br }) => {
    const ap = Number(ar.position), bp = Number(br.position);
    return (ap === 1 && bp === 2) || (ap === 2 && bp === 1) || (ar.status === 'champion' && bp === 2) || (br.status === 'champion' && ap === 2);
  }).length;
  if (titleBattles) {
    score += titleBattles * 7;
    historicScore += titleBattles * 4;
    recentScore += shared.filter(({ a: ar, b: br }) => yearNumber(ar.year) >= recentCutoff && Number(ar.position) <= 3 && Number(br.position) <= 3).length * 5;
    reasons.push(`${titleBattles} title-race season${titleBattles === 1 ? '' : 's'}`);
    types.push('title_rivalry');
  }
  if (directTitleFights) {
    score += directTitleFights * 18;
    reasons.push(`${directTitleFights} first-v-second finish${directTitleFights === 1 ? '' : 'es'}`);
  }

  const promotionBattles = shared.filter(({ a: ar, b: br }) => ['promoted','playoff_winner'].includes(ar.status) && ['promoted','playoff_winner'].includes(br.status)).length;
  if (promotionBattles) {
    score += promotionBattles * 9;
    reasons.push(`${promotionBattles} shared promotion season${promotionBattles === 1 ? '' : 's'}`);
    types.push('promotion_rivalry');
  }

  const survivalBattles = shared.filter(({ a: ar, b: br }) => ar.status === 'relegated' && br.status === 'relegated').length;
  if (survivalBattles) {
    score += survivalBattles * 7;
    reasons.push(`${survivalBattles} shared relegation season${survivalBattles === 1 ? '' : 's'}`);
    types.push('survival_rivalry');
  }

  const closeFinishes = shared.filter(({ a: ar, b: br }) => {
    const diff = Math.abs(Number(ar.position || 999) - Number(br.position || 999));
    return diff > 0 && diff <= 2;
  }).length;
  if (closeFinishes >= 3) {
    score += Math.min(closeFinishes * 3, 28);
    reasons.push(`Finished within two places ${closeFinishes} times`);
    types.push('competitive_rivalry');
  }

  const trophyA = Number(a.league_titles || 0) + Number(a.domestic_cup_titles || 0) + Number(a.vcc_titles || 0) + Number(a.ccc_titles || 0);
  const trophyB = Number(b.league_titles || 0) + Number(b.domestic_cup_titles || 0) + Number(b.vcc_titles || 0) + Number(b.ccc_titles || 0);
  if (trophyA && trophyB && Math.abs(trophyA - trophyB) <= 2) {
    score += 6;
    reasons.push('Comparable historical stature');
  }

  const aNames = new Set([a.name, a.shortened_name].filter(Boolean));
  const bNames = new Set([b.name, b.shortened_name].filter(Boolean));
  const indexedContinental = prepared?.continentalByPair?.get(pairKey(a.id, b.id));
  const vs = indexedContinental || continentalMatches.filter(m => {
    const home = m.home_club_id || m.home_club_name;
    const away = m.away_club_id || m.away_club_name;
    const aHome = home === a.id || aNames.has(home);
    const aAway = away === a.id || aNames.has(away);
    const bHome = home === b.id || bNames.has(home);
    const bAway = away === b.id || bNames.has(away);
    return (aHome && bAway) || (aAway && bHome);
  });
  const continental = {
    matches: vs.length,
    finals: vs.filter(m => String(m.round || '').toLowerCase() === 'final').length,
    semis: vs.filter(m => String(m.round || '').toLowerCase().includes('semi')).length,
    quarters: vs.filter(m => String(m.round || '').toLowerCase().includes('quarter')).length,
  };
  if (continental.matches) {
    score += continental.finals * 95 + continental.semis * 45 + continental.quarters * 15 + Math.min(continental.matches * 6, 24);
    if (continental.finals) reasons.push(`${continental.finals} continental final${continental.finals === 1 ? '' : 's'}`);
    else if (continental.semis) reasons.push(`${continental.semis} continental semi-final${continental.semis === 1 ? '' : 's'}`);
    else if (continental.matches >= 3) reasons.push(`${continental.matches} continental meetings`);
    if (continental.matches >= 2 || continental.finals || continental.semis) types.push('continental');
  }

  const lastShared = shared.map(x => yearNumber(x.a.year)).filter(Boolean).sort((x, y) => y - x)[0] || null;
  const yearsSinceShared = lastShared ? mostRecentYear - lastShared : null;
  let status = 'active';
  let statusNote = null;

  if (a.is_defunct || b.is_defunct || a.is_active === false || b.is_active === false) {
    status = 'historic';
    const ended = a.is_defunct || a.is_active === false ? a : b;
    statusNote = `${ended.name}${ended.defunct_year ? ` ceased in ${ended.defunct_year}` : ' is no longer active'}`;
  } else if (historicScore >= 28 && recentScore < 8 && yearsSinceShared != null && yearsSinceShared >= 10) {
    status = 'fading';
    statusNote = `Historic rivalry · last shared a league in ${lastShared}`;
    score *= .72;
  } else if (historicScore >= 20 && recentScore < 10 && yearsSinceShared != null && yearsSinceShared >= 5) {
    status = 'cooling';
    statusNote = `Cooling · last shared a league in ${lastShared}`;
    score *= .86;
  } else if (recentScore >= 20 && historicScore < 12) {
    status = 'emerging';
    statusNote = 'A newer rivalry gaining weight';
  }

  const isCrossNation = a.nation_id && b.nation_id && a.nation_id !== b.nation_id;
  const mainType = primaryType({ geo, official, titleBattles, directTitleFights, promotionBattles, survivalBattles, continental, sharedSeasons: shared.length, closeFinishes, isCrossNation });
  if (!types.includes(mainType.key)) types.unshift(mainType.key);

  const threshold = official || geo?.level === 'settlement' ? 28 : status === 'historic' ? 42 : 34;
  if (score < threshold) return null;

  const intensity = intensityFromScore(score, status);
  const nation = nations.find(n => n.id === b.nation_id);

  return {
    club: b,
    score: Math.round(score),
    rawScore: Math.round(score),
    intensity,
    status,
    statusNote,
    primaryType: mainType,
    types: [...new Set(types)],
    reasons: [...new Set(reasons)].slice(0, 6),
    geography: geo,
    sharedSeasons: shared.length,
    titleBattles,
    directTitleFights,
    promotionBattles,
    survivalBattles,
    closeFinishes,
    lastSharedYear: lastShared,
    continental,
    nationName: nation?.name,
    nationFlag: nation?.flag_url,
    official,
  };
}

const prepareRivalryIndexes = (clubs = [], leagueTables = [], continentalMatches = []) => {
  const tablesByClub = new Map();
  leagueTables.forEach(row => {
    if (!row.club_id) return;
    if (!tablesByClub.has(row.club_id)) tablesByClub.set(row.club_id, []);
    tablesByClub.get(row.club_id).push(row);
  });

  const nameToId = new Map();
  clubs.forEach(c => {
    if (c?.id && c?.name) nameToId.set(c.name, c.id);
    if (c?.id && c?.shortened_name) nameToId.set(c.shortened_name, c.id);
  });
  const continentalByPair = new Map();
  continentalMatches.forEach(match => {
    const homeId = match.home_club_id || nameToId.get(match.home_club_name);
    const awayId = match.away_club_id || nameToId.get(match.away_club_name);
    if (!homeId || !awayId || homeId === awayId) return;
    const key = pairKey(homeId, awayId);
    if (!continentalByPair.has(key)) continentalByPair.set(key, []);
    continentalByPair.get(key).push(match);
  });
  return { tablesByClub, continentalByPair };
};

export function buildRivalriesForClub(club, candidates = [], leagueTables = [], continentalMatches = [], nations = [], limit = 12) {
  if (!club) return [];
  const prepared = prepareRivalryIndexes([club, ...candidates], leagueTables, continentalMatches);
  return candidates
    .filter(c => c.id !== club.id && !c.is_former_name)
    .map(other => buildRivalryForPair(club, other, leagueTables, continentalMatches, nations, prepared))
    .filter(Boolean)
    .sort((a, b) => {
      const statusPriority = { active: 5, emerging: 4, cooling: 3, historic: 2, fading: 1 };
      if ((statusPriority[a.status] || 0) !== (statusPriority[b.status] || 0)) return (statusPriority[b.status] || 0) - (statusPriority[a.status] || 0);
      return b.score - a.score;
    })
    .slice(0, limit);
}

export function buildLeagueRivalries(clubs = [], leagueTables = [], continentalMatches = [], nations = [], limit = 8) {
  const pairs = [];
  const prepared = prepareRivalryIndexes(clubs, leagueTables, continentalMatches);
  for (let i = 0; i < clubs.length; i++) {
    for (let j = i + 1; j < clubs.length; j++) {
      const result = buildRivalryForPair(clubs[i], clubs[j], leagueTables, continentalMatches, nations, prepared);
      if (result) pairs.push({ ...result, club1: clubs[i], club2: clubs[j] });
    }
  }
  return pairs.sort((a, b) => b.score - a.score).slice(0, limit);
}

export function buildSharedSeasonPairCounts(leagueTables = []) {
  const bySeason = new Map();
  leagueTables.forEach(row => {
    if (!row.club_id) return;
    const key = seasonKey(row);
    if (!bySeason.has(key)) bySeason.set(key, []);
    bySeason.get(key).push(row.club_id);
  });
  const counts = new Map();
  bySeason.forEach(ids => {
    const unique = [...new Set(ids)];
    for (let i = 0; i < unique.length; i++) {
      for (let j = i + 1; j < unique.length; j++) {
        const key = pairKey(unique[i], unique[j]);
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    }
  });
  return counts;
}

export { pairKey, yearNumber };
