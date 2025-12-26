import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Mountain, Map } from 'lucide-react';
import { toast } from 'sonner';

export default function TerrainGenerator({ nations, onComplete }) {
    const [open, setOpen] = useState(false);
    const [generating, setGenerating] = useState(false);

    const generateTerrain = async () => {
        setGenerating(true);
        toast.loading('🗺️ Generating world terrain map...', { id: 'terrain-gen', duration: Infinity });

        try {
            // Generate terrain maps for each nation
            for (const nation of nations) {
                if (nation.map_bounds) {
                    toast.loading(`Generating terrain for ${nation.name}...`, { id: 'terrain-gen' });
                    
                    const terrainPrompt = `Create a detailed cartographic terrain map for ${nation.name}, a fictional nation in the world of Volaria.

Geography details:
- Region: ${nation.region || 'varied terrain'}
- Culture: ${nation.culture || 'diverse'}
- Geography: ${nation.geography || 'mountains, valleys, coastlines, forests'}

Style requirements:
- Topographic map style with terrain elevation colors (greens for lowlands, yellows/browns for highlands, whites for peaks)
- Show mountain ranges, rivers, forests, coastlines if coastal
- Cartographic style like a physical geography map
- Include relief shading to show elevation
- Natural terrain colors (avoid political boundaries colors)
- Should look like a National Geographic physical map
- No text labels, just pure terrain visualization
- High detail, realistic geographic features

The map should feel ancient and authentic, like a hand-drawn cartographer's work but with modern detail.`;

                    const terrainImage = await base44.integrations.Core.GenerateImage({
                        prompt: terrainPrompt
                    });

                    if (terrainImage?.url) {
                        await base44.entities.Nation.update(nation.id, {
                            map_url: terrainImage.url
                        });
                    }
                }
            }

            toast.dismiss('terrain-gen');
            toast.success('Terrain maps generated! Reload to see the updated map.');
            setOpen(false);
            onComplete?.();
        } catch (error) {
            toast.dismiss('terrain-gen');
            toast.error(`Failed to generate terrain: ${error.message}`);
        } finally {
            setGenerating(false);
        }
    };

    return (
        <>
            <Button onClick={() => setOpen(true)} className="bg-green-600 hover:bg-green-700">
                <Mountain className="w-4 h-4 mr-2" />
                Generate Terrain Maps
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Generate Terrain Maps</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg mb-4">
                            <Mountain className="w-5 h-5 text-green-600 mt-0.5" />
                            <div className="flex-1 text-sm">
                                <p className="font-semibold text-green-900 mb-1">AI Terrain Generation</p>
                                <p className="text-green-700 mb-2">
                                    Creates realistic topographic terrain maps for all {nations.filter(n => n.map_bounds).length} nations with defined borders.
                                </p>
                                <ul className="space-y-1 text-green-600">
                                    <li>• Physical geography visualization (mountains, valleys, rivers)</li>
                                    <li>• Elevation-based coloring and relief shading</li>
                                    <li>• Cartographic style like National Geographic</li>
                                    <li>• Based on each nation's cultural and geographic descriptions</li>
                                </ul>
                            </div>
                        </div>

                        <p className="text-sm text-slate-500 mb-6">
                            Takes 2-5 minutes. Each nation gets a unique terrain map. This creates immersive visual geography.
                        </p>

                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setOpen(false)} disabled={generating}>
                                Cancel
                            </Button>
                            <Button 
                                onClick={generateTerrain} 
                                disabled={generating}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                {generating ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Mountain className="w-4 h-4 mr-2" />
                                        Generate Terrain
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}