import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Edit2, Save, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function MapEditor({ entity, type, onClose, onUpdate }) {
    const [editData, setEditData] = useState(entity || {});
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            if (type === 'nation') {
                await base44.entities.Nation.update(entity.id, editData);
            } else if (type === 'club') {
                await base44.entities.Club.update(entity.id, editData);
            } else if (type === 'location') {
                await base44.entities.Location.update(entity.id, editData);
            }
            toast.success('Updated successfully');
            onUpdate?.();
            onClose?.();
        } catch (error) {
            toast.error(`Failed to update: ${error.message}`);
        } finally {
            setSaving(false);
        }
    };

    if (type === 'nation') {
        return (
            <Dialog open={true} onOpenChange={onClose}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Edit Nation: {entity.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label>Name</Label>
                            <Input value={editData.name || ''} onChange={(e) => setEditData({...editData, name: e.target.value})} className="mt-1" />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Latitude (Center)</Label>
                                <Input type="number" value={editData.latitude || ''} onChange={(e) => setEditData({...editData, latitude: parseFloat(e.target.value)})} className="mt-1" />
                            </div>
                            <div>
                                <Label>Longitude (Center)</Label>
                                <Input type="number" value={editData.longitude || ''} onChange={(e) => setEditData({...editData, longitude: parseFloat(e.target.value)})} className="mt-1" />
                            </div>
                        </div>

                        <div>
                            <Label>Nation Borders (0-1000 coordinates)</Label>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                                <div>
                                    <Label className="text-xs">North</Label>
                                    <Input 
                                        type="number" 
                                        value={editData.map_bounds?.north || ''} 
                                        onChange={(e) => setEditData({...editData, map_bounds: {...(editData.map_bounds || {}), north: parseFloat(e.target.value)}})} 
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">South</Label>
                                    <Input 
                                        type="number" 
                                        value={editData.map_bounds?.south || ''} 
                                        onChange={(e) => setEditData({...editData, map_bounds: {...(editData.map_bounds || {}), south: parseFloat(e.target.value)}})} 
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">East</Label>
                                    <Input 
                                        type="number" 
                                        value={editData.map_bounds?.east || ''} 
                                        onChange={(e) => setEditData({...editData, map_bounds: {...(editData.map_bounds || {}), east: parseFloat(e.target.value)}})} 
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">West</Label>
                                    <Input 
                                        type="number" 
                                        value={editData.map_bounds?.west || ''} 
                                        onChange={(e) => setEditData({...editData, map_bounds: {...(editData.map_bounds || {}), west: parseFloat(e.target.value)}})} 
                                        className="mt-1"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={onClose}>Cancel</Button>
                            <Button onClick={handleSave} disabled={saving}>
                                <Save className="w-4 h-4 mr-2" /> Save Changes
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    if (type === 'club') {
        return (
            <Dialog open={true} onOpenChange={onClose}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Club: {entity.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label>Name</Label>
                            <Input value={editData.name || ''} onChange={(e) => setEditData({...editData, name: e.target.value})} className="mt-1" />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Latitude</Label>
                                <Input type="number" value={editData.latitude || ''} onChange={(e) => setEditData({...editData, latitude: parseFloat(e.target.value)})} className="mt-1" />
                            </div>
                            <div>
                                <Label>Longitude</Label>
                                <Input type="number" value={editData.longitude || ''} onChange={(e) => setEditData({...editData, longitude: parseFloat(e.target.value)})} className="mt-1" />
                            </div>
                        </div>

                        <div>
                            <Label>Settlement/City</Label>
                            <Input value={editData.settlement || editData.city || ''} onChange={(e) => setEditData({...editData, settlement: e.target.value})} className="mt-1" />
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={onClose}>Cancel</Button>
                            <Button onClick={handleSave} disabled={saving}>
                                <Save className="w-4 h-4 mr-2" /> Save Changes
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    if (type === 'location') {
        return (
            <Dialog open={true} onOpenChange={onClose}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Location: {entity.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label>Name</Label>
                            <Input value={editData.name || ''} onChange={(e) => setEditData({...editData, name: e.target.value})} className="mt-1" />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Latitude</Label>
                                <Input type="number" value={editData.latitude || ''} onChange={(e) => setEditData({...editData, latitude: parseFloat(e.target.value)})} className="mt-1" />
                            </div>
                            <div>
                                <Label>Longitude</Label>
                                <Input type="number" value={editData.longitude || ''} onChange={(e) => setEditData({...editData, longitude: parseFloat(e.target.value)})} className="mt-1" />
                            </div>
                        </div>

                        <div>
                            <Label>Type</Label>
                            <select 
                                value={editData.type || 'settlement'} 
                                onChange={(e) => setEditData({...editData, type: e.target.value})}
                                className="w-full mt-1 px-3 py-2 border rounded-lg"
                            >
                                <option value="region">Region</option>
                                <option value="district">District</option>
                                <option value="settlement">Settlement</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <input 
                                type="checkbox" 
                                id="capital" 
                                checked={editData.is_capital || false}
                                onChange={(e) => setEditData({...editData, is_capital: e.target.checked})}
                                className="rounded"
                            />
                            <Label htmlFor="capital" className="cursor-pointer">Capital City</Label>
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={onClose}>Cancel</Button>
                            <Button onClick={handleSave} disabled={saving}>
                                <Save className="w-4 h-4 mr-2" /> Save Changes
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    return null;
}