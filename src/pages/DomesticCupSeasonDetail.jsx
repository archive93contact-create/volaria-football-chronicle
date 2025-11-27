import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Trophy, ChevronRight, Plus, Edit2, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ROUND_OPTIONS = ['First Round', 'Second Round', 'Third Round', 'Round of 64', 'Round of 32', 'Round of 16', 'Quarter-final', 'Semi-final', 'Final'];

export default function DomesticCupSeasonDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    const seasonId = urlParams.get('id');
    const queryClient = useQueryClient();

    const [isAddMatchOpen, setIsAddMatchOpen] = useState(false);
    const [editingMatch, setEditingMatch] = useState(null);
    const [matchData, setMatchData] = useState({
        round: '', match_number: 1, home_club_name: '', away_club_name: '',
        home_score: '', away_score: '', winner: '', extra_time: false, penalties: '', venue: '', notes: ''
    });

    const { data: season } = useQuery({
        queryKey: ['cupSeason', seasonId],
        queryFn: async () => {
            const seasons = await base44.entities.DomesticCupSeason.filter({ id: seasonId });
            return seasons[0];
        },
        enabled: !!seasonId,
    });

    const { data: cup } = useQuery({
        queryKey: ['cup', season?.cup_id],
        queryFn: async () => {
            const cups = await base44.entities.DomesticCup.filter({ id: season.cup_id });
            return cups[0];
        },
        enabled: !!season?.cup_id,
    });

    const { data: nation } = useQuery({
        queryKey: ['cupNation', cup?.nation_id],
        queryFn: async () => {
            const nations = await base44.entities.Nation.filter({ id: cup.nation_id });
            return nations[0];
        },
        enabled: !!cup?.nation_id,
    });

    const { data: matches = [] } = useQuery({
        queryKey: ['cupMatches', seasonId],
        queryFn: () => base44.entities.DomesticCupMatch.filter({ season_id: seasonId }),
    });

    const { data: clubs = [] } = useQuery({
        queryKey: ['nationClubs', cup?.nation_id],
        queryFn: () => base44.entities.Club.filter({ nation_id: cup.nation_id }),
        enabled: !!cup?.nation_id,
    });

    const createMatchMutation = useMutation({
        mutationFn: (data) => base44.entities.DomesticCupMatch.create({ ...data, season_id: seasonId }),
        onSuccess: () => {
            queryClient.invalidateQueries(['cupMatches']);
            setIsAddMatchOpen(false);
            resetForm();
        },
    });

    const updateMatchMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.DomesticCupMatch.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['cupMatches']);
            setEditingMatch(null);
            resetForm();
        },
    });

    const deleteMatchMutation = useMutation({
        mutationFn: (id) => base44.entities.DomesticCupMatch.delete(id),
        onSuccess: () => queryClient.invalidateQueries(['cupMatches']),
    });

    const resetForm = () => {
        setMatchData({
            round: '', match_number: 1, home_club_name: '', away_club_name: '',
            home_score: '', away_score: '', winner: '', extra_time: false, penalties: '', venue: '', notes: ''
        });
    };

    const openEdit = (match) => {
        setMatchData(match);
        setEditingMatch(match);
    };

    const handleSubmit = () => {
        const data = {
            ...matchData,
            match_number: parseInt(matchData.match_number) || 1,
            home_score: matchData.home_score !== '' ? parseInt(matchData.home_score) : null,
            away_score: matchData.away_score !== '' ? parseInt(matchData.away_score) : null,
        };

        // Auto-determine winner if scores are set
        if (data.home_score !== null && data.away_score !== null && !data.winner) {
            if (data.home_score > data.away_score) {
                data.winner = data.home_club_name;
            } else if (data.away_score > data.home_score) {
                data.winner = data.away_club_name;
            }
        }

        if (editingMatch) {
            updateMatchMutation.mutate({ id: editingMatch.id, data });
        } else {
            createMatchMutation.mutate(data);
        }
    };

    const getClubByName = (name) => {
        if (!name) return null;
        return clubs.find(c => c.name?.toLowerCase().trim() === name?.toLowerCase().trim());
    };

    if (!season || !cup) {
        return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full" /></div>;
    }

    // Group matches by round
    const matchesByRound = matches.reduce((acc, m) => {
        if (!acc[m.round]) acc[m.round] = [];
        acc[m.round].push(m);
        return acc;
    }, {});

    const sortedRounds = ROUND_OPTIONS.filter(r => matchesByRound[r]);

    const ClubDisplay = ({ name, isWinner, score }) => {
        const club = getClubByName(name);
        return (
            <div className={`flex items-center gap-2 p-2 ${isWinner ? 'bg-emerald-50' : ''}`}>
                {club?.logo_url && <img src={club.logo_url} alt="" className="w-6 h-6 object-contain" />}
                {club ? (
                    <Link to={createPageUrl(`ClubDetail?id=${club.id}`)} className={`flex-1 text-sm hover:underline ${isWinner ? 'font-bold text-emerald-700' : ''}`}>
                        {name}
                    </Link>
                ) : (
                    <span className={`flex-1 text-sm ${isWinner ? 'font-bold text-emerald-700' : ''}`}>{name}</span>
                )}
                <span className={`text-sm font-mono ${isWinner ? 'font-bold' : ''}`}>{score ?? '-'}</span>
            </div>
        );
    };

    const formContent = (
        <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label>Round *</Label>
                    <Select value={matchData.round} onValueChange={(v) => setMatchData({...matchData, round: v})}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select round" /></SelectTrigger>
                        <SelectContent>
                            {ROUND_OPTIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label>Match #</Label>
                    <Input type="number" value={matchData.match_number} onChange={(e) => setMatchData({...matchData, match_number: e.target.value})} className="mt-1" />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label>Home Club *</Label>
                    <Input value={matchData.home_club_name} onChange={(e) => setMatchData({...matchData, home_club_name: e.target.value})} className="mt-1" />
                </div>
                <div>
                    <Label>Away Club *</Label>
                    <Input value={matchData.away_club_name} onChange={(e) => setMatchData({...matchData, away_club_name: e.target.value})} className="mt-1" />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label>Home Score</Label>
                    <Input type="number" value={matchData.home_score ?? ''} onChange={(e) => setMatchData({...matchData, home_score: e.target.value})} className="mt-1" />
                </div>
                <div>
                    <Label>Away Score</Label>
                    <Input type="number" value={matchData.away_score ?? ''} onChange={(e) => setMatchData({...matchData, away_score: e.target.value})} className="mt-1" />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label>Winner (if not clear from score)</Label>
                    <Select value={matchData.winner || ''} onValueChange={(v) => setMatchData({...matchData, winner: v})}>
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Auto from score" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value={null}>Auto from score</SelectItem>
                            <SelectItem value={matchData.home_club_name}>{matchData.home_club_name || 'Home'}</SelectItem>
                            <SelectItem value={matchData.away_club_name}>{matchData.away_club_name || 'Away'}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label>Penalties (if applicable)</Label>
                    <Input value={matchData.penalties || ''} onChange={(e) => setMatchData({...matchData, penalties: e.target.value})} placeholder="e.g., 4-3" className="mt-1" />
                </div>
            </div>
            <div>
                <Label>Venue</Label>
                <Input value={matchData.venue || ''} onChange={(e) => setMatchData({...matchData, venue: e.target.value})} className="mt-1" />
            </div>
            <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => { setIsAddMatchOpen(false); setEditingMatch(null); resetForm(); }}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={!matchData.round || !matchData.home_club_name || !matchData.away_club_name} className="bg-emerald-600">
                    {editingMatch ? 'Save' : 'Add Match'}
                </Button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Hero */}
            <div className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${cup.primary_color || '#1e40af'}, ${cup.secondary_color || '#fbbf24'})` }}>
                <div className="absolute inset-0 bg-black/20" />
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <nav className="flex items-center gap-2 text-sm text-white/70 mb-4 flex-wrap">
                        <Link to={createPageUrl('Home')} className="hover:text-white">Volaria</Link>
                        <ChevronRight className="w-4 h-4" />
                        {nation && <Link to={createPageUrl(`NationDetail?id=${nation.id}`)} className="hover:text-white">{nation.name}</Link>}
                        <ChevronRight className="w-4 h-4" />
                        <Link to={createPageUrl(`DomesticCupDetail?id=${cup.id}`)} className="hover:text-white">{cup.name}</Link>
                        <ChevronRight className="w-4 h-4" />
                        <span className="text-white">{season.year}</span>
                    </nav>
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center">
                            <Trophy className="w-10 h-10 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold text-white">{cup.name} {season.year}</h1>
                            <div className="flex items-center gap-4 mt-2 text-white/80">
                                {season.number_of_teams && <span>{season.number_of_teams} teams</span>}
                                {season.champion_name && <span className="font-semibold">Champion: {season.champion_name}</span>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Final Info */}
                {season.champion_name && (
                    <Card className="border-0 shadow-sm mb-8 bg-gradient-to-r from-amber-50 to-yellow-50">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <Trophy className="w-12 h-12 text-amber-500" />
                                <div>
                                    <h2 className="text-2xl font-bold text-amber-800">{season.champion_name}</h2>
                                    <p className="text-amber-700">
                                        {season.final_score && `${season.final_score} vs `}
                                        {season.runner_up}
                                        {season.final_venue && ` • ${season.final_venue}`}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Matches */}
                <Card className="border-0 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Matches</CardTitle>
                        <Dialog open={isAddMatchOpen} onOpenChange={setIsAddMatchOpen}>
                            <DialogTrigger asChild>
                                <Button className="bg-emerald-600"><Plus className="w-4 h-4 mr-2" /> Add Match</Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-xl">
                                <DialogHeader><DialogTitle>Add Match</DialogTitle></DialogHeader>
                                {formContent}
                            </DialogContent>
                        </Dialog>
                    </CardHeader>
                    <CardContent>
                        {matches.length === 0 ? (
                            <div className="text-center py-12 text-slate-500">
                                <Trophy className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                                <p>No matches added yet</p>
                            </div>
                        ) : (
                            <Tabs defaultValue={sortedRounds[sortedRounds.length - 1] || sortedRounds[0]}>
                                <TabsList className="mb-4 flex-wrap h-auto">
                                    {sortedRounds.map(r => (
                                        <TabsTrigger key={r} value={r}>{r}</TabsTrigger>
                                    ))}
                                </TabsList>
                                {sortedRounds.map(round => (
                                    <TabsContent key={round} value={round}>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {matchesByRound[round]?.sort((a, b) => a.match_number - b.match_number).map(match => (
                                                <div key={match.id} className={`border rounded-lg overflow-hidden ${round === 'Final' ? 'ring-2 ring-amber-400' : ''}`}>
                                                    <div className="bg-slate-50 px-3 py-1 flex items-center justify-between">
                                                        <span className="text-xs text-slate-500">Match {match.match_number}</span>
                                                        <div className="flex gap-1">
                                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(match)}>
                                                                <Edit2 className="w-3 h-3" />
                                                            </Button>
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild>
                                                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500"><Trash2 className="w-3 h-3" /></Button>
                                                                </AlertDialogTrigger>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader><AlertDialogTitle>Delete match?</AlertDialogTitle></AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                        <AlertDialogAction onClick={() => deleteMatchMutation.mutate(match.id)} className="bg-red-600">Delete</AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        </div>
                                                    </div>
                                                    <ClubDisplay name={match.home_club_name} isWinner={match.winner === match.home_club_name} score={match.home_score} />
                                                    <div className="border-t" />
                                                    <ClubDisplay name={match.away_club_name} isWinner={match.winner === match.away_club_name} score={match.away_score} />
                                                    {match.penalties && (
                                                        <div className="bg-blue-50 px-3 py-1 text-xs text-blue-600 text-center">Penalties: {match.penalties}</div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </TabsContent>
                                ))}
                            </Tabs>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Edit Dialog */}
            <Dialog open={!!editingMatch} onOpenChange={(open) => { if (!open) { setEditingMatch(null); resetForm(); } }}>
                <DialogContent className="max-w-xl">
                    <DialogHeader><DialogTitle>Edit Match</DialogTitle></DialogHeader>
                    {formContent}
                </DialogContent>
            </Dialog>
        </div>
    );
}