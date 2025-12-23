import React, { useState } from 'react';
import { Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function AILocationEnhancer({ location, nation, onUpdate }) {
    const [generating, setGenerating] = useState(false);
    const [open, setOpen] = useState(false);
    const [generatedData, setGeneratedData] = useState({
        culture_description: '',
        geography: '',
        local_media: '',
        major_companies: '',
        landmarks: '',
        industries: ''
    });

    const generateContent = async () => {
        setGenerating(true);
        try {
            const locationType = location.type === 'settlement' ? (location.settlement_size || 'town') : location.type;
            const context = `
${location.name} is a ${locationType} in ${nation.name}, a nation in the ${nation.region || 'fictional'} region of Volaria.
Nation language: ${nation.language || 'English'}
Nation culture: ${nation.culture || 'diverse'}
${location.type === 'settlement' ? `Part of ${location.parent_district || location.parent_region || 'the country'}` : ''}
${location.clubs?.length > 0 ? `Has ${location.clubs.length} football club(s)` : ''}
Population: ~${location.population?.toLocaleString() || 'unknown'}
            `.trim();

            const prompt = `Generate detailed, immersive local content for this location. Make it feel authentic and unique to the culture and region. Be creative and specific, not generic.

Context:
${context}

Generate the following as a JSON object:
{
  "culture_description": "200-word rich cultural description - local traditions, festivals, community character, social fabric, typical lifestyle",
  "geography": "Geographic features - terrain, rivers, climate, natural landmarks, environmental characteristics",
  "local_media": "3-5 realistic local media outlet names appropriate for the culture/language (e.g., '[LocationName] Herald, Radio [Region], [City] Sports Network')",
  "major_companies": "5-7 realistic local businesses/employers specific to this area (e.g., '[City] Brewing Company, [Region] Steel Works, [Name] Textiles')",
  "landmarks": "Notable local landmarks, historic sites, popular gathering places",
  "industries": "Primary local industries and economic activities"
}

Make names authentic to the nation's language and culture. Be specific and creative.`;

            const result = await base44.integrations.Core.InvokeLLM({
                prompt,
                response_json_schema: {
                    type: "object",
                    properties: {
                        culture_description: { type: "string" },
                        geography: { type: "string" },
                        local_media: { type: "string" },
                        major_companies: { type: "string" },
                        landmarks: { type: "string" },
                        industries: { type: "string" }
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
            await base44.entities.Location.update(location.id, generatedData);
            toast.success('Location enhanced!');
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
                    AI Enhance
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>AI Location Enhancer - {location.name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    {!generatedData.culture_description ? (
                        <div className="text-center py-8">
                            <Sparkles className="w-16 h-16 text-purple-500 mx-auto mb-4" />
                            <p className="text-slate-600 mb-4">
                                Generate rich cultural content, local media outlets, companies, and geographic details for {location.name}
                            </p>
                            <Button 
                                onClick={generateContent} 
                                disabled={generating}
                                className="bg-gradient-to-r from-purple-600 to-pink-600"
                            >
                                {generating ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
                                ) : (
                                    <><Sparkles className="w-4 h-4 mr-2" /> Generate Content</>
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
                                <Label>Culture & Community</Label>
                                <Textarea 
                                    value={generatedData.culture_description}
                                    onChange={(e) => setGeneratedData({...generatedData, culture_description: e.target.value})}
                                    rows={5}
                                    className="mt-1"
                                />
                            </div>

                            <div>
                                <Label>Geography & Environment</Label>
                                <Textarea 
                                    value={generatedData.geography}
                                    onChange={(e) => setGeneratedData({...generatedData, geography: e.target.value})}
                                    rows={3}
                                    className="mt-1"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Local Media Outlets</Label>
                                    <Textarea 
                                        value={generatedData.local_media}
                                        onChange={(e) => setGeneratedData({...generatedData, local_media: e.target.value})}
                                        rows={3}
                                        className="mt-1"
                                        placeholder="Newspapers, radio, TV..."
                                    />
                                </div>
                                <div>
                                    <Label>Major Companies & Employers</Label>
                                    <Textarea 
                                        value={generatedData.major_companies}
                                        onChange={(e) => setGeneratedData({...generatedData, major_companies: e.target.value})}
                                        rows={3}
                                        className="mt-1"
                                        placeholder="Local businesses..."
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Landmarks & Attractions</Label>
                                    <Textarea 
                                        value={generatedData.landmarks}
                                        onChange={(e) => setGeneratedData({...generatedData, landmarks: e.target.value})}
                                        rows={2}
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label>Industries & Economy</Label>
                                    <Textarea 
                                        value={generatedData.industries}
                                        onChange={(e) => setGeneratedData({...generatedData, industries: e.target.value})}
                                        rows={2}
                                        className="mt-1"
                                    />
                                </div>
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