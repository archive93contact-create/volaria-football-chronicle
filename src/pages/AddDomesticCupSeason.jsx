import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { ChevronRight, Trophy, Plus, Trash2, Save, Loader2, Users, Check } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from '@/components/common/PageHeader';

// Standard knockout round names based on team count
const ROUND_NAMES = {
    2: ['Final'],
    4: ['Semi-final', 'Final'],
    8: ['Quarter-final', 'Semi-final', 'Final'],
    16: ['Round of 16', 'Quarter-final', 'Semi-final', 'Final'],
    32: ['Round of 32', 'Round of 16', 'Quarter-final', 'Semi-final', 'Final'],
    64: ['Round of 64', 'Round of 32', 'Round of 16', 'Quarter-final', 'Semi-final', 'Final'],
    128: ['Round of 128', 'Round of 64', 'Round of 32', 'Round of 16', 'Quarter-final', 'Semi-final', 'Final'],
};

// Get closest power of 2 that's >= n
const getClosestPowerOf2 = (n) => {
    let power = 2;
    while (power < n) power *= 2;
    return power;
};

export default function AddDomesticCupSeason() {
    const urlParams = new URLSearchParams(window.location.search);
    const cupId = urlParams.get('cup_id');
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [seasonData, setSeasonData] = useState({
        year: '',
        number_of_teams: '',
        final_venue: '',
        top_scorer: '',
        notes: ''
    });
    
    const [selectedClubIds, setSelectedClubIds] = useState([]);
    const [selectedTiers, setSelectedTiers] = useState([]);
    const [bracketMatches, setBracketMatches] = useState([]);
    const [activeTab, setActiveTab] = useState('setup');
    const [searchTerm, setSearchTerm] = useState('');

    const { data: cup } = useQuery({
        queryKey: ['cup', cupId],
        queryFn: async () => {
            const cups = await base44.entities.DomesticCup.filter({ id: cupId });
            return cups[0];
        },
        enabled: !!cupId,
    });

    const { data: nation } = useQuery({
        queryKey: ['cupNation', cup?.nation_id],
        queryFn: async () => {
            const nations = await base44.entities.Nation.filter({ id: cup.nation_id });
            return nations[0];
        },
        enabled: !!cup?.nation_id,
    });

    const { data: leagues = [] } = useQuery({
        queryKey: ['nationLeagues', cup?.nation_id],
        queryFn: () => base44.entities.League.filter({ nation_id: cup.nation_id }),
        enabled: !!cup?.nation_id,
    });

    const { data: allClubs = [] } = useQuery({
        queryKey: ['nationClubs', cup?.nation_id],
        queryFn: () => base44.entities.Club.filter({ nation_id: cup.nation_id }),
        enabled: !!cup?.nation_id,
    });

    const { data: leagueTables = [] } = useQuery({
        queryKey: ['allLeagueTables', cup?.nation_id],
        queryFn: async () => {
            const nationLeagueIds = leagues.map(l => l.id);
            const tables = await base44.entities.LeagueTable.list();
            return tables.filter(t => nationLeagueIds.includes(t.league_id));
        },
        enabled: leagues.length > 0,
    });

    // Get clubs that were active in the selected year
    const clubsForYear = useMemo(() => {
        if (!seasonData.year || leagueTables.length === 0) return allClubs;
        
        // Find clubs that have entries for this year
        const yearTables = leagueTables.filter(t => t.year === seasonData.year);
        const clubIdsInYear = new Set(yearTables.map(t => t.club_id).filter(Boolean));
        
        // Also include clubs by name match
        const clubNamesInYear = new Set(yearTables.map(t => t.club_name?.toLowerCase().trim()));
        
        return allClubs.filter(c => 
            clubIdsInYear.has(c.id) || 
            clubNamesInYear.has(c.name?.toLowerCase().trim())
        );
    }, [seasonData.year, leagueTables, allClubs]);

    // Filter clubs by selected tiers
    const clubsByTier = useMemo(() => {
        if (selectedTiers.length === 0) return clubsForYear;
        
        const selectedLeagueIds = leagues
            .filter(l => selectedTiers.includes(l.tier))
            .map(l => l.id);
        
        return clubsForYear.filter(c => selectedLeagueIds.includes(c.league_id));
    }, [clubsForYear, selectedTiers, leagues]);

    // Get unique tiers
    const availableTiers = useMemo(() => {
        const tiers = [...new Set(leagues.map(l => l.tier).filter(Boolean))].sort((a, b) => a - b);
        return tiers;
    }, [leagues]);

    // Search filter
    const filteredClubs = useMemo(() => {
        if (!searchTerm) return clubsByTier;
        return clubsByTier.filter(c => 
            c.name?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [clubsByTier, searchTerm]);

    // Toggle tier selection
    const toggleTier = (tier) => {
        setSelectedTiers(prev => 
            prev.includes(tier) ? prev.filter(t => t !== tier) : [...prev, tier]
        );
    };

    // Toggle club selection
    const toggleClub = (clubId) => {
        setSelectedClubIds(prev => 
            prev.includes(clubId) ? prev.filter(id => id !== clubId) : [...prev, clubId]
        );
    };

    // Select all filtered clubs
    const selectAllFiltered = () => {
        const filteredIds = filteredClubs.map(c => c.id);
        setSelectedClubIds(prev => [...new Set([...prev, ...filteredIds])]);
    };

    // Deselect all
    const deselectAll = () => {
        setSelectedClubIds([]);
    };

    // Generate bracket structure
    const generateBracket = () => {
        const numTeams = selectedClubIds.length;
        if (numTeams < 2) return;

        const bracketSize = getClosestPowerOf2(numTeams);
        const rounds = ROUND_NAMES[bracketSize] || [];
        
        // Create first round matches
        const selectedClubs = allClubs.filter(c => selectedClubIds.includes(c.id));
        const shuffled = [...selectedClubs].sort(() => Math.random() - 0.5);
        
        const firstRoundMatches = [];
        const numFirstRoundMatches = bracketSize / 2;
        const byes = bracketSize - numTeams;
        
        for (let i = 0; i < numFirstRoundMatches; i++) {
            const homeIdx = i * 2;
            const awayIdx = i * 2 + 1;
            
            // Handle byes - teams with byes go straight through
            if (awayIdx >= numTeams) {
                // This match gets a bye
                firstRoundMatches.push({
                    round: rounds[0],
                    match_number: i + 1,
                    home_club_id: shuffled[homeIdx]?.id || '',
                    home_club_name: shuffled[homeIdx]?.name || 'TBD',
                    away_club_id: '',
                    away_club_name: 'BYE',
                    home_score: null,
                    away_score: null,
                    winner: shuffled[homeIdx]?.name || '',
                    winner_id: shuffled[homeIdx]?.id || ''
                });
            } else {
                firstRoundMatches.push({
                    round: rounds[0],
                    match_number: i + 1,
                    home_club_id: shuffled[homeIdx]?.id || '',
                    home_club_name: shuffled[homeIdx]?.name || 'TBD',
                    away_club_id: shuffled[awayIdx]?.id || '',
                    away_club_name: shuffled[awayIdx]?.name || 'TBD',
                    home_score: null,
                    away_score: null,
                    winner: '',
                    winner_id: ''
                });
            }
        }

        // Create empty matches for subsequent rounds
        const allMatches = [...firstRoundMatches];
        let matchesInRound = numFirstRoundMatches / 2;
        
        for (let r = 1; r < rounds.length; r++) {
            for (let m = 0; m < matchesInRound; m++) {
                allMatches.push({
                    round: rounds[r],
                    match_number: m + 1,
                    home_club_id: '',
                    home_club_name: 'TBD',
                    away_club_id: '',
                    away_club_name: 'TBD',
                    home_score: null,
                    away_score: null,
                    winner: '',
                    winner_id: ''
                });
            }
            matchesInRound = matchesInRound / 2;
        }

        setBracketMatches(allMatches);
        setActiveTab('bracket');
    };

    // Update match
    const updateMatch = (roundName, matchNumber, field, value) => {
        setBracketMatches(prev => prev.map(m => {
            if (m.round === roundName && m.match_number === matchNumber) {
                const updated = { ...m, [field]: value };
                
                // Auto-set winner based on scores
                if (field === 'home_score' || field === 'away_score') {
                    const homeScore = field === 'home_score' ? parseInt(value) : parseInt(m.home_score);
                    const awayScore = field === 'away_score' ? parseInt(value) : parseInt(m.away_score);
                    
                    if (!isNaN(homeScore) && !isNaN(awayScore)) {
                        if (homeScore > awayScore) {
                            updated.winner = m.home_club_name;
                            updated.winner_id = m.home_club_id;
                        } else if (awayScore > homeScore) {
                            updated.winner = m.away_club_name;
                            updated.winner_id = m.away_club_id;
                        }
                    }
                }
                
                return updated;
            }
            return m;
        }));
    };

    // Set winner manually
    const setWinner = (roundName, matchNumber, clubName, clubId) => {
        setBracketMatches(prev => prev.map(m => {
            if (m.round === roundName && m.match_number === matchNumber) {
                return { ...m, winner: clubName, winner_id: clubId };
            }
            return m;
        }));
    };

    // Create season mutation
    const createMutation = useMutation({
        mutationFn: async () => {
            // Find champion (winner of final)
            const finalMatch = bracketMatches.find(m => m.round === 'Final');
            const champion = finalMatch?.winner || '';
            const championId = finalMatch?.winner_id || '';
            
            // Find runner-up
            const runnerUp = finalMatch 
                ? (finalMatch.winner === finalMatch.home_club_name ? finalMatch.away_club_name : finalMatch.home_club_name)
                : '';
            const runnerUpId = finalMatch 
                ? (finalMatch.winner_id === finalMatch.home_club_id ? finalMatch.away_club_id : finalMatch.home_club_id)
                : '';
            
            const finalScore = finalMatch?.home_score != null && finalMatch?.away_score != null
                ? `${finalMatch.home_score}-${finalMatch.away_score}`
                : '';

            // Create season
            const season = await base44.entities.DomesticCupSeason.create({
                cup_id: cupId,
                year: seasonData.year,
                number_of_teams: selectedClubIds.length,
                champion_id: championId,
                champion_name: champion,
                runner_up_id: runnerUpId,
                runner_up: runnerUp,
                final_score: finalScore,
                final_venue: seasonData.final_venue,
                top_scorer: seasonData.top_scorer,
                notes: seasonData.notes
            });

            // Create all matches
            const matchesToCreate = bracketMatches
                .filter(m => m.home_club_name !== 'TBD' && m.away_club_name !== 'BYE')
                .map(m => ({
                    season_id: season.id,
                    round: m.round,
                    match_number: m.match_number,
                    home_club_id: m.home_club_id,
                    home_club_name: m.home_club_name,
                    away_club_id: m.away_club_id,
                    away_club_name: m.away_club_name,
                    home_score: m.home_score,
                    away_score: m.away_score,
                    winner: m.winner,
                    winner_id: m.winner_id
                }));

            if (matchesToCreate.length > 0) {
                await base44.entities.DomesticCupMatch.bulkCreate(matchesToCreate);
            }

            return season;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['cupSeasons']);
            navigate(createPageUrl(`DomesticCupDetail?id=${cupId}`));
        }
    });

    if (!cup) {
        return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;
    }

    // Group matches by round for display
    const matchesByRound = bracketMatches.reduce((acc, m) => {
        if (!acc[m.round]) acc[m.round] = [];
        acc[m.round].push(m);
        return acc;
    }, {});

    const roundOrder = Object.keys(matchesByRound);

    return (
        <div className="min-h-screen bg-slate-50">
            <PageHeader
                title={`Add ${cup.name} Season`}
                subtitle="Create a new cup season with bracket"
                breadcrumbs={[
                    { label: 'Nations', href: 'Nations' },
                    { label: nation?.name || '', href: `NationDetail?id=${nation?.id}` },
                    { label: cup.name, href: `DomesticCupDetail?id=${cupId}` },
                    { label: 'Add Season' }
                ]}
            />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="mb-6">
                        <TabsTrigger value="setup">1. Setup</TabsTrigger>
                        <TabsTrigger value="teams">2. Select Teams ({selectedClubIds.length})</TabsTrigger>
                        <TabsTrigger value="bracket" disabled={bracketMatches.length === 0}>3. Bracket</TabsTrigger>
                    </TabsList>

                    <TabsContent value="setup">
                        <Card className="border-0 shadow-sm">
                            <CardHeader><CardTitle>Season Details</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>Year *</Label>
                                        <Input 
                                            value={seasonData.year} 
                                            onChange={(e) => setSeasonData({...seasonData, year: e.target.value})}
                                            placeholder="e.g., 1878"
                                            className="mt-1"
                                        />
                                        <p className="text-xs text-slate-500 mt-1">Enter the year to load clubs from that season's league tables</p>
                                    </div>
                                    <div>
                                        <Label>Final Venue</Label>
                                        <Input 
                                            value={seasonData.final_venue} 
                                            onChange={(e) => setSeasonData({...seasonData, final_venue: e.target.value})}
                                            className="mt-1"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <Label>Top Scorer</Label>
                                    <Input 
                                        value={seasonData.top_scorer} 
                                        onChange={(e) => setSeasonData({...seasonData, top_scorer: e.target.value})}
                                        placeholder="e.g., John Smith (5 goals)"
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label>Notes</Label>
                                    <Textarea 
                                        value={seasonData.notes} 
                                        onChange={(e) => setSeasonData({...seasonData, notes: e.target.value})}
                                        rows={3}
                                        className="mt-1"
                                    />
                                </div>
                                <div className="flex justify-end">
                                    <Button 
                                        onClick={() => setActiveTab('teams')} 
                                        disabled={!seasonData.year}
                                        className="bg-emerald-600 hover:bg-emerald-700"
                                    >
                                        Next: Select Teams
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="teams">
                        <Card className="border-0 shadow-sm">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle>Select Participating Clubs</CardTitle>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={selectAllFiltered}>Select All Visible</Button>
                                        <Button variant="outline" size="sm" onClick={deselectAll}>Deselect All</Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {/* Tier Filters */}
                                <div className="mb-4">
                                    <Label className="mb-2 block">Filter by League Tier</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {availableTiers.map(tier => (
                                            <Badge 
                                                key={tier}
                                                variant={selectedTiers.includes(tier) ? "default" : "outline"}
                                                className="cursor-pointer"
                                                onClick={() => toggleTier(tier)}
                                            >
                                                Tier {tier}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>

                                {/* Search */}
                                <div className="mb-4">
                                    <Input 
                                        placeholder="Search clubs..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>

                                {/* Info */}
                                <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                                    <Users className="w-4 h-4 inline mr-2" />
                                    {clubsForYear.length} clubs found for {seasonData.year || 'selected year'} • {selectedClubIds.length} selected
                                    {selectedClubIds.length >= 2 && (
                                        <span className="ml-2">• Bracket size: {getClosestPowerOf2(selectedClubIds.length)} teams</span>
                                    )}
                                </div>

                                {/* Club Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-96 overflow-y-auto">
                                    {filteredClubs.map(club => {
                                        const isSelected = selectedClubIds.includes(club.id);
                                        const clubLeague = leagues.find(l => l.id === club.league_id);
                                        
                                        return (
                                            <div 
                                                key={club.id}
                                                onClick={() => toggleClub(club.id)}
                                                className={`p-3 rounded-lg border cursor-pointer transition-colors flex items-center gap-2 ${
                                                    isSelected ? 'bg-emerald-50 border-emerald-500' : 'hover:bg-slate-50'
                                                }`}
                                            >
                                                {isSelected && <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
                                                {club.logo_url && <img src={club.logo_url} alt="" className="w-6 h-6 object-contain flex-shrink-0" />}
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium truncate text-sm">{club.name}</div>
                                                    {clubLeague && <div className="text-xs text-slate-500">T{clubLeague.tier}</div>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="flex justify-between mt-6">
                                    <Button variant="outline" onClick={() => setActiveTab('setup')}>Back</Button>
                                    <Button 
                                        onClick={generateBracket}
                                        disabled={selectedClubIds.length < 2}
                                        className="bg-emerald-600 hover:bg-emerald-700"
                                    >
                                        Generate Bracket ({selectedClubIds.length} teams)
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="bracket">
                        <Card className="border-0 shadow-sm">
                            <CardHeader>
                                <CardTitle>Cup Bracket</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-slate-500 mb-4">
                                    Enter scores or click a team name to set them as winner. Winners advance automatically when you save.
                                </p>

                                <div className="space-y-8">
                                    {roundOrder.map(round => (
                                        <div key={round}>
                                            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                                                {round === 'Final' && <Trophy className="w-5 h-5 text-amber-500" />}
                                                {round}
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {matchesByRound[round]?.sort((a, b) => a.match_number - b.match_number).map(match => (
                                                    <div key={`${match.round}-${match.match_number}`} className="border rounded-lg overflow-hidden">
                                                        <div className="text-xs text-slate-500 bg-slate-50 px-3 py-1">
                                                            Match {match.match_number}
                                                        </div>
                                                        <div className={`flex items-center gap-2 p-2 border-b ${match.winner === match.home_club_name ? 'bg-emerald-50' : ''}`}>
                                                            <button 
                                                                onClick={() => setWinner(match.round, match.match_number, match.home_club_name, match.home_club_id)}
                                                                className="flex-1 text-left text-sm font-medium hover:text-emerald-600 truncate"
                                                            >
                                                                {match.home_club_name}
                                                            </button>
                                                            <Input 
                                                                type="number"
                                                                className="w-14 h-8 text-center"
                                                                value={match.home_score ?? ''}
                                                                onChange={(e) => updateMatch(match.round, match.match_number, 'home_score', e.target.value ? parseInt(e.target.value) : null)}
                                                            />
                                                        </div>
                                                        <div className={`flex items-center gap-2 p-2 ${match.winner === match.away_club_name ? 'bg-emerald-50' : ''}`}>
                                                            <button 
                                                                onClick={() => setWinner(match.round, match.match_number, match.away_club_name, match.away_club_id)}
                                                                className="flex-1 text-left text-sm font-medium hover:text-emerald-600 truncate"
                                                            >
                                                                {match.away_club_name}
                                                            </button>
                                                            <Input 
                                                                type="number"
                                                                className="w-14 h-8 text-center"
                                                                value={match.away_score ?? ''}
                                                                onChange={(e) => updateMatch(match.round, match.match_number, 'away_score', e.target.value ? parseInt(e.target.value) : null)}
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex justify-between mt-8 pt-4 border-t">
                                    <Button variant="outline" onClick={() => setActiveTab('teams')}>Back to Teams</Button>
                                    <div className="flex gap-2">
                                        <Button variant="outline" onClick={() => navigate(createPageUrl(`DomesticCupDetail?id=${cupId}`))}>
                                            Cancel
                                        </Button>
                                        <Button 
                                            onClick={() => createMutation.mutate()}
                                            disabled={createMutation.isPending}
                                            className="bg-emerald-600 hover:bg-emerald-700"
                                        >
                                            {createMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                            Save Season
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}