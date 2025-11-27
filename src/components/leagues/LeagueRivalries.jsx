import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Swords, MapPin, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function LeagueRivalries({ clubs = [], leagueTables = [] }) {
    const rivalries = useMemo(() => {
        if (clubs.length < 2) return [];

        const pairs = [];

        for (let i = 0; i < clubs.length; i++) {
            for (let j = i + 1; j < clubs.length; j++) {
                const club1 = clubs[i];
                const club2 = clubs[j];
                let score = 0;
                const reasons = [];

                // Geographic - same settlement
                if (club1.settlement && club1.settlement === club2.settlement) {
                    score += 40;
                    reasons.push({ icon: 'geo', text: 'Same city' });
                } else if (club1.district && club1.district === club2.district) {
                    score += 20;
                    reasons.push({ icon: 'geo', text: 'Same district' });
                }

                // Official rivals
                if (club1.rival_club_ids?.includes(club2.id) || club2.rival_club_ids?.includes(club1.id)) {
                    score += 50;
                    reasons.push({ icon: 'rivalry', text: 'Official rivals' });
                }

                // Shared seasons & close finishes
                const c1Tables = leagueTables.filter(t => t.club_id === club1.id);
                const c2Tables = leagueTables.filter(t => t.club_id === club2.id);
                
                let titleBattles = 0;
                c1Tables.forEach(t1 => {
                    const t2 = c2Tables.find(t => t.league_id === t1.league_id && t.year === t1.year);
                    if (t2 && t1.position <= 2 && t2.position <= 2) {
                        titleBattles++;
                    }
                });
                
                if (titleBattles > 0) {
                    score += titleBattles * 10;
                    reasons.push({ icon: 'trophy', text: `${titleBattles} title battle${titleBattles > 1 ? 's' : ''}` });
                }

                if (score >= 30) {
                    pairs.push({ club1, club2, score, reasons });
                }
            }
        }

        return pairs.sort((a, b) => b.score - a.score).slice(0, 6);
    }, [clubs, leagueTables]);

    if (rivalries.length === 0) return null;

    const getIntensity = (score) => {
        if (score >= 80) return { label: 'Fierce', color: 'bg-red-100 text-red-700 border-red-300' };
        if (score >= 50) return { label: 'Intense', color: 'bg-orange-100 text-orange-700 border-orange-300' };
        return { label: 'Strong', color: 'bg-amber-100 text-amber-700 border-amber-300' };
    };

    return (
        <Card className="border-0 shadow-sm mb-8">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Swords className="w-5 h-5 text-red-500" />
                    League Rivalries
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {rivalries.map((rivalry, idx) => {
                        const intensity = getIntensity(rivalry.score);
                        return (
                            <div key={idx} className={`p-4 rounded-lg border ${intensity.color}`}>
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        {rivalry.club1.logo_url ? (
                                            <img src={rivalry.club1.logo_url} alt="" className="w-8 h-8 object-contain" />
                                        ) : <div className="w-8 h-8 bg-slate-200 rounded-full" />}
                                        <Swords className="w-4 h-4" />
                                        {rivalry.club2.logo_url ? (
                                            <img src={rivalry.club2.logo_url} alt="" className="w-8 h-8 object-contain" />
                                        ) : <div className="w-8 h-8 bg-slate-200 rounded-full" />}
                                    </div>
                                    <span className="text-xs font-bold px-2 py-1 rounded bg-white/50">{intensity.label}</span>
                                </div>
                                <div className="text-sm font-medium mb-2">
                                    <Link to={createPageUrl(`ClubDetail?id=${rivalry.club1.id}`)} className="hover:underline">{rivalry.club1.name}</Link>
                                    {' vs '}
                                    <Link to={createPageUrl(`ClubDetail?id=${rivalry.club2.id}`)} className="hover:underline">{rivalry.club2.name}</Link>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {rivalry.reasons.map((r, i) => (
                                        <span key={i} className="text-xs bg-white/50 px-2 py-0.5 rounded flex items-center gap-1">
                                            {r.icon === 'geo' && <MapPin className="w-3 h-3" />}
                                            {r.icon === 'trophy' && <Trophy className="w-3 h-3" />}
                                            {r.icon === 'rivalry' && <Swords className="w-3 h-3" />}
                                            {r.text}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}