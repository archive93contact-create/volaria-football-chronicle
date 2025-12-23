import React, { useState } from 'react';
import { Shirt, Wand2, Loader2, Download, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import PageHeader from '@/components/common/PageHeader';

export default function KitGenerator() {
    const [generating, setGenerating] = useState(false);
    const [generatedKit, setGeneratedKit] = useState(null);
    const [params, setParams] = useState({
        pattern: 'solid',
        primaryColor: '#0066cc',
        secondaryColor: '#ffffff',
        accentColor: '#ff0000',
        style: 'modern'
    });

    const generateRandomKit = async () => {
        setGenerating(true);
        try {
            const pattern = params.pattern;
            const primary = params.primaryColor;
            const secondary = params.secondaryColor;
            const styleDesc = params.style === 'retro' ? 'retro vintage 1990s' : 
                             params.style === 'classic' ? 'classic traditional' : 
                             'modern futuristic';
            
            const patternDesc = pattern === 'vertical_stripes' ? 'with bold vertical stripes' : 
                               pattern === 'horizontal_hoops' ? 'with horizontal hoops' : 
                               pattern === 'sash' ? 'with diagonal sash' : 
                               pattern === 'diagonal_stripe' ? 'with diagonal stripe' : 
                               pattern === 'halves' ? 'with half and half split design' : 
                               pattern === 'quarters' ? 'with quartered design' : 'solid color';
            
            const prompt = `Professional football soccer jersey, ${styleDesc} design, short sleeve, ${patternDesc}, main color ${primary}, accent color ${secondary}, sponsor logo, manufacturer branding, front view straight on, centered composition, studio product photography, plain white background, no person wearing it, jersey only`;

            const result = await base44.integrations.Core.GenerateImage({
                prompt
            });

            if (result?.url) {
                setGeneratedKit(result.url);
                toast.success('Kit generated!');
            }
        } catch (error) {
            toast.error('Failed to generate kit');
            console.error(error);
        } finally {
            setGenerating(false);
        }
    };

    const downloadKit = () => {
        if (!generatedKit) return;
        const link = document.createElement('a');
        link.href = generatedKit;
        link.download = `custom-kit-${Date.now()}.png`;
        link.click();
    };

    const randomizeColors = () => {
        const randomColor = () => '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
        setParams({
            ...params,
            primaryColor: randomColor(),
            secondaryColor: randomColor(),
            accentColor: randomColor()
        });
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <PageHeader 
                title="Kit Generator"
                subtitle="Design and generate custom football kits with AI"
                breadcrumbs={[{ label: 'Tools' }, { label: 'Kit Generator' }]}
            />

            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Controls */}
                    <Card className="border-0 shadow-sm h-fit">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Shirt className="w-5 h-5 text-purple-600" />
                                Kit Designer
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label>Kit Pattern</Label>
                                <Select value={params.pattern} onValueChange={(v) => setParams({...params, pattern: v})}>
                                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="solid">Solid Color</SelectItem>
                                        <SelectItem value="vertical_stripes">Vertical Stripes</SelectItem>
                                        <SelectItem value="horizontal_hoops">Horizontal Hoops</SelectItem>
                                        <SelectItem value="sash">Sash</SelectItem>
                                        <SelectItem value="diagonal_stripe">Diagonal Stripe</SelectItem>
                                        <SelectItem value="halves">Halves</SelectItem>
                                        <SelectItem value="quarters">Quarters</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label>Kit Style</Label>
                                <Select value={params.style} onValueChange={(v) => setParams({...params, style: v})}>
                                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="modern">Modern</SelectItem>
                                        <SelectItem value="classic">Classic</SelectItem>
                                        <SelectItem value="retro">Retro</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label>Colors</Label>
                                    <Button size="sm" variant="outline" onClick={randomizeColors}>
                                        <Wand2 className="w-3 h-3 mr-1" /> Randomize
                                    </Button>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <Label className="text-xs">Primary</Label>
                                        <div className="mt-1 space-y-1">
                                            <Input 
                                                type="color" 
                                                value={params.primaryColor} 
                                                onChange={(e) => setParams({...params, primaryColor: e.target.value})} 
                                                className="h-12 cursor-pointer"
                                            />
                                            <Input 
                                                type="text" 
                                                value={params.primaryColor} 
                                                onChange={(e) => setParams({...params, primaryColor: e.target.value})} 
                                                className="text-xs"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="text-xs">Secondary</Label>
                                        <div className="mt-1 space-y-1">
                                            <Input 
                                                type="color" 
                                                value={params.secondaryColor} 
                                                onChange={(e) => setParams({...params, secondaryColor: e.target.value})} 
                                                className="h-12 cursor-pointer"
                                            />
                                            <Input 
                                                type="text" 
                                                value={params.secondaryColor} 
                                                onChange={(e) => setParams({...params, secondaryColor: e.target.value})} 
                                                className="text-xs"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="text-xs">Accent</Label>
                                        <div className="mt-1 space-y-1">
                                            <Input 
                                                type="color" 
                                                value={params.accentColor} 
                                                onChange={(e) => setParams({...params, accentColor: e.target.value})} 
                                                className="h-12 cursor-pointer"
                                            />
                                            <Input 
                                                type="text" 
                                                value={params.accentColor} 
                                                onChange={(e) => setParams({...params, accentColor: e.target.value})} 
                                                className="text-xs"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <Button 
                                onClick={generateRandomKit} 
                                disabled={generating}
                                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                                size="lg"
                            >
                                {generating ? (
                                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Generating Kit...</>
                                ) : (
                                    <><Wand2 className="w-5 h-5 mr-2" /> Generate Kit</>
                                )}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Preview */}
                    <Card className="border-0 shadow-sm">
                        <CardHeader>
                            <CardTitle>Preview</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="aspect-[3/4] bg-white rounded-lg border-2 border-slate-200 flex items-center justify-center overflow-hidden">
                                {generatedKit ? (
                                    <img src={generatedKit} alt="Generated kit" className="w-full h-full object-contain p-4" />
                                ) : (
                                    <div className="text-center text-slate-400">
                                        <Shirt className="w-20 h-20 mx-auto mb-4" />
                                        <p>Your kit will appear here</p>
                                    </div>
                                )}
                            </div>
                            {generatedKit && (
                                <div className="flex gap-2 mt-4">
                                    <Button onClick={downloadKit} className="flex-1">
                                        <Download className="w-4 h-4 mr-2" /> Download
                                    </Button>
                                    <Button onClick={() => setGeneratedKit(null)} variant="outline">
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Tips */}
                <Card className="border-0 shadow-sm mt-8 bg-gradient-to-br from-purple-50 to-pink-50">
                    <CardContent className="p-6">
                        <h3 className="font-semibold mb-2">💡 Tips for Great Kits</h3>
                        <ul className="text-sm text-slate-600 space-y-1">
                            <li>• Use contrasting colors for better visibility</li>
                            <li>• Classic patterns work best with 2-3 colors</li>
                            <li>• Retro style gives vintage vibes from the 80s-90s</li>
                            <li>• Modern style creates sleek, contemporary designs</li>
                            <li>• Download and share your creations!</li>
                        </ul>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}