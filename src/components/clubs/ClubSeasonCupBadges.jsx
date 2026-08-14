import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Trophy, Star } from 'lucide-react';

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

const shortRound = (round) => {
    if (!round) return '';
    const r = round.toLowerCase();
    if (r.includes('final') && !r.includes('semi')) return 'Final';
    if (r.includes('semi')) return 'SF';
    if (r.includes('quarter')) return 'QF';
    if (r.includes('round of 16') || r.includes('last 16')) return 'R16';
    if (r.includes('round of 32')) return 'R32';
    if (r.includes('round of 64')) return 'R64';
    if (r.includes('group')) return 'Group';
    return round.length > 10 ? round.slice(0, 10) : round;
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
    return { round: best.round, wonFinal, short: shortRound(best.round) };
};

export default function ClubSeasonCupBadges({ clubId, clubName, year }) {
    const { data: cupSeasons = [] } = useQuery({
        queryKey: ['allDomesticCupSeasons'],
        queryFn: () => base44.entities.DomesticCupSeason.list('-created_date', 2000),
        staleTime: 15 * 60 * 1000,
    });
    const { data: cupMatches = [] } = useQuery({
        queryKey: ['allDomesticCupMatches'],
        queryFn: () => base44.entities.DomesticCupMatch.list('-created_date', 2000),
        staleTime: 15 * 60 * 1000,
    });
    const { data: contSeasons = [] } = useQuery({
        queryKey: ['allContinentalSeasons'],
        queryFn: () => base44.entities.ContinentalSeason.list('-created_date', 2000),
        staleTime: 15 * 60 * 1000,
    });
    const { data: contMatches = [] } = useQuery({
        queryKey: ['allContinentalMatches'],
        queryFn: () => base44.entities.ContinentalMatch.list('-created_date', 2000),
        staleTime: 15 * 60 * 1000,
    });

    const perf = useMemo(() => {
        const cupSeasonIds = new Set(cupSeasons.filter(s => s.year === year).map(s => s.id));
        const contSeasonIds = new Set(contSeasons.filter(s => s.year === year).map(s => s.id));
        return {
            cup: computePerf(cupMatches, cupSeasonIds, clubId, clubName),
            cont: computePerf(contMatches, contSeasonIds, clubId, clubName),
        };
    }, [cupSeasons, cupMatches, contSeasons, contMatches, clubId, clubName, year]);

    return (
        <div className="flex items-center justify-center gap-1.5 flex-wrap">
            {perf.cup ? (
                <span
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        perf.cup.wonFinal ? 'bg-amber-100 text-amber-700' : 'bg-orange-50 text-orange-600'
                    }`}
                    title={`Domestic Cup: ${perf.cup.round || ''}`}
                >
                    {perf.cup.wonFinal && <Trophy className="w-3 h-3" />}
                    {perf.cup.short}
                </span>
            ) : (
                <span className="text-slate-300 text-[10px]">—</span>
            )}
            {perf.cont ? (
                <span
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        perf.cont.wonFinal ? 'bg-purple-100 text-purple-700' : 'bg-indigo-50 text-indigo-600'
                    }`}
                    title={`Continental: ${perf.cont.round || ''}`}
                >
                    {perf.cont.wonFinal && <Star className="w-3 h-3" />}
                    {perf.cont.short}
                </span>
            ) : (
                <span className="text-slate-300 text-[10px]">—</span>
            )}
        </div>
    );
}