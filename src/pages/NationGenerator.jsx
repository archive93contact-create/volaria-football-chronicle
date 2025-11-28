import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Globe, Sparkles, Loader2, Flag, Shield, Trophy, MapPin, Palette } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import PageHeader from '@/components/common/PageHeader';

const CULTURE_PRESETS = [
    { id: 'nordic', name: 'Nordic/Scandinavian', desc: 'Cold climate, seafaring, strong community values' },
    { id: 'mediterranean', name: 'Mediterranean', desc: 'Warm coastal, passionate, historic trading culture' },
    { id: 'alpine', name: 'Alpine/Mountain', desc: 'Mountainous terrain, resilient, traditional values' },
    { id: 'eastern', name: 'Eastern European', desc: 'Rich history, industrial heritage, stoic culture' },
    { id: 'celtic', name: 'Celtic/Gaelic', desc: 'Mystical heritage, proud traditions, poetic' },
    { id: 'germanic', name: 'Germanic/Central', desc: 'Efficient, industrial, structured society' },
    { id: 'slavic', name: 'Slavic', desc: 'Diverse traditions, artistic, resilient spirit' },
    { id: 'iberian', name: 'Iberian', desc: 'Passionate, historic empires, regional pride' },
    { id: 'island', name: 'Island Nation', desc: 'Isolated, unique traditions, maritime focus' },
    { id: 'steppe', name: 'Steppe/Plains', desc: 'Nomadic heritage, vast open lands, horseback culture' },
    { id: 'desert', name: 'Desert/Arid', desc: 'Ancient civilizations, oasis cities, trading routes' },
    { id: 'tropical', name: 'Tropical', desc: 'Lush landscapes, vibrant culture, coastal communities' },
    { id: 'custom', name: 'Custom Description', desc: 'Describe your own unique culture' },
];

const SIZE_PRESETS = [
    { id: 'micro', name: 'Micro State', leagues: 1, clubs: '8-12', tiers: 1, topDiv: 8 },
    { id: 'small', name: 'Small Nation', leagues: 2, clubs: '16-24', tiers: 2, topDiv: 10 },
    { id: 'medium', name: 'Medium Nation', leagues: 4, clubs: '40-60', tiers: 3, topDiv: 14 },
    { id: 'large', name: 'Large Nation', leagues: 6, clubs: '80-120', tiers: 4, topDiv: 18 },
    { id: 'major', name: 'Major Power', leagues: 8, clubs: '120-180', tiers: 5, topDiv: 20 },
];

