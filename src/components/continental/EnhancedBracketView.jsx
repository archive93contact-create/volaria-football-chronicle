import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Star, Edit2, Users, Eye, Crown } from 'lucide-react';
import AdminOnly from '@/components/common/AdminOnly';
import MatchLineupEditor from '@/components/continental/MatchLineupEditor';
import MatchDetailView from '@/components/continental/MatchDetailView';

// Higher rank = later round. Handles standard + custom round names so no
// round is silently dropped from the bracket.
const rankRound = (round) => {
    if (!round) return 0;
    const r = round.toLowerCase();
    if (r.includes('final') && !r.includes('semi') && !r.includes('quarter')) return 1000;
    if (r.includes('semi')) return 900;
    if (r.includes('quarter')) return 800;
    const ron = r.match(/round of (\d+)/);
    if (ron) {
        const n = parseInt(ron[1], 10);
        return 700 - (Math.log2(n) - 4) * 10;
    }
    if (r.includes('last 16')) return 700;
    if (r.includes('group') || r.includes('league')) return 500;
    if (r.includes('preliminary')) return 400;
    const words = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'];
    for (let i = 0; i < words.length; i++) {
        if (r.includes(words[i])) return 100 + i * 10;
    }
    const m = r.match(/(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
};

// Build the correct bracket order by working backward from the Final: each
// next-round match's home/away club came from a feeder match in the previous
// round (the match whose winner equals that club). This guarantees match 2k and
// 2k+1 in a round feed into match k of the next round, so the bracket reads as a
// true progression you can follow club-by-club.
const buildBracketOrder = (sortedRounds, matchesByRound) => {
    const ordered = {};
    const lastRound = sortedRounds[sortedRounds.length - 1];
    ordered[lastRound] = [...(matchesByRound[lastRound] || [])];

    for (let i = sortedRounds.length - 2; i >= 0; i--) {
        const round = sortedRounds[i];
        const nextRound = sortedRounds[i + 1];
        const nextOrdered = ordered[nextRound];
        const thisMatches = [...(matchesByRound[round] || [])];
        const used = new Set();
        const result = [];

        const findFeeder = (targetName) => {
            if (!targetName) return null;
            let f = thisMatches.find(m => !used.has(m.id) && m.winner === targetName);
            if (f) return f;
            f = thisMatches.find(m => !used.has(m.id) && (m.home_club_name === targetName || m.away_club_name === targetName));
            return f || null;
        };

        for (const nm of nextOrdered) {
            const homeFeeder = findFeeder(nm.home_club_name);
            if (homeFeeder) used.add(homeFeeder.id);
            const awayFeeder = findFeeder(nm.away_club_name);
            if (awayFeeder) used.add(awayFeeder.id);
            if (homeFeeder) result.push(homeFeeder);
            if (awayFeeder) result.push(awayFeeder);
        }
        // Append any leftover matches (unplayed/bye matches not linked to a played next round)
        thisMatches.forEach(m => { if (!used.has(m.id)) result.push(m); });
        ordered[round] = result;
    }
    return ordered;
};

export default function EnhancedBracketView({ matches, getNationFlag, clubs = [], nations = [], competition, onEditMatch, isDomesticCup = false }) {
    const [lineupEditMatch, setLineupEditMatch] = useState(null);
    const [detailViewMatch, setDetailViewMatch] = useState(null);

    const containerRef = useRef(null);
    const [paths, setPaths] = useState([]);
    const [svgSize, setSvgSize] = useState({ w: 0, h: 0 });

    const getRoundDisplayName = (roundName) =>
        (competition?.round_names && competition.round_names[roundName]) || roundName;

    const matchesByRound = useMemo(() => {
        return matches.reduce((acc, match) => {
            if (!acc[match.round]) acc[match.round] = [];
            acc[match.round].push(match);
            return acc;
        }, {});
    }, [matches]);

    // Order each round by its explicit round_order (lower = earlier), falling back
    // to the name heuristic when no order is stored.
    const roundOrderOf = (roundName) => {
        const rms = matchesByRound[roundName] || [];
        for (const m of rms) {
            if (m.round_order != null) return m.round_order;
        }
        return rankRound(roundName);
    };
    const sortedRounds = useMemo(
        () => Object.keys(matchesByRound).sort((a, b) => roundOrderOf(a) - roundOrderOf(b)),
        [matchesByRound]
    );

    // Correct per-round match ordering so the bracket connects properly.
    const orderedRounds = useMemo(
        () => buildBracketOrder(sortedRounds, matchesByRound),
        [sortedRounds, matchesByRound]
    );

    const finalRound = sortedRounds[sortedRounds.length - 1];
    const isFinalRound = (round) => round === finalRound;

    const getClubByName = (name) => {
        if (!name) return null;
        return clubs.find(c => c.name.toLowerCase().trim() === name.toLowerCase().trim());
    };

    // Measure rendered cards and draw connector lines from each feeder pair to
    // its target match in the next round.
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const measure = () => {
            const cont = el.getBoundingClientRect();
            setSvgSize({ w: el.scrollWidth, h: el.scrollHeight });
            const pos = {};
            el.querySelectorAll('[data-pos]').forEach(node => {
                const [ri, mi] = node.dataset.pos.split('-').map(Number);
                const r = node.getBoundingClientRect();
                pos[`${ri}-${mi}`] = {
                    left: r.left - cont.left,
                    right: r.right - cont.left,
                    cy: (r.top + r.bottom) / 2 - cont.top,
                    winner: node.dataset.winner === '1',
                };
            });
            const segs = [];
            for (let ri = 0; ri < sortedRounds.length - 1; ri++) {
                const nextRound = sortedRounds[ri + 1];
                const nextMatches = orderedRounds[nextRound] || [];
                for (let ti = 0; ti < nextMatches.length; ti++) {
                    const f0 = pos[`${ri}-${2 * ti}`];
                    const f1 = pos[`${ri}-${2 * ti + 1}`];
                    const tgt = pos[`${ri + 1}-${ti}`];
                    if (!f0 || !tgt) continue;
                    const midX = (f0.right + tgt.left) / 2;
                    const decided = f0.winner && (!f1 || f1.winner);
                    const stroke = decided ? '#10b981' : '#cbd5e1';
                    if (f1) {
                        segs.push({ d: `M ${f0.right} ${f0.cy} H ${midX}`, stroke });
                        segs.push({ d: `M ${f1.right} ${f1.cy} H ${midX}`, stroke });
                        segs.push({ d: `M ${midX} ${f0.cy} V ${f1.cy}`, stroke });
                        segs.push({ d: `M ${midX} ${(f0.cy + f1.cy) / 2} H ${tgt.left}`, stroke });
                    } else {
                        segs.push({ d: `M ${f0.right} ${f0.cy} H ${midX} V ${tgt.cy} H ${tgt.left}`, stroke });
                    }
                }
            }
            setPaths(segs);
        };

        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        const t = setTimeout(measure, 350);
        return () => { ro.disconnect(); clearTimeout(t); };
    }, [sortedRounds, orderedRounds, matches]);

    if (sortedRounds.length === 0) {
        return (
            <Card className="border-dashed border-2 border-slate-300">
                <CardContent className="flex flex-col items-center justify-center py-12">
                    <Trophy className="w-12 h-12 text-slate-300 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">No Knockout Matches Yet</h3>
                    <p className="text-slate-500">Add matches to build the bracket</p>
                </CardContent>
            </Card>
        );
    }

    const ClubRow = ({ name, nation, club, isWinner, score }) => {
        const flag = getNationFlag(nation);
        return (
            <div className={`flex items-center gap-2 px-3 py-2 ${isWinner ? 'bg-emerald-50/70' : ''}`}>
                <div className="w-5 flex justify-center">
                    {flag && <img src={flag} alt="" className="w-5 h-3.5 object-cover rounded-sm" />}
                </div>
                {club?.logo_url && (
                    <img src={club.logo_url} alt="" className="w-5 h-5 object-contain flex-shrink-0" />
                )}
                {club ? (
                    <Link
                        to={createPageUrl(`ClubDetail?id=${club.id}`)}
                        className={`flex-1 truncate text-sm hover:underline ${isWinner ? 'font-semibold text-emerald-700' : 'text-slate-600'}`}
                    >
                        {name}
                    </Link>
                ) : (
                    <span className={`flex-1 truncate text-sm ${isWinner ? 'font-semibold text-emerald-700' : 'text-slate-600'}`}>
                        {name}
                    </span>
                )}
                <span className={`w-7 h-7 flex items-center justify-center rounded text-sm font-bold flex-shrink-0 ${
                    isWinner ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                    {score ?? '-'}
                </span>
            </div>
        );
    };

    const MatchCard = ({ match, isFinal }) => {
        const homeClub = getClubByName(match.home_club_name);
        const awayClub = getClubByName(match.away_club_name);
        const homeIsWinner = match.winner === match.home_club_name;
        const awayIsWinner = match.winner === match.away_club_name;

        const homeScore = isDomesticCup ? match.home_score : (match.is_single_leg ? match.home_score_leg1 : match.home_aggregate);
        const awayScore = isDomesticCup ? match.away_score : (match.is_single_leg ? match.away_score_leg1 : match.away_aggregate);

        const hasLegs = !isDomesticCup && !match.is_single_leg && (match.home_score_leg1 != null || match.away_score_leg1 != null);

        return (
            <div className={`relative bg-white rounded-lg shadow-sm border overflow-hidden ${isFinal ? 'w-72 border-amber-400 ring-2 ring-amber-300/40' : 'w-56'}`}>
                {isFinal && (
                    <div className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-400 text-amber-900 text-xs font-bold text-center py-1.5 flex items-center justify-center gap-1.5">
                        <Star className="w-3.5 h-3.5" /> FINAL <Star className="w-3.5 h-3.5" />
                    </div>
                )}
                <ClubRow name={match.home_club_name} nation={match.home_club_nation} club={homeClub} isWinner={homeIsWinner} score={homeScore} />
                <div className="border-t border-slate-100" />
                <ClubRow name={match.away_club_name} nation={match.away_club_nation} club={awayClub} isWinner={awayIsWinner} score={awayScore} />
                {hasLegs && (
                    <div className="px-3 py-1 text-[10px] text-slate-500 border-t border-slate-100 flex justify-center gap-3 bg-slate-50/50">
                        <span>1st: {match.home_score_leg1 ?? '-'}-{match.away_score_leg1 ?? '-'}</span>
                        <span className="text-slate-300">|</span>
                        <span>2nd: {match.away_score_leg2 ?? '-'}-{match.home_score_leg2 ?? '-'}</span>
                    </div>
                )}
                {match.penalties && (
                    <div className="px-3 py-1 text-[11px] text-blue-700 text-center border-t border-slate-100 font-medium bg-blue-50/60">
                        Pens: {match.penalties}
                    </div>
                )}
                {match.venue && isFinal && (
                    <div className="px-3 py-1 text-[11px] text-slate-500 text-center border-t border-slate-100">
                        📍 {match.venue}
                    </div>
                )}
                <div className="border-t border-slate-100 flex">
                    <Button variant="ghost" size="sm" className="flex-1 h-7 text-[11px] text-slate-400 hover:text-slate-700" onClick={() => setDetailViewMatch(match)}>
                        <Eye className="w-3 h-3 mr-1" /> Details
                    </Button>
                    {onEditMatch && (
                        <AdminOnly>
                            <div className="flex border-l border-slate-100">
                                <Button variant="ghost" size="sm" className="h-7 px-2 text-slate-400 hover:text-slate-700" onClick={() => setLineupEditMatch(match)} title="Lineups">
                                    <Users className="w-3 h-3" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 px-2 text-slate-400 hover:text-slate-700 border-l border-slate-100" onClick={() => onEditMatch(match)} title="Edit">
                                    <Edit2 className="w-3 h-3" />
                                </Button>
                            </div>
                        </AdminOnly>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span className="flex items-center gap-1.5">
                    <Crown className="w-3.5 h-3.5 text-amber-500" />
                    {sortedRounds.length} rounds · {matches.length} matches
                </span>
                <span className="hidden sm:inline">Scroll horizontally to follow the path to the final →</span>
            </div>

            <div className="overflow-x-auto rounded-xl bg-gradient-to-br from-slate-50 to-white border border-slate-200/70">
                <div ref={containerRef} className="relative flex items-stretch min-w-max p-5 md:p-8 gap-6">
                    <svg className="absolute inset-0 z-0 pointer-events-none" width={svgSize.w} height={svgSize.h}>
                        {paths.map((p, i) => (
                            <path key={i} d={p.d} stroke={p.stroke} strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        ))}
                    </svg>

                    {sortedRounds.map((round, ri) => {
                        const roundMatches = orderedRounds[round] || [];
                        const final = isFinalRound(round);
                        const rms = matchesByRound[round] || [];
                        const order = rms.find(m => m.round_order != null)?.round_order;
                        return (
                            <div key={round} className="relative z-10 flex flex-col" style={{ width: final ? 308 : 248 }}>
                                <div className="flex flex-col items-center mb-4">
                                    <div className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide flex items-center gap-2 ${
                                        final
                                            ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-amber-900 shadow-sm'
                                            : 'bg-slate-800 text-white'
                                    }`}>
                                        {final && <Trophy className="w-3.5 h-3.5" />}
                                        {getRoundDisplayName(round)}
                                        {order != null && (
                                            <span className={`text-[10px] font-normal px-1.5 py-0.5 rounded-full ${final ? 'bg-amber-200/70 text-amber-800' : 'bg-slate-700 text-slate-200'}`}>
                                                #{order}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-[11px] text-slate-400 mt-1">{roundMatches.length} match{roundMatches.length !== 1 ? 'es' : ''}</span>
                                </div>
                                <div className="flex-1 flex flex-col justify-around gap-2">
                                    {roundMatches.map((match, mi) => (
                                        <div
                                            key={match.id}
                                            data-pos={`${ri}-${mi}`}
                                            data-winner={match.winner ? '1' : '0'}
                                        >
                                            <MatchCard match={match} isFinal={final} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="flex items-center justify-center gap-6 text-xs text-slate-500 pt-2 border-t">
                <span className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded bg-emerald-500" />
                    Winner advances
                </span>
                <span className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded border-2 border-amber-400 bg-amber-100 flex items-center justify-center">
                        <Trophy className="w-3 h-3 text-amber-500" />
                    </div>
                    Champion
                </span>
            </div>

            <MatchLineupEditor match={lineupEditMatch} isOpen={!!lineupEditMatch} onClose={() => setLineupEditMatch(null)} />
            <MatchDetailView match={detailViewMatch} isOpen={!!detailViewMatch} onClose={() => setDetailViewMatch(null)} />
        </div>
    );
}