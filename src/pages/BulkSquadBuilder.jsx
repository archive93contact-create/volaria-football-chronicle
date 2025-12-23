import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Users, Loader2, CheckCircle2, XCircle, Shield, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import PageHeader from '@/components/common/PageHeader';
import AdminOnly, { useIsAdmin } from '@/components/common/AdminOnly';
import { toast } from 'sonner';

export default function BulkSquadBuilder() {
    const { isAdmin, isLoading: authLoading } = useIsAdmin();
    const [selectedLeague, setSelectedLeague] = useState('');
    const [selectedClubs, setSelectedClubs] = useState({});
    const [clubConfigs, setClubConfigs] = useState({});
    const [generating, setGenerating] = useState(false);
    const [progress, setProgress] = useState({});

    const { data: leagues = [] } = useQuery({
        queryKey: ['allLeagues'],
        queryFn: () => base44.entities.League.list(),
    });

    const { data: nations = [] } = useQuery({
        queryKey: ['allNations'],
        queryFn: () => base44.entities.Nation.list(),
    });

    const { data: clubs = [] } = useQuery({
        queryKey: ['clubsByLeague', selectedLeague],
        queryFn: () => base44.entities.Club.filter({ league_id: selectedLeague }),
        enabled: !!selectedLeague,
    });

    const { data: allClubs = [] } = useQuery({
        queryKey: ['allClubs'],
        queryFn: () => base44.entities.Club.list(),
    });

    const { data: locations = [] } = useQuery({
        queryKey: ['allLocations'],
        queryFn: () => base44.entities.Location.list(),
    });

    const { data: seasons = [] } = useQuery({
        queryKey: ['allSeasons'],
        queryFn: () => base44.entities.LeagueTable.list(),
    });

    const selectedLeagueData = leagues.find(l => l.id === selectedLeague);
    const leagueNation = nations.find(n => n.id === selectedLeagueData?.nation_id);

    const toggleClub = (clubId) => {
        setSelectedClubs(prev => ({
            ...prev,
            [clubId]: !prev[clubId]
        }));
        
        if (!clubConfigs[clubId]) {
            setClubConfigs(prev => ({
                ...prev,
                [clubId]: {
                    playerCount: 22,
                    minAge: 18,
                    maxAge: 35,
                    quality: 'balanced',
                    overwriteExisting: false
                }
            }));
        }
    };

    const updateClubConfig = (clubId, field, value) => {
        setClubConfigs(prev => ({
            ...prev,
            [clubId]: {
                ...prev[clubId],
                [field]: value
            }
        }));
    };

    const applyToAll = (field, value) => {
        const selected = Object.keys(selectedClubs).filter(id => selectedClubs[id]);
        setClubConfigs(prev => {
            const updated = { ...prev };
            selected.forEach(clubId => {
                updated[clubId] = {
                    ...updated[clubId],
                    [field]: value
                };
            });
            return updated;
        });
        toast.success(`Applied ${field} to all selected clubs`);
    };

    const generateSquad = async (club, config) => {
        const clubNation = nations.find(n => n.id === club.nation_id);
        const clubLocations = locations.filter(l => 
            l.nation_id === club.nation_id && 
            (l.name === club.settlement || l.name === club.district || l.name === club.region)
        );
        const clubSeasons = seasons.filter(s => s.club_id === club.id);

        const qualityMap = {
            'elite': { minOVR: 75, maxOVR: 90, minPOT: 80, maxPOT: 95 },
            'strong': { minOVR: 65, maxOVR: 82, minPOT: 70, maxPOT: 88 },
            'balanced': { minOVR: 55, maxOVR: 75, minPOT: 60, maxPOT: 82 },
            'developing': { minOVR: 45, maxOVR: 68, minPOT: 50, maxPOT: 75 },
            'weak': { minOVR: 35, maxOVR: 60, minPOT: 40, maxPOT: 68 }
        };

        const quality = qualityMap[config.quality];
        const tier = selectedLeagueData?.tier || 1;
        const tierPenalty = (tier - 1) * 5;
        
        const adjustedQuality = {
            minOVR: Math.max(35, quality.minOVR - tierPenalty),
            maxOVR: Math.max(50, quality.maxOVR - tierPenalty),
            minPOT: Math.max(40, quality.minPOT - tierPenalty),
            maxPOT: Math.max(60, quality.maxPOT - tierPenalty)
        };

        const prompt = `Generate ${config.playerCount} realistic football players for ${club.name}, a club in ${clubNation?.name || 'Volaria'}.

SQUAD REQUIREMENTS:
- ${config.playerCount} total players
- Position distribution: 2 GK, rest split between defenders (6-8), midfielders (6-8), forwards (4-6)
- Age range: ${config.minAge}-${config.maxAge} years
- Overall ratings: ${adjustedQuality.minOVR}-${adjustedQuality.maxOVR}
- Potential ratings: ${adjustedQuality.minPOT}-${adjustedQuality.maxPOT}
- League tier: ${tier} (${tier === 1 ? 'top flight' : `tier ${tier}`})

NATIONALITY RULES:
- Primary nationality: ${clubNation?.name || 'Unknown'}
${clubNation?.naming_styles ? `- Use naming styles: ${clubNation.naming_styles.join(', ')}` : ''}
- Diversify: Include 20-40% players from other Volarian nations
- If no naming styles, use realistic European/international names

BIRTHPLACES:
${clubLocations.length > 0 ? `- Prioritize: ${clubLocations.map(l => l.name).join(', ')}` : ''}
- Use settlements/cities from ${clubNation?.name || 'the nation'}

CLUB CONTEXT:
${club.founded_year ? `- Founded: ${club.founded_year}` : ''}
${clubSeasons.length > 0 ? `- ${clubSeasons.length} seasons of history` : '- New club'}
${club.history ? `- History: ${club.history.substring(0, 200)}` : ''}

Return a JSON array with this exact structure:
[{
  "first_name": "string",
  "last_name": "string",
  "full_name": "string",
  "date_of_birth": "YYYY-MM-DD",
  "age": number,
  "nationality": "string",
  "nation_id": "${club.nation_id}",
  "birth_place": "string",
  "club_id": "${club.id}",
  "position": "GK|CB|LB|RB|CDM|CM|CAM|LW|RW|ST",
  "shirt_number": number,
  "overall_rating": number,
  "potential": number,
  "preferred_foot": "Left|Right|Both",
  "height_cm": number,
  "is_youth_player": false
}]`;

        const response = await base44.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: {
                type: "object",
                properties: {
                    players: {
                        type: "array",
                        items: { type: "object" }
                    }
                }
            }
        });

        const players = response.players || [];
        
        if (config.overwriteExisting) {
            const existingPlayers = await base44.entities.Player.filter({ club_id: club.id });
            for (const player of existingPlayers) {
                await base44.entities.Player.delete(player.id);
            }
        }

        const createdPlayers = await base44.entities.Player.bulkCreate(players);

        // Generate photos asynchronously
        for (const player of createdPlayers) {
            try {
                const photoResult = await base44.integrations.Core.GenerateImage({
                    prompt: `Professional headshot photo of ${player.full_name}, a ${player.age}-year-old ${player.nationality} footballer, ${player.position} position, realistic, high quality, clean background`
                });
                await base44.entities.Player.update(player.id, { photo_url: photoResult.url });
            } catch (err) {
                console.error(`Failed to generate photo for ${player.full_name}`);
            }
        }

        return createdPlayers.length;
    };

    const handleGenerateAll = async () => {
        const selected = Object.keys(selectedClubs).filter(id => selectedClubs[id]);
        if (selected.length === 0) {
            toast.error('Please select at least one club');
            return;
        }

        setGenerating(true);
        setProgress({});

        for (const clubId of selected) {
            const club = clubs.find(c => c.id === clubId);
            const config = clubConfigs[clubId];

            setProgress(prev => ({ ...prev, [clubId]: 'generating' }));

            try {
                const count = await generateSquad(club, config);
                setProgress(prev => ({ ...prev, [clubId]: 'success' }));
                toast.success(`${club.name}: ${count} players created`);
            } catch (error) {
                setProgress(prev => ({ ...prev, [clubId]: 'error' }));
                toast.error(`${club.name}: Failed - ${error.message}`);
            }
        }

        setGenerating(false);
    };

    if (authLoading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;
    if (!isAdmin) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><p className="text-slate-500">Admin access required</p></div>;

    const selectedCount = Object.values(selectedClubs).filter(Boolean).length;

    return (
        <div className="min-h-screen bg-slate-50">
            <PageHeader
                title="Bulk Squad Builder"
                subtitle="Generate squads for multiple clubs at once"
                breadcrumbs={[{ label: 'Bulk Squad Builder' }]}
            />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* League Selection */}
                <Card className="border-0 shadow-sm mb-6">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="w-5 h-5 text-emerald-600" />
                            Select League
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Select value={selectedLeague} onValueChange={(v) => { setSelectedLeague(v); setSelectedClubs({}); setClubConfigs({}); }}>
                            <SelectTrigger>
                                <SelectValue placeholder="Choose a league" />
                            </SelectTrigger>
                            <SelectContent>
                                {leagues.map(league => {
                                    const nation = nations.find(n => n.id === league.nation_id);
                                    return (
                                        <SelectItem key={league.id} value={league.id}>
                                            {league.name} ({nation?.name}) - Tier {league.tier || 1}
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>

                {selectedLeague && clubs.length > 0 && (
                    <>
                        {/* Club Selection */}
                        <Card className="border-0 shadow-sm mb-6">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="flex items-center gap-2">
                                        <Users className="w-5 h-5 text-emerald-600" />
                                        Select Clubs ({selectedCount} selected)
                                    </CardTitle>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={() => {
                                            const all = {};
                                            clubs.forEach(c => all[c.id] = true);
                                            setSelectedClubs(all);
                                            clubs.forEach(c => {
                                                if (!clubConfigs[c.id]) {
                                                    setClubConfigs(prev => ({
                                                        ...prev,
                                                        [c.id]: { playerCount: 22, minAge: 18, maxAge: 35, quality: 'balanced', overwriteExisting: false }
                                                    }));
                                                }
                                            });
                                        }}>Select All</Button>
                                        <Button variant="outline" size="sm" onClick={() => setSelectedClubs({})}>Deselect All</Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {clubs.map(club => (
                                        <label key={club.id} className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${selectedClubs[club.id] ? 'bg-emerald-50 border-emerald-500' : 'bg-white hover:bg-slate-50'}`}>
                                            <Checkbox checked={!!selectedClubs[club.id]} onCheckedChange={() => toggleClub(club.id)} />
                                            {club.logo_url && <img src={club.logo_url} alt={club.name} className="w-6 h-6 object-contain bg-white rounded" />}
                                            <span className="text-sm font-medium truncate">{club.name}</span>
                                            {progress[club.id] === 'generating' && <Loader2 className="w-3 h-3 animate-spin text-blue-500 ml-auto" />}
                                            {progress[club.id] === 'success' && <CheckCircle2 className="w-3 h-3 text-green-500 ml-auto" />}
                                            {progress[club.id] === 'error' && <XCircle className="w-3 h-3 text-red-500 ml-auto" />}
                                        </label>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Configuration */}
                        {selectedCount > 0 && (
                            <Card className="border-0 shadow-sm mb-6">
                                <CardHeader>
                                    <CardTitle>Squad Configuration</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {/* Apply to All */}
                                    <div className="p-4 bg-blue-50 rounded-lg mb-4">
                                        <h3 className="font-semibold mb-3 text-blue-900">Apply to All Selected Clubs</h3>
                                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                            <div>
                                                <Label className="text-xs">Player Count</Label>
                                                <Input type="number" defaultValue={22} onChange={(e) => applyToAll('playerCount', parseInt(e.target.value))} className="mt-1" />
                                            </div>
                                            <div>
                                                <Label className="text-xs">Min Age</Label>
                                                <Input type="number" defaultValue={18} onChange={(e) => applyToAll('minAge', parseInt(e.target.value))} className="mt-1" />
                                            </div>
                                            <div>
                                                <Label className="text-xs">Max Age</Label>
                                                <Input type="number" defaultValue={35} onChange={(e) => applyToAll('maxAge', parseInt(e.target.value))} className="mt-1" />
                                            </div>
                                            <div>
                                                <Label className="text-xs">Quality</Label>
                                                <Select onValueChange={(v) => applyToAll('quality', v)} defaultValue="balanced">
                                                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="elite">Elite</SelectItem>
                                                        <SelectItem value="strong">Strong</SelectItem>
                                                        <SelectItem value="balanced">Balanced</SelectItem>
                                                        <SelectItem value="developing">Developing</SelectItem>
                                                        <SelectItem value="weak">Weak</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="flex items-end">
                                                <label className="flex items-center gap-2 text-xs">
                                                    <Checkbox onCheckedChange={(v) => applyToAll('overwriteExisting', v)} />
                                                    Overwrite
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Individual Club Configs */}
                                    <div className="space-y-3">
                                        {Object.keys(selectedClubs).filter(id => selectedClubs[id]).map(clubId => {
                                            const club = clubs.find(c => c.id === clubId);
                                            const config = clubConfigs[clubId] || {};
                                            return (
                                                <div key={clubId} className="p-3 bg-slate-50 rounded-lg">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        {club.logo_url && <img src={club.logo_url} alt={club.name} className="w-5 h-5 object-contain" />}
                                                        <span className="font-semibold text-sm">{club.name}</span>
                                                    </div>
                                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                                                        <div>
                                                            <Label className="text-xs">Players</Label>
                                                            <Input type="number" value={config.playerCount || 22} onChange={(e) => updateClubConfig(clubId, 'playerCount', parseInt(e.target.value))} className="mt-1 h-8" />
                                                        </div>
                                                        <div>
                                                            <Label className="text-xs">Min Age</Label>
                                                            <Input type="number" value={config.minAge || 18} onChange={(e) => updateClubConfig(clubId, 'minAge', parseInt(e.target.value))} className="mt-1 h-8" />
                                                        </div>
                                                        <div>
                                                            <Label className="text-xs">Max Age</Label>
                                                            <Input type="number" value={config.maxAge || 35} onChange={(e) => updateClubConfig(clubId, 'maxAge', parseInt(e.target.value))} className="mt-1 h-8" />
                                                        </div>
                                                        <div>
                                                            <Label className="text-xs">Quality</Label>
                                                            <Select value={config.quality || 'balanced'} onValueChange={(v) => updateClubConfig(clubId, 'quality', v)}>
                                                                <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="elite">Elite</SelectItem>
                                                                    <SelectItem value="strong">Strong</SelectItem>
                                                                    <SelectItem value="balanced">Balanced</SelectItem>
                                                                    <SelectItem value="developing">Developing</SelectItem>
                                                                    <SelectItem value="weak">Weak</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div className="flex items-end">
                                                            <label className="flex items-center gap-1 text-xs">
                                                                <Checkbox checked={config.overwriteExisting} onCheckedChange={(v) => updateClubConfig(clubId, 'overwriteExisting', v)} />
                                                                Overwrite
                                                            </label>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Generate Button */}
                        {selectedCount > 0 && (
                            <div className="flex justify-center">
                                <Button 
                                    onClick={handleGenerateAll} 
                                    disabled={generating}
                                    size="lg"
                                    className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                                >
                                    {generating ? (
                                        <>
                                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                            Generating Squads...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-5 h-5 mr-2" />
                                            Generate Squads for {selectedCount} Club{selectedCount > 1 ? 's' : ''}
                                        </>
                                    )}
                                </Button>
                            </div>
                        )}
                    </>
                )}

                {selectedLeague && clubs.length === 0 && (
                    <Card className="border-0 shadow-sm">
                        <CardContent className="py-12 text-center text-slate-500">
                            No clubs found in this league
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}