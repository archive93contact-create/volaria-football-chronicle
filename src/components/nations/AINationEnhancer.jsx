import React, { useState } from 'react';
import { Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function AINationEnhancer({ nation, onUpdate }) {
    const [generating, setGenerating] = useState(false);
    const [open, setOpen] = useState(false);
    const [generatedData, setGeneratedData] = useState({
        culture: '',
        geography: '',
        national_media: '',
        cuisine: '',
        famous_for: '',
        government_type: ''
    });

    const generateContent = async () => {
        setGenerating(true);
        try {
            const context = `
${nation.name} is a nation in the ${nation.region || 'fictional'} region of Volaria.
Language: ${nation.language || 'not specified'}
Naming styles: ${Array.isArray(nation.naming_styles) ? nation.naming_styles.join(', ') : nation.naming_styles || 'not specified'}
Capital: ${nation.capital || 'unknown'}
Continental membership: ${nation.membership || 'unknown'}
Existing description: ${nation.description || 'none'}
Existing culture: ${nation.culture || 'none'}
Existing geography: ${nation.geography || 'none'}
Football federation: ${nation.federation_name || 'unknown'}
            `.trim();

            const prompt = `Expand the canon for this fictional nation using the supplied facts as constraints. This is CREATIVE WORLD-BUILDING, not real-world research.

Context:
${context}

Generate the following as a JSON object:
{
  "culture": "Rich 250-word cultural description - traditions, values, social norms, arts, music, festivals, national character, regional variations",
  "geography": "Geographic description - climate zones, terrain, major rivers/mountains, natural resources, environmental features",
  "national_media": "5-7 major AUTHENTIC ${nation.language || 'local language'} media outlets. CRITICAL: Use language-appropriate words (NOT 'Times', 'Herald', 'News', 'Broadcasting'). For Nordic: 'Dagbladet', 'Televisjon'; Romance: 'Quotidiano', 'Televisione'; Slavic: 'Gazeta', 'Telewizja'; Germanic: 'Zeitung', 'Rundfunk'. Make them feel NATIVE and unique.",
  "cuisine": "Traditional foods, signature dishes, dining culture, regional specialties with authentic dish names in the local language",
  "famous_for": "What the nation is internationally known for - exports, achievements, contributions, unique characteristics",
  "government_type": "Type of government (e.g., Constitutional Monarchy, Federal Republic, Parliamentary Democracy)"
}

CANON RULES:
- Preserve every supplied fact; do not overwrite or contradict established culture, geography, capital, federation or language.
- New media outlets, dishes and institutions are PROPOSED NEW CANON. Make them specific and believable, but do not claim they previously existed in data you were not given.
- Follow the stored language/naming styles when they are defined. If they are not defined well enough, prefer internally consistent invented names over randomly borrowing real-world language words.
- Do not invent etymologies, historic dates, wars, rulers, famous people or named geographic features unless the request explicitly requires new canon for that field.
- Avoid generic English constructions such as '[Nation] Times', '[Nation] Industries' or '[Nation] Broadcasting' unless English is explicitly the nation's language/naming style.
- Return only the requested JSON fields.`;

            const result = await base44.integrations.Core.InvokeLLM({
                prompt,
                add_context_from_internet: false,
                response_json_schema: {
                    type: "object",
                    properties: {
                        culture: { type: "string" },
                        geography: { type: "string" },
                        national_media: { type: "string" },
                        cuisine: { type: "string" },
                        famous_for: { type: "string" },
                        government_type: { type: "string" }
                    }
                }
            });

            if (result) {
                setGeneratedData(result);
                toast.success('Content generated! Review and save below.');
            }
        } catch (error) {
            toast.error('Failed to generate content');
            console.error(error);
        } finally {
            setGenerating(false);
        }
    };

    const saveContent = async () => {
        try {
            await base44.entities.Nation.update(nation.id, generatedData);
            toast.success('Nation enhanced!');
            setOpen(false);
            if (onUpdate) onUpdate();
        } catch (error) {
            toast.error('Failed to save');
            console.error(error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <Sparkles className="w-4 h-4 mr-2" />
                    AI Enhance Nation
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>AI Nation Enhancer - {nation.name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    {!generatedData.culture ? (
                        <div className="text-center py-8">
                            <Sparkles className="w-16 h-16 text-purple-500 mx-auto mb-4" />
                            <p className="text-slate-600 mb-4">
                                Generate rich cultural content, national identity, media, cuisine, and geographic details for {nation.name}
                            </p>
                            <Button 
                                onClick={generateContent} 
                                disabled={generating}
                                className="bg-gradient-to-r from-purple-600 to-pink-600"
                            >
                                {generating ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
                                ) : (
                                    <><Sparkles className="w-4 h-4 mr-2" /> Generate National Content</>
                                )}
                            </Button>
                        </div>
                    ) : (
                        <>
                            <div className="flex justify-end">
                                <Button variant="outline" size="sm" onClick={generateContent} disabled={generating}>
                                    <RefreshCw className="w-3 h-3 mr-2" /> Regenerate
                                </Button>
                            </div>
                            
                            <div>
                                <Label>National Culture & Identity</Label>
                                <Textarea 
                                    value={generatedData.culture}
                                    onChange={(e) => setGeneratedData({...generatedData, culture: e.target.value})}
                                    rows={6}
                                    className="mt-1"
                                />
                            </div>

                            <div>
                                <Label>Geography & Environment</Label>
                                <Textarea 
                                    value={generatedData.geography}
                                    onChange={(e) => setGeneratedData({...generatedData, geography: e.target.value})}
                                    rows={4}
                                    className="mt-1"
                                />
                            </div>

                            <div>
                                <Label>National Media Outlets</Label>
                                <Textarea 
                                    value={generatedData.national_media}
                                    onChange={(e) => setGeneratedData({...generatedData, national_media: e.target.value})}
                                    rows={3}
                                    className="mt-1"
                                    placeholder="Major newspapers, TV networks, sports channels..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Traditional Cuisine</Label>
                                    <Textarea 
                                        value={generatedData.cuisine}
                                        onChange={(e) => setGeneratedData({...generatedData, cuisine: e.target.value})}
                                        rows={3}
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label>Famous For</Label>
                                    <Textarea 
                                        value={generatedData.famous_for}
                                        onChange={(e) => setGeneratedData({...generatedData, famous_for: e.target.value})}
                                        rows={3}
                                        className="mt-1"
                                    />
                                </div>
                            </div>

                            <div>
                                <Label>Government Type</Label>
                                <Input 
                                    value={generatedData.government_type}
                                    onChange={(e) => setGeneratedData({...generatedData, government_type: e.target.value})}
                                    className="mt-1"
                                    placeholder="e.g., Constitutional Monarchy"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                                <Button onClick={saveContent} className="bg-emerald-600">
                                    <Sparkles className="w-4 h-4 mr-2" /> Save Enhanced Content
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}