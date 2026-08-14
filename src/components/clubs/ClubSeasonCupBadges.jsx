import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Trophy } from 'lucide-react';

const rankRound = (round) => {
    if (!round) return 0;
    const r = round.toLowerCase();
    if (r.includes('final') && !r.includes('semi')) return 1000;
    if (r.includes('semi')) return 900;
    if (r.includes('quarter') || r === 'qf') return 800;
    if (r.includes('round of 16') || r.includes('last 16')) return 700;
    if (r.includes('round of 32')) return 600;
    if (r.includes('group')) return 500;
    const words = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'];
    for (let i = 0; i < words.length; i++) {
        if (r.includes(words[i])) return 100 + i * 50;
    }
    const m = r.match(/(\d+)/);
    return m ? parseInt(m[1], 10) * 10 : 0;
};

const computePerf = (matches, seasonIds, clubId, clubName) => {
    const isMine = (m) =>
        (m.home_club_id && m.home_club_id === clubId) ||
        (m.away_club_id && m.away_club_id === clubId) ||
        m.home_club_name === clubName ||
        m.away_club_name === clubName;

    const myMatches = matches.filter(m => seasonIds.has(m.season_id) && isMine(m));
    if (myMatches.length === 0) return null;

    let best = myMatches[0];
    for (const m of myMatches) {
        if (rankRound(m.round) > rankRound(best.round)) best = m;
    }
    const wonFinal = rankRound(best.round) >= 1000 &&
        (best.winner_id === clubId || best.winner === clubName);
    return { round: best.round, wonFinal };
};

export default function ClubSeasonCupBadge({ clubId, clubName, year, type }) {
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
                    <span>{perf.round}</span>
                    {perf.wonFinal && <Trophy className="w-4 h-4 text-amber-500" />}
                </>
            ) : (
                <span className="text-slate-400">—</span>
            )}
        </span>
    );
}