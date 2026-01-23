import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingDown, Calendar, AlertCircle } from 'lucide-react';

export default function TuruliandNonLeagueStatus({ club, seasons, leagues }) {
    const nonLeagueInfo = useMemo(() => {
        if (!club || !seasons || seasons.length === 0) return null;

        const getLeagueTier = (leagueId) => {
            const league = leagues.find(l => l.id === leagueId);
            return league?.tier || 1;
        };

        const sortedSeasons = [...seasons].sort((a, b) => a.year.localeCompare(b.year));
        const tfaSeasons = sortedSeasons.filter(s => getLeagueTier(s.league_id) <= 4);
        const currentTier = getLeagueTier(club.league_id);

        // Only show if currently outside TFA but had TFA history
        if (currentTier <= 4 || tfaSeasons.length === 0) return null;

        const lastTfaYear = [...tfaSeasons].sort((a, b) => b.year.localeCompare(a.year))[0]?.year;
        const seasonsAway = sortedSeasons.filter(s => s.year > lastTfaYear && getLeagueTier(s.league_id) > 4).length;
        const lastTfaLeague = leagues.find(l => l.id === tfaSeasons[tfaSeasons.length - 1].league_id);

        return {
            lastTfaYear,
            seasonsAway,
            lastTfaLeague: lastTfaLeague?.name || 'TFA',
            tfaSeasonsTotal: tfaSeasons.length,
            percentageInTfa: Math.round((tfaSeasons.length / sortedSeasons.length) * 100)
        };
    }, [club, seasons, leagues]);

    if (!nonLeagueInfo) return null;

    const { lastTfaYear, seasonsAway, lastTfaLeague, tfaSeasonsTotal, percentageInTfa } = nonLeagueInfo;

    const severityColor = 
        seasonsAway >= 15 ? 'from-red-50 to-orange-50 border-l-red-600' :
        seasonsAway >= 5 ? 'from-orange-50 to-yellow-50 border-l-orange-600' :
        'from-yellow-50 to-amber-50 border-l-yellow-600';

    const iconColor = 
        seasonsAway >= 15 ? 'text-red-600' :
        seasonsAway >= 5 ? 'text-orange-600' :
        'text-yellow-600';

    return (
        <Card className={`border-0 shadow-sm bg-gradient-to-br ${severityColor} border-l-4 mb-6`}>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <TrendingDown className={`w-5 h-5 ${iconColor}`} />
                    Non-League Status
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-white/60 rounded-lg">
                        <div className="flex items-center gap-2">
                            <Calendar className={`w-4 h-4 ${iconColor}`} />
                            <span className="text-sm font-medium text-slate-700">Last TFA Season</span>
                        </div>
                        <span className="font-bold text-slate-900">{lastTfaYear}</span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-white/60 rounded-lg">
                        <div className="flex items-center gap-2">
                            <AlertCircle className={`w-4 h-4 ${iconColor}`} />
                            <span className="text-sm font-medium text-slate-700">Seasons Outside TFA</span>
                        </div>
                        <span className={`font-bold text-xl ${iconColor}`}>{seasonsAway}</span>
                    </div>

                    <div className="p-3 bg-white/60 rounded-lg">
                        <div className="text-xs text-slate-500 mb-1">TFA History</div>
                        <div className="text-sm text-slate-700">
                            Competed in the TFA for <span className="font-semibold">{tfaSeasonsTotal} seasons</span> ({percentageInTfa}% of recorded history)
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                            Last played in {lastTfaLeague}
                        </div>
                    </div>

                    {seasonsAway >= 15 && (
                        <div className="p-3 bg-red-100/50 rounded-lg border border-red-200">
                            <p className="text-xs text-red-800 leading-relaxed">
                                <strong>Critical:</strong> It's been {seasonsAway} seasons since this club competed in organized football. An entire generation of fans has never seen them in the TFA system.
                            </p>
                        </div>
                    )}

                    {seasonsAway >= 5 && seasonsAway < 15 && (
                        <div className="p-3 bg-orange-100/50 rounded-lg border border-orange-200">
                            <p className="text-xs text-orange-800 leading-relaxed">
                                The club has been outside the TFA for {seasonsAway} seasons. The memory of organized football is fading, but hope for a return remains.
                            </p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}