export default function NationGenerator() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    
    const [step, setStep] = useState(1);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedData, setGeneratedData] = useState(null);
    const [error, setError] = useState(null);
    
    const [config, setConfig] = useState({
        culturePreset: '',
        customCulture: '',
        sizePreset: 'medium',
        membership: 'VCC',
        generateFlag: true,
        generateClubs: true,
        generateLeagues: true,
        regionCount: 4,
        footballStyle: '',
        additionalNotes: '',
    });

    const generateNation = async () => {
        setIsGenerating(true);
        setError(null);
        
        const sizeConfig = SIZE_PRESETS.find(s => s.id === config.sizePreset);
        const cultureConfig = CULTURE_PRESETS.find(c => c.id === config.culturePreset);
        
        const cultureDesc = config.culturePreset === 'custom' 
            ? config.customCulture 
            : `${cultureConfig?.name}: ${cultureConfig?.desc}`;
        
        const prompt = `Generate a completely fictional football nation for the Volaria universe (a fictional world - NOT Earth).

CULTURE/STYLE: ${cultureDesc}
SIZE: ${sizeConfig?.name} (${sizeConfig?.clubs} clubs, ${sizeConfig?.tiers} league tiers, top division has ${sizeConfig?.topDiv} teams)
MEMBERSHIP: ${config.membership} (${config.membership === 'VCC' ? 'Full continental member' : 'Associate member'})
REGIONS: ${config.regionCount} major regions
${config.footballStyle ? `FOOTBALL STYLE: ${config.footballStyle}` : ''}
${config.additionalNotes ? `ADDITIONAL NOTES: ${config.additionalNotes}` : ''}

Generate the following in JSON format:
1. Nation details (name, capital, language, federation name, description, football history)
2. Primary and secondary colors for the flag (hex codes)
3. ${config.regionCount} region names that fit the culture
4. ${sizeConfig?.tiers} league names (tier 1 = top division)
5. ${sizeConfig?.topDiv + Math.floor(sizeConfig?.topDiv * 0.5)} club names with their home city/settlement and region

IMPORTANT: 
- All names must be FICTIONAL and fit the cultural style
- Club names should follow realistic naming conventions (FC, United, City, Sporting, etc. mixed with local terms)
- Each club needs a unique city/settlement name
- Make the nation feel authentic and lived-in with a rich football culture`;

        try {
            const result = await base44.integrations.Core.InvokeLLM({
                prompt,
                response_json_schema: {
                    type: "object",
                    properties: {
                        nation: {
                            type: "object",
                            properties: {
                                name: { type: "string" },
                                capital: { type: "string" },
                                language: { type: "string" },
                                federation_name: { type: "string" },
                                description: { type: "string" },
                                football_history: { type: "string" },
                                primary_color: { type: "string" },
                                secondary_color: { type: "string" }
                            }
                        },
                        regions: {
                            type: "array",
                            items: { type: "string" }
                        },
                        leagues: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    name: { type: "string" },
                                    tier: { type: "number" },
                                    teams: { type: "number" }
                                }
                            }
                        },
                        clubs: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    name: { type: "string" },
                                    city: { type: "string" },
                                    region: { type: "string" },
                                    nickname: { type: "string" }
                                }
                            }
                        }
                    }
                }
            });
            
            setGeneratedData(result);
            
            // Generate flag if requested
            if (config.generateFlag) {
                try {
                    const flagResult = await base44.integrations.Core.GenerateImage({
                        prompt: `A simple, elegant national flag design for a fictional nation called "${result.nation.name}". 
                        Style: ${cultureDesc}. 
                        Use colors: ${result.nation.primary_color} and ${result.nation.secondary_color}.
                        Clean geometric design suitable for a flag. No text, no complex imagery. 
                        Aspect ratio 3:2. Simple bold shapes.`
                    });
                    setGeneratedData(prev => ({
                        ...prev,
                        flag_url: flagResult.url
                    }));
                } catch (flagErr) {
                    console.error('Flag generation failed:', flagErr);
                }
            }
            
            setStep(2);
        } catch (err) {
            setError(err.message || 'Generation failed');
        } finally {
            setIsGenerating(false);
        }
    };

    const createNation = async () => {
        if (!generatedData) return;
        
        setIsGenerating(true);
        
        try {
            // Create nation
            const nation = await base44.entities.Nation.create({
                name: generatedData.nation.name,
                capital: generatedData.nation.capital,
                language: generatedData.nation.language,
                federation_name: generatedData.nation.federation_name,
                description: generatedData.nation.description,
                football_history: generatedData.nation.football_history,
                primary_color: generatedData.nation.primary_color,
                secondary_color: generatedData.nation.secondary_color,
                flag_url: generatedData.flag_url || null,
                membership: config.membership,
                region: 'Volaria',
            });
            
            // Create leagues if requested
            let createdLeagues = [];
            if (config.generateLeagues && generatedData.leagues) {
                for (const league of generatedData.leagues) {
                    const created = await base44.entities.League.create({
                        name: league.name,
                        nation_id: nation.id,
                        tier: league.tier,
                        number_of_teams: league.teams,
                        primary_color: generatedData.nation.primary_color,
                        secondary_color: generatedData.nation.secondary_color,
                    });
                    createdLeagues.push(created);
                }
            }
            
            // Create clubs if requested
            if (config.generateClubs && generatedData.clubs) {
                const topLeague = createdLeagues.find(l => l.tier === 1);
                const secondLeague = createdLeagues.find(l => l.tier === 2);
                
                for (let i = 0; i < generatedData.clubs.length; i++) {
                    const club = generatedData.clubs[i];
                    const sizeConfig = SIZE_PRESETS.find(s => s.id === config.sizePreset);
                    
                    // Assign to leagues based on order
                    let leagueId = null;
                    if (topLeague && i < sizeConfig.topDiv) {
                        leagueId = topLeague.id;
                    } else if (secondLeague) {
                        leagueId = secondLeague.id;
                    }
                    
                    await base44.entities.Club.create({
                        name: club.name,
                        nation_id: nation.id,
                        league_id: leagueId,
                        city: club.city,
                        settlement: club.city,
                        region: club.region,
                        nickname: club.nickname,
                        primary_color: generatedData.nation.primary_color,
                    });
                }
            }
            
            queryClient.invalidateQueries(['nations']);
            queryClient.invalidateQueries(['leagues']);
            queryClient.invalidateQueries(['clubs']);
            
            navigate(createPageUrl(`NationDetail?id=${nation.id}`));
        } catch (err) {
            setError(err.message || 'Creation failed');
            setIsGenerating(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <PageHeader 
                title="Nation Generator"
                subtitle="Create a complete fictional nation with AI"
                breadcrumbs={[{ label: 'Nations', url: createPageUrl('Nations') }, { label: 'Generator' }]}
            />

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {step === 1 && (
                    <div className="space-y-6">
                        {/* Culture Selection */}
                        <Card className="border-0 shadow-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Globe className="w-5 h-5" />
                                    Culture & Style
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {CULTURE_PRESETS.map(culture => (
                                        <button
                                            key={culture.id}
                                            onClick={() => setConfig(c => ({ ...c, culturePreset: culture.id }))}
                                            className={`p-3 rounded-lg border text-left transition-all ${
                                                config.culturePreset === culture.id 
                                                    ? 'border-emerald-500 bg-emerald-50' 
                                                    : 'border-slate-200 hover:border-slate-300'
                                            }`}
                                        >
                                            <div className="font-medium text-sm">{culture.name}</div>
                                            <div className="text-xs text-slate-500 mt-1">{culture.desc}</div>
                                        </button>
                                    ))}
                                </div>
                                
                                {config.culturePreset === 'custom' && (
                                    <div>
                                        <Label>Describe your culture</Label>
                                        <Textarea 
                                            value={config.customCulture}
                                            onChange={(e) => setConfig(c => ({ ...c, customCulture: e.target.value }))}
                                            placeholder="E.g., A volcanic archipelago with ancient warrior traditions and vibrant festivals..."
                                            className="mt-1"
                                        />
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Size Selection */}
                        <Card className="border-0 shadow-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Trophy className="w-5 h-5" />
                                    Nation Size
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                                    {SIZE_PRESETS.map(size => (
                                        <button
                                            key={size.id}
                                            onClick={() => setConfig(c => ({ ...c, sizePreset: size.id }))}
                                            className={`p-3 rounded-lg border text-center transition-all ${
                                                config.sizePreset === size.id 
                                                    ? 'border-emerald-500 bg-emerald-50' 
                                                    : 'border-slate-200 hover:border-slate-300'
                                            }`}
                                        >
                                            <div className="font-medium text-sm">{size.name}</div>
                                            <div className="text-xs text-slate-500 mt-1">{size.clubs} clubs</div>
                                            <div className="text-xs text-slate-400">{size.tiers} tiers</div>
                                        </button>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Options */}
                        <Card className="border-0 shadow-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Palette className="w-5 h-5" />
                                    Options
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>Continental Membership</Label>
                                        <Select value={config.membership} onValueChange={(v) => setConfig(c => ({ ...c, membership: v }))}>
                                            <SelectTrigger className="mt-1">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="VCC">VCC (Full Member)</SelectItem>
                                                <SelectItem value="CCC">CCC (Associate)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label>Number of Regions</Label>
                                        <Input 
                                            type="number" 
                                            value={config.regionCount}
                                            onChange={(e) => setConfig(c => ({ ...c, regionCount: parseInt(e.target.value) || 4 }))}
                                            min={2}
                                            max={12}
                                            className="mt-1"
                                        />
                                    </div>
                                </div>
                                
                                <div className="flex flex-wrap gap-6">
                                    <label className="flex items-center gap-2">
                                        <Checkbox 
                                            checked={config.generateFlag}
                                            onCheckedChange={(v) => setConfig(c => ({ ...c, generateFlag: v }))}
                                        />
                                        <span className="text-sm">Generate Flag (AI)</span>
                                    </label>
                                    <label className="flex items-center gap-2">
                                        <Checkbox 
                                            checked={config.generateLeagues}
                                            onCheckedChange={(v) => setConfig(c => ({ ...c, generateLeagues: v }))}
                                        />
                                        <span className="text-sm">Create Leagues</span>
                                    </label>
                                    <label className="flex items-center gap-2">
                                        <Checkbox 
                                            checked={config.generateClubs}
                                            onCheckedChange={(v) => setConfig(c => ({ ...c, generateClubs: v }))}
                                        />
                                        <span className="text-sm">Create Clubs</span>
                                    </label>
                                </div>
                                
                                <div>
                                    <Label>Football Style (optional)</Label>
                                    <Input 
                                        value={config.footballStyle}
                                        onChange={(e) => setConfig(c => ({ ...c, footballStyle: e.target.value }))}
                                        placeholder="E.g., Defensive, tactical, passionate fans, youth focus..."
                                        className="mt-1"
                                    />
                                </div>
                                
                                <div>
                                    <Label>Additional Notes (optional)</Label>
                                    <Textarea 
                                        value={config.additionalNotes}
                                        onChange={(e) => setConfig(c => ({ ...c, additionalNotes: e.target.value }))}
                                        placeholder="Any specific requirements or themes..."
                                        className="mt-1"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {error && (
                            <div className="p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>
                        )}

                        <Button 
                            onClick={generateNation} 
                            disabled={!config.culturePreset || isGenerating}
                            className="w-full bg-emerald-600 hover:bg-emerald-700"
                            size="lg"
                        >
                            {isGenerating ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
                            ) : (
                                <><Sparkles className="w-4 h-4 mr-2" /> Generate Nation</>
                            )}
                        </Button>
                    </div>
                )}

                {step === 2 && generatedData && (
                    <div className="space-y-6">
                        {/* Preview */}
                        <Card className="border-0 shadow-sm overflow-hidden">
                            <div 
                                className="p-6 text-white"
                                style={{ background: `linear-gradient(135deg, ${generatedData.nation.primary_color}, ${generatedData.nation.secondary_color})` }}
                            >
                                <div className="flex items-center gap-4">
                                    {generatedData.flag_url ? (
                                        <img src={generatedData.flag_url} alt="Flag" className="w-20 h-14 object-cover rounded shadow-lg" />
                                    ) : (
                                        <div className="w-20 h-14 bg-white/20 rounded flex items-center justify-center">
                                            <Flag className="w-8 h-8" />
                                        </div>
                                    )}
                                    <div>
                                        <h2 className="text-2xl font-bold">{generatedData.nation.name}</h2>
                                        <p className="text-white/80">{generatedData.nation.capital} • {generatedData.nation.language}</p>
                                    </div>
                                </div>
                            </div>
                            <CardContent className="p-6 space-y-4">
                                <p className="text-slate-600">{generatedData.nation.description}</p>
                                
                                <div>
                                    <h4 className="font-semibold mb-2">Regions ({generatedData.regions?.length})</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {generatedData.regions?.map((r, i) => (
                                            <span key={i} className="px-2 py-1 bg-slate-100 rounded text-sm">{r}</span>
                                        ))}
                                    </div>
                                </div>
                                
                                <div>
                                    <h4 className="font-semibold mb-2">Leagues ({generatedData.leagues?.length})</h4>
                                    <div className="space-y-1">
                                        {generatedData.leagues?.map((l, i) => (
                                            <div key={i} className="flex items-center gap-2 text-sm">
                                                <span className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-xs font-bold">{l.tier}</span>
                                                <span>{l.name}</span>
                                                <span className="text-slate-400">({l.teams} teams)</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                
                                <div>
                                    <h4 className="font-semibold mb-2">Clubs ({generatedData.clubs?.length})</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                                        {generatedData.clubs?.map((c, i) => (
                                            <div key={i} className="text-sm p-2 bg-slate-50 rounded">
                                                <div className="font-medium">{c.name}</div>
                                                <div className="text-xs text-slate-500">{c.city}, {c.region}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {error && (
                            <div className="p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>
                        )}

                        <div className="flex gap-4">
                            <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                                ← Regenerate
                            </Button>
                            <Button 
                                onClick={createNation} 
                                disabled={isGenerating}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                            >
                                {isGenerating ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</>
                                ) : (
                                    'Create Nation →'
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}