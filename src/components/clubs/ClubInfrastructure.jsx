import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
    Building2, Users, GraduationCap, Trophy, Star, Sparkles, 
    Loader2, Edit2, Save, X, AlertTriangle, Building, Banknote, Briefcase
} from 'lucide-react';
import AdminOnly from '@/components/common/AdminOnly';
import ProfessionalStatusBadge from '@/components/clubs/ProfessionalStatusBadge';

// Generate facilities based on stability points and club history
const calculateFacilities = (club, league) => {
    const points = club.stability_points || 0;
    const tier = league?.tier || 4;
    const titles = (club.league_titles || 0) + (club.vcc_titles || 0) + (club.ccc_titles || 0);
    const seasonsTopFlight = club.seasons_top_flight || 0;
    
    // Base ratings from stability
    let baseRating = 3; // Default
    if (points >= 30) baseRating = 5;
    else if (points >= 20) baseRating = 4;
    else if (points >= 10) baseRating = 3;
    else if (points >= 0) baseRating = 2;
    else baseRating = 1;
    
    // Adjust for tier
    const tierBonus = Math.max(0, 3 - tier) * 0.5;
    
    // Adjust for history
    const historyBonus = Math.min(1, titles * 0.2 + seasonsTopFlight * 0.02);
    
    // Youth academy - requires stability and history
    const hasYouth = points >= 5 || titles > 0 || seasonsTopFlight >= 5;
    const youthRating = hasYouth ? Math.min(5, Math.max(1, Math.round(baseRating + historyBonus))) : 0;
    
    // Training ground
    const trainingRating = Math.min(5, Math.max(1, Math.round(baseRating + tierBonus * 0.5)));
    
    // Stadium
    const stadiumRating = Math.min(5, Math.max(1, Math.round(baseRating + tierBonus)));
    
    // Commercial
    const commercialRating = Math.min(5, Math.max(1, Math.round(baseRating + historyBonus + tierBonus * 0.5)));
    
    return {
        hasYouth,
        youthRating,
        trainingRating,
        stadiumRating,
        commercialRating
    };
};

// Generate stadium name based on club data
const generateStadiumName = (club, nation) => {
    const templates = [
        // Location-based
        () => `${club.settlement || club.city || club.district || 'City'} Stadium`,
        () => `${club.region || club.district || 'Central'} Park`,
        () => `The ${club.settlement || club.city || club.district || ''} Ground`.trim(),
        // Club-based
        () => `${club.name.split(' ')[0]} Park`,
        () => `${club.nickname ? club.nickname + ' Arena' : club.name + ' Stadium'}`,
        // Historical
        () => `${club.founded_year ? 'Old ' + (club.settlement || club.city || 'Town') : club.name} Ground`,
        // Generic prestigious names
        () => `The ${['Meadow', 'Valley', 'Hill', 'Bridge', 'Lane', 'Fields'][Math.floor(Math.random() * 6)]}`,
        () => `${club.settlement || club.city || club.region || 'Town'} Athletic Ground`,
    ];
    
    // Pick based on hash of club name for consistency
    const hash = club.name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return templates[hash % templates.length]();
};

// Generate capacity based on tier and stability
const generateCapacity = (club, league) => {
    const tier = league?.tier || 4;
    const points = club.stability_points || 10;
    
    const baseCapacity = {
        1: 25000,
        2: 15000,
        3: 8000,
        4: 5000,
        5: 3000,
        6: 2000,
        7: 1500,
        8: 1000
    }[Math.min(8, tier)] || 800;
    
    // Adjust for stability
    const multiplier = 1 + (points / 50);
    const capacity = Math.round(baseCapacity * multiplier);
    
    // Round to nearest 500 or 1000
    if (capacity > 10000) return Math.round(capacity / 1000) * 1000;
    if (capacity > 2000) return Math.round(capacity / 500) * 500;
    return Math.round(capacity / 100) * 100;
};

