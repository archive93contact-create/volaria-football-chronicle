import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Save, ArrowLeft, Loader2, Trophy, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import PageHeader from '@/components/common/PageHeader';

export default function EditSeason() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const urlParams = new URLSearchParams(window.location.search);
    const seasonId = urlParams.get('id');

    const { data: season, isLoading: seasonLoading } = useQuery({
        queryKey: ['season', seasonId],
        queryFn: async () => {
            const seasons = await base44.entities.Season.filter({ id: seasonId });
            return seasons[0];
        },
        enabled: !!seasonId,
    });

    const { data: league } = useQuery({
        queryKey: ['league', season?.league_id],
        queryFn: async () => {
            const leagues = await base44.entities.League.filter({ id: season.league_id });
            return leagues[0];
        },
        enabled: !!season?.league_id,
    });

    const { data: leagueTableData = [] } = useQuery({
        queryKey: ['seasonTable', seasonId],
        queryFn: () => base44.entities.LeagueTable.filter({ season_id: seasonId }, 'position'),
        enabled: !!seasonId,
    });

    const [seasonData, setSeasonData] = useState({});
    const [tableRows, setTableRows] = useState([]);

    useEffect(() => {
        if (season) {
            setSeasonData({
                year: season.year || '',
                number_of_teams: season.number_of_teams || 18,
                top_scorer: season.top_scorer || '',
                notes: season.notes || '',
                champion_color: season.champion_color || '#fef3c7',
                promotion_color: season.promotion_color || '#d1fae5',
                relegation_color: season.relegation_color || '#fee2e2',
                promotion_spots: season.promotion_spots || 2,
                relegation_spots: season.relegation_spots || 3
            });
        }
    }, [season]);

    useEffect(() => {
        if (leagueTableData.length > 0) {
            setTableRows(leagueTableData.map(row => ({
                id: row.id,
                position: row.position,
                club_name: row.club_name,
                club_id: row.club_id,
                played: row.played || 0,
                won: row.won || 0,
                drawn: row.drawn || 0,
                lost: row.lost || 0,
                goals_for: row.goals_for || 0,
                goals_against: row.goals_against || 0,
                goal_difference: row.goal_difference || 0,
                points: row.points || 0,
                status: row.status || '',
                highlight_color: row.highlight_color || ''
            })));
        }
    }, [leagueTableData]);

    const updateRow = (index, field, value) => {
        const updated = [...tableRows];
        updated[index][field] = field === 'club_name' || field === 'status' || field === 'highlight_color' 
            ? value 
            : parseInt(value) || 0;
        
        if (['goals_for', 'goals_against'].includes(field)) {
            updated[index].goal_difference = updated[index].goals_for - updated[index].goals_against;
        }
        if (['won', 'drawn', 'lost'].includes(field)) {
            updated[index].played = updated[index].won + updated[index].drawn + updated[index].lost;
        }
        setTableRows(updated);
    };

    const setRowStatus = (index, status) => {
        const updated = [...tableRows];
        updated[index].status = status;
        if (status === 'champion') updated[index].highlight_color = seasonData.champion_color;
        else if (status === 'promoted') updated[index].highlight_color = seasonData.promotion_color;
        else if (status === 'relegated') updated[index].highlight_color = seasonData.relegation_color;
        else updated[index].highlight_color = '';
        setTableRows(updated);
    };

    const updateSeasonMutation = useMutation({
        mutationFn: async (data) => {
            await base44.entities.Season.update(seasonId, {
                year: data.year,
                number_of_teams: data.number_of_teams,
                champion_name: tableRows.find(r => r.status === 'champion')?.club_name || '',
                runner_up: tableRows.find(r => r.position === 2)?.club_name || '',
                top_scorer: data.top_scorer,
                promoted_teams: tableRows.filter(r => r.status === 'promoted').map(r => r.club_name).join(', '),
                relegated_teams: tableRows.filter(r => r.status === 'relegated').map(r => r.club_name).join(', '),
                champion_color: data.champion_color,
                promotion_color: data.promotion_color,
                relegation_color: data.relegation_color,
                promotion_spots: data.promotion_spots,
                relegation_spots: data.relegation_spots,
                notes: data.notes
            });

            // Update each table row
            for (const row of tableRows) {
                if (row.id) {
                    await base44.entities.LeagueTable.update(row.id, {
                        club_name: row.club_name,
                        played: row.played,
                        won: row.won,
                        drawn: row.drawn,
                        lost: row.lost,
                        goals_for: row.goals_for,
                        goals_against: row.goals_against,
                        goal_difference: row.goal_difference,
                        points: row.points,
                        status: row.status,
                        highlight_color: row.highlight_color
                    });
                }
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['leagueSeasons']);
            queryClient.invalidateQueries(['leagueTables']);
            queryClient.invalidateQueries(['seasonTable']);
            navigate(createPageUrl(`LeagueDetail?id=${season.league_id}`));
        },
    });

    const deleteSeasonMutation = useMutation({
        mutationFn: async () => {
            // Delete all table entries first
            for (const row of leagueTableData) {
                await base44.entities.LeagueTable.delete(row.id);
            }
            // Then delete the season
            await base44.entities.Season.delete(seasonId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['leagueSeasons']);
            queryClient.invalidateQueries(['leagueTables']);
            navigate(createPageUrl(`LeagueDetail?id=${season.league_id}`));
        },
    });

    if (seasonLoading || !season || !league) {
        return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <PageHeader 
                title={`Edit Season ${season.year}`}
                subtitle={league.name}
                breadcrumbs={[
                    { label: 'Nations', url: createPageUrl('Nations') },
                    { label: league.name, url: createPageUrl(`LeagueDetail?id=${season.league_id}`) },
                    { label: `Edit ${season.year}` }
                ]}
            />

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                <Card className="border-0 shadow-sm">
                    <CardHeader><CardTitle>Season Details</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <Label>Season Year</Label>
                                <Input value={seasonData.year || ''} onChange={(e) => setSeasonData({...seasonData, year: e.target.value})} className="mt-1" />
                            </div>
                            <div>
                                <Label>Promotion Spots</Label>
                                <Input type="number" value={seasonData.promotion_spots || 0} onChange={(e) => setSeasonData({...seasonData, promotion_spots: parseInt(e.target.value) || 0})} className="mt-1" />
                            </div>
                            <div>
                                <Label>Relegation Spots</Label>
                                <Input type="number" value={seasonData.relegation_spots || 0} onChange={(e) => setSeasonData({...seasonData, relegation_spots: parseInt(e.target.value) || 0})} className="mt-1" />
                            </div>
                            <div>
                                <Label>Top Scorer</Label>
                                <Input value={seasonData.top_scorer || ''} onChange={(e) => setSeasonData({...seasonData, top_scorer: e.target.value})} className="mt-1" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                    <CardHeader><CardTitle>Highlight Colors</CardTitle></CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-3 gap-6">
                            <div>
                                <Label className="flex items-center gap-2"><Trophy className="w-4 h-4 text-amber-500" /> Champion</Label>
                                <div className="flex gap-2 mt-1">
                                    <input type="color" value={seasonData.champion_color || '#fef3c7'} onChange={(e) => setSeasonData({...seasonData, champion_color: e.target.value})} className="w-12 h-10 rounded cursor-pointer border" />
                                    <Input value={seasonData.champion_color || ''} onChange={(e) => setSeasonData({...seasonData, champion_color: e.target.value})} />
                                </div>
                            </div>
                            <div>
                                <Label className="flex items-center gap-2"><ArrowUp className="w-4 h-4 text-green-500" /> Promotion</Label>
                                <div className="flex gap-2 mt-1">
                                    <input type="color" value={seasonData.promotion_color || '#d1fae5'} onChange={(e) => setSeasonData({...seasonData, promotion_color: e.target.value})} className="w-12 h-10 rounded cursor-pointer border" />
                                    <Input value={seasonData.promotion_color || ''} onChange={(e) => setSeasonData({...seasonData, promotion_color: e.target.value})} />
                                </div>
                            </div>
                            <div>
                                <Label className="flex items-center gap-2"><ArrowDown className="w-4 h-4 text-red-500" /> Relegation</Label>
                                <div className="flex gap-2 mt-1">
                                    <input type="color" value={seasonData.relegation_color || '#fee2e2'} onChange={(e) => setSeasonData({...seasonData, relegation_color: e.target.value})} className="w-12 h-10 rounded cursor-pointer border" />
                                    <Input value={seasonData.relegation_color || ''} onChange={(e) => setSeasonData({...seasonData, relegation_color: e.target.value})} />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                    <CardHeader><CardTitle>League Table</CardTitle></CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-100">
                                        <TableHead className="w-12">#</TableHead>
                                        <TableHead className="min-w-[180px]">Club</TableHead>
                                        <TableHead className="w-14 text-center">P</TableHead>
                                        <TableHead className="w-14 text-center">W</TableHead>
                                        <TableHead className="w-14 text-center">D</TableHead>
                                        <TableHead className="w-14 text-center">L</TableHead>
                                        <TableHead className="w-14 text-center">GF</TableHead>
                                        <TableHead className="w-14 text-center">GA</TableHead>
                                        <TableHead className="w-14 text-center">GD</TableHead>
                                        <TableHead className="w-14 text-center">Pts</TableHead>
                                        <TableHead className="w-32">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {tableRows.map((row, idx) => (
                                        <TableRow key={row.id || idx} style={{ backgroundColor: row.highlight_color || 'transparent' }}>
                                            <TableCell className="font-bold">{row.position}</TableCell>
                                            <TableCell>
                                                <Input value={row.club_name} onChange={(e) => updateRow(idx, 'club_name', e.target.value)} className="h-8" />
                                            </TableCell>
                                            <TableCell><Input type="number" value={row.played} onChange={(e) => updateRow(idx, 'played', e.target.value)} className="h-8 w-14 text-center p-1" /></TableCell>
                                            <TableCell><Input type="number" value={row.won} onChange={(e) => updateRow(idx, 'won', e.target.value)} className="h-8 w-14 text-center p-1" /></TableCell>
                                            <TableCell><Input type="number" value={row.drawn} onChange={(e) => updateRow(idx, 'drawn', e.target.value)} className="h-8 w-14 text-center p-1" /></TableCell>
                                            <TableCell><Input type="number" value={row.lost} onChange={(e) => updateRow(idx, 'lost', e.target.value)} className="h-8 w-14 text-center p-1" /></TableCell>
                                            <TableCell><Input type="number" value={row.goals_for} onChange={(e) => updateRow(idx, 'goals_for', e.target.value)} className="h-8 w-14 text-center p-1" /></TableCell>
                                            <TableCell><Input type="number" value={row.goals_against} onChange={(e) => updateRow(idx, 'goals_against', e.target.value)} className="h-8 w-14 text-center p-1" /></TableCell>
                                            <TableCell className="text-center font-medium">{row.goal_difference}</TableCell>
                                            <TableCell><Input type="number" value={row.points} onChange={(e) => updateRow(idx, 'points', e.target.value)} className="h-8 w-14 text-center p-1 font-bold" /></TableCell>
                                            <TableCell>
                                                <Select value={row.status || 'none'} onValueChange={(v) => setRowStatus(idx, v === 'none' ? '' : v)}>
                                                    <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="none">None</SelectItem>
                                                        <SelectItem value="champion">🏆 Champion</SelectItem>
                                                        <SelectItem value="promoted">⬆️ Promoted</SelectItem>
                                                        <SelectItem value="relegated">⬇️ Relegated</SelectItem>
                                                        <SelectItem value="playoff">🔄 Playoff</SelectItem>
                                                        <SelectItem value="european">⭐ European</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                    <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
                    <CardContent>
                        <Textarea value={seasonData.notes || ''} onChange={(e) => setSeasonData({...seasonData, notes: e.target.value})} rows={3} />
                    </CardContent>
                </Card>

                <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={() => navigate(-1)}>
                            <ArrowLeft className="w-4 h-4 mr-2" /> Cancel
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
                                    <Trash2 className="w-4 h-4 mr-2" /> Delete Season
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Delete {season.year} season?</AlertDialogTitle>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteSeasonMutation.mutate()} className="bg-red-600">Delete</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                    <Button 
                        onClick={() => updateSeasonMutation.mutate(seasonData)} 
                        disabled={updateSeasonMutation.isPending} 
                        className="bg-emerald-600 hover:bg-emerald-700"
                    >
                        {updateSeasonMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : <><Save className="w-4 h-4 mr-2" /> Save Changes</>}
                    </Button>
                </div>
            </div>
        </div>
    );
}