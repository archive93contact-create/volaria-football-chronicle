import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from 'lucide-react';

const ROUNDS = ['Group Stage', 'Round of 32', 'Round of 16', 'Quarter-final', 'Semi-final', 'Final'];

export default function AddMatchDialog({ isOpen, onClose, seasonId, editingMatch, nations, clubs }) {
    const queryClient = useQueryClient();
    
    const [formData, setFormData] = useState({
        round: 'Round of 16',
        match_number: 1,
        home_club_name: '',
        home_club_nation: '',
        away_club_name: '',
        away_club_nation: '',
        home_score_leg1: '',
        away_score_leg1: '',
        home_score_leg2: '',
        away_score_leg2: '',
        penalties: '',
        winner: '',
        is_single_leg: false,
        venue: '',
        notes: ''
    });

    useEffect(() => {
        if (editingMatch) {
            setFormData({
                round: editingMatch.round || 'Round of 16',
                match_number: editingMatch.match_number || 1,
                home_club_name: editingMatch.home_club_name || '',
                home_club_nation: editingMatch.home_club_nation || '',
                away_club_name: editingMatch.away_club_name || '',
                away_club_nation: editingMatch.away_club_nation || '',
                home_score_leg1: editingMatch.home_score_leg1 ?? '',
                away_score_leg1: editingMatch.away_score_leg1 ?? '',
                home_score_leg2: editingMatch.home_score_leg2 ?? '',
                away_score_leg2: editingMatch.away_score_leg2 ?? '',
                penalties: editingMatch.penalties || '',
                winner: editingMatch.winner || '',
                is_single_leg: editingMatch.is_single_leg || false,
                venue: editingMatch.venue || '',
                notes: editingMatch.notes || ''
            });
        } else {
            setFormData({
                round: 'Round of 16',
                match_number: 1,
                home_club_name: '',
                home_club_nation: '',
                away_club_name: '',
                away_club_nation: '',
                home_score_leg1: '',
                away_score_leg1: '',
                home_score_leg2: '',
                away_score_leg2: '',
                penalties: '',
                winner: '',
                is_single_leg: false,
                venue: '',
                notes: ''
            });
        }
    }, [editingMatch, isOpen]);

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.ContinentalMatch.create({ ...data, season_id: seasonId }),
        onSuccess: () => {
            queryClient.invalidateQueries(['continentalMatches', seasonId]);
            onClose();
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.ContinentalMatch.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['continentalMatches', seasonId]);
            onClose();
        },
    });

    const handleSubmit = () => {
        const homeL1 = formData.home_score_leg1 !== '' ? parseInt(formData.home_score_leg1) : null;
        const awayL1 = formData.away_score_leg1 !== '' ? parseInt(formData.away_score_leg1) : null;
        const homeL2 = formData.home_score_leg2 !== '' ? parseInt(formData.home_score_leg2) : null;
        const awayL2 = formData.away_score_leg2 !== '' ? parseInt(formData.away_score_leg2) : null;

        let homeAgg = null;
        let awayAgg = null;
        if (!formData.is_single_leg && homeL1 !== null && awayL1 !== null && homeL2 !== null && awayL2 !== null) {
            homeAgg = homeL1 + awayL2;
            awayAgg = awayL1 + homeL2;
        }

        const submitData = {
            round: formData.round,
            match_number: parseInt(formData.match_number) || 1,
            home_club_name: formData.home_club_name,
            home_club_nation: formData.home_club_nation,
            away_club_name: formData.away_club_name,
            away_club_nation: formData.away_club_nation,
            home_score_leg1: homeL1,
            away_score_leg1: awayL1,
            home_score_leg2: homeL2,
            away_score_leg2: awayL2,
            home_aggregate: homeAgg,
            away_aggregate: awayAgg,
            penalties: formData.penalties,
            winner: formData.winner,
            is_single_leg: formData.is_single_leg,
            venue: formData.venue,
            notes: formData.notes
        };

        if (editingMatch) {
            updateMutation.mutate({ id: editingMatch.id, data: submitData });
        } else {
            createMutation.mutate(submitData);
        }
    };

    const updateField = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const getClubsForNation = (nationName) => {
        const nation = nations.find(n => n.name === nationName);
        if (!nation) return [];
        return clubs.filter(c => c.nation_id === nation.id);
    };

    const isPending = createMutation.isPending || updateMutation.isPending;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{editingMatch ? 'Edit Match' : 'Add Match'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Round</Label>
                            <Select value={formData.round} onValueChange={(v) => updateField('round', v)}>
                                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {ROUNDS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Match Number</Label>
                            <Input 
                                type="number" 
                                value={formData.match_number} 
                                onChange={(e) => updateField('match_number', e.target.value)} 
                                className="mt-1" 
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4 py-2">
                        <Switch 
                            checked={formData.is_single_leg} 
                            onCheckedChange={(v) => updateField('is_single_leg', v)} 
                        />
                        <Label>Single leg match (e.g., Final)</Label>
                    </div>

                    {/* Home Team */}
                    <div className="p-4 bg-slate-50 rounded-lg space-y-3">
                        <h4 className="font-semibold text-sm text-slate-700">Home Team</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Nation</Label>
                                <Select value={formData.home_club_nation} onValueChange={(v) => updateField('home_club_nation', v)}>
                                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select nation" /></SelectTrigger>
                                    <SelectContent>
                                        {nations.map(n => (
                                            <SelectItem key={n.id} value={n.name}>
                                                <span className="flex items-center gap-2">
                                                    {n.flag_url && <img src={n.flag_url} alt="" className="w-4 h-3 object-contain" />}
                                                    {n.name}
                                                </span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Club</Label>
                                {formData.home_club_nation ? (
                                    <Select value={formData.home_club_name} onValueChange={(v) => updateField('home_club_name', v)}>
                                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select club" /></SelectTrigger>
                                        <SelectContent>
                                            {getClubsForNation(formData.home_club_nation).map(c => (
                                                <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <Input 
                                        value={formData.home_club_name} 
                                        onChange={(e) => updateField('home_club_name', e.target.value)}
                                        placeholder="Or type club name"
                                        className="mt-1"
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Away Team */}
                    <div className="p-4 bg-slate-50 rounded-lg space-y-3">
                        <h4 className="font-semibold text-sm text-slate-700">Away Team</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Nation</Label>
                                <Select value={formData.away_club_nation} onValueChange={(v) => updateField('away_club_nation', v)}>
                                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select nation" /></SelectTrigger>
                                    <SelectContent>
                                        {nations.map(n => (
                                            <SelectItem key={n.id} value={n.name}>
                                                <span className="flex items-center gap-2">
                                                    {n.flag_url && <img src={n.flag_url} alt="" className="w-4 h-3 object-contain" />}
                                                    {n.name}
                                                </span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Club</Label>
                                {formData.away_club_nation ? (
                                    <Select value={formData.away_club_name} onValueChange={(v) => updateField('away_club_name', v)}>
                                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select club" /></SelectTrigger>
                                        <SelectContent>
                                            {getClubsForNation(formData.away_club_nation).map(c => (
                                                <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <Input 
                                        value={formData.away_club_name} 
                                        onChange={(e) => updateField('away_club_name', e.target.value)}
                                        placeholder="Or type club name"
                                        className="mt-1"
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Scores */}
                    <div className="p-4 bg-blue-50 rounded-lg space-y-3">
                        <h4 className="font-semibold text-sm text-blue-700">Scores</h4>
                        {formData.is_single_leg ? (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Home Score</Label>
                                    <Input 
                                        type="number" 
                                        value={formData.home_score_leg1} 
                                        onChange={(e) => updateField('home_score_leg1', e.target.value)}
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label>Away Score</Label>
                                    <Input 
                                        type="number" 
                                        value={formData.away_score_leg1} 
                                        onChange={(e) => updateField('away_score_leg1', e.target.value)}
                                        className="mt-1"
                                    />
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>1st Leg - Home</Label>
                                        <Input 
                                            type="number" 
                                            value={formData.home_score_leg1} 
                                            onChange={(e) => updateField('home_score_leg1', e.target.value)}
                                            className="mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label>1st Leg - Away</Label>
                                        <Input 
                                            type="number" 
                                            value={formData.away_score_leg1} 
                                            onChange={(e) => updateField('away_score_leg1', e.target.value)}
                                            className="mt-1"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>2nd Leg - Away (at Home team's stadium)</Label>
                                        <Input 
                                            type="number" 
                                            value={formData.away_score_leg2} 
                                            onChange={(e) => updateField('away_score_leg2', e.target.value)}
                                            className="mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label>2nd Leg - Home (away)</Label>
                                        <Input 
                                            type="number" 
                                            value={formData.home_score_leg2} 
                                            onChange={(e) => updateField('home_score_leg2', e.target.value)}
                                            className="mt-1"
                                        />
                                    </div>
                                </div>
                            </>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Penalties (if applicable)</Label>
                                <Input 
                                    value={formData.penalties} 
                                    onChange={(e) => updateField('penalties', e.target.value)}
                                    placeholder="e.g., 4-3"
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label>Winner</Label>
                                <Select value={formData.winner} onValueChange={(v) => updateField('winner', v)}>
                                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select winner" /></SelectTrigger>
                                    <SelectContent>
                                        {formData.home_club_name && <SelectItem value={formData.home_club_name}>{formData.home_club_name}</SelectItem>}
                                        {formData.away_club_name && <SelectItem value={formData.away_club_name}>{formData.away_club_name}</SelectItem>}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {formData.is_single_leg && (
                        <div>
                            <Label>Venue</Label>
                            <Input 
                                value={formData.venue} 
                                onChange={(e) => updateField('venue', e.target.value)}
                                placeholder="e.g., National Stadium, Capital City"
                                className="mt-1"
                            />
                        </div>
                    )}

                    <div>
                        <Label>Notes</Label>
                        <Textarea 
                            value={formData.notes} 
                            onChange={(e) => updateField('notes', e.target.value)}
                            rows={2}
                            className="mt-1"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={onClose}>Cancel</Button>
                        <Button 
                            onClick={handleSubmit} 
                            disabled={!formData.home_club_name || !formData.away_club_name || isPending}
                            className="bg-emerald-600 hover:bg-emerald-700"
                        >
                            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {editingMatch ? 'Save Changes' : 'Add Match'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}