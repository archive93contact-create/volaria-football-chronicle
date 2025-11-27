import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Swords, MapPin, Trophy, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function RivalryTracker({ club, allClubs = [], allLeagueTables = [] }) {
    const rivalries = useMemo(() => {
        if (!club || allClubs.length === 0) return [];

        const rivalryScores = {};
        const clubTables = allLeagueTables.filter(t => t.club_id === club.id);

        allClubs.filter(c => c.id !== club.id).forEach(otherClub => {
            let score = 0;
            const reasons = [];

            // 1. Explicit rivals (from rival_club_ids)
            if (club.rival_club_ids?.includes(otherClub.id)) {
                score += 50;
                reasons.push('Official rivalry');
            }

            // 2. Geographic proximity (same settlement/district/region)
            if (club.settlement && club.settlement === otherClub.settlement) {
                score += 40;
                reasons.push('Same city');
            } else if (club.district && club.district === otherClub.district) {
                score += 25;
                reasons.push('Same district');
            } else if (club.region && club.region === otherClub.region) {
                score += 15;
                reasons.push('Same region');
            }

            // 3. Shared league seasons
            const otherClubTables = allLeagueTables.filter(t => t.club_id === otherClub.id);
            const sharedSeasons = clubTables.filter(ct => 
                otherClubTables.some(ot => ot.season_id === ct.season_id || (ot.league_id === ct.league_id && ot.year === ct.year))
            );
            if (sharedSeasons.length > 0) {
                score += Math.min(sharedSeasons.length * 2, 30);
                reasons.push(`${sharedSeasons.length} shared seasons`);
            }

            // 4. Close finishes (both in top 3 same season)
            const closeFinishes = clubTables.filter(ct => {
                const otherInSeason = otherClubTables.find(ot => 
                    (ot.season_id === ct.season_id || (ot.league_id === ct.league_id && ot.year === ct.year))
                );
                return otherInSeason && ct.position <= 3 && otherInSeason.position <= 3;
            }).length;
            if (closeFinishes > 0) {
                score += closeFinishes * 5;
                reasons.push(`${closeFinishes} title battles`);
            }

            // 5. Similar trophy count (competitive equals)
            const clubTrophies = (club.league_titles || 0) + (club.domestic_cup_titles || 0);
            const otherTrophies = (otherClub.league_titles || 0) + (otherClub.domestic_cup_titles || 0);
            if (Math.abs(clubTrophies - otherTrophies) <= 3 && clubTrophies > 0) {
                score += 10;
                reasons.push('Similar success');
            }

            if (score > 0) {
                rivalryScores[otherClub.id] = {
                    club: otherClub,
                    score,
                    reasons,
                    sharedSeasons: sharedSeasons.length,
                    closeFinishes
                };
            }
        });

        return Object.values(rivalryScores)
            .filter(r => r.score >= 50) // Only fierce (80+) and intense (50+)
            .sort((a, b) => b.score - a.score)
            .slice(0, 6);
    }, [club, allClubs, allLeagueTables]);

    if (rivalries.length === 0) return null;

    const getIntensityLabel = (score) => {
        if (score >= 80) return { label: 'Fierce', color: 'text-red-600', bg: 'bg-red-50' };
        if (score >= 50) return { label: 'Intense', color: 'text-orange-600', bg: 'bg-orange-50' };
        if (score >= 30) return { label: 'Strong', color: 'text-amber-600', bg: 'bg-amber-50' };
        return { label: 'Mild', color: 'text-blue-600', bg: 'bg-blue-50' };
    };

    return (
        <Card className="border-0 shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Swords className="w-5 h-5 text-red-500" />
                    Rivalries
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {rivalries.map(rivalry => {
                        const intensity = getIntensityLabel(rivalry.score);
                        return (
                            <div 
                                key={rivalry.club.id} 
                                className={`p-3 rounded-lg ${intensity.bg} border border-slate-200`}
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    {rivalry.club.logo_url ? (
                                        <img src={rivalry.club.logo_url} alt="" className="w-8 h-8 object-contain" />
                                    ) : (
                                        <div className="w-8 h-8 bg-slate-200 rounded-full" />
                                    )}
                                    <Link 
                                        to={createPageUrl(`ClubDetail?id=${rivalry.club.id}`)}
                                        className="font-semibold hover:underline flex-1"
                                    >
                                        {rivalry.club.name}
                                    </Link>
                                    <span className={`text-xs font-bold px-2 py-1 rounded ${intensity.color} ${intensity.bg}`}>
                                        {intensity.label}
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                                    {rivalry.reasons.map((reason, i) => (
                                        <span key={i} className="bg-white/50 px-2 py-0.5 rounded">
                                            {reason}
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