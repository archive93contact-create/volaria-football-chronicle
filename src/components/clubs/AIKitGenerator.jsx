import React, { useState } from 'react';
import { Shirt, Loader2, Sparkles, Wand2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function AIKitGenerator({ club, onKitsGenerated, compact = false }) {
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
            const pattern = club.pattern_preference || 'solid';
            const primary = club.primary_color;
            const secondary = club.secondary_color || primary;
            const accent = club.accent_color;
            
            let prompt = '';
            
            if (type === 'home') {
                const patternDesc = pattern === 'vertical_stripes' ? 'with bold vertical stripes' : 
                                   pattern === 'horizontal_hoops' ? 'with horizontal hoops' : 
                                   pattern === 'sash' ? 'with diagonal sash' : 
                                   pattern === 'diagonal_stripe' ? 'with diagonal stripe' : 
                                   pattern === 'halves' ? 'with half and half design' : 
                                   pattern === 'quarters' ? 'with quartered design' : '';
                prompt = `Professional football soccer jersey kit ${patternDesc}, primary color ${primary}, secondary accent ${secondary}, modern athletic design, front view centered, clean product photography, white background`;
            } else if (type === 'away') {
                prompt = `Professional football soccer jersey kit, primary color ${secondary || '#ffffff'}, secondary accent ${primary}, clean modern design, front view centered, product photography, white background`;
            } else {
                const thirdColor = accent || '#1a1a1a';
                prompt = `Professional football soccer jersey kit, primary color ${thirdColor}, modern alternative design, front view centered, product photography, white background`;
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

    const generateAllKits = async () => {
        for (const type of ['home', 'away', 'third']) {
            await generateKit(type);
        }
    };

    if (compact) {
        // Compact view for banner
        return (
            <div className="flex gap-2">
                {['home', 'away', 'third'].map(type => {
                    const kitUrl = type === 'home' ? club.home_kit_url : type === 'away' ? club.away_kit_url : club.third_kit_url;
                    return (
                        <div key={type} className="relative group">
                            <div className="w-16 h-20 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 flex items-center justify-center overflow-hidden">
                                {kitUrl ? (
                                    <img src={kitUrl} alt={`${type} kit`} className="w-full h-full object-cover" />
                                ) : (
                                    <Shirt className="w-6 h-6 text-white/40" />
                                )}
                            </div>
                            <Button
                                size="sm"
                                variant="ghost"
                                className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-black/60 text-white hover:bg-black/70 transition-opacity"
                                onClick={() => generateKit(type)}
                                disabled={generating}
                            >
                                {generating && generatingType === type ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Sparkles className="w-4 h-4" />
                                )}
                            </Button>
                        </div>
                    );
                })}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h4 className="font-semibold">AI Kit Generator</h4>
                    <p className="text-xs text-slate-500">Generate realistic kits based on club colors</p>
                </div>
                <Button
                    size="sm"
                    onClick={generateAllKits}
                    disabled={generating}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                    <Wand2 className="w-4 h-4 mr-2" />
                    Generate All
                </Button>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
                {['home', 'away', 'third'].map(type => {
                    const kitUrl = type === 'home' ? club.home_kit_url : type === 'away' ? club.away_kit_url : club.third_kit_url;
                    const isGenerating = generating && generatingType === type;
                    
                    return (
                        <div key={type} className="text-center space-y-2">
                            <div className="aspect-[3/4] bg-white rounded-lg border-2 border-slate-200 flex items-center justify-center overflow-hidden relative group">
                                {kitUrl ? (
                                    <img src={kitUrl} alt={`${type} kit`} className="w-full h-full object-cover" />
                                ) : (
                                    <Shirt className="w-12 h-12 text-slate-300" />
                                )}
                                {kitUrl && (
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                        <span className="text-white text-xs font-medium">Regenerate</span>
                                    </div>
                                )}
                            </div>
                            <div className="text-sm font-medium capitalize">{type}</div>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => generateKit(type)}
                                disabled={generating}
                                className="w-full"
                            >
                                {isGenerating ? (
                                    <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Generating...</>
                                ) : (
                                    <><Sparkles className="w-3 h-3 mr-1" /> {kitUrl ? 'Regenerate' : 'Generate'}</>
                                )}
                            </Button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}