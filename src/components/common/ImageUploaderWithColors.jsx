import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, Loader2, Palette, Pipette } from "lucide-react";
import { base44 } from '@/api/base44Client';

// Extract dominant colors from an image
const extractColors = (img, numColors = 2) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const size = 100; // Sample size
    canvas.width = size;
    canvas.height = size;
    
    ctx.drawImage(img, 0, 0, size, size);
    const imageData = ctx.getImageData(0, 0, size, size).data;
    
    // Collect all non-white/non-transparent colors
    const colorCounts = {};
    for (let i = 0; i < imageData.length; i += 4) {
        const r = imageData[i];
        const g = imageData[i + 1];
        const b = imageData[i + 2];
        const a = imageData[i + 3];
        
        // Skip transparent or near-white pixels
        if (a < 128) continue;
        if (r > 240 && g > 240 && b > 240) continue;
        
        // Quantize colors to reduce noise
        const qr = Math.round(r / 32) * 32;
        const qg = Math.round(g / 32) * 32;
        const qb = Math.round(b / 32) * 32;
        const key = `${qr},${qg},${qb}`;
        colorCounts[key] = (colorCounts[key] || 0) + 1;
    }
    
    // Sort by frequency and get top colors
    const sorted = Object.entries(colorCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, numColors * 3); // Get extra to find distinct colors
    
    if (sorted.length === 0) return ['#1e40af', '#3b82f6'];
    
    const colors = [];
    for (const [key] of sorted) {
        const [r, g, b] = key.split(',').map(Number);
        const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        
        // Check if this color is distinct enough from existing colors
        const isDifferent = colors.every(existing => {
            const er = parseInt(existing.slice(1, 3), 16);
            const eg = parseInt(existing.slice(3, 5), 16);
            const eb = parseInt(existing.slice(5, 7), 16);
            const diff = Math.abs(r - er) + Math.abs(g - eg) + Math.abs(b - eb);
            return diff > 100; // Threshold for "different" color
        });
        
        if (isDifferent || colors.length === 0) {
            colors.push(hex);
            if (colors.length >= numColors) break;
        }
    }
    
    // Pad with defaults if needed
    while (colors.length < numColors) {
        colors.push(colors.length === 0 ? '#1e40af' : '#3b82f6');
    }
    
    return colors;
};

export default function ImageUploaderWithColors({ 
    currentImage, 
    onUpload, 
    primaryColor,
    secondaryColor,
    onColorsChange,
    label = "Upload Image", 
    className = "",
    showColorExtraction = true
}) {
    const [isUploading, setIsUploading] = useState(false);
    const [isExtracting, setIsExtracting] = useState(false);
    const imgRef = useRef(null);

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            onUpload(file_url);
            
            // Auto-extract colors after upload if enabled
            if (showColorExtraction && onColorsChange) {
                setTimeout(() => extractColorsFromUrl(file_url), 500);
            }
        } catch (error) {
            console.error('Upload failed:', error);
        } finally {
            setIsUploading(false);
        }
    };

    const extractColorsFromUrl = (url) => {
        if (!url || !onColorsChange) return;
        
        setIsExtracting(true);
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const colors = extractColors(img, 2);
            onColorsChange(colors[0], colors[1]);
            setIsExtracting(false);
        };
        img.onerror = () => {
            setIsExtracting(false);
        };
        img.src = url;
    };

    return (
        <div className={`flex flex-col items-center gap-3 ${className}`}>
            {currentImage ? (
                <div className="relative group">
                    <img 
                        ref={imgRef}
                        src={currentImage} 
                        alt="Uploaded" 
                        className="w-32 h-32 object-contain rounded-lg border border-slate-200 bg-white p-2"
                        crossOrigin="anonymous"
                    />
                    <button
                        onClick={() => onUpload('')}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <X className="w-3 h-3" />
                    </button>
                </div>
            ) : (
                <div className="w-32 h-32 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center bg-slate-50">
                    <Upload className="w-8 h-8 text-slate-400" />
                </div>
            )}
            
            <label className="cursor-pointer">
                <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                />
                <Button variant="outline" size="sm" disabled={isUploading} asChild>
                    <span>
                        {isUploading ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</>
                        ) : (
                            <><Upload className="w-4 h-4 mr-2" /> {label}</>
                        )}
                    </span>
                </Button>
            </label>

            {/* Color Extraction & Manual Override */}
            {showColorExtraction && onColorsChange && (
                <div className="w-full space-y-2 mt-2">
                    <div className="flex items-center justify-between">
                        <Label className="text-xs text-slate-500 flex items-center gap-1">
                            <Palette className="w-3 h-3" /> Colors
                        </Label>
                        {currentImage && (
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => extractColorsFromUrl(currentImage)}
                                disabled={isExtracting}
                                className="h-6 text-xs"
                            >
                                {isExtracting ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                    <><Pipette className="w-3 h-3 mr-1" /> Auto-detect</>
                                )}
                            </Button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <Label className="text-xs">Primary</Label>
                            <div className="flex gap-1 mt-1">
                                <Input
                                    type="color"
                                    value={primaryColor || '#1e40af'}
                                    onChange={(e) => onColorsChange(e.target.value, secondaryColor)}
                                    className="w-10 h-8 p-1 cursor-pointer"
                                />
                                <Input
                                    value={primaryColor || ''}
                                    onChange={(e) => onColorsChange(e.target.value, secondaryColor)}
                                    placeholder="#1e40af"
                                    className="flex-1 h-8 text-xs"
                                />
                            </div>
                        </div>
                        <div className="flex-1">
                            <Label className="text-xs">Secondary</Label>
                            <div className="flex gap-1 mt-1">
                                <Input
                                    type="color"
                                    value={secondaryColor || '#3b82f6'}
                                    onChange={(e) => onColorsChange(primaryColor, e.target.value)}
                                    className="w-10 h-8 p-1 cursor-pointer"
                                />
                                <Input
                                    value={secondaryColor || ''}
                                    onChange={(e) => onColorsChange(primaryColor, e.target.value)}
                                    placeholder="#3b82f6"
                                    className="flex-1 h-8 text-xs"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}