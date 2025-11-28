import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Save, ArrowLeft, Loader2, Trophy, ArrowUp, ArrowDown, ShieldAlert, RefreshCw } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import PageHeader from '@/components/common/PageHeader';
import { useIsAdmin } from '@/components/common/AdminOnly';

export default function EditSeasonTable() {
    const { isAdmin, isLoading: authLoading } = useIsAdmin();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const urlParams = new URLSearchParams(window.location.search);
    const seasonId = urlParams.get('season_id');
    const leagueId = urlParams.get('league_id');
    const year = urlParams.get('year');

    const [tableRows, setTableRows] = useState([]);
    const [saving, setSaving] = useState(false);

    const { data: league } = useQuery({
        queryKey: ['league', leagueId],
        queryFn: async () => {
            const leagues = await base44.entities.League.filter({ id: leagueId });
            return leagues[0];
        },
        enabled: !!leagueId,
    });

    const { data: season } = useQuery({
        queryKey: ['season', seasonId],
        queryFn: async () => {
            const seasons = await base44.entities.Season.filter({ id: seasonId });
            return seasons[0];
        },
        enabled: !!seasonId,
    });

    const { data: leagueTables = [], isLoading: tablesLoading } = useQuery({
        queryKey: ['seasonTables', leagueId, year],
        queryFn: () => base44.entities.LeagueTable.filter({ league_id: leagueId, year }),
        enabled: !!leagueId && !!year,
    });

    const { data: allNationClubs = [] } = useQuery({
        queryKey: ['nationClubs', league?.nation_id],
        queryFn: () => base44.entities.Club.filter({ nation_id: league.nation_id }, 'name'),
        enabled: !!league?.nation_id,
    });

    useEffect(() => {
        if (leagueTables.length > 0) {
            setTableRows([...leagueTables].sort((a, b) => a.position - b.position));
        }
    }, [leagueTables]);

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
        const colors = {
            champion: '#fef3c7',
            promoted: '#d1fae5',
            playoff_winner: '#d1fae5',
            relegated: '#fee2e2',
            playoff: '#dbeafe'
        };
        updated[index].highlight_color = colors[status] || '';
        setTableRows(updated);
    };

    const handleSave = async () => {
        setSaving(true);
        
        for (const row of tableRows) {
            // Find matching club to update club_id if needed
            const matchingClub = allNationClubs.find(c => 
                c.name.toLowerCase() === row.club_name?.toLowerCase()
            );
            
            await base44.entities.LeagueTable.update(row.id, {
                club_name: row.club_name,
                club_id: matchingClub?.id || row.club_id || '',
                position: row.position,
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

        // Update season champion/runner-up based on table
        const champion = tableRows.find(r => r.position === 1);
        const runnerUp = tableRows.find(r => r.position === 2);
        if (season && champion) {
            await base44.entities.Season.update(season.id, {
                champion_name: champion.club_name,
                runner_up: runnerUp?.club_name || ''
            });
        }

        queryClient.invalidateQueries(['seasonTables']);
        queryClient.invalidateQueries(['leagueTables']);
        queryClient.invalidateQueries(['leagueSeasons']);
        setSaving(false);
        navigate(createPageUrl(`LeagueDetail?id=${leagueId}`));
    };

    if (authLoading || tablesLoading) {
        return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;
    }

    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Card className="max-w-md">
                    <CardContent className="text-center py-8">
                        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <h2 className="text-xl font-bold mb-2">Admin Access Required</h2>
                        <Link to={createPageUrl('Home')}><Button>Back to Home</Button></Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <PageHeader 
                title={`Edit ${year} Season`}
                subtitle={league?.name}
                breadcrumbs={[
                    { label: 'Nations', url: createPageUrl('Nations') },
                    { label: league?.name || 'League', url: createPageUrl(`LeagueDetail?id=${leagueId}`) },
                    { label: `Edit ${year}` }
                ]}
            />

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle>Edit League Table</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {tableRows.length === 0 ? (
                            <p className="text-center py-8 text-slate-500">No table data found for this season</p>
                        ) : (
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
                                            <TableRow key={row.id} style={{ backgroundColor: row.highlight_color || 'transparent' }}>
                                                <TableCell className="font-bold">{row.position}</TableCell>
                                                <TableCell>
                                                    <Input 
                                                        value={row.club_name || ''} 
                                                        onChange={(e) => updateRow(idx, 'club_name', e.target.value)} 
                                                        placeholder="Club name"
                                                        className="h-8"
                                                    />
                                                </TableCell>
                                                <TableCell><Input type="number" value={row.played || 0} onChange={(e) => updateRow(idx, 'played', e.target.value)} className="h-8 w-14 text-center p-1" /></TableCell>
                                                <TableCell><Input type="number" value={row.won || 0} onChange={(e) => updateRow(idx, 'won', e.target.value)} className="h-8 w-14 text-center p-1" /></TableCell>
                                                <TableCell><Input type="number" value={row.drawn || 0} onChange={(e) => updateRow(idx, 'drawn', e.target.value)} className="h-8 w-14 text-center p-1" /></TableCell>
                                                <TableCell><Input type="number" value={row.lost || 0} onChange={(e) => updateRow(idx, 'lost', e.target.value)} className="h-8 w-14 text-center p-1" /></TableCell>
                                                <TableCell><Input type="number" value={row.goals_for || 0} onChange={(e) => updateRow(idx, 'goals_for', e.target.value)} className="h-8 w-14 text-center p-1" /></TableCell>
                                                <TableCell><Input type="number" value={row.goals_against || 0} onChange={(e) => updateRow(idx, 'goals_against', e.target.value)} className="h-8 w-14 text-center p-1" /></TableCell>
                                                <TableCell className="text-center font-medium">{row.goal_difference || 0}</TableCell>
                                                <TableCell><Input type="number" value={row.points || 0} onChange={(e) => updateRow(idx, 'points', e.target.value)} className="h-8 w-14 text-center p-1 font-bold" /></TableCell>
                                                <TableCell>
                                                    <Select value={row.status || ''} onValueChange={(v) => setRowStatus(idx, v)}>
                                                        <SelectTrigger className="h-8 w-28">
                                                            <SelectValue placeholder="Status" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="none">None</SelectItem>
                                                            <SelectItem value="champion">🏆 Champion</SelectItem>
                                                            <SelectItem value="promoted">⬆️ Promoted</SelectItem>
                                                            <SelectItem value="playoff_winner">🎯 Playoff Winner</SelectItem>
                                                            <SelectItem value="playoff">🔄 Playoff</SelectItem>
                                                            <SelectItem value="relegated">⬇️ Relegated</SelectItem>
                                                            <SelectItem value="european">⭐ European</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="flex items-center justify-between mt-6">
                    <Button variant="ghost" onClick={() => navigate(-1)}>
                        <ArrowLeft className="w-4 h-4 mr-2" /> Cancel
                    </Button>
                    <Button 
                        onClick={handleSave} 
                        disabled={saving} 
                        className="bg-emerald-600 hover:bg-emerald-700"
                    >
                        {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : <><Save className="w-4 h-4 mr-2" /> Save Changes</>}
                    </Button>
                </div>
            </div>
        </div>
    );
}