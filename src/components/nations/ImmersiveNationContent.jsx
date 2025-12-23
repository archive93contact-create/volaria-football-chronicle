import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Edit2, Save, X, MapPin, Utensils, Landmark, Building2, Globe2, Users } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import AdminOnly from '@/components/common/AdminOnly';

export default function ImmersiveNationContent({ nation }) {
    const queryClient = useQueryClient();
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({});

    const updateMutation = useMutation({
        mutationFn: (data) => base44.entities.Nation.update(nation.id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['nation', nation.id]);
            setIsEditing(false);
        },
    });

    const handleEdit = () => {
        setEditData({
            culture: nation.culture || '',
            geography: nation.geography || '',
            national_media: nation.national_media || '',
            cuisine: nation.cuisine || '',
            famous_for: nation.famous_for || '',
            government_type: nation.government_type || ''
        });
        setIsEditing(true);
    };

    const sections = [
        {
            key: 'culture',
            title: 'Culture & Identity',
            icon: Users,
            gradient: 'from-purple-500 to-pink-500',
            bgGradient: 'from-purple-50 to-pink-50'
        },
        {
            key: 'geography',
            title: 'Geography & Climate',
            icon: Globe2,
            gradient: 'from-emerald-500 to-teal-500',
            bgGradient: 'from-emerald-50 to-teal-50'
        },
        {
            key: 'national_media',
            title: 'National Media',
            icon: Building2,
            gradient: 'from-blue-500 to-indigo-500',
            bgGradient: 'from-blue-50 to-indigo-50'
        },
        {
            key: 'cuisine',
            title: 'Traditional Cuisine',
            icon: Utensils,
            gradient: 'from-amber-500 to-orange-500',
            bgGradient: 'from-amber-50 to-orange-50'
        },
        {
            key: 'famous_for',
            title: 'Famous For',
            icon: Landmark,
            gradient: 'from-rose-500 to-red-500',
            bgGradient: 'from-rose-50 to-red-50'
        }
    ];

    const hasContent = sections.some(s => nation[s.key]);

    return (
        <>
            <AdminOnly>
                <div className="mb-6 flex justify-end">
                    <Button onClick={handleEdit} variant="outline">
                        <Edit2 className="w-4 h-4 mr-2" /> Edit Content
                    </Button>
                </div>
            </AdminOnly>

            {!hasContent ? (
                <Card className="border-dashed border-2 border-slate-300">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <MapPin className="w-16 h-16 text-slate-300 mb-4" />
                        <h3 className="text-xl font-semibold text-slate-700 mb-2">No Nation Details Yet</h3>
                        <p className="text-slate-500 mb-4">Generate immersive content for {nation.name}</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-6">
                    {sections.map(section => {
                        if (!nation[section.key]) return null;
                        const Icon = section.icon;
                        return (
                            <div 
                                key={section.key}
                                className={`relative overflow-hidden rounded-2xl shadow-lg`}
                            >
                                {/* Header with gradient */}
                                <div className={`bg-gradient-to-r ${section.gradient} p-6 text-white`}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                                            <Icon className="w-6 h-6" />
                                        </div>
                                        <h3 className="text-2xl font-bold">{section.title}</h3>
                                    </div>
                                </div>
                                
                                {/* Content */}
                                <div className={`bg-gradient-to-br ${section.bgGradient} p-6`}>
                                    <p className="text-slate-800 leading-relaxed whitespace-pre-line text-base">
                                        {nation[section.key]}
                                    </p>
                                </div>
                            </div>
                        );
                    })}

                    {/* Government as simple card */}
                    {nation.government_type && (
                        <Card className="border-0 shadow-lg">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                                        <Landmark className="w-5 h-5 text-slate-600" />
                                    </div>
                                    <h4 className="text-lg font-semibold text-slate-900">Government</h4>
                                </div>
                                <p className="text-slate-700">{nation.government_type}</p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {/* Edit Dialog */}
            <Dialog open={isEditing} onOpenChange={setIsEditing}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Nation Content</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        {sections.map(section => (
                            <div key={section.key}>
                                <Label>{section.title}</Label>
                                <Textarea
                                    value={editData[section.key] || ''}
                                    onChange={(e) => setEditData({...editData, [section.key]: e.target.value})}
                                    rows={4}
                                    className="mt-1"
                                    placeholder={`Enter ${section.title.toLowerCase()}...`}
                                />
                            </div>
                        ))}
                        <div>
                            <Label>Government Type</Label>
                            <Textarea
                                value={editData.government_type || ''}
                                onChange={(e) => setEditData({...editData, government_type: e.target.value})}
                                rows={2}
                                className="mt-1"
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={() => setIsEditing(false)}>
                                <X className="w-4 h-4 mr-2" /> Cancel
                            </Button>
                            <Button 
                                onClick={() => updateMutation.mutate(editData)} 
                                disabled={updateMutation.isPending}
                                className="bg-emerald-600"
                            >
                                <Save className="w-4 h-4 mr-2" /> 
                                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}