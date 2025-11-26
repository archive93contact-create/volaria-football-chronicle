import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Shield, Edit2, Trash2, ChevronRight, Save, X, Loader2, MapPin, Users, Calendar, Trophy } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ImageUploader from '@/components/common/ImageUploader';

export default function ClubDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    const clubId = urlParams.get('id');
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({});

    const { data: club } = useQuery({
        queryKey: ['club', clubId],
        queryFn: async () => {
            const clubs = await base44.entities.Club.filter({ id: clubId });
            return clubs[0];
        },
        enabled: !!clubId,
    });

    const { data: nation } = useQuery({
        queryKey: ['nation', club?.nation_id],
        queryFn: async () => {
            const nations = await base44.entities.Nation.filter({ id: club.nation_id });
            return nations[0];
        },
        enabled: !!club?.nation_id,
    });

    const { data: league } = useQuery({
        queryKey: ['league', club?.league_id],
        queryFn: async () => {
            const leagues = await base44.entities.League.filter({ id: club.league_id });
            return leagues[0];
        },
        enabled: !!club?.league_id,
    });

    const { data: leagues = [] } = useQuery({
        queryKey: ['leaguesByNation', club?.nation_id],
        queryFn: () => base44.entities.League.filter({ nation_id: club.nation_id }),
        enabled: !!club?.nation_id,
    });

    const updateMutation = useMutation({
        mutationFn: (data) => base44.entities.Club.update(clubId, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['club', clubId]);
            setIsEditing(false);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: () => base44.entities.Club.delete(clubId),
        onSuccess: () => {
            queryClient.invalidateQueries(['clubs']);
            navigate(createPageUrl('Nations'));
        },
    });

    const handleEdit = () => {
        setEditData(club);
        setIsEditing(true);
    };

    const handleSave = () => {
        const submitData = {
            ...editData,
            founded_year: editData.founded_year ? parseInt(editData.founded_year) : null,
            stadium_capacity: editData.stadium_capacity ? parseInt(editData.stadium_capacity) : null,
        };
        updateMutation.mutate(submitData);
    };

    if (!club) {
        return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Hero */}
            <div className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${club.primary_color || '#1e40af'}, ${club.secondary_color || '#ffffff'}40)` }}>
                <div className="absolute inset-0 bg-black/30" />
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <nav className="flex items-center gap-2 text-sm text-white/70 mb-4 flex-wrap">
                        <Link to={createPageUrl('Home')} className="hover:text-white">Volaria</Link>
                        <ChevronRight className="w-4 h-4" />
                        <Link to={createPageUrl('Nations')} className="hover:text-white">Nations</Link>
                        {nation && <><ChevronRight className="w-4 h-4" /><Link to={createPageUrl(`NationDetail?id=${nation.id}`)} className="hover:text-white">{nation.name}</Link></>}
                        {league && <><ChevronRight className="w-4 h-4" /><Link to={createPageUrl(`LeagueDetail?id=${league.id}`)} className="hover:text-white">{league.name}</Link></>}
                        <ChevronRight className="w-4 h-4" />
                        <span className="text-white">{club.name}</span>
                    </nav>
                    <div className="flex items-center gap-6">
                        {club.logo_url ? (
                            <img src={club.logo_url} alt={club.name} className="w-28 h-28 object-contain bg-white rounded-xl p-2 shadow-xl" />
                        ) : (
                            <div className="w-28 h-28 bg-white/20 rounded-xl flex items-center justify-center">
                                <Shield className="w-14 h-14 text-white" />
                            </div>
                        )}
                        <div className="flex-1">
                            <h1 className="text-3xl md:text-4xl font-bold text-white">{club.name}</h1>
                            {club.nickname && <p className="text-white/80 text-lg mt-1">"{club.nickname}"</p>}
                            {club.city && <p className="text-white/70 flex items-center gap-1 mt-2"><MapPin className="w-4 h-4" /> {club.city}</p>}
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" className="border-white/30 text-white hover:bg-white/10" onClick={handleEdit}>
                                <Edit2 className="w-4 h-4 mr-2" /> Edit
                            </Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="outline" className="border-red-400/50 text-red-300 hover:bg-red-500/20"><Trash2 className="w-4 h-4" /></Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>Delete {club.name}?</AlertDialogTitle></AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-red-600">Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {club.founded_year && <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center"><Calendar className="w-6 h-6 text-emerald-500 mx-auto mb-2" /><div className="text-2xl font-bold">{club.founded_year}</div><div className="text-xs text-slate-500">Founded</div></CardContent></Card>}
                    {club.stadium && <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center"><div className="text-lg font-bold truncate">{club.stadium}</div><div className="text-xs text-slate-500">Stadium</div></CardContent></Card>}
                    {club.stadium_capacity && <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center"><Users className="w-6 h-6 text-blue-500 mx-auto mb-2" /><div className="text-2xl font-bold">{club.stadium_capacity.toLocaleString()}</div><div className="text-xs text-slate-500">Capacity</div></CardContent></Card>}
                    {league && <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center"><Trophy className="w-6 h-6 text-amber-500 mx-auto mb-2" /><div className="text-sm font-bold truncate">{league.name}</div><div className="text-xs text-slate-500">Current League</div></CardContent></Card>}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        {club.history && (
                            <Card className="border-0 shadow-sm">
                                <CardHeader><CardTitle>Club History</CardTitle></CardHeader>
                                <CardContent><p className="text-slate-600 whitespace-pre-line">{club.history}</p></CardContent>
                            </Card>
                        )}
                        {club.honours && (
                            <Card className="border-0 shadow-sm">
                                <CardHeader><CardTitle>Honours</CardTitle></CardHeader>
                                <CardContent><p className="text-slate-600 whitespace-pre-line">{club.honours}</p></CardContent>
                            </Card>
                        )}
                    </div>
                    <div className="space-y-6">
                        {club.manager && (
                            <Card className="border-0 shadow-sm">
                                <CardHeader><CardTitle>Manager</CardTitle></CardHeader>
                                <CardContent><p className="font-semibold">{club.manager}</p></CardContent>
                            </Card>
                        )}
                        {club.notable_players && (
                            <Card className="border-0 shadow-sm">
                                <CardHeader><CardTitle>Notable Players</CardTitle></CardHeader>
                                <CardContent><p className="text-slate-600 whitespace-pre-line">{club.notable_players}</p></CardContent>
                            </Card>
                        )}
                        {club.rivals && (
                            <Card className="border-0 shadow-sm">
                                <CardHeader><CardTitle>Rivals</CardTitle></CardHeader>
                                <CardContent><p className="text-slate-600 whitespace-pre-line">{club.rivals}</p></CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>

            {/* Edit Dialog */}
            <Dialog open={isEditing} onOpenChange={setIsEditing}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>Edit Club</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="flex justify-center">
                            <ImageUploader currentImage={editData.logo_url} onUpload={(url) => setEditData({...editData, logo_url: url})} label="Upload Logo" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><Label>Club Name</Label><Input value={editData.name || ''} onChange={(e) => setEditData({...editData, name: e.target.value})} className="mt-1" /></div>
                            <div><Label>Nickname</Label><Input value={editData.nickname || ''} onChange={(e) => setEditData({...editData, nickname: e.target.value})} className="mt-1" /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><Label>City</Label><Input value={editData.city || ''} onChange={(e) => setEditData({...editData, city: e.target.value})} className="mt-1" /></div>
                            <div><Label>Founded Year</Label><Input type="number" value={editData.founded_year || ''} onChange={(e) => setEditData({...editData, founded_year: e.target.value})} className="mt-1" /></div>
                        </div>
                        <div>
                            <Label>League</Label>
                            <Select value={editData.league_id || ''} onValueChange={(v) => setEditData({...editData, league_id: v})}>
                                <SelectTrigger className="mt-1"><SelectValue placeholder="Select league" /></SelectTrigger>
                                <SelectContent>
                                    {leagues.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><Label>Stadium</Label><Input value={editData.stadium || ''} onChange={(e) => setEditData({...editData, stadium: e.target.value})} className="mt-1" /></div>
                            <div><Label>Capacity</Label><Input type="number" value={editData.stadium_capacity || ''} onChange={(e) => setEditData({...editData, stadium_capacity: e.target.value})} className="mt-1" /></div>
                        </div>
                        <div><Label>Manager</Label><Input value={editData.manager || ''} onChange={(e) => setEditData({...editData, manager: e.target.value})} className="mt-1" /></div>
                        <div><Label>History</Label><Textarea value={editData.history || ''} onChange={(e) => setEditData({...editData, history: e.target.value})} rows={3} className="mt-1" /></div>
                        <div><Label>Honours</Label><Textarea value={editData.honours || ''} onChange={(e) => setEditData({...editData, honours: e.target.value})} rows={3} className="mt-1" /></div>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setIsEditing(false)}><X className="w-4 h-4 mr-2" /> Cancel</Button>
                            <Button onClick={handleSave} disabled={updateMutation.isPending} className="bg-emerald-600"><Save className="w-4 h-4 mr-2" /> Save</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}