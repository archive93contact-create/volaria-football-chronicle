import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Sparkles, MapPin } from 'lucide-react';
import { toast } from 'sonner';

export default function GeographyGenerator({ nations, clubs, locations, onComplete }) {
    const [open, setOpen] = useState(false);
    const [generating, setGenerating] = useState(false);

    const generateGeography = async () => {
        setGenerating(true);
        toast.loading('🌍 Generating world geography...', { id: 'geo-gen', duration: Infinity });

        try {
            // Step 1: Generate nation positions (0-1000 coordinate system)
            const nationsWithoutCoords = nations.filter(n => !n.latitude || !n.longitude);
            
            if (nationsWithoutCoords.length > 0) {
                toast.loading(`Positioning ${nationsWithoutCoords.length} nations on the map...`, { id: 'geo-gen' });
                
                const nationList = nationsWithoutCoords.map(n => ({
                    id: n.id,
                    name: n.name,
                    region: n.region,
                    membership: n.membership
                }));

                const nationPrompt = `Create a fictional world map layout for these ${nationList.length} nations on a 1000x1000 coordinate grid:
${JSON.stringify(nationList, null, 2)}

RULES:
- Distribute nations realistically across the 1000x1000 grid
- Group nations by region (same region = nearby)
- VCC nations should be in prime central/coastal areas
- CCC nations more scattered/peripheral
- Leave space between nations for cities/clubs
- Each nation should have map_bounds (north, south, east, west coordinates)

Return: { nations: [{ id, latitude, longitude, map_bounds: {north, south, east, west} }] }`;

                const nationResult = await base44.integrations.Core.InvokeLLM({
                    prompt: nationPrompt,
                    response_json_schema: {
                        type: "object",
                        properties: {
                            nations: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        id: { type: "string" },
                                        latitude: { type: "number" },
                                        longitude: { type: "number" },
                                        map_bounds: {
                                            type: "object",
                                            properties: {
                                                north: { type: "number" },
                                                south: { type: "number" },
                                                east: { type: "number" },
                                                west: { type: "number" }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                });

                // Update nations with coordinates
                if (nationResult?.nations) {
                    await Promise.all(nationResult.nations.map(n => 
                        base44.entities.Nation.update(n.id, {
                            latitude: n.latitude,
                            longitude: n.longitude,
                            map_bounds: n.map_bounds
                        })
                    ));
                }
            }

            // Step 2: Position clubs within their nations
            const clubsWithoutCoords = clubs.filter(c => !c.latitude || !c.longitude);
            
            if (clubsWithoutCoords.length > 0) {
                toast.loading(`Positioning ${clubsWithoutCoords.length} clubs...`, { id: 'geo-gen' });
                
                // Group clubs by nation
                const clubsByNation = {};
                clubsWithoutCoords.forEach(club => {
                    const nation = nations.find(n => n.id === club.nation_id);
                    if (nation && nation.latitude && nation.longitude) {
                        if (!clubsByNation[nation.id]) {
                            clubsByNation[nation.id] = {
                                nation,
                                clubs: []
                            };
                        }
                        clubsByNation[nation.id].clubs.push(club);
                    }
                });

                // Process each nation's clubs
                for (const [nationId, data] of Object.entries(clubsByNation)) {
                    const { nation, clubs } = data;
                    
                    const clubPrompt = `Place these ${clubs.length} football clubs within ${nation.name} on the map.

Nation center: (${nation.latitude}, ${nation.longitude})
Nation bounds: ${JSON.stringify(nation.map_bounds)}
Clubs: ${JSON.stringify(clubs.map(c => ({ id: c.id, name: c.name, city: c.city, settlement: c.settlement })), null, 2)}

RULES:
- Place clubs within nation's boundaries
- Capital city clubs near nation center
- Spread clubs realistically (cities, towns)
- Major clubs in larger settlements
- Ensure coordinates are within nation bounds

Return: { clubs: [{ id, latitude, longitude }] }`;

                    const clubResult = await base44.integrations.Core.InvokeLLM({
                        prompt: clubPrompt,
                        response_json_schema: {
                            type: "object",
                            properties: {
                                clubs: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            id: { type: "string" },
                                            latitude: { type: "number" },
                                            longitude: { type: "number" }
                                        }
                                    }
                                }
                            }
                        }
                    });

                    if (clubResult?.clubs) {
                        await Promise.all(clubResult.clubs.map(c => 
                            base44.entities.Club.update(c.id, {
                                latitude: c.latitude,
                                longitude: c.longitude
                            })
                        ));
                    }
                }
            }

            // Step 3: Position locations (settlements, districts, regions)
            const locationsWithoutCoords = locations.filter(l => !l.latitude || !l.longitude);
            
            if (locationsWithoutCoords.length > 0) {
                toast.loading(`Positioning ${locationsWithoutCoords.length} locations...`, { id: 'geo-gen' });
                
                const locationsByNation = {};
                locationsWithoutCoords.forEach(loc => {
                    const nation = nations.find(n => n.id === loc.nation_id);
                    if (nation && nation.latitude && nation.longitude) {
                        if (!locationsByNation[nation.id]) {
                            locationsByNation[nation.id] = {
                                nation,
                                locations: []
                            };
                        }
                        locationsByNation[nation.id].locations.push(loc);
                    }
                });

                for (const [nationId, data] of Object.entries(locationsByNation)) {
                    const { nation, locations } = data;
                    
                    const locPrompt = `Place these locations within ${nation.name}:

Nation bounds: ${JSON.stringify(nation.map_bounds)}
Locations: ${JSON.stringify(locations.map(l => ({ 
                        id: l.id, 
                        name: l.name, 
                        type: l.type, 
                        is_capital: l.is_capital,
                        parent_region: l.parent_region,
                        parent_district: l.parent_district
                    })), null, 2)}

RULES:
- Capital at/near nation center
- Regions are large areas
- Districts within regions
- Settlements (cities/towns) as specific points
- Maintain geographic hierarchy

Return: { locations: [{ id, latitude, longitude }] }`;

                    const locResult = await base44.integrations.Core.InvokeLLM({
                        prompt: locPrompt,
                        response_json_schema: {
                            type: "object",
                            properties: {
                                locations: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            id: { type: "string" },
                                            latitude: { type: "number" },
                                            longitude: { type: "number" }
                                        }
                                    }
                                }
                            }
                        }
                    });

                    if (locResult?.locations) {
                        await Promise.all(locResult.locations.map(l => 
                            base44.entities.Location.update(l.id, {
                                latitude: l.latitude,
                                longitude: l.longitude
                            })
                        ));
                    }
                }
            }

            toast.dismiss('geo-gen');
            toast.success('World geography generated! Refresh to see the map.');
            setOpen(false);
            onComplete?.();
        } catch (error) {
            toast.dismiss('geo-gen');
            toast.error(`Failed to generate geography: ${error.message}`);
            console.error('Geography generation error:', error);
        } finally {
            setGenerating(false);
        }
    };

    const missingCount = 
        nations.filter(n => !n.latitude).length +
        clubs.filter(c => !c.latitude).length +
        locations.filter(l => !l.latitude).length;

    return (
        <>
            <Button onClick={() => setOpen(true)} className="bg-purple-600 hover:bg-purple-700">
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Geography
                {missingCount > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                        {missingCount} missing
                    </span>
                )}
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Generate World Geography</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg mb-4">
                            <MapPin className="w-5 h-5 text-purple-600 mt-0.5" />
                            <div className="flex-1 text-sm">
                                <p className="font-semibold text-purple-900 mb-1">AI Geography Generator</p>
                                <p className="text-purple-700">
                                    This will use AI to intelligently place {missingCount} entities on the map:
                                </p>
                                <ul className="mt-2 space-y-1 text-purple-600">
                                    <li>• Nations positioned by region and membership</li>
                                    <li>• Clubs placed within nation boundaries</li>
                                    <li>• Settlements distributed realistically</li>
                                </ul>
                            </div>
                        </div>

                        <p className="text-sm text-slate-500 mb-6">
                            Takes 30-60 seconds. You can manually adjust positions later by clicking "Enable Edit Mode" on the map.
                        </p>

                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setOpen(false)} disabled={generating}>
                                Cancel
                            </Button>
                            <Button 
                                onClick={generateGeography} 
                                disabled={generating}
                                className="bg-purple-600 hover:bg-purple-700"
                            >
                                {generating ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4 mr-2" />
                                        Generate
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}