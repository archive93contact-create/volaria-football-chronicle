import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Calendar, Loader2, X, Check, Shield } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function BulkClubEditor({ selectedClubs, onComplete, onCancel }) {
    const [updating, setUpdating] = useState(false);
    const [clubData, setClubData] = useState(() => {
        const initial = {};
        selectedClubs.forEach(club => {
            initial[club.id] = {
                settlement: club.settlement || '',
                district: club.district || '',
                region: club.region || '',
                founded_year: club.founded_year || '',
            };
        });
        return initial;
    });

    const handleFieldChange = (clubId, field, value) => {
        setClubData(prev => ({
            ...prev,
            [clubId]: {
                ...prev[clubId],
                [field]: value
            }
        }));
    };

    const handleBulkUpdate = async () => {
        if (!selectedClubs.length) return;
        
        setUpdating(true);
        try {
            const updates = selectedClubs.map(club => {
                const data = clubData[club.id];
                const updateData = {};
                
                if (data.settlement !== club.settlement) updateData.settlement = data.settlement;
                if (data.district !== club.district) updateData.district = data.district;
                if (data.region !== club.region) updateData.region = data.region;
                if (data.founded_year && data.founded_year !== club.founded_year) {
                    updateData.founded_year = parseInt(data.founded_year);
                }

                if (Object.keys(updateData).length > 0) {
                    return base44.entities.Club.update(club.id, updateData);
                }
                return null;
            }).filter(Boolean);

            if (updates.length === 0) {
                toast.error('No changes to save');
                setUpdating(false);
                return;
            }

            await Promise.all(updates);

            toast.success(`Updated ${updates.length} club${updates.length > 1 ? 's' : ''}`);
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
                {/* Info message */}
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                    💡 Edit each club individually below. Only changed fields will be updated.
                </div>

                {/* Spreadsheet-style editor */}
                <div className="border rounded-lg overflow-hidden max-h-[600px] overflow-y-auto">
                    <Table>
                        <TableHeader className="sticky top-0 bg-slate-100 z-10">
                            <TableRow>
                                <TableHead className="w-48">Club</TableHead>
                                <TableHead className="w-40">Settlement/Town</TableHead>
                                <TableHead className="w-40">District</TableHead>
                                <TableHead className="w-40">Region</TableHead>
                                <TableHead className="w-32">Founded Year</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {selectedClubs.map(club => (
                                <TableRow key={club.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {club.logo_url ? (
                                                <img src={club.logo_url} alt="" className="w-6 h-6 object-contain" />
                                            ) : (
                                                <Shield className="w-4 h-4 text-slate-400" />
                                            )}
                                            <span className="font-medium text-sm">{club.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            value={clubData[club.id]?.settlement || ''}
                                            onChange={(e) => handleFieldChange(club.id, 'settlement', e.target.value)}
                                            placeholder="Town/City"
                                            className="h-8"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            value={clubData[club.id]?.district || ''}
                                            onChange={(e) => handleFieldChange(club.id, 'district', e.target.value)}
                                            placeholder="District"
                                            className="h-8"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            value={clubData[club.id]?.region || ''}
                                            onChange={(e) => handleFieldChange(club.id, 'region', e.target.value)}
                                            placeholder="Region"
                                            className="h-8"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            value={clubData[club.id]?.founded_year || ''}
                                            onChange={(e) => handleFieldChange(club.id, 'founded_year', e.target.value)}
                                            placeholder="Year"
                                            className="h-8"
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
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
                                Save Changes
                            </>
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}