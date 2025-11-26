import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Trophy, Plus, Edit2, ChevronRight, Star, Globe } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ContinentalCompetitions() {
    const queryClient = useQueryClient();
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState(null);

    const { data: competitions = [], isLoading } = useQuery({
        queryKey: ['continentalCompetitions'],
        queryFn: () => base44.entities.ContinentalCompetition.list('tier'),
    });

    const { data: seasons = [] } = useQuery({
        queryKey: ['continentalSeasons'],
        queryFn: () => base44.entities.ContinentalSeason.list('-year'),
    });

    const saveMutation = useMutation({
        mutationFn: async (data) => {
            if (data.id) {
                return base44.entities.ContinentalCompetition.update(data.id, data);
            }
            return base44.entities.ContinentalCompetition.create(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['continentalCompetitions'] });
            setIsEditing(false);
            setEditData(null);
        },
    });

    const handleAdd = () => {
        setEditData({
            name: '',
            short_name: '',
            description: '',
            tier: 1,
            primary_color: '#fbbf24'
        });
        setIsEditing(true);
    };

    const handleEdit = (comp) => {
        setEditData(comp);
        setIsEditing(true);
    };

    const getSeasonCount = (compId) => seasons.filter(s => s.competition_id === compId).length;

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1920')] opacity-10 bg-cover bg-center" />
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <nav className="flex items-center gap-2 text-sm text-slate-400 mb-6">
                        <Link to={createPageUrl('Home')} className="hover:text-white">Volaria</Link>
                        <ChevronRight className="w-4 h-4" />
                        <span className="text-white">Continental Competitions</span>
                    </nav>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-4xl md:text-5xl font-bold text-white">Continental Competitions</h1>
                            <p className="mt-3 text-lg text-slate-300">The premier club competitions across Volaria</p>
                        </div>
                        <Button onClick={handleAdd} className="bg-amber-500 hover:bg-amber-600 text-black">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Competition
                        </Button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {isLoading ? (
                    <div className="grid md:grid-cols-2 gap-8">
                        {[1, 2].map(i => (
                            <div key={i} className="h-64 bg-slate-200 rounded-2xl animate-pulse" />
                        ))}
                    </div>
                ) : competitions.length === 0 ? (
                    <Card className="border-dashed border-2">
                        <CardContent className="py-16 text-center">
                            <Trophy className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                            <h3 className="text-xl font-bold mb-2">No Competitions Yet</h3>
                            <p className="text-slate-500 mb-6">Add the VCC and CCC to get started</p>
                            <Button onClick={handleAdd}>
                                <Plus className="w-4 h-4 mr-2" />
                                Add First Competition
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid md:grid-cols-2 gap-8">
                        {competitions.map(comp => (
                            <Link
                                key={comp.id}
                                to={createPageUrl(`CompetitionDetail?id=${comp.id}`)}
                                className="group"
                            >
                                <Card 
                                    className="overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-300 group-hover:-translate-y-2"
                                    style={{ 
                                        background: `linear-gradient(135deg, ${comp.primary_color || '#fbbf24'}20, white)` 
                                    }}
                                >
                                    <CardContent className="p-0">
                                        <div 
                                            className="h-32 flex items-center justify-center"
                                            style={{ backgroundColor: comp.primary_color || '#fbbf24' }}
                                        >
                                            {comp.logo_url ? (
                                                <img src={comp.logo_url} alt={comp.name} className="h-20 object-contain" />
                                            ) : (
                                                <div className="flex items-center gap-3">
                                                    {comp.tier === 1 ? (
                                                        <Star className="w-12 h-12 text-white" />
                                                    ) : (
                                                        <Trophy className="w-12 h-12 text-white" />
                                                    )}
                                                    <span className="text-3xl font-bold text-white">{comp.short_name}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-6">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h2 className="text-2xl font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
                                                        {comp.name}
                                                    </h2>
                                                    <p className="text-slate-500 mt-1">{comp.short_name}</p>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        handleEdit(comp);
                                                    }}
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                            {comp.description && (
                                                <p className="text-slate-600 mt-3 line-clamp-2">{comp.description}</p>
                                            )}
                                            <div className="flex items-center gap-6 mt-4 pt-4 border-t">
                                                {comp.current_champion && (
                                                    <div>
                                                        <p className="text-xs text-slate-500">Current Champion</p>
                                                        <p className="font-semibold text-emerald-600">{comp.current_champion}</p>
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="text-xs text-slate-500">Seasons Recorded</p>
                                                    <p className="font-semibold">{getSeasonCount(comp.id)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}

                {/* Quick Links */}
                <div className="mt-12 grid sm:grid-cols-2 gap-4">
                    <Link to={createPageUrl('CountryRankings')}>
                        <Card className="border-0 shadow-sm hover:shadow-lg transition-all cursor-pointer group">
                            <CardContent className="p-6 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                                    <Globe className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900">Country Rankings & Coefficients</h3>
                                    <p className="text-sm text-slate-500">View nation rankings and qualifying spots</p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-slate-400 ml-auto" />
                            </CardContent>
                        </Card>
                    </Link>
                </div>
            </div>

            {/* Edit Dialog */}
            <Dialog open={isEditing} onOpenChange={setIsEditing}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editData?.id ? 'Edit Competition' : 'Add Competition'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Full Name</Label>
                                <Input
                                    value={editData?.name || ''}
                                    onChange={(e) => setEditData({...editData, name: e.target.value})}
                                    placeholder="e.g., Volaria Champions Cup"
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label>Short Name</Label>
                                <Input
                                    value={editData?.short_name || ''}
                                    onChange={(e) => setEditData({...editData, short_name: e.target.value})}
                                    placeholder="e.g., VCC"
                                    className="mt-1"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Tier</Label>
                                <Select 
                                    value={String(editData?.tier || 1)} 
                                    onValueChange={(v) => setEditData({...editData, tier: parseInt(v)})}
                                >
                                    <SelectTrigger className="mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">Tier 1 (Top)</SelectItem>
                                        <SelectItem value="2">Tier 2 (Secondary)</SelectItem>
                                        <SelectItem value="3">Tier 3</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Primary Color</Label>
                                <div className="flex gap-2 mt-1">
                                    <input
                                        type="color"
                                        value={editData?.primary_color || '#fbbf24'}
                                        onChange={(e) => setEditData({...editData, primary_color: e.target.value})}
                                        className="w-10 h-10 rounded cursor-pointer"
                                    />
                                    <Input
                                        value={editData?.primary_color || ''}
                                        onChange={(e) => setEditData({...editData, primary_color: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>
                        <div>
                            <Label>Description</Label>
                            <Textarea
                                value={editData?.description || ''}
                                onChange={(e) => setEditData({...editData, description: e.target.value})}
                                rows={3}
                                className="mt-1"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Current Champion</Label>
                                <Input
                                    value={editData?.current_champion || ''}
                                    onChange={(e) => setEditData({...editData, current_champion: e.target.value})}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label>Founded Year</Label>
                                <Input
                                    type="number"
                                    value={editData?.founded_year || ''}
                                    onChange={(e) => setEditData({...editData, founded_year: parseInt(e.target.value) || ''})}
                                    className="mt-1"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                            <Button 
                                onClick={() => saveMutation.mutate(editData)}
                                disabled={saveMutation.isPending}
                                className="bg-emerald-600 hover:bg-emerald-700"
                            >
                                {saveMutation.isPending ? 'Saving...' : 'Save'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}