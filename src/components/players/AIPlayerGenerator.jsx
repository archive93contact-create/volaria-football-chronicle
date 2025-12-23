import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function AIPlayerGenerator({ club, nation, onPlayersGenerated }) {
    const [open, setOpen] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [count, setCount] = useState('25');
    const [ageRange, setAgeRange] = useState('balanced');
    const [qualityLevel, setQualityLevel] = useState('realistic');
    const [namingStyles, setNamingStyles] = useState([]);
    const [overwriteExisting, setOverwriteExisting] = useState(false);

    const generatePlayers = async () => {
        setGenerating(true);
        try {
            // Delete existing squad first
            const existingPlayers = await base44.entities.Player.filter({ club_id: club.id });
            if (existingPlayers.length > 0) {
                await Promise.all(existingPlayers.map(p => base44.entities.Player.delete(p.id)));
            }

            // Build prompt for AI to generate player data
            const tier = await (async () => {
                if (!club.league_id) return 5;
                const leagues = await base44.entities.League.filter({ id: club.league_id });
                return leagues[0]?.tier || 5;
            })();

            const ageProfiles = {
                young: 'mostly young players ages 17-23, some experienced 24-28',
                balanced: 'mix of youth (17-20), prime (21-28), and experienced (29-34)',
                experienced: 'mostly experienced players ages 26-34, some young prospects'
            };

            const qualityLevels = {
                top: `elite quality ratings 75-90, world-class potential for top tier ${tier} club`,
                good: `strong quality ratings 65-80, competitive for tier ${tier}`,
                realistic: `realistic ratings 55-75 suitable for tier ${tier} club`,
                lower: `modest ratings 45-65, developing tier ${tier} squad`
            };

            const namingStylesText = namingStyles.length > 0 
                ? `Use these naming styles: ${namingStyles.join(', ')}. Mix them realistically.`
                : `Use ${nation?.language || 'diverse'} naming conventions.`;

            // Adjust foreign player percentage based on tier
            const foreignPlayerPercent = tier === 1 ? '25-35%' : tier === 2 ? '15-25%' : tier === 3 ? '10-15%' : tier === 4 ? '5-10%' : '0-5%';
            const nationalityText = `${100 - parseInt(foreignPlayerPercent)}% players from ${nation?.name || 'home nation'}, ${foreignPlayerPercent} from neighboring or culturally similar nations (realistic foreign signings for tier ${tier} club).`;

            const prompt = `Generate ${count} football player names for ${club.name} in ${nation?.name || 'a fictional nation'}.
Squad composition: ${ageProfiles[ageRange]}.
Quality: ${qualityLevels[qualityLevel]}.
Positions needed: 2-3 GK, 7-9 defenders (CB, LB, RB), 8-10 midfielders (CDM, CM, CAM), 6-8 forwards (LW, RW, ST).
${namingStylesText}
${nationalityText}
For each player provide: first_name, last_name, age, position (GK/CB/LB/RB/CDM/CM/CAM/LW/RW/ST), overall_rating (30-99), potential (overall+0 to +15), preferred_foot (Left/Right/Both), nationality (make realistic based on club nation and neighbors).`;

            const result = await base44.integrations.Core.InvokeLLM({
                prompt,
                response_json_schema: {
                    type: "object",
                    properties: {
                        players: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    first_name: { type: "string" },
                                    last_name: { type: "string" },
                                    age: { type: "number" },
                                    position: { type: "string" },
                                    overall_rating: { type: "number" },
                                    potential: { type: "number" },
                                    preferred_foot: { type: "string" },
                                    nationality: { type: "string" },
                                    birth_place: { type: "string" }
                                }
                            }
                        }
                    }
                }
            });

            if (result?.players) {
                // If overwrite, delete existing players first
                if (overwriteExisting) {
                    const existingPlayers = await base44.entities.Player.filter({ club_id: club.id });
                    for (const player of existingPlayers) {
                        await base44.entities.Player.delete(player.id);
                    }
                }

                // Assign shirt numbers
                let shirtNum = 1;
                const playersWithDetails = result.players.map(p => ({
                    ...p,
                    club_id: club.id,
                    nation_id: nation?.id,
                    full_name: `${p.first_name} ${p.last_name}`,
                    shirt_number: shirtNum++
                }));

                // Bulk create players
                await base44.entities.Player.bulkCreate(playersWithDetails);
                
                toast.success(`${overwriteExisting ? 'Replaced squad with' : 'Generated'} ${result.players.length} players!`);
                setOpen(false);
                onPlayersGenerated?.();
            }
        } catch (error) {
            toast.error('Failed to generate players');
            console.error(error);
        } finally {
            setGenerating(false);
        }
    };

    return (
        <>
            <Button onClick={() => setOpen(true)} className="bg-purple-600 hover:bg-purple-700">
                <Sparkles className="w-4 h-4 mr-2" />
                AI Generate Squad
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>AI Squad Generator</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label>Number of Players</Label>
                            <Select value={count} onValueChange={setCount}>
                                <SelectTrigger className="mt-1">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="15">15 players</SelectItem>
                                    <SelectItem value="20">20 players</SelectItem>
                                    <SelectItem value="25">25 players (recommended)</SelectItem>
                                    <SelectItem value="30">30 players</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>Age Profile</Label>
                            <Select value={ageRange} onValueChange={setAgeRange}>
                                <SelectTrigger className="mt-1">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="young">Young Squad (17-23)</SelectItem>
                                    <SelectItem value="balanced">Balanced (17-34)</SelectItem>
                                    <SelectItem value="experienced">Experienced (26-34)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>Quality Level</Label>
                            <Select value={qualityLevel} onValueChange={setQualityLevel}>
                                <SelectTrigger className="mt-1">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="top">Top Quality (75-90)</SelectItem>
                                    <SelectItem value="good">Good Quality (65-80)</SelectItem>
                                    <SelectItem value="realistic">Realistic (55-75)</SelectItem>
                                    <SelectItem value="lower">Developing (45-65)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>Naming Styles (optional, select up to 4)</Label>
                            <div className="grid grid-cols-2 gap-2 mt-2 p-3 bg-slate-50 rounded-lg max-h-48 overflow-y-auto">
                                {[
                                    'English/British', 'Spanish', 'Italian', 'German', 'French', 'Portuguese',
                                    'Dutch', 'Scandinavian', 'Eastern European', 'Balkan', 'Turkish',
                                    'Arabic', 'African', 'Brazilian', 'Asian', 'Celtic', 'Nordic'
                                ].map(style => (
                                    <label key={style} className="flex items-center gap-2 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={namingStyles.includes(style)}
                                            onChange={(e) => {
                                                if (e.target.checked && namingStyles.length < 4) {
                                                    setNamingStyles([...namingStyles, style]);
                                                } else if (!e.target.checked) {
                                                    setNamingStyles(namingStyles.filter(s => s !== style));
                                                }
                                            }}
                                            disabled={!namingStyles.includes(style) && namingStyles.length >= 4}
                                            className="rounded"
                                        />
                                        {style}
                                    </label>
                                ))}
                            </div>
                            <p className="text-xs text-slate-500 mt-1">{namingStyles.length}/4 styles selected</p>
                        </div>

                        <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                            <input
                                type="checkbox"
                                id="overwrite"
                                checked={overwriteExisting}
                                onChange={(e) => setOverwriteExisting(e.target.checked)}
                                className="rounded"
                            />
                            <Label htmlFor="overwrite" className="cursor-pointer text-sm text-amber-800">
                                Overwrite existing squad (deletes all current players)
                            </Label>
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                            <Button onClick={generatePlayers} disabled={generating} className="bg-purple-600">
                                {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                                Generate Squad
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}