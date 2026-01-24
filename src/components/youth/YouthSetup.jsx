import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Users, Trophy, Plus } from 'lucide-react';
import { Button } from "@/components/ui/button";
import YouthTeamCard from './YouthTeamCard';
import YouthTeamHistory from './YouthTeamHistory';
import AdminOnly from '@/components/common/AdminOnly';
import AddYouthTeamDialog from './AddYouthTeamDialog';

export default function YouthSetup({ club }) {
    const [selectedTeamId, setSelectedTeamId] = useState(null);
    const [addDialogOpen, setAddDialogOpen] = useState(false);

    const { data: youthTeams = [] } = useQuery({
        queryKey: ['youthTeams', club.id],
        queryFn: async () => {
            return await base44.entities.YouthTeam.filter({ parent_club_id: club.id }) || [];
        },
    });

    const { data: allLeagues = [] } = useQuery({
        queryKey: ['allLeagues'],
        queryFn: async () => await base44.entities.League.list() || [],
    });

    const { data: allSeasons = [] } = useQuery({
        queryKey: ['allSeasons'],
        queryFn: async () => await base44.entities.Season.list() || [],
    });

    const selectedTeam = youthTeams.find(t => t.id === selectedTeamId);
    const youthLeagues = allLeagues.filter(l => l.league_type === 'youth');
    const totalYouthTrophies = youthTeams.reduce((sum, t) => 
        sum + (t.youth_league_titles || 0) + (t.youth_cup_titles || 0), 0
    );

    return (
        <div className="space-y-6">
            {/* Overview Header */}
            <Card className="border-0 shadow-sm bg-gradient-to-br from-indigo-50 to-blue-50">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Users className="w-8 h-8 text-indigo-600" />
                            <div>
                                <CardTitle>Youth Setup</CardTitle>
                                <p className="text-sm text-slate-600 mt-1">
                                    Academy development and youth teams
                                </p>
                            </div>
                        </div>
                        <AdminOnly>
                            <Button
                                size="sm"
                                className="bg-indigo-600 hover:bg-indigo-700"
                                onClick={() => setAddDialogOpen(true)}
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Youth Team
                            </Button>
                        </AdminOnly>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="p-4 bg-white rounded-lg text-center">
                            <Users className="w-6 h-6 text-indigo-500 mx-auto mb-2" />
                            <div className="text-2xl font-bold text-indigo-700">{youthTeams.length}</div>
                            <div className="text-xs text-slate-600">Youth Teams</div>
                        </div>
                        <div className="p-4 bg-white rounded-lg text-center">
                            <Trophy className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                            <div className="text-2xl font-bold text-amber-700">{totalYouthTrophies}</div>
                            <div className="text-xs text-slate-600">Youth Trophies</div>
                        </div>
                        <div className="p-4 bg-white rounded-lg text-center">
                            {club.youth_academy_rating ? (
                                <>
                                    <div className="flex justify-center mb-2">
                                        {[...Array(5)].map((_, i) => (
                                            <span key={i} className={i < club.youth_academy_rating ? 'text-amber-400' : 'text-slate-300'}>
                                                ★
                                            </span>
                                        ))}
                                    </div>
                                    <div className="text-xs text-slate-600">Academy Rating</div>
                                </>
                            ) : (
                                <div className="text-sm text-slate-500">No academy</div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {youthTeams.length === 0 ? (
                <Card className="border-dashed border-2 border-slate-300">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <Users className="w-16 h-16 text-slate-300 mb-4" />
                        <h3 className="text-xl font-semibold text-slate-700 mb-2">No Youth Teams</h3>
                        <p className="text-slate-500 mb-4">Set up your youth development structure</p>
                        <AdminOnly>
                            <Button
                                className="bg-indigo-600 hover:bg-indigo-700"
                                onClick={() => setAddDialogOpen(true)}
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Create First Youth Team
                            </Button>
                        </AdminOnly>
                    </CardContent>
                </Card>
            ) : (
                <>
                    {/* Youth Teams Grid */}
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-4">Youth Teams</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {youthTeams.map(team => {
                                const league = allLeagues.find(l => l.id === team.league_id);
                                return (
                                    <div 
                                        key={team.id} 
                                        onClick={() => setSelectedTeamId(team.id)}
                                        className="cursor-pointer"
                                    >
                                        <YouthTeamCard youthTeam={team} league={league} />
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Selected Team Details */}
                    {selectedTeam && (
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-slate-900">
                                    {selectedTeam.name} - Detailed History
                                </h3>
                                <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                                    <SelectTrigger className="w-64">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {youthTeams.map(team => (
                                            <SelectItem key={team.id} value={team.id}>
                                                {team.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <YouthTeamHistory 
                                youthTeam={selectedTeam} 
                                seasons={allSeasons}
                                allLeagues={allLeagues}
                            />
                        </div>
                    )}
                </>
            )}

            <AdminOnly>
                <AddYouthTeamDialog
                    club={club}
                    open={addDialogOpen}
                    onOpenChange={setAddDialogOpen}
                />
            </AdminOnly>
        </div>
    );
}