const StarRating = ({ rating, max = 5 }) => (
    <div className="flex gap-0.5">
        {[...Array(max)].map((_, i) => (
            <Star 
                key={i} 
                className={`w-4 h-4 ${i < rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} 
            />
        ))}
    </div>
);

export default function ClubInfrastructure({ club, league, nation }) {
    const queryClient = useQueryClient();
    const [isEditing, setIsEditing] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [editData, setEditData] = useState({});
    
    const calculatedFacilities = useMemo(() => calculateFacilities(club, league), [club, league]);
    
    const updateMutation = useMutation({
        mutationFn: (data) => base44.entities.Club.update(club.id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['club', club.id]);
            setIsEditing(false);
        },
    });
    
    const handleEdit = () => {
        setEditData({
            stadium: club.stadium || '',
            stadium_capacity: club.stadium_capacity || '',
            has_youth_academy: club.has_youth_academy ?? calculatedFacilities.hasYouth,
            youth_academy_rating: club.youth_academy_rating || calculatedFacilities.youthRating,
            training_ground_rating: club.training_ground_rating || calculatedFacilities.trainingRating,
            stadium_rating: club.stadium_rating || calculatedFacilities.stadiumRating,
            commercial_rating: club.commercial_rating || calculatedFacilities.commercialRating,
        });
        setIsEditing(true);
    };
    
    const handleGenerate = async () => {
        setIsGenerating(true);
        
        const facilities = calculateFacilities(club, league);
        const stadium = generateStadiumName(club, nation);
        const capacity = generateCapacity(club, league);
        
        await base44.entities.Club.update(club.id, {
            stadium: stadium,
            stadium_capacity: capacity,
            has_youth_academy: facilities.hasYouth,
            youth_academy_rating: facilities.youthRating,
            training_ground_rating: facilities.trainingRating,
            stadium_rating: facilities.stadiumRating,
            commercial_rating: facilities.commercialRating,
        });
        
        queryClient.invalidateQueries(['club', club.id]);
        setIsGenerating(false);
    };
    
    const handleSave = () => {
        updateMutation.mutate({
            stadium: editData.stadium,
            stadium_capacity: parseInt(editData.stadium_capacity) || null,
            has_youth_academy: editData.has_youth_academy,
            youth_academy_rating: parseInt(editData.youth_academy_rating) || null,
            training_ground_rating: parseInt(editData.training_ground_rating) || null,
            stadium_rating: parseInt(editData.stadium_rating) || null,
            commercial_rating: parseInt(editData.commercial_rating) || null,
        });
    };
    
    // Use stored values or calculated defaults
    const facilities = {
        hasYouth: club.has_youth_academy ?? calculatedFacilities.hasYouth,
        youthRating: club.youth_academy_rating || calculatedFacilities.youthRating,
        trainingRating: club.training_ground_rating || calculatedFacilities.trainingRating,
        stadiumRating: club.stadium_rating || calculatedFacilities.stadiumRating,
        commercialRating: club.commercial_rating || calculatedFacilities.commercialRating,
    };
    
    const stabilityPoints = club.stability_points || 0;
    const isAtRisk = club.stability_status === 'at_risk' || club.stability_status === 'critical';
    
    if (isEditing) {
        return (
            <Card className="border-0 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Building2 className="w-5 h-5" />
                        Edit Infrastructure
                    </CardTitle>
                    <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Stadium Name</Label>
                            <Input 
                                value={editData.stadium} 
                                onChange={(e) => setEditData({...editData, stadium: e.target.value})}
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label>Capacity</Label>
                            <Input 
                                type="number"
                                value={editData.stadium_capacity} 
                                onChange={(e) => setEditData({...editData, stadium_capacity: e.target.value})}
                                className="mt-1"
                            />
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <input 
                            type="checkbox" 
                            checked={editData.has_youth_academy || false}
                            onChange={(e) => setEditData({...editData, has_youth_academy: e.target.checked})}
                            className="w-4 h-4 rounded"
                        />
                        <Label>Has Youth Academy</Label>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <Label>Youth Rating (1-5)</Label>
                            <Input 
                                type="number" min="0" max="5"
                                value={editData.youth_academy_rating || ''} 
                                onChange={(e) => setEditData({...editData, youth_academy_rating: e.target.value})}
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label>Training Rating (1-5)</Label>
                            <Input 
                                type="number" min="1" max="5"
                                value={editData.training_ground_rating || ''} 
                                onChange={(e) => setEditData({...editData, training_ground_rating: e.target.value})}
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label>Stadium Rating (1-5)</Label>
                            <Input 
                                type="number" min="1" max="5"
                                value={editData.stadium_rating || ''} 
                                onChange={(e) => setEditData({...editData, stadium_rating: e.target.value})}
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label>Commercial Rating (1-5)</Label>
                            <Input 
                                type="number" min="1" max="5"
                                value={editData.commercial_rating || ''} 
                                onChange={(e) => setEditData({...editData, commercial_rating: e.target.value})}
                                className="mt-1"
                            />
                        </div>
                    </div>
                    
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={updateMutation.isPending} className="bg-emerald-600">
                            {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            Save
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }
    
    return (
        <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Club Infrastructure
                </CardTitle>
                <AdminOnly>
                    <div className="flex gap-2">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleGenerate}
                            disabled={isGenerating}
                        >
                            {isGenerating ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <><Sparkles className="w-4 h-4 mr-1" /> Auto-Generate</>
                            )}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={handleEdit}>
                            <Edit2 className="w-4 h-4" />
                        </Button>
                    </div>
                </AdminOnly>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Professional Status */}
                <div className="p-4 bg-slate-50 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Briefcase className="w-5 h-5 text-slate-600" />
                        <span className="font-semibold">Club Status</span>
                    </div>
                    <ProfessionalStatusBadge status={club.professional_status} />
                </div>

                {/* Stability Impact Warning */}
                {isAtRisk && (
                    <div className="p-3 bg-red-50 rounded-lg border border-red-200 flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                        <div>
                            <div className="font-medium text-red-800">Financial Instability</div>
                            <div className="text-sm text-red-600">
                                Club facilities may be at risk due to low stability points ({stabilityPoints}).
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Stadium */}
                <div className="p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Building className="w-5 h-5 text-slate-600" />
                            <span className="font-semibold">Stadium</span>
                        </div>
                        <StarRating rating={facilities.stadiumRating} />
                    </div>
                    <div className="text-lg font-bold text-slate-800">
                        {club.stadium || 'No stadium assigned'}
                    </div>
                    {club.stadium_capacity && (
                        <div className="text-sm text-slate-500">
                            Capacity: {club.stadium_capacity.toLocaleString()}
                        </div>
                    )}
                </div>
                
                {/* Facilities Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Youth Academy */}
                    <div className={`p-4 rounded-lg ${facilities.hasYouth ? 'bg-green-50 border border-green-200' : 'bg-slate-100'}`}>
                        <div className="flex items-center gap-2 mb-2">
                            <GraduationCap className={`w-5 h-5 ${facilities.hasYouth ? 'text-green-600' : 'text-slate-400'}`} />
                            <span className="font-semibold">Youth Academy</span>
                        </div>
                        {facilities.hasYouth ? (
                            <>
                                <StarRating rating={facilities.youthRating} />
                                <p className="text-xs text-green-600 mt-1">Active youth development program</p>
                            </>
                        ) : (
                            <p className="text-sm text-slate-500">No youth academy</p>
                        )}
                    </div>
                    
                    {/* Training Ground */}
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2 mb-2">
                            <Users className="w-5 h-5 text-blue-600" />
                            <span className="font-semibold">Training Ground</span>
                        </div>
                        <StarRating rating={facilities.trainingRating} />
                        <p className="text-xs text-blue-600 mt-1">
                            {facilities.trainingRating >= 4 ? 'Elite facilities' : 
                             facilities.trainingRating >= 3 ? 'Good facilities' : 
                             facilities.trainingRating >= 2 ? 'Basic facilities' : 'Minimal facilities'}
                        </p>
                    </div>
                    
                    {/* Commercial */}
                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                        <div className="flex items-center gap-2 mb-2">
                            <Banknote className="w-5 h-5 text-purple-600" />
                            <span className="font-semibold">Commercial</span>
                        </div>
                        <StarRating rating={facilities.commercialRating} />
                        <p className="text-xs text-purple-600 mt-1">
                            {facilities.commercialRating >= 4 ? 'Major sponsorship deals' : 
                             facilities.commercialRating >= 3 ? 'Moderate commercial income' : 
                             facilities.commercialRating >= 2 ? 'Limited sponsorship' : 'Minimal commercial activity'}
                        </p>
                    </div>
                </div>
                
                {/* Stability Impact */}
                <div className="p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-slate-700">Financial Health</span>
                        <Badge className={
                            stabilityPoints >= 20 ? 'bg-green-100 text-green-800' :
                            stabilityPoints >= 10 ? 'bg-blue-100 text-blue-800' :
                            stabilityPoints >= 0 ? 'bg-amber-100 text-amber-800' :
                            'bg-red-100 text-red-800'
                        }>
                            {stabilityPoints} stability points
                        </Badge>
                    </div>
                    <Progress 
                        value={Math.min(100, Math.max(0, (stabilityPoints + 10) * 2))} 
                        className="h-2"
                    />
                    <p className="text-xs text-slate-500 mt-2">
                        {stabilityPoints >= 20 ? 'Excellent financial position - can invest in facilities' :
                         stabilityPoints >= 10 ? 'Stable finances - maintaining current infrastructure' :
                         stabilityPoints >= 0 ? 'Tight budget - limited facility improvements' :
                         stabilityPoints >= -5 ? 'Financial strain - facilities may decline' :
                         'Critical - club infrastructure at risk of deterioration'}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}