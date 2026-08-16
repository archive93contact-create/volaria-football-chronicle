import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import AdminOnly from '@/components/common/AdminOnly';
import { buildClubLineage, buildComparativeInsights, buildLivingNarrative, detectClubEras } from '@/lib/clubImmersion';

export default function AIClubStory({ club, nation, league, seasons = [], allLeagues = [], allClubs = [], onStoryGenerated }) {
    const queryClient = useQueryClient();
    const [generating, setGenerating] = useState(false);
    const [story, setStory] = useState(club.history || null);
    const latestYear = [...seasons].sort((a, b) => String(b.year || '').localeCompare(String(a.year || ''), undefined, { numeric: true }))[0]?.year || '';
    const detectedEras = detectClubEras(seasons, allLeagues);
    const comparativeInsights = buildComparativeInsights(club, allClubs, seasons, allLeagues);
    const lineage = buildClubLineage(club, allClubs);
    const livingNarrative = buildLivingNarrative(club, seasons, allLeagues, allClubs);

    const { data: originRows = [] } = useQuery({
        queryKey: ['clubOrigin', club?.id],
        queryFn: () => base44.entities.ClubOrigin.filter({ club_id: club.id }),
        enabled: !!club?.id,
    });
    const origin = originRows[0] || null;

    const { data: snapshotRows = [] } = useQuery({
        queryKey: ['clubNarrativeSnapshot', club?.id],
        queryFn: () => base44.entities.ClubNarrativeSnapshot.filter({ club_id: club.id }, '-through_year'),
        enabled: !!club?.id,
    });
    const latestSnapshot = snapshotRows[0] || null;
    const narrativeIsStale = Boolean(latestYear && latestSnapshot?.through_year && latestSnapshot.through_year !== latestYear);

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
            const latestSeasonRecord = [...seasons].sort((a, b) => String(b.year || '').localeCompare(String(a.year || ''), undefined, { numeric: true }))[0] || null;
            const latestSeasonLeague = latestSeasonRecord ? allLeagues.find(l => l.id === latestSeasonRecord.league_id) : null;
            const identityEnded = lineage.isDefunct || lineage.isFormerName || lineage.isInactive;
            const levelLeague = identityEnded ? (latestSeasonLeague || league) : (league || latestSeasonLeague);
            const currentTier = Number(identityEnded ? (latestSeasonRecord?.tier || latestSeasonLeague?.tier || league?.tier || 1) : (league?.tier || latestSeasonRecord?.tier || latestSeasonLeague?.tier || 1));
            const isTuruliand = nation?.name === 'Turuliand';
            
            // Get rivals
            const rivals = (club.rival_club_ids || [])
                .map(id => allClubs.find(c => c.id === id))
                .filter(Boolean)
                .slice(0, 3);

            // Build succession/name-change context from the bidirectional lineage graph.
            // This prevents a missing reverse link from causing the story to use the wrong club name or status.
            const predecessorClub = lineage.predecessors[0] || null;
            const predecessorClub2 = lineage.predecessors[1] || null;
            const successorClub = lineage.successor || null;
            const formerNameClub = lineage.formerNames[0] || null;
            const currentNameClub = lineage.currentName || null;

            let successionContext = '';
            if (lineage.isDefunct && successorClub) {
                successionContext = `\n🔴 TERMINAL STATUS (MUST MENTION): ${club.name} was disbanded/ceased operating${club.defunct_year ? ` in ${club.defunct_year}` : ''}. The exact successor club is ${successorClub.name}. End the history of ${club.name} at that point and explain that ${successorClub.name} is a successor organisation, not merely another name for the same club. Do not invent the cause of the closure.`;
            } else if (lineage.isDefunct) {
                successionContext = `\n🔴 TERMINAL STATUS (MUST MENTION): ${club.name} was disbanded/ceased operating${club.defunct_year ? ` in ${club.defunct_year}` : ''}. No successor club is recorded. The narrative MUST end the club's active story rather than writing as if it still exists.`;
            } else if (lineage.isInactive) {
                successionContext = `\n🔴 INACTIVE STATUS (MUST MENTION): ${club.name} is no longer active, but is not recorded as a defunct predecessor with a successor. Do not describe it as a current active club.`;
            }

            if (lineage.predecessors.length > 1) {
                const predecessorNames = lineage.predecessors.map(c => `${c.name}${c.defunct_year ? ` (ended ${c.defunct_year})` : ''}`).join(' and ');
                successionContext += `\n\n🔴 MULTIPLE PREDECESSORS (MUST MENTION): ${club.name} stands in succession to ${predecessorNames}. Use these exact names. They are earlier clubs feeding into the present organisation, not former names of the same continuous legal identity unless separately marked as former names.`;
            } else if (predecessorClub) {
                successionContext += `\n\n🔴 PREDECESSOR (MUST MENTION): ${club.name} stands in succession to ${predecessorClub.name}${predecessorClub.defunct_year ? `, which ended in ${predecessorClub.defunct_year}` : ''}. Use that exact club name and do not rewrite its seasons as if they were originally played under the ${club.name} name.`;
            }

            if (lineage.isFormerName && currentNameClub) {
                successionContext += `\n\n🔴 FORMER NAME (MUST MENTION): ${club.name} is an earlier name of the SAME club now known as ${currentNameClub.name}${club.renamed_year ? ` from ${club.renamed_year}` : ''}. This was a rename, not a disbandment. The exact current name is ${currentNameClub.name}.`;
            } else if (lineage.formerNames.length) {
                const formerNames = lineage.formerNames.map(c => c.name).join(lineage.formerNames.length > 1 ? ' and ' : '');
                successionContext += `\n\n🔴 PREVIOUS NAMES (MUST MENTION): The same club previously competed as ${formerNames}. These are former names, not predecessor clubs. Use the exact linked names and preserve continuity.`;
            }

            // Build TFA context (ONLY for Turuliand - NEVER mention TFA for other nations)
            let tfaContext = '';
            if (isTuruliand && seasons.length > 0) {
                if (tfaSeasons.length === 0 && nonTfaSeasons.length > 0) {
                    tfaContext = `They have NEVER reached the TFA (Turuliand's top 4 organized tiers). ${nonTfaSeasons.length} seasons entirely in non-league/regional football. The TFA is a distant dream.`;
                } else if (tfaSeasons.length > 0 && currentTier > 4) {
                    const lastTfa = [...tfaSeasons].sort((a, b) => b.year.localeCompare(a.year))[0];
                    const seasonsAway = seasons.filter(s => s.year > lastTfa.year).length;
                    tfaContext = identityEnded
                        ? `They had ${tfaSeasons.length} season${tfaSeasons.length > 1 ? 's' : ''} in the TFA but left it after ${lastTfa.year}; the final ${seasonsAway} season${seasonsAway === 1 ? '' : 's'} of this identity were spent outside the TFA, ending at Tier ${currentTier}.`
                        : `They had ${tfaSeasons.length} season${tfaSeasons.length > 1 ? 's' : ''} in the TFA but dropped out in ${lastTfa.year}. Now ${seasonsAway} seasons in non-league wilderness (Tier ${currentTier}). This is CRUCIAL - emphasize the stark difference between structured TFA football and sparse regional non-league matches.`;
                } else if (tfaSeasons.length > 0 && currentTier <= 4) {
                    tfaContext = identityEnded
                        ? `The final recorded season under this identity was in the TFA (${levelLeague?.name || 'a TFA division'}, Tier ${currentTier}). Across its life it spent ${tfaSeasons.length} season${tfaSeasons.length === 1 ? '' : 's'} in the TFA${nonTfaSeasons.length > 0 ? ` and ${nonTfaSeasons.length} outside it` : ''}.`
                        : `Currently in the TFA (${levelLeague?.name}, Tier ${currentTier}). ${tfaSeasons.length} total TFA seasons${nonTfaSeasons.length > 0 ? `, but they spent ${nonTfaSeasons.length} seasons in non-league before climbing up` : ', always in organized football'}.`;
                } else if (currentTier <= 4 && tfaSeasons.length === seasons.length) {
                    tfaContext = `TFA stalwarts - ALL ${tfaSeasons.length} recorded seasons in the organized leagues. Non-league is alien to them.`;
                }
                
                // Add tier context for non-TFA clubs
                if (currentTier > 4) {
                    const positionLabel = identityEnded ? 'FINAL RECORDED POSITION OF THIS IDENTITY' : 'CURRENT POSITION';
                    if (currentTier === 5) {
                        tfaContext += `\n\n${positionLabel}: Tier 5 - ${identityEnded ? 'the club/identity ended one tier below the TFA.' : "they're on the doorstep of the TFA, one promotion away from organized football."}`;
                    } else if (currentTier >= 6 && currentTier <= 8) {
                        tfaContext += `\n\n${positionLabel}: Tier ${currentTier} - ${identityEnded ? 'its final football was played several levels below the TFA.' : 'deep in the regional leagues but still within reach of the TFA with sustained success.'}`;
                    } else if (currentTier > 8) {
                        tfaContext += `\n\n${positionLabel}: Tier ${currentTier} - ${identityEnded ? 'the identity ended far removed from the TFA.' : 'far removed from organized football, with the TFA a distant level.'}`;
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

            const chronologicalSeasons = [...seasons].sort((a, b) => String(a.year || '').localeCompare(String(b.year || ''), undefined, { numeric: true }));
            const milestoneCandidates = chronologicalSeasons.filter(s => {
                const tier = s.tier || allLeagues.find(l => l.id === s.league_id)?.tier;
                return s.position === 1 || ['champion', 'promoted', 'relegated'].includes(s.status) || tier === 1;
            });
            const milestoneRecords = [chronologicalSeasons[0], ...milestoneCandidates, chronologicalSeasons.at(-1)]
                .filter(Boolean)
                .filter((season, index, array) => array.findIndex(other => other.id === season.id) === index)
                .slice(-12);
            const milestoneText = milestoneRecords.length
                ? milestoneRecords.map(s => {
                    const seasonLeague = allLeagues.find(l => l.id === s.league_id);
                    const tier = s.tier || seasonLeague?.tier || '?';
                    const finish = s.position ? `, finished ${s.position}` : '';
                    const status = s.status ? `, ${s.status}` : '';
                    const identity = allClubs.find(c => c.id === s.club_id)?.name || s.club_name || club.name;
                    return `- ${s.year}: ${identity}; ${seasonLeague?.name || 'league'} (Tier ${tier})${finish}${status}`;
                }).join('\n')
                : '- No season-by-season milestones yet.';

            const eraText = detectedEras.length ? detectedEras.map(e => `- ${e.startYear}-${e.endYear}: ${e.label}. ${e.summary}`).join('\n') : '- No statistically strong era detected yet.';
            const comparisonText = comparativeInsights.length ? comparativeInsights.map(i => `- ${i.label}: ${i.value}. ${i.detail}`).join('\n') : '- No comparative context available.';

            const prompt = `Write a grounded, vivid 4-6 paragraph CLUB HISTORY about ${club.name}, a football club in ${nation?.name}. It should read like a finished chapter from a serious football history book: seamless, chronological and immersive.

APPROVED ORIGIN CANON:
${origin?.formation_story ? `Formation type: ${origin.formation_type || 'unclassified'}\nFormation story: ${origin.formation_story}\nFounder context: ${origin.founder_context || 'unrecorded'}\nEarly ground: ${origin.original_ground_context || 'unrecorded'}\nName origin: ${origin.name_origin || 'unrecorded'}\nColour origin: ${origin.colour_origin || 'unrecorded'}\nAdmin canon notes: ${origin.canon_notes || 'none'}` : 'No formation story has been approved. DO NOT invent how the club was formed. State only the recorded founding year/location and move into the competitive record.'}

HISTORICAL ERAS:
${eraText}

COMPARATIVE CONTEXT WITHIN THE NATION:
${comparisonText}

LIVING CHRONOLOGY:
${livingNarrative}

CLUB DATA:
- Location: ${[club.settlement, club.district, club.region].filter(Boolean).join(', ') || club.city || 'Unknown'}
- Founded: ${club.founded_year || 'Unknown'}
- Nickname: ${club.nickname || 'None'}
- Stadium: ${club.stadium || 'Unknown'} (${club.stadium_capacity ? `${club.stadium_capacity.toLocaleString()} capacity` : 'capacity unknown'})
- ${identityEnded ? 'Final recorded league under this identity' : 'Current League'}: ${levelLeague?.name || 'Unknown'} (Tier ${currentTier})
- Rivals: ${rivals.length > 0 ? rivals.map(r => r.name).join(', ') : 'None specified'}
${successionContext}

HISTORY:
- Seasons played: ${club.seasons_played || 0}
- Top flight seasons: ${club.seasons_top_flight || 0}
- League titles: ${club.league_titles || 0}${club.title_years ? ` (${club.title_years})` : ''}
  ${club.title_years ? `🔴 FIRST EVER TITLE: ${club.title_years.split(',')[0].trim()} - **You MUST mention their first-ever championship** - it's a historic moment` : ''}
- Lower tier titles: ${club.lower_tier_titles || 0}${club.lower_tier_title_years ? ` (${club.lower_tier_title_years})` : ''}
- Domestic cup titles: ${club.domestic_cup_titles || 0}${club.domestic_cup_title_years ? ` (${club.domestic_cup_title_years})` : ''}
  ${club.domestic_cup_title_years ? `🔴 Cup glory years: ${club.domestic_cup_title_years} - **Mention major cup wins**, they're huge moments` : ''}
  ${club.domestic_cup_runner_up > 0 ? `- Cup finals lost: ${club.domestic_cup_runner_up}` : ''}
- VCC titles: ${club.vcc_titles || 0}${club.vcc_title_years ? ` (${club.vcc_title_years})` : ''}, CCC titles: ${club.ccc_titles || 0}${club.ccc_title_years ? ` (${club.ccc_title_years})` : ''}
  ${club.vcc_title_years || club.ccc_title_years ? `🔴 CONTINENTAL GLORY - **Must mention these historic achievements**` : ''}
- Promotions: ${club.promotions || 0}, Relegations: ${club.relegations || 0}
- Best finish: ${club.best_finish ? `${club.best_finish}${club.best_finish === 1 ? 'st' : club.best_finish === 2 ? 'nd' : club.best_finish === 3 ? 'rd' : 'th'} (${club.best_finish_year || 'unknown year'}, Tier ${club.best_finish_tier || 'unknown'})` : 'No data'}
- Professional status: ${club.professional_status || 'Unknown'}

SEASON MILESTONES:
${milestoneText}

${tfaContext ? `\nTURULIAND TFA STATUS (CRITICAL):\n${tfaContext}\n` : ''}

SOURCE DISCIPLINE — NON-NEGOTIABLE:
- Treat ONLY the information supplied above as factual. This is a fictional universe, so there is no outside source to fill gaps from.
- DO NOT invent named players, managers, chairmen, founders, supporters' groups, attendances, crowds, chants, industries, streets, neighbourhood landmarks, derby incidents, finances, ownership changes, stadium construction dates, reasons for a rename/merger/closure, or causes of success/decline unless explicitly supplied above.
- Stadium names/capacities may be mentioned, but do not invent architecture, atmosphere, location history or opening dates.
- Rivals may be mentioned naturally, but do not invent a rivalry origin or famous match.
- The APPROVED ORIGIN CANON may be written as established history because it has already been accepted. If it is absent, do not invent a founding mechanism.
- Former-name records are the SAME club identity at another time. Weave those names into the chronology naturally. Predecessor/merger records are inherited lineage and must be described with the correct distinction.
- Use the historical eras and comparisons to shape emphasis, but do not add causes that are not known.
- Give more weight to newly-entered seasons when they create a first, end a long stay, change an era, win a major honour or materially alter the club's standing.
- If the history is sparse, write a shorter, restrained history rather than padding it with invented detail.

READER-FACING RULE — ABSOLUTE:
Never mention 'the data', 'database', 'supplied information', 'recorded results', 'the archive shows', 'according to the records', 'statistically detected', 'the model', 'the prompt', or explain how you know something. The reader should see only the club's history. Write supported interpretation directly as historical prose: 'The 1950s became a period of consolidation', not 'the data suggests the 1950s were stable'.

REQUIREMENTS:
1. **FIRST PARAGRAPH - Origins & Identity**: ${origin?.formation_story ? 'Use the APPROVED ORIGIN CANON to explain how the club emerged, then connect it naturally to location, name and colours.' : 'There is no approved formation canon, so DO NOT invent founders or a founding mechanism. State the founding year/location/identity succinctly.'} ${successionContext ? '**CRITICAL**: You MUST mention succession/merger/name-change context (marked with 🔴 above) in this opening or at the correct chronological point.' : ''}

2. **SECOND PARAGRAPH - Journey**: Their footballing journey - the highs and lows. Reference ACTUAL seasons, years, achievements from the data above. ${tfaContext ? 'For Turuliand clubs, the TFA vs non-league distinction is HUGE - explain what this means emotionally (organized fixtures vs sparse regional games, recognition vs obscurity). **You MUST accurately describe their current tier situation** (marked in TFA STATUS above).' : `For non-Turuliand clubs, focus on their journey through ${nation?.name}'s league system (${nation?.federation_name || 'the national federation'}). DO NOT mention TFA - it only exists in Turuliand.`}

3. **THIRD PARAGRAPH - HISTORICAL POSITION**: ${lineage.isDefunct ? `Explain the club's final position before it ceased operating and then name ${lineage.successor?.name || 'the fact that no successor is recorded'} as the correct succession outcome. Do NOT write a present-day active-club paragraph.` : lineage.isFormerName && lineage.currentName ? `Explain where the ${club.name} identity ended and how the same club continued as ${lineage.currentName.name}.` : lineage.isInactive ? 'Explain the club\'s final recorded position and that it is now inactive.' : 'Explain its current position in the hierarchy and how it compares with the club\'s earlier heights and lows.'} ${isTuruliand && currentTier > 4 ? '**For Turuliand non-league context: be specific about the tier distance from the TFA.**' : ''} ${rivals.length > 0 ? 'Mention the known rivals (' + rivals.map(r => r.name).join(', ') + ') without inventing the reason for those rivalries.' : 'Do not invent a rivalry or supporter sentiment.'}

4. **ERA PARAGRAPH(S)**: Use the detected eras above to give the history shape — golden periods, long stays, rises, falls, wilderness years or revivals — and anchor every claim to the season record.

5. **PRESENT-DAY HISTORICAL POSITION**: End by placing the club in comparative context. Explain where its longevity/success sits within the nation and whether its recent direction is rising, stable or declining. Do not make forecasts.

**CRITICAL REMINDERS**:
- ${successionContext ? '🔴 You MUST mention succession/merger/name change context - it\'s marked with 🔴 above' : 'No succession context to mention'}
- ${tfaContext && isTuruliand ? '🔴 You MUST accurately describe their tier level and distance from TFA' : '🔴 NOT A TURULIAND CLUB - DO NOT MENTION TFA AT ALL'}
- 🚨 TFA ONLY EXISTS IN TURULIAND - **NEVER** mention TFA, organized tiers, or the TFA system for clubs from ${!isTuruliand ? nation?.name : 'other nations'}
- For non-Turuliand clubs: Reference ${nation?.federation_name || 'their national federation'} and ${nation?.name}'s league system instead

TONE: An excellent football historian writing for a club archive: vivid, readable and emotionally aware, but precise. Prefer chronology, specific years and meaningful comparisons. Avoid clichés such as 'phoenix from the ashes', 'sleeping giant', 'against all odds', 'passionate fanbase' or 'hallowed turf' unless the supplied record genuinely supports the idea.

Do NOT use markdown. Just plain paragraphs separated by double line breaks.`;

            const result = await base44.integrations.Core.InvokeLLM({ 
                prompt,
                add_context_from_internet: false
            });

            // Keep the legacy Club.history field for compatibility, while storing a dated snapshot
            // so the UI can tell when a new season has made the polished narrative stale.
            await base44.entities.Club.update(club.id, { history: result });
            const snapshotPayload = {
                club_id: club.id,
                through_year: latestYear || 'no-season',
                formation_story: origin?.formation_story || '',
                historical_narrative: result,
                era_summary: detectedEras.map(e => `${e.startYear}-${e.endYear}: ${e.label}`).join(' | '),
                insight_summary: comparativeInsights.map(i => `${i.label}: ${i.value}`).join(' | '),
                generated_at: new Date().toISOString(),
                generation_version: 'living-history-v2',
            };
            if (latestSnapshot?.id) await base44.entities.ClubNarrativeSnapshot.update(latestSnapshot.id, snapshotPayload);
            else await base44.entities.ClubNarrativeSnapshot.create(snapshotPayload);
            queryClient.invalidateQueries({ queryKey: ['clubNarrativeSnapshot', club.id] });
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
                <div className="flex items-center justify-between gap-3">
                    <div>
                    <CardTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5" style={{ color: club.accent_color || '#10b981' }} />
                        Archive Narrative
                    </CardTitle>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {latestSnapshot?.through_year && <Badge variant="outline">Written through {latestSnapshot.through_year}</Badge>}
                        {narrativeIsStale && <Badge className="bg-amber-100 text-amber-800 border border-amber-200"><RefreshCw className="w-3 h-3 mr-1" />New season data available</Badge>}
                    </div>
                    </div>
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