import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Plus, Trophy, Edit2, Trash2, ChevronRight, Star, Calendar } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function CompetitionDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    const compId = urlParams.get('id');
    const queryClient = useQueryClient();
    
    const [isAddSeasonOpen, setIsAddSeasonOpen] = useState(false);
    const [seasonFormData, setSeasonFormData] = useState({
        year: '', champion_name: '', champion_nation: '', runner_up: '', runner_up_nation: '',
        final_score: '', final_venue: '', top_scorer: '', notes: ''
    });
    const [editingSeason, setEditingSeason] = useState(null);

    const { data: competition } = useQuery({
        queryKey: ['competition', compId],
        queryFn: async () => {
            const comps = await base44.entities.ContinentalCompetition.filter({ id: compId });
            return comps[0];
        },
        enabled: !!compId,
    });

    const { data: seasons = [] } = useQuery({
        queryKey: ['competitionSeasons', compId],
        queryFn: () => base44.entities.ContinentalSeason.filter({ competition_id: compId }, '-year'),
    });

    const { data: nations = [] } = useQuery({
        queryKey: ['nations'],
        queryFn: () => base44.entities.Nation.list('name'),
    });

    const getNationFlag = (nationName) => {
        const nation = nations.find(n => n.name?.toLowerCase() === nationName?.toLowerCase());
        return nation?.flag_url;
    };

    const createSeasonMutation = useMutation({
        mutationFn: (data) => base44.entities.ContinentalSeason.create({ ...data, competition_id: compId }),
        onSuccess: () => {
            queryClient.invalidateQueries(['competitionSeasons']);
            setIsAddSeasonOpen(false);
            resetSeasonForm();
        },
    });

    const updateSeasonMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.ContinentalSeason.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['competitionSeasons']);
            setEditingSeason(null);
            resetSeasonForm();
        },
    });

    const deleteSeasonMutation = useMutation({
        mutationFn: (id) => base44.entities.ContinentalSeason.delete(id),
        onSuccess: () => queryClient.invalidateQueries(['competitionSeasons']),
    });

    const resetSeasonForm = () => {
        setSeasonFormData({ year: '', champion_name: '', champion_nation: '', runner_up: '', runner_up_nation: '', final_score: '', final_venue: '', top_scorer: '', notes: '' });
    };

    const updateSeasonField = (field, value) => {
        setSeasonFormData(prev => ({ ...prev, [field]: value }));
    };

    const openEditSeason = (season) => {
        setSeasonFormData(season);
        setEditingSeason(season);
    };

    const handleSeasonSubmit = () => {
        if (editingSeason) {
            updateSeasonMutation.mutate({ id: editingSeason.id, data: seasonFormData });
        } else {
            createSeasonMutation.mutate(seasonFormData);
        }
    };

    if (!competition) {
        return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full" /></div>;
    }

    const seasonFormContent = (
        <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label>Season Year *</Label>
                    <Input value={seasonFormData.year || ''} onChange={(e) => updateSeasonField('year', e.target.value)} placeholder="e.g., 2023-24" className="mt-1" />
                </div>
                <div>
                    <Label>Final Score</Label>
                    <Input value={seasonFormData.final_score || ''} onChange={(e) => updateSeasonField('final_score', e.target.value)} placeholder="e.g., 2-1" className="mt-1" />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label>Champion</Label>
                    <Input value={seasonFormData.champion_name || ''} onChange={(e) => updateSeasonField('champion_name', e.target.value)} placeholder="Winning club" className="mt-1" />
                </div>
                <div>
                    <Label>Champion Nation</Label>
                    <Input value={seasonFormData.champion_nation || ''} onChange={(e) => updateSeasonField('champion_nation', e.target.value)} className="mt-1" />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label>Runner-up</Label>
                    <Input value={seasonFormData.runner_up || ''} onChange={(e) => updateSeasonField('runner_up', e.target.value)} className="mt-1" />
                </div>
                <div>
                    <Label>Runner-up Nation</Label>
                    <Input value={seasonFormData.runner_up_nation || ''} onChange={(e) => updateSeasonField('runner_up_nation', e.target.value)} className="mt-1" />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label>Final Venue</Label>
                    <Input value={seasonFormData.final_venue || ''} onChange={(e) => updateSeasonField('final_venue', e.target.value)} className="mt-1" />
                </div>
                <div>
                    <Label>Top Scorer</Label>
                    <Input value={seasonFormData.top_scorer || ''} onChange={(e) => updateSeasonField('top_scorer', e.target.value)} placeholder="e.g., John Smith (10 goals)" className="mt-1" />
                </div>
            </div>
            <div>
                <Label>Notes</Label>
                <Textarea value={seasonFormData.notes || ''} onChange={(e) => updateSeasonField('notes', e.target.value)} rows={3} className="mt-1" />
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
            <div className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${competition.primary_color || '#1e40af'}, ${competition.secondary_color || '#fbbf24'})` }}>
                <div className="absolute inset-0 bg-black/20" />
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
                    <nav className="flex items-center gap-2 text-sm text-white/70 mb-4">
                        <Link to={createPageUrl('Home')} className="hover:text-white">Volaria</Link>
                        <ChevronRight className="w-4 h-4" />
                        <Link to={createPageUrl('ContinentalCompetitions')} className="hover:text-white">Continental Competitions</Link>
                        <ChevronRight className="w-4 h-4" />
                        <span className="text-white">{competition.short_name || competition.name}</span>
                    </nav>
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 md:w-28 md:h-28 bg-white/20 rounded-2xl flex items-center justify-center">
                            {competition.tier === 1 ? <Star className="w-12 h-12 text-white" /> : <Trophy className="w-12 h-12 text-white" />}
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-5xl font-bold text-white">{competition.name}</h1>
                            {competition.description && <p className="mt-2 text-white/80 max-w-2xl">{competition.description}</p>}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {competition.founded_year && <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center"><Calendar className="w-6 h-6 text-emerald-500 mx-auto mb-2" /><div className="text-2xl font-bold">{competition.founded_year}</div><div className="text-xs text-slate-500">Founded</div></CardContent></Card>}
                    <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center"><Trophy className="w-6 h-6 text-amber-500 mx-auto mb-2" /><div className="text-2xl font-bold">{seasons.length}</div><div className="text-xs text-slate-500">Editions</div></CardContent></Card>
                    {competition.number_of_teams && <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center"><div className="text-2xl font-bold">{competition.number_of_teams}</div><div className="text-xs text-slate-500">Teams</div></CardContent></Card>}
                    {competition.current_champion && <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center"><div className="text-lg font-bold text-emerald-600 truncate">{competition.current_champion}</div><div className="text-xs text-slate-500">Champion</div></CardContent></Card>}
                </div>

                {/* History */}
                {competition.history && (
                    <Card className="border-0 shadow-sm mb-8">
                        <CardHeader><CardTitle>Competition History</CardTitle></CardHeader>
                        <CardContent><p className="text-slate-600 whitespace-pre-line">{competition.history}</p></CardContent>
                    </Card>
                )}

                {/* Winners Table */}
                <Card className="border-0 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Roll of Honour</CardTitle>
                        <Dialog open={isAddSeasonOpen} onOpenChange={setIsAddSeasonOpen}>
                            <DialogTrigger asChild>
                                <Button className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-2" /> Add Season</Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-xl">
                                <DialogHeader><DialogTitle>Add Season</DialogTitle></DialogHeader>
                                {seasonFormContent}
                            </DialogContent>
                        </Dialog>
                    </CardHeader>
                    <CardContent>
                        {seasons.length === 0 ? (
                            <div className="text-center py-12 text-slate-500">
                                <p className="mb-2">No seasons recorded yet.</p>
                                <p className="text-sm">Add a season above, then click on it to add knockout matches (Round of 32, Quarter-finals, etc.)</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Season</TableHead>
                                        <TableHead>Champion</TableHead>
                                        <TableHead className="hidden md:table-cell">Nation</TableHead>
                                        <TableHead>Runner-up</TableHead>
                                        <TableHead className="hidden md:table-cell">Score</TableHead>
                                        <TableHead className="hidden lg:table-cell">Venue</TableHead>
                                        <TableHead className="w-20"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {seasons.map(season => (
                                        <TableRow key={season.id} className="hover:bg-slate-50">
                                            <TableCell className="font-medium">
                                                <Link to={createPageUrl(`ContinentalSeasonDetail?id=${season.id}`)} className="hover:text-emerald-600 hover:underline">
                                                    {season.year}
                                                </Link>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {getNationFlag(season.champion_nation) && (
                                                        <img src={getNationFlag(season.champion_nation)} alt="" className="w-5 h-3 object-contain" />
                                                    )}
                                                    <span className="font-semibold text-emerald-600">{season.champion_name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell text-slate-500">{season.champion_nation}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {getNationFlag(season.runner_up_nation) && (
                                                        <img src={getNationFlag(season.runner_up_nation)} alt="" className="w-5 h-3 object-contain" />
                                                    )}
                                                    <span>{season.runner_up}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell">{season.final_score}</TableCell>
                                            <TableCell className="hidden lg:table-cell text-slate-500">{season.final_venue}</TableCell>
                                            <TableCell>
                                                <div className="flex gap-1">
                                                    <Link to={createPageUrl(`ContinentalSeasonDetail?id=${season.id}`)}>
                                                        <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700">Matches</Button>
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
                                    ))}
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