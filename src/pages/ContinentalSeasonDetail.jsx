import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Plus, Trophy, ChevronRight, Star, Edit2, Trash2, Loader2, RefreshCw } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import AddMatchDialog from '@/components/continental/AddMatchDialog';
import BracketView from '@/components/continental/BracketView';
import SeasonNarratives from '@/components/continental/SeasonNarratives';
import AdminOnly from '@/components/common/AdminOnly';

const ROUND_ORDER = ['Group Stage', 'Round of 32', 'Round of 16', 'Quarter-final', 'Semi-final', 'Final'];

export default function ContinentalSeasonDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    const seasonId = urlParams.get('id');
    const queryClient = useQueryClient();
    
    const [isAddMatchOpen, setIsAddMatchOpen] = useState(false);
    const [editingMatch, setEditingMatch] = useState(null);

    const { data: season } = useQuery({
        queryKey: ['continentalSeason', seasonId],
        queryFn: async () => {
            const seasons = await base44.entities.ContinentalSeason.filter({ id: seasonId });
            return seasons[0];
        },
        enabled: !!seasonId,
    });

    const { data: competition } = useQuery({
        queryKey: ['competition', season?.competition_id],
        queryFn: async () => {
            const comps = await base44.entities.ContinentalCompetition.filter({ id: season.competition_id });
            return comps[0];
        },
        enabled: !!season?.competition_id,
    });

    const { data: matches = [] } = useQuery({
        queryKey: ['continentalMatches', seasonId],
        queryFn: () => base44.entities.ContinentalMatch.filter({ season_id: seasonId }),
        enabled: !!seasonId,
    });

    const { data: nations = [] } = useQuery({
        queryKey: ['nations'],
        queryFn: () => base44.entities.Nation.list('name'),
    });

    const { data: clubs = [] } = useQuery({
        queryKey: ['allClubs'],
        queryFn: () => base44.entities.Club.list('name'),
    });

    const { data: allMatches = [] } = useQuery({
        queryKey: ['allContinentalMatches'],
        queryFn: () => base44.entities.ContinentalMatch.list(),
    });

    const { data: allSeasons = [] } = useQuery({
        queryKey: ['allContinentalSeasons'],
        queryFn: () => base44.entities.ContinentalSeason.list(),
    });

    const deleteMatchMutation = useMutation({
        mutationFn: (id) => base44.entities.ContinentalMatch.delete(id),
        onSuccess: () => queryClient.invalidateQueries(['continentalMatches', seasonId]),
    });

    if (!season || !competition) {
        return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;
    }

    // Group matches by round
    const matchesByRound = matches.reduce((acc, match) => {
        if (!acc[match.round]) acc[match.round] = [];
        acc[match.round].push(match);
        return acc;
    }, {});

    // Sort rounds
    const sortedRounds = Object.keys(matchesByRound).sort((a, b) => {
        const idxA = ROUND_ORDER.indexOf(a);
        const idxB = ROUND_ORDER.indexOf(b);
        return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
    });

    const getNationFlag = (nationName) => {
        const nation = nations.find(n => n.name.toLowerCase() === nationName?.toLowerCase());
        return nation?.flag_url;
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Hero */}
            <div className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${competition.primary_color || '#1e40af'}, ${competition.secondary_color || '#fbbf24'})` }}>
                <div className="absolute inset-0 bg-black/20" />
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <nav className="flex items-center gap-2 text-sm text-white/70 mb-4 flex-wrap">
                        <Link to={createPageUrl('Home')} className="hover:text-white">Volaria</Link>
                        <ChevronRight className="w-4 h-4" />
                        <Link to={createPageUrl('ContinentalCompetitions')} className="hover:text-white">Continental Competitions</Link>
                        <ChevronRight className="w-4 h-4" />
                        <Link to={createPageUrl(`CompetitionDetail?id=${competition.id}`)} className="hover:text-white">{competition.short_name || competition.name}</Link>
                        <ChevronRight className="w-4 h-4" />
                        <span className="text-white">{season.year}</span>
                    </nav>
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 md:w-20 md:h-20 bg-white/20 rounded-xl flex items-center justify-center">
                            {competition.tier === 1 ? <Star className="w-10 h-10 text-white" /> : <Trophy className="w-10 h-10 text-white" />}
                        </div>
                        <div className="flex-1">
                            <h1 className="text-2xl md:text-4xl font-bold text-white">{competition.name} {season.year}</h1>
                            {season.champion_name && (
                                <p className="mt-2 text-white/90 flex items-center gap-2">
                                    <Trophy className="w-5 h-5 text-amber-300" />
                                    <span className="font-semibold">{season.champion_name}</span>
                                    {season.champion_nation && (
                                        <>
                                            {getNationFlag(season.champion_nation) && (
                                                <img src={getNationFlag(season.champion_nation)} alt="" className="w-5 h-3 object-contain" />
                                            )}
                                            <span className="text-white/70">({season.champion_nation})</span>
                                        </>
                                    )}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Season Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-slate-800">{matches.length}</div>
                            <div className="text-xs text-slate-500">Total Matches</div>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-slate-800">{Object.keys(matchesByRound).length}</div>
                            <div className="text-xs text-slate-500">Rounds</div>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-slate-800">
                                {new Set([...matches.map(m => m.home_club_name), ...matches.map(m => m.away_club_name)]).size}
                            </div>
                            <div className="text-xs text-slate-500">Clubs Participated</div>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-slate-800">
                                {new Set([...matches.map(m => m.home_club_nation), ...matches.map(m => m.away_club_nation)].filter(Boolean)).size}
                            </div>
                            <div className="text-xs text-slate-500">Nations Represented</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Season Narratives */}
                <SeasonNarratives 
                    matches={matches}
                    season={season}
                    allMatches={allMatches}
                    allSeasons={allSeasons}
                    clubs={clubs}
                />

                {/* Final Info */}
                {season.champion_name && (
                    <Card className="border-0 shadow-sm mb-8 bg-gradient-to-r from-amber-50 to-yellow-50">
                        <CardContent className="p-6">
                            <div className="flex flex-col md:flex-row items-center justify-center gap-6">
                                <div className="text-center">
                                    <div className="text-sm text-slate-500 mb-1">Champion</div>
                                    <div className="flex items-center gap-2">
                                        {getNationFlag(season.champion_nation) && (
                                            <img src={getNationFlag(season.champion_nation)} alt="" className="w-6 h-4 object-contain" />
                                        )}
                                        {(() => {
                                            const champClub = clubs.find(c => c.name === season.champion_name);
                                            return champClub ? (
                                                <Link to={createPageUrl(`ClubDetail?id=${champClub.id}`)} className="text-xl font-bold text-emerald-700 hover:underline">{season.champion_name}</Link>
                                            ) : (
                                                <span className="text-xl font-bold text-emerald-700">{season.champion_name}</span>
                                            );
                                        })()}
                                    </div>
                                </div>
                                {season.final_score && (
                                    <div className="text-3xl font-bold text-slate-700">{season.final_score}</div>
                                )}
                                {season.runner_up && (
                                    <div className="text-center">
                                        <div className="text-sm text-slate-500 mb-1">Runner-up</div>
                                        <div className="flex items-center gap-2">
                                            {getNationFlag(season.runner_up_nation) && (
                                                <img src={getNationFlag(season.runner_up_nation)} alt="" className="w-6 h-4 object-contain" />
                                            )}
                                            {(() => {
                                                const runnerClub = clubs.find(c => c.name === season.runner_up);
                                                return runnerClub ? (
                                                    <Link to={createPageUrl(`ClubDetail?id=${runnerClub.id}`)} className="text-xl font-bold text-slate-600 hover:underline">{season.runner_up}</Link>
                                                ) : (
                                                    <span className="text-xl font-bold text-slate-600">{season.runner_up}</span>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                )}
                            </div>
                            {season.final_venue && (
                                <div className="text-center mt-4 text-sm text-slate-500">
                                    Final played at {season.final_venue}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                <Tabs defaultValue="bracket" className="space-y-6">
                    <div className="flex items-center justify-between">
                        <TabsList>
                            <TabsTrigger value="bracket">Bracket View</TabsTrigger>
                            <TabsTrigger value="rounds">By Round</TabsTrigger>
                        </TabsList>
                        <AdminOnly>
                            <div className="flex gap-2">
                                <Link to={createPageUrl(`UpdateContinentalStats?season=${seasonId}`)}>
                                    <Button variant="outline">
                                        <RefreshCw className="w-4 h-4 mr-2" /> Sync Club Stats
                                    </Button>
                                </Link>
                                <Button onClick={() => setIsAddMatchOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
                                    <Plus className="w-4 h-4 mr-2" /> Add Match
                                </Button>
                            </div>
                        </AdminOnly>
                    </div>

                    <TabsContent value="bracket">
                        <BracketView 
                            matches={matches} 
                            getNationFlag={getNationFlag}
                            clubs={clubs}
                            onEdit={setEditingMatch}
                        />
                    </TabsContent>

                    <TabsContent value="rounds">
                        {sortedRounds.length === 0 ? (
                            <Card className="border-dashed border-2 border-slate-300">
                                <CardContent className="flex flex-col items-center justify-center py-12">
                                    <Trophy className="w-12 h-12 text-slate-300 mb-4" />
                                    <h3 className="text-lg font-semibold text-slate-700 mb-2">No Matches Yet</h3>
                                    <p className="text-slate-500">Add matches to build the competition bracket</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-6">
                                {sortedRounds.map(round => (
                                    <Card key={round} className="border-0 shadow-sm">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-lg">{round}</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-3">
                                                {matchesByRound[round]
                                                    .sort((a, b) => (a.match_number || 0) - (b.match_number || 0))
                                                    .map(match => (
                                                        <div key={match.id} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg group">
                                                            <div className="flex-1 flex items-center gap-3">
                                                                {getNationFlag(match.home_club_nation) && (
                                                                    <img src={getNationFlag(match.home_club_nation)} alt="" className="w-5 h-3 object-contain" />
                                                                )}
                                                                <span className={`font-medium ${match.winner === match.home_club_name ? 'text-emerald-700' : ''}`}>
                                                                    {match.home_club_name}
                                                                </span>
                                                            </div>
                                                            <div className="text-center min-w-[100px]">
                                                                {match.is_single_leg ? (
                                                                    <span className="font-bold">
                                                                        {match.home_score_leg1 ?? '-'} - {match.away_score_leg1 ?? '-'}
                                                                    </span>
                                                                ) : (
                                                                    <div className="text-sm">
                                                                        <div>{match.home_score_leg1 ?? '-'} - {match.away_score_leg1 ?? '-'}</div>
                                                                        <div>{match.away_score_leg2 ?? '-'} - {match.home_score_leg2 ?? '-'}</div>
                                                                        <div className="font-bold text-xs">({match.home_aggregate ?? '-'} - {match.away_aggregate ?? '-'})</div>
                                                                    </div>
                                                                )}
                                                                {match.penalties && <div className="text-xs text-slate-500">(pen: {match.penalties})</div>}
                                                            </div>
                                                            <div className="flex-1 flex items-center justify-end gap-3">
                                                                <span className={`font-medium ${match.winner === match.away_club_name ? 'text-emerald-700' : ''}`}>
                                                                    {match.away_club_name}
                                                                </span>
                                                                {getNationFlag(match.away_club_nation) && (
                                                                    <img src={getNationFlag(match.away_club_nation)} alt="" className="w-5 h-3 object-contain" />
                                                                )}
                                                            </div>
                                                            <AdminOnly>
                                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <Button variant="ghost" size="sm" onClick={() => setEditingMatch(match)}>
                                                                        <Edit2 className="w-3 h-3" />
                                                                    </Button>
                                                                    <AlertDialog>
                                                                        <AlertDialogTrigger asChild>
                                                                            <Button variant="ghost" size="sm" className="text-red-500">
                                                                                <Trash2 className="w-3 h-3" />
                                                                            </Button>
                                                                        </AlertDialogTrigger>
                                                                        <AlertDialogContent>
                                                                            <AlertDialogHeader>
                                                                                <AlertDialogTitle>Delete this match?</AlertDialogTitle>
                                                                            </AlertDialogHeader>
                                                                            <AlertDialogFooter>
                                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                                <AlertDialogAction onClick={() => deleteMatchMutation.mutate(match.id)} className="bg-red-600">Delete</AlertDialogAction>
                                                                            </AlertDialogFooter>
                                                                        </AlertDialogContent>
                                                                    </AlertDialog>
                                                                </div>
                                                            </AdminOnly>
                                                        </div>
                                                    ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>

                {/* Season Notes */}
                {season.notes && (
                    <Card className="border-0 shadow-sm mt-8">
                        <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
                        <CardContent><p className="text-slate-600 whitespace-pre-line">{season.notes}</p></CardContent>
                    </Card>
                )}
            </div>

            <AddMatchDialog
                isOpen={isAddMatchOpen || !!editingMatch}
                onClose={() => { setIsAddMatchOpen(false); setEditingMatch(null); }}
                seasonId={seasonId}
                editingMatch={editingMatch}
                nations={nations}
                clubs={clubs}
            />
        </div>
    );
}