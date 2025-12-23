import React, { useState } from 'react';
import { Wand2, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { toast } from 'sonner';

// Extract dominant colors from an image
const extractColorsFromImage = async (imageUrl) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                const colorMap = {};
                
                // Sample pixels and count colors
                for (let i = 0; i < data.length; i += 40) { // Sample every 10th pixel
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    const a = data[i + 3];
                    
                    // Skip transparent or very light/dark pixels
                    if (a < 128 || (r > 240 && g > 240 && b > 240) || (r < 15 && g < 15 && b < 15)) continue;
                    
                    // Quantize color to reduce variations
                    const qr = Math.round(r / 32) * 32;
                    const qg = Math.round(g / 32) * 32;
                    const qb = Math.round(b / 32) * 32;
                    const key = `${qr},${qg},${qb}`;
                    
                    colorMap[key] = (colorMap[key] || 0) + 1;
                }
                
                // Sort by frequency and get top colors
                const sortedColors = Object.entries(colorMap)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([rgb]) => {
                        const [r, g, b] = rgb.split(',').map(Number);
                        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
                    });
                
                resolve(sortedColors);
            } catch (error) {
                reject(error);
            }
        };
        
        img.onerror = reject;
        img.src = imageUrl;
    });
};

export default function ColorExtractor({ imageUrl, onColorsExtracted, buttonText = "Auto-Detect Colors" }) {
    const [extracting, setExtracting] = useState(false);

    const handleExtract = async () => {
        if (!imageUrl) {
            toast.error('No image to extract colors from');
            return;
        }

        setExtracting(true);
        try {
            const colors = await extractColorsFromImage(imageUrl);
            
            if (colors.length >= 2) {
                onColorsExtracted({
                    primary: colors[0],
                    secondary: colors[1],
                    accent: colors[2] || colors[1]
                });
                toast.success('Colors extracted from image!');
            } else {
                toast.error('Could not extract enough colors from image');
            }
        } catch (error) {
            toast.error('Failed to extract colors');
            console.error(error);
        } finally {
            setExtracting(false);
        }
    };

    return (
        <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExtract}
            disabled={extracting || !imageUrl}
            className="w-full"
        >
            {extracting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Extracting...</>
            ) : (
                <><Wand2 className="w-4 h-4 mr-2" /> {buttonText}</>
            )}
        </Button>
    );
}