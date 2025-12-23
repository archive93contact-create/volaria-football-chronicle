import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { useIsAdmin } from '@/components/common/AdminOnly';
import { MapPin, Save, X, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import PageHeader from '@/components/common/PageHeader';

export default function AddLocation() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { isAdmin, isLoading } = useIsAdmin();

    const [formData, setFormData] = useState({
        name: '',
        type: 'settlement',
        nation_id: '',
        parent_region: '',
        parent_district: '',
        is_capital: false,
        settlement_size: 'town',
        description: '',
        notes: '',
        club_ids: []
    });

    const { data: nations = [] } = useQuery({
        queryKey: ['nations'],
        queryFn: () => base44.entities.Nation.list(),
    });

    const { data: clubs = [] } = useQuery({
        queryKey: ['clubs', formData.nation_id],
        queryFn: () => base44.entities.Club.filter({ nation_id: formData.nation_id }),
        enabled: !!formData.nation_id,
    });

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.Location.create(data),
        onSuccess: (location) => {
            queryClient.invalidateQueries(['locations']);
            navigate(createPageUrl(`LocationDetail?name=${encodeURIComponent(location.name)}&type=${location.type}&nation_id=${location.nation_id}`));
        },
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        createMutation.mutate(formData);
    };

    const toggleClub = (clubId) => {
        setFormData(prev => ({
            ...prev,
            club_ids: prev.club_ids.includes(clubId) 
                ? prev.club_ids.filter(id => id !== clubId) 
                : [...prev.club_ids, clubId]
        }));
    };

    if (isLoading) {
        return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;
    }

    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <p className="text-slate-500">Admin access required</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <PageHeader 
                title="Add Location"
                subtitle="Create a new region, district, or settlement"
                breadcrumbs={[
                    { label: 'Locations', url: createPageUrl('Locations') },
                    { label: 'Add Location' }
                ]}
            />

            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <form onSubmit={handleSubmit}>
                    <Card className="border-0 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-emerald-600" />
                                Location Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Location Name *</Label>
                                    <Input 
                                        value={formData.name} 
                                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                                        className="mt-1"
                                        required
                                    />
                                </div>
                                <div>
                                    <Label>Type *</Label>
                                    <Select value={formData.type} onValueChange={(v) => setFormData({...formData, type: v})}>
                                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="region">Region (largest)</SelectItem>
                                            <SelectItem value="district">District (medium)</SelectItem>
                                            <SelectItem value="settlement">Settlement (town/city)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div>
                                <Label>Nation *</Label>
                                <Select value={formData.nation_id} onValueChange={(v) => setFormData({...formData, nation_id: v})}>
                                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select nation" /></SelectTrigger>
                                    <SelectContent>
                                        {nations.map(n => (
                                            <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {formData.type !== 'region' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>Parent Region</Label>
                                        <Input 
                                            value={formData.parent_region} 
                                            onChange={(e) => setFormData({...formData, parent_region: e.target.value})}
                                            className="mt-1"
                                            placeholder="e.g., Central Province"
                                        />
                                    </div>
                                    {formData.type === 'settlement' && (
                                        <div>
                                            <Label>Parent District</Label>
                                            <Input 
                                                value={formData.parent_district} 
                                                onChange={(e) => setFormData({...formData, parent_district: e.target.value})}
                                                className="mt-1"
                                                placeholder="e.g., Coastal District"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {formData.type === 'settlement' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>Settlement Size</Label>
                                        <Select value={formData.settlement_size} onValueChange={(v) => setFormData({...formData, settlement_size: v})}>
                                            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="city">City</SelectItem>
                                                <SelectItem value="town">Town</SelectItem>
                                                <SelectItem value="village">Village</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex items-center gap-2 pt-6">
                                        <Checkbox 
                                            checked={formData.is_capital}
                                            onCheckedChange={(v) => setFormData({...formData, is_capital: v})}
                                        />
                                        <Label>National Capital</Label>
                                    </div>
                                </div>
                            )}

                            <div>
                                <Label>Description</Label>
                                <Textarea 
                                    value={formData.description} 
                                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                                    rows={3}
                                    className="mt-1"
                                    placeholder="Brief description..."
                                />
                            </div>

                            {formData.nation_id && clubs.length > 0 && (
                                <div>
                                    <Label>Clubs in this Location ({formData.club_ids.length} selected)</Label>
                                    <div className="mt-2 border rounded-lg p-4 bg-slate-50 max-h-60 overflow-y-auto">
                                        <div className="grid grid-cols-2 gap-2">
                                            {clubs.sort((a, b) => a.name.localeCompare(b.name)).map(club => {
                                                const isSelected = formData.club_ids.includes(club.id);
                                                return (
                                                    <label 
                                                        key={club.id}
                                                        className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${isSelected ? 'bg-emerald-100' : 'hover:bg-slate-100'}`}
                                                    >
                                                        <Checkbox
                                                            checked={isSelected}
                                                            onCheckedChange={() => toggleClub(club.id)}
                                                        />
                                                        {club.logo_url && (
                                                            <img src={club.logo_url} alt="" className="w-5 h-5 object-contain bg-white rounded p-0.5" />
                                                        )}
                                                        <span className="text-sm truncate flex-1">{club.name}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div>
                                <Label>Notes</Label>
                                <Textarea 
                                    value={formData.notes} 
                                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                                    rows={3}
                                    className="mt-1"
                                    placeholder="Historical context, interesting facts..."
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                                    <X className="w-4 h-4 mr-2" /> Cancel
                                </Button>
                                <Button 
                                    type="submit" 
                                    disabled={createMutation.isPending || !formData.name || !formData.nation_id}
                                    className="bg-emerald-600"
                                >
                                    {createMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                    Create Location
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </form>
            </div>
        </div>
    );
}