import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Plus, Trophy, Edit2, Trash2, ChevronRight, Award, Calendar } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import PageHeader from '@/components/common/PageHeader';
import AdminOnly from '@/components/common/AdminOnly';

export default function DomesticCups() {
    const urlParams = new URLSearchParams(window.location.search);
    const nationId = urlParams.get('nation_id');
    const queryClient = useQueryClient();

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editingCup, setEditingCup] = useState(null);
    const [formData, setFormData] = useState({
        name: '', short_name: '', description: '', history: '', founded_year: '',
        format: '', eligible_tiers: '', primary_color: '#1e40af', secondary_color: '#fbbf24',
        is_main_cup: true
    });

    const { data: nations = [] } = useQuery({
        queryKey: ['nations'],
        queryFn: () => base44.entities.Nation.list('name'),
    });

    const { data: cups = [] } = useQuery({
        queryKey: ['domesticCups', nationId],
        queryFn: () => nationId 
            ? base44.entities.DomesticCup.filter({ nation_id: nationId })
            : base44.entities.DomesticCup.list(),
    });

    const { data: cupSeasons = [] } = useQuery({
        queryKey: ['allCupSeasons'],
        queryFn: () => base44.entities.DomesticCupSeason.list(),
    });

    const nation = nations.find(n => n.id === nationId);

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.DomesticCup.create({ ...data, nation_id: nationId || data.nation_id }),
        onSuccess: () => {
            queryClient.invalidateQueries(['domesticCups']);
            setIsAddOpen(false);
            resetForm();
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.DomesticCup.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['domesticCups']);
            setEditingCup(null);
            resetForm();
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.DomesticCup.delete(id),
        onSuccess: () => queryClient.invalidateQueries(['domesticCups']),
    });

    const resetForm = () => {
        setFormData({
            name: '', short_name: '', description: '', history: '', founded_year: '',
            format: '', eligible_tiers: '', primary_color: '#1e40af', secondary_color: '#fbbf24',
            is_main_cup: true
        });
    };

    const openEdit = (cup) => {
        setFormData(cup);
        setEditingCup(cup);
    };

    const handleSubmit = () => {
        const data = {
            ...formData,
            founded_year: formData.founded_year ? parseInt(formData.founded_year) : null,
        };
        if (editingCup) {
            updateMutation.mutate({ id: editingCup.id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    const formContent = (
        <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label>Cup Name *</Label>
                    <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="e.g., FA Cup" className="mt-1" />
                </div>
                <div>
                    <Label>Short Name</Label>
                    <Input value={formData.short_name || ''} onChange={(e) => setFormData({...formData, short_name: e.target.value})} placeholder="e.g., FAC" className="mt-1" />
                </div>
            </div>
            {!nationId && (
                <div>
                    <Label>Nation *</Label>
                    <Select value={formData.nation_id || ''} onValueChange={(v) => setFormData({...formData, nation_id: v})}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select nation" /></SelectTrigger>
                        <SelectContent>
                            {nations.map(n => <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            )}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label>Founded Year</Label>
                    <Input type="number" value={formData.founded_year || ''} onChange={(e) => setFormData({...formData, founded_year: e.target.value})} className="mt-1" />
                </div>
                <div>
                    <Label>Eligible Tiers</Label>
                    <Input value={formData.eligible_tiers || ''} onChange={(e) => setFormData({...formData, eligible_tiers: e.target.value})} placeholder="e.g., 1-4" className="mt-1" />
                </div>
            </div>
            <div>
                <Label>Format</Label>
                <Input value={formData.format || ''} onChange={(e) => setFormData({...formData, format: e.target.value})} placeholder="e.g., Single elimination knockout" className="mt-1" />
            </div>
            
            {/* FA Cup-Style Settings */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                <h4 className="font-semibold text-blue-900 text-sm">Cup Draw Configuration</h4>
                
                <div>
                    <Label className="text-xs">Draw Style</Label>
                    <Select value={formData.draw_style || 'random'} onValueChange={(v) => setFormData({...formData, draw_style: v})}>
                        <SelectTrigger className="mt-1">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="random">Random (any team vs any)</SelectItem>
                            <SelectItem value="seeded">Seeded (higher tiers protected)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center gap-2">
                    <input 
                        type="checkbox" 
                        id="uses_replays"
                        checked={formData.uses_replays || false}
                        onChange={(e) => setFormData({...formData, uses_replays: e.target.checked})}
                        className="rounded"
                    />
                    <Label htmlFor="uses_replays" className="text-xs cursor-pointer">
                        Use replays (drawn matches replay at away ground)
                    </Label>
                </div>

                <div className="flex items-center gap-2">
                    <input 
                        type="checkbox" 
                        id="neutral_venue_final"
                        checked={formData.neutral_venue_final !== false}
                        onChange={(e) => setFormData({...formData, neutral_venue_final: e.target.checked})}
                        className="rounded"
                    />
                    <Label htmlFor="neutral_venue_final" className="text-xs cursor-pointer">
                        Final played at neutral venue
                    </Label>
                </div>

                <div className="flex items-center gap-2">
                    <input 
                        type="checkbox" 
                        id="is_main_cup"
                        checked={formData.is_main_cup !== false}
                        onChange={(e) => setFormData({...formData, is_main_cup: e.target.checked})}
                        className="rounded"
                    />
                    <Label htmlFor="is_main_cup" className="text-xs cursor-pointer">
                        Main cup (stats count towards club records)
                    </Label>
                </div>
            </div>
            <div>
                <Label>Description</Label>
                <Textarea value={formData.description || ''} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={2} className="mt-1" />
            </div>
            <div>
                <Label>History</Label>
                <Textarea value={formData.history || ''} onChange={(e) => setFormData({...formData, history: e.target.value})} rows={3} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label>Primary Color</Label>
                    <div className="flex gap-2 mt-1">
                        <Input type="color" value={formData.primary_color || '#1e40af'} onChange={(e) => setFormData({...formData, primary_color: e.target.value})} className="w-12 h-10 p-1" />
                        <Input value={formData.primary_color || ''} onChange={(e) => setFormData({...formData, primary_color: e.target.value})} className="flex-1" />
                    </div>
                </div>
                <div>
                    <Label>Secondary Color</Label>
                    <div className="flex gap-2 mt-1">
                        <Input type="color" value={formData.secondary_color || '#fbbf24'} onChange={(e) => setFormData({...formData, secondary_color: e.target.value})} className="w-12 h-10 p-1" />
                        <Input value={formData.secondary_color || ''} onChange={(e) => setFormData({...formData, secondary_color: e.target.value})} className="flex-1" />
                    </div>
                </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => { setIsAddOpen(false); setEditingCup(null); resetForm(); }}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={!formData.name || (!nationId && !formData.nation_id)} className="bg-emerald-600 hover:bg-emerald-700">
                    {editingCup ? 'Save Changes' : 'Create Cup'}
                </Button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50">
            <PageHeader
                title={nation ? `${nation.name} - Domestic Cups` : 'Domestic Cups'}
                subtitle="National knockout cup competitions"
                image={nation?.flag_url}
                breadcrumbs={[
                    { label: 'Nations', href: 'Nations' },
                    ...(nation ? [{ label: nation.name, href: `NationDetail?id=${nationId}` }] : []),
                    { label: 'Domestic Cups' }
                ]}
            >
                <AdminOnly>
                    <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-2" /> Add Cup</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-xl">
                            <DialogHeader><DialogTitle>Add Domestic Cup</DialogTitle></DialogHeader>
                            {formContent}
                        </DialogContent>
                    </Dialog>
                </AdminOnly>
            </PageHeader>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Nation filter when viewing all */}
                {!nationId && nations.length > 0 && (
                    <div className="mb-6 flex flex-wrap gap-2">
                        <Link to={createPageUrl('DomesticCups')}>
                            <Button variant={!nationId ? 'default' : 'outline'} size="sm">All Nations</Button>
                        </Link>
                        {nations.filter(n => cups.some(c => c.nation_id === n.id)).map(n => (
                            <Link key={n.id} to={createPageUrl(`DomesticCups?nation_id=${n.id}`)}>
                                <Button variant="outline" size="sm" className="flex items-center gap-2">
                                    {n.flag_url && <img src={n.flag_url} alt="" className="w-4 h-3 object-contain" />}
                                    {n.name}
                                </Button>
                            </Link>
                        ))}
                    </div>
                )}
                
                {cups.length === 0 ? (
                    <Card className="border-dashed border-2 border-slate-300">
                        <CardContent className="flex flex-col items-center justify-center py-16">
                            <Trophy className="w-16 h-16 text-slate-300 mb-4" />
                            <h3 className="text-xl font-semibold text-slate-700 mb-2">No Domestic Cups</h3>
                            <p className="text-slate-500">Add a cup competition to get started</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {cups.map(cup => {
                            const cupNation = nations.find(n => n.id === cup.nation_id);
                            const editions = cupSeasons.filter(s => s.cup_id === cup.id).length;
                            
                            return (
                                <Card key={cup.id} className="overflow-hidden border-0 shadow-sm hover:shadow-lg transition-shadow group">
                                    <div className="h-24 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${cup.primary_color || '#1e40af'}, ${cup.secondary_color || '#fbbf24'})` }}>
                                        <Trophy className="w-12 h-12 text-white/80" />
                                    </div>
                                    <CardContent className="p-5">
                                        <div className="flex items-start justify-between mb-2">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <Link to={createPageUrl(`DomesticCupDetail?id=${cup.id}`)} className="text-xl font-bold text-slate-900 hover:text-emerald-600">
                                                        {cup.name}
                                                    </Link>
                                                    {cup.is_main_cup !== false && (
                                                        <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded">Main</span>
                                                    )}
                                                </div>
                                                {cupNation && !nationId && (
                                                    <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                                                        {cupNation.flag_url && <img src={cupNation.flag_url} alt="" className="w-4 h-3 object-contain" />}
                                                        {cupNation.name}
                                                    </p>
                                                )}
                                            </div>
                                            <AdminOnly>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(cup)}>
                                                    <Edit2 className="w-4 h-4" />
                                                </Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500"><Trash2 className="w-4 h-4" /></Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader><AlertDialogTitle>Delete {cup.name}?</AlertDialogTitle></AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => deleteMutation.mutate(cup.id)} className="bg-red-600">Delete</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </AdminOnly>
                                        </div>
                                        {cup.description && <p className="text-sm text-slate-600 mb-3 line-clamp-2">{cup.description}</p>}
                                        <div className="flex items-center gap-4 text-sm text-slate-500">
                                            {cup.founded_year && (
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-4 h-4" />
                                                    {cup.founded_year}
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1">
                                                <Award className="w-4 h-4" />
                                                {editions} edition{editions !== 1 ? 's' : ''}
                                            </span>
                                        </div>
                                        <div className="mt-4 pt-4 border-t">
                                            <Link to={createPageUrl(`DomesticCupDetail?id=${cup.id}`)}>
                                                <Button className="w-full bg-emerald-600 hover:bg-emerald-700">View Cup</Button>
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
            <Dialog open={!!editingCup} onOpenChange={(open) => { if (!open) { setEditingCup(null); resetForm(); } }}>
                <DialogContent className="max-w-xl">
                    <DialogHeader><DialogTitle>Edit Cup</DialogTitle></DialogHeader>
                    {formContent}
                </DialogContent>
            </Dialog>
        </div>
    );
}