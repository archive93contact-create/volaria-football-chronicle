import React, { useState } from 'react';
import { Shirt, Wand2, Loader2, Download, Trash2, RefreshCw } from 'lucide-react';
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
        style: 'modern',
        seasonYear: '1986',
        sponsor: '',
        manufacturer: ''
    });

    const generateBrandIdentity = async () => {
        setGenerating(true);
        try {
            const result = await base44.integrations.Core.InvokeLLM({
                prompt: `Create one distinctive fictional football shirt sponsor and one fictional sportswear manufacturer for a ${params.seasonYear || 'period-neutral'} kit. The sponsor should sound like a real brand, not a generic formula such as City Industries, United Group, Energy, Bank or Motors. Use a plausible commercial sector such as food, engineering, retail, transport, insurance, electronics, textiles, building supplies, publishing or logistics. The manufacturer should be a short memorable sportswear brand and must not copy a real-world brand. Return JSON with sponsor_name and manufacturer_name.`,
                add_context_from_internet: false,
                response_json_schema: {
                    type: 'object',
                    properties: { sponsor_name: { type: 'string' }, manufacturer_name: { type: 'string' } },
                    required: ['sponsor_name','manufacturer_name']
                }
            });
            setParams(p => ({ ...p, sponsor: result?.sponsor_name || '', manufacturer: result?.manufacturer_name || '' }));
        } catch (error) {
            console.error(error);
            toast.error('Could not generate commercial identity');
        } finally {
            setGenerating(false);
        }
    };

    const generateRandomKit = async () => {
        setGenerating(true);
        try {
            const pattern = params.pattern;
            const primary = params.primaryColor;
            const secondary = params.secondaryColor;
            const year = Number(String(params.seasonYear || '').match(/\d{4}/)?.[0] || 0);
            const eraDesc = year && year < 1965 ? `${year} era, heavyweight simple shirt, minimal branding` :
                             year && year < 1980 ? `${year} era, traditional V-neck or fold collar, restrained trim` :
                             year && year < 1995 ? `${year} era, boxier polyester cut, woven badge, period-correct trim` :
                             year && year < 2010 ? `${year} era, slightly loose technical cut` :
                             year ? `${year} era contemporary technical shirt` : 'period-neutral traditional football shirt';
            const styleDesc = params.style === 'retro' ? 'retro traditional design' : 
                             params.style === 'classic' ? 'classic restrained design' : 
                             'modern clean design';
            
            const patternDesc = pattern === 'vertical_stripes' ? 'with bold vertical stripes' : 
                               pattern === 'horizontal_hoops' ? 'with horizontal hoops' : 
                               pattern === 'sash' ? 'with diagonal sash' : 
                               pattern === 'diagonal_stripe' ? 'with diagonal stripe' : 
                               pattern === 'halves' ? 'with half and half split design' : 
                               pattern === 'quarters' ? 'with quartered design' : 'solid color';
            
            const sponsorInstruction = params.sponsor ? `one central sponsor wordmark reading exactly "${params.sponsor}"` : 'one tasteful fictional sponsor wordmark';
            const manufacturerInstruction = params.manufacturer ? `small right-chest manufacturer mark reading "${params.manufacturer}"` : 'small restrained fictional manufacturer mark';
            const prompt = `Ultra-realistic football shirt product photograph, shirt only, straight-on front view, no person, no mannequin, no shorts, no hanger, neutral off-white studio background. ${eraDesc}. ${styleDesc}. ${patternDesc}. Main colour ${primary}, secondary ${secondary}, accent ${params.accentColor}. ${sponsorInstruction}. ${manufacturerInstruction}. Realistic collar, cuffs, seams and fabric texture. Correct football-jersey proportions. No extra logos, no random text, no player name, no number, no watermark, no futuristic concept-art panels.`;

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

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div><Label>Season / year</Label><Input className="mt-1" value={params.seasonYear} onChange={(e) => setParams({...params, seasonYear: e.target.value})} placeholder="e.g. 1986" /></div>
                                <div><Label>Sponsor</Label><Input className="mt-1" value={params.sponsor} onChange={(e) => setParams({...params, sponsor: e.target.value})} placeholder="Generate or enter" /></div>
                                <div><Label>Manufacturer</Label><Input className="mt-1" value={params.manufacturer} onChange={(e) => setParams({...params, manufacturer: e.target.value})} placeholder="Generate or enter" /></div>
                            </div>

                            <Button size="sm" variant="outline" onClick={generateBrandIdentity} disabled={generating} className="w-full">
                                <RefreshCw className="w-4 h-4 mr-2" /> Generate imaginative sponsor & manufacturer
                            </Button>

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
                            <li>• Set a season/year so collars, fabric and cut match the era</li>
                            <li>• Generate a sponsor/manufacturer identity instead of relying on random image text</li>
                            <li>• Retro and classic modes now avoid futuristic concept-shirt styling</li>
                            <li>• Download and share your creations!</li>
                        </ul>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}