import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Sparkles, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import AdminOnly from '@/components/common/AdminOnly';

export default function AILocationStory({ location, nation, clubs = [], subLocations = [], onStoryGenerated }) {
    const [generating, setGenerating] = useState(false);
    const [story, setStory] = useState(location.culture_description || null);

    const generateStory = async () => {
        setGenerating(true);
        try {
            // Calculate club statistics
            const totalTitles = clubs.reduce((sum, c) => sum + (c.league_titles || 0) + (c.domestic_cup_titles || 0), 0);
            const continentalTitles = clubs.reduce((sum, c) => sum + (c.vcc_titles || 0) + (c.ccc_titles || 0), 0);
            const topFlightClubs = clubs.filter(c => {
                const league = c.league_id;
                // Would need league data but approximate
                return (c.seasons_top_flight || 0) > 0;
            });
            
            const mostSuccessful = clubs.sort((a, b) => 
                ((b.league_titles || 0) + (b.domestic_cup_titles || 0)) - 
                ((a.league_titles || 0) + (a.domestic_cup_titles || 0))
            )[0];

            // Check if Turuliand
            const isTuruliand = nation?.name === 'Turuliand';
            let tfaContext = '';
            if (isTuruliand && clubs.length > 0) {
                const tfaClubs = clubs.filter(c => (c.seasons_in_tfa || 0) > 0 || c.league_id);
                const nonLeagueClubs = clubs.filter(c => (c.seasons_in_tfa || 0) === 0);
                tfaContext = `\nTFA CONTEXT: ${tfaClubs.length} clubs have TFA experience, ${nonLeagueClubs.length} are non-league only. This distinction is HUGE in Turuliand - TFA means organized football, recognition, regular fixtures. Non-league means regional obscurity, sparse matches, minimal infrastructure.`;
            }

            const prompt = `Write a deeply personal and immersive 3 paragraph story about ${location.name}, a ${location.type} in ${nation?.name}. Make this feel UNIQUE based on actual data about this place and its football clubs.

LOCATION DATA:
- Type: ${location.type} (${location.settlement_size || 'N/A'})
- Parent areas: ${[location.parent_district, location.parent_region].filter(Boolean).join(', ') || 'None'}
- Is capital: ${location.is_capital ? 'YES' : 'No'}
- Population: ${location.population?.toLocaleString() || 'Unknown'}
- Geography: ${location.geography || 'Not specified'}
- Industries: ${location.industries || 'Not specified'}
- Landmarks: ${location.landmarks || 'Not specified'}

FOOTBALL DATA:
- Total clubs: ${clubs.length}
- Club names: ${clubs.map(c => c.name).join(', ')}
- Total trophies won by local clubs: ${totalTitles} (${continentalTitles} continental)
- Most successful: ${mostSuccessful?.name || 'N/A'} (${(mostSuccessful?.league_titles || 0) + (mostSuccessful?.domestic_cup_titles || 0)} trophies)
- Top flight clubs: ${topFlightClubs.length > 0 ? topFlightClubs.map(c => c.name).join(', ') : 'None'}
${tfaContext}

SUB-LOCATIONS: ${subLocations.length > 0 ? subLocations.map(sl => `${sl.name} (${sl.type})`).join(', ') : 'None'}

REQUIREMENTS:
1. First paragraph: What IS this place? Use geography, industries, landmarks, size. Paint a picture of the physical location and its character. Reference actual details provided.

2. Second paragraph: Football culture here. How do the ${clubs.length} clubs shape local identity? ${clubs.length >= 2 ? `Talk about the derby/rivalries between ${clubs.slice(0, 3).map(c => c.name).join(', ')}.` : `How does ${clubs[0]?.name} unite the community?`} Use actual trophy data. ${isTuruliand ? 'For Turuliand: explain TFA vs non-league context if relevant.' : ''}

3. Third paragraph: What makes this location special in ${nation?.name}? ${location.is_capital ? 'As the capital, how does that status affect football here?' : ''} What's the relationship between the ${subLocations.length > 0 ? 'settlements' : 'neighborhoods'}? Future outlook?

TONE: Vivid, specific, grounded in data. Make every location feel distinct. Reference actual club names, numbers, geography. Avoid generic descriptions.

Do NOT use markdown. Plain paragraphs separated by double line breaks.`;

            const result = await base44.integrations.Core.InvokeLLM({ 
                prompt,
                add_context_from_internet: false
            });

            // Save to location record
            await base44.entities.Location.update(location.id, { culture_description: result });
            setStory(result);
            
            if (onStoryGenerated) {
                onStoryGenerated(result);
            }
        } catch (error) {
            console.error('Error generating location story:', error);
        } finally {
            setGenerating(false);
        }
    };

    return (
        <Card className="border-0 shadow-sm mb-6">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-emerald-600" />
                        The Story of {location.name}
                    </CardTitle>
                    <AdminOnly>
                        <Button 
                            onClick={generateStory} 
                            disabled={generating}
                            size="sm"
                            variant="outline"
                        >
                            {generating ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
                            ) : (
                                <><Sparkles className="w-4 h-4 mr-2" /> {story ? 'Regenerate' : 'Generate'} Story</>
                            )}
                        </Button>
                    </AdminOnly>
                </div>
            </CardHeader>
            <CardContent>
                {story ? (
                    <div className="prose prose-sm max-w-none">
                        {story.split('\n\n').map((para, idx) => (
                            <p key={idx} className="text-slate-700 leading-relaxed mb-4">{para}</p>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-slate-500">
                        <BookOpen className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                        <p className="mb-4">No story written yet for this location.</p>
                        <AdminOnly>
                            <Button onClick={generateStory} disabled={generating}>
                                {generating ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
                                ) : (
                                    <><Sparkles className="w-4 h-4 mr-2" /> Generate AI Story</>
                                )}
                            </Button>
                        </AdminOnly>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}