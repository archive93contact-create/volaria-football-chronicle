import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Building2, Check, Lightbulb, Loader2, MapPin, Plus, Sparkles } from 'lucide-react';
import AdminOnly from '@/components/common/AdminOnly';
import ThemedCard from '@/components/common/ThemedCard';
import { yearNumber } from '@/lib/clubImmersion';

const TYPES = {
    road: 'Road / lane', district: 'District', landmark: 'Local landmark', field: 'Field / ground', park: 'Park', works: 'Works / industry', municipal: 'Municipal', traditional: 'Traditional'
};

export default function StadiumHistoryPanel({ club, nation, league, seasons = [], accentColor = '#334155' }) {
    const queryClient = useQueryClient();
    const [generating, setGenerating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [proposals, setProposals] = useState([]);
    const [selectedName, setSelectedName] = useState('');
    const latestSeasonYear = useMemo(() => Math.max(0, ...seasons.map(s => yearNumber(s.year))), [seasons]);
    const [startYear, setStartYear] = useState(latestSeasonYear || club.founded_year || '');

    const { data: history = [] } = useQuery({
        queryKey: ['stadiumHistory', club?.id],
        queryFn: () => base44.entities.StadiumHistory.filter({ club_id: club.id }, 'start_year'),
        enabled: !!club?.id,
    });

    const locationName = club?.settlement || club?.district || club?.region || club?.city;
    const { data: locations = [] } = useQuery({
        queryKey: ['stadiumLocation', club?.nation_id, locationName],
        queryFn: () => base44.entities.Location.filter({ nation_id: club.nation_id, name: locationName }),
        enabled: !!club?.nation_id && !!locationName,
    });
    const location = locations[0] || null;

    const displayHistory = useMemo(() => {
        const rows = [...history];
        if (club.stadium && !rows.some(row => row.stadium_name === club.stadium)) {
            rows.push({ id: 'legacy-current', stadium_name: club.stadium, capacity: club.stadium_capacity, start_year: null, end_year: null, is_current: true, generated_context: 'Current Club record — add to ground history to set dates.' });
        }
        return rows.sort((a, b) => Number(a.start_year || 9999) - Number(b.start_year || 9999));
    }, [history, club.stadium, club.stadium_capacity]);

    const generateNames = async () => {
        setGenerating(true);
        try {
            const existingNames = displayHistory.map(h => h.stadium_name).filter(Boolean).join(', ') || 'none';
            const prompt = `Propose SIX distinctive but believable football ground names for this FICTIONAL club. These are proposals for new canon, not factual lookups.

KNOWN CANON:
Club: ${club.name}
Founded: ${club.founded_year || 'unknown'}
Nickname: ${club.nickname || 'none'}
Settlement/district/region: ${[club.settlement, club.district, club.region].filter(Boolean).join(', ') || club.city || 'unknown'}
Nation: ${nation?.name || 'unknown'}
Language/naming styles: ${nation?.language || 'unknown'}; ${Array.isArray(nation?.naming_styles) ? nation.naming_styles.join(', ') : nation?.naming_styles || 'unknown'}
League/tier: ${league?.name || 'unknown'} / Tier ${league?.tier || '?'}
Club status: ${club.professional_status || 'unknown'}
Recorded local industries: ${location?.industries || 'none supplied'}
Recorded employers/companies: ${location?.major_companies || 'none supplied'}
Recorded landmarks: ${location?.landmarks || 'none supplied'}
Existing/previous ground names: ${existingNames}
Proposed ground begins around: ${startYear || 'unknown year'}

NAMING PRINCIPLES:
- Think about how REAL football grounds get oddly specific identities. The famous name is often a small road, old field, estate, farm, works site, bank, end, meadow, common, hill, bridge, enclosure or inherited local microtoponym — not the town itself.
- DO NOT default to the club, town, district or region name. AT MOST ONE of the six proposals may contain the settlement/district/region name. At least FOUR should work as distinctive standalone ground identities.
- You MAY create a low-stakes local microtoponym as NEW proposed canon: an old field name, lane, bank, coppice, meadow, end, fold, hollow, croft, heath, wharf, works enclosure or similar culturally appropriate form. This is encouraged because fictional places need the same messy local naming history as real places.
- If you invent such a microtoponym, make it linguistically compatible with the nation's naming style and describe it only in the private rationale. Do not make it a grand historic claim.
- Do not just combine two generic scenic words. Names should sound inherited and slightly arbitrary rather than fantasy-poetic.
- Include a genuinely varied set: (1) a road/lane or approach name, (2) an old field/estate/microtoponym, (3) a short traditional name that may not need 'Ground', (4) a works/industrial or landmark-derived option ONLY if context supports it, (5) a park/enclosure/common form, and (6) one wildcard that feels locally natural but not obviously derived from the club's address.
- Some proposals may be only one or two words. Others can use Ground, Park, Field, Lane, Road, Enclosure, Recreation Ground, Stadium or a locally appropriate equivalent. Avoid making every option end in 'Ground'.
- Match the era. Avoid 'Arena', sponsor names and glossy corporate branding for an old/lower-league ground unless the club context genuinely supports it.
- Do not name a ground after a fabricated person, monarch, chairman, sponsor, battle or major historic event.
- Never mechanically use the full club name.
- Do not reuse an existing/previous ground name and avoid obvious famous real-world stadium names.

Return JSON { proposals: [{ stadium_name, name_type, rationale }] }. name_type must be one of road, district, landmark, field, park, works, municipal, traditional. The rationale is admin-only and should say whether any microtoponym is newly proposed canon.`;
            const result = await base44.integrations.Core.InvokeLLM({
                prompt,
                add_context_from_internet: false,
                response_json_schema: {
                    type: 'object', properties: { proposals: { type: 'array', items: { type: 'object', properties: { stadium_name: { type: 'string' }, name_type: { type: 'string' }, rationale: { type: 'string' } }, required: ['stadium_name', 'name_type', 'rationale'] } } }, required: ['proposals']
                }
            });
            const next = (result?.proposals || []).filter(p => p.stadium_name).slice(0, 6);
            setProposals(next);
            setSelectedName(next[0]?.stadium_name || '');
            await Promise.all(next.map(p => base44.entities.StadiumNameProposal.create({ club_id: club.id, proposed_name: p.stadium_name, name_type: p.name_type, rationale: p.rationale, generated_at: new Date().toISOString(), is_accepted: false })));
        } finally {
            setGenerating(false);
        }
    };

    const acceptGround = async () => {
        const proposal = proposals.find(p => p.stadium_name === selectedName);
        if (!proposal || !selectedName) return;
        setSaving(true);
        const year = Number(startYear) || latestSeasonYear || club.founded_year || null;
        const currentRecords = history.filter(h => h.is_current);
        for (const record of currentRecords) {
            await base44.entities.StadiumHistory.update(record.id, { is_current: false, end_year: year ? year - 1 : record.end_year || null });
        }
        // If the legacy Club record had a current ground that was never added to the timeline,
        // preserve it before switching names so accepting a proposal cannot erase ground history.
        if (club.stadium && club.stadium !== selectedName && !history.some(h => h.stadium_name === club.stadium)) {
            await base44.entities.StadiumHistory.create({
                club_id: club.id,
                stadium_name: club.stadium,
                start_year: club.founded_year || undefined,
                end_year: year ? year - 1 : undefined,
                capacity: club.stadium_capacity || undefined,
                ground_grade: club.stadium_rating ?? undefined,
                is_current: false,
                generated_context: 'Imported from the previous current-ground field when the club adopted a new ground name; dates can be refined by the admin.'
            });
        }
        await base44.entities.StadiumHistory.create({
            club_id: club.id,
            stadium_name: selectedName,
            start_year: year || undefined,
            capacity: club.stadium_capacity || undefined,
            ground_grade: club.stadium_rating ?? undefined,
            is_current: true,
            move_reason: '',
            notes: '',
            generated_context: proposal.rationale,
        });
        await base44.entities.Club.update(club.id, { stadium: selectedName });
        queryClient.invalidateQueries({ queryKey: ['stadiumHistory', club.id] });
        queryClient.invalidateQueries({ queryKey: ['club', club.id] });
        setProposals([]);
        setSaving(false);
    };

    const captureExisting = async () => {
        if (!club.stadium) return;
        setSaving(true);
        await base44.entities.StadiumHistory.create({ club_id: club.id, stadium_name: club.stadium, start_year: club.founded_year || undefined, capacity: club.stadium_capacity || undefined, ground_grade: club.stadium_rating ?? undefined, is_current: true, generated_context: 'Imported from current Club record; dates can be refined later.' });
        queryClient.invalidateQueries({ queryKey: ['stadiumHistory', club.id] });
        setSaving(false);
    };

    return (
        <ThemedCard title="Ground History" icon={Building2} primaryColor={accentColor} accentColor={accentColor}>
            {displayHistory.length ? (
                <div className="relative ml-2 border-l border-slate-200 pl-6 space-y-5">
                    {displayHistory.map((ground, index) => (
                        <div key={ground.id || `${ground.stadium_name}-${index}`} className="relative">
                            <span className="absolute -left-[31px] top-2 w-3 h-3 rounded-full border-2 border-white" style={{ backgroundColor: ground.is_current ? accentColor : '#94a3b8' }} />
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <div className="font-black text-slate-900">{ground.stadium_name}</div>
                                        {ground.is_current && <Badge variant="outline" className="text-xs" style={{ color: accentColor, borderColor: `${accentColor}55` }}>Current</Badge>}
                                    </div>
                                    <div className="mt-1 text-sm text-slate-500">{ground.start_year || '?'}–{ground.is_current ? 'present' : ground.end_year || '?'}{ground.capacity ? ` · ${Number(ground.capacity).toLocaleString()} capacity` : ''}{ground.ground_grade != null ? ` · Grade ${ground.ground_grade}` : ''}</div>
                                    {(ground.move_reason || ground.notes) && <div className="mt-2 text-sm leading-6 text-slate-600 max-w-3xl">{ground.move_reason || ground.notes}</div>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : <div className="py-4 text-sm text-slate-500">No historical grounds have been recorded yet.</div>}

            <AdminOnly>
                <div className="mt-6 pt-5 border-t border-slate-200/70">
                    {club.stadium && !history.length && <Button variant="outline" size="sm" onClick={captureExisting} disabled={saving} className="mr-2"><Plus className="w-4 h-4 mr-2" />Add current ground to timeline</Button>}
                    <Button variant="outline" size="sm" onClick={generateNames} disabled={generating}>{generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}Propose better ground names</Button>

                    {proposals.length > 0 && (
                        <div className="mt-5 space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {proposals.map(p => (
                                    <button key={p.stadium_name} onClick={() => setSelectedName(p.stadium_name)} className={`text-left rounded-xl border p-4 transition-all ${selectedName === p.stadium_name ? 'ring-2 bg-white' : 'bg-white/55 hover:bg-white'}`} style={selectedName === p.stadium_name ? { borderColor: accentColor, '--tw-ring-color': `${accentColor}33` } : {}}>
                                        <div className="flex items-center gap-2"><MapPin className="w-4 h-4" style={{ color: accentColor }} /><span className="font-black text-slate-900">{p.stadium_name}</span></div>
                                        <div className="mt-1 text-[10px] uppercase tracking-wider font-bold text-slate-400">{TYPES[p.name_type] || p.name_type}</div>
                                        <div className="mt-2 text-xs leading-5 text-slate-600">{p.rationale}</div>
                                    </button>
                                ))}
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                                <div><Label className="text-xs">Ground begins in</Label><Input className="mt-1 w-32" type="number" value={startYear} onChange={e => setStartYear(e.target.value)} /></div>
                                <Button onClick={acceptGround} disabled={saving || !selectedName}><Check className="w-4 h-4 mr-2" />Use selected name</Button>
                                <div className="text-xs text-slate-500 flex items-center gap-1"><Lightbulb className="w-3 h-3" />Accepting a name makes that proposal part of the club's ground canon.</div>
                            </div>
                        </div>
                    )}
                </div>
            </AdminOnly>
        </ThemedCard>
    );
}
