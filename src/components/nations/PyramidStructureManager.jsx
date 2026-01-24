import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Loader2, ArrowUp, Trash2 } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

export default function PyramidStructureManager({ leagues, nationId }) {
    const [editing, setEditing] = useState({});
    const queryClient = useQueryClient();

    const updateMutation = useMutation({
        mutationFn: async ({ leagueId, data }) => {
            await base44.entities.League.update(leagueId, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leagues', nationId] });
            setEditing({});
        },
    });

    const handleSetParent = (leagueId, parentLeagueId) => {
        setEditing(prev => ({
            ...prev,
            [leagueId]: { ...prev[leagueId], parent_league_id: parentLeagueId || null }
        }));
    };

    const handleSave = (leagueId) => {
        const data = editing[leagueId];
        if (!data) return;
        updateMutation.mutate({ leagueId, data });
    };

    const handleRemoveParent = (leagueId) => {
        updateMutation.mutate({ 
            leagueId, 
            data: { parent_league_id: null } 
        });
    };

    // Group by tier
    const leaguesByTier = leagues.reduce((acc, league) => {
        const tier = league.tier || 1;
        if (!acc[tier]) acc[tier] = [];
        acc[tier].push(league);
        return acc;
    }, {});

    const sortedTiers = Object.keys(leaguesByTier).map(Number).sort((a, b) => a - b);

    return (
        <Card className="border-0 shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ArrowUp className="w-5 h-5 text-emerald-500" />
                    Manage Pyramid Structure
                </CardTitle>
                <p className="text-sm text-slate-500 mt-1">
                    Define which leagues feed into each other for promotion/relegation
                </p>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {sortedTiers.map(tier => (
                        <div key={tier} className="space-y-3">
                            <div className="flex items-center gap-2 mb-2">
                                <Badge variant={tier === 1 ? "default" : "outline"}>
                                    Tier {tier}
                                </Badge>
                                <div className="flex-1 h-px bg-slate-200" />
                            </div>
                            
                            {leaguesByTier[tier].map(league => {
                                const currentParent = editing[league.id]?.parent_league_id !== undefined 
                                    ? editing[league.id].parent_league_id 
                                    : league.parent_league_id;
                                const hasChanges = editing[league.id] !== undefined;
                                const parentLeague = leagues.find(l => l.id === currentParent);
                                
                                // Get possible parent leagues (tier above)
                                const possibleParents = leagues.filter(l => l.tier === tier - 1);

                                return (
                                    <div key={league.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                        <div className="flex-1">
                                            <div className="font-medium text-slate-900">{league.name}</div>
                                            {parentLeague && !hasChanges && (
                                                <div className="flex items-center gap-2 mt-1">
                                                    <ArrowUp className="w-3 h-3 text-emerald-500" />
                                                    <span className="text-xs text-slate-600">
                                                        Feeds into: <span className="font-medium">{parentLeague.name}</span>
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {tier > 1 && (
                                            <div className="flex items-center gap-2">
                                                <Select
                                                    value={currentParent || "none"}
                                                    onValueChange={(value) => handleSetParent(league.id, value === "none" ? null : value)}
                                                >
                                                    <SelectTrigger className="w-48">
                                                        <SelectValue placeholder="Select parent league..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="none">No parent league</SelectItem>
                                                        {possibleParents.map(parent => (
                                                            <SelectItem key={parent.id} value={parent.id}>
                                                                {parent.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>

                                                {hasChanges && (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleSave(league.id)}
                                                        disabled={updateMutation.isPending}
                                                    >
                                                        {updateMutation.isPending ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <><Save className="w-4 h-4 mr-1" /> Save</>
                                                        )}
                                                    </Button>
                                                )}

                                                {currentParent && !hasChanges && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleRemoveParent(league.id)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}