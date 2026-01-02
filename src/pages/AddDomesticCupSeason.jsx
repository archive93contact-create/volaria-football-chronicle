import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { ChevronRight, Trophy, Users, ShieldAlert } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from '@/components/common/PageHeader';
import { useIsAdmin } from '@/components/common/AdminOnly';

export default function AddDomesticCupSeason() {
    const { isAdmin, isLoading: authLoading } = useIsAdmin();
    const urlParams = new URLSearchParams(window.location.search);
    const cupId = urlParams.get('cup_id');
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    
    if (authLoading) {
        return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full" /></div>;
    }
    
    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Card className="max-w-md">
                    <CardContent className="text-center py-8">
                        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <h2 className="text-xl font-bold mb-2">Admin Access Required</h2>
                        <p className="text-slate-500 mb-4">Only administrators can add content.</p>
                        <Link to={createPageUrl('Home')}><Button>Back to Home</Button></Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const [seasonData, setSeasonData] = useState({
        year: '',
        number_of_teams: 0,
        final_venue: '',
        final_score: '',
        top_scorer: '',
        notes: ''
    });

    const { data: cup } = useQuery({
        queryKey: ['domesticCup', cupId],
        queryFn: async () => {
            const cups = await base44.entities.DomesticCup.filter({ id: cupId });
            return cups[0];
        },
        enabled: !!cupId,
    });

    const { data: nation } = useQuery({
        queryKey: ['nation', cup?.nation_id],
        queryFn: async () => {
            const nations = await base44.entities.Nation.filter({ id: cup.nation_id });
            return nations[0];
        },
        enabled: !!cup?.nation_id,
    });

    const { data: allLeagueTables = [] } = useQuery({
        queryKey: ['allLeagueTables'],
        queryFn: () => base44.entities.LeagueTable.list(),
    });

    // Available years from league tables
    const availableYears = useMemo(() => {
        const years = [...new Set(allLeagueTables.map(t => t.year))];
        return years.sort().reverse();
    }, [allLeagueTables]);

    const createSeasonMutation = useMutation({
        mutationFn: async () => {
            const season = await base44.entities.DomesticCupSeason.create({
                cup_id: cupId,
                year: seasonData.year,
                number_of_teams: parseInt(seasonData.number_of_teams) || 0,
                champion_id: null,
                champion_name: null,
                runner_up_id: null,
                runner_up: null,
                final_score: seasonData.final_score || null,
                final_venue: seasonData.final_venue || null,
                top_scorer: seasonData.top_scorer || null,
                notes: seasonData.notes || null
            });

            return season;
        },
        onSuccess: (season) => {
            queryClient.invalidateQueries(['cupSeasons']);
            navigate(createPageUrl(`DomesticCupSeasonDetail?id=${season.id}`));
        },
    });

    if (!cup) {
        return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full" /></div>;
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <PageHeader
                title={`Add ${cup.name} Season`}
                subtitle="Create a new cup season - use the draw system to add matches"
                breadcrumbs={[
                    { label: 'Nations', href: 'Nations' },
                    ...(nation ? [{ label: nation.name, href: `NationDetail?id=${nation.id}` }] : []),
                    { label: cup.name, href: `DomesticCupDetail?id=${cupId}` },
                    { label: 'Add Season' }
                ]}
            />

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle>Season Details</CardTitle>
                        <p className="text-sm text-slate-500 mt-2">
                            Create the season first, then use the draw system on the season detail page to add participating clubs round-by-round.
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label>Year *</Label>
                                <Select value={seasonData.year} onValueChange={(v) => setSeasonData({...seasonData, year: v})}>
                                    <SelectTrigger className="mt-1">
                                        <SelectValue placeholder="Select year" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label>Expected Number of Teams (optional)</Label>
                                <Input 
                                    type="number"
                                    value={seasonData.number_of_teams || ''} 
                                    onChange={(e) => setSeasonData({...seasonData, number_of_teams: e.target.value})} 
                                    className="mt-1"
                                    placeholder="e.g., 64"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label>Final Venue (optional)</Label>
                                <Input 
                                    value={seasonData.final_venue} 
                                    onChange={(e) => setSeasonData({...seasonData, final_venue: e.target.value})} 
                                    className="mt-1"
                                    placeholder="e.g., National Stadium"
                                />
                            </div>

                            <div>
                                <Label>Final Score (optional)</Label>
                                <Input 
                                    value={seasonData.final_score} 
                                    onChange={(e) => setSeasonData({...seasonData, final_score: e.target.value})} 
                                    placeholder="e.g., 2-1" 
                                    className="mt-1" 
                                />
                            </div>
                        </div>

                        <div>
                            <Label>Top Scorer (optional)</Label>
                            <Input 
                                value={seasonData.top_scorer} 
                                onChange={(e) => setSeasonData({...seasonData, top_scorer: e.target.value})} 
                                className="mt-1"
                                placeholder="e.g., John Smith - 8 goals"
                            />
                        </div>

                        <div>
                            <Label>Notes (optional)</Label>
                            <Input 
                                value={seasonData.notes} 
                                onChange={(e) => setSeasonData({...seasonData, notes: e.target.value})} 
                                className="mt-1"
                                placeholder="Any additional information about this season"
                            />
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex gap-3">
                                <Trophy className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-blue-800">
                                    <p className="font-semibold mb-1">How the draw system works:</p>
                                    <ol className="list-decimal ml-4 space-y-1">
                                        <li>Create this season with basic details</li>
                                        <li>On the season page, use the <strong>Draw Round</strong> button for each round</li>
                                        <li>The system will show eligible clubs and create seeded matchups</li>
                                        <li>Winners automatically become eligible for the next round's draw</li>
                                        <li>Odd numbers of clubs are handled with automatic byes</li>
                                    </ol>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <Link to={createPageUrl(`DomesticCupDetail?id=${cupId}`)}>
                                <Button variant="outline">Cancel</Button>
                            </Link>
                            <Button 
                                onClick={() => createSeasonMutation.mutate()}
                                disabled={!seasonData.year || createSeasonMutation.isPending}
                                className="bg-emerald-600 hover:bg-emerald-700"
                            >
                                {createSeasonMutation.isPending ? 'Creating...' : 'Create Season'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}