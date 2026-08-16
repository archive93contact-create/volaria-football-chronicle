import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { BookOpen, Check, Factory, Loader2, Sparkles } from 'lucide-react';
import AdminOnly from '@/components/common/AdminOnly';
import ThemedCard from '@/components/common/ThemedCard';
import { buildClubLineage } from '@/lib/clubImmersion';

const FORMATION_LABELS = {
    workplace: 'Workplace club', church: 'Church / parish club', school: 'School / college club', neighbourhood: 'Neighbourhood club',
    social_club: 'Social club', military: 'Military club', railway: 'Railway club', industrial: 'Industrial club', community: 'Community club',
    merger: 'Merger', breakaway: 'Breakaway club', unknown: 'Unclassified origin'
};

export default function ClubOriginPanel({ club, nation, league, seasons = [], allLeagues = [], allClubs = [], accentColor = '#334155' }) {
    const queryClient = useQueryClient();
    const [generating, setGenerating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [proposal, setProposal] = useState(null);
    const [canonNotes, setCanonNotes] = useState('');

    const { data: origins = [] } = useQuery({
        queryKey: ['clubOrigin', club?.id],
        queryFn: () => base44.entities.ClubOrigin.filter({ club_id: club.id }),
        enabled: !!club?.id,
    });
    const origin = origins[0] || null;

    const locationName = club?.settlement || club?.district || club?.region || club?.city;
    const { data: locations = [] } = useQuery({
        queryKey: ['clubOriginLocation', club?.nation_id, locationName],
        queryFn: () => base44.entities.Location.filter({ nation_id: club.nation_id, name: locationName }),
        enabled: !!club?.nation_id && !!locationName,
    });
    const location = locations[0] || null;

    const lineage = useMemo(() => buildClubLineage(club, allClubs), [allClubs, club]);

    const lineageContext = useMemo(() => {
        const describe = (linked, relationship) => linked ? `${relationship}: ${linked.name}; founded ${linked.founded_year || 'unknown'}; location ${[linked.settlement, linked.district, linked.region].filter(Boolean).join(', ') || linked.city || 'unknown'}; nickname ${linked.nickname || 'none recorded'}; colours ${linked.primary_color || '?'} / ${linked.secondary_color || '?'}; defunct/renamed year ${linked.defunct_year || linked.renamed_year || 'not recorded'}; existing history ${linked.history || 'none'}` : null;
        return [
            ...lineage.formerNames.map((linked, index) => describe(linked, index === 0 ? 'Earlier name of the same club' : 'Another earlier name of the same club')),
            ...lineage.predecessors.map((linked, index) => describe(linked, index === 0 ? 'Predecessor club' : 'Additional predecessor club')),
            describe(lineage.currentName, 'Current-name continuation of this same club'),
            describe(lineage.successor, 'Successor club after this club ceased operating'),
            lineage.isDefunct ? `STATUS: ${club.name} was disbanded/ceased operating${club.defunct_year ? ` in ${club.defunct_year}` : ''}${lineage.successor ? ` and was succeeded by ${lineage.successor.name}` : '; no successor club is recorded'}.` : null,
            lineage.isFormerName && lineage.currentName ? `STATUS: ${club.name} is a former name of the same club now known as ${lineage.currentName.name}${club.renamed_year ? ` from ${club.renamed_year}` : ''}; this was a rename, not a disbandment.` : null,
            lineage.isInactive ? `STATUS: ${club.name} is inactive but is not recorded as a defunct predecessor with a successor.` : null,
        ].filter(Boolean).join('\n');
    }, [lineage, club]);

    const lineageEpilogue = useMemo(() => {
        if (lineage.isDefunct) {
            return lineage.successor
                ? `${club.name}${club.defunct_year ? ` ceased operating in ${club.defunct_year}` : ' eventually ceased operating'}; the footballing line then continued through ${lineage.successor.name}, its successor club.`
                : `${club.name}${club.defunct_year ? ` ceased operating in ${club.defunct_year}` : ' eventually ceased operating'}, with no successor club recorded.`;
        }
        if (lineage.isFormerName && lineage.currentName) {
            return `${club.name} was not disbanded: ${club.renamed_year ? `from ${club.renamed_year}, ` : ''}the same club continued as ${lineage.currentName.name}.`;
        }
        if (lineage.predecessors.length) {
            const names = lineage.predecessors.map(c => c.name).join(lineage.predecessors.length > 1 ? ' and ' : '');
            return `${club.name} stands in succession to ${names}, whose earlier histories form the roots of the present club.`;
        }
        if (lineage.formerNames.length) {
            const names = lineage.formerNames.map(c => c.name).join(lineage.formerNames.length > 1 ? ' and ' : '');
            return `The club previously competed under the ${names} name${lineage.formerNames.length > 1 ? 's' : ''} before adopting the ${club.name} identity.`;
        }
        return null;
    }, [lineage, club]);

    const seasonContext = useMemo(() => {
        const ordered = [...seasons].sort((a, b) => String(a.year || '').localeCompare(String(b.year || ''), undefined, { numeric: true }));
        if (!ordered.length) return 'No season history yet.';
        const important = ordered.filter((s, index) => {
            const tier = Number(s.tier || allLeagues.find(l => l.id === s.league_id)?.tier || 0);
            return index === 0 || index === ordered.length - 1 || tier === 1 || ['champion','promoted','playoff_winner','relegated'].includes(s.status);
        }).slice(-16);
        return important.map(s => {
            const l = allLeagues.find(item => item.id === s.league_id);
            const identity = allClubs.find(c => c.id === s.club_id)?.name || s.club_name || club.name;
            return `${s.year}: ${identity}; ${l?.name || 'league'}; Tier ${s.tier || l?.tier || '?'}; finish ${s.position || '?'}${s.status ? `; ${s.status}` : ''}`;
        }).join('\n');
    }, [seasons, allLeagues, allClubs, club.name]);

    const generateOrigin = async () => {
        setGenerating(true);
        try {
            const prompt = `Create a historically believable ORIGIN CHAPTER for this FICTIONAL football club. This is proposed canon for admin review, but the story itself must read like finished football history — not like an AI proposal or a research note.

CLUB & PLACE CANON:
Club: ${club.name}
Founded: ${club.founded_year || 'not recorded'}
Location: ${[club.settlement, club.district, club.region].filter(Boolean).join(', ') || club.city || 'not recorded'}
Nation: ${nation?.name || 'not recorded'}
Language/naming style: ${nation?.language || 'not recorded'}; ${Array.isArray(nation?.naming_styles) ? nation.naming_styles.join(', ') : nation?.naming_styles || 'not recorded'}
Nickname: ${club.nickname || 'not recorded'}
Colours: ${club.primary_color || 'not recorded'} / ${club.secondary_color || 'not recorded'}
Current level: ${league?.name || 'not recorded'}${league?.tier ? `, Tier ${league.tier}` : ''}
Settlement type/population: ${location?.settlement_size || 'not recorded'} / ${location?.population || 'not recorded'}
Local industries: ${location?.industries || 'none supplied'}
Local companies/employers: ${location?.major_companies || 'none supplied'}
Local landmarks: ${location?.landmarks || 'none supplied'}
Existing club history: ${club.history || 'none'}
Admin canon notes: ${canonNotes || origin?.canon_notes || 'none'}
Current identity status: ${lineage.isDefunct ? `DEFUNCT${club.defunct_year ? ` since ${club.defunct_year}` : ''}${lineage.successor ? `; succeeded by ${lineage.successor.name}` : '; no successor recorded'}` : lineage.isFormerName && lineage.currentName ? `FORMER NAME; same club now known as ${lineage.currentName.name}` : lineage.isInactive ? 'INACTIVE' : 'ACTIVE'}

FULL CLUB LINEAGE:
${lineageContext || 'No linked former-name or predecessor records.'}

LATER FOOTBALLING CONTEXT — USE ONLY FOR HISTORICAL FLAVOUR/FORESHADOWING, NEVER AS A CAUSE OF FORMATION:
Seasons played: ${club.seasons_played || seasons.length || 0}
Top-flight seasons: ${club.seasons_top_flight || 0}
Top-flight titles: ${club.league_titles || 0}${club.title_years ? ` (${club.title_years})` : ''}
Lower-tier titles: ${club.lower_tier_titles || 0}${club.lower_tier_title_years ? ` (${club.lower_tier_title_years})` : ''}
Domestic cups: ${club.domestic_cup_titles || 0}${club.domestic_cup_title_years ? ` (${club.domestic_cup_title_years})` : ''}
Continental titles: ${(club.vcc_titles || 0) + (club.ccc_titles || 0)}
Promotions/relegations: ${club.promotions || 0} / ${club.relegations || 0}
Selected identity/season milestones:
${seasonContext}

REALISM RULES:
- Choose formation_type from workplace, church, school, neighbourhood, social_club, military, railway, industrial, community, merger, breakaway, unknown.
- Treat FORMER NAME records as the same institution at another point in its identity. A rename is not a new founding or a disbandment. Use the exact linked club names above.
- Treat PREDECESSOR records carefully: if the present club is a merger/successor, describe the exact earlier organisations named above as roots feeding into the modern club rather than pretending they were always identical.
- If this club is DEFUNCT, the narrative MUST eventually acknowledge that it ceased operating, give the defunct year when supplied, and name the exact successor club when one exists. Do not write about a defunct club as if it remains active today.
- If this record is a FORMER NAME, make clear that the identity changed into the exact current club name above and that the institution itself continued.
- If a successor/predecessor relationship exists, never substitute a similar-sounding club name. Use the exact linked entity name.
- Use the founding year, settlement scale, economic context, language/naming style, nickname, colours, lineage and existing history together. Do not build the origin from one field alone.
- A village or small-town club should start at an appropriate social scale; an old club should not sound like a modern franchise.
- If a named local employer/industry is supplied, it may genuinely shape the formation. If not, do not invent a named company just to make a works-club story.
- Do not invent named individual founders unless a name is supplied in canon. Groups of people can be described naturally where plausible.
- Do not invent major wars, disasters, political events, benefactors or famous institutions as established facts.
- Small pieces of low-stakes local texture may be proposed where needed — an informal field, meeting room, patch of common land, or unnamed works recreation area — but do not manufacture a grand landmark or exact address.
- Name and colour origins should feel organic. Sometimes colours were simply available, inherited, changed after a merger, or have no surviving explanation; do not force symbolism.
- The later career may be used in ONE restrained closing sentence to foreshadow what the modest beginnings eventually became, using only the supplied achievements.

CRITICAL WRITING RULE:
- The story field must be PURE NARRATIVE. Never write 'the data suggests', 'the most plausible origin', 'based on the supplied information', 'recorded local industry', 'this proposal', or explain where facts came from.
- Do not separate known facts from interpretation inside the story. The admin already knows this is a proposal because the UI labels it as one. Make the prose seamless and confident, while staying within the constraints above.
- Write 220-340 words in the style of a serious local football historian: specific, understated, chronological and believable. Avoid melodrama and football clichés.

Return JSON with formation_type, story, founder_context, original_ground_context, name_origin, colour_origin, rationale. ONLY the rationale may explain the grounding and which fields influenced the proposal; the story must never do so.`;

            const result = await base44.integrations.Core.InvokeLLM({
                prompt,
                add_context_from_internet: false,
                response_json_schema: {
                    type: 'object',
                    properties: {
                        formation_type: { type: 'string', enum: ['workplace','church','school','neighbourhood','social_club','military','railway','industrial','community','merger','breakaway','unknown'] }, story: { type: 'string' }, founder_context: { type: 'string' },
                        original_ground_context: { type: 'string' }, name_origin: { type: 'string' }, colour_origin: { type: 'string' }, rationale: { type: 'string' }
                    },
                    required: ['formation_type', 'story', 'rationale']
                }
            });
            setProposal(result);
            await base44.entities.ClubFormationProposal.create({
                club_id: club.id,
                formation_type: result.formation_type || 'unknown',
                story: result.story || '',
                name_origin: result.name_origin || '',
                colour_origin: result.colour_origin || '',
                early_ground: result.original_ground_context || '',
                rationale: result.rationale || '',
                generated_at: new Date().toISOString(),
                accepted: false,
            });
        } finally {
            setGenerating(false);
        }
    };

    const acceptProposal = async () => {
        if (!proposal) return;
        setSaving(true);
        const payload = {
            club_id: club.id,
            formation_type: proposal.formation_type || 'unknown',
            formation_story: proposal.story || '',
            founder_context: proposal.founder_context || '',
            original_ground_context: proposal.original_ground_context || '',
            name_origin: proposal.name_origin || '',
            colour_origin: proposal.colour_origin || '',
            is_ai_proposed: true,
            canon_notes: canonNotes || origin?.canon_notes || '',
        };
        if (origin?.id) await base44.entities.ClubOrigin.update(origin.id, payload);
        else await base44.entities.ClubOrigin.create(payload);
        queryClient.invalidateQueries({ queryKey: ['clubOrigin', club.id] });
        setProposal(null);
        setSaving(false);
    };

    const displayed = proposal ? {
        formation_story: proposal.story,
        formation_type: proposal.formation_type,
        founder_context: proposal.founder_context,
        original_ground_context: proposal.original_ground_context,
        name_origin: proposal.name_origin,
        colour_origin: proposal.colour_origin,
    } : origin;

    return (
        <ThemedCard title="Origins & Formation" icon={BookOpen} primaryColor={accentColor} accentColor={accentColor}>
            {displayed?.formation_story ? (
                <div className="space-y-5">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="bg-white/70 border-slate-200">
                            <Factory className="w-3 h-3 mr-1" /> {FORMATION_LABELS[displayed.formation_type] || displayed.formation_type || 'Origin'}
                        </Badge>
                        {proposal && <Badge className="bg-amber-100 text-amber-800 border border-amber-200">Proposal — not canon yet</Badge>}
                    </div>
                    <p className="text-[15px] sm:text-base leading-7 text-slate-700 max-w-4xl">{displayed.formation_story}</p>
                    {lineageEpilogue && <p className="text-[15px] sm:text-base leading-7 text-slate-700 max-w-4xl">{lineageEpilogue}</p>}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200">
                        <div className="bg-white/90 p-4"><div className="text-[10px] uppercase tracking-wider font-black text-slate-400">Name origin</div><div className="mt-1 text-sm text-slate-700">{displayed.name_origin || 'Unrecorded'}</div></div>
                        <div className="bg-white/90 p-4"><div className="text-[10px] uppercase tracking-wider font-black text-slate-400">Colours</div><div className="mt-1 text-sm text-slate-700">{displayed.colour_origin || 'Unrecorded'}</div></div>
                        <div className="bg-white/90 p-4"><div className="text-[10px] uppercase tracking-wider font-black text-slate-400">Early home</div><div className="mt-1 text-sm text-slate-700">{displayed.original_ground_context || 'Unrecorded'}</div></div>
                    </div>
                    <AdminOnly>
                        {proposal?.rationale && <div className="rounded-lg bg-slate-950/[0.035] p-3 text-xs leading-5 text-slate-500 mb-3"><strong>Admin grounding:</strong> {proposal.rationale}</div>}
                        <div className="flex flex-col sm:flex-row gap-2 sm:items-end pt-2">
                            <div className="flex-1"><div className="text-xs font-bold text-slate-500 mb-1">Canon constraints / notes</div><Textarea rows={2} value={canonNotes} onChange={e => setCanonNotes(e.target.value)} placeholder="e.g. formed by railway workers; do not use a church origin" /></div>
                            {proposal && <Button onClick={acceptProposal} disabled={saving}><Check className="w-4 h-4 mr-2" />Accept as canon</Button>}
                            <Button variant="outline" onClick={generateOrigin} disabled={generating}>{generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}{proposal ? 'Try another' : 'Generate proposal'}</Button>
                        </div>
                    </AdminOnly>
                </div>
            ) : (
                <div className="py-5 text-center">
                    <BookOpen className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                    <p className="text-sm text-slate-500 max-w-xl mx-auto">No formation canon has been approved yet. The generator proposes a plausible origin from the club's year, location and known local context, then lets you approve it.</p>
                    <AdminOnly><Button className="mt-4" variant="outline" onClick={generateOrigin} disabled={generating}>{generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}Generate formation proposal</Button></AdminOnly>
                </div>
            )}
        </ThemedCard>
    );
}
