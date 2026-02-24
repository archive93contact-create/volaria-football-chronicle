import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Loader2, X, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function BulkClubEditor({ selectedClubs, onComplete, onCancel }) {
    const [updating, setUpdating] = useState(false);
    const [bulkData, setBulkData] = useState({
        settlement: '',
        district: '',
        region: '',
        founded_year: '',
    });

    const handleBulkUpdate = async () => {
        if (!selectedClubs.length) return;
        
        setUpdating(true);
        try {
            // Only include fields that have values
            const updateData = {};
            if (bulkData.settlement) updateData.settlement = bulkData.settlement;
            if (bulkData.district) updateData.district = bulkData.district;
            if (bulkData.region) updateData.region = bulkData.region;
            if (bulkData.founded_year) updateData.founded_year = parseInt(bulkData.founded_year);

            if (Object.keys(updateData).length === 0) {
                toast.error('Please enter at least one field to update');
                setUpdating(false);
                return;
            }

            // Update all selected clubs
            await Promise.all(
                selectedClubs.map(club => base44.entities.Club.update(club.id, updateData))
            );

            toast.success(`Updated ${selectedClubs.length} club${selectedClubs.length > 1 ? 's' : ''}`);
            onComplete();
        } catch (error) {
            console.error('Error updating clubs:', error);
            toast.error('Failed to update clubs');
        } finally {
            setUpdating(false);
        }
    };

    return (
        <Card className="border-emerald-200 shadow-lg">
            <CardHeader className="bg-emerald-50 border-b border-emerald-100">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Check className="w-5 h-5 text-emerald-600" />
                        Bulk Edit {selectedClubs.length} Club{selectedClubs.length > 1 ? 's' : ''}
                    </CardTitle>
                    <Button variant="ghost" size="icon" onClick={onCancel}>
                        <X className="w-4 h-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-6">
                {/* Selected clubs preview */}
                <div className="mb-6">
                    <Label className="text-sm text-slate-600 mb-2 block">Selected Clubs:</Label>
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-3 bg-slate-50 rounded-lg">
                        {selectedClubs.map(club => (
                            <Badge key={club.id} variant="outline" className="bg-white">
                                {club.name}
                            </Badge>
                        ))}
                    </div>
                </div>

                {/* Bulk edit fields */}
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <Label htmlFor="settlement" className="flex items-center gap-2 mb-2">
                                <MapPin className="w-4 h-4 text-slate-500" />
                                Settlement/Town
                            </Label>
                            <Input
                                id="settlement"
                                value={bulkData.settlement}
                                onChange={(e) => setBulkData({ ...bulkData, settlement: e.target.value })}
                                placeholder="e.g., Manchester"
                            />
                        </div>

                        <div>
                            <Label htmlFor="district" className="flex items-center gap-2 mb-2">
                                <MapPin className="w-4 h-4 text-slate-500" />
                                District
                            </Label>
                            <Input
                                id="district"
                                value={bulkData.district}
                                onChange={(e) => setBulkData({ ...bulkData, district: e.target.value })}
                                placeholder="e.g., Greater Manchester"
                            />
                        </div>

                        <div>
                            <Label htmlFor="region" className="flex items-center gap-2 mb-2">
                                <MapPin className="w-4 h-4 text-slate-500" />
                                Region
                            </Label>
                            <Input
                                id="region"
                                value={bulkData.region}
                                onChange={(e) => setBulkData({ ...bulkData, region: e.target.value })}
                                placeholder="e.g., North West"
                            />
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="founded" className="flex items-center gap-2 mb-2">
                            <Calendar className="w-4 h-4 text-slate-500" />
                            Founded Year
                        </Label>
                        <Input
                            id="founded"
                            type="number"
                            value={bulkData.founded_year}
                            onChange={(e) => setBulkData({ ...bulkData, founded_year: e.target.value })}
                            placeholder="e.g., 1878"
                            className="w-full md:w-48"
                        />
                    </div>
                </div>

                {/* Info message */}
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                    💡 Only filled fields will be updated. Empty fields will not change existing data.
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-6 justify-end">
                    <Button variant="outline" onClick={onCancel} disabled={updating}>
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleBulkUpdate} 
                        disabled={updating}
                        className="bg-emerald-600 hover:bg-emerald-700"
                    >
                        {updating ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Updating...
                            </>
                        ) : (
                            <>
                                <Check className="w-4 h-4 mr-2" />
                                Update {selectedClubs.length} Club{selectedClubs.length > 1 ? 's' : ''}
                            </>
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}