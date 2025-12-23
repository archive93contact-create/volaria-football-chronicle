import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { User, Edit2, Trash2, Save, X, Shield, MapPin, Calendar, Trophy, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import PageHeader from '@/components/common/PageHeader';
import AdminOnly from '@/components/common/AdminOnly';

export default function PlayerDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    const playerId = urlParams.get('id');
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({});

    const { data: player } = useQuery({
        queryKey: ['player', playerId],
        queryFn: async () => {
            const players = await base44.entities.Player.filter({ id: playerId });
            return players[0];
        },
        enabled: !!playerId,
    });

    const { data: club } = useQuery({
        queryKey: ['club', player?.club_id],
        queryFn: async () => {
            const clubs = await base44.entities.Club.filter({ id: player.club_id });
            return clubs[0];
        },
        enabled: !!player?.club_id,
    });

    const { data: nation } = useQuery({
        queryKey: ['nation', player?.nation_id],
        queryFn: async () => {
            const nations = await base44.entities.Nation.filter({ id: player.nation_id });
            return nations[0];
        },
        enabled: !!player?.nation_id,
    });

    const { data: birthNation } = useQuery({
        queryKey: ['birthNation', player?.nationality],
        queryFn: async () => {
            const nations = await base44.entities.Nation.list();
            return nations.find(n => n.name === player.nationality);
        },
        enabled: !!player?.nationality,
    });

    const { data: nations = [] } = useQuery({
        queryKey: ['allNations'],
        queryFn: () => base44.entities.Nation.list(),
    });

    const { data: allClubs = [] } = useQuery({
        queryKey: ['allClubs'],
        queryFn: () => base44.entities.Club.list(),
    });

    // Parse club history and match with actual clubs
    const clubHistory = useMemo(() => {
        if (!player?.club_history) return [];
        
        // Parse format: "ClubName (2018-2020), ClubName (2020-2023)"
        const historyEntries = player.club_history.split(',').map(entry => {
            const match = entry.trim().match(/^(.+?)\s*\((\d{4})-(\d{4})\)$/);
            if (!match) return null;
            
            const [, clubName, startYear, endYear] = match;
            const foundClub = allClubs.find(c => c.name.toLowerCase() === clubName.trim().toLowerCase());
            const clubNation = foundClub ? nations.find(n => n.id === foundClub.nation_id) : null;
            
            return {
                clubName: clubName.trim(),
                club: foundClub,
                nation: clubNation,
                years: `${startYear}-${endYear}`
            };
        }).filter(Boolean);
        
        return historyEntries;
    }, [player?.club_history, allClubs, nations]);

    const updateMutation = useMutation({
        mutationFn: (data) => base44.entities.Player.update(playerId, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['player', playerId]);
            setIsEditing(false);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: () => base44.entities.Player.delete(playerId),
        onSuccess: () => {
            navigate(createPageUrl(`ClubDetail?id=${club.id}`));
        },
    });

    const handleSave = () => {
        updateMutation.mutate({
            ...editData,
            age: parseInt(editData.age),
            shirt_number: editData.shirt_number ? parseInt(editData.shirt_number) : null,
            overall_rating: parseInt(editData.overall_rating),
            potential: parseInt(editData.potential),
            height_cm: editData.height_cm ? parseInt(editData.height_cm) : null,
            appearances: editData.appearances ? parseInt(editData.appearances) : null,
            goals: editData.goals ? parseInt(editData.goals) : null,
            assists: editData.assists ? parseInt(editData.assists) : null,
        });
    };

    if (!player) return null;

    const displayName = player.full_name || `${player.first_name} ${player.last_name}`;
    const age = player.age || new Date().getFullYear() - (player.date_of_birth ? new Date(player.date_of_birth).getFullYear() : 2000);

    return (
        <div className="min-h-screen bg-slate-50">
            <PageHeader
                title={displayName}
                subtitle={`${player.position} • ${club?.name || 'Free Agent'}`}
                breadcrumbs={[
                    { label: 'Clubs', url: createPageUrl('AllClubs') },
                    ...(club ? [{ label: club.name, url: createPageUrl(`ClubDetail?id=${club.id}`) }] : []),
                    { label: displayName }
                ]}
            >
                <AdminOnly>
                    <div className="flex gap-2">
                        <Button variant="outline" className="border-white/30 text-white hover:bg-white/10" onClick={() => { setEditData(player); setIsEditing(true); }}>
                            <Edit2 className="w-4 h-4 mr-2" /> Edit
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="outline" className="border-red-400/50 text-red-300 hover:bg-red-500/20">
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Delete {displayName}?</AlertDialogTitle></AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-red-600">Delete</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </AdminOnly>
            </PageHeader>

            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Profile Card */}
                    <div className="space-y-6">
                        <Card className="border-0 shadow-sm">
                            <CardContent className="p-6 text-center">
                                {player.photo_url ? (
                                    <img src={player.photo_url} alt={displayName} className="w-32 h-32 rounded-full object-cover mx-auto mb-4" />
                                ) : (
                                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center mx-auto mb-4">
                                        <User className="w-16 h-16 text-emerald-600" />
                                    </div>
                                )}
                                {player.shirt_number && (
                                    <div className="w-16 h-16 rounded-full bg-emerald-600 text-white flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                                        {player.shirt_number}
                                    </div>
                                )}
                                <h2 className="text-2xl font-bold mb-2">{displayName}</h2>
                                <Badge className="mb-4">{player.position}</Badge>
                                
                                <div className="grid grid-cols-2 gap-4 mt-6">
                                    <div className="p-3 bg-emerald-50 rounded-lg">
                                        <div className="text-3xl font-bold text-emerald-600">{player.overall_rating}</div>
                                        <div className="text-xs text-slate-500">Overall</div>
                                    </div>
                                    <div className="p-3 bg-blue-50 rounded-lg">
                                        <div className="text-3xl font-bold text-blue-600">{player.potential}</div>
                                        <div className="text-xs text-slate-500">Potential</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Personal Info */}
                        <Card className="border-0 shadow-sm">
                            <CardHeader><CardTitle className="text-lg">Personal Info</CardTitle></CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <Calendar className="w-4 h-4 text-slate-400" />
                                    <div>
                                        <div className="text-xs text-slate-500">Age</div>
                                        <div className="font-semibold">{age} years old</div>
                                    </div>
                                </div>
                                {player.height_cm && (
                                    <div className="flex items-center gap-3">
                                        <TrendingUp className="w-4 h-4 text-slate-400" />
                                        <div>
                                            <div className="text-xs text-slate-500">Height</div>
                                            <div className="font-semibold">{player.height_cm} cm</div>
                                        </div>
                                    </div>
                                )}
                                {player.preferred_foot && (
                                    <div className="flex items-center gap-3">
                                        <Trophy className="w-4 h-4 text-slate-400" />
                                        <div>
                                            <div className="text-xs text-slate-500">Preferred Foot</div>
                                            <div className="font-semibold">{player.preferred_foot}</div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Nationality & Origin */}
                        <Card className="border-0 shadow-sm">
                            <CardHeader><CardTitle>Nationality & Origin</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                {player.nationality && (
                                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                        {birthNation?.flag_url && (
                                            <img src={birthNation.flag_url} alt={player.nationality} className="w-12 h-8 object-cover rounded shadow-sm" />
                                        )}
                                        <div>
                                            <div className="text-xs text-slate-500">Nationality</div>
                                            <Link to={createPageUrl(`NationDetail?id=${birthNation?.id}`)} className="font-bold text-lg hover:text-emerald-600">
                                                {player.nationality}
                                            </Link>
                                        </div>
                                    </div>
                                )}
                                {player.birth_place && (
                                    <div className="flex items-center gap-3">
                                        <MapPin className="w-5 h-5 text-slate-400" />
                                        <div>
                                            <div className="text-xs text-slate-500">Place of Birth</div>
                                            <div className="font-semibold">{player.birth_place}</div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Current Club */}
                        {club && (
                            <Card className="border-0 shadow-sm">
                                <CardHeader><CardTitle>Current Club</CardTitle></CardHeader>
                                <CardContent>
                                    <Link to={createPageUrl(`ClubDetail?id=${club.id}`)} className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                                        {club.logo_url && (
                                            <img src={club.logo_url} alt={club.name} className="w-16 h-16 object-contain bg-white rounded p-2" />
                                        )}
                                        <div className="flex-1">
                                            <div className="font-bold text-lg">{club.name}</div>
                                            {nation && <div className="text-sm text-slate-500">{nation.name}</div>}
                                        </div>
                                        {player.contract_until && (
                                            <div className="text-right">
                                                <div className="text-xs text-slate-500">Contract Until</div>
                                                <div className="font-semibold">{player.contract_until}</div>
                                            </div>
                                        )}
                                    </Link>
                                </CardContent>
                            </Card>
                        )}

                        {/* Career Stats */}
                        <Card className="border-0 shadow-sm">
                            <CardHeader><CardTitle>Career Statistics</CardTitle></CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="text-center p-4 bg-slate-50 rounded-lg">
                                        <div className="text-2xl font-bold">{player.appearances || 0}</div>
                                        <div className="text-xs text-slate-500">Appearances</div>
                                    </div>
                                    <div className="text-center p-4 bg-green-50 rounded-lg">
                                        <div className="text-2xl font-bold text-green-600">{player.goals || 0}</div>
                                        <div className="text-xs text-green-600">Goals</div>
                                    </div>
                                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                                        <div className="text-2xl font-bold text-blue-600">{player.assists || 0}</div>
                                        <div className="text-xs text-blue-600">Assists</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Club History */}
                        {clubHistory.length > 0 && (
                            <Card className="border-0 shadow-sm">
                                <CardHeader><CardTitle>Club History</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {clubHistory.map((entry, idx) => (
                                            <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                                                {entry.club ? (
                                                    <Link 
                                                        to={createPageUrl(`ClubDetail?id=${entry.club.id}`)}
                                                        className="flex items-center gap-3 flex-1"
                                                    >
                                                        {entry.nation?.flag_url && (
                                                            <img src={entry.nation.flag_url} alt={entry.nation.name} className="w-8 h-5 object-contain rounded shadow-sm" />
                                                        )}
                                                        <Shield className="w-5 h-5 text-slate-400" />
                                                        <div>
                                                            <div className="font-semibold text-slate-900 hover:text-emerald-600">{entry.clubName}</div>
                                                            <div className="text-xs text-slate-500">{entry.years}</div>
                                                        </div>
                                                    </Link>
                                                ) : (
                                                    <>
                                                        <Shield className="w-5 h-5 text-slate-400" />
                                                        <div>
                                                            <div className="font-medium text-slate-700">{entry.clubName}</div>
                                                            <div className="text-xs text-slate-500">{entry.years}</div>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>

            {/* Edit Dialog */}
            <Dialog open={isEditing} onOpenChange={setIsEditing}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>Edit Player</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div><Label>First Name</Label><Input value={editData.first_name || ''} onChange={(e) => setEditData({...editData, first_name: e.target.value})} className="mt-1" /></div>
                            <div><Label>Last Name</Label><Input value={editData.last_name || ''} onChange={(e) => setEditData({...editData, last_name: e.target.value})} className="mt-1" /></div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div><Label>Age</Label><Input type="number" value={editData.age || ''} onChange={(e) => setEditData({...editData, age: e.target.value})} className="mt-1" /></div>
                            <div><Label>Shirt Number</Label><Input type="number" value={editData.shirt_number || ''} onChange={(e) => setEditData({...editData, shirt_number: e.target.value})} className="mt-1" /></div>
                            <div><Label>Height (cm)</Label><Input type="number" value={editData.height_cm || ''} onChange={(e) => setEditData({...editData, height_cm: e.target.value})} className="mt-1" /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Position</Label>
                                <Select value={editData.position} onValueChange={(v) => setEditData({...editData, position: v})}>
                                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST'].map(pos => (
                                            <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Preferred Foot</Label>
                                <Select value={editData.preferred_foot || 'Right'} onValueChange={(v) => setEditData({...editData, preferred_foot: v})}>
                                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Left">Left</SelectItem>
                                        <SelectItem value="Right">Right</SelectItem>
                                        <SelectItem value="Both">Both</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><Label>Overall Rating</Label><Input type="number" value={editData.overall_rating || ''} onChange={(e) => setEditData({...editData, overall_rating: e.target.value})} className="mt-1" /></div>
                            <div><Label>Potential</Label><Input type="number" value={editData.potential || ''} onChange={(e) => setEditData({...editData, potential: e.target.value})} className="mt-1" /></div>
                        </div>
                        <div>
                            <Label>Nationality</Label>
                            <Select value={editData.nationality || ''} onValueChange={(v) => setEditData({...editData, nationality: v})}>
                                <SelectTrigger className="mt-1"><SelectValue placeholder="Select nation" /></SelectTrigger>
                                <SelectContent>
                                    {nations.map(n => <SelectItem key={n.id} value={n.name}>{n.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div><Label>Place of Birth</Label><Input value={editData.birth_place || ''} onChange={(e) => setEditData({...editData, birth_place: e.target.value})} className="mt-1" placeholder="City, Region" /></div>
                        <div><Label>Club History</Label><Input value={editData.club_history || ''} onChange={(e) => setEditData({...editData, club_history: e.target.value})} className="mt-1" placeholder="FC Example (2018-2020), Another FC (2020-2023)" /></div>
                        <div className="grid grid-cols-3 gap-4">
                            <div><Label>Appearances</Label><Input type="number" value={editData.appearances || ''} onChange={(e) => setEditData({...editData, appearances: e.target.value})} className="mt-1" /></div>
                            <div><Label>Goals</Label><Input type="number" value={editData.goals || ''} onChange={(e) => setEditData({...editData, goals: e.target.value})} className="mt-1" /></div>
                            <div><Label>Assists</Label><Input type="number" value={editData.assists || ''} onChange={(e) => setEditData({...editData, assists: e.target.value})} className="mt-1" /></div>
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={() => setIsEditing(false)}><X className="w-4 h-4 mr-2" /> Cancel</Button>
                            <Button onClick={handleSave} disabled={updateMutation.isPending} className="bg-emerald-600"><Save className="w-4 h-4 mr-2" /> Save</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}