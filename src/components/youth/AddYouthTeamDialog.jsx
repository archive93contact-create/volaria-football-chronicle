import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function AddYouthTeamDialog({ club, open, onOpenChange }) {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        name: `${club.name} U-19`,
        age_group: 'U-19',
        league_id: '',
        manager: '',
        home_ground: ''
    });

    const { data: youthLeagues = [] } = useQuery({
        queryKey: ['youthLeagues', club.nation_id],
        queryFn: async () => {
            const allLeagues = await base44.entities.League.list() || [];
            return allLeagues.filter(l => l.nation_id === club.nation_id && l.league_type === 'youth');
        },
    });

    const createMutation = useMutation({
        mutationFn: async (data) => {
            return await base44.entities.YouthTeam.create({
                parent_club_id: club.id,
                ...data
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['youthTeams']);
            toast.success('Youth team created successfully');
            onOpenChange(false);
            setFormData({
                name: `${club.name} U-19`,
                age_group: 'U-19',
                league_id: '',
                manager: '',
                home_ground: ''
            });
        },
        onError: (error) => {
            toast.error('Failed to create youth team');
            console.error(error);
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.name || !formData.age_group) {
            toast.error('Please fill in required fields');
            return;
        }
        createMutation.mutate(formData);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add Youth Team</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div>
                        <Label>Team Name *</Label>
                        <Input
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g., Manchester United U-19"
                            className="mt-1"
                        />
                    </div>
                    <div>
                        <Label>Age Group *</Label>
                        <Select
                            value={formData.age_group}
                            onValueChange={(v) => setFormData({ ...formData, age_group: v })}
                        >
                            <SelectTrigger className="mt-1">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="U-23">U-23</SelectItem>
                                <SelectItem value="U-21">U-21</SelectItem>
                                <SelectItem value="U-19">U-19</SelectItem>
                                <SelectItem value="U-18">U-18</SelectItem>
                                <SelectItem value="U-17">U-17</SelectItem>
                                <SelectItem value="U-16">U-16</SelectItem>
                                <SelectItem value="U-15">U-15</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>Youth League</Label>
                        <Select
                            value={formData.league_id}
                            onValueChange={(v) => setFormData({ ...formData, league_id: v })}
                        >
                            <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Select league (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={null}>None</SelectItem>
                                {youthLeagues.map(league => (
                                    <SelectItem key={league.id} value={league.id}>
                                        {league.name} ({league.age_group})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>Manager</Label>
                        <Input
                            value={formData.manager}
                            onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                            placeholder="Youth team coach"
                            className="mt-1"
                        />
                    </div>
                    <div>
                        <Label>Home Ground</Label>
                        <Input
                            value={formData.home_ground}
                            onChange={(e) => setFormData({ ...formData, home_ground: e.target.value })}
                            placeholder="Training ground or stadium"
                            className="mt-1"
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="bg-indigo-600 hover:bg-indigo-700"
                            disabled={createMutation.isPending}
                        >
                            {createMutation.isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-2" />
                                    Create Youth Team
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}