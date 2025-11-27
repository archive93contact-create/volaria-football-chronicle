import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, RefreshCw, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function ClubProfile({ club, nation, league, seasons = [] }) {
    const [generatedHistory, setGeneratedHistory] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);

    // Auto-generate if no custom history exists
    useEffect(() => {
        if (!club?.history && club?.name && !generatedHistory && !isGenerating) {
            generateHistory();
        }
    }, [club?.id]);

    const generateHistory = async () => {
        if (!club) return;
        setIsGenerating(true);

        try {
            // Build context for the AI
            const sortedSeasons = [...seasons].sort((a, b) => a.year.localeCompare(b.year));
            const firstSeason = sortedSeasons[0];
            const foundingYear = club.founded_year || (firstSeason?.year?.split('-')[0] ? parseInt(firstSeason.year.split('-')[0]) : null);
            
            const context = {
                name: club.name,
                nickname: club.nickname,
                city: club.city || club.settlement,
                region: club.region,
                district: club.district,
                settlement: club.settlement,
                nation: nation?.name,
                foundingYear,
                stadium: club.stadium,
                leagueTitles: club.league_titles || 0,
                cupTitles: club.domestic_cup_titles || 0,
                vccTitles: club.vcc_titles || 0,
                cccTitles: club.ccc_titles || 0,
                seasonsPlayed: club.seasons_played || seasons.length,
                topFlightSeasons: club.seasons_top_flight || 0,
                promotions: club.promotions || 0,
                relegations: club.relegations || 0,
                bestFinish: club.best_finish,
                bestFinishTier: club.best_finish_tier,
                currentLeague: league?.name,
                currentTier: league?.tier,
                firstTopFlightYear: sortedSeasons.find(s => {
                    // Approximate - we'd need leagues data here
                    return s.position <= 12; // rough proxy for top flight
                })?.year,
            };

            const prompt = `Write a short 2-3 sentence fictional history paragraph for a football club. Be creative and immersive. Use these details:

Club: ${context.name}
${context.nickname ? `Nickname: "${context.nickname}"` : ''}
Location: ${[context.settlement, context.district, context.region, context.nation].filter(Boolean).join(', ')}
${context.foundingYear ? `Founded: ${context.foundingYear}` : 'Founding year unknown'}
${context.stadium ? `Home: ${context.stadium}` : ''}

Performance:
- ${context.seasonsPlayed} seasons of recorded history
- ${context.leagueTitles} league title${context.leagueTitles !== 1 ? 's' : ''}
- ${context.cupTitles} cup title${context.cupTitles !== 1 ? 's' : ''}
${context.vccTitles ? `- ${context.vccTitles} VCC (Champions Cup) title${context.vccTitles !== 1 ? 's' : ''}` : ''}
${context.cccTitles ? `- ${context.cccTitles} CCC title${context.cccTitles !== 1 ? 's' : ''}` : ''}
- ${context.topFlightSeasons} seasons in top flight
- ${context.promotions} promotions, ${context.relegations} relegations
${context.bestFinish ? `- Best finish: ${context.bestFinish}${context.bestFinish === 1 ? 'st' : context.bestFinish === 2 ? 'nd' : context.bestFinish === 3 ? 'rd' : 'th'}${context.bestFinishTier ? ` (Tier ${context.bestFinishTier})` : ''}` : ''}
${context.currentLeague ? `Currently in: ${context.currentLeague} (Tier ${context.currentTier})` : ''}

Write a creative founding story that:
1. Explains why the club might have been founded (local industry, community, workers, students, etc.)
2. References the location naturally
3. Hints at their historical performance (successful/struggling/yo-yo/underdog etc.)
4. Feels authentic and immersive

Keep it concise - 2-3 sentences maximum. Don't use phrases like "Founded in..." to start. Be creative with the narrative.`;

            const response = await base44.integrations.Core.InvokeLLM({
                prompt,
                response_json_schema: {
                    type: "object",
                    properties: {
                        history: { type: "string" }
                    },
                    required: ["history"]
                }
            });

            setGeneratedHistory(response.history);
        } catch (error) {
            console.error('Failed to generate history:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    // If club has custom history, show that
    if (club?.history) {
        return (
            <Card className="border-0 shadow-sm mb-6">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <BookOpen className="w-5 h-5 text-emerald-600" />
                        About the Club
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-slate-600 leading-relaxed">{club.history}</p>
                </CardContent>
            </Card>
        );
    }

    // Show generated or generating state
    return (
        <Card className="border-0 shadow-sm mb-6">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <BookOpen className="w-5 h-5 text-emerald-600" />
                        About the Club
                    </CardTitle>
                    {generatedHistory && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={generateHistory}
                            disabled={isGenerating}
                            className="text-slate-500 hover:text-slate-700"
                        >
                            <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                {isGenerating ? (
                    <div className="flex items-center gap-2 text-slate-500">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Generating club history...</span>
                    </div>
                ) : generatedHistory ? (
                    <p className="text-slate-600 leading-relaxed italic">{generatedHistory}</p>
                ) : (
                    <p className="text-slate-400 text-sm">No club history available</p>
                )}
            </CardContent>
        </Card>
    );
}