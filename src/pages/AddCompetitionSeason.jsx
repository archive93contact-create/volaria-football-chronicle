import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Save, ArrowLeft, Loader2, Plus, Trash2, Trophy, ChevronRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { syncContinentalCompetition } from '@/lib/continentalSync';

const ROUNDS = [
    { name: 'Final', order: 1, matches: 1 },
    { name: 'Semi-Final', order: 2, matches: 2 },
    { name: 'Quarter-Final', order: 3, matches: 4 },
    { name: 'Round of 16', order: 4, matches: 8 },
    { name: 'Round of 32', order: 5, matches: 16 },
    { name: 'Group Stage', order: 6, matches: 0 },
];

export default function AddCompetitionSeason() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const urlParams = new URLSearchParams(window.location.search);
    const competitionId = urlParams.get('competition_id');

    const [seasonData, setSeasonData] = useState({
        year: '',
        top_scorer: '',
        notes: '',
    });

    const [selectedRounds, setSelectedRounds] = useState(['Final', 'Semi-Final', 'Quarter-Final']);
    const [matches, setMatches] = useState({});
    const [activeTab, setActiveTab] = useState('details');

    const { data: competition } = useQuery({
        queryKey: ['competition', competitionId],
        queryFn: async () => {
            const comps = await base44.entities.ContinentalCompetition.filter({ id: competitionId });
            return comps[0];
        },
        enabled: !!competitionId,
    });

    const { data: nations = [] } = useQuery({
        queryKey: ['nations'],
        queryFn: () => base44.entities.Nation.list('name'),
    });

    const { data: allClubs = [] } = useQuery({
        queryKey: ['allClubs'],
        queryFn: () => base44.entities.Club.list('name'),
    });

    // Group clubs by nation
    const clubsByNation = useMemo(() => {
        const grouped = {};
        allClubs.forEach(club => {
            if (!grouped[club.nation_id]) {
                grouped[club.nation_id] = [];
            }
            grouped[club.nation_id].push(club);
        });
        return grouped;
    }, [allClubs]);

    const initializeMatches = () => {
        const newMatches = {};
        selectedRounds.forEach(roundName => {
            const round = ROUNDS.find(r => r.name === roundName);
            if (round && round.matches > 0) {
                newMatches[roundName] = [];
                for (let i = 0; i < round.matches; i++) {
                    newMatches[roundName].push({
                        round: roundName,
                        round_order: round.order,
                        match_number: i + 1,
                        home_club_id: '',
                        home_club_name: '',
                        home_nation_id: '',
                        away_club_id: '',
                        away_club_name: '',
                        away_nation_id: '',
                        home_score: '',
                        away_score: '',
                        venue: '',
                        penalties: '',
                        extra_time: false,
                    });
                }
            }
        });
        setMatches(newMatches);
    };

    const updateMatch = (round, matchIndex, field, value) => {
        setMatches(prev => {
            const updated = { ...prev };
            updated[round] = [...updated[round]];
            updated[round][matchIndex] = { ...updated[round][matchIndex], [field]: value };
            
            // Auto-fill club name and nation when selecting club
            if (field === 'home_club_id' || field === 'away_club_id') {
                const club = allClubs.find(c => c.id === value);
                if (club) {
                    const prefix = field === 'home_club_id' ? 'home' : 'away';
                    updated[round][matchIndex][`${prefix}_club_name`] = club.name;
                    updated[round][matchIndex][`${prefix}_nation_id`] = club.nation_id;
                }
            }
            
            return updated;
        });
    };

    const createSeasonMutation = useMutation({
        mutationFn: async (data) => {
            const getWinner = (match) => {
                if (!match?.home_club_id || !match?.away_club_id) return null;
                const homeScore = Number.parseInt(match.home_score, 10);
                const awayScore = Number.parseInt(match.away_score, 10);
                if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore)) return null;
                if (homeScore > awayScore) return allClubs.find(c => c.id === match.home_club_id) || null;
                if (awayScore > homeScore) return allClubs.find(c => c.id === match.away_club_id) || null;
                if (match.penalties) {
                    const [homePens, awayPens] = String(match.penalties).split('-').map(v => Number.parseInt(v.trim(), 10));
                    if (Number.isFinite(homePens) && Number.isFinite(awayPens) && homePens !== awayPens) {
                        return allClubs.find(c => c.id === (homePens > awayPens ? match.home_club_id : match.away_club_id)) || null;
                    }
                }
                return null;
            };

            const finalMatch = matches.Final?.[0];
            const championClub = getWinner(finalMatch);
            const runnerUpClub = championClub && finalMatch
                ? allClubs.find(c => c.id === (championClub.id === finalMatch.home_club_id ? finalMatch.away_club_id : finalMatch.home_club_id)) || null
                : null;
            const championNation = nations.find(n => n.id === championClub?.nation_id);
            const runnerUpNation = nations.find(n => n.id === runnerUpClub?.nation_id);
            const homeFinalScore = Number.parseInt(finalMatch?.home_score, 10);
            const awayFinalScore = Number.parseInt(finalMatch?.away_score, 10);
            let finalScore = Number.isFinite(homeFinalScore) && Number.isFinite(awayFinalScore) ? `${homeFinalScore}-${awayFinalScore}` : '';
            if (finalScore && finalMatch?.penalties) finalScore += ` (${finalMatch.penalties} pens)`;

            const season = await base44.entities.ContinentalSeason.create({
                competition_id: competitionId,
                year: data.year,
                champion_id: championClub?.id || '',
                champion_name: championClub?.name || '',
                champion_nation_id: championNation?.id || '',
                champion_nation: championNation?.name || '',
                runner_up_id: runnerUpClub?.id || '',
                runner_up: runnerUpClub?.name || '',
                runner_up_nation_id: runnerUpNation?.id || '',
                runner_up_nation: runnerUpNation?.name || '',
                final_score: finalScore,
                final_venue: finalMatch?.venue || '',
                top_scorer: data.top_scorer,
                notes: data.notes,
            });

            const canonicalMatches = [];
            Object.values(matches).forEach(roundMatches => {
                roundMatches.forEach(match => {
                    if (!match.home_club_id || !match.away_club_id) return;
                    const homeClub = allClubs.find(c => c.id === match.home_club_id);
                    const awayClub = allClubs.find(c => c.id === match.away_club_id);
                    if (!homeClub || !awayClub) return;
                    const homeNation = nations.find(n => n.id === homeClub.nation_id);
                    const awayNation = nations.find(n => n.id === awayClub.nation_id);
                    const winner = getWinner(match);
                    const homeScore = Number.parseInt(match.home_score, 10);
                    const awayScore = Number.parseInt(match.away_score, 10);

                    canonicalMatches.push({
                        season_id: season.id,
                        round: match.round,
                        match_number: match.match_number,
                        home_club_id: homeClub.id,
                        home_club_name: homeClub.name,
                        home_nation_id: homeNation?.id || homeClub.nation_id || '',
                        home_club_nation: homeNation?.name || '',
                        away_club_id: awayClub.id,
                        away_club_name: awayClub.name,
                        away_nation_id: awayNation?.id || awayClub.nation_id || '',
                        away_club_nation: awayNation?.name || '',
                        home_score_leg1: Number.isFinite(homeScore) ? homeScore : null,
                        away_score_leg1: Number.isFinite(awayScore) ? awayScore : null,
                        home_aggregate: Number.isFinite(homeScore) ? homeScore : null,
                        away_aggregate: Number.isFinite(awayScore) ? awayScore : null,
                        penalties: match.penalties || '',
                        winner: winner?.name || '',
                        winner_id: winner?.id || '',
                        is_single_leg: true,
                        venue: match.venue || '',
                    });
                });
            });

            if (canonicalMatches.length > 0) {
                await base44.entities.ContinentalMatch.bulkCreate(canonicalMatches);
            }

            await syncContinentalCompetition(competitionId);
            return season;
        },
        onSuccess: (season) => {
            queryClient.invalidateQueries({ queryKey: ['competitionSeasons', competitionId] });
            queryClient.invalidateQueries({ queryKey: ['continentalSeasons'] });
            queryClient.invalidateQueries({ queryKey: ['continentalMatches', season?.id] });
            queryClient.invalidateQueries({ queryKey: ['continentalCompetitions'] });
            queryClient.invalidateQueries({ queryKey: ['clubs'] });
            queryClient.invalidateQueries({ queryKey: ['club'] });
            queryClient.invalidateQueries({ queryKey: ['allClubs'] });
            navigate(createPageUrl(`CompetitionDetail?id=${competitionId}`));
        },
    });

    const handleSubmit = () => {
        createSeasonMutation.mutate(seasonData);
    };

    const toggleRound = (roundName) => {
        setSelectedRounds(prev => {
            if (prev.includes(roundName)) {
                return prev.filter(r => r !== roundName);
            }
            return [...prev, roundName];
        });
    };

    const getNationFlag = (nationId) => {
        const nation = nations.find(n => n.id === nationId);
        return nation?.flag_url;
    };

    if (!competition) {
        return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-slate-900 text-white">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <nav className="flex items-center gap-2 text-sm text-slate-400 mb-4">
                        <Link to={createPageUrl('ContinentalCompetitions')} className="hover:text-white">Continental Competitions</Link>
                        <ChevronRight className="w-4 h-4" />
                        <Link to={createPageUrl(`CompetitionDetail?id=${competitionId}`)} className="hover:text-white">{competition.name}</Link>
                        <ChevronRight className="w-4 h-4" />
                        <span className="text-white">Add Season</span>
                    </nav>
                    <h1 className="text-3xl font-bold">Add {competition.name} Season</h1>
                    <p className="text-slate-400 mt-1">Create a full season with bracket and results</p>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="mb-6">
                        <TabsTrigger value="details">1. Season Details</TabsTrigger>
                        <TabsTrigger value="rounds">2. Select Rounds</TabsTrigger>
                        <TabsTrigger value="matches">3. Enter Matches</TabsTrigger>
                    </TabsList>

                    <TabsContent value="details">
                        <Card className="border-0 shadow-sm">
                            <CardHeader><CardTitle>Season Details</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>Season Year *</Label>
                                        <Input 
                                            value={seasonData.year} 
                                            onChange={(e) => setSeasonData({...seasonData, year: e.target.value})} 
                                            placeholder="e.g., 2023-24" 
                                            className="mt-1" 
                                        />
                                    </div>
                                    <div>
                                        <Label>Top Scorer</Label>
                                        <Input 
                                            value={seasonData.top_scorer} 
                                            onChange={(e) => setSeasonData({...seasonData, top_scorer: e.target.value})} 
                                            placeholder="e.g., John Smith (10 goals)" 
                                            className="mt-1" 
                                        />
                                    </div>
                                </div>
                                <div>
                                    <Label>Notes</Label>
                                    <Textarea 
                                        value={seasonData.notes} 
                                        onChange={(e) => setSeasonData({...seasonData, notes: e.target.value})} 
                                        rows={3} 
                                        className="mt-1" 
                                    />
                                </div>
                                <div className="flex justify-end">
                                    <Button onClick={() => setActiveTab('rounds')} disabled={!seasonData.year}>
                                        Next: Select Rounds <ChevronRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="rounds">
                        <Card className="border-0 shadow-sm">
                            <CardHeader><CardTitle>Select Competition Rounds</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-slate-500 text-sm">Select which rounds to include in this season</p>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {ROUNDS.filter(r => r.name !== 'Group Stage').map(round => (
                                        <button
                                            key={round.name}
                                            onClick={() => toggleRound(round.name)}
                                            className={`p-4 rounded-lg border-2 text-left transition-all ${
                                                selectedRounds.includes(round.name)
                                                    ? 'border-emerald-500 bg-emerald-50'
                                                    : 'border-slate-200 hover:border-slate-300'
                                            }`}
                                        >
                                            <div className="font-semibold">{round.name}</div>
                                            <div className="text-sm text-slate-500">{round.matches} match{round.matches > 1 ? 'es' : ''}</div>
                                        </button>
                                    ))}
                                </div>
                                <div className="flex justify-between pt-4">
                                    <Button variant="outline" onClick={() => setActiveTab('details')}>
                                        <ArrowLeft className="w-4 h-4 mr-2" /> Back
                                    </Button>
                                    <Button onClick={() => { initializeMatches(); setActiveTab('matches'); }}>
                                        Next: Enter Matches <ChevronRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="matches">
                        <div className="space-y-6">
                            {selectedRounds
                                .sort((a, b) => ROUNDS.find(r => r.name === a).order - ROUNDS.find(r => r.name === b).order)
                                .map(roundName => (
                                    <Card key={roundName} className="border-0 shadow-sm">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="flex items-center gap-2">
                                                {roundName === 'Final' && <Trophy className="w-5 h-5 text-amber-500" />}
                                                {roundName}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-4">
                                                {matches[roundName]?.map((match, idx) => (
                                                    <div key={idx} className="p-4 bg-slate-50 rounded-lg">
                                                        <div className="text-xs text-slate-500 mb-3">Match {idx + 1}</div>
                                                        <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-4 items-center">
                                                            {/* Home Team */}
                                                            <div className="space-y-2">
                                                                <Label className="text-xs">Home Team</Label>
                                                                <Select 
                                                                    value={match.home_club_id} 
                                                                    onValueChange={(v) => updateMatch(roundName, idx, 'home_club_id', v)}
                                                                >
                                                                    <SelectTrigger>
                                                                        <SelectValue placeholder="Select club" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {nations.map(nation => (
                                                                            clubsByNation[nation.id]?.length > 0 && (
                                                                                <React.Fragment key={nation.id}>
                                                                                    <div className="px-2 py-1 text-xs font-semibold text-slate-500 bg-slate-100 flex items-center gap-2">
                                                                                        {nation.flag_url && <img src={nation.flag_url} alt="" className="w-4 h-3 object-contain" />}
                                                                                        {nation.name}
                                                                                    </div>
                                                                                    {clubsByNation[nation.id].map(club => (
                                                                                        <SelectItem key={club.id} value={club.id}>
                                                                                            {club.name}
                                                                                        </SelectItem>
                                                                                    ))}
                                                                                </React.Fragment>
                                                                            )
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                                {match.home_nation_id && (
                                                                    <div className="flex items-center gap-2 text-sm">
                                                                        {getNationFlag(match.home_nation_id) && (
                                                                            <img src={getNationFlag(match.home_nation_id)} alt="" className="w-5 h-3 object-contain" />
                                                                        )}
                                                                        <span className="text-slate-600">{match.home_club_name}</span>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Score */}
                                                            <div className="flex items-center gap-2 justify-center">
                                                                <Input 
                                                                    type="number" 
                                                                    value={match.home_score} 
                                                                    onChange={(e) => updateMatch(roundName, idx, 'home_score', e.target.value)}
                                                                    className="w-16 text-center font-bold text-lg"
                                                                    min="0"
                                                                />
                                                                <span className="text-slate-400 font-bold">-</span>
                                                                <Input 
                                                                    type="number" 
                                                                    value={match.away_score} 
                                                                    onChange={(e) => updateMatch(roundName, idx, 'away_score', e.target.value)}
                                                                    className="w-16 text-center font-bold text-lg"
                                                                    min="0"
                                                                />
                                                            </div>

                                                            {/* Away Team */}
                                                            <div className="space-y-2">
                                                                <Label className="text-xs">Away Team</Label>
                                                                <Select 
                                                                    value={match.away_club_id} 
                                                                    onValueChange={(v) => updateMatch(roundName, idx, 'away_club_id', v)}
                                                                >
                                                                    <SelectTrigger>
                                                                        <SelectValue placeholder="Select club" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {nations.map(nation => (
                                                                            clubsByNation[nation.id]?.length > 0 && (
                                                                                <React.Fragment key={nation.id}>
                                                                                    <div className="px-2 py-1 text-xs font-semibold text-slate-500 bg-slate-100 flex items-center gap-2">
                                                                                        {nation.flag_url && <img src={nation.flag_url} alt="" className="w-4 h-3 object-contain" />}
                                                                                        {nation.name}
                                                                                    </div>
                                                                                    {clubsByNation[nation.id].map(club => (
                                                                                        <SelectItem key={club.id} value={club.id}>
                                                                                            {club.name}
                                                                                        </SelectItem>
                                                                                    ))}
                                                                                </React.Fragment>
                                                                            )
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                                {match.away_nation_id && (
                                                                    <div className="flex items-center gap-2 text-sm">
                                                                        {getNationFlag(match.away_nation_id) && (
                                                                            <img src={getNationFlag(match.away_nation_id)} alt="" className="w-5 h-3 object-contain" />
                                                                        )}
                                                                        <span className="text-slate-600">{match.away_club_name}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Extra details for Final */}
                                                        {roundName === 'Final' && (
                                                            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
                                                                <div>
                                                                    <Label className="text-xs">Venue</Label>
                                                                    <Input 
                                                                        value={match.venue} 
                                                                        onChange={(e) => updateMatch(roundName, idx, 'venue', e.target.value)}
                                                                        placeholder="Stadium name, City"
                                                                        className="mt-1"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <Label className="text-xs">Penalties (if applicable)</Label>
                                                                    <Input 
                                                                        value={match.penalties} 
                                                                        onChange={(e) => updateMatch(roundName, idx, 'penalties', e.target.value)}
                                                                        placeholder="e.g., 5-4"
                                                                        className="mt-1"
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}

                            <div className="flex justify-between">
                                <Button variant="outline" onClick={() => setActiveTab('rounds')}>
                                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                                </Button>
                                <Button 
                                    onClick={handleSubmit} 
                                    disabled={createSeasonMutation.isPending || !seasonData.year}
                                    className="bg-emerald-600 hover:bg-emerald-700"
                                >
                                    {createSeasonMutation.isPending ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</>
                                    ) : (
                                        <><Save className="w-4 h-4 mr-2" /> Create Season</>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}