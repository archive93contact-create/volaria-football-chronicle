import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Plus, Trophy, Edit2, Trash2, Globe, Star } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import PageHeader from '@/components/common/PageHeader';

export default function ContinentalCompetitions() {
    const queryClient = useQueryClient();
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editingComp, setEditingComp] = useState(null);
    const [formData, setFormData] = useState({
        name: '', short_name: '', description: '', history: '', 
        founded_year: '', format: '', number_of_teams: '',
        current_champion: '', most_titles_club: '', most_titles_count: '',
        primary_color: '#1e40af', secondary_color: '#fbbf24', tier: 1
    });

    const { data: competitions = [], isLoading } = useQuery({
        queryKey: ['continentalCompetitions'],
        queryFn: () => base44.entities.ContinentalCompetition.list('tier'),
    });

    const { data: seasons = [] } = useQuery({
        queryKey: ['continentalSeasons'],
        queryFn: () => base44.entities.ContinentalSeason.list('-year'),
    });

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.ContinentalCompetition.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['continentalCompetitions']);
            setIsAddOpen(false);
            resetForm();
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.ContinentalCompetition.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['continentalCompetitions']);
            setEditingComp(null);
            resetForm();
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.ContinentalCompetition.delete(id),
        onSuccess: () => queryClient.invalidateQueries(['continentalCompetitions']),
    });

    const resetForm = () => {
        setFormData({
            name: '', short_name: '', description: '', history: '',
            founded_year: '', format: '', number_of_teams: '',
            current_champion: '', most_titles_club: '', most_titles_count: '',
            primary_color: '#1e40af', secondary_color: '#fbbf24', tier: 1
        });
    };

    const openEdit = (comp) => {
        setFormData(comp);
        setEditingComp(comp);
    };

    const handleSubmit = () => {
        const submitData = {
            ...formData,
            founded_year: formData.founded_year ? parseInt(formData.founded_year) : null,
            number_of_teams: formData.number_of_teams ? parseInt(formData.number_of_teams) : null,
            most_titles_count: formData.most_titles_count ? parseInt(formData.most_titles_count) : null,
            tier: parseInt(formData.tier) || 1,
        };
        if (editingComp) {
            updateMutation.mutate({ id: editingComp.id, data: submitData });
        } else {
            createMutation.mutate(submitData);
        }
    };

    const CompForm = () => (
        <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label>Competition Name *</Label>
                    <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="e.g., Volaria Champions Cup" className="mt-1" />
                </div>
                <div>
                    <Label>Short Name</Label>
                    <Input value={formData.short_name} onChange={(e) => setFormData({...formData, short_name: e.target.value})} placeholder="e.g., VCC" className="mt-1" />
                </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
                <div>
                    <Label>Founded Year</Label>
                    <Input type="number" value={formData.founded_year} onChange={(e) => setFormData({...formData, founded_year: e.target.value})} className="mt-1" />
                </div>
                <div>
                    <Label>Number of Teams</Label>
                    <Input type="number" value={formData.number_of_teams} onChange={(e) => setFormData({...formData, number_of_teams: e.target.value})} className="mt-1" />
                </div>
                <div>
                    <Label>Tier (1=Top, 2=Secondary)</Label>
                    <Input type="number" min="1" max="3" value={formData.tier} onChange={(e) => setFormData({...formData, tier: e.target.value})} className="mt-1" />
                </div>
            </div>
            <div>
                <Label>Format</Label>
                <Input value={formData.format} onChange={(e) => setFormData({...formData, format: e.target.value})} placeholder="e.g., Group stage + Knockout rounds" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label>Current Champion</Label>
                    <Input value={formData.current_champion} onChange={(e) => setFormData({...formData, current_champion: e.target.value})} className="mt-1" />
                </div>
                <div>
                    <Label>Most Titles (Club)</Label>
                    <Input value={formData.most_titles_club} onChange={(e) => setFormData({...formData, most_titles_club: e.target.value})} className="mt-1" />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label>Primary Color</Label>
                    <div className="flex gap-2 mt-1">
                        <input type="color" value={formData.primary_color} onChange={(e) => setFormData({...formData, primary_color: e.target.value})} className="w-12 h-10 rounded cursor-pointer" />
                        <Input value={formData.primary_color} onChange={(e) => setFormData({...formData, primary_color: e.target.value})} className="flex-1" />
                    </div>
                </div>
                <div>
                    <Label>Secondary Color</Label>
                    <div className="flex gap-2 mt-1">
                        <input type="color" value={formData.secondary_color} onChange={(e) => setFormData({...formData, secondary_color: e.target.value})} className="w-12 h-10 rounded cursor-pointer" />
                        <Input value={formData.secondary_color} onChange={(e) => setFormData({...formData, secondary_color: e.target.value})} className="flex-1" />
                    </div>
                </div>
            </div>
            <div>
                <Label>Description</Label>
                <Textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={3} className="mt-1" />
            </div>
            <div>
                <Label>History</Label>
                <Textarea value={formData.history} onChange={(e) => setFormData({...formData, history: e.target.value})} rows={4} className="mt-1" />
            </div>
            <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => { setIsAddOpen(false); setEditingComp(null); resetForm(); }}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={!formData.name} className="bg-emerald-600 hover:bg-emerald-700">
                    {editingComp ? 'Save Changes' : 'Create Competition'}
                </Button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50">
            <PageHeader 
                title="Continental Competitions"
                subtitle="The premier club competitions across Volaria"
                breadcrumbs={[{ label: 'Continental Competitions' }]}
            >
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-emerald-600 hover:bg-emerald-700 mt-4">
                            <Plus className="w-4 h-4 mr-2" /> Add Competition
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader><DialogTitle>Add Continental Competition</DialogTitle></DialogHeader>
                        <CompForm />
                    </DialogContent>
                </Dialog>
            </PageHeader>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {competitions.length === 0 ? (
                    <Card className="border-dashed border-2 border-slate-300">
                        <CardContent className="flex flex-col items-center justify-center py-16">
                            <Globe className="w-16 h-16 text-slate-300 mb-4" />
                            <h3 className="text-xl font-semibold text-slate-700 mb-2">No Competitions Yet</h3>
                            <p className="text-slate-500 mb-6">Add your first continental competition like VCC or CCC</p>
                            <Button onClick={() => setIsAddOpen(true)}><Plus className="w-4 h-4 mr-2" /> Add Competition</Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {competitions.map(comp => {
                            const compSeasons = seasons.filter(s => s.competition_id === comp.id);
                            return (
                                <Card key={comp.id} className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow">
                                    <div className="h-3" style={{ background: `linear-gradient(90deg, ${comp.primary_color || '#1e40af'}, ${comp.secondary_color || '#fbbf24'})` }} />
                                    <CardHeader className="pb-2">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ backgroundColor: comp.primary_color || '#1e40af' }}>
                                                    {comp.tier === 1 ? <Star className="w-7 h-7 text-white" /> : <Trophy className="w-7 h-7 text-white" />}
                                                </div>
                                                <div>
                                                    <CardTitle className="text-xl">{comp.name}</CardTitle>
                                                    {comp.short_name && <p className="text-sm text-slate-500 font-medium">{comp.short_name}</p>}
                                                </div>
                                            </div>
                                            <div className="flex gap-1">
                                                <Button variant="ghost" size="icon" onClick={() => openEdit(comp)}><Edit2 className="w-4 h-4" /></Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-red-500"><Trash2 className="w-4 h-4" /></Button></AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Delete {comp.name}?</AlertDialogTitle>
                                                            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => deleteMutation.mutate(comp.id)} className="bg-red-600">Delete</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        {comp.description && <p className="text-slate-600 text-sm mb-4">{comp.description}</p>}
                                        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                                            {comp.founded_year && <div><span className="text-slate-500">Founded:</span> <span className="font-medium">{comp.founded_year}</span></div>}
                                            {comp.number_of_teams && <div><span className="text-slate-500">Teams:</span> <span className="font-medium">{comp.number_of_teams}</span></div>}
                                            {comp.current_champion && <div><span className="text-slate-500">Champion:</span> <span className="font-medium text-emerald-600">{comp.current_champion}</span></div>}
                                            {comp.most_titles_club && <div><span className="text-slate-500">Most Titles:</span> <span className="font-medium">{comp.most_titles_club}</span></div>}
                                        </div>
                                        <div className="flex gap-2">
                                            <Link to={createPageUrl(`CompetitionDetail?id=${comp.id}`)} className="flex-1">
                                                <Button variant="outline" className="w-full">View History</Button>
                                            </Link>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Edit Dialog */}
            <Dialog open={!!editingComp} onOpenChange={(open) => { if (!open) { setEditingComp(null); resetForm(); } }}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>Edit Competition</DialogTitle></DialogHeader>
                    <CompForm />
                </DialogContent>
            </Dialog>
        </div>
    );
}