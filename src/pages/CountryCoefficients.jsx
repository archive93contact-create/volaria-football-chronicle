import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Plus, Edit2, Trash2, TrendingUp, TrendingDown, Minus, Trophy, Star } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from '@/components/common/PageHeader';

export default function CountryCoefficients() {
    const queryClient = useQueryClient();
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editingCoeff, setEditingCoeff] = useState(null);
    const [formData, setFormData] = useState({
        nation_id: '', nation_name: '', rank: '', total_points: '',
        year_1_points: '', year_2_points: '', year_3_points: '', year_4_points: '', year_5_points: '',
        vcc_spots: '', ccc_spots: '', previous_rank: '', coefficient_year: ''
    });

    const { data: coefficients = [] } = useQuery({
        queryKey: ['coefficients'],
        queryFn: () => base44.entities.CountryCoefficient.list('rank'),
    });

    const { data: nations = [] } = useQuery({
        queryKey: ['nations'],
        queryFn: () => base44.entities.Nation.list('name'),
    });

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.CountryCoefficient.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['coefficients']);
            setIsAddOpen(false);
            resetForm();
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.CountryCoefficient.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['coefficients']);
            setEditingCoeff(null);
            resetForm();
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.CountryCoefficient.delete(id),
        onSuccess: () => queryClient.invalidateQueries(['coefficients']),
    });

    const resetForm = () => {
        setFormData({
            nation_id: '', nation_name: '', rank: '', total_points: '',
            year_1_points: '', year_2_points: '', year_3_points: '', year_4_points: '', year_5_points: '',
            vcc_spots: '', ccc_spots: '', previous_rank: '', coefficient_year: ''
        });
    };

    const openEdit = (coeff) => {
        setFormData(coeff);
        setEditingCoeff(coeff);
    };

    const handleNationChange = (nationId) => {
        const nation = nations.find(n => n.id === nationId);
        setFormData({ ...formData, nation_id: nationId, nation_name: nation?.name || '' });
    };

    const handleSubmit = () => {
        const submitData = {
            ...formData,
            rank: parseInt(formData.rank) || 0,
            total_points: parseFloat(formData.total_points) || 0,
            year_1_points: parseFloat(formData.year_1_points) || 0,
            year_2_points: parseFloat(formData.year_2_points) || 0,
            year_3_points: parseFloat(formData.year_3_points) || 0,
            year_4_points: parseFloat(formData.year_4_points) || 0,
            year_5_points: parseFloat(formData.year_5_points) || 0,
            vcc_spots: parseInt(formData.vcc_spots) || 0,
            ccc_spots: parseInt(formData.ccc_spots) || 0,
            previous_rank: parseInt(formData.previous_rank) || null,
        };
        if (editingCoeff) {
            updateMutation.mutate({ id: editingCoeff.id, data: submitData });
        } else {
            createMutation.mutate(submitData);
        }
    };

    const getRankChange = (current, previous) => {
        if (!previous) return null;
        const diff = previous - current;
        if (diff > 0) return { icon: TrendingUp, color: 'text-green-500', text: `+${diff}` };
        if (diff < 0) return { icon: TrendingDown, color: 'text-red-500', text: `${diff}` };
        return { icon: Minus, color: 'text-slate-400', text: '–' };
    };

    const CoeffForm = () => (
        <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label>Nation *</Label>
                    <Select value={formData.nation_id} onValueChange={handleNationChange}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select nation" /></SelectTrigger>
                        <SelectContent>
                            {nations.map(n => <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label>Coefficient Year</Label>
                    <Input value={formData.coefficient_year} onChange={(e) => setFormData({...formData, coefficient_year: e.target.value})} placeholder="e.g., 2024-25" className="mt-1" />
                </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
                <div>
                    <Label>Rank *</Label>
                    <Input type="number" value={formData.rank} onChange={(e) => setFormData({...formData, rank: e.target.value})} className="mt-1" />
                </div>
                <div>
                    <Label>Total Points</Label>
                    <Input type="number" step="0.001" value={formData.total_points} onChange={(e) => setFormData({...formData, total_points: e.target.value})} className="mt-1" />
                </div>
                <div>
                    <Label>Previous Rank</Label>
                    <Input type="number" value={formData.previous_rank} onChange={(e) => setFormData({...formData, previous_rank: e.target.value})} className="mt-1" />
                </div>
            </div>
            <div className="border-t pt-4">
                <Label className="text-sm text-slate-500 mb-2 block">Points by Year (Last 5 seasons)</Label>
                <div className="grid grid-cols-5 gap-2">
                    <div><Label className="text-xs">Year 1</Label><Input type="number" step="0.001" value={formData.year_1_points} onChange={(e) => setFormData({...formData, year_1_points: e.target.value})} className="mt-1" /></div>
                    <div><Label className="text-xs">Year 2</Label><Input type="number" step="0.001" value={formData.year_2_points} onChange={(e) => setFormData({...formData, year_2_points: e.target.value})} className="mt-1" /></div>
                    <div><Label className="text-xs">Year 3</Label><Input type="number" step="0.001" value={formData.year_3_points} onChange={(e) => setFormData({...formData, year_3_points: e.target.value})} className="mt-1" /></div>
                    <div><Label className="text-xs">Year 4</Label><Input type="number" step="0.001" value={formData.year_4_points} onChange={(e) => setFormData({...formData, year_4_points: e.target.value})} className="mt-1" /></div>
                    <div><Label className="text-xs">Year 5</Label><Input type="number" step="0.001" value={formData.year_5_points} onChange={(e) => setFormData({...formData, year_5_points: e.target.value})} className="mt-1" /></div>
                </div>
            </div>
            <div className="border-t pt-4">
                <Label className="text-sm text-slate-500 mb-2 block">Qualification Spots</Label>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label>VCC Spots</Label>
                        <Input type="number" value={formData.vcc_spots} onChange={(e) => setFormData({...formData, vcc_spots: e.target.value})} className="mt-1" />
                    </div>
                    <div>
                        <Label>CCC Spots</Label>
                        <Input type="number" value={formData.ccc_spots} onChange={(e) => setFormData({...formData, ccc_spots: e.target.value})} className="mt-1" />
                    </div>
                </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => { setIsAddOpen(false); setEditingCoeff(null); resetForm(); }}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={!formData.nation_name || !formData.rank} className="bg-emerald-600 hover:bg-emerald-700">
                    {editingCoeff ? 'Save Changes' : 'Add Entry'}
                </Button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50">
            <PageHeader 
                title="Country Coefficients"
                subtitle="Rankings, coefficients and continental qualification spots for all Volaria nations"
                breadcrumbs={[{ label: 'Country Coefficients' }]}
            >
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-emerald-600 hover:bg-emerald-700 mt-4">
                            <Plus className="w-4 h-4 mr-2" /> Add Entry
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader><DialogTitle>Add Coefficient Entry</DialogTitle></DialogHeader>
                        <CoeffForm />
                    </DialogContent>
                </Dialog>
            </PageHeader>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {coefficients.length === 0 ? (
                    <Card className="border-dashed border-2 border-slate-300">
                        <CardContent className="flex flex-col items-center justify-center py-16">
                            <Trophy className="w-16 h-16 text-slate-300 mb-4" />
                            <h3 className="text-xl font-semibold text-slate-700 mb-2">No Coefficients Yet</h3>
                            <p className="text-slate-500 mb-6">Add country coefficient rankings to track qualification spots</p>
                            <Button onClick={() => setIsAddOpen(true)}><Plus className="w-4 h-4 mr-2" /> Add Entry</Button>
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="border-0 shadow-lg overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-slate-800 to-slate-700">
                            <CardTitle className="text-white flex items-center gap-2">
                                <Star className="w-5 h-5 text-amber-400" />
                                Volaria Country Coefficient Rankings
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-slate-100">
                                        <TableRow>
                                            <TableHead className="w-16">Rank</TableHead>
                                            <TableHead>Nation</TableHead>
                                            <TableHead className="text-center">Total</TableHead>
                                            <TableHead className="text-center hidden md:table-cell">Y1</TableHead>
                                            <TableHead className="text-center hidden md:table-cell">Y2</TableHead>
                                            <TableHead className="text-center hidden md:table-cell">Y3</TableHead>
                                            <TableHead className="text-center hidden lg:table-cell">Y4</TableHead>
                                            <TableHead className="text-center hidden lg:table-cell">Y5</TableHead>
                                            <TableHead className="text-center">VCC</TableHead>
                                            <TableHead className="text-center">CCC</TableHead>
                                            <TableHead className="w-20"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {coefficients.map((coeff, idx) => {
                                            const rankChange = getRankChange(coeff.rank, coeff.previous_rank);
                                            const nation = nations.find(n => n.id === coeff.nation_id);
                                            return (
                                                <TableRow key={coeff.id} className={idx < 4 ? 'bg-emerald-50/50' : idx >= coefficients.length - 3 ? 'bg-slate-50' : ''}>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`font-bold text-lg ${idx < 4 ? 'text-emerald-600' : ''}`}>{coeff.rank}</span>
                                                            {rankChange && <rankChange.icon className={`w-4 h-4 ${rankChange.color}`} />}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Link to={createPageUrl(`NationDetail?id=${coeff.nation_id}`)} className="flex items-center gap-2 hover:text-emerald-600">
                                                            {nation?.flag_url && <img src={nation.flag_url} alt="" className="w-6 h-4 object-cover rounded" />}
                                                            <span className="font-semibold">{coeff.nation_name}</span>
                                                        </Link>
                                                    </TableCell>
                                                    <TableCell className="text-center font-bold text-lg">{coeff.total_points?.toFixed(3)}</TableCell>
                                                    <TableCell className="text-center hidden md:table-cell text-slate-600">{coeff.year_1_points?.toFixed(3) || '-'}</TableCell>
                                                    <TableCell className="text-center hidden md:table-cell text-slate-600">{coeff.year_2_points?.toFixed(3) || '-'}</TableCell>
                                                    <TableCell className="text-center hidden md:table-cell text-slate-600">{coeff.year_3_points?.toFixed(3) || '-'}</TableCell>
                                                    <TableCell className="text-center hidden lg:table-cell text-slate-600">{coeff.year_4_points?.toFixed(3) || '-'}</TableCell>
                                                    <TableCell className="text-center hidden lg:table-cell text-slate-600">{coeff.year_5_points?.toFixed(3) || '-'}</TableCell>
                                                    <TableCell className="text-center">
                                                        {coeff.vcc_spots > 0 && (
                                                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-700 font-bold text-sm">{coeff.vcc_spots}</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {coeff.ccc_spots > 0 && (
                                                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-sm">{coeff.ccc_spots}</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex gap-1">
                                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(coeff)}><Edit2 className="w-3 h-3" /></Button>
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-red-500"><Trash2 className="w-3 h-3" /></Button></AlertDialogTrigger>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader><AlertDialogTitle>Delete {coeff.nation_name}?</AlertDialogTitle></AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                        <AlertDialogAction onClick={() => deleteMutation.mutate(coeff.id)} className="bg-red-600">Delete</AlertDialogAction>
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
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Legend */}
                {coefficients.length > 0 && (
                    <div className="mt-6 flex flex-wrap gap-6 text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-xs">3</span>
                            <span>VCC Qualification Spots</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">2</span>
                            <span>CCC Qualification Spots</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-green-500" />
                            <span>Rank Improved</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <TrendingDown className="w-4 h-4 text-red-500" />
                            <span>Rank Dropped</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Edit Dialog */}
            <Dialog open={!!editingCoeff} onOpenChange={(open) => { if (!open) { setEditingCoeff(null); resetForm(); } }}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader><DialogTitle>Edit Coefficient Entry</DialogTitle></DialogHeader>
                    <CoeffForm />
                </DialogContent>
            </Dialog>
        </div>
    );
}