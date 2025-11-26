import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Globe, Plus, Edit2, Trash2, ChevronRight, TrendingUp, TrendingDown, Minus, Trophy } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CountryRankings() {
    const queryClient = useQueryClient();
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState(null);
    const [selectedSeason, setSelectedSeason] = useState('');

    const { data: coefficients = [], isLoading } = useQuery({
        queryKey: ['coefficients'],
        queryFn: () => base44.entities.CountryCoefficient.list('rank'),
    });

    const { data: nations = [] } = useQuery({
        queryKey: ['nations'],
        queryFn: () => base44.entities.Nation.list('name'),
    });

    const { data: competitions = [] } = useQuery({
        queryKey: ['continentalCompetitions'],
        queryFn: () => base44.entities.ContinentalCompetition.list('tier'),
    });

    const saveMutation = useMutation({
        mutationFn: async (data) => {
            const submitData = {
                ...data,
                rank: parseFloat(data.rank) || 0,
                total_points: parseFloat(data.total_points) || 0,
                year_1_points: parseFloat(data.year_1_points) || 0,
                year_2_points: parseFloat(data.year_2_points) || 0,
                year_3_points: parseFloat(data.year_3_points) || 0,
                year_4_points: parseFloat(data.year_4_points) || 0,
                year_5_points: parseFloat(data.year_5_points) || 0,
                vcc_spots: parseInt(data.vcc_spots) || 0,
                ccc_spots: parseInt(data.ccc_spots) || 0,
                previous_rank: parseInt(data.previous_rank) || 0,
            };
            if (data.id) {
                return base44.entities.CountryCoefficient.update(data.id, submitData);
            }
            return base44.entities.CountryCoefficient.create(submitData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['coefficients'] });
            setIsEditing(false);
            setEditData(null);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.CountryCoefficient.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['coefficients'] });
        },
    });

    const handleAdd = () => {
        setEditData({
            nation_id: '',
            nation_name: '',
            rank: coefficients.length + 1,
            total_points: 0,
            year_1_points: 0,
            year_2_points: 0,
            year_3_points: 0,
            year_4_points: 0,
            year_5_points: 0,
            vcc_spots: 0,
            ccc_spots: 0,
            previous_rank: 0,
            season: ''
        });
        setIsEditing(true);
    };

    const handleEdit = (coef) => {
        setEditData(coef);
        setIsEditing(true);
    };

    const handleNationSelect = (nationId) => {
        const nation = nations.find(n => n.id === nationId);
        setEditData({
            ...editData,
            nation_id: nationId,
            nation_name: nation?.name || ''
        });
    };

    const getRankChange = (current, previous) => {
        if (!previous || current === previous) return <Minus className="w-4 h-4 text-slate-400" />;
        if (current < previous) {
            return (
                <span className="flex items-center text-emerald-600">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    +{previous - current}
                </span>
            );
        }
        return (
            <span className="flex items-center text-red-500">
                <TrendingDown className="w-4 h-4 mr-1" />
                -{current - previous}
            </span>
        );
    };

    const seasons = [...new Set(coefficients.filter(c => c.season).map(c => c.season))].sort().reverse();
    const filteredCoefficients = selectedSeason 
        ? coefficients.filter(c => c.season === selectedSeason)
        : coefficients;

    const vccComp = competitions.find(c => c.tier === 1);
    const cccComp = competitions.find(c => c.tier === 2);

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=1920')] opacity-10 bg-cover bg-center" />
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <nav className="flex items-center gap-2 text-sm text-slate-400 mb-6">
                        <Link to={createPageUrl('Home')} className="hover:text-white">Volaria</Link>
                        <ChevronRight className="w-4 h-4" />
                        <span className="text-white">Country Rankings</span>
                    </nav>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-4xl md:text-5xl font-bold text-white">Country Rankings</h1>
                            <p className="mt-3 text-lg text-slate-300">Coefficients & Continental Qualification</p>
                        </div>
                        <Button onClick={handleAdd} className="bg-blue-500 hover:bg-blue-600">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Country
                        </Button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Competition Links */}
                <div className="grid sm:grid-cols-2 gap-4 mb-8">
                    {competitions.slice(0, 2).map(comp => (
                        <Link key={comp.id} to={createPageUrl(`CompetitionDetail?id=${comp.id}`)}>
                            <Card 
                                className="border-0 shadow-sm hover:shadow-lg transition-all cursor-pointer"
                                style={{ borderLeft: `4px solid ${comp.primary_color || '#fbbf24'}` }}
                            >
                                <CardContent className="p-4 flex items-center gap-4">
                                    <Trophy className="w-8 h-8" style={{ color: comp.primary_color || '#fbbf24' }} />
                                    <div>
                                        <h3 className="font-bold">{comp.name}</h3>
                                        <p className="text-sm text-slate-500">{comp.short_name}</p>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-slate-400 ml-auto" />
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>

                {/* Rankings Table */}
                <Card className="border-0 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Globe className="w-5 h-5 text-blue-500" />
                            Country Coefficient Rankings
                        </CardTitle>
                        {seasons.length > 0 && (
                            <Select value={selectedSeason} onValueChange={setSelectedSeason}>
                                <SelectTrigger className="w-40">
                                    <SelectValue placeholder="All Seasons" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={null}>All Seasons</SelectItem>
                                    {seasons.map(s => (
                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="py-12 text-center">
                                <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
                            </div>
                        ) : filteredCoefficients.length === 0 ? (
                            <div className="py-12 text-center">
                                <Globe className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                <p className="text-slate-500 mb-4">No coefficient data yet</p>
                                <Button onClick={handleAdd}>Add First Country</Button>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-50">
                                            <TableHead className="w-16">Rank</TableHead>
                                            <TableHead>Country</TableHead>
                                            <TableHead className="text-center">Y1</TableHead>
                                            <TableHead className="text-center">Y2</TableHead>
                                            <TableHead className="text-center">Y3</TableHead>
                                            <TableHead className="text-center">Y4</TableHead>
                                            <TableHead className="text-center">Y5</TableHead>
                                            <TableHead className="text-center font-bold">Total</TableHead>
                                            <TableHead className="text-center">{vccComp?.short_name || 'VCC'}</TableHead>
                                            <TableHead className="text-center">{cccComp?.short_name || 'CCC'}</TableHead>
                                            <TableHead className="text-center">Change</TableHead>
                                            <TableHead className="w-24"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredCoefficients.map((coef, idx) => {
                                            const nation = nations.find(n => n.id === coef.nation_id);
                                            return (
                                                <TableRow key={coef.id} className={idx < 4 ? 'bg-emerald-50/50' : ''}>
                                                    <TableCell>
                                                        <span className={`font-bold ${idx < 4 ? 'text-emerald-600' : ''}`}>
                                                            {coef.rank}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            {nation?.flag_url && (
                                                                <img src={nation.flag_url} alt="" className="w-6 h-4 object-cover rounded" />
                                                            )}
                                                            <Link 
                                                                to={createPageUrl(`NationDetail?id=${coef.nation_id}`)}
                                                                className="font-medium hover:text-blue-600"
                                                            >
                                                                {coef.nation_name}
                                                            </Link>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center text-sm">{coef.year_1_points || '-'}</TableCell>
                                                    <TableCell className="text-center text-sm">{coef.year_2_points || '-'}</TableCell>
                                                    <TableCell className="text-center text-sm">{coef.year_3_points || '-'}</TableCell>
                                                    <TableCell className="text-center text-sm">{coef.year_4_points || '-'}</TableCell>
                                                    <TableCell className="text-center text-sm">{coef.year_5_points || '-'}</TableCell>
                                                    <TableCell className="text-center font-bold text-lg">
                                                        {coef.total_points?.toFixed(3) || '0.000'}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-700 font-bold text-sm">
                                                            {coef.vcc_spots || 0}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
                                                            {coef.ccc_spots || 0}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {getRankChange(coef.rank, coef.previous_rank)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex gap-1">
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon"
                                                                onClick={() => handleEdit(coef)}
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </Button>
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon"
                                                                className="text-red-500"
                                                                onClick={() => deleteMutation.mutate(coef.id)}
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Legend */}
                <div className="mt-6 flex flex-wrap gap-6 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-emerald-100" />
                        <span>Direct qualification zones</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-700 font-bold text-xs">3</span>
                        <span>{vccComp?.short_name || 'VCC'} spots</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs">2</span>
                        <span>{cccComp?.short_name || 'CCC'} spots</span>
                    </div>
                </div>
            </div>

            {/* Edit Dialog */}
            <Dialog open={isEditing} onOpenChange={setIsEditing}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editData?.id ? 'Edit Country Coefficient' : 'Add Country Coefficient'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <Label>Country</Label>
                                <Select 
                                    value={editData?.nation_id || ''} 
                                    onValueChange={handleNationSelect}
                                >
                                    <SelectTrigger className="mt-1">
                                        <SelectValue placeholder="Select country" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {nations.map(n => (
                                            <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Rank</Label>
                                <Input
                                    type="number"
                                    value={editData?.rank || ''}
                                    onChange={(e) => setEditData({...editData, rank: e.target.value})}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label>Season</Label>
                                <Input
                                    value={editData?.season || ''}
                                    onChange={(e) => setEditData({...editData, season: e.target.value})}
                                    placeholder="e.g., 2023-24"
                                    className="mt-1"
                                />
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-5 gap-4">
                            <div>
                                <Label>Year 1 Pts</Label>
                                <Input
                                    type="number"
                                    step="0.001"
                                    value={editData?.year_1_points || ''}
                                    onChange={(e) => setEditData({...editData, year_1_points: e.target.value})}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label>Year 2 Pts</Label>
                                <Input
                                    type="number"
                                    step="0.001"
                                    value={editData?.year_2_points || ''}
                                    onChange={(e) => setEditData({...editData, year_2_points: e.target.value})}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label>Year 3 Pts</Label>
                                <Input
                                    type="number"
                                    step="0.001"
                                    value={editData?.year_3_points || ''}
                                    onChange={(e) => setEditData({...editData, year_3_points: e.target.value})}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label>Year 4 Pts</Label>
                                <Input
                                    type="number"
                                    step="0.001"
                                    value={editData?.year_4_points || ''}
                                    onChange={(e) => setEditData({...editData, year_4_points: e.target.value})}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label>Year 5 Pts</Label>
                                <Input
                                    type="number"
                                    step="0.001"
                                    value={editData?.year_5_points || ''}
                                    onChange={(e) => setEditData({...editData, year_5_points: e.target.value})}
                                    className="mt-1"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-4 gap-4">
                            <div>
                                <Label>Total Points</Label>
                                <Input
                                    type="number"
                                    step="0.001"
                                    value={editData?.total_points || ''}
                                    onChange={(e) => setEditData({...editData, total_points: e.target.value})}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label>{vccComp?.short_name || 'VCC'} Spots</Label>
                                <Input
                                    type="number"
                                    value={editData?.vcc_spots || ''}
                                    onChange={(e) => setEditData({...editData, vcc_spots: e.target.value})}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label>{cccComp?.short_name || 'CCC'} Spots</Label>
                                <Input
                                    type="number"
                                    value={editData?.ccc_spots || ''}
                                    onChange={(e) => setEditData({...editData, ccc_spots: e.target.value})}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label>Previous Rank</Label>
                                <Input
                                    type="number"
                                    value={editData?.previous_rank || ''}
                                    onChange={(e) => setEditData({...editData, previous_rank: e.target.value})}
                                    className="mt-1"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                            <Button 
                                onClick={() => saveMutation.mutate(editData)}
                                disabled={saveMutation.isPending}
                                className="bg-blue-600 hover:bg-blue-700"
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