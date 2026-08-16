import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { BookOpen, Check, Factory, Loader2, Sparkles } from 'lucide-react';
import AdminOnly from '@/components/common/AdminOnly';
import ThemedCard from '@/components/common/ThemedCard';

const FORMATION_LABELS = {
    workplace: 'Workplace club', church: 'Church / parish club', school: 'School / college club', neighbourhood: 'Neighbourhood club',
    social_club: 'Social club', military: 'Military club', railway: 'Railway club', industrial: 'Industrial club', community: 'Community club',
    merger: 'Merger', breakaway: 'Breakaway club', unknown: 'Unclassified origin'
};

export default function ClubOriginPanel({ club, nation, league, allClubs = [], accentColor = '#334155' }) {
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

    const lineage = useMemo(() => {
        const predecessor = allClubs.find(c => c.id === club?.predecessor_club_id);
        const predecessor2 = allClubs.find(c => c.id === club?.predecessor_club_2_id);
        const former = allClubs.find(c => c.id === club?.former_name_club_id);
        return { predecessor, predecessor2, former };
    }, [allClubs, club]);

    const generateOrigin = async () => {
        setGenerating(true);
        try {
            const prompt = `Propose a historically believable formation story for a FICTIONAL football club. This is new canon being proposed for review, not a fact lookup.

ESTABLISHED CANON — DO NOT CONTRADICT:
Club: ${club.name}
Founded: ${club.founded_year || 'not recorded'}
Location: ${[club.settlement, club.district, club.region].filter(Boolean).join(', ') || club.city || 'not recorded'}
Nation: ${nation?.name || 'not recorded'}
Language/naming style: ${nation?.language || 'not recorded'}; ${Array.isArray(nation?.naming_styles) ? nation.naming_styles.join(', ') : nation?.naming_styles || 'not recorded'}
Nickname: ${club.nickname || 'not recorded'}
Colours: ${club.primary_color || 'not recorded'} / ${club.secondary_color || 'not recorded'}
Current level: ${league?.name || 'not recorded'}${league?.tier ? `, Tier ${league.tier}` : ''}
Settlement type/population: ${location?.settlement_size || 'not recorded'} / ${location?.population || 'not recorded'}
Recorded local industries: ${location?.industries || 'none supplied'}
Recorded local companies/employers: ${location?.major_companies || 'none supplied'}
Recorded landmarks: ${location?.landmarks || 'none supplied'}
Existing club history: ${club.history || 'none'}
Existing canon notes from admin: ${canonNotes || origin?.canon_notes || 'none'}
Lineage: ${lineage.predecessor && lineage.predecessor2 ? `recorded merger successor of ${lineage.predecessor.name} and ${lineage.predecessor2.name}` : lineage.predecessor ? `recorded successor/continuation of ${lineage.predecessor.name}` : lineage.former ? `same club formerly known as ${lineage.former.name}` : 'no predecessor/merger recorded'}

REALISM RULES:
- Choose a formation_type from: workplace, church, school, neighbourhood, social_club, military, railway, industrial, community, merger, breakaway, unknown.
- Make the origin plausible for the founding YEAR and the scale of the settlement. A small village club should not begin as a huge professional institution.
- If a real local industry/company is supplied above, you MAY use it. If none is supplied, do not invent a named employer/company merely to justify a works club.
- Do not invent named individual founders. Use groups such as railway clerks, apprentices, parish members, dock workers, school alumni, local tradesmen, or neighbourhood players only when the known context makes that archetype plausible.
- Do not invent wars, disasters, political events, benefactors, streets, churches, schools, factories or companies as established local facts.
- The name_origin and colour_origin may be plausible PROPOSED explanations, but must be restrained. If the club name/colours do not support a believable explanation, say the origin is unrecorded instead of forcing one.
- Avoid modern corporate language for old clubs. Avoid romantic clichés. Think like a local football historian.
- Early grounds before purpose-built stadia were often recreation fields, enclosed grounds, works fields, cricket grounds, commons or land beside existing institutions. Do not invent a precise named site unless it is already supplied.
- Keep the story 170-260 words and distinguish established facts from proposed interpretation with wording such as 'The most plausible origin is...' where necessary.

Return JSON with formation_type, story, founder_context, original_ground_context, name_origin, colour_origin, rationale. The rationale should explicitly say which supplied facts drove the proposal.`;

            const result = await base44.integrations.Core.InvokeLLM({
                prompt,
                add_context_from_internet: false,
                response_json_schema: {
                    type: 'object',
                    properties: {
                        formation_type: { type: 'string' }, story: { type: 'string' }, founder_context: { type: 'string' },
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200">
                        <div className="bg-white/90 p-4"><div className="text-[10px] uppercase tracking-wider font-black text-slate-400">Name origin</div><div className="mt-1 text-sm text-slate-700">{displayed.name_origin || 'Unrecorded'}</div></div>
                        <div className="bg-white/90 p-4"><div className="text-[10px] uppercase tracking-wider font-black text-slate-400">Colours</div><div className="mt-1 text-sm text-slate-700">{displayed.colour_origin || 'Unrecorded'}</div></div>
                        <div className="bg-white/90 p-4"><div className="text-[10px] uppercase tracking-wider font-black text-slate-400">Early home</div><div className="mt-1 text-sm text-slate-700">{displayed.original_ground_context || 'Unrecorded'}</div></div>
                    </div>
                    {proposal?.rationale && <div className="rounded-lg bg-slate-950/[0.035] p-3 text-xs leading-5 text-slate-500"><strong>Why this proposal:</strong> {proposal.rationale}</div>}
                    <AdminOnly>
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
