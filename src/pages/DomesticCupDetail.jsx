import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Plus, Trophy, Edit2, Trash2, ChevronRight, Calendar, Users, RefreshCw } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import DomesticCupNarratives from '@/components/cups/DomesticCupNarratives';
import SyncCupStatsButton from '@/components/common/SyncCupStats';
import CupHistory from '@/components/cups/CupHistory';
import AdminOnly from '@/components/common/AdminOnly';

export default function DomesticCupDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    const cupId = urlParams.get('id');
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [editingSeason, setEditingSeason] = useState(null);
    const [seasonFormData, setSeasonFormData] = useState({});

    const { data: cup } = useQuery({
        queryKey: ['domesticCup', cupId],
        queryFn: async () => {
            const cups = await base44.entities.DomesticCup.filter({ id: cupId });
            return cups[0];
        },
        enabled: !!cupId,
    });

    const { data: nation } = useQuery({
        queryKey: ['nation', cup?.nation_id],
        queryFn: async () => {
            const nations = await base44.entities.Nation.filter({ id: cup.nation_id });
            return nations[0];
        },
        enabled: !!cup?.nation_id,
    });

    const { data: seasons = [] } = useQuery({
        queryKey: ['cupSeasons', cupId],
        queryFn: () => base44.entities.DomesticCupSeason.filter({ cup_id: cupId }, '-year'),
    });

    const { data: clubs = [] } = useQuery({
        queryKey: ['nationClubs', cup?.nation_id],
        queryFn: () => base44.entities.Club.filter({ nation_id: cup.nation_id }),
        enabled: !!cup?.nation_id,
    });

    const deleteSeasonMutation = useMutation({
        mutationFn: async (seasonId) => {
            const matches = await base44.entities.DomesticCupMatch.filter({ season_id: seasonId });
            for (const m of matches) {
                await base44.entities.DomesticCupMatch.delete(m.id);
            }
            await base44.entities.DomesticCupSeason.delete(seasonId);
        },
        onSuccess: () => queryClient.invalidateQueries(['cupSeasons']),
    });

    const updateSeasonMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.DomesticCupSeason.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['cupSeasons']);
            setEditingSeason(null);
        },
    });

    const getClubById = (id) => clubs.find(c => c.id === id);

    if (!cup) {
        return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full" /></div>;
    }

    // Calculate title counts for narratives
    const titleCounts = {};
    seasons.forEach(s => {
        if (s.champion_name) {
            if (!titleCounts[s.champion_name]) titleCounts[s.champion_name] = 0;
            titleCounts[s.champion_name]++;
        }
    });
    const sortedByTitles = Object.entries(titleCounts).sort((a, b) => b[1] - a[1]);

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Hero */}
            <div className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${cup.primary_color || '#1e40af'}, ${cup.secondary_color || '#fbbf24'})` }}>
                <div className="absolute inset-0 bg-black/20" />
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <nav className="flex items-center gap-2 text-sm text-white/70 mb-4 flex-wrap">
                        <Link to={createPageUrl('Home')} className="hover:text-white">Volaria</Link>
                        <ChevronRight className="w-4 h-4" />
                        <Link to={createPageUrl('Nations')} className="hover:text-white">Nations</Link>
                        {nation && (
                            <>
                                <ChevronRight className="w-4 h-4" />
                                <Link to={createPageUrl(`NationDetail?id=${nation.id}`)} className="hover:text-white">{nation.name}</Link>
                            </>
                        )}
                        <ChevronRight className="w-4 h-4" />
                        <span className="text-white">{cup.short_name || cup.name}</span>
                    </nav>
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 md:w-28 md:h-28 bg-white/20 rounded-2xl flex items-center justify-center">
                            <Trophy className="w-12 h-12 text-white" />
                        </div>
                        <div className="flex-1">
                            <h1 className="text-3xl md:text-5xl font-bold text-white">{cup.name}</h1>
                            {cup.description && <p className="mt-2 text-white/80 max-w-2xl">{cup.description}</p>}
                        </div>
                        <AdminOnly>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="outline" className="border-red-400/50 text-red-300 hover:bg-red-500/20"><Trash2 className="w-4 h-4" /></Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>Delete {cup.name}?</AlertDialogTitle></AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => {
                                            base44.entities.DomesticCup.delete(cupId).then(() => {
                                                navigate(createPageUrl(`DomesticCups?nation_id=${cup.nation_id}`));
                                            });
                                        }} className="bg-red-600">Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </AdminOnly>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {cup.founded_year && (
                        <Card className="border-0 shadow-sm">
                            <CardContent className="p-4 text-center">
                                <Calendar className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                                <div className="text-2xl font-bold">{cup.founded_year}</div>
                                <div className="text-xs text-slate-500">Founded</div>
                            </CardContent>
                        </Card>
                    )}
                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-4 text-center">
                            <Trophy className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                            <div className="text-2xl font-bold">{seasons.length}</div>
                            <div className="text-xs text-slate-500">Editions</div>
                        </CardContent>
                    </Card>
                    {cup.eligible_tiers && (
                        <Card className="border-0 shadow-sm">
                            <CardContent className="p-4 text-center">
                                <Users className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                                <div className="text-lg font-bold">Tiers {cup.eligible_tiers}</div>
                                <div className="text-xs text-slate-500">Eligible</div>
                            </CardContent>
                        </Card>
                    )}
                    {sortedByTitles[0] && (
                        <Card className="border-0 shadow-sm">
                            <CardContent className="p-4 text-center">
                                <div className="text-lg font-bold text-emerald-600 truncate">{sortedByTitles[0][0]}</div>
                                <div className="text-xs text-slate-500">{sortedByTitles[0][1]} titles - Most Successful</div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Cup History Timeline */}
                <CupHistory cup={cup} seasons={seasons} clubs={clubs} />

                {/* Cup Narratives */}
                <DomesticCupNarratives cup={cup} seasons={seasons} clubs={clubs} />

                {/* History */}
                {cup.history && (
                    <Card className="border-0 shadow-sm mb-8">
                        <CardHeader><CardTitle>Cup History</CardTitle></CardHeader>
                        <CardContent><p className="text-slate-600 whitespace-pre-line">{cup.history}</p></CardContent>
                    </Card>
                )}

                {/* Roll of Honour */}
                <Card className="border-0 shadow-sm mb-8">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Roll of Honour</CardTitle>
                            <div className="mt-2">
                                <SyncCupStatsButton 
                                    nationId={cup?.nation_id} 
                                    onComplete={() => queryClient.invalidateQueries(['nationClubs'])}
                                />
                            </div>
                        </div>
                        <AdminOnly>
                            <Link to={createPageUrl(`AddDomesticCupSeason?cup_id=${cupId}`)}>
                                <Button className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-2" /> Add Season</Button>
                            </Link>
                        </AdminOnly>
                    </CardHeader>
                    <CardContent>
                        {seasons.length === 0 ? (
                            <div className="text-center py-12 text-slate-500">
                                <Trophy className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                                <p className="mb-2">No seasons recorded yet.</p>
                                <p className="text-sm">Add a season to start building the cup's history.</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Year</TableHead>
                                        <TableHead>Champion</TableHead>
                                        <TableHead>Runner-up</TableHead>
                                        <TableHead className="hidden md:table-cell">Score</TableHead>
                                        <TableHead className="hidden lg:table-cell">Teams</TableHead>
                                        <TableHead className="w-32"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {seasons.map(season => {
                                        const champion = getClubById(season.champion_id);
                                        const runnerUp = getClubById(season.runner_up_id);
                                        return (
                                            <TableRow key={season.id}>
                                                <TableCell className="font-medium">
                                                    <Link to={createPageUrl(`DomesticCupSeasonDetail?id=${season.id}`)} className="hover:text-emerald-600 hover:underline">
                                                        {season.year}
                                                    </Link>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        {champion?.logo_url && <img src={champion.logo_url} alt="" className="w-5 h-5 object-contain" />}
                                                        {champion ? (
                                                            <Link to={createPageUrl(`ClubDetail?id=${champion.id}`)} className="font-semibold text-emerald-600 hover:underline">
                                                                {season.champion_name}
                                                            </Link>
                                                        ) : (
                                                            <span className="font-semibold text-emerald-600">{season.champion_name}</span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        {runnerUp?.logo_url && <img src={runnerUp.logo_url} alt="" className="w-5 h-5 object-contain" />}
                                                        {runnerUp ? (
                                                            <Link to={createPageUrl(`ClubDetail?id=${runnerUp.id}`)} className="hover:underline">
                                                                {season.runner_up}
                                                            </Link>
                                                        ) : (
                                                            <span>{season.runner_up}</span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="hidden md:table-cell">{season.final_score}</TableCell>
                                                <TableCell className="hidden lg:table-cell">{season.number_of_teams}</TableCell>
                                                <TableCell>
                                                    <div className="flex gap-1">
                                                        <Link to={createPageUrl(`DomesticCupSeasonDetail?id=${season.id}`)}>
                                                            <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700">Bracket</Button>
                                                        </Link>
                                                        <AdminOnly>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                                                                setSeasonFormData(season);
                                                                setEditingSeason(season);
                                                            }}>
                                                                <Edit2 className="w-3 h-3" />
                                                            </Button>
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500"><Trash2 className="w-3 h-3" /></Button>
                                                                </AlertDialogTrigger>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader><AlertDialogTitle>Delete {season.year}?</AlertDialogTitle></AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                        <AlertDialogAction onClick={() => deleteSeasonMutation.mutate(season.id)} className="bg-red-600">Delete</AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        </AdminOnly>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                {/* Most Titles */}
                {sortedByTitles.length > 0 && (
                    <Card className="border-0 shadow-sm">
                        <CardHeader><CardTitle>All-Time Winners</CardTitle></CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12">#</TableHead>
                                        <TableHead>Club</TableHead>
                                        <TableHead className="text-center">Titles</TableHead>
                                        <TableHead className="hidden md:table-cell">Years</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sortedByTitles.map(([clubName, count], idx) => {
                                        const club = clubs.find(c => c.name === clubName);
                                        const years = seasons.filter(s => s.champion_name === clubName).map(s => s.year).sort();
                                        return (
                                            <TableRow key={clubName}>
                                                <TableCell className="font-bold text-slate-400">{idx + 1}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        {idx === 0 && <Trophy className="w-4 h-4 text-amber-500" />}
                                                        {club?.logo_url && <img src={club.logo_url} alt="" className="w-5 h-5 object-contain" />}
                                                        {club ? (
                                                            <Link to={createPageUrl(`ClubDetail?id=${club.id}`)} className="font-medium hover:text-emerald-600 hover:underline">
                                                                {clubName}
                                                            </Link>
                                                        ) : (
                                                            <span className="font-medium">{clubName}</span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center font-bold text-emerald-600">{count}</TableCell>
                                                <TableCell className="hidden md:table-cell text-slate-500 text-sm">{years.join(', ')}</TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Edit Season Dialog */}
            <Dialog open={!!editingSeason} onOpenChange={(open) => { if (!open) setEditingSeason(null); }}>
                <DialogContent className="max-w-xl">
                    <DialogHeader><DialogTitle>Edit Season</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Year</Label>
                                <Input value={seasonFormData.year || ''} onChange={(e) => setSeasonFormData({...seasonFormData, year: e.target.value})} className="mt-1" />
                            </div>
                            <div>
                                <Label>Number of Teams</Label>
                                <Input type="number" value={seasonFormData.number_of_teams || ''} onChange={(e) => setSeasonFormData({...seasonFormData, number_of_teams: parseInt(e.target.value) || 0})} className="mt-1" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Champion</Label>
                                <Input value={seasonFormData.champion_name || ''} onChange={(e) => setSeasonFormData({...seasonFormData, champion_name: e.target.value})} className="mt-1" />
                            </div>
                            <div>
                                <Label>Runner-up</Label>
                                <Input value={seasonFormData.runner_up || ''} onChange={(e) => setSeasonFormData({...seasonFormData, runner_up: e.target.value})} className="mt-1" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Final Score</Label>
                                <Input value={seasonFormData.final_score || ''} onChange={(e) => setSeasonFormData({...seasonFormData, final_score: e.target.value})} className="mt-1" />
                            </div>
                            <div>
                                <Label>Final Venue</Label>
                                <Input value={seasonFormData.final_venue || ''} onChange={(e) => setSeasonFormData({...seasonFormData, final_venue: e.target.value})} className="mt-1" />
                            </div>
                        </div>
                        <div>
                            <Label>Notes</Label>
                            <Textarea value={seasonFormData.notes || ''} onChange={(e) => setSeasonFormData({...seasonFormData, notes: e.target.value})} rows={3} className="mt-1" />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setEditingSeason(null)}>Cancel</Button>
                            <Button onClick={() => updateSeasonMutation.mutate({ id: editingSeason.id, data: seasonFormData })} className="bg-emerald-600">Save</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}