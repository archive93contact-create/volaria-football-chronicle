import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, ArrowUpDown, Layers } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function PyramidFlowDiagram({ seasons = [], allLeagueTables = [], leagues = [] }) {
    const flowData = useMemo(() => {
        if (!seasons || seasons.length === 0) return null;

        // Group seasons by year and tier
        const yearlyFlow = {};
        
        seasons.forEach(season => {
            const league = leagues.find(l => l.id === season.league_id);
            if (!league || !season.year) return;

            const tier = season.tier || league.tier;
            const year = season.year;

            if (!yearlyFlow[year]) {
                yearlyFlow[year] = {};
            }

            if (!yearlyFlow[year][tier]) {
                yearlyFlow[year][tier] = {
                    promoted: 0,
                    relegated: 0,
                };
            }

            // Count promoted teams
            if (season.promoted_teams) {
                const promotedCount = season.promoted_teams.split(',').filter(Boolean).length;
                yearlyFlow[year][tier].promoted += promotedCount;
            }

            // Count relegated teams
            if (season.relegated_teams) {
                const relegatedCount = season.relegated_teams.split(',').filter(Boolean).length;
                yearlyFlow[year][tier].relegated += relegatedCount;
            }
        });

        // Calculate aggregate flow by tier
        const tierFlow = {};
        Object.values(yearlyFlow).forEach(yearData => {
            Object.entries(yearData).forEach(([tier, flow]) => {
                if (!tierFlow[tier]) {
                    tierFlow[tier] = { tier: parseInt(tier), totalPromoted: 0, totalRelegated: 0, netMovement: 0 };
                }
                tierFlow[tier].totalPromoted += flow.promoted;
                tierFlow[tier].totalRelegated += flow.relegated;
            });
        });

        // Calculate net movement
        Object.values(tierFlow).forEach(flow => {
            flow.netMovement = flow.totalPromoted - flow.totalRelegated;
        });

        const sortedTiers = Object.values(tierFlow).sort((a, b) => a.tier - b.tier);

        // Recent flow (last 5 years)
        const recentYears = Object.keys(yearlyFlow).sort().slice(-5);
        const recentFlowData = recentYears.map(year => {
            const tierData = yearlyFlow[year];
            const result = { year };
            
            Object.entries(tierData).forEach(([tier, flow]) => {
                result[`T${tier} ↑`] = flow.promoted;
                result[`T${tier} ↓`] = -flow.relegated; // Negative for visual clarity
            });
            
            return result;
        });

        return {
            tierFlow: sortedTiers,
            recentFlowData,
            totalYears: Object.keys(yearlyFlow).length,
        };
    }, [seasons, allLeagueTables, leagues]);

    if (!flowData || flowData.tierFlow.length === 0) {
        return null;
    }

    return (
        <div className="space-y-6">
            {/* Overview Card */}
            <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50 border-l-4 border-l-blue-500">
                <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                        <Layers className="w-8 h-8 text-blue-600" />
                        <div>
                            <div className="font-semibold text-blue-900">League Pyramid Flow</div>
                            <div className="text-sm text-blue-700">
                                Promotion and relegation patterns across {flowData.totalYears} seasons
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Aggregate Flow by Tier */}
            <Card className="border-0 shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ArrowUpDown className="w-5 h-5 text-slate-600" />
                        All-Time Flow by Tier
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {flowData.tierFlow.map(flow => {
                            const tierLeague = leagues.find(l => l.tier === flow.tier);
                            return (
                                <div 
                                    key={flow.tier}
                                    className="flex items-center justify-between p-4 rounded-lg border bg-white hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700">
                                            T{flow.tier}
                                        </div>
                                        <div>
                                            <div className="font-semibold text-slate-900">
                                                {tierLeague?.name || `Tier ${flow.tier}`}
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                {flow.totalPromoted + flow.totalRelegated} total movements
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-center">
                                            <div className="flex items-center gap-1 text-green-600">
                                                <TrendingUp className="w-4 h-4" />
                                                <span className="font-bold">{flow.totalPromoted}</span>
                                            </div>
                                            <div className="text-xs text-slate-500">Promoted</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="flex items-center gap-1 text-red-600">
                                                <TrendingDown className="w-4 h-4" />
                                                <span className="font-bold">{flow.totalRelegated}</span>
                                            </div>
                                            <div className="text-xs text-slate-500">Relegated</div>
                                        </div>
                                        {flow.netMovement !== 0 && (
                                            <Badge variant={flow.netMovement > 0 ? 'default' : 'outline'} className={
                                                flow.netMovement > 0 ? 'bg-green-600' : 'bg-red-600 text-white'
                                            }>
                                                {flow.netMovement > 0 ? '+' : ''}{flow.netMovement}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Recent Flow Visualization */}
            {flowData.recentFlowData.length > 0 && (
                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-emerald-600" />
                            Recent Movement (Last 5 Years)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={flowData.recentFlowData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="year" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                {flowData.tierFlow.map((flow, idx) => (
                                    <React.Fragment key={flow.tier}>
                                        <Bar dataKey={`T${flow.tier} ↑`} fill="#10b981" stackId={`tier${flow.tier}`} name={`T${flow.tier} Promoted`} />
                                        <Bar dataKey={`T${flow.tier} ↓`} fill="#ef4444" stackId={`tier${flow.tier}`} name={`T${flow.tier} Relegated`} />
                                    </React.Fragment>
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                        <div className="text-xs text-slate-500 text-center mt-2">
                            Green = promotions to tier, Red = relegations from tier
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}