import React, { useState } from 'react';
import { Shirt, Loader2, Sparkles, Wand2, Settings2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function AIKitGenerator({ club, onKitsGenerated, compact = false }) {
    const [generating, setGenerating] = useState(false);
    const [generatingType, setGeneratingType] = useState(null);
    const [showCustomParams, setShowCustomParams] = useState(false);
    const [customParams, setCustomParams] = useState({
        pattern: club.pattern_preference || 'solid',
        primaryColor: club.primary_color || '',
        secondaryColor: club.secondary_color || '',
        accentColor: club.accent_color || ''
    });

    const generateKit = async (type, useCustomParams = false, nationContext = null) => {
        const params = useCustomParams ? customParams : {
            pattern: club.pattern_preference || 'solid',
            primaryColor: club.primary_color,
            secondaryColor: club.secondary_color,
            accentColor: club.accent_color
        };

        if (!params.primaryColor) {
            toast.error('Please set club colors first');
            return;
        }

        setGenerating(true);
        setGeneratingType(type);

        try {
            const pattern = params.pattern;
            const primary = params.primaryColor;
            const secondary = params.secondaryColor || primary;
            const accent = params.accentColor;
            
            // Generate consistent sponsor/manufacturer context for the club
            const sponsorSeed = club.id ? club.id.slice(0, 8) : 'default';
            const kitContext = nationContext ? `, ${nationContext} style branding` : '';
            
            let prompt = '';
            
            if (type === 'home') {
                const patternDesc = pattern === 'vertical_stripes' ? 'with bold vertical stripes' : 
                                   pattern === 'horizontal_hoops' ? 'with horizontal hoops' : 
                                   pattern === 'sash' ? 'with diagonal sash' : 
                                   pattern === 'diagonal_stripe' ? 'with diagonal stripe' : 
                                   pattern === 'halves' ? 'with half and half split design' : 
                                   pattern === 'quarters' ? 'with quartered design' : 'solid color';
                prompt = `Professional football soccer jersey, short sleeve, ${patternDesc}, main color ${primary}, accent color ${secondary}, consistent sponsor logo placement, modern athletic manufacturer branding${kitContext}, front view straight on, centered composition, studio product photography, plain white background, no person wearing it, jersey only`;
            } else if (type === 'away') {
                prompt = `Professional football soccer jersey, short sleeve, solid or minimal design, main color ${secondary || '#ffffff'}, accent trim ${primary}, same sponsor and manufacturer as home kit${kitContext}, modern athletic cut, front view straight on, centered composition, studio product photography, plain white background, no person wearing it, jersey only`;
            } else {
                const thirdColor = accent || '#1a1a1a';
                prompt = `Professional football soccer jersey, short sleeve, clean modern design, main color ${thirdColor}, same sponsor and manufacturer as home kit${kitContext}, modern athletic cut, front view straight on, centered composition, studio product photography, plain white background, no person wearing it, jersey only`;
            }

            // Include home kit as reference for consistency if generating away/third
            const referenceImages = club.logo_url ? [club.logo_url] : [];
            if (type !== 'home' && club.home_kit_url) {
                referenceImages.push(club.home_kit_url);
            }
            
            const result = await base44.integrations.Core.GenerateImage({
                prompt,
                existing_image_urls: referenceImages
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
            await generateKit(type, false);
        }
    };

    const handleCustomGenerate = (type) => {
        setShowCustomParams(false);
        generateKit(type, true);
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
                <div className="flex gap-2">
                    <Dialog open={showCustomParams} onOpenChange={setShowCustomParams}>
                        <DialogTrigger asChild>
                            <Button size="sm" variant="outline">
                                <Settings2 className="w-4 h-4 mr-2" />
                                Custom
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader><DialogTitle>Custom Kit Parameters</DialogTitle></DialogHeader>
                            <div className="space-y-4 py-4">
                                <div>
                                    <Label>Pattern</Label>
                                    <Select value={customParams.pattern} onValueChange={(v) => setCustomParams({...customParams, pattern: v})}>
                                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="solid">Solid</SelectItem>
                                            <SelectItem value="vertical_stripes">Vertical Stripes</SelectItem>
                                            <SelectItem value="horizontal_hoops">Horizontal Hoops</SelectItem>
                                            <SelectItem value="sash">Sash</SelectItem>
                                            <SelectItem value="diagonal_stripe">Diagonal Stripe</SelectItem>
                                            <SelectItem value="halves">Halves</SelectItem>
                                            <SelectItem value="quarters">Quarters</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <Label className="text-xs">Primary Color</Label>
                                        <Input type="color" value={customParams.primaryColor} onChange={(e) => setCustomParams({...customParams, primaryColor: e.target.value})} className="mt-1 h-10" />
                                    </div>
                                    <div>
                                        <Label className="text-xs">Secondary Color</Label>
                                        <Input type="color" value={customParams.secondaryColor} onChange={(e) => setCustomParams({...customParams, secondaryColor: e.target.value})} className="mt-1 h-10" />
                                    </div>
                                    <div>
                                        <Label className="text-xs">Accent Color</Label>
                                        <Input type="color" value={customParams.accentColor} onChange={(e) => setCustomParams({...customParams, accentColor: e.target.value})} className="mt-1 h-10" />
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button onClick={() => handleCustomGenerate('home')} className="flex-1">Generate Home</Button>
                                    <Button onClick={() => handleCustomGenerate('away')} className="flex-1" variant="outline">Generate Away</Button>
                                    <Button onClick={() => handleCustomGenerate('third')} className="flex-1" variant="outline">Generate Third</Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
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
            </div>
            
            <div className="grid grid-cols-3 gap-4">
                {['home', 'away', 'third'].map(type => {
                    const kitUrl = type === 'home' ? club.home_kit_url : type === 'away' ? club.away_kit_url : club.third_kit_url;
                    const isGenerating = generating && generatingType === type;
                    
                    return (
                        <div key={type} className="text-center space-y-2">
                            <div className="aspect-[3/4] bg-white rounded-lg border-2 border-slate-200 flex items-center justify-center overflow-hidden relative group">
                                {kitUrl ? (
                                    <img src={kitUrl} alt={`${type} kit`} className="w-full h-full object-contain p-2" />
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
                            <div className="flex gap-1">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => generateKit(type, false)}
                                    disabled={generating}
                                    className="flex-1"
                                >
                                    {isGenerating ? (
                                        <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Generating...</>
                                    ) : (
                                        <><Sparkles className="w-3 h-3 mr-1" /> {kitUrl ? 'Regenerate' : 'Generate'}</>
                                    )}
                                </Button>
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button size="sm" variant="ghost" className="px-2">
                                            <Settings2 className="w-3 h-3" />
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader><DialogTitle>Custom {type.charAt(0).toUpperCase() + type.slice(1)} Kit</DialogTitle></DialogHeader>
                                        <div className="space-y-4 py-4">
                                            <div>
                                                <Label>Pattern</Label>
                                                <Select value={customParams.pattern} onValueChange={(v) => setCustomParams({...customParams, pattern: v})}>
                                                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="solid">Solid</SelectItem>
                                                        <SelectItem value="vertical_stripes">Vertical Stripes</SelectItem>
                                                        <SelectItem value="horizontal_hoops">Horizontal Hoops</SelectItem>
                                                        <SelectItem value="sash">Sash</SelectItem>
                                                        <SelectItem value="diagonal_stripe">Diagonal Stripe</SelectItem>
                                                        <SelectItem value="halves">Halves</SelectItem>
                                                        <SelectItem value="quarters">Quarters</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="grid grid-cols-3 gap-3">
                                                <div>
                                                    <Label className="text-xs">Primary</Label>
                                                    <Input type="color" value={customParams.primaryColor} onChange={(e) => setCustomParams({...customParams, primaryColor: e.target.value})} className="mt-1 h-10" />
                                                </div>
                                                <div>
                                                    <Label className="text-xs">Secondary</Label>
                                                    <Input type="color" value={customParams.secondaryColor} onChange={(e) => setCustomParams({...customParams, secondaryColor: e.target.value})} className="mt-1 h-10" />
                                                </div>
                                                <div>
                                                    <Label className="text-xs">Accent</Label>
                                                    <Input type="color" value={customParams.accentColor} onChange={(e) => setCustomParams({...customParams, accentColor: e.target.value})} className="mt-1 h-10" />
                                                </div>
                                            </div>
                                            <Button onClick={() => handleCustomGenerate(type)} className="w-full bg-purple-600 hover:bg-purple-700">
                                                <Sparkles className="w-4 h-4 mr-2" /> Generate Custom Kit
                                            </Button>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}