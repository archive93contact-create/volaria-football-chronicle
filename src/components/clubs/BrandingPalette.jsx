import React from 'react';
import { Palette, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function BrandingPalette({ club, editData, setEditData }) {
    return (
        <div className="border-t pt-4 mt-4">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Palette className="w-4 h-4" /> 
                Branding Palette
            </h4>
            <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg space-y-4">
                <div>
                    <Label className="text-xs">Accent Color (for highlights)</Label>
                    <div className="flex gap-2 mt-1">
                        <input 
                            type="color" 
                            value={editData.accent_color || '#10b981'} 
                            onChange={(e) => setEditData({...editData, accent_color: e.target.value})}
                            className="w-12 h-10 rounded cursor-pointer"
                        />
                        <input 
                            type="text" 
                            value={editData.accent_color || ''} 
                            onChange={(e) => setEditData({...editData, accent_color: e.target.value})}
                            placeholder="#10b981"
                            className="flex-1 px-3 py-2 border rounded text-sm"
                        />
                    </div>
                </div>

                <div>
                    <Label className="text-xs">Kit Pattern</Label>
                    <Select 
                        value={editData.kit_pattern || 'solid'} 
                        onValueChange={(v) => setEditData({...editData, kit_pattern: v})}
                    >
                        <SelectTrigger className="mt-1">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="solid">Solid</SelectItem>
                            <SelectItem value="vertical_stripes">Vertical Stripes</SelectItem>
                            <SelectItem value="horizontal_stripes">Horizontal Stripes</SelectItem>
                            <SelectItem value="hoops">Hoops</SelectItem>
                            <SelectItem value="sash">Sash</SelectItem>
                            <SelectItem value="halves">Halves</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div>
                    <Label className="text-xs">Stadium Atmosphere</Label>
                    <Select 
                        value={editData.stadium_atmosphere || ''} 
                        onValueChange={(v) => setEditData({...editData, stadium_atmosphere: v})}
                    >
                        <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select atmosphere" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="electric">Electric</SelectItem>
                            <SelectItem value="intimate">Intimate</SelectItem>
                            <SelectItem value="traditional">Traditional</SelectItem>
                            <SelectItem value="modern">Modern</SelectItem>
                            <SelectItem value="passionate">Passionate</SelectItem>
                            <SelectItem value="family-friendly">Family-Friendly</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="pt-2 text-xs text-slate-500 flex items-center gap-2">
                    <Sparkles className="w-3 h-3" />
                    These settings customize your club's visual identity and kit generation
                </div>
            </div>
        </div>
    );
}