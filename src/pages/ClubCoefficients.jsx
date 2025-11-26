import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Plus, Edit2, Trash2, TrendingUp, TrendingDown, Minus, Shield, Star } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from '@/components/common/PageHeader';

export default function ClubCoefficients() {
    const queryClient = useQueryClient();
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editingCoeff, setEditingCoeff] = useState(null);
    const [formData, setFormData] = useState({
        club_id: '', club_name: '', nation_id: '', nation_name: '', membership: '',
        rank: '', total_points: '', previous_rank: '', coefficient_year: '',
        year_1_points: '', year_2_points: '', year_3_points: '', year_4_points: '', year_5_points: ''
    });

    const { data: coefficients = [] } = useQuery({
        queryKey: ['clubCoefficients'],
        queryFn: () => base44.entities.ClubCoefficient.list('rank'),
    });

    const { data: clubs = [] } = useQuery({
        queryKey: ['allClubs'],
        queryFn: () => base44.entities.Club.list('name'),
    });

    const { data: nations = [] } = useQuery({
        queryKey: ['nations'],
        queryFn: () => base44.entities.Nation.list('name'),
    });

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.ClubCoefficient.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['clubCoefficients']);
            setIsAddOpen(false);
            resetForm();
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.ClubCoefficient.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['clubCoefficients']);
            setEditingCoeff(null);
            resetForm();
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.ClubCoefficient.delete(id),
        onSuccess: () => queryClient.invalidateQueries(['clubCoefficients']),
    });

    const resetForm = () => {
        setFormData({
            club_id: '', club_name: '', nation_id: '', nation_name: '', membership: '',
            rank: '', total_points: '', previous_rank: '', coefficient_year: '',
            year_1_points: '', year_2_points: '', year_3_points: '', year_4_points: '', year_5_points: ''
        });
    };

    const openEdit = (coeff) => {
        setFormData(coeff);
        setEditingCoeff(coeff);
    };

    const handleClubChange = (clubId) => {
        const club = clubs.find(c => c.id === clubId);
        const nation = nations.find(n => n.id === club?.nation_id);
        setFormData({
            ...formData,
            club_id: clubId,
            club_name: club?.name || '',
            nation_id: club?.nation_id || '',
            nation_name: nation?.name || '',
            membership: nation?.membership || ''
        });
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
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
            previous_rank: parseInt(formData.previous_rank) || null,
        };
        if (editingCoeff) {
            updateMutation.mutate({ id: editingCoeff.id, data: submitData });
        } else {
            createMutation.mutate(submitData);
        }
    };

    const closeForm = () => {
        setIsAddOpen(false);
        setEditingCoeff(null);
        resetForm();
    };

    const getRankChange = (current, previous) => {
        if (!previous) return null;
        const diff = previous - current;
        if (diff > 0) return { icon: TrendingUp, color: 'text-green-500', text: `+${diff}` };
        if (diff < 0) return { icon: TrendingDown, color: 'text-red-500', text: `${diff}` };
        return { icon: Minus, color: 'text-slate-400', text: '–' };
    };

    const vccClubs = coefficients.filter(c => c.membership === 'VCC');
    const cccClubs = coefficients.filter(c => c.membership === 'CCC');

    const coeffForm = (
        <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label>Club *</Label>
                    <Select value={formData.club_id} onValueChange={handleClubChange}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select club" /></SelectTrigger>
                        <SelectContent>
                            {clubs.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label>Nation</Label>
                    <Input value={formData.nation_name || ''} disabled className="mt-1 bg-slate-50" />
                </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
                <div>
                    <Label>Rank *</Label>
                    <Input type="number" value={formData.rank || ''} onChange={(e) => handleInputChange('rank', e.target.value)} className="mt-1" />
                </div>
                <div>
                    <Label>Total Points</Label>
                    <Input type="number" step="0.001" value={formData.total_points || ''} onChange={(e) => handleInputChange('total_points', e.target.value)} className="mt-1" />
                </div>
                <div>
                    <Label>Previous Rank</Label>
                    <Input type="number" value={formData.previous_rank || ''} onChange={(e) => handleInputChange('previous_rank', e.target.value)} className="mt-1" />
                </div>
                <div>
                    <Label>Membership</Label>
                    <Input value={formData.membership || ''} disabled className="mt-1 bg-slate-50" />
                </div>
            </div>
            <div className="border-t pt-4">
                <Label className="text-sm text-slate-500 mb-2 block">Points by Year (Last 5 seasons)</Label>
                <div className="grid grid-cols-5 gap-2">
                    <div><Label className="text-xs">Year 1</Label><Input type="number" step="0.001" value={formData.year_1_points || ''} onChange={(e) => handleInputChange('year_1_points', e.target.value)} className="mt-1" /></div>
                    <div><Label className="text-xs">Year 2</Label><Input type="number" step="0.001" value={formData.year_2_points || ''} onChange={(e) => handleInputChange('year_2_points', e.target.value)} className="mt-1" /></div>
                    <div><Label className="text-xs">Year 3</Label><Input type="number" step="0.001" value={formData.year_3_points || ''} onChange={(e) => handleInputChange('year_3_points', e.target.value)} className="mt-1" /></div>
                    <div><Label className="text-xs">Year 4</Label><Input type="number" step="0.001" value={formData.year_4_points || ''} onChange={(e) => handleInputChange('year_4_points', e.target.value)} className="mt-1" /></div>
                    <div><Label className="text-xs">Year 5</Label><Input type="number" step="0.001" value={formData.year_5_points || ''} onChange={(e) => handleInputChange('year_5_points', e.target.value)} className="mt-1" /></div>
                </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={closeForm}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={!formData.club_name || !formData.rank} className="bg-emerald-600 hover:bg-emerald-700">
                    {editingCoeff ? 'Save Changes' : 'Add Entry'}
                </Button>
            </div>
        </div>
    );

    const renderTable = (data) => (
        <Table>
            <TableHeader className="bg-slate-100">
                <TableRow>
                    <TableHead className="w-16">Rank</TableHead>
                    <TableHead>Club</TableHead>
                    <TableHead>Nation</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead className="text-center hidden md:table-cell">Y1</TableHead>
                    <TableHead className="text-center hidden md:table-cell">Y2</TableHead>
                    <TableHead className="text-center hidden md:table-cell">Y3</TableHead>
                    <TableHead className="text-center hidden lg:table-cell">Y4</TableHead>
                    <TableHead className="text-center hidden lg:table-cell">Y5</TableHead>
                    <TableHead className="w-20"></TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {data.map((coeff, idx) => {
                    const rankChange = getRankChange(coeff.rank, coeff.previous_rank);
                    const nation = nations.find(n => n.id === coeff.nation_id);
                    const club = clubs.find(c => c.id === coeff.club_id);
                    return (
                        <TableRow key={coeff.id} className={idx < 3 ? 'bg-emerald-50/50' : ''}>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <span className={`font-bold text-lg ${idx < 3 ? 'text-emerald-600' : ''}`}>{coeff.rank}</span>
                                    {rankChange && <rankChange.icon className={`w-4 h-4 ${rankChange.color}`} />}
                                </div>
                            </TableCell>
                            <TableCell>
                                <Link to={createPageUrl(`ClubDetail?id=${coeff.club_id}`)} className="flex items-center gap-2 hover:text-emerald-600">
                                    {club?.logo_url && <img src={club.logo_url} alt="" className="w-6 h-6 object-contain" />}
                                    <span className="font-semibold">{coeff.club_name}</span>
                                </Link>
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    {nation?.flag_url && <img src={nation.flag_url} alt="" className="w-5 h-3 object-cover rounded" />}
                                    <span className="text-slate-600 text-sm">{coeff.nation_name}</span>
                                </div>
                            </TableCell>
                            <TableCell className="text-center font-bold text-lg">{coeff.total_points?.toFixed(3)}</TableCell>
                            <TableCell className="text-center hidden md:table-cell text-slate-600">{coeff.year_1_points?.toFixed(3) || '-'}</TableCell>
                            <TableCell className="text-center hidden md:table-cell text-slate-600">{coeff.year_2_points?.toFixed(3) || '-'}</TableCell>
                            <TableCell className="text-center hidden md:table-cell text-slate-600">{coeff.year_3_points?.toFixed(3) || '-'}</TableCell>
                            <TableCell className="text-center hidden lg:table-cell text-slate-600">{coeff.year_4_points?.toFixed(3) || '-'}</TableCell>
                            <TableCell className="text-center hidden lg:table-cell text-slate-600">{coeff.year_5_points?.toFixed(3) || '-'}</TableCell>
                            <TableCell>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(coeff)}><Edit2 className="w-3 h-3" /></Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-red-500"><Trash2 className="w-3 h-3" /></Button></AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader><AlertDialogTitle>Delete {coeff.club_name}?</AlertDialogTitle></AlertDialogHeader>
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
    );

    return (
        <div className="min-h-screen bg-slate-50">
            <PageHeader 
                title="Club Coefficients"
                subtitle="Rankings based on continental competition performance"
                breadcrumbs={[{ label: 'Club Coefficients' }]}
            >
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-emerald-600 hover:bg-emerald-700 mt-4">
                            <Plus className="w-4 h-4 mr-2" /> Add Entry
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader><DialogTitle>Add Club Coefficient</DialogTitle></DialogHeader>
                        {coeffForm}
                    </DialogContent>
                </Dialog>
            </PageHeader>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {coefficients.length === 0 ? (
                    <Card className="border-dashed border-2 border-slate-300">
                        <CardContent className="flex flex-col items-center justify-center py-16">
                            <Shield className="w-16 h-16 text-slate-300 mb-4" />
                            <h3 className="text-xl font-semibold text-slate-700 mb-2">No Club Coefficients Yet</h3>
                            <p className="text-slate-500 mb-6">Add club rankings based on continental performance</p>
                            <Button onClick={() => setIsAddOpen(true)}><Plus className="w-4 h-4 mr-2" /> Add Entry</Button>
                        </CardContent>
                    </Card>
                ) : (
                    <Tabs defaultValue="all" className="space-y-6">
                        <TabsList>
                            <TabsTrigger value="all">All Clubs ({coefficients.length})</TabsTrigger>
                            <TabsTrigger value="vcc" className="flex items-center gap-2">
                                <Badge className="bg-amber-500 text-white text-xs">VCC</Badge>
                                Full Members ({vccClubs.length})
                            </TabsTrigger>
                            <TabsTrigger value="ccc" className="flex items-center gap-2">
                                <Badge className="bg-blue-500 text-white text-xs">CCC</Badge>
                                Associates ({cccClubs.length})
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="all">
                            <Card className="border-0 shadow-lg overflow-hidden">
                                <CardHeader className="bg-gradient-to-r from-slate-800 to-slate-700">
                                    <CardTitle className="text-white flex items-center gap-2">
                                        <Star className="w-5 h-5 text-amber-400" />
                                        All Club Rankings
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="overflow-x-auto">{renderTable(coefficients)}</div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="vcc">
                            <Card className="border-0 shadow-lg overflow-hidden">
                                <CardHeader className="bg-gradient-to-r from-amber-600 to-amber-500">
                                    <CardTitle className="text-white flex items-center gap-2">
                                        <Star className="w-5 h-5" />
                                        VCC Club Rankings (Full Members)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="overflow-x-auto">{renderTable(vccClubs)}</div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="ccc">
                            <Card className="border-0 shadow-lg overflow-hidden">
                                <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-500">
                                    <CardTitle className="text-white flex items-center gap-2">
                                        <Shield className="w-5 h-5" />
                                        CCC Club Rankings (Associates)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="overflow-x-auto">{renderTable(cccClubs)}</div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                )}

                {/* Legend */}
                {coefficients.length > 0 && (
                    <div className="mt-6 flex flex-wrap gap-6 text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                            <Badge className="bg-amber-500 text-white">VCC</Badge>
                            <span>Full Member Nations</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge className="bg-blue-500 text-white">CCC</Badge>
                            <span>Associate Member Nations</span>
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
                    <DialogHeader><DialogTitle>Edit Club Coefficient</DialogTitle></DialogHeader>
                    {coeffForm}
                </DialogContent>
            </Dialog>
        </div>
    );
}