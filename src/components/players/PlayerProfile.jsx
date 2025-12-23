import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit2, Save, X, Trash2, Shield } from 'lucide-react';
import { toast } from 'sonner';

export default function PlayerProfile({ player, onUpdate }) {
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState(player);
    const queryClient = useQueryClient();

    const { data: nations = [] } = useQuery({
        queryKey: ['nations'],
        queryFn: () => base44.entities.Nation.list(),
    });

    const { data: allClubs = [] } = useQuery({
        queryKey: ['allClubs'],
        queryFn: () => base44.entities.Club.list(),
    });

    const playerNation = nations.find(n => n.name === player.nationality);

    // Parse club history and match with actual clubs
    const clubHistory = useMemo(() => {
        if (!player.club_history) return [];
        
        // Parse format: "ClubName (2018-2020), ClubName (2020-2023)"
        const historyEntries = player.club_history.split(',').map(entry => {
            const match = entry.trim().match(/^(.+?)\s*\((\d{4})-(\d{4})\)$/);
            if (!match) return null;
            
            const [, clubName, startYear, endYear] = match;
            const club = allClubs.find(c => c.name.toLowerCase() === clubName.trim().toLowerCase());
            const nation = club ? nations.find(n => n.id === club.nation_id) : null;
            
            return {
                clubName: clubName.trim(),
                club,
                nation,
                years: `${startYear}-${endYear}`
            };
        }).filter(Boolean);
        
        return historyEntries;
    }, [player.club_history, allClubs, nations]);

    const updateMutation = useMutation({
        mutationFn: (data) => base44.entities.Player.update(player.id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['players']);
            setIsEditing(false);
            toast.success('Player updated');
            onUpdate?.();
        },
    });

    const deleteMutation = useMutation({
        mutationFn: () => base44.entities.Player.delete(player.id),
        onSuccess: () => {
            queryClient.invalidateQueries(['players']);
            toast.success('Player deleted');
            onUpdate?.();
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
            national_team_caps: editData.national_team_caps ? parseInt(editData.national_team_caps) : null,
            national_team_goals: editData.national_team_goals ? parseInt(editData.national_team_goals) : null,
        });
    };

    if (!isEditing) {
        return (
            <Link to={createPageUrl(`PlayerDetail?id=${player.id}`)} className="block">
                <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-50 group cursor-pointer">
                    {player.shirt_number && (
                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center font-bold text-emerald-700">
                            {player.shirt_number}
                        </div>
                    )}
                    {player.photo_url ? (
                        <img src={player.photo_url} alt={player.full_name} className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                        <div className="w-12 h-12 rounded-full bg-slate-200" />
                    )}
                    <div className="flex-1">
                        <div className="font-semibold flex items-center gap-2">
                            {player.full_name || `${player.first_name} ${player.last_name}`}
                            {playerNation?.flag_url && (
                                <img src={playerNation.flag_url} alt={player.nationality} className="w-5 h-4 object-cover rounded shadow-sm" title={player.nationality} />
                            )}
                            {player.is_national_team && (
                                <Shield className="w-4 h-4 text-amber-600" title={`${player.nationality} National Team`} />
                            )}
                        </div>
                        <div className="text-sm text-slate-500">
                            {player.position} • Age {player.age}
                            {player.national_team_caps > 0 && (
                                <span className="text-amber-600 ml-2">• {player.national_team_caps} caps</span>
                            )}
                        </div>
                        {clubHistory.length > 0 && (
                            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 flex-wrap">
                                {clubHistory.map((entry, idx) => (
                                    <React.Fragment key={idx}>
                                        {entry.club ? (
                                            <Link 
                                                to={createPageUrl(`ClubDetail?id=${entry.club.id}`)} 
                                                className="flex items-center gap-1 hover:text-emerald-600 transition-colors"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {entry.nation?.flag_url && (
                                                    <img src={entry.nation.flag_url} alt={entry.nation.name} className="w-4 h-2.5 object-contain" />
                                                )}
                                                <span>{entry.clubName}</span>
                                            </Link>
                                        ) : (
                                            <span>{entry.clubName}</span>
                                        )}
                                        {idx < clubHistory.length - 1 && <span>•</span>}
                                    </React.Fragment>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-center">
                            <div className="text-lg font-bold text-emerald-600">{player.overall_rating}</div>
                            <div className="text-xs text-slate-500">OVR</div>
                        </div>
                        <div className="text-center">
                            <div className="text-lg font-bold text-blue-600">{player.potential}</div>
                            <div className="text-xs text-slate-500">POT</div>
                        </div>
                        <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => { 
                                e.preventDefault();
                                e.stopPropagation();
                                setEditData(player); 
                                setIsEditing(true); 
                            }}
                            className="opacity-0 group-hover:opacity-100"
                        >
                            <Edit2 className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </Link>
        );
    }

    return (
        <Dialog open={isEditing} onOpenChange={setIsEditing}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Player</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>First Name</Label>
                            <Input value={editData.first_name || ''} onChange={(e) => setEditData({...editData, first_name: e.target.value})} className="mt-1" />
                        </div>
                        <div>
                            <Label>Last Name</Label>
                            <Input value={editData.last_name || ''} onChange={(e) => setEditData({...editData, last_name: e.target.value})} className="mt-1" />
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <Label>Age</Label>
                            <Input type="number" value={editData.age || ''} onChange={(e) => setEditData({...editData, age: e.target.value})} className="mt-1" />
                        </div>
                        <div>
                            <Label>Shirt Number</Label>
                            <Input type="number" value={editData.shirt_number || ''} onChange={(e) => setEditData({...editData, shirt_number: e.target.value})} className="mt-1" />
                        </div>
                        <div>
                            <Label>Height (cm)</Label>
                            <Input type="number" value={editData.height_cm || ''} onChange={(e) => setEditData({...editData, height_cm: e.target.value})} className="mt-1" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Position</Label>
                            <Select value={editData.position} onValueChange={(v) => setEditData({...editData, position: v})}>
                                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="GK">GK</SelectItem>
                                    <SelectItem value="CB">CB</SelectItem>
                                    <SelectItem value="LB">LB</SelectItem>
                                    <SelectItem value="RB">RB</SelectItem>
                                    <SelectItem value="CDM">CDM</SelectItem>
                                    <SelectItem value="CM">CM</SelectItem>
                                    <SelectItem value="CAM">CAM</SelectItem>
                                    <SelectItem value="LW">LW</SelectItem>
                                    <SelectItem value="RW">RW</SelectItem>
                                    <SelectItem value="ST">ST</SelectItem>
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
                        <div>
                            <Label>Overall Rating</Label>
                            <Input type="number" value={editData.overall_rating || ''} onChange={(e) => setEditData({...editData, overall_rating: e.target.value})} className="mt-1" />
                        </div>
                        <div>
                            <Label>Potential</Label>
                            <Input type="number" value={editData.potential || ''} onChange={(e) => setEditData({...editData, potential: e.target.value})} className="mt-1" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Nationality</Label>
                            <Select value={editData.nationality || ''} onValueChange={(v) => setEditData({...editData, nationality: v})}>
                                <SelectTrigger className="mt-1"><SelectValue placeholder="Select nation" /></SelectTrigger>
                                <SelectContent>
                                    {nations.map(n => <SelectItem key={n.id} value={n.name}>{n.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Birth Place</Label>
                            <Input value={editData.birth_place || ''} onChange={(e) => setEditData({...editData, birth_place: e.target.value})} className="mt-1" />
                        </div>
                    </div>
                    <div>
                        <Label>Club History</Label>
                        <Input value={editData.club_history || ''} onChange={(e) => setEditData({...editData, club_history: e.target.value})} className="mt-1" placeholder="e.g., FC Example (2018-2020), Another FC (2020-2023)" />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <Label>Appearances</Label>
                            <Input type="number" value={editData.appearances || ''} onChange={(e) => setEditData({...editData, appearances: e.target.value})} className="mt-1" />
                        </div>
                        <div>
                            <Label>Goals</Label>
                            <Input type="number" value={editData.goals || ''} onChange={(e) => setEditData({...editData, goals: e.target.value})} className="mt-1" />
                        </div>
                        <div>
                            <Label>Assists</Label>
                            <Input type="number" value={editData.assists || ''} onChange={(e) => setEditData({...editData, assists: e.target.value})} className="mt-1" />
                        </div>
                    </div>
                    <div className="border-t pt-4 mt-2">
                        <div className="flex items-center gap-4 mb-3">
                            <Shield className="w-5 h-5 text-amber-600" />
                            <span className="font-semibold">International Career</span>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={editData.is_national_team || false}
                                    onChange={(e) => setEditData({...editData, is_national_team: e.target.checked})}
                                    className="rounded"
                                />
                                <Label>Current Squad</Label>
                            </div>
                            <div>
                                <Label>Caps</Label>
                                <Input type="number" value={editData.national_team_caps || ''} onChange={(e) => setEditData({...editData, national_team_caps: e.target.value})} className="mt-1" />
                            </div>
                            <div>
                                <Label>Int'l Goals</Label>
                                <Input type="number" value={editData.national_team_goals || ''} onChange={(e) => setEditData({...editData, national_team_goals: e.target.value})} className="mt-1" />
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-between pt-4">
                        <Button variant="destructive" onClick={() => deleteMutation.mutate()}>
                            <Trash2 className="w-4 h-4 mr-2" /> Delete Player
                        </Button>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setIsEditing(false)}>
                                <X className="w-4 h-4 mr-2" /> Cancel
                            </Button>
                            <Button onClick={handleSave} disabled={updateMutation.isPending} className="bg-emerald-600">
                                <Save className="w-4 h-4 mr-2" /> Save
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}