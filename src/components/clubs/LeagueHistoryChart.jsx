import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from 'lucide-react';

export default function LeagueHistoryChart({ seasons, leagues, nationName }) {
    if (!seasons || seasons.length === 0) return null;

    // Get max tier from the data
    const maxTier = Math.max(...seasons.map(s => {
        const league = leagues.find(l => l.id === s.league_id);
        return league?.tier || 1;
    }));

    // Calculate a combined score: lower is better
    // Formula: (tier - 1) * 20 + position
    // This means tier 1 pos 1 = 1, tier 1 pos 20 = 20, tier 2 pos 1 = 21, etc.
    const chartData = seasons
        .map(s => {
            const league = leagues.find(l => l.id === s.league_id);
            const tier = league?.tier || 1;
            const teamsInLeague = league?.number_of_teams || 20;
            
            // Combined score where lower is better
            const combinedScore = (tier - 1) * 20 + s.position;
            
            return {
                year: s.year,
                position: s.position,
                tier,
                combinedScore,
                leagueName: league?.name || 'Unknown',
                status: s.status
            };
        })
        .sort((a, b) => a.year.localeCompare(b.year));

    if (chartData.length < 2) return null;

    // Calculate Y axis domain - invert so lower scores (better) are at top
    const maxScore = Math.max(...chartData.map(d => d.combinedScore));
    const minScore = Math.min(...chartData.map(d => d.combinedScore));

    // Tier boundaries for reference lines
    const tierBoundaries = [];
    for (let t = 1; t <= maxTier; t++) {
        tierBoundaries.push({
            value: (t - 1) * 20 + 1,
            label: `Tier ${t}`
        });
    }

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-white p-3 shadow-lg rounded-lg border">
                    <p className="font-bold text-slate-800">{data.year}</p>
                    <p className="text-sm text-slate-600">{data.leagueName}</p>
                    <p className="text-sm">
                        <span className="font-semibold">Position:</span> {data.position}
                        {data.status === 'champion' && <span className="ml-2 text-amber-600">🏆</span>}
                        {data.status === 'promoted' && <span className="ml-2 text-green-600">↑</span>}
                        {data.status === 'relegated' && <span className="ml-2 text-red-600">↓</span>}
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <Card className="border-0 shadow-sm mb-8">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                    League Position History
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                            {/* Top Flight shading (Tier 1) */}
                            <ReferenceArea 
                                y1={1} 
                                y2={20} 
                                fill="#fef3c7" 
                                fillOpacity={0.6}
                            />
                            
                            {/* TFA Football League shading (Tiers 1-4) for Turuliand */}
                            {nationName?.toLowerCase() === 'turuliand' && maxTier > 4 && (
                                <ReferenceArea 
                                    y1={21} 
                                    y2={80} 
                                    fill="#dbeafe" 
                                    fillOpacity={0.4}
                                />
                            )}
                            
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis 
                                dataKey="year" 
                                tick={{ fontSize: 12 }}
                                stroke="#64748b"
                            />
                            <YAxis 
                                reversed
                                domain={[1, maxScore + 5]}
                                tick={{ fontSize: 12 }}
                                stroke="#64748b"
                                tickFormatter={(value) => {
                                    // Show tier and position
                                    const tier = Math.floor((value - 1) / 20) + 1;
                                    const pos = ((value - 1) % 20) + 1;
                                    if (pos === 1) return `T${tier}`;
                                    return '';
                                }}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            
                            {/* Tier boundary lines */}
                            {tierBoundaries.slice(1).map((boundary, idx) => (
                                <ReferenceLine 
                                    key={idx}
                                    y={boundary.value} 
                                    stroke="#94a3b8" 
                                    strokeDasharray="5 5"
                                />
                            ))}
                            
                            <Line 
                                type="monotone" 
                                dataKey="combinedScore" 
                                stroke="#10b981" 
                                strokeWidth={2}
                                dot={(props) => {
                                    const { cx, cy, payload } = props;
                                    let fill = '#10b981';
                                    if (payload.status === 'champion') fill = '#f59e0b';
                                    if (payload.status === 'promoted') fill = '#22c55e';
                                    if (payload.status === 'relegated') fill = '#ef4444';
                                    return (
                                        <circle 
                                            cx={cx} 
                                            cy={cy} 
                                            r={payload.status === 'champion' ? 6 : 4} 
                                            fill={fill}
                                            stroke="#fff"
                                            strokeWidth={2}
                                        />
                                    );
                                }}
                                activeDot={{ r: 6, fill: '#059669' }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-4 mt-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded-full bg-amber-500"></span> Champion
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded-full bg-green-500"></span> Promoted
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded-full bg-red-500"></span> Relegated
                    </span>
                    <span className="text-slate-400">|</span>
                    <span>Higher = Better (Top of chart is Tier 1, 1st place)</span>
                </div>
            </CardContent>
        </Card>
    );
}