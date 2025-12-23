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
import { Progress } from "@/components/ui/progress";
import PageHeader from '@/components/common/PageHeader';
import AdminOnly, { useIsAdmin } from '@/components/common/AdminOnly';
import { toast } from 'sonner';

export default function BulkSquadBuilder() {
    const { isAdmin, isLoading: authLoading } = useIsAdmin();
    const [selectedNation, setSelectedNation] = useState('');
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

    const filteredLeagues = selectedNation 
        ? leagues.filter(l => l.nation_id === selectedNation).sort((a, b) => (a.tier || 1) - (b.tier || 1))
        : [];

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
                    playerCount: '25',
                    ageProfile: 'balanced',
                    quality: 'realistic',
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

        const tier = selectedLeagueData?.tier || 1;

        const ageProfiles = {
            young: 'mostly young players ages 17-23, some experienced 24-28',
            balanced: 'mix of youth (17-20), prime (21-28), and experienced (29-34)',
            experienced: 'mostly experienced players ages 26-34, some young prospects'
        };

        const qualityLevels = {
            top: `elite quality ratings 75-90, world-class potential for top tier ${tier} club`,
            good: `strong quality ratings 65-80, competitive for tier ${tier}`,
            realistic: `realistic ratings 55-75 suitable for tier ${tier} club`,
            lower: `modest ratings 45-65, developing tier ${tier} squad`,
            amateur: `amateur level ratings 25-55, grassroots tier ${tier} club`
        };

        // Get all nations and categorize by membership
        const allNations = await base44.entities.Nation.list();
        const vccNations = allNations.filter(n => n.membership === 'VCC').map(n => n.name);
        const cccNations = allNations.filter(n => n.membership === 'CCC').map(n => n.name);
        const isVCC = clubNation?.membership === 'VCC';
        const requestedCount = parseInt(config.playerCount);

        let nationalityRules = '';
        let domesticCount = 0;
        
        if (isVCC && tier === 1) {
            domesticCount = Math.floor(requestedCount * 0.80);
            const foreignCount = requestedCount - domesticCount;
            const maxCCC = Math.min(2, Math.floor(foreignCount * 0.15));
            const vccOptions = vccNations.filter(n => n !== clubNation?.name).slice(0, 5).join(', ');
            nationalityRules = `CRITICAL NATIONALITY RULES - COUNT AND VERIFY:
STEP 1: Generate EXACTLY ${domesticCount} players from ${clubNation?.name}
STEP 2: Generate ${foreignCount - maxCCC} players from VCC nations ONLY: ${vccOptions}
STEP 3: Generate ${maxCCC} CCC players MAXIMUM (elite quality 75+ only, extremely rare)
ABSOLUTELY FORBIDDEN: Do NOT add more than ${maxCCC} CCC players
VERIFY: ${domesticCount} ${clubNation?.name} + ${foreignCount - maxCCC} VCC + ${maxCCC} CCC = ${requestedCount} total`;
        } else if (isVCC && tier <= 3) {
            domesticCount = Math.floor(requestedCount * 0.92);
            const foreignCount = requestedCount - domesticCount;
            const vccOptions = vccNations.filter(n => n !== clubNation?.name).slice(0, 3).join(', ');
            nationalityRules = `CRITICAL NATIONALITY RULES - COUNT AND VERIFY:
STEP 1: Generate EXACTLY ${domesticCount} players from ${clubNation?.name}
STEP 2: Generate MAXIMUM ${foreignCount} players from nearby VCC nations: ${vccOptions}
ABSOLUTELY FORBIDDEN: ZERO CCC players allowed
VERIFY: ${domesticCount} ${clubNation?.name} + ${foreignCount} VCC = ${requestedCount} total`;
        } else if (isVCC) {
            domesticCount = Math.floor(requestedCount * 0.96);
            const foreignCount = requestedCount - domesticCount;
            nationalityRules = `CRITICAL NATIONALITY RULES:
Generate EXACTLY ${domesticCount} players from ${clubNation?.name}
MAXIMUM ${foreignCount} foreign players (VCC nations only, rare)
ABSOLUTELY FORBIDDEN: ZERO CCC players`;
        } else {
            // CCC nations - almost entirely domestic
            domesticCount = Math.floor(requestedCount * 0.94);
            const foreignCount = Math.max(1, requestedCount - domesticCount);
            nationalityRules = `CRITICAL NATIONALITY RULES:
Generate EXACTLY ${domesticCount} players from ${clubNation?.name}
MAXIMUM ${foreignCount} foreign player (extremely rare, VCC only if any)
ABSOLUTELY FORBIDDEN: ZERO other CCC players`;
        }

        const prompt = `Generate ${config.playerCount} realistic football players for ${club.name}, a club in ${clubNation?.name || 'Volaria'}.

SQUAD REQUIREMENTS:
- ${config.playerCount} total players
- Position distribution: 2-3 GK, 7-9 defenders (CB, LB, RB), 8-10 midfielders (CDM, CM, CAM), 6-8 forwards (LW, RW, ST)
- Squad composition: ${ageProfiles[config.ageProfile]}
- Quality: ${qualityLevels[config.quality]}
- League tier: ${tier} (${tier === 1 ? 'top flight' : `tier ${tier}`})

${nationalityRules}

${clubNation?.naming_styles ? `NAMING STYLES for ${clubNation.name}: ${clubNation.naming_styles.join(', ')}` : ''}

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

        let players = response.players || [];
        
        // Tolerance: within 18-26 for 25, or min 11 for lower counts
        const minAcceptable = Math.max(11, Math.floor(requestedCount * 0.72));
        const maxAcceptable = Math.ceil(requestedCount * 1.04);
        
        // Retry if outside tolerance
        if (players.length < minAcceptable || players.length > maxAcceptable) {
            console.warn(`Got ${players.length}/${requestedCount} (need ${minAcceptable}-${maxAcceptable}), retrying ${club.name}...`);
            const retryResponse = await base44.integrations.Core.InvokeLLM({
                prompt: `CRITICAL: Generate between ${minAcceptable} and ${requestedCount} players (target ${requestedCount}). You provided ${players.length} which is outside range. ${prompt}`,
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
            if (retryResponse?.players && retryResponse.players.length >= minAcceptable && retryResponse.players.length <= maxAcceptable) {
                players = retryResponse.players;
            }
        }
        
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

        // Process in batches of 3 for parallel speed
        const batchSize = 3;
        for (let i = 0; i < selected.length; i += batchSize) {
            const batch = selected.slice(i, i + batchSize);
            
            await Promise.all(batch.map(async (clubId) => {
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
            }));
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
                {/* Nation & League Selection */}
                <Card className="border-0 shadow-sm mb-6">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="w-5 h-5 text-emerald-600" />
                            Select Nation & League
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label>Nation</Label>
                                <Select value={selectedNation} onValueChange={(v) => { setSelectedNation(v); setSelectedLeague(''); setSelectedClubs({}); setClubConfigs({}); }}>
                                    <SelectTrigger className="mt-1">
                                        <SelectValue placeholder="Choose a nation" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {nations.map(nation => (
                                            <SelectItem key={nation.id} value={nation.id}>
                                                {nation.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>League</Label>
                                <Select value={selectedLeague} onValueChange={(v) => { setSelectedLeague(v); setSelectedClubs({}); setClubConfigs({}); }} disabled={!selectedNation}>
                                    <SelectTrigger className="mt-1">
                                        <SelectValue placeholder={selectedNation ? "Choose a league" : "Select nation first"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {filteredLeagues.map(league => (
                                            <SelectItem key={league.id} value={league.id}>
                                                {league.name} - Tier {league.tier || 1}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
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
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            <div>
                                                <Label className="text-xs">Number of Players</Label>
                                                <Select onValueChange={(v) => applyToAll('playerCount', v)} defaultValue="25">
                                                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="15">15 players</SelectItem>
                                                        <SelectItem value="20">20 players</SelectItem>
                                                        <SelectItem value="25">25 players</SelectItem>
                                                        <SelectItem value="30">30 players</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div>
                                                <Label className="text-xs">Age Profile</Label>
                                                <Select onValueChange={(v) => applyToAll('ageProfile', v)} defaultValue="balanced">
                                                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="young">Young Squad (17-23)</SelectItem>
                                                        <SelectItem value="balanced">Balanced (17-34)</SelectItem>
                                                        <SelectItem value="experienced">Experienced (26-34)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div>
                                                <Label className="text-xs">Quality Level</Label>
                                                <Select onValueChange={(v) => applyToAll('quality', v)} defaultValue="realistic">
                                                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="top">Top Quality (75-90)</SelectItem>
                                                        <SelectItem value="good">Good Quality (65-80)</SelectItem>
                                                        <SelectItem value="realistic">Realistic (55-75)</SelectItem>
                                                        <SelectItem value="lower">Developing (45-65)</SelectItem>
                                                        <SelectItem value="amateur">Amateur (25-55)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="flex items-end">
                                                <label className="flex items-center gap-2 text-xs">
                                                    <Checkbox onCheckedChange={(v) => applyToAll('overwriteExisting', v)} />
                                                    Overwrite Existing
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
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                                        <div>
                                                            <Label className="text-xs">Players</Label>
                                                            <Select value={config.playerCount || '25'} onValueChange={(v) => updateClubConfig(clubId, 'playerCount', v)}>
                                                                <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="15">15</SelectItem>
                                                                    <SelectItem value="20">20</SelectItem>
                                                                    <SelectItem value="25">25</SelectItem>
                                                                    <SelectItem value="30">30</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div>
                                                            <Label className="text-xs">Age Profile</Label>
                                                            <Select value={config.ageProfile || 'balanced'} onValueChange={(v) => updateClubConfig(clubId, 'ageProfile', v)}>
                                                                <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="young">Young</SelectItem>
                                                                    <SelectItem value="balanced">Balanced</SelectItem>
                                                                    <SelectItem value="experienced">Experienced</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div>
                                                            <Label className="text-xs">Quality</Label>
                                                            <Select value={config.quality || 'realistic'} onValueChange={(v) => updateClubConfig(clubId, 'quality', v)}>
                                                                <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="top">Top</SelectItem>
                                                                    <SelectItem value="good">Good</SelectItem>
                                                                    <SelectItem value="realistic">Realistic</SelectItem>
                                                                    <SelectItem value="lower">Lower</SelectItem>
                                                                    <SelectItem value="amateur">Amateur</SelectItem>
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

                        {/* Progress Bar */}
                        {generating && selectedCount > 0 && (
                            <Card className="border-0 shadow-sm mb-6">
                                <CardContent className="pt-6">
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="font-medium">Overall Progress</span>
                                            <span className="text-slate-600">
                                                {Object.values(progress).filter(p => p === 'success').length} / {selectedCount} completed
                                            </span>
                                        </div>
                                        <Progress 
                                            value={(Object.values(progress).filter(p => p === 'success').length / selectedCount) * 100} 
                                            className="h-2"
                                        />
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