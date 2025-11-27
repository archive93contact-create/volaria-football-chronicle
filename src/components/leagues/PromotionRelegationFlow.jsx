import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function PromotionRelegationFlow({ seasons = [], clubs = [], leagues = [] }) {
    const flowData = useMemo(() => {
        if (seasons.length === 0) return null;

        const movements = [];
        
        seasons.forEach(season => {
            // Parse promoted teams
            if (season.promoted_teams) {
                const promoted = season.promoted_teams.split(',').map(t => t.trim()).filter(Boolean);
                promoted.forEach(clubName => {
                    const club = clubs.find(c => c.name === clubName);
                    movements.push({
                        year: season.year,
                        club: clubName,
                        clubId: club?.id,
                        type: 'promotion',
                        fromLeague: leagues.find(l => l.id === season.league_id)?.name
                    });
                });
            }
            
            // Parse relegated teams
            if (season.relegated_teams) {
                const relegated = season.relegated_teams.split(',').map(t => t.trim()).filter(Boolean);
                relegated.forEach(clubName => {
                    const club = clubs.find(c => c.name === clubName);
                    movements.push({
                        year: season.year,
                        club: clubName,
                        clubId: club?.id,
                        type: 'relegation',
                        fromLeague: leagues.find(l => l.id === season.league_id)?.name
                    });
                });
            }
        });

        // Sort by year descending
        movements.sort((a, b) => b.year.localeCompare(a.year));

        // Calculate stats
        const clubMovements = {};
        movements.forEach(m => {
            if (!clubMovements[m.club]) {
                clubMovements[m.club] = { promotions: 0, relegations: 0, clubId: m.clubId };
            }
            if (m.type === 'promotion') clubMovements[m.club].promotions++;
            else clubMovements[m.club].relegations++;
        });

        // Elevator clubs (most total movements)
        const elevatorClubs = Object.entries(clubMovements)
            .map(([club, data]) => ({ 
                club, 
                ...data, 
                total: data.promotions + data.relegations 
            }))
            .filter(c => c.total >= 3)
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);

        return {
            movements: movements.slice(0, 20), // Recent 20
            totalPromotions: movements.filter(m => m.type === 'promotion').length,
            totalRelegations: movements.filter(m => m.type === 'relegation').length,
            elevatorClubs
        };
    }, [seasons, clubs, leagues]);

    if (!flowData || flowData.movements.length === 0) return null;

    return (
        <Card className="border-0 shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                    Promotion & Relegation
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-4 bg-green-50 rounded-lg text-center">
                        <TrendingUp className="w-6 h-6 text-green-500 mx-auto mb-1" />
                        <div className="text-2xl font-bold text-green-700">{flowData.totalPromotions}</div>
                        <div className="text-sm text-green-600">Total Promotions</div>
                    </div>
                    <div className="p-4 bg-red-50 rounded-lg text-center">
                        <TrendingDown className="w-6 h-6 text-red-500 mx-auto mb-1" />
                        <div className="text-2xl font-bold text-red-700">{flowData.totalRelegations}</div>
                        <div className="text-sm text-red-600">Total Relegations</div>
                    </div>
                </div>

                {/* Elevator Clubs */}
                {flowData.elevatorClubs.length > 0 && (
                    <div className="mb-6">
                        <h4 className="font-semibold text-sm text-slate-700 mb-3">Elevator Clubs (Most Movement)</h4>
                        <div className="space-y-2">
                            {flowData.elevatorClubs.map(club => (
                                <div key={club.club} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
                                    {club.clubId ? (
                                        <Link to={createPageUrl(`ClubDetail?id=${club.clubId}`)} className="font-medium hover:text-emerald-600 flex-1">
                                            {club.club}
                                        </Link>
                                    ) : (
                                        <span className="font-medium flex-1">{club.club}</span>
                                    )}
                                    <div className="flex items-center gap-3 text-sm">
                                        <span className="text-green-600 flex items-center gap-1">
                                            <TrendingUp className="w-3 h-3" /> {club.promotions}
                                        </span>
                                        <span className="text-red-600 flex items-center gap-1">
                                            <TrendingDown className="w-3 h-3" /> {club.relegations}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Recent Movements */}
                <div>
                    <h4 className="font-semibold text-sm text-slate-700 mb-3">Recent Movements</h4>
                    <div className="space-y-1 max-h-64 overflow-y-auto">
                        {flowData.movements.map((m, idx) => (
                            <div 
                                key={idx} 
                                className={`flex items-center gap-2 p-2 rounded text-sm ${
                                    m.type === 'promotion' ? 'bg-green-50' : 'bg-red-50'
                                }`}
                            >
                                <span className="text-slate-500 w-16">{m.year}</span>
                                {m.type === 'promotion' ? (
                                    <TrendingUp className="w-4 h-4 text-green-500" />
                                ) : (
                                    <TrendingDown className="w-4 h-4 text-red-500" />
                                )}
                                {m.clubId ? (
                                    <Link to={createPageUrl(`ClubDetail?id=${m.clubId}`)} className="font-medium hover:underline">
                                        {m.club}
                                    </Link>
                                ) : (
                                    <span className="font-medium">{m.club}</span>
                                )}
                                <span className="text-slate-400 text-xs ml-auto">{m.fromLeague}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}