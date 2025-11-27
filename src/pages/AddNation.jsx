import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Save, ArrowLeft, Loader2, ShieldAlert } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from '@/components/common/PageHeader';
import ImageUploader from '@/components/common/ImageUploader';
import { Link } from 'react-router-dom';
import { useIsAdmin } from '@/components/common/AdminOnly';

export default function AddNation() {
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
                        <p className="text-slate-500 mb-4">Only administrators can add content. Contact the site owner if you'd like to contribute.</p>
                        <Link to={createPageUrl('Home')}><Button>Back to Home</Button></Link>
                    </CardContent>
                </Card>
            </div>
        );
    }
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    
    const [formData, setFormData] = useState({
        name: '',
        flag_url: '',
        description: '',
        football_history: '',
        founded_year: '',
        federation_name: '',
        region: '',
        top_division: ''
    });

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.Nation.create(data),
        onSuccess: (newNation) => {
            queryClient.invalidateQueries({ queryKey: ['nations'] });
            navigate(createPageUrl(`NationDetail?id=${newNation.id}`));
        },
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        const submitData = {
            ...formData,
            founded_year: formData.founded_year ? parseInt(formData.founded_year) : null
        };
        createMutation.mutate(submitData);
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <PageHeader 
                title="Add New Nation"
                subtitle="Create a new nation in the Volaria football universe"
                breadcrumbs={[
                    { label: 'Nations', url: createPageUrl('Nations') },
                    { label: 'Add Nation' }
                ]}
            />

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <form onSubmit={handleSubmit}>
                    <Card className="shadow-lg border-0">
                        <CardHeader className="border-b bg-slate-50/50">
                            <CardTitle className="text-xl">Nation Details</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-8">
                            <div className="flex flex-col md:flex-row gap-8">
                                <div className="flex-shrink-0">
                                    <Label className="mb-3 block">Nation Flag</Label>
                                    <ImageUploader
                                        currentImage={formData.flag_url}
                                        onUpload={(url) => setFormData({...formData, flag_url: url})}
                                        label="Upload Flag"
                                    />
                                </div>
                                
                                <div className="flex-1 space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <Label htmlFor="name">Nation Name *</Label>
                                            <Input
                                                id="name"
                                                value={formData.name}
                                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                                placeholder="Enter nation name"
                                                required
                                                className="mt-2"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="region">Region</Label>
                                            <Input
                                                id="region"
                                                value={formData.region}
                                                onChange={(e) => setFormData({...formData, region: e.target.value})}
                                                placeholder="e.g., Northern Volaria"
                                                className="mt-2"
                                            />
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <Label htmlFor="federation">Federation Name</Label>
                                            <Input
                                                id="federation"
                                                value={formData.federation_name}
                                                onChange={(e) => setFormData({...formData, federation_name: e.target.value})}
                                                placeholder="e.g., National Football Association"
                                                className="mt-2"
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="founded">Football Founded</Label>
                                            <Input
                                                id="founded"
                                                type="number"
                                                value={formData.founded_year}
                                                onChange={(e) => setFormData({...formData, founded_year: e.target.value})}
                                                placeholder="e.g., 1892"
                                                className="mt-2"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <Label htmlFor="top_division">Top Division Name</Label>
                                        <Input
                                            id="top_division"
                                            value={formData.top_division}
                                            onChange={(e) => setFormData({...formData, top_division: e.target.value})}
                                            placeholder="e.g., Premier League"
                                            className="mt-2"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                                    placeholder="Brief description of the nation..."
                                    rows={3}
                                    className="mt-2"
                                />
                            </div>

                            <div>
                                <Label htmlFor="history">Football History</Label>
                                <Textarea
                                    id="history"
                                    value={formData.football_history}
                                    onChange={(e) => setFormData({...formData, football_history: e.target.value})}
                                    placeholder="Detailed football history of the nation..."
                                    rows={6}
                                    className="mt-2"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex items-center justify-between mt-6">
                        <Link to={createPageUrl('Nations')}>
                            <Button type="button" variant="ghost">
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Cancel
                            </Button>
                        </Link>
                        <Button 
                            type="submit" 
                            disabled={createMutation.isPending || !formData.name}
                            className="bg-emerald-600 hover:bg-emerald-700"
                        >
                            {createMutation.isPending ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                            ) : (
                                <><Save className="w-4 h-4 mr-2" /> Create Nation</>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}