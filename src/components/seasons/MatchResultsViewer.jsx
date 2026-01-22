import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CalendarDays, ChevronRight, Save, Plus, X, Edit2, Shield } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AdminOnly from '@/components/common/AdminOnly';

export default function MatchResultsViewer({ seasonId, leagueId, seasonYear, clubs = [] }) {
    const [selectedMatch, setSelectedMatch] = React.useState(null);
    const [selectedMatchday, setSelectedMatchday] = React.useState('all');
    const [isEditing, setIsEditing] = React.useState(false);
    const [editData, setEditData] = React.useState({});
    const queryClient = useQueryClient();

    const { data: matches = [], isLoading } = useQuery({
        queryKey: ['matches', seasonId],
        queryFn: () => base44.entities.Match.filter({ season_id: seasonId }, 'matchday'),
        enabled: !!seasonId,
    });

    const updateMatchMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.Match.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['matches', seasonId] });
            setIsEditing(false);
            setSelectedMatch(null);
        },
    });

    if (isLoading) {
        return <Loader2 className="w-5 h-5 animate-spin" />;
    }

    if (matches.length === 0) {
        return null;
    }

    // Group by matchday
    const matchesByDay = matches.reduce((acc, match) => {
        const day = match.matchday || 1;
        if (!acc[day]) acc[day] = [];
        acc[day].push(match);
        return acc;
    }, {});

    const matchdays = Object.keys(matchesByDay).map(Number).sort((a, b) => a - b);
    
    // Filter matches by selected matchday
    const filteredMatchdays = selectedMatchday === 'all' 
        ? matchdays 
        : [parseInt(selectedMatchday)].filter(md => matchdays.includes(md));

    const handleEditMatch = (match) => {
        setEditData({
            ...match,
            goalscorers: match.goalscorers || [],
        });
        setIsEditing(true);
    };

    const handleSaveMatch = () => {
        updateMatchMutation.mutate({
            id: selectedMatch.id,
            data: {
                ...editData,
                home_score: parseInt(editData.home_score) || 0,
                away_score: parseInt(editData.away_score) || 0,
                attendance: editData.attendance ? parseInt(editData.attendance) : null,
            }
        });
    };

    const addGoalscorer = () => {
        setEditData({
            ...editData,
            goalscorers: [
                ...(editData.goalscorers || []),
                { player_name: '', minute: 0, is_home: true }
            ]
        });
    };

    const removeGoalscorer = (index) => {
        const newGoalscorers = [...(editData.goalscorers || [])];
        newGoalscorers.splice(index, 1);
        setEditData({ ...editData, goalscorers: newGoalscorers });
    };

    const updateGoalscorer = (index, field, value) => {
        const newGoalscorers = [...(editData.goalscorers || [])];
        newGoalscorers[index] = { ...newGoalscorers[index], [field]: value };
        setEditData({ ...editData, goalscorers: newGoalscorers });
    };

    return (
        <Card className="border-0 shadow-sm mt-6">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                    <CalendarDays className="w-5 h-5" />
                    Match Results ({matches.length} fixtures)
                </CardTitle>
                <Select value={selectedMatchday} onValueChange={setSelectedMatchday}>
                    <SelectTrigger className="w-48">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Matchdays</SelectItem>
                        {matchdays.map(day => (
                            <SelectItem key={day} value={String(day)}>Matchday {day}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {filteredMatchdays.map(day => (
                        <div key={day}>
                            <h3 className="font-semibold text-sm text-slate-600 mb-3">Matchday {day}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {matchesByDay[day].map((match, idx) => (
                                    <button 
                                        key={idx}
                                        onClick={() => setSelectedMatch(match)}
                                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border hover:border-emerald-300 hover:bg-white transition-all cursor-pointer w-full group"
                                    >
                                        <div className="flex-1 text-right pr-4">
                                            <span className="font-medium">{match.home_club_name}</span>
                                        </div>
                                        <div className="flex items-center gap-2 px-4 py-1 bg-white rounded-lg border-2 min-w-[80px] justify-center group-hover:border-emerald-400 transition-colors">
                                            <span className="text-lg font-bold">{match.home_score}</span>
                                            <span className="text-slate-400">-</span>
                                            <span className="text-lg font-bold">{match.away_score}</span>
                                        </div>
                                        <div className="flex-1 pl-4 flex items-center gap-2">
                                            <span className="font-medium">{match.away_club_name}</span>
                                            <ChevronRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>

            {/* Match Detail Dialog */}
            <Dialog open={!!selectedMatch} onOpenChange={(open) => {
                if (!open) {
                    setSelectedMatch(null);
                    setIsEditing(false);
                }
            }}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <div className="flex items-center justify-between">
                            <DialogTitle>Match Details - Matchday {selectedMatch?.matchday}</DialogTitle>
                            <AdminOnly>
                                {!isEditing && (
                                    <Button variant="outline" size="sm" onClick={() => handleEditMatch(selectedMatch)}>
                                        <Edit2 className="w-4 h-4 mr-2" /> Edit
                                    </Button>
                                )}
                            </AdminOnly>
                        </div>
                    </DialogHeader>
                    {selectedMatch && (
                        <div className="space-y-6 py-4">
                            {/* Score Display */}
                            <div className="flex items-center justify-center gap-8 p-6 bg-slate-50 rounded-lg">
                                <div className="text-center flex-1">
                                    <div className="flex flex-col items-center gap-2">
                                        {(() => {
                                            const homeClub = clubs.find(c => c.id === selectedMatch.home_club_id || c.name === selectedMatch.home_club_name);
                                            return homeClub?.logo_url && (
                                                <img src={homeClub.logo_url} alt={selectedMatch.home_club_name} className="w-16 h-16 object-contain bg-white rounded-lg p-2" />
                                            );
                                        })()}
                                        <div className="text-2xl font-bold text-slate-900">{selectedMatch.home_club_name}</div>
                                        <div className="text-sm text-slate-500">Home</div>
                                    </div>
                                </div>
                                {isEditing ? (
                                    <div className="flex items-center gap-2">
                                        <Input 
                                            type="number" 
                                            value={editData.home_score} 
                                            onChange={(e) => setEditData({...editData, home_score: e.target.value})}
                                            className="w-20 text-center text-2xl font-bold"
                                        />
                                        <span className="text-2xl text-slate-400">-</span>
                                        <Input 
                                            type="number" 
                                            value={editData.away_score} 
                                            onChange={(e) => setEditData({...editData, away_score: e.target.value})}
                                            className="w-20 text-center text-2xl font-bold"
                                        />
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-4 px-6 py-4 bg-white rounded-xl border-2 shadow-sm">
                                        <span className="text-4xl font-bold">{selectedMatch.home_score}</span>
                                        <span className="text-2xl text-slate-400">-</span>
                                        <span className="text-4xl font-bold">{selectedMatch.away_score}</span>
                                    </div>
                                )}
                                <div className="text-center flex-1">
                                    <div className="flex flex-col items-center gap-2">
                                        {(() => {
                                            const awayClub = clubs.find(c => c.id === selectedMatch.away_club_id || c.name === selectedMatch.away_club_name);
                                            return awayClub?.logo_url && (
                                                <img src={awayClub.logo_url} alt={selectedMatch.away_club_name} className="w-16 h-16 object-contain bg-white rounded-lg p-2" />
                                            );
                                        })()}
                                        <div className="text-2xl font-bold text-slate-900">{selectedMatch.away_club_name}</div>
                                        <div className="text-sm text-slate-500">Away</div>
                                    </div>
                                </div>
                            </div>

                            {/* Match Details */}
                            {isEditing ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label>Stadium</Label>
                                            <Input 
                                                value={editData.stadium || ''} 
                                                onChange={(e) => setEditData({...editData, stadium: e.target.value})}
                                                className="mt-1"
                                            />
                                        </div>
                                        <div>
                                            <Label>Attendance</Label>
                                            <Input 
                                                type="number"
                                                value={editData.attendance || ''} 
                                                onChange={(e) => setEditData({...editData, attendance: e.target.value})}
                                                className="mt-1"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-4">
                                    {selectedMatch.match_date && (
                                        <div className="p-3 bg-slate-50 rounded-lg">
                                            <div className="text-xs text-slate-500">Date</div>
                                            <div className="font-medium">{new Date(selectedMatch.match_date).toLocaleDateString()}</div>
                                        </div>
                                    )}
                                    {selectedMatch.stadium && (
                                        <div className="p-3 bg-slate-50 rounded-lg">
                                            <div className="text-xs text-slate-500">Venue</div>
                                            <div className="font-medium">{selectedMatch.stadium}</div>
                                        </div>
                                    )}
                                    {selectedMatch.attendance && (
                                        <div className="p-3 bg-slate-50 rounded-lg">
                                            <div className="text-xs text-slate-500">Attendance</div>
                                            <div className="font-medium">{selectedMatch.attendance.toLocaleString()}</div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Goalscorers */}
                            {isEditing ? (
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-semibold">⚽ Goals</h4>
                                        <Button size="sm" variant="outline" onClick={addGoalscorer}>
                                            <Plus className="w-4 h-4 mr-1" /> Add Goal
                                        </Button>
                                    </div>
                                    <div className="space-y-2">
                                        {(editData.goalscorers || []).map((goal, idx) => (
                                            <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 rounded">
                                                <Input 
                                                    type="number"
                                                    placeholder="Min"
                                                    value={goal.minute}
                                                    onChange={(e) => updateGoalscorer(idx, 'minute', parseInt(e.target.value) || 0)}
                                                    className="w-20"
                                                />
                                                <Input 
                                                    placeholder="Player name"
                                                    value={goal.player_name}
                                                    onChange={(e) => updateGoalscorer(idx, 'player_name', e.target.value)}
                                                    className="flex-1"
                                                />
                                                <Select 
                                                    value={goal.is_home ? 'home' : 'away'} 
                                                    onValueChange={(v) => updateGoalscorer(idx, 'is_home', v === 'home')}
                                                >
                                                    <SelectTrigger className="w-32">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="home">Home</SelectItem>
                                                        <SelectItem value="away">Away</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <Button size="sm" variant="ghost" onClick={() => removeGoalscorer(idx)}>
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                selectedMatch.goalscorers && selectedMatch.goalscorers.length > 0 && (
                                    <div>
                                        <h4 className="font-semibold mb-2">⚽ Goals</h4>
                                        <div className="space-y-2">
                                            {selectedMatch.goalscorers.map((goal, idx) => (
                                                <div key={idx} className="flex items-center gap-3 p-2 bg-slate-50 rounded">
                                                    <Badge variant="outline" className="min-w-[50px] justify-center">
                                                        {goal.minute}'
                                                    </Badge>
                                                    <span className="font-medium">{goal.player_name}</span>
                                                    <span className="text-slate-500 text-sm">
                                                        ({goal.is_home ? selectedMatch.home_club_name : selectedMatch.away_club_name})
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )
                            )}

                            {/* Match Report */}
                            {selectedMatch.match_report && (
                                <div>
                                    <h4 className="font-semibold mb-2">Match Report</h4>
                                    <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">
                                        {selectedMatch.match_report}
                                    </p>
                                </div>
                            )}

                            {/* Special Badges */}
                            <div className="flex gap-2 flex-wrap">
                                {selectedMatch.is_derby && (
                                    <Badge className="bg-red-100 text-red-700">Derby Match</Badge>
                                )}
                                {selectedMatch.is_title_decider && (
                                    <Badge className="bg-amber-100 text-amber-700">Title Decider</Badge>
                                )}
                            </div>

                            {selectedMatch.notes && (
                                <div className="text-sm text-slate-500 italic">
                                    {selectedMatch.notes}
                                </div>
                            )}

                            {/* Save/Cancel Buttons */}
                            {isEditing && (
                                <div className="flex justify-end gap-2 pt-4 border-t">
                                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                                        <X className="w-4 h-4 mr-2" /> Cancel
                                    </Button>
                                    <Button onClick={handleSaveMatch} disabled={updateMatchMutation.isPending}>
                                        {updateMatchMutation.isPending ? (
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        ) : (
                                            <Save className="w-4 h-4 mr-2" />
                                        )}
                                        Save Changes
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </Card>
    );
}