import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Sparkles, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import AdminOnly from '@/components/common/AdminOnly';

export default function AIClubStory({ club, nation, league, seasons = [], allLeagues = [], allClubs = [], onStoryGenerated }) {
    const [generating, setGenerating] = useState(false);
    const [story, setStory] = useState(club.history || null);

    const generateStory = async () => {
        setGenerating(true);
        try {
            // Build comprehensive context
            const tfaSeasons = seasons.filter(s => {
                const tier = allLeagues.find(l => l.id === s.league_id)?.tier;
                return tier && tier <= 4;
            });
            const nonTfaSeasons = seasons.filter(s => {
                const tier = allLeagues.find(l => l.id === s.league_id)?.tier;
                return tier && tier > 4;
            });
            const currentTier = league?.tier || 1;
            const isTuruliand = nation?.name === 'Turuliand';
            
            // Get rivals
            const rivals = (club.rival_club_ids || [])
                .map(id => allClubs.find(c => c.id === id))
                .filter(Boolean)
                .slice(0, 3);

            // Build TFA context
            let tfaContext = '';
            if (isTuruliand && seasons.length > 0) {
                if (tfaSeasons.length === 0 && nonTfaSeasons.length > 0) {
                    tfaContext = `They have NEVER reached the TFA (Turuliand's top 4 organized tiers). ${nonTfaSeasons.length} seasons entirely in non-league/regional football. The TFA is a distant dream.`;
                } else if (tfaSeasons.length > 0 && currentTier > 4) {
                    const lastTfa = [...tfaSeasons].sort((a, b) => b.year.localeCompare(a.year))[0];
                    const seasonsAway = seasons.filter(s => s.year > lastTfa.year).length;
                    tfaContext = `They had ${tfaSeasons.length} season${tfaSeasons.length > 1 ? 's' : ''} in the TFA but dropped out in ${lastTfa.year}. Now ${seasonsAway} seasons in non-league wilderness. Current league: ${league?.name}. This is CRUCIAL - emphasize the stark difference between structured TFA football and sparse regional non-league matches.`;
                } else if (tfaSeasons.length > 0 && currentTier <= 4) {
                    tfaContext = `Currently in the TFA (${league?.name}, Tier ${currentTier}). ${tfaSeasons.length} total TFA seasons${nonTfaSeasons.length > 0 ? `, but they spent ${nonTfaSeasons.length} seasons in non-league before climbing up` : ', always in organized football'}.`;
                } else if (currentTier <= 4 && tfaSeasons.length === seasons.length) {
                    tfaContext = `TFA stalwarts - ALL ${tfaSeasons.length} recorded seasons in the organized leagues. Non-league is alien to them.`;
                }
            }

            const prompt = `Write a deeply personal and immersive 3-4 paragraph story about ${club.name}, a football club in ${nation?.name}. This should feel UNIQUE to this club based on their actual data.

CLUB DATA:
- Location: ${[club.settlement, club.district, club.region].filter(Boolean).join(', ') || club.city || 'Unknown'}
- Founded: ${club.founded_year || 'Unknown'}
- Nickname: ${club.nickname || 'None'}
- Stadium: ${club.stadium || 'Unknown'} (${club.stadium_capacity ? `${club.stadium_capacity.toLocaleString()} capacity` : 'capacity unknown'})
- Current League: ${league?.name || 'Unknown'} (Tier ${currentTier})
- Rivals: ${rivals.length > 0 ? rivals.map(r => r.name).join(', ') : 'None specified'}

HISTORY:
- Seasons played: ${club.seasons_played || 0}
- Top flight seasons: ${club.seasons_top_flight || 0}
- League titles: ${club.league_titles || 0}${club.title_years ? ` (${club.title_years})` : ''}
- Domestic cup titles: ${club.domestic_cup_titles || 0}
- VCC titles: ${club.vcc_titles || 0}, CCC titles: ${club.ccc_titles || 0}
- Promotions: ${club.promotions || 0}, Relegations: ${club.relegations || 0}
- Best finish: ${club.best_finish ? `${club.best_finish}${club.best_finish === 1 ? 'st' : club.best_finish === 2 ? 'nd' : club.best_finish === 3 ? 'rd' : 'th'} (${club.best_finish_year || 'unknown year'})` : 'No data'}
- Professional status: ${club.professional_status || 'Unknown'}

${tfaContext ? `\nTURULIAND TFA STATUS (CRITICAL):\n${tfaContext}\n` : ''}

REQUIREMENTS:
1. First paragraph: The club's origins and identity - what makes them unique? Use their location, founding story, name meaning if relevant. Make it PERSONAL to ${[club.settlement, club.district, club.region].filter(Boolean)[0] || club.city || 'their town'}.

2. Second paragraph: Their footballing journey - the highs and lows. Reference ACTUAL seasons, years, achievements. ${tfaContext ? 'For Turuliand clubs, the TFA vs non-league distinction is HUGE - explain what this means emotionally (organized fixtures vs sparse regional games, recognition vs obscurity).' : ''}

3. Third paragraph: Their current status and what defines them today. Where do they sit in the hierarchy? What's their relationship to ${rivals.length > 0 ? 'their rivals (' + rivals.map(r => r.name).join(', ') + ')' : 'other local clubs'}? What are fans feeling right now?

4. Optional fourth: If they have interesting data quirks (yo-yo club, fallen giant, never relegated, etc), explore this emotionally.

TONE: Engaging, emotionally resonant, like a documentary. Use specific data points (years, numbers, names). Avoid clichés. Make every club story feel completely different.

Do NOT use markdown. Just plain paragraphs separated by double line breaks.`;

            const result = await base44.integrations.Core.InvokeLLM({ 
                prompt,
                add_context_from_internet: false
            });

            setStory(result);
            
            // Save to club record
            if (onStoryGenerated) {
                await base44.entities.Club.update(club.id, { history: result });
                onStoryGenerated(result);
            }
        } catch (error) {
            console.error('Error generating story:', error);
        } finally {
            setGenerating(false);
        }
    };

    return (
        <Card 
            className="border-0 shadow-sm mb-6" 
            style={{ 
                borderLeft: club.accent_color ? `4px solid ${club.accent_color}` : undefined,
                backgroundColor: club.primary_color ? `${club.primary_color}03` : undefined
            }}
        >
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5" style={{ color: club.accent_color || '#10b981' }} />
                        The Story of {club.name}
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
                        <p className="mb-4">No story written yet for this club.</p>
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