import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Save, ArrowLeft, Loader2, Plus, Trash2, ShieldAlert } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from '@/components/common/PageHeader';
import ImageUploader from '@/components/common/ImageUploader';
import { useIsAdmin } from '@/components/common/AdminOnly';

export default function AddClub() {
    const { isAdmin, isLoading: authLoading } = useIsAdmin();
    
    if (authLoading) {
        return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;
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
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const urlParams = new URLSearchParams(window.location.search);
    const preselectedNationId = urlParams.get('nation_id');
    const preselectedLeagueId = urlParams.get('league_id');

    const { data: nations = [] } = useQuery({
        queryKey: ['nations'],
        queryFn: () => base44.entities.Nation.list('name'),
    });

    const { data: leagues = [] } = useQuery({
        queryKey: ['leagues'],
        queryFn: () => base44.entities.League.list('name'),
    });

    const [formData, setFormData] = useState({
        name: '', nation_id: preselectedNationId || '', league_id: preselectedLeagueId || '',
        logo_url: '', city: '', region: '', district: '', settlement: '',
        stadium: '', stadium_capacity: '', founded_year: '',
        nickname: '', primary_color: '#1e40af', secondary_color: '#ffffff',
        history: '', honours: '', notable_players: '', rivals: '', manager: ''
    });

    const [bulkClubs, setBulkClubs] = useState([
        { name: '', region: '', district: '', settlement: '', founded_year: '', nickname: '' }
    ]);

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.Club.create(data),
        onSuccess: (newClub) => {
            queryClient.invalidateQueries(['clubs']);
            navigate(createPageUrl(`ClubDetail?id=${newClub.id}`));
        },
    });

    const bulkCreateMutation = useMutation({
        mutationFn: (data) => base44.entities.Club.bulkCreate(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['clubs']);
            if (formData.nation_id) {
                navigate(createPageUrl(`NationDetail?id=${formData.nation_id}`));
            } else {
                navigate(createPageUrl('Nations'));
            }
        },
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        const submitData = {
            ...formData,
            founded_year: formData.founded_year ? parseInt(formData.founded_year) : null,
            stadium_capacity: formData.stadium_capacity ? parseInt(formData.stadium_capacity) : null,
        };
        createMutation.mutate(submitData);
    };

    const handleBulkSubmit = () => {
        const validClubs = bulkClubs.filter(c => c.name.trim());
        if (validClubs.length === 0) return;

        const clubsData = validClubs.map(club => ({
            ...club,
            nation_id: formData.nation_id,
            league_id: formData.league_id,
            founded_year: club.founded_year ? parseInt(club.founded_year) : null,
        }));
        bulkCreateMutation.mutate(clubsData);
    };

    const addBulkRow = () => {
        setBulkClubs([...bulkClubs, { name: '', region: '', district: '', settlement: '', founded_year: '', nickname: '' }]);
    };

    const removeBulkRow = (index) => {
        setBulkClubs(bulkClubs.filter((_, i) => i !== index));
    };

    const updateBulkRow = (index, field, value) => {
        const updated = [...bulkClubs];
        updated[index][field] = value;
        setBulkClubs(updated);
    };

    const filteredLeagues = leagues.filter(l => !formData.nation_id || l.nation_id === formData.nation_id);

    return (
        <div className="min-h-screen bg-slate-50">
            <PageHeader 
                title="Add Club(s)"
                subtitle="Add a single club or multiple clubs at once"
                breadcrumbs={[
                    { label: 'Nations', url: createPageUrl('Nations') },
                    { label: 'Add Club' }
                ]}
            />

            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Tabs defaultValue="single" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-6">
                        <TabsTrigger value="single">Single Club</TabsTrigger>
                        <TabsTrigger value="bulk">Bulk Add Clubs</TabsTrigger>
                    </TabsList>

                    <TabsContent value="single">
                        <form onSubmit={handleSubmit}>
                            <Card className="shadow-lg border-0">
                                <CardHeader className="border-b bg-slate-50/50">
                                    <CardTitle>Club Details</CardTitle>
                                </CardHeader>
                                <CardContent className="p-6 space-y-6">
                                    <div className="flex flex-col md:flex-row gap-8">
                                        <div className="flex-shrink-0">
                                            <Label className="mb-3 block">Club Logo</Label>
                                            <ImageUploader
                                                currentImage={formData.logo_url}
                                                onUpload={(url) => setFormData({...formData, logo_url: url})}
                                                label="Upload Logo"
                                            />
                                        </div>
                                        <div className="flex-1 space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <Label>Club Name *</Label>
                                                    <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required className="mt-1" />
                                                </div>
                                                <div>
                                                    <Label>Nation *</Label>
                                                    <Select value={formData.nation_id} onValueChange={(v) => setFormData({...formData, nation_id: v, league_id: ''})}>
                                                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select nation" /></SelectTrigger>
                                                        <SelectContent>
                                                            {nations.map(n => <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <Label>League</Label>
                                                    <Select value={formData.league_id} onValueChange={(v) => setFormData({...formData, league_id: v})}>
                                                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select league" /></SelectTrigger>
                                                        <SelectContent>
                                                            {filteredLeagues.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div>
                                                    <Label>City (legacy)</Label>
                                                    <Input value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} className="mt-1" placeholder="Optional" />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-3 gap-4">
                                                <div>
                                                    <Label>Region</Label>
                                                    <Input value={formData.region} onChange={(e) => setFormData({...formData, region: e.target.value})} className="mt-1" placeholder="Largest area" />
                                                </div>
                                                <div>
                                                    <Label>District</Label>
                                                    <Input value={formData.district} onChange={(e) => setFormData({...formData, district: e.target.value})} className="mt-1" placeholder="Medium area" />
                                                </div>
                                                <div>
                                                    <Label>Settlement</Label>
                                                    <Input value={formData.settlement} onChange={(e) => setFormData({...formData, settlement: e.target.value})} className="mt-1" placeholder="Town/city" />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-3 gap-4">
                                                <div>
                                                    <Label>Founded Year</Label>
                                                    <Input type="number" value={formData.founded_year} onChange={(e) => setFormData({...formData, founded_year: e.target.value})} className="mt-1" />
                                                </div>
                                                <div>
                                                    <Label>Nickname</Label>
                                                    <Input value={formData.nickname} onChange={(e) => setFormData({...formData, nickname: e.target.value})} className="mt-1" />
                                                </div>
                                                <div>
                                                    <Label>Manager</Label>
                                                    <Input value={formData.manager} onChange={(e) => setFormData({...formData, manager: e.target.value})} className="mt-1" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <Label>Stadium</Label>
                                            <Input value={formData.stadium} onChange={(e) => setFormData({...formData, stadium: e.target.value})} className="mt-1" />
                                        </div>
                                        <div>
                                            <Label>Stadium Capacity</Label>
                                            <Input type="number" value={formData.stadium_capacity} onChange={(e) => setFormData({...formData, stadium_capacity: e.target.value})} className="mt-1" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label>Primary Color</Label>
                                            <div className="flex gap-2 mt-1">
                                                <input type="color" value={formData.primary_color} onChange={(e) => setFormData({...formData, primary_color: e.target.value})} className="w-12 h-10 rounded cursor-pointer" />
                                                <Input value={formData.primary_color} onChange={(e) => setFormData({...formData, primary_color: e.target.value})} />
                                            </div>
                                        </div>
                                        <div>
                                            <Label>Secondary Color</Label>
                                            <div className="flex gap-2 mt-1">
                                                <input type="color" value={formData.secondary_color} onChange={(e) => setFormData({...formData, secondary_color: e.target.value})} className="w-12 h-10 rounded cursor-pointer" />
                                                <Input value={formData.secondary_color} onChange={(e) => setFormData({...formData, secondary_color: e.target.value})} />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <Label>History</Label>
                                        <Textarea value={formData.history} onChange={(e) => setFormData({...formData, history: e.target.value})} rows={3} className="mt-1" />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <Label>Honours</Label>
                                            <Textarea value={formData.honours} onChange={(e) => setFormData({...formData, honours: e.target.value})} rows={3} className="mt-1" placeholder="List major trophies..." />
                                        </div>
                                        <div>
                                            <Label>Rivals</Label>
                                            <Textarea value={formData.rivals} onChange={(e) => setFormData({...formData, rivals: e.target.value})} rows={3} className="mt-1" placeholder="Main rival clubs..." />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="flex items-center justify-between mt-6">
                                <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
                                    <ArrowLeft className="w-4 h-4 mr-2" /> Cancel
                                </Button>
                                <Button type="submit" disabled={createMutation.isPending || !formData.name || !formData.nation_id} className="bg-emerald-600 hover:bg-emerald-700">
                                    {createMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : <><Save className="w-4 h-4 mr-2" /> Create Club</>}
                                </Button>
                            </div>
                        </form>
                    </TabsContent>

                    <TabsContent value="bulk">
                        <Card className="shadow-lg border-0">
                            <CardHeader className="border-b bg-slate-50/50">
                                <CardTitle>Bulk Add Clubs</CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label>Nation *</Label>
                                        <Select value={formData.nation_id} onValueChange={(v) => setFormData({...formData, nation_id: v, league_id: ''})}>
                                            <SelectTrigger className="mt-1"><SelectValue placeholder="Select nation" /></SelectTrigger>
                                            <SelectContent>
                                                {nations.map(n => <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label>League (optional)</Label>
                                        <Select value={formData.league_id} onValueChange={(v) => setFormData({...formData, league_id: v})}>
                                            <SelectTrigger className="mt-1"><SelectValue placeholder="Select league" /></SelectTrigger>
                                            <SelectContent>
                                                {filteredLeagues.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="border rounded-lg overflow-hidden overflow-x-auto">
                                    <div className="bg-slate-100 px-4 py-2 grid grid-cols-16 gap-2 text-sm font-medium text-slate-600 min-w-[800px]">
                                        <div className="col-span-3">Club Name *</div>
                                        <div className="col-span-2">Region</div>
                                        <div className="col-span-2">District</div>
                                        <div className="col-span-3">Settlement</div>
                                        <div className="col-span-2">Founded</div>
                                        <div className="col-span-3">Nickname</div>
                                        <div className="col-span-1"></div>
                                    </div>
                                    {bulkClubs.map((club, index) => (
                                        <div key={index} className="px-4 py-2 grid grid-cols-16 gap-2 border-t min-w-[800px]">
                                            <Input className="col-span-3" placeholder="Club name" value={club.name} onChange={(e) => updateBulkRow(index, 'name', e.target.value)} />
                                            <Input className="col-span-2" placeholder="Region" value={club.region} onChange={(e) => updateBulkRow(index, 'region', e.target.value)} />
                                            <Input className="col-span-2" placeholder="District" value={club.district} onChange={(e) => updateBulkRow(index, 'district', e.target.value)} />
                                            <Input className="col-span-3" placeholder="Settlement" value={club.settlement} onChange={(e) => updateBulkRow(index, 'settlement', e.target.value)} />
                                            <Input className="col-span-2" type="number" placeholder="Year" value={club.founded_year} onChange={(e) => updateBulkRow(index, 'founded_year', e.target.value)} />
                                            <Input className="col-span-3" placeholder="Nickname" value={club.nickname} onChange={(e) => updateBulkRow(index, 'nickname', e.target.value)} />
                                            <div className="col-span-1 flex justify-center">
                                                {bulkClubs.length > 1 && (
                                                    <Button variant="ghost" size="icon" onClick={() => removeBulkRow(index)} className="text-red-500 h-9 w-9">
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <Button variant="outline" onClick={addBulkRow}>
                                    <Plus className="w-4 h-4 mr-2" /> Add Row
                                </Button>
                            </CardContent>
                        </Card>

                        <div className="flex items-center justify-between mt-6">
                            <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
                                <ArrowLeft className="w-4 h-4 mr-2" /> Cancel
                            </Button>
                            <Button 
                                onClick={handleBulkSubmit} 
                                disabled={bulkCreateMutation.isPending || !formData.nation_id || !bulkClubs.some(c => c.name.trim())} 
                                className="bg-emerald-600 hover:bg-emerald-700"
                            >
                                {bulkCreateMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</> : <><Save className="w-4 h-4 mr-2" /> Create {bulkClubs.filter(c => c.name.trim()).length} Club(s)</>}
                            </Button>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}