import React, { useState } from 'react';
import { Shirt, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function KitDisplay({ club, onKitsGenerated }) {
    const [generating, setGenerating] = useState(false);
    const [generatingType, setGeneratingType] = useState(null);

    const generateKit = async (type) => {
        if (!club.primary_color) {
            toast.error('Please set club colors first');
            return;
        }

        setGenerating(true);
        setGeneratingType(type);

        try {
            const pattern = club.kit_pattern || 'solid';
            const primary = club.primary_color;
            const secondary = club.secondary_color || primary;
            
            let prompt = '';
            
            if (type === 'home') {
                prompt = `Professional football soccer kit jersey, ${pattern === 'vertical_stripes' ? 'vertical striped' : pattern === 'horizontal_stripes' ? 'horizontal striped' : pattern === 'hoops' ? 'horizontal hooped' : pattern === 'sash' ? 'diagonal sash' : pattern === 'halves' ? 'half and half' : 'solid'} design, primary color ${primary}, secondary color ${secondary}, clean modern style, front view, no background, product photography, high quality, isolated on white background`;
            } else if (type === 'away') {
                // Invert colors for away kit
                prompt = `Professional football soccer kit jersey, ${pattern === 'vertical_stripes' ? 'vertical striped' : pattern === 'horizontal_stripes' ? 'horizontal striped' : pattern === 'hoops' ? 'horizontal hooped' : pattern === 'sash' ? 'diagonal sash' : pattern === 'halves' ? 'half and half' : 'solid'} design, primary color ${secondary}, secondary color ${primary}, clean modern style, front view, no background, product photography, high quality, isolated on white background`;
            } else {
                // Third kit with accent color
                const accent = club.accent_color || '#ffffff';
                prompt = `Professional football soccer kit jersey, solid or simple design, primary color ${accent}, clean modern style, front view, no background, product photography, high quality, isolated on white background`;
            }

            const result = await base44.integrations.Core.GenerateImage({
                prompt,
                existing_image_urls: club.logo_url ? [club.logo_url] : []
            });

            if (result?.url) {
                const updates = {};
                if (type === 'home') updates.home_kit_url = result.url;
                else if (type === 'away') updates.away_kit_url = result.url;
                else updates.third_kit_url = result.url;
                
                await base44.entities.Club.update(club.id, updates);
                
                if (onKitsGenerated) {
                    onKitsGenerated({ ...club, ...updates });
                }
                
                toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} kit generated!`);
            }
        } catch (error) {
            toast.error('Failed to generate kit');
            console.error(error);
        } finally {
            setGenerating(false);
            setGeneratingType(null);
        }
    };

    const hasAnyKit = club.home_kit_url || club.away_kit_url || club.third_kit_url;

    return (
        <Card className="border-0 shadow-sm bg-gradient-to-br from-slate-50 to-slate-100">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Shirt className="w-5 h-5 text-emerald-600" />
                    Club Kits
                    {hasAnyKit && <Badge className="bg-emerald-500">AI Generated</Badge>}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-3 gap-4">
                    {/* Home Kit */}
                    <div className="text-center">
                        <div className="aspect-square bg-white rounded-lg border-2 border-slate-200 mb-2 flex items-center justify-center overflow-hidden">
                            {club.home_kit_url ? (
                                <img src={club.home_kit_url} alt="Home kit" className="w-full h-full object-contain p-2" />
                            ) : (
                                <Shirt className="w-12 h-12 text-slate-300" />
                            )}
                        </div>
                        <div className="text-sm font-medium mb-2">Home</div>
                        <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => generateKit('home')}
                            disabled={generating}
                            className="w-full"
                        >
                            {generating && generatingType === 'home' ? (
                                <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Generating...</>
                            ) : (
                                <><Sparkles className="w-3 h-3 mr-1" /> {club.home_kit_url ? 'Regenerate' : 'Generate'}</>
                            )}
                        </Button>
                    </div>

                    {/* Away Kit */}
                    <div className="text-center">
                        <div className="aspect-square bg-white rounded-lg border-2 border-slate-200 mb-2 flex items-center justify-center overflow-hidden">
                            {club.away_kit_url ? (
                                <img src={club.away_kit_url} alt="Away kit" className="w-full h-full object-contain p-2" />
                            ) : (
                                <Shirt className="w-12 h-12 text-slate-300" />
                            )}
                        </div>
                        <div className="text-sm font-medium mb-2">Away</div>
                        <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => generateKit('away')}
                            disabled={generating}
                            className="w-full"
                        >
                            {generating && generatingType === 'away' ? (
                                <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Generating...</>
                            ) : (
                                <><Sparkles className="w-3 h-3 mr-1" /> {club.away_kit_url ? 'Regenerate' : 'Generate'}</>
                            )}
                        </Button>
                    </div>

                    {/* Third Kit */}
                    <div className="text-center">
                        <div className="aspect-square bg-white rounded-lg border-2 border-slate-200 mb-2 flex items-center justify-center overflow-hidden">
                            {club.third_kit_url ? (
                                <img src={club.third_kit_url} alt="Third kit" className="w-full h-full object-contain p-2" />
                            ) : (
                                <Shirt className="w-12 h-12 text-slate-300" />
                            )}
                        </div>
                        <div className="text-sm font-medium mb-2">Third</div>
                        <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => generateKit('third')}
                            disabled={generating}
                            className="w-full"
                        >
                            {generating && generatingType === 'third' ? (
                                <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Generating...</>
                            ) : (
                                <><Sparkles className="w-3 h-3 mr-1" /> {club.third_kit_url ? 'Regenerate' : 'Generate'}</>
                            )}
                        </Button>
                    </div>
                </div>
                
                {!hasAnyKit && (
                    <p className="text-xs text-center text-slate-500 mt-4">
                        Generate AI-powered kit designs based on your club colors
                    </p>
                )}
            </CardContent>
        </Card>
    );
}