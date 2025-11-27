import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Plus, Trophy, Edit2, Trash2, ChevronRight, Calendar, Award } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import ContinentalNarratives from '@/components/continental/ContinentalNarratives';

export default function DomesticCupDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    const cupId = urlParams.get('id');
    const queryClient = useQueryClient();
    
    const [isAddSeasonOpen, setIsAddSeasonOpen] = useState(false);
    const [seasonFormData, setSeasonFormData] = useState({
        year: '', number_of_teams: '', champion_name: '', runner_up: '',
        final_score: '', final_venue: '', top_scorer: '', notes: ''
    });
    const [editingSeason, setEditingSeason] = useState(null);

    const { data: cup } = useQuery({
        queryKey: ['domesticCup', cupId],
        queryFn: async () => {
            const cups = await base44.entities.DomesticCup.filter({ id: cupId });
            return cups[0];
        },
        enabled: !!cupId,
    });

    const { data: nation } = useQuery({
        queryKey: ['cupNation', cup?.nation_id],
        queryFn: async () => {
            const nations = await base44.entities.Nation.filter({ id: cup.nation_id });
            return nations[0];
        },
        enabled: !!cup?.nation_id,
    });

    const { data: seasons = [] } = useQuery({
        queryKey: ['cupSeasons', cupId],
        queryFn: () => base44.entities.DomesticCupSeason.filter({ cup_id: cupId }, '-year'),
    });

    const { data: clubs = [] } = useQuery({
        queryKey: ['nationClubs', cup?.nation_id],
        queryFn: () => base44.entities.Club.filter({ nation_id: cup.nation_id }),
        enabled: !!cup?.nation_id,
    });

    const createSeasonMutation = useMutation({
        mutationFn: (data) => base44.entities.DomesticCupSeason.create({ ...data, cup_id: cupId }),
        onSuccess: () => {
            queryClient.invalidateQueries(['cupSeasons']);
            setIsAddSeasonOpen(false);
            resetSeasonForm();
        },
    });

    const updateSeasonMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.DomesticCupSeason.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['cupSeasons']);
            setEditingSeason(null);
            resetSeasonForm();
        },
    });

    const deleteSeasonMutation = useMutation({
        mutationFn: (id) => base44.entities.DomesticCupSeason.delete(id),
        onSuccess: () => queryClient.invalidateQueries(['cupSeasons']),
    });

    const resetSeasonForm = () => {
        setSeasonFormData({
            year: '', number_of_teams: '', champion_name: '', runner_up: '',
            final_score: '', final_venue: '', top_scorer: '', notes: ''
        });
    };

    const openEditSeason = (season) => {
        setSeasonFormData(season);
        setEditingSeason(season);
    };

    const handleSeasonSubmit = () => {
        const data = {
            ...seasonFormData,
            number_of_teams: seasonFormData.number_of_teams ? parseInt(seasonFormData.number_of_teams) : null,
        };
        if (editingSeason) {
            updateSeasonMutation.mutate({ id: editingSeason.id, data });
        } else {
            createSeasonMutation.mutate(data);
        }
    };

    if (!cup) {
        return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full" /></div>;
    }

    // Transform seasons for narratives component (same structure as continental)
    const narrativeSeasons = seasons.map(s => ({
        ...s,
        champion_nation: nation?.name
    }));

    const seasonFormContent = (
        <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label>Season Year *</Label>
                    <Input value={seasonFormData.year || ''} onChange={(e) => setSeasonFormData({...seasonFormData, year: e.target.value})} placeholder="e.g., 1878" className="mt-1" />
                </div>
                <div>
                    <Label>Number of Teams</Label>
                    <Input type="number" value={seasonFormData.number_of_teams || ''} onChange={(e) => setSeasonFormData({...seasonFormData, number_of_teams: e.target.value})} className="mt-1" />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label>Champion</Label>
                    <Input value={seasonFormData.champion_name || ''} onChange={(e) => setSeasonFormData({...seasonFormData, champion_name: e.target.value})} placeholder="Winning club" className="mt-1" />
                </div>
                <div>
                    <Label>Runner-up</Label>
                    <Input value={seasonFormData.runner_up || ''} onChange={(e) => setSeasonFormData({...seasonFormData, runner_up: e.target.value})} className="mt-1" />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label>Final Score</Label>
                    <Input value={seasonFormData.final_score || ''} onChange={(e) => setSeasonFormData({...seasonFormData, final_score: e.target.value})} placeholder="e.g., 2-1" className="mt-1" />
                </div>
                <div>
                    <Label>Final Venue</Label>
                    <Input value={seasonFormData.final_venue || ''} onChange={(e) => setSeasonFormData({...seasonFormData, final_venue: e.target.value})} className="mt-1" />
                </div>
            </div>
            <div>
                <Label>Top Scorer</Label>
                <Input value={seasonFormData.top_scorer || ''} onChange={(e) => setSeasonFormData({...seasonFormData, top_scorer: e.target.value})} placeholder="e.g., John Smith (5 goals)" className="mt-1" />
            </div>
            <div>
                <Label>Notes</Label>
                <Textarea value={seasonFormData.notes || ''} onChange={(e) => setSeasonFormData({...seasonFormData, notes: e.target.value})} rows={3} className="mt-1" />
            </div>
            <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => { setIsAddSeasonOpen(false); setEditingSeason(null); resetSeasonForm(); }}>Cancel</Button>
                <Button onClick={handleSeasonSubmit} disabled={!seasonFormData.year} className="bg-emerald-600 hover:bg-emerald-700">
                    {editingSeason ? 'Save Changes' : 'Add Season'}
                </Button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Hero */}
            <div className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${cup.primary_color || '#1e40af'}, ${cup.secondary_color || '#fbbf24'})` }}>
                <div className="absolute inset-0 bg-black/20" />
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
                    <nav className="flex items-center gap-2 text-sm text-white/70 mb-4 flex-wrap">
                        <Link to={createPageUrl('Home')} className="hover:text-white">Volaria</Link>
                        <ChevronRight className="w-4 h-4" />
                        <Link to={createPageUrl('Nations')} className="hover:text-white">Nations</Link>
                        {nation && (
                            <>
                                <ChevronRight className="w-4 h-4" />
                                <Link to={createPageUrl(`NationDetail?id=${nation.id}`)} className="hover:text-white">{nation.name}</Link>
                            </>
                        )}
                        <ChevronRight className="w-4 h-4" />
                        <span className="text-white">{cup.short_name || cup.name}</span>
                    </nav>
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 md:w-28 md:h-28 bg-white/20 rounded-2xl flex items-center justify-center">
                            <Trophy className="w-12 h-12 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-5xl font-bold text-white">{cup.name}</h1>
                            {cup.description && <p className="mt-2 text-white/80 max-w-2xl">{cup.description}</p>}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {cup.founded_year && <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center"><Calendar className="w-6 h-6 text-emerald-500 mx-auto mb-2" /><div className="text-2xl font-bold">{cup.founded_year}</div><div className="text-xs text-slate-500">Founded</div></CardContent></Card>}
                    <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center"><Trophy className="w-6 h-6 text-amber-500 mx-auto mb-2" /><div className="text-2xl font-bold">{seasons.length}</div><div className="text-xs text-slate-500">Editions</div></CardContent></Card>
                    {cup.eligible_tiers && <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center"><div className="text-2xl font-bold">Tier {cup.eligible_tiers}</div><div className="text-xs text-slate-500">Eligible Leagues</div></CardContent></Card>}
                    {cup.current_champion && <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center"><div className="text-lg font-bold text-emerald-600 truncate">{cup.current_champion}</div><div className="text-xs text-slate-500">Champion</div></CardContent></Card>}
                </div>

                {/* Narratives */}
                <ContinentalNarratives competition={cup} seasons={narrativeSeasons} />

                {/* History */}
                {cup.history && (
                    <Card className="border-0 shadow-sm mb-8">
                        <CardHeader><CardTitle>Cup History</CardTitle></CardHeader>
                        <CardContent><p className="text-slate-600 whitespace-pre-line">{cup.history}</p></CardContent>
                    </Card>
                )}

                {/* Winners Table */}
                <Card className="border-0 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Roll of Honour</CardTitle>
                        <div className="flex gap-2">
                            <Link to={createPageUrl(`AddDomesticCupSeason?cup_id=${cupId}`)}>
                                <Button className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-2" /> Add Season with Bracket</Button>
                            </Link>
                            <Dialog open={isAddSeasonOpen} onOpenChange={setIsAddSeasonOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline"><Plus className="w-4 h-4 mr-2" /> Quick Add</Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-xl">
                                    <DialogHeader><DialogTitle>Add Season</DialogTitle></DialogHeader>
                                    {seasonFormContent}
                                </DialogContent>
                            </Dialog>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {seasons.length === 0 ? (
                            <div className="text-center py-12 text-slate-500">
                                <p className="mb-2">No seasons recorded yet.</p>
                                <p className="text-sm">Add a season above, then click on it to add knockout matches.</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Season</TableHead>
                                        <TableHead>Champion</TableHead>
                                        <TableHead>Runner-up</TableHead>
                                        <TableHead className="hidden md:table-cell">Score</TableHead>
                                        <TableHead className="hidden md:table-cell">Teams</TableHead>
                                        <TableHead className="hidden lg:table-cell">Venue</TableHead>
                                        <TableHead className="w-20"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {seasons.map(season => {
                                        const champion = clubs.find(c => c.name?.toLowerCase() === season.champion_name?.toLowerCase());
                                        const runnerUp = clubs.find(c => c.name?.toLowerCase() === season.runner_up?.toLowerCase());
                                        
                                        return (
                                            <TableRow key={season.id} className="hover:bg-slate-50">
                                                <TableCell className="font-medium">
                                                    <Link to={createPageUrl(`DomesticCupSeasonDetail?id=${season.id}`)} className="hover:text-emerald-600 hover:underline">
                                                        {season.year}
                                                    </Link>
                                                </TableCell>
                                                <TableCell>
                                                    {champion ? (
                                                        <Link to={createPageUrl(`ClubDetail?id=${champion.id}`)} className="font-semibold text-emerald-600 hover:underline flex items-center gap-2">
                                                            {champion.logo_url && <img src={champion.logo_url} alt="" className="w-5 h-5 object-contain" />}
                                                            {season.champion_name}
                                                        </Link>
                                                    ) : (
                                                        <span className="font-semibold text-emerald-600">{season.champion_name}</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {runnerUp ? (
                                                        <Link to={createPageUrl(`ClubDetail?id=${runnerUp.id}`)} className="hover:underline flex items-center gap-2">
                                                            {runnerUp.logo_url && <img src={runnerUp.logo_url} alt="" className="w-5 h-5 object-contain" />}
                                                            {season.runner_up}
                                                        </Link>
                                                    ) : (
                                                        <span>{season.runner_up}</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="hidden md:table-cell">{season.final_score}</TableCell>
                                                <TableCell className="hidden md:table-cell">{season.number_of_teams}</TableCell>
                                                <TableCell className="hidden lg:table-cell text-slate-500">{season.final_venue}</TableCell>
                                                <TableCell>
                                                    <div className="flex gap-1">
                                                        <Link to={createPageUrl(`DomesticCupSeasonDetail?id=${season.id}`)}>
                                                            <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700">Bracket</Button>
                                                        </Link>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditSeason(season)}><Edit2 className="w-3 h-3" /></Button>
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-red-500"><Trash2 className="w-3 h-3" /></Button></AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader><AlertDialogTitle>Delete {season.year}?</AlertDialogTitle></AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                    <AlertDialogAction onClick={() => deleteSeasonMutation.mutate(season.id)} className="bg-red-600">Delete</AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Edit Season Dialog */}
            <Dialog open={!!editingSeason} onOpenChange={(open) => { if (!open) { setEditingSeason(null); resetSeasonForm(); } }}>
                <DialogContent className="max-w-xl">
                    <DialogHeader><DialogTitle>Edit Season</DialogTitle></DialogHeader>
                    {seasonFormContent}
                </DialogContent>
            </Dialog>
        </div>
    );
}