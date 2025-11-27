import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function HeadToHeadMatrix({ clubs = [], leagueTables = [] }) {
    const matrixData = useMemo(() => {
        if (clubs.length === 0 || clubs.length > 12) return null; // Too many clubs for matrix

        // Calculate shared seasons and relative performance
        const matrix = {};
        
        clubs.forEach(club1 => {
            matrix[club1.id] = {};
            const club1Tables = leagueTables.filter(t => t.club_id === club1.id);
            
            clubs.forEach(club2 => {
                if (club1.id === club2.id) {
                    matrix[club1.id][club2.id] = null;
                    return;
                }

                const club2Tables = leagueTables.filter(t => t.club_id === club2.id);
                
                // Find shared seasons
                let club1Wins = 0;
                let club2Wins = 0;
                let ties = 0;
                
                club1Tables.forEach(t1 => {
                    const t2 = club2Tables.find(t => 
                        (t.season_id === t1.season_id) || 
                        (t.league_id === t1.league_id && t.year === t1.year)
                    );
                    if (t2) {
                        if (t1.position < t2.position) club1Wins++;
                        else if (t2.position < t1.position) club2Wins++;
                        else ties++;
                    }
                });

                matrix[club1.id][club2.id] = {
                    wins: club1Wins,
                    losses: club2Wins,
                    ties,
                    total: club1Wins + club2Wins + ties
                };
            });
        });

        // Calculate overall records
        const records = clubs.map(club => {
            let totalWins = 0;
            let totalLosses = 0;
            clubs.forEach(other => {
                if (club.id !== other.id && matrix[club.id][other.id]) {
                    totalWins += matrix[club.id][other.id].wins;
                    totalLosses += matrix[club.id][other.id].losses;
                }
            });
            return { club, totalWins, totalLosses, diff: totalWins - totalLosses };
        }).sort((a, b) => b.diff - a.diff);

        return { matrix, records };
    }, [clubs, leagueTables]);

    if (!matrixData) {
        if (clubs.length > 12) {
            return (
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-6 text-center text-slate-500">
                        <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        Too many clubs for head-to-head matrix (max 12)
                    </CardContent>
                </Card>
            );
        }
        return null;
    }

    return (
        <Card className="border-0 shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-500" />
                    Head-to-Head Records
                </CardTitle>
            </CardHeader>
            <CardContent>
                {/* League Standings Summary */}
                <div className="mb-6">
                    <h4 className="font-semibold text-sm text-slate-700 mb-3">Season-by-Season Performance Rankings</h4>
                    <div className="space-y-2">
                        {matrixData.records.slice(0, 8).map((record, idx) => (
                            <div key={record.club.id} className="flex items-center gap-3 p-2 bg-slate-50 rounded">
                                <span className="w-6 text-center font-bold text-slate-400">{idx + 1}</span>
                                {record.club.logo_url ? (
                                    <img src={record.club.logo_url} alt="" className="w-6 h-6 object-contain" />
                                ) : (
                                    <div className="w-6 h-6 bg-slate-200 rounded-full" />
                                )}
                                <Link 
                                    to={createPageUrl(`ClubDetail?id=${record.club.id}`)}
                                    className="flex-1 font-medium hover:text-emerald-600"
                                >
                                    {record.club.name}
                                </Link>
                                <div className="flex gap-4 text-sm">
                                    <span className="text-green-600">{record.totalWins}W</span>
                                    <span className="text-red-600">{record.totalLosses}L</span>
                                    <span className={`font-bold ${record.diff > 0 ? 'text-green-600' : record.diff < 0 ? 'text-red-600' : 'text-slate-500'}`}>
                                        {record.diff > 0 ? '+' : ''}{record.diff}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <p className="text-xs text-slate-500 text-center">
                    Based on league position comparisons in shared seasons
                </p>
            </CardContent>
        </Card>
    );
}