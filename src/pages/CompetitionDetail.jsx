import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Trophy, Plus, Edit2, Trash2, ChevronRight, Star, Calendar, Users } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function CompetitionDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    const compId = urlParams.get('id');
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [isEditingComp, setIsEditingComp] = useState(false);
    const [editCompData, setEditCompData] = useState(null);
    const [isAddingSeason, setIsAddingSeason] = useState(false);
    const [seasonData, setSeasonData] = useState(null);

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

    const updateCompMutation = useMutation({
        mutationFn: (data) => base44.entities.ContinentalCompetition.update(compId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['competition', compId] });
            setIsEditingComp(false);
        },
    });

    const deleteCompMutation = useMutation({
        mutationFn: () => base44.entities.ContinentalCompetition.delete(compId),
        onSuccess: () => {
            navigate(createPageUrl('ContinentalCompetitions'));
        },
    });

    const saveSeasonMutation = useMutation({
        mutationFn: async (data) => {
            if (data.id) {
                return base44.entities.ContinentalSeason.update(data.id, data);
            }
            return base44.entities.ContinentalSeason.create({ ...data, competition_id: compId });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['competitionSeasons', compId] });
            setIsAddingSeason(false);
            setSeasonData(null);
        },
    });

    const deleteSeasonMutation = useMutation({
        mutationFn: (id) => base44.entities.ContinentalSeason.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['competitionSeasons', compId] });
        },
    });

    if (!competition) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Hero Header */}
            <div 
                className="relative overflow-hidden"
                style={{ backgroundColor: competition.primary_color || '#fbbf24' }}
            >
                <div className="absolute inset-0 bg-black/20" />
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
                    <nav className="flex items-center gap-2 text-sm text-white/70 mb-6">
                        <Link to={createPageUrl('Home')} className="hover:text-white">Volaria</Link>
                        <ChevronRight className="w-4 h-4" />
                        <Link to={createPageUrl('ContinentalCompetitions')} className="hover:text-white">Competitions</Link>
                        <ChevronRight className="w-4 h-4" />
                        <span className="text-white">{competition.short_name || competition.name}</span>
                    </nav>
                    
                    <div className="flex items-center gap-6">
                        {competition.logo_url ? (
                            <img src={competition.logo_url} alt={competition.name} className="w-24 h-24 object-contain" />
                        ) : (
                            <div className="w-24 h-24 bg-white/20 rounded-2xl flex items-center justify-center">
                                {competition.tier === 1 ? (
                                    <Star className="w-12 h-12 text-white" />
                                ) : (
                                    <Trophy className="w-12 h-12 text-white" />
                                )}
                            </div>
                        )}
                        <div className="flex-1">
                            <h1 className="text-4xl md:text-5xl font-bold text-white">{competition.name}</h1>
                            {competition.description && (
                                <p className="mt-2 text-white/80 max-w-2xl">{competition.description}</p>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Button 
                                variant="outline" 
                                className="border-white/30 text-white hover:bg-white/10"
                                onClick={() => {
                                    setEditCompData(competition);
                                    setIsEditingComp(true);
                                }}
                            >
                                <Edit2 className="w-4 h-4 mr-2" />
                                Edit
                            </Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="outline" className="border-red-300/50 text-red-200 hover:bg-red-500/20">
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Competition?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will permanently delete {competition.name} and all its season history.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => deleteCompMutation.mutate()} className="bg-red-600">
                                            Delete
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-4 text-center">
                            <Trophy className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                            <div className="text-2xl font-bold">{seasons.length}</div>
                            <div className="text-xs text-slate-500">Seasons</div>
                        </CardContent>
                    </Card>
                    {competition.founded_year && (
                        <Card className="border-0 shadow-sm">
                            <CardContent className="p-4 text-center">
                                <Calendar className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                                <div className="text-2xl font-bold">{competition.founded_year}</div>
                                <div className="text-xs text-slate-500">Founded</div>
                            </CardContent>
                        </Card>
                    )}
                    {competition.current_champion && (
                        <Card className="border-0 shadow-sm">
                            <CardContent className="p-4 text-center">
                                <Star className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                                <div className="text-lg font-bold truncate">{competition.current_champion}</div>
                                <div className="text-xs text-slate-500">Champion</div>
                            </CardContent>
                        </Card>
                    )}
                    {competition.number_of_teams && (
                        <Card className="border-0 shadow-sm">
                            <CardContent className="p-4 text-center">
                                <Users className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                                <div className="text-2xl font-bold">{competition.number_of_teams}</div>
                                <div className="text-xs text-slate-500">Teams</div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Winners History */}
                <Card className="border-0 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Winners History</CardTitle>
                        <Button 
                            onClick={() => {
                                setSeasonData({ year: '', champion_name: '', champion_nation: '', runner_up: '', final_score: '' });
                                setIsAddingSeason(true);
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Season
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {seasons.length === 0 ? (
                            <div className="text-center py-12">
                                <Trophy className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                <p className="text-slate-500">No seasons recorded yet</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Season</TableHead>
                                        <TableHead>Champion</TableHead>
                                        <TableHead>Nation</TableHead>
                                        <TableHead>Runner-up</TableHead>
                                        <TableHead>Final</TableHead>
                                        <TableHead className="w-20"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {seasons.map(season => (
                                        <TableRow key={season.id}>
                                            <TableCell className="font-bold">{season.year}</TableCell>
                                            <TableCell className="font-medium text-emerald-600">
                                                🏆 {season.champion_name}
                                            </TableCell>
                                            <TableCell>{season.champion_nation}</TableCell>
                                            <TableCell>{season.runner_up}</TableCell>
                                            <TableCell>{season.final_score}</TableCell>
                                            <TableCell>
                                                <div className="flex gap-1">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon"
                                                        onClick={() => {
                                                            setSeasonData(season);
                                                            setIsAddingSeason(true);
                                                        }}
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </Button>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon"
                                                        className="text-red-500 hover:text-red-600"
                                                        onClick={() => deleteSeasonMutation.mutate(season.id)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                {/* History */}
                {competition.history && (
                    <Card className="border-0 shadow-sm mt-8">
                        <CardHeader>
                            <CardTitle>Competition History</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-slate-600 whitespace-pre-line">{competition.history}</p>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Edit Competition Dialog */}
            <Dialog open={isEditingComp} onOpenChange={setIsEditingComp}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Edit Competition</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Name</Label>
                                <Input
                                    value={editCompData?.name || ''}
                                    onChange={(e) => setEditCompData({...editCompData, name: e.target.value})}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label>Short Name</Label>
                                <Input
                                    value={editCompData?.short_name || ''}
                                    onChange={(e) => setEditCompData({...editCompData, short_name: e.target.value})}
                                    className="mt-1"
                                />
                            </div>
                        </div>
                        <div>
                            <Label>Description</Label>
                            <Textarea
                                value={editCompData?.description || ''}
                                onChange={(e) => setEditCompData({...editCompData, description: e.target.value})}
                                rows={2}
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label>History</Label>
                            <Textarea
                                value={editCompData?.history || ''}
                                onChange={(e) => setEditCompData({...editCompData, history: e.target.value})}
                                rows={4}
                                className="mt-1"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Current Champion</Label>
                                <Input
                                    value={editCompData?.current_champion || ''}
                                    onChange={(e) => setEditCompData({...editCompData, current_champion: e.target.value})}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label>Most Titles Club</Label>
                                <Input
                                    value={editCompData?.most_titles_club || ''}
                                    onChange={(e) => setEditCompData({...editCompData, most_titles_club: e.target.value})}
                                    className="mt-1"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={() => setIsEditingComp(false)}>Cancel</Button>
                            <Button 
                                onClick={() => updateCompMutation.mutate(editCompData)}
                                className="bg-emerald-600 hover:bg-emerald-700"
                            >
                                Save
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Add/Edit Season Dialog */}
            <Dialog open={isAddingSeason} onOpenChange={setIsAddingSeason}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{seasonData?.id ? 'Edit Season' : 'Add Season'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Season Year</Label>
                                <Input
                                    value={seasonData?.year || ''}
                                    onChange={(e) => setSeasonData({...seasonData, year: e.target.value})}
                                    placeholder="e.g., 2023-24"
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label>Final Score</Label>
                                <Input
                                    value={seasonData?.final_score || ''}
                                    onChange={(e) => setSeasonData({...seasonData, final_score: e.target.value})}
                                    placeholder="e.g., 2-1"
                                    className="mt-1"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Champion</Label>
                                <Input
                                    value={seasonData?.champion_name || ''}
                                    onChange={(e) => setSeasonData({...seasonData, champion_name: e.target.value})}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label>Champion Nation</Label>
                                <Input
                                    value={seasonData?.champion_nation || ''}
                                    onChange={(e) => setSeasonData({...seasonData, champion_nation: e.target.value})}
                                    className="mt-1"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Runner-up</Label>
                                <Input
                                    value={seasonData?.runner_up || ''}
                                    onChange={(e) => setSeasonData({...seasonData, runner_up: e.target.value})}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label>Runner-up Nation</Label>
                                <Input
                                    value={seasonData?.runner_up_nation || ''}
                                    onChange={(e) => setSeasonData({...seasonData, runner_up_nation: e.target.value})}
                                    className="mt-1"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Final Venue</Label>
                                <Input
                                    value={seasonData?.final_venue || ''}
                                    onChange={(e) => setSeasonData({...seasonData, final_venue: e.target.value})}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label>Top Scorer</Label>
                                <Input
                                    value={seasonData?.top_scorer || ''}
                                    onChange={(e) => setSeasonData({...seasonData, top_scorer: e.target.value})}
                                    className="mt-1"
                                />
                            </div>
                        </div>
                        <div>
                            <Label>Notes</Label>
                            <Textarea
                                value={seasonData?.notes || ''}
                                onChange={(e) => setSeasonData({...seasonData, notes: e.target.value})}
                                rows={2}
                                className="mt-1"
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={() => setIsAddingSeason(false)}>Cancel</Button>
                            <Button 
                                onClick={() => saveSeasonMutation.mutate(seasonData)}
                                className="bg-emerald-600 hover:bg-emerald-700"
                            >
                                Save
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}