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

export default function AIKitGenerator({ club, onKitsGenerated, compact = false, nation = null }) {
    const [generating, setGenerating] = useState(false);
    const [generatingType, setGeneratingType] = useState(null);
    const [showCustomParams, setShowCustomParams] = useState(false);
    const [customParams, setCustomParams] = useState({
        pattern: club.pattern_preference || 'solid',
        primaryColor: club.primary_color || '',
        secondaryColor: club.secondary_color || '',
        accentColor: club.accent_color || ''
    });

    const generateKit = async (type, useCustomParams = false, nation = null) => {
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
            
            // Generate contextual sponsor based on club/nation language
            const generateSponsor = () => {
                const language = nation?.language || 'English';
                const clubWords = club.name.split(' ');
                const baseName = clubWords[0] || club.settlement || club.city || club.region || nation?.name || 'United';
                
                // Generate authentic sponsor names based on language/culture
                const hash = Math.abs(club.id?.charCodeAt(0) || 0);
                const sponsorType = hash % 6;
                
                // Use language-appropriate suffixes and patterns
                const patterns = {
                    // Nordic/Scandinavian
                    nordic: ['Bryggeri', 'Industrier', 'Energi', 'Finans', 'Gruppen', 'Motorer'],
                    // Germanic
                    germanic: ['Werke', 'Industrie', 'Bank', 'Gruppe', 'Technologie', 'Energie'],
                    // Romance/Latin
                    romance: ['Industrie', 'Gruppo', 'Energia', 'Banca', 'Telecom', 'Fabbrica'],
                    // Slavic
                    slavic: ['Przemysł', 'Energia', 'Bank', 'Grupa', 'Zakłady', 'Telekom'],
                    // Anglo/English
                    anglo: ['Industries', 'Group', 'Motors', 'Energy', 'Financial', 'Bank'],
                    // Iberian
                    iberian: ['Industrias', 'Grupo', 'Energía', 'Banco', 'Telecom', 'Fábrica']
                };
                
                // Detect language pattern
                const lang = language.toLowerCase();
                let suffixes = patterns.anglo;
                if (/nord|skan|finn|swe|dan|norw/i.test(lang)) suffixes = patterns.nordic;
                else if (/germ|deut|öster|schwei/i.test(lang)) suffixes = patterns.germanic;
                else if (/roman|ital|fran|port|span|catal/i.test(lang)) suffixes = patterns.romance;
                else if (/slav|pol|czech|rus|ukr|bulg|serb/i.test(lang)) suffixes = patterns.slavic;
                else if (/hispan|castell|iberi|galleg/i.test(lang)) suffixes = patterns.iberian;
                
                return `${baseName} ${suffixes[sponsorType]}`;
            };
            
            const sponsorContext = generateSponsor();
            const manufacturerStyle = nation?.region ? `${nation.region}-inspired athletic brand` : 'modern athletic manufacturer';
            
            let prompt = '';
            let colorInstruction = '';
            
            if (type === 'home') {
                const patternDesc = pattern === 'vertical_stripes' ? 'with bold vertical stripes' : 
                                   pattern === 'horizontal_hoops' ? 'with horizontal hoops' : 
                                   pattern === 'sash' ? 'with diagonal sash' : 
                                   pattern === 'diagonal_stripe' ? 'with diagonal stripe' : 
                                   pattern === 'halves' ? 'with half and half split design' : 
                                   pattern === 'quarters' ? 'with quartered design' : 'solid color';
                colorInstruction = `main color ${primary}, accent color ${secondary}`;
                prompt = `Professional football soccer jersey, short sleeve, ${patternDesc}, ${colorInstruction}, sponsor text "${sponsorContext}", ${manufacturerStyle} logo, front view straight on, centered composition, studio product photography, plain white background, no person wearing it, jersey only`;
            } else if (type === 'away') {
                // Ensure away kit is clearly different - use inverted colors or white if home is dark
                const awayColor = secondary && secondary !== primary ? secondary : '#ffffff';
                colorInstruction = `MUST be distinctly different from home kit, main color ${awayColor}, contrasting accent trim`;
                prompt = `Professional football soccer jersey, short sleeve, away kit design clearly different from home, ${colorInstruction}, same "${sponsorContext}" sponsor, same ${manufacturerStyle} logo, modern athletic cut, front view straight on, centered composition, studio product photography, plain white background, no person wearing it, jersey only`;
            } else {
                // Third kit should be unique - use accent or completely different color
                const thirdColor = accent && accent !== primary && accent !== secondary ? accent : '#1a1a1a';
                colorInstruction = `MUST be completely different from home and away kits, unique bold color ${thirdColor}, striking alternative design`;
                prompt = `Professional football soccer jersey, short sleeve, third kit with unique alternative design, ${colorInstruction}, same "${sponsorContext}" sponsor, same ${manufacturerStyle} logo, modern bold design, front view straight on, centered composition, studio product photography, plain white background, no person wearing it, jersey only`;
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
            await generateKit(type, false, nation);
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
                                onClick={() => generateKit(type, false, nation)}
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
                                    onClick={() => generateKit(type, false, nation)}
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