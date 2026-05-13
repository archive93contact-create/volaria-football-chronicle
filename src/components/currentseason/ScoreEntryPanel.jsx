import React, { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Save, Edit2, Check, X, Trophy, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function ScoreEntryPanel({ season, league, matches, clubs }) {
    const [selectedMatchday, setSelectedMatchday] = useState('');
    const [editingScores, setEditingScores] = useState({}); // matchId -> {home, away}
    const queryClient = useQueryClient();

    const matchdays = [...new Set(matches.map(m => m.matchday).filter(Boolean))].sort((a, b) => a - b);
    const unplayedMatchdays = matchdays.filter(md => {
        const mdMatches = matches.filter(m => m.matchday === md);
        return mdMatches.some(m => m.home_score === null || m.home_score === undefined);
    });
    const currentMatchday = selectedMatchday || (unplayedMatchdays[0]?.toString() || matchdays[0]?.toString() || '');

    const matchdayMatches = matches.filter(m => m.matchday === parseInt(currentMatchday));

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.Match.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['allMatches'] });
        },
    });

    const handleEditScore = (matchId, homeScore, awayScore) => {
        setEditingScores(prev => ({
            ...prev,
            [matchId]: {
                home: homeScore !== null && homeScore !== undefined ? String(homeScore) : '',
                away: awayScore !== null && awayScore !== undefined ? String(awayScore) : '',
            }
        }));
    };

    const handleSaveScore = async (match) => {
        const scores = editingScores[match.id];
        if (!scores) return;
        const homeScore = parseInt(scores.home);
        const awayScore = parseInt(scores.away);
        if (isNaN(homeScore) || isNaN(awayScore)) {
            toast.error('Please enter valid scores');
            return;
        }
        await updateMutation.mutateAsync({
            id: match.id,
            data: { home_score: homeScore, away_score: awayScore }
        });
        setEditingScores(prev => {
            const next = { ...prev };
            delete next[match.id];
            return next;
        });
        toast.success('Score saved!');
    };

    const handleSaveAllScores = async () => {
        const entries = Object.entries(editingScores);
        if (entries.length === 0) return;
        for (const [matchId, scores] of entries) {
            const homeScore = parseInt(scores.home);
            const awayScore = parseInt(scores.away);
            if (!isNaN(homeScore) && !isNaN(awayScore)) {
                await updateMutation.mutateAsync({ id: matchId, data: { home_score: homeScore, away_score: awayScore } });
            }
        }
        setEditingScores({});
        toast.success(`Saved ${entries.length} results!`);
    };

    const playedCount = matchdayMatches.filter(m => m.home_score !== null).length;
    const totalCount = matchdayMatches.length;

    return (
        <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                    <span className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-blue-500" />
                        Score Entry — {league?.name} {season?.year}
                    </span>
                    {Object.keys(editingScores).length > 0 && (
                        <Button size="sm" onClick={handleSaveAllScores} className="bg-emerald-600 hover:bg-emerald-700">
                            <Save className="w-4 h-4 mr-1" /> Save All
                        </Button>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Matchday selector */}
                <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-600">Matchday:</span>
                    <div className="flex gap-1 flex-wrap">
                        {matchdays.map(md => {
                            const mdMatches = matches.filter(m => m.matchday === md);
                            const allPlayed = mdMatches.every(m => m.home_score !== null);
                            return (
                                <button
                                    key={md}
                                    onClick={() => setSelectedMatchday(String(md))}
                                    className={`w-8 h-8 rounded text-xs font-bold transition-colors ${
                                        currentMatchday === String(md)
                                            ? 'bg-emerald-600 text-white'
                                            : allPlayed
                                                ? 'bg-slate-200 text-slate-500'
                                                : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                    }`}
                                >
                                    {md}
                                </button>
                            );
                        })}
                    </div>
                    {totalCount > 0 && (
                        <Badge variant="outline" className="ml-auto text-xs">
                            {playedCount}/{totalCount} played
                        </Badge>
                    )}
                </div>

                {/* Match list for selected matchday */}
                {matchdayMatches.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-4">No fixtures for this matchday</p>
                ) : (
                    <div className="space-y-2">
                        {matchdayMatches.map(match => {
                            const isEditing = !!editingScores[match.id];
                            const hasScore = match.home_score !== null && match.home_score !== undefined;
                            const homeClub = clubs.find(c => c.id === match.home_club_id);
                            const awayClub = clubs.find(c => c.id === match.away_club_id);

                            return (
                                <div key={match.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${hasScore && !isEditing ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-300'}`}>
                                    {/* Home */}
                                    <div className="flex items-center gap-2 flex-1 justify-end">
                                        {homeClub?.logo_url && <img src={homeClub.logo_url} alt="" className="w-5 h-5 object-contain" />}
                                        <span className="text-sm font-medium truncate max-w-[100px]">{match.home_club_name}</span>
                                    </div>

                                    {/* Score */}
                                    {isEditing ? (
                                        <div className="flex items-center gap-1 shrink-0">
                                            <Input
                                                type="number"
                                                min="0"
                                                max="99"
                                                value={editingScores[match.id].home}
                                                onChange={e => setEditingScores(prev => ({ ...prev, [match.id]: { ...prev[match.id], home: e.target.value } }))}
                                                className="w-12 h-8 text-center text-sm p-1"
                                            />
                                            <span className="text-slate-400">-</span>
                                            <Input
                                                type="number"
                                                min="0"
                                                max="99"
                                                value={editingScores[match.id].away}
                                                onChange={e => setEditingScores(prev => ({ ...prev, [match.id]: { ...prev[match.id], away: e.target.value } }))}
                                                className="w-12 h-8 text-center text-sm p-1"
                                            />
                                        </div>
                                    ) : (
                                        <div className="text-sm font-bold text-center shrink-0 w-16">
                                            {hasScore ? (
                                                <span className="bg-slate-800 text-white px-2 py-1 rounded">
                                                    {match.home_score} – {match.away_score}
                                                </span>
                                            ) : (
                                                <span className="text-slate-300">vs</span>
                                            )}
                                        </div>
                                    )}

                                    {/* Away */}
                                    <div className="flex items-center gap-2 flex-1">
                                        <span className="text-sm font-medium truncate max-w-[100px]">{match.away_club_name}</span>
                                        {awayClub?.logo_url && <img src={awayClub.logo_url} alt="" className="w-5 h-5 object-contain" />}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-1 shrink-0">
                                        {isEditing ? (
                                            <>
                                                <Button size="sm" variant="ghost" className="w-7 h-7 p-0 text-emerald-600" onClick={() => handleSaveScore(match)}>
                                                    <Check className="w-4 h-4" />
                                                </Button>
                                                <Button size="sm" variant="ghost" className="w-7 h-7 p-0 text-slate-400" onClick={() => setEditingScores(prev => { const n = {...prev}; delete n[match.id]; return n; })}>
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </>
                                        ) : (
                                            <Button size="sm" variant="ghost" className="w-7 h-7 p-0 text-slate-400 hover:text-slate-600" onClick={() => handleEditScore(match.id, match.home_score, match.away_score)}>
                                                <Edit2 className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}