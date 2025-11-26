import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

export default function ClubComparisonChart({ clubs, leagueTables, leagues, colors }) {
    // Get all seasons for each club including predecessors
    const getClubSeasons = (club) => {
        let seasons = leagueTables.filter(t => t.club_id === club.id);
        if (club.predecessor_club_id) {
            seasons = [...seasons, ...leagueTables.filter(t => t.club_id === club.predecessor_club_id)];
        }
        if (club.predecessor_club_2_id) {
            seasons = [...seasons, ...leagueTables.filter(t => t.club_id === club.predecessor_club_2_id)];
        }
        return seasons;
    };

    // Collect all unique years
    const allYears = new Set();
    clubs.forEach(club => {
        getClubSeasons(club).forEach(s => allYears.add(s.year));
    });
    const sortedYears = [...allYears].sort();

    // Build chart data
    const chartData = sortedYears.map(year => {
        const dataPoint = { year };
        
        clubs.forEach(club => {
            const seasons = getClubSeasons(club);
            const seasonData = seasons.find(s => s.year === year);
            
            if (seasonData) {
                const league = leagues.find(l => l.id === seasonData.league_id);
                const tier = league?.tier || 1;
                // Combined score: lower is better (tier 1 pos 1 = 1, tier 2 pos 1 = 21, etc.)
                const score = ((tier - 1) * 20) + seasonData.position;
                dataPoint[club.id] = score;
            }
        });
        
        return dataPoint;
    });

    // Custom tooltip
    const CustomTooltip = ({ active, payload, label }) => {
        if (!active || !payload?.length) return null;
        
        return (
            <div className="bg-white p-3 rounded-lg shadow-lg border">
                <p className="font-bold text-slate-700 mb-2">{label}</p>
                {payload.map((entry, idx) => {
                    const club = clubs.find(c => c.id === entry.dataKey);
                    const score = entry.value;
                    const tier = Math.floor((score - 1) / 20) + 1;
                    const position = ((score - 1) % 20) + 1;
                    
                    return (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                            <span className="font-medium">{club?.name}:</span>
                            <span>
                                {position === 1 ? '1st' : position === 2 ? '2nd' : position === 3 ? '3rd' : `${position}th`}
                                <span className="text-slate-400 ml-1">(Tier {tier})</span>
                            </span>
                        </div>
                    );
                })}
            </div>
        );
    };

    // Format Y axis
    const formatYAxis = (value) => {
        const tier = Math.floor((value - 1) / 20) + 1;
        const pos = ((value - 1) % 20) + 1;
        return `T${tier} #${pos}`;
    };

    if (chartData.length === 0) {
        return (
            <Card className="border-0 shadow-sm">
                <CardContent className="py-12 text-center text-slate-500">
                    No season data available for comparison
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-0 shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                    Historical League Position Comparison
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis 
                                dataKey="year" 
                                tick={{ fontSize: 11 }}
                                angle={-45}
                                textAnchor="end"
                                height={60}
                            />
                            <YAxis 
                                reversed
                                domain={[1, 80]}
                                tickFormatter={formatYAxis}
                                tick={{ fontSize: 10 }}
                                width={60}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend 
                                formatter={(value) => {
                                    const club = clubs.find(c => c.id === value);
                                    return club?.name || value;
                                }}
                            />
                            
                            {/* Tier reference lines */}
                            <ReferenceLine y={1} stroke="#10b981" strokeDasharray="5 5" label={{ value: 'Tier 1', position: 'right', fontSize: 10 }} />
                            <ReferenceLine y={21} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: 'Tier 2', position: 'right', fontSize: 10 }} />
                            <ReferenceLine y={41} stroke="#ef4444" strokeDasharray="5 5" label={{ value: 'Tier 3', position: 'right', fontSize: 10 }} />
                            <ReferenceLine y={61} stroke="#6b7280" strokeDasharray="5 5" label={{ value: 'Tier 4', position: 'right', fontSize: 10 }} />
                            
                            {clubs.map((club, idx) => (
                                <Line 
                                    key={club.id}
                                    type="monotone"
                                    dataKey={club.id}
                                    stroke={colors[idx]}
                                    strokeWidth={2}
                                    dot={{ r: 4, fill: colors[idx] }}
                                    activeDot={{ r: 6 }}
                                    connectNulls
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                
                <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500 justify-center">
                    <span>Lower position on chart = Better performance</span>
                    <span>•</span>
                    <span>Gaps indicate seasons not played or no data</span>
                </div>
            </CardContent>
        </Card>
    );
}