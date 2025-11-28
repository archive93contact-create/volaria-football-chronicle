import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Save, ArrowLeft, Loader2, ShieldAlert } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from '@/components/common/PageHeader';
import ImageUploader from '@/components/common/ImageUploader';
import { useIsAdmin } from '@/components/common/AdminOnly';

export default function AddLeague() {
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

    const { data: nations = [] } = useQuery({
        queryKey: ['nations'],
        queryFn: () => base44.entities.Nation.list('name'),
    });

    const [formData, setFormData] = useState({
        name: '', nation_id: preselectedNationId || '', logo_url: '', tier: 1,
        description: '', history: '', founded_year: '', number_of_teams: '',
        format: '', promotion_spots: '', relegation_spots: '',
        current_champion: '', most_titles: '', primary_color: '#1e40af', secondary_color: '#fbbf24'
    });

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.League.create(data),
        onSuccess: (newLeague) => {
            queryClient.invalidateQueries(['leagues']);
            navigate(createPageUrl(`LeagueDetail?id=${newLeague.id}`));
        },
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        const submitData = {
            ...formData,
            tier: parseInt(formData.tier) || 1,
            founded_year: formData.founded_year ? parseInt(formData.founded_year) : null,
            number_of_teams: formData.number_of_teams ? parseInt(formData.number_of_teams) : null,
            promotion_spots: formData.promotion_spots ? parseInt(formData.promotion_spots) : null,
            relegation_spots: formData.relegation_spots ? parseInt(formData.relegation_spots) : null,
        };
        createMutation.mutate(submitData);
    };

    const selectedNation = nations.find(n => n.id === formData.nation_id);

    return (
        <div className="min-h-screen bg-slate-50">
            <PageHeader 
                title="Add New League"
                subtitle="Create a new league competition"
                breadcrumbs={[
                    { label: 'Nations', url: createPageUrl('Nations') },
                    ...(selectedNation ? [{ label: selectedNation.name, url: createPageUrl(`NationDetail?id=${selectedNation.id}`) }] : []),
                    { label: 'Add League' }
                ]}
            />

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <form onSubmit={handleSubmit}>
                    <Card className="shadow-lg border-0">
                        <CardHeader className="border-b bg-slate-50/50">
                            <CardTitle>League Details</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="flex flex-col md:flex-row gap-8">
                                <div className="flex-shrink-0">
                                    <Label className="mb-3 block">League Logo</Label>
                                    <ImageUploader
                                        currentImage={formData.logo_url}
                                        onUpload={(url) => setFormData({...formData, logo_url: url})}
                                        label="Upload Logo"
                                    />
                                </div>
                                <div className="flex-1 space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <Label>League Name *</Label>
                                            <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required className="mt-1" />
                                        </div>
                                        <div>
                                            <Label>Nation *</Label>
                                            <Select value={formData.nation_id} onValueChange={(v) => setFormData({...formData, nation_id: v})}>
                                                <SelectTrigger className="mt-1"><SelectValue placeholder="Select nation" /></SelectTrigger>
                                                <SelectContent>
                                                    {nations.map(n => <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <Label>Tier</Label>
                                            <Input type="number" min="1" value={formData.tier} onChange={(e) => setFormData({...formData, tier: e.target.value})} className="mt-1" />
                                        </div>
                                        <div>
                                            <Label>Founded Year</Label>
                                            <Input type="number" value={formData.founded_year} onChange={(e) => setFormData({...formData, founded_year: e.target.value})} className="mt-1" />
                                        </div>
                                        <div>
                                            <Label>Teams</Label>
                                            <Input type="number" value={formData.number_of_teams} onChange={(e) => setFormData({...formData, number_of_teams: e.target.value})} className="mt-1" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <Label>Format</Label>
                                    <Input value={formData.format} onChange={(e) => setFormData({...formData, format: e.target.value})} placeholder="e.g., Round-robin" className="mt-1" />
                                </div>
                                <div>
                                    <Label>Promotion Spots</Label>
                                    <Input type="number" value={formData.promotion_spots} onChange={(e) => setFormData({...formData, promotion_spots: e.target.value})} className="mt-1" />
                                </div>
                                <div>
                                    <Label>Relegation Spots</Label>
                                    <Input type="number" value={formData.relegation_spots} onChange={(e) => setFormData({...formData, relegation_spots: e.target.value})} className="mt-1" />
                                </div>
                                <div>
                                    <Label>Current Champion</Label>
                                    <Input value={formData.current_champion} onChange={(e) => setFormData({...formData, current_champion: e.target.value})} className="mt-1" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Primary Color</Label>
                                    <div className="flex gap-2 mt-1">
                                        <Input type="color" value={formData.primary_color} onChange={(e) => setFormData({...formData, primary_color: e.target.value})} className="w-12 h-10 p-1" />
                                        <Input value={formData.primary_color} onChange={(e) => setFormData({...formData, primary_color: e.target.value})} />
                                    </div>
                                </div>
                                <div>
                                    <Label>Secondary Color</Label>
                                    <div className="flex gap-2 mt-1">
                                        <Input type="color" value={formData.secondary_color} onChange={(e) => setFormData({...formData, secondary_color: e.target.value})} className="w-12 h-10 p-1" />
                                        <Input value={formData.secondary_color} onChange={(e) => setFormData({...formData, secondary_color: e.target.value})} />
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
                        </CardContent>
                    </Card>

                    <div className="flex items-center justify-between mt-6">
                        <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
                            <ArrowLeft className="w-4 h-4 mr-2" /> Cancel
                        </Button>
                        <Button type="submit" disabled={createMutation.isPending || !formData.name || !formData.nation_id} className="bg-emerald-600 hover:bg-emerald-700">
                            {createMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : <><Save className="w-4 h-4 mr-2" /> Create League</>}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}