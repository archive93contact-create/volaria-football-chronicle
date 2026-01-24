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

            // Get club succession/merger context
            const predecessorClub = club.predecessor_club_id ? allClubs.find(c => c.id === club.predecessor_club_id) : null;
            const predecessorClub2 = club.predecessor_club_2_id ? allClubs.find(c => c.id === club.predecessor_club_2_id) : null;
            const successorClub = club.successor_club_id ? allClubs.find(c => c.id === club.successor_club_id) : null;
            const formerNameClub = club.former_name_club_id ? allClubs.find(c => c.id === club.former_name_club_id) : null;
            const currentNameClub = club.current_name_club_id ? allClubs.find(c => c.id === club.current_name_club_id) : null;

            // Build succession context - MUST be mentioned in the story
            let successionContext = '';
            if (club.is_defunct && successorClub) {
                successionContext = `\n🔴 DEFUNCT CLUB (MUST MENTION): This club is defunct/disbanded as of ${club.defunct_year || 'unknown year'}. They were succeeded by ${successorClub.name}. **You MUST mention this** - explain the bittersweet ending where the club is gone but lives on through their successor.`;
            } else if (club.is_defunct) {
                successionContext = `\n🔴 DEFUNCT CLUB (MUST MENTION): This club is defunct/disbanded as of ${club.defunct_year || 'unknown year'} with no successor. **You MUST mention this** - treat it as a tragic ending where a club simply ceased to exist.`;
            }

            if (predecessorClub && predecessorClub2) {
                successionContext += `\n\n🔴 FORMED FROM MERGER (MUST MENTION): ${club.name} was formed in their founding year from a merger of ${predecessorClub.name} (defunct ${predecessorClub.defunct_year || 'earlier'}) and ${predecessorClub2.name} (defunct ${predecessorClub2.defunct_year || 'earlier'}). **You MUST mention this merger as their origin story** - two clubs became one to create this club.`;
            } else if (predecessorClub) {
                successionContext += `\n\n🔴 REFORMATION/CONTINUATION (MUST MENTION): ${club.name} continues the legacy of ${predecessorClub.name} (defunct ${predecessorClub.defunct_year || 'earlier'}). **You MUST mention this** - the club was reformed/restarted as a phoenix rising from the ashes of their predecessor.`;
            }

            if (club.is_former_name && currentNameClub) {
                successionContext += `\n\n🔴 FORMER NAME RECORD (MUST MENTION): This record represents a former name. The club is now known as ${currentNameClub.name} (changed ${club.renamed_year || 'later'}). **You MUST explain this is the same club**, just renamed - maintain continuity in the story.`;
            } else if (formerNameClub || club.former_name_club_id) {
                const formerName = formerNameClub?.name || 'their previous name';
                successionContext += `\n\n🔴 NAME CHANGE (MUST MENTION): This club was formerly known as ${formerName} until ${club.renamed_year || 'they changed their name'}${club.reverted_to_original ? ' (they reverted to their original name)' : ''}. **You MUST mention this name change** - same club, different name, explain the continuity and why they changed.`;
            }
            
            if (club.former_name_club_2_id) {
                const formerName2 = allClubs.find(c => c.id === club.former_name_club_2_id);
                if (formerName2) {
                    successionContext += `\n\nSECOND NAME CHANGE: The club also had another previous name: ${formerName2.name}. **Mention this too** - they've gone through multiple identity changes.`;
                }
            }

            // Build TFA context (ONLY for Turuliand)
            let tfaContext = '';
            if (isTuruliand && seasons.length > 0) {
                if (tfaSeasons.length === 0 && nonTfaSeasons.length > 0) {
                    tfaContext = `They have NEVER reached the TFA (Turuliand's top 4 organized tiers). ${nonTfaSeasons.length} seasons entirely in non-league/regional football. The TFA is a distant dream.`;
                } else if (tfaSeasons.length > 0 && currentTier > 4) {
                    const lastTfa = [...tfaSeasons].sort((a, b) => b.year.localeCompare(a.year))[0];
                    const seasonsAway = seasons.filter(s => s.year > lastTfa.year).length;
                    tfaContext = `They had ${tfaSeasons.length} season${tfaSeasons.length > 1 ? 's' : ''} in the TFA but dropped out in ${lastTfa.year}. Now ${seasonsAway} seasons in non-league wilderness (Tier ${currentTier}). This is CRUCIAL - emphasize the stark difference between structured TFA football and sparse regional non-league matches.`;
                } else if (tfaSeasons.length > 0 && currentTier <= 4) {
                    tfaContext = `Currently in the TFA (${league?.name}, Tier ${currentTier}). ${tfaSeasons.length} total TFA seasons${nonTfaSeasons.length > 0 ? `, but they spent ${nonTfaSeasons.length} seasons in non-league before climbing up` : ', always in organized football'}.`;
                } else if (currentTier <= 4 && tfaSeasons.length === seasons.length) {
                    tfaContext = `TFA stalwarts - ALL ${tfaSeasons.length} recorded seasons in the organized leagues. Non-league is alien to them.`;
                }
                
                // Add tier context for non-TFA clubs
                if (currentTier > 4) {
                    if (currentTier === 5) {
                        tfaContext += `\n\nCURRENT POSITION: Tier 5 - they're on the doorstep of the TFA. One promotion away from organized football. This is crucial context - they're close but not quite there yet.`;
                    } else if (currentTier >= 6 && currentTier <= 8) {
                        tfaContext += `\n\nCURRENT POSITION: Tier ${currentTier} - deep in the regional leagues but not completely lost. Several tiers away from the TFA but still within reach with sustained success.`;
                    } else if (currentTier > 8) {
                        tfaContext += `\n\nCURRENT POSITION: Tier ${currentTier} - the doldrums. Far removed from organized football, playing sporadic regional matches. The TFA feels like a different world entirely. Emphasize the isolation and struggle at this level.`;
                    }
                }
            } else if (isTuruliand && seasons.length === 0) {
                // New club or no history
                if (currentTier <= 4) {
                    tfaContext = `Currently in the TFA (${league?.name}, Tier ${currentTier}) - organized football from the start.`;
                } else if (currentTier === 5) {
                    tfaContext = `Starting life in Tier 5 - one tier below the TFA. Close to organized football but not quite there yet.`;
                } else if (currentTier > 8) {
                    tfaContext = `Starting in the doldrums at Tier ${currentTier}. Regional non-league football where the TFA is a distant dream.`;
                } else {
                    tfaContext = `Starting in Tier ${currentTier} - deep in the regional leagues, multiple tiers below the TFA.`;
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
${successionContext}

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
1. **FIRST PARAGRAPH - Origins & Identity**: Start with their founding and identity. ${successionContext ? '**CRITICAL**: You MUST mention their succession/merger/name change context (marked with 🔴 above) in this opening - it defines who they are.' : ''} What makes them unique? Use their location: ${[club.settlement, club.district, club.region].filter(Boolean)[0] || club.city || 'their town'}. Make it PERSONAL.

2. **SECOND PARAGRAPH - Journey**: Their footballing journey - the highs and lows. Reference ACTUAL seasons, years, achievements from the data above. ${tfaContext ? 'For Turuliand clubs, the TFA vs non-league distinction is HUGE - explain what this means emotionally (organized fixtures vs sparse regional games, recognition vs obscurity). **You MUST accurately describe their current tier situation** (marked in TFA STATUS above).' : ''}

3. **THIRD PARAGRAPH - Present Day**: Their current status and what defines them today. Where do they sit in the hierarchy? ${isTuruliand && currentTier > 4 ? '**For Turuliand non-league clubs: Be specific about how far they are from the TFA** - Tier 5 is close, Tier 8+ is the doldrums.' : ''} What's their relationship to ${rivals.length > 0 ? 'their rivals (' + rivals.map(r => r.name).join(', ') + ')' : 'other local clubs'}? What are fans feeling?

4. **OPTIONAL FOURTH**: Data quirks (yo-yo club, fallen giant, never relegated, etc) - explore emotionally.

**CRITICAL REMINDERS**:
- ${successionContext ? '🔴 You MUST mention succession/merger/name change context - it\'s marked with 🔴 above' : 'No succession context to mention'}
- ${tfaContext && isTuruliand ? '🔴 You MUST accurately describe their tier level and distance from TFA' : 'Not a Turuliand club'}
- TFA ONLY EXISTS IN TURULIAND - never mention TFA for other nations

TONE: Engaging, emotionally resonant, like a documentary. Use specific data points (years, numbers, names). Avoid clichés. Make every club story feel completely different.

Do NOT use markdown. Just plain paragraphs separated by double line breaks.`;

            const result = await base44.integrations.Core.InvokeLLM({ 
                prompt,
                add_context_from_internet: false
            });

            // Save to club record
            await base44.entities.Club.update(club.id, { history: result });
            setStory(result);
            
            if (onStoryGenerated) {
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
                {story && typeof story === 'string' ? (
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