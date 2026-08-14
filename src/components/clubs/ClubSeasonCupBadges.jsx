import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Trophy } from 'lucide-react';

// Higher rank = later round. Round-of-N rounds rank below named knockout rounds,
// and smaller N (later round) ranks higher than larger N (earlier round).
const rankRound = (round) => {
    if (!round) return 0;
    const r = round.toLowerCase();
    if (r.includes('final') && !r.includes('semi') && !r.includes('quarter')) return 1000;
    if (r.includes('semi')) return 900;
    if (r.includes('quarter')) return 800;
    const ron = r.match(/round of (\d+)/);
    if (ron) {
        const n = parseInt(ron[1], 10);
        return 700 - (Math.log2(n) - 4) * 10; // 16→700, 32→690, 64→680, 128→670
    }
    if (r.includes('last 16')) return 700;
    if (r.includes('group')) return 500;
    const words = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth'];
    for (let i = 0; i < words.length; i++) {
        if (r.includes(words[i])) return 100 + i * 10;
    }
    const m = r.match(/(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
};

const computePerf = (matches, seasonIds, clubId, clubName) => {
    const isMine = (m) =>
        (m.home_club_id && m.home_club_id === clubId) ||
        (m.away_club_id && m.away_club_id === clubId) ||
        m.home_club_name === clubName ||
        m.away_club_name === clubName;

    // Ignore BYE/walkover "matches" — they aren't real rounds played.
    const myMatches = matches.filter(m =>
        seasonIds.has(m.season_id) &&
        isMine(m) &&
        !(m.home_club_name === 'BYE' || m.away_club_name === 'BYE')
    );
    if (myMatches.length === 0) return null;

    let best = myMatches[0];
    for (const m of myMatches) {
        if (rankRound(m.round) > rankRound(best.round)) best = m;
    }

    const bestRank = rankRound(best.round);
    if (bestRank >= 1000) {
        const won = best.winner_id === clubId || best.winner === clubName;
        return { stage: won ? 'Winners' : 'Runners-up', wonFinal: won };
    }
    return { stage: best.round, wonFinal: false };
};

export default function ClubSeasonCupBadges({ clubId, clubName, year, type }) {
    const isCup = type === 'cup';

    const { data: seasons = [] } = useQuery({
        queryKey: [isCup ? 'allDomesticCupSeasons' : 'allContinentalSeasons'],
        queryFn: () => isCup
            ? base44.entities.DomesticCupSeason.list('-created_date', 2000)
            : base44.entities.ContinentalSeason.list('-created_date', 2000),
        staleTime: 15 * 60 * 1000,
    });
    const { data: matches = [] } = useQuery({
        queryKey: [isCup ? 'allDomesticCupMatches' : 'allContinentalMatches'],
        queryFn: () => isCup
            ? base44.entities.DomesticCupMatch.list('-created_date', 2000)
            : base44.entities.ContinentalMatch.list('-created_date', 2000),
        staleTime: 15 * 60 * 1000,
    });

    const perf = useMemo(() => {
        const seasonIds = new Set(seasons.filter(s => s.year === year).map(s => s.id));
        return computePerf(matches, seasonIds, clubId, clubName);
    }, [seasons, matches, clubId, clubName, year]);

    return (
        <span className="flex items-center justify-center gap-1">
            {perf ? (
                <>
                    <span>{perf.stage}</span>
                    {perf.wonFinal && <Trophy className="w-4 h-4 text-amber-500" />}
                </>
            ) : (
                <span className="text-slate-400">—</span>
            )}
        </span>
    );
}