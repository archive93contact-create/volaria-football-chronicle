import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Save, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export default function MatchLineupEditor({ match, isOpen, onClose }) {
    const queryClient = useQueryClient();
    const [homeLineupLeg1, setHomeLineupLeg1] = useState([]);
    const [awayLineupLeg1, setAwayLineupLeg1] = useState([]);
    const [homeSubsLeg1, setHomeSubsLeg1] = useState([]);
    const [awaySubsLeg1, setAwaySubsLeg1] = useState([]);
    const [goalsLeg1, setGoalsLeg1] = useState([]);
    const [substitutionsLeg1, setSubstitutionsLeg1] = useState([]);
    const [homeLineupLeg2, setHomeLineupLeg2] = useState([]);
    const [awayLineupLeg2, setAwayLineupLeg2] = useState([]);
    const [homeSubsLeg2, setHomeSubsLeg2] = useState([]);
    const [awaySubsLeg2, setAwaySubsLeg2] = useState([]);
    const [goalsLeg2, setGoalsLeg2] = useState([]);
    const [substitutionsLeg2, setSubstitutionsLeg2] = useState([]);

    // Fetch all clubs to look up club IDs from names
    const { data: clubs = [] } = useQuery({
        queryKey: ['allClubs'],
        queryFn: () => base44.entities.Club.list(),
    });

    // Get club IDs from names if not directly available
    const homeClubId = match?.home_club_id || clubs.find(c => c.name === match?.home_club_name)?.id;
    const awayClubId = match?.away_club_id || clubs.find(c => c.name === match?.away_club_name)?.id;

    const { data: homePlayers = [] } = useQuery({
        queryKey: ['players', homeClubId],
        queryFn: () => base44.entities.Player.filter({ club_id: homeClubId }).then(p => p.filter(pl => !pl.is_youth_player)),
        enabled: !!homeClubId,
    });

    const { data: awayPlayers = [] } = useQuery({
        queryKey: ['players', awayClubId],
        queryFn: () => base44.entities.Player.filter({ club_id: awayClubId }).then(p => p.filter(pl => !pl.is_youth_player)),
        enabled: !!awayClubId,
    });

    const { data: nations = [] } = useQuery({
        queryKey: ['nations'],
        queryFn: () => base44.entities.Nation.list(),
    });

    useEffect(() => {
        if (match) {
            setHomeLineupLeg1(match.home_lineup_leg1 || []);
            setAwayLineupLeg1(match.away_lineup_leg1 || []);
            setHomeSubsLeg1(match.home_subs_leg1 || []);
            setAwaySubsLeg1(match.away_subs_leg1 || []);
            setGoalsLeg1(match.goals_leg1 || []);
            setSubstitutionsLeg1(match.substitutions_leg1 || []);
            setHomeLineupLeg2(match.home_lineup_leg2 || []);
            setAwayLineupLeg2(match.away_lineup_leg2 || []);
            setHomeSubsLeg2(match.home_subs_leg2 || []);
            setAwaySubsLeg2(match.away_subs_leg2 || []);
            setGoalsLeg2(match.goals_leg2 || []);
            setSubstitutionsLeg2(match.substitutions_leg2 || []);
        }
    }, [match]);

    const updateMutation = useMutation({
        mutationFn: (data) => base44.entities.ContinentalMatch.update(match.id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['continentalMatches']);
            toast.success('Lineups saved');
            onClose();
        },
    });

    const handleSave = () => {
        updateMutation.mutate({
            home_lineup_leg1: homeLineupLeg1,
            away_lineup_leg1: awayLineupLeg1,
            home_subs_leg1: homeSubsLeg1,
            away_subs_leg1: awaySubsLeg1,
            goals_leg1: goalsLeg1,
            substitutions_leg1: substitutionsLeg1,
            home_lineup_leg2: homeLineupLeg2,
            away_lineup_leg2: awayLineupLeg2,
            home_subs_leg2: homeSubsLeg2,
            away_subs_leg2: awaySubsLeg2,
            goals_leg2: goalsLeg2,
            substitutions_leg2: substitutionsLeg2
        });
    };

    const addGoal = (isHome) => {
        setGoals([...goals, { player_id: '', minute: null, is_home: isHome }]);
    };

    const updateGoal = (index, field, value) => {
        const updated = [...goals];
        updated[index][field] = field === 'minute' ? parseInt(value) : value;
        setGoals(updated);
    };

    const removeGoal = (index) => {
        setGoals(goals.filter((_, i) => i !== index));
    };

    const addSubstitution = (isHome) => {
        setSubstitutions([...substitutions, { player_in_id: '', player_out_id: '', minute: null, is_home: isHome }]);
    };

    const updateSubstitution = (index, field, value) => {
        const updated = [...substitutions];
        updated[index][field] = field === 'minute' ? parseInt(value) : value;
        setSubstitutions(updated);
    };

    const removeSubstitution = (index) => {
        setSubstitutions(substitutions.filter((_, i) => i !== index));
    };

    const PlayerPicker = ({ value, onChange, players, placeholder, excludeIds = [] }) => {
        const [open, setOpen] = useState(false);
        const selectedPlayer = players.find(p => p.id === value);
        const availablePlayers = players.filter(p => !excludeIds.includes(p.id) || p.id === value);
        
        return (
            <div className="relative">
                <Button 
                    variant="outline" 
                    className="w-full justify-start text-left font-normal"
                    onClick={(e) => {
                        e.preventDefault();
                        setOpen(!open);
                    }}
                    type="button"
                >
                    {selectedPlayer ? (
                        <span className="flex items-center gap-2">
                            <span className="font-mono text-sm text-slate-600">{selectedPlayer.shirt_number}</span>
                            <span className="flex-1">{selectedPlayer.full_name}</span>
                            <Badge variant="outline" className="text-xs">{selectedPlayer.position}</Badge>
                            <span className="text-xs text-slate-500">Age {selectedPlayer.age}</span>
                            <Badge className="bg-emerald-600 text-white">{selectedPlayer.overall_rating}</Badge>
                        </span>
                    ) : (
                        <span className="text-slate-500">{placeholder}</span>
                    )}
                    {open ? <ChevronUp className="ml-2 w-4 h-4" /> : <ChevronDown className="ml-2 w-4 h-4" />}
                </Button>
                {open && (
                    <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {availablePlayers.length === 0 ? (
                            <div className="px-3 py-4 text-center text-slate-500 text-sm">
                                No players available
                            </div>
                        ) : (
                            availablePlayers.sort((a, b) => {
                                const posOrder = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST'];
                                const posA = posOrder.indexOf(a.position);
                                const posB = posOrder.indexOf(b.position);
                                if (posA !== posB) return posA - posB;
                                return (a.shirt_number || 99) - (b.shirt_number || 99);
                            }).map(player => {
                                const nation = nations.find(n => n.name === player.nationality);
                                return (
                                    <button
                                        key={player.id}
                                        type="button"
                                        className="w-full px-3 py-2 text-left hover:bg-emerald-50 flex items-center gap-2 border-b last:border-b-0"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            onChange(player.id);
                                            setOpen(false);
                                        }}
                                    >
                                        <span className="font-mono text-sm text-slate-500 w-8">{player.shirt_number}</span>
                                        <span className="flex-1 font-medium">{player.full_name}</span>
                                        <Badge variant="outline" className="text-xs">{player.position}</Badge>
                                        <span className="text-xs text-slate-500 w-12">Age {player.age}</span>
                                        <Badge className="bg-emerald-600 text-white text-xs">{player.overall_rating}</Badge>
                                        {nation?.flag_url && <img src={nation.flag_url} alt="" className="w-5 h-3 object-contain" />}
                                    </button>
                                );
                            })
                        )}
                    </div>
                )}
            </div>
        );
    };

    const LineupSelector = ({ lineup, setLineup, subs, setSubs, players, teamName }) => (
        <div className="space-y-4">
            <div>
                <div className="flex items-center justify-between mb-3">
                    <Label className="text-base font-semibold">Starting XI</Label>
                    <span className="text-sm text-slate-500">{lineup.length}/11</span>
                </div>
                <div className="space-y-2">
                    {lineup.map((playerId, index) => {
                        const player = players.find(p => p.id === playerId);
                        const nation = nations.find(n => n.name === player?.nationality);
                        return (
                            <div key={index} className="flex items-center gap-2">
                                <span className="text-sm text-slate-500 w-6">{index + 1}.</span>
                                <div className="flex-1">
                                    <PlayerPicker 
                                        value={playerId}
                                        onChange={(newId) => {
                                            const updated = [...lineup];
                                            updated[index] = newId;
                                            setLineup(updated);
                                        }}
                                        players={players}
                                        placeholder={`Select player ${index + 1}`}
                                        excludeIds={[...lineup, ...subs].filter(id => id !== playerId)}
                                    />
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => setLineup(lineup.filter((_, i) => i !== index))}>
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                            </div>
                        );
                    })}
                    {lineup.length < 11 && (
                        <Button variant="outline" size="sm" onClick={() => setLineup([...lineup, ''])}>
                            <Plus className="w-4 h-4 mr-2" /> Add Player
                        </Button>
                    )}
                </div>
            </div>

            <div>
                <div className="flex items-center justify-between mb-3">
                    <Label className="text-base font-semibold">Substitutes</Label>
                    <span className="text-sm text-slate-500">{subs.length} players</span>
                </div>
                <div className="space-y-2">
                    {subs.map((playerId, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <span className="text-sm text-slate-500 w-6">S{index + 1}.</span>
                            <div className="flex-1">
                                <PlayerPicker 
                                    value={playerId}
                                    onChange={(newId) => {
                                        const updated = [...subs];
                                        updated[index] = newId;
                                        setSubs(updated);
                                    }}
                                    players={players}
                                    placeholder={`Select substitute ${index + 1}`}
                                    excludeIds={[...lineup, ...subs].filter(id => id !== playerId)}
                                />
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setSubs(subs.filter((_, i) => i !== index))}>
                                <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                        </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => setSubs([...subs, ''])}>
                        <Plus className="w-4 h-4 mr-2" /> Add Substitute
                    </Button>
                </div>
            </div>
        </div>
    );

    const EventsEditor = ({ goals, setGoals, substitutions, setSubstitutions, homePlayers, awayPlayers }) => (
        <div className="space-y-6">
            <div>
                <div className="flex items-center justify-between mb-3">
                    <Label className="text-base font-semibold">Goals</Label>
                </div>
                <div className="space-y-3">
                    {goals.map((goal, index) => {
                        const players = goal.is_home ? homePlayers : awayPlayers;
                        return (
                            <div key={index} className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                                <div className="flex-1">
                                    <PlayerPicker 
                                        value={goal.player_id}
                                        onChange={(id) => updateGoal(index, 'player_id', id)}
                                        players={players}
                                        placeholder="Select scorer"
                                    />
                                </div>
                                <Input 
                                    type="number" 
                                    placeholder="Min" 
                                    value={goal.minute || ''} 
                                    onChange={(e) => updateGoal(index, 'minute', e.target.value)}
                                    className="w-20"
                                />
                                <Badge>{goal.is_home ? match.home_club_name : match.away_club_name}</Badge>
                                <Button variant="ghost" size="sm" onClick={() => removeGoal(index)}>
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                            </div>
                        );
                    })}
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => addGoal(true)}>
                            <Plus className="w-4 h-4 mr-2" /> {match.home_club_name} Goal
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => addGoal(false)}>
                            <Plus className="w-4 h-4 mr-2" /> {match.away_club_name} Goal
                        </Button>
                    </div>
                </div>
            </div>

            <div>
                <div className="flex items-center justify-between mb-3">
                    <Label className="text-base font-semibold">Substitutions</Label>
                </div>
                <div className="space-y-3">
                    {substitutions.map((sub, index) => {
                        const players = sub.is_home ? homePlayers : awayPlayers;
                        return (
                            <div key={index} className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                                <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-green-600 w-8">IN:</span>
                                        <PlayerPicker 
                                            value={sub.player_in_id}
                                            onChange={(id) => updateSubstitution(index, 'player_in_id', id)}
                                            players={players}
                                            placeholder="Player in"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-red-600 w-8">OUT:</span>
                                        <PlayerPicker 
                                            value={sub.player_out_id}
                                            onChange={(id) => updateSubstitution(index, 'player_out_id', id)}
                                            players={players}
                                            placeholder="Player out"
                                        />
                                    </div>
                                </div>
                                <Input 
                                    type="number" 
                                    placeholder="Min" 
                                    value={sub.minute || ''} 
                                    onChange={(e) => updateSubstitution(index, 'minute', e.target.value)}
                                    className="w-20"
                                />
                                <Badge>{sub.is_home ? match.home_club_name : match.away_club_name}</Badge>
                                <Button variant="ghost" size="sm" onClick={() => removeSubstitution(index)}>
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                            </div>
                        );
                    })}
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => addSubstitution(true)}>
                            <Plus className="w-4 h-4 mr-2" /> {match.home_club_name} Sub
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => addSubstitution(false)}>
                            <Plus className="w-4 h-4 mr-2" /> {match.away_club_name} Sub
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );

    if (!match) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        Match Lineup - {match.home_club_name} vs {match.away_club_name}
                    </DialogTitle>
                </DialogHeader>
                <Tabs defaultValue={match.is_single_leg ? "leg1" : "leg1"} className="space-y-4">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="leg1">
                            {match.is_single_leg ? "Match" : "Leg 1"}
                        </TabsTrigger>
                        {!match.is_single_leg && (
                            <TabsTrigger value="leg2">Leg 2</TabsTrigger>
                        )}
                    </TabsList>

                    <TabsContent value="leg1">
                        <Tabs defaultValue="home" className="space-y-4">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="home">{match.home_club_name}</TabsTrigger>
                                <TabsTrigger value="away">{match.away_club_name}</TabsTrigger>
                                <TabsTrigger value="events">Goals & Subs</TabsTrigger>
                            </TabsList>

                            <TabsContent value="home">
                                <LineupSelector 
                                    lineup={homeLineupLeg1}
                                    setLineup={setHomeLineupLeg1}
                                    subs={homeSubsLeg1}
                                    setSubs={setHomeSubsLeg1}
                                    players={homePlayers}
                                    teamName={match.home_club_name}
                                />
                            </TabsContent>

                            <TabsContent value="away">
                                <LineupSelector 
                                    lineup={awayLineupLeg1}
                                    setLineup={setAwayLineupLeg1}
                                    subs={awaySubsLeg1}
                                    setSubs={setAwaySubsLeg1}
                                    players={awayPlayers}
                                    teamName={match.away_club_name}
                                />
                            </TabsContent>

                            <TabsContent value="events">
                                <EventsEditor 
                                    goals={goalsLeg1}
                                    setGoals={setGoalsLeg1}
                                    substitutions={substitutionsLeg1}
                                    setSubstitutions={setSubstitutionsLeg1}
                                    homePlayers={homePlayers}
                                    awayPlayers={awayPlayers}
                                />
                            </TabsContent>
                        </Tabs>
                    </TabsContent>

                    {!match.is_single_leg && (
                        <TabsContent value="leg2">
                            <Tabs defaultValue="home" className="space-y-4">
                                <TabsList className="grid w-full grid-cols-3">
                                    <TabsTrigger value="home">{match.home_club_name}</TabsTrigger>
                                    <TabsTrigger value="away">{match.away_club_name}</TabsTrigger>
                                    <TabsTrigger value="events">Goals & Subs</TabsTrigger>
                                </TabsList>

                                <TabsContent value="home">
                                    <LineupSelector 
                                        lineup={homeLineupLeg2}
                                        setLineup={setHomeLineupLeg2}
                                        subs={homeSubsLeg2}
                                        setSubs={setHomeSubsLeg2}
                                        players={homePlayers}
                                        teamName={match.home_club_name}
                                    />
                                </TabsContent>

                                <TabsContent value="away">
                                    <LineupSelector 
                                        lineup={awayLineupLeg2}
                                        setLineup={setAwayLineupLeg2}
                                        subs={awaySubsLeg2}
                                        setSubs={setAwaySubsLeg2}
                                        players={awayPlayers}
                                        teamName={match.away_club_name}
                                    />
                                </TabsContent>

                                <TabsContent value="events">
                                    <EventsEditor 
                                        goals={goalsLeg2}
                                        setGoals={setGoalsLeg2}
                                        substitutions={substitutionsLeg2}
                                        setSubstitutions={setSubstitutionsLeg2}
                                        homePlayers={homePlayers}
                                        awayPlayers={awayPlayers}
                                    />
                                </TabsContent>
                            </Tabs>
                        </TabsContent>
                    )}
                </Tabs>

                <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave} disabled={updateMutation.isPending} className="bg-emerald-600">
                        <Save className="w-4 h-4 mr-2" /> Save Lineups
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}