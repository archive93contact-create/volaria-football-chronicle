import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Image as ImageIcon, Map as MapIcon } from 'lucide-react';
import { toast } from 'sonner';

export default function AILocationImagery({ location, locationType, nation, onImageGenerated }) {
    const [generating, setGenerating] = useState(false);
    const [generatingMap, setGeneratingMap] = useState(false);

    const generateLocationImage = async () => {
        setGenerating(true);
        try {
            // Build comprehensive prompt based on location data
            const sizeDesc = location.settlement_size || 'settlement';
            const capitalText = location.is_capital ? 'national capital' : '';
            
            // Get geographical context
            const geoContext = location.geography || 'diverse landscape';
            const cultureContext = location.culture_description || nation?.culture || '';
            const economicContext = location.industries || '';
            
            const prompt = `Ultra-realistic modern photograph of a contemporary ${capitalText} ${sizeDesc} called ${location.name}. 
MODERN DAY SETTING - NOT FANTASY, NOT MEDIEVAL. Show real-world contemporary architecture, modern buildings, paved streets, cars, buses, street signs, traffic lights.
${geoContext}. ${cultureContext}. 
${economicContext ? `Economic activity: ${economicContext}.` : ''}
Realistic urban/suburban environment with: modern storefronts, contemporary street furniture, normal everyday people in modern clothing, regular vehicles.
Professional photography, natural lighting, looks like a real place you could visit today.
${location.landmarks ? `Include: ${location.landmarks}` : ''}
Reference: Google Street View aesthetic, National Geographic photography, real city photography - NOT fantasy art, NOT medieval, NOT historical reenactment.`;

            const result = await base44.integrations.Core.GenerateImage({
                prompt: prompt.trim()
            });

            if (result?.url) {
                // Update location with image
                await base44.entities.Location.update(location.id, {
                    ...location,
                    image_url: result.url
                });
                
                toast.success('Location image generated!');
                onImageGenerated?.(result.url);
            }
        } catch (error) {
            toast.error('Failed to generate image');
            console.error(error);
        } finally {
            setGenerating(false);
        }
    };

    const generateLocationMap = async () => {
        setGeneratingMap(true);
        try {
            const sizeDesc = location.settlement_size || locationType;
            const clubs = location.club_ids?.length || 0;
            
            const prompt = `Detailed, realistic cartographic map showing ${location.name}, a ${sizeDesc} in ${nation?.name}. 
${location.geography || 'varied terrain'}. 
Professional cartography style with: roads, districts, landmarks, rivers, terrain features, parks, stadiums.
${clubs > 0 ? `Mark ${clubs} football stadium location${clubs > 1 ? 's' : ''}.` : ''}
${location.landmarks ? `Include: ${location.landmarks}.` : ''}
Realistic colors, topographic details, labeled streets and areas, Google Maps aesthetic.`;

            const result = await base44.integrations.Core.GenerateImage({
                prompt: prompt.trim()
            });

            if (result?.url) {
                await base44.entities.Location.update(location.id, {
                    ...location,
                    map_url: result.url
                });
                
                toast.success('Location map generated!');
                onImageGenerated?.(result.url, true);
            }
        } catch (error) {
            toast.error('Failed to generate map');
            console.error(error);
        } finally {
            setGeneratingMap(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Location Photo */}
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-4">
                        {location.image_url ? (
                            <div className="space-y-3">
                                <img 
                                    src={location.image_url} 
                                    alt={location.name}
                                    className="w-full h-48 object-cover rounded-lg"
                                />
                                <Button 
                                    onClick={generateLocationImage}
                                    disabled={generating}
                                    size="sm"
                                    variant="outline"
                                    className="w-full"
                                >
                                    {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ImageIcon className="w-4 h-4 mr-2" />}
                                    Regenerate Photo
                                </Button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-slate-300 rounded-lg">
                                <ImageIcon className="w-12 h-12 text-slate-400 mb-3" />
                                <Button 
                                    onClick={generateLocationImage}
                                    disabled={generating}
                                    size="sm"
                                >
                                    {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ImageIcon className="w-4 h-4 mr-2" />}
                                    Generate Photo
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Location Map */}
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-4">
                        {location.map_url ? (
                            <div className="space-y-3">
                                <img 
                                    src={location.map_url} 
                                    alt={`${location.name} map`}
                                    className="w-full h-48 object-cover rounded-lg"
                                />
                                <Button 
                                    onClick={generateLocationMap}
                                    disabled={generatingMap}
                                    size="sm"
                                    variant="outline"
                                    className="w-full"
                                >
                                    {generatingMap ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MapIcon className="w-4 h-4 mr-2" />}
                                    Regenerate Map
                                </Button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-slate-300 rounded-lg">
                                <MapIcon className="w-12 h-12 text-slate-400 mb-3" />
                                <Button 
                                    onClick={generateLocationMap}
                                    disabled={generatingMap}
                                    size="sm"
                                >
                                    {generatingMap ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MapIcon className="w-4 h-4 mr-2" />}
                                    Generate Map
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}