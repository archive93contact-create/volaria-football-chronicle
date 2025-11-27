import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { ChevronRight, Trophy, Plus, Trash2, Check, Users, Filter } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from '@/components/common/PageHeader';
import { syncCupStatsToClubs } from '@/components/common/SyncCupStats';
import { useIsAdmin } from '@/components/common/AdminOnly';
import { ShieldAlert } from 'lucide-react';

// Calculate the next power of 2 for bracket sizing
const nextPowerOf2 = (n) => {
    let power = 1;
    while (power < n) power *= 2;
    return power;
};

// Get round name based on number of matches remaining
const getRoundName = (teamsRemaining) => {
    if (teamsRemaining === 2) return 'Final';
    if (teamsRemaining === 4) return 'Semi-final';
    if (teamsRemaining === 8) return 'Quarter-final';
    if (teamsRemaining === 16) return 'Round of 16';
    if (teamsRemaining === 32) return 'Round of 32';
    if (teamsRemaining === 64) return 'Round of 64';
    if (teamsRemaining === 128) return 'Round of 128';
    return `Round of ${teamsRemaining}`;
};

// Calculate rounds for a proper bracket (always power of 2)
const calculateRounds = (numTeams) => {
    if (numTeams <= 1) return [];
    const bracketSize = nextPowerOf2(numTeams);
    const rounds = [];
    let remaining = bracketSize;
    
    while (remaining > 1) {
        rounds.push({ name: getRoundName(remaining), matches: remaining / 2 });
        remaining = remaining / 2;
    }
    return rounds;
};

export default function AddDomesticCupSeason() {
    const { isAdmin, isLoading: authLoading } = useIsAdmin();
    const urlParams = new URLSearchParams(window.location.search);
    const cupId = urlParams.get('cup_id');
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    
    if (authLoading) {
        return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full" /></div>;
    }
    
    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Card className="max-w-md">
                    <CardContent className="text-center py-8">
                        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <h2 className="text-xl font-bold mb-2">Admin Access Required</h2>
                        <p className="text-slate-500 mb-4">Only administrators can add content.</p>
                        <Link to={createPageUrl('Home')}><Button>Back to Home</Button></Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const [seasonData, setSeasonData] = useState({
        year: '',
        final_venue: '',
        final_score: '',
        top_scorer: '',
        notes: ''
    });
    const [selectedClubs, setSelectedClubs] = useState([]);
    const [tierFilter, setTierFilter] = useState('all');
    const [searchFilter, setSearchFilter] = useState('');
    const [bracketMatches, setBracketMatches] = useState([]);
    const [activeTab, setActiveTab] = useState('clubs');

    const { data: cup } = useQuery({
        queryKey: ['domesticCup', cupId],
        queryFn: async () => {
            const cups = await base44.entities.DomesticCup.filter({ id: cupId });
            return cups[0];
        },
        enabled: !!cupId,
    });

    const { data: nation } = useQuery({
        queryKey: ['nation', cup?.nation_id],
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

    const { data: allLeagueTables = [] } = useQuery({
        queryKey: ['allLeagueTables', cup?.nation_id],
        queryFn: async () => {
            const nationLeagueIds = leagues.map(l => l.id);
            const tables = await base44.entities.LeagueTable.list();
            return tables.filter(t => nationLeagueIds.includes(t.league_id));
        },
        enabled: leagues.length > 0,
    });

    const { data: allClubs = [] } = useQuery({
        queryKey: ['nationClubs', cup?.nation_id],
        queryFn: () => base44.entities.Club.filter({ nation_id: cup.nation_id }),
        enabled: !!cup?.nation_id,
    });

    // Get clubs that played in the selected year
    const availableClubs = useMemo(() => {
        if (!seasonData.year || allLeagueTables.length === 0) return [];
        
        const yearTables = allLeagueTables.filter(t => t.year === seasonData.year);
        const clubsInYear = new Map();
        
        yearTables.forEach(table => {
            const league = leagues.find(l => l.id === table.league_id);
            if (!league) return;
            
            // Check tier filter
            if (tierFilter !== 'all' && league.tier !== parseInt(tierFilter)) return;
            
            const club = allClubs.find(c => c.id === table.club_id) || { id: table.club_id, name: table.club_name };
            
            if (!clubsInYear.has(table.club_name)) {
                clubsInYear.set(table.club_name, {
                    id: club.id,
                    name: table.club_name,
                    league: league.name,
                    tier: league.tier,
                    position: table.position,
                    logo_url: club.logo_url
                });
            }
        });
        
        return Array.from(clubsInYear.values())
            .filter(c => !searchFilter || c.name.toLowerCase().includes(searchFilter.toLowerCase()))
            .sort((a, b) => {
                if (a.tier !== b.tier) return a.tier - b.tier;
                return a.position - b.position;
            });
    }, [seasonData.year, allLeagueTables, leagues, allClubs, tierFilter, searchFilter]);

    // Available years from league tables
    const availableYears = useMemo(() => {
        const years = [...new Set(allLeagueTables.map(t => t.year))];
        return years.sort().reverse();
    }, [allLeagueTables]);

    // Generate bracket with proper seeding and byes
    const generateBracket = () => {
        const numTeams = selectedClubs.length;
        const bracketSize = nextPowerOf2(numTeams);
        const numByes = bracketSize - numTeams;
        const rounds = calculateRounds(numTeams);
        const matches = [];
        
        // Sort clubs by tier (lower = better) then by position (lower = better)
        const seededClubs = [...selectedClubs].sort((a, b) => {
            if (a.tier !== b.tier) return a.tier - b.tier;
            return a.position - b.position;
        });
        
        // Top seeds get byes (clubs with lowest tier and position)
        const clubsWithByes = seededClubs.slice(0, numByes);
        const clubsInFirstRound = seededClubs.slice(numByes);
        
        // Shuffle the remaining clubs for the first round draw while keeping some seeding
        // Put higher seeds against lower seeds
        const firstRoundPairs = [];
        const half = Math.floor(clubsInFirstRound.length / 2);
        for (let i = 0; i < half; i++) {
            // Pair top half with bottom half (reversed)
            firstRoundPairs.push({
                home: clubsInFirstRound[i],
                away: clubsInFirstRound[clubsInFirstRound.length - 1 - i]
            });
        }
        
        // Generate first round matches
        const firstRound = rounds[0];
        if (firstRound) {
            for (let i = 0; i < firstRoundPairs.length; i++) {
                const pair = firstRoundPairs[i];
                matches.push({
                    round: firstRound.name,
                    match_number: i + 1,
                    home_club_id: pair.home?.id || '',
                    home_club_name: pair.home?.name || 'TBD',
                    home_tier: pair.home?.tier,
                    away_club_id: pair.away?.id || '',
                    away_club_name: pair.away?.name || 'TBD',
                    away_tier: pair.away?.tier,
                    home_score: null,
                    away_score: null,
                    winner: ''
                });
            }
        }
        
        // Generate second round with byes filled in
        if (rounds.length > 1) {
            const secondRound = rounds[1];
            const firstRoundMatchCount = firstRoundPairs.length;
            
            // Figure out how many second round matches and which get bye clubs
            for (let i = 0; i < secondRound.matches; i++) {
                // Check if this match slot should have a bye club
                const byeClub = clubsWithByes[i];
                if (byeClub && i < numByes) {
                    matches.push({
                        round: secondRound.name,
                        match_number: i + 1,
                        home_club_id: byeClub.id || '',
                        home_club_name: byeClub.name,
                        home_tier: byeClub.tier,
                        away_club_id: '',
                        away_club_name: 'TBD', // Will be filled by first round winner
                        home_score: null,
                        away_score: null,
                        winner: ''
                    });
                } else {
                    matches.push({
                        round: secondRound.name,
                        match_number: i + 1,
                        home_club_id: '',
                        home_club_name: 'TBD',
                        away_club_id: '',
                        away_club_name: 'TBD',
                        home_score: null,
                        away_score: null,
                        winner: ''
                    });
                }
            }
        }
        
        // Generate empty matches for subsequent rounds (after second)
        for (let r = 2; r < rounds.length; r++) {
            for (let i = 0; i < rounds[r].matches; i++) {
                matches.push({
                    round: rounds[r].name,
                    match_number: i + 1,
                    home_club_id: '',
                    home_club_name: 'TBD',
                    away_club_id: '',
                    away_club_name: 'TBD',
                    home_score: null,
                    away_score: null,
                    winner: ''
                });
            }
        }
        
        setBracketMatches(matches);
        setActiveTab('bracket');
    };

    const updateMatch = (roundName, matchNumber, field, value) => {
        setBracketMatches(prev => prev.map(m => {
            if (m.round === roundName && m.match_number === matchNumber) {
                const updated = { ...m, [field]: value };
                
                // Auto-determine winner if both scores are set
                if (field === 'home_score' || field === 'away_score') {
                    const home = field === 'home_score' ? value : m.home_score;
                    const away = field === 'away_score' ? value : m.away_score;
                    if (home !== null && away !== null) {
                        if (home > away) updated.winner = m.home_club_name;
                        else if (away > home) updated.winner = m.away_club_name;
                    }
                }
                
                return updated;
            }
            return m;
        }));
    };

    const setMatchWinner = (roundName, matchNumber, winnerName, winnerId, winnerTier) => {
        setBracketMatches(prev => {
            const updated = prev.map(m => {
                if (m.round === roundName && m.match_number === matchNumber) {
                    return { ...m, winner: winnerName, winner_id: winnerId };
                }
                return m;
            });
            
            // Auto-advance winner to next round
            const roundOrder = ['Round of 128', 'Round of 64', 'Round of 32', 'Round of 16', 'Quarter-final', 'Semi-final', 'Final'];
            const currentRoundIdx = roundOrder.indexOf(roundName);
            const nextRound = roundOrder[currentRoundIdx + 1];
            
            if (nextRound) {
                const nextMatchNumber = Math.ceil(matchNumber / 2);
                const isFirstOfPair = matchNumber % 2 === 1;
                
                return updated.map(m => {
                    if (m.round === nextRound && m.match_number === nextMatchNumber) {
                        if (isFirstOfPair) {
                            return { ...m, home_club_name: winnerName, home_club_id: winnerId, home_tier: winnerTier };
                        } else {
                            return { ...m, away_club_name: winnerName, away_club_id: winnerId, away_tier: winnerTier };
                        }
                    }
                    return m;
                });
            }
            
            return updated;
        });
    };

    const toggleClub = (club) => {
        setSelectedClubs(prev => {
            const exists = prev.find(c => c.name === club.name);
            if (exists) return prev.filter(c => c.name !== club.name);
            return [...prev, club];
        });
    };

    const selectAllFiltered = () => {
        const newClubs = [...selectedClubs];
        availableClubs.forEach(c => {
            if (!newClubs.find(sc => sc.name === c.name)) {
                newClubs.push(c);
            }
        });
        setSelectedClubs(newClubs);
    };

    const selectAllFromLeague = (leagueId) => {
        const yearTables = allLeagueTables.filter(t => t.year === seasonData.year && t.league_id === leagueId);
        const newClubs = [...selectedClubs];
        yearTables.forEach(table => {
            const club = allClubs.find(c => c.id === table.club_id) || { id: table.club_id, name: table.club_name };
            const league = leagues.find(l => l.id === leagueId);
            if (!newClubs.find(sc => sc.name === table.club_name)) {
                newClubs.push({
                    id: club.id,
                    name: table.club_name,
                    league: league?.name,
                    tier: league?.tier,
                    position: table.position,
                    logo_url: club.logo_url
                });
            }
        });
        setSelectedClubs(newClubs);
    };

    const createSeasonMutation = useMutation({
        mutationFn: async () => {
            // Find final match to get champion and runner-up
            const finalMatch = bracketMatches.find(m => m.round === 'Final');
            const champion = finalMatch?.winner || '';
            const runnerUp = finalMatch ? (finalMatch.winner === finalMatch.home_club_name ? finalMatch.away_club_name : finalMatch.home_club_name) : '';
            const championClub = allClubs.find(c => c.name === champion);
            const runnerUpClub = allClubs.find(c => c.name === runnerUp);

            // Create season
            const season = await base44.entities.DomesticCupSeason.create({
                cup_id: cupId,
                year: seasonData.year,
                number_of_teams: selectedClubs.length,
                champion_id: championClub?.id || '',
                champion_name: champion,
                runner_up_id: runnerUpClub?.id || '',
                runner_up: runnerUp,
                final_score: seasonData.final_score,
                final_venue: seasonData.final_venue,
                top_scorer: seasonData.top_scorer,
                notes: seasonData.notes
            });

            // Create matches
            for (const match of bracketMatches) {
                if (match.home_club_name !== 'TBD' || match.away_club_name !== 'TBD') {
                    await base44.entities.DomesticCupMatch.create({
                        season_id: season.id,
                        round: match.round,
                        match_number: match.match_number,
                        home_club_id: match.home_club_id,
                        home_club_name: match.home_club_name,
                        away_club_id: match.away_club_id,
                        away_club_name: match.away_club_name,
                        home_score: match.home_score,
                        away_score: match.away_score,
                        winner_id: allClubs.find(c => c.name === match.winner)?.id || '',
                        winner: match.winner
                    });
                }
            }

            // Sync cup stats to clubs
            await syncCupStatsToClubs(cup.nation_id);

            return season;
        },
        onSuccess: (season) => {
            queryClient.invalidateQueries(['cupSeasons']);
            queryClient.invalidateQueries(['clubs']);
            navigate(createPageUrl(`DomesticCupSeasonDetail?id=${season.id}`));
        },
    });

    const rounds = calculateRounds(selectedClubs.length);
    const uniqueTiers = [...new Set(leagues.map(l => l.tier))].sort();

    if (!cup) {
        return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full" /></div>;
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <PageHeader
                title={`Add ${cup.name} Season`}
                subtitle="Create a new cup edition with bracket"
                breadcrumbs={[
                    { label: 'Nations', href: 'Nations' },
                    ...(nation ? [{ label: nation.name, href: `NationDetail?id=${nation.id}` }] : []),
                    { label: cup.name, href: `DomesticCupDetail?id=${cupId}` },
                    { label: 'Add Season' }
                ]}
            />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Season Info */}
                <Card className="border-0 shadow-sm mb-6">
                    <CardHeader><CardTitle>Season Details</CardTitle></CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <Label>Year *</Label>
                                <Select value={seasonData.year} onValueChange={(v) => setSeasonData({...seasonData, year: v})}>
                                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select year" /></SelectTrigger>
                                    <SelectContent>
                                        {availableYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Final Venue</Label>
                                <Input value={seasonData.final_venue} onChange={(e) => setSeasonData({...seasonData, final_venue: e.target.value})} className="mt-1" />
                            </div>
                            <div>
                                <Label>Final Score</Label>
                                <Input value={seasonData.final_score} onChange={(e) => setSeasonData({...seasonData, final_score: e.target.value})} placeholder="e.g., 2-1" className="mt-1" />
                            </div>
                            <div>
                                <Label>Top Scorer</Label>
                                <Input value={seasonData.top_scorer} onChange={(e) => setSeasonData({...seasonData, top_scorer: e.target.value})} className="mt-1" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="mb-4">
                        <TabsTrigger value="clubs">
                            <Users className="w-4 h-4 mr-2" />
                            Select Clubs ({selectedClubs.length})
                        </TabsTrigger>
                        <TabsTrigger value="bracket" disabled={selectedClubs.length < 2}>
                            <Trophy className="w-4 h-4 mr-2" />
                            Bracket
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="clubs">
                        <Card className="border-0 shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Select Participating Clubs</CardTitle>
                                    <p className="text-sm text-slate-500 mt-1">
                                        {seasonData.year ? `Clubs from ${seasonData.year} season` : 'Select a year first'}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" onClick={selectAllFiltered} disabled={!seasonData.year}>
                                        Select All
                                    </Button>

                                    <Button 
                                        onClick={generateBracket} 
                                        disabled={selectedClubs.length < 2}
                                        className="bg-emerald-600 hover:bg-emerald-700"
                                    >
                                        Generate Bracket ({selectedClubs.length} clubs)
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {!seasonData.year ? (
                                    <div className="text-center py-12 text-slate-500">
                                        <Trophy className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                                        <p>Please select a year above to see available clubs.</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Filters */}
                                        <div className="flex flex-wrap gap-4 mb-4 p-4 bg-slate-50 rounded-lg">
                                            <div className="flex-1 min-w-[200px]">
                                                <Input 
                                                    placeholder="Search clubs..." 
                                                    value={searchFilter}
                                                    onChange={(e) => setSearchFilter(e.target.value)}
                                                />
                                            </div>
                                            <Select value={tierFilter} onValueChange={setTierFilter}>
                                                <SelectTrigger className="w-40">
                                                    <Filter className="w-4 h-4 mr-2" />
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">All Tiers</SelectItem>
                                                    {uniqueTiers.map(t => <SelectItem key={t} value={t.toString()}>Tier {t}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Quick Add by League */}
                                        {leagues.length > 0 && (
                                            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                                                <Label className="text-xs text-blue-800 mb-2 block">Quick Add: Select entire league</Label>
                                                <div className="flex flex-wrap gap-2">
                                                    {leagues.sort((a, b) => a.tier - b.tier).map(league => {
                                                        const leagueClubsInYear = allLeagueTables.filter(t => t.year === seasonData.year && t.league_id === league.id).length;
                                                        if (leagueClubsInYear === 0) return null;
                                                        return (
                                                            <Button 
                                                                key={league.id}
                                                                variant="outline" 
                                                                size="sm"
                                                                onClick={() => selectAllFromLeague(league.id)}
                                                                className="text-xs"
                                                            >
                                                                + {league.name} ({leagueClubsInYear})
                                                            </Button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Selected Clubs */}
                                        {selectedClubs.length > 0 && (
                                            <div className="mb-4 p-4 bg-emerald-50 rounded-lg">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="font-semibold text-emerald-800">Selected: {selectedClubs.length}</span>
                                                    <Button variant="ghost" size="sm" onClick={() => setSelectedClubs([])}>Clear All</Button>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {selectedClubs.map(c => (
                                                        <Badge key={c.name} variant="secondary" className="cursor-pointer hover:bg-red-100" onClick={() => toggleClub(c)}>
                                                            {c.name} <Trash2 className="w-3 h-3 ml-1" />
                                                        </Badge>
                                                    ))}
                                                </div>
                                                {selectedClubs.length > 0 && (
                                                    <p className="text-sm text-emerald-700 mt-2">
                                                        Tournament structure: {rounds.map(r => r.name).join(' → ')}
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        {/* Club Grid */}
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-[500px] overflow-y-auto">
                                            {availableClubs.map(club => {
                                                const isSelected = selectedClubs.find(c => c.name === club.name);
                                                return (
                                                    <div
                                                        key={club.name}
                                                        className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                                                            isSelected ? 'bg-emerald-100 border-emerald-300' : 'bg-white hover:bg-slate-50'
                                                        }`}
                                                        onClick={() => toggleClub(club)}
                                                    >
                                                        <Checkbox checked={!!isSelected} className="pointer-events-none" />
                                                        {club.logo_url && <img src={club.logo_url} alt="" className="w-6 h-6 object-contain" />}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="font-medium text-sm truncate">{club.name}</div>
                                                            <div className="text-xs text-slate-500">T{club.tier} - {club.position}{club.position === 1 ? 'st' : club.position === 2 ? 'nd' : club.position === 3 ? 'rd' : 'th'}</div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        
                                        {availableClubs.length === 0 && (
                                            <div className="text-center py-8 text-slate-500">
                                                No clubs found for {seasonData.year} with current filters.
                                            </div>
                                        )}
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="bracket">
                        <Card className="border-0 shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Tournament Bracket</CardTitle>
                                    <p className="text-sm text-slate-500 mt-1">
                                        Click a team to advance them. {nextPowerOf2(selectedClubs.length) - selectedClubs.length > 0 && 
                                            <span className="text-blue-600">({nextPowerOf2(selectedClubs.length) - selectedClubs.length} bye{nextPowerOf2(selectedClubs.length) - selectedClubs.length > 1 ? 's' : ''} for top seeds)</span>
                                        }
                                    </p>
                                </div>
                                <Button 
                                    onClick={() => createSeasonMutation.mutate()}
                                    disabled={createSeasonMutation.isPending || !bracketMatches.find(m => m.round === 'Final')?.winner}
                                    className="bg-emerald-600 hover:bg-emerald-700"
                                >
                                    {createSeasonMutation.isPending ? 'Saving...' : 'Save Season'}
                                </Button>
                            </CardHeader>
                            <CardContent>
                                {bracketMatches.length === 0 ? (
                                    <div className="text-center py-12 text-slate-500">
                                        <Trophy className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                                        <p>Generate a bracket from the Clubs tab first.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-8">
                                        {rounds.map(round => {
                                            const roundMatches = bracketMatches.filter(m => m.round === round.name);
                                            if (roundMatches.length === 0) return null;
                                            return (
                                                <div key={round.name}>
                                                    <h3 className={`text-lg font-semibold mb-4 px-4 py-2 rounded-lg inline-block ${
                                                        round.name === 'Final' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100'
                                                    }`}>
                                                        {round.name === 'Final' && <Trophy className="w-4 h-4 inline mr-2" />}
                                                        {round.name} ({roundMatches.length} match{roundMatches.length > 1 ? 'es' : ''})
                                                    </h3>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                                        {roundMatches.map((match, idx) => (
                                                            <div key={idx} className={`border rounded-lg overflow-hidden bg-white shadow-sm ${round.name === 'Final' ? 'ring-2 ring-amber-400 col-span-full max-w-md mx-auto' : ''}`}>
                                                                {/* Home */}
                                                                <div 
                                                                    className={`flex items-center gap-2 p-2 cursor-pointer transition-colors ${
                                                                        match.winner === match.home_club_name ? 'bg-emerald-100' : 
                                                                        match.home_club_name === 'TBD' ? 'bg-slate-50 cursor-not-allowed' : 'hover:bg-slate-50'
                                                                    }`}
                                                                    onClick={() => match.home_club_name !== 'TBD' && setMatchWinner(round.name, match.match_number, match.home_club_name, match.home_club_id, match.home_tier)}
                                                                >
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className={`font-medium text-sm truncate ${match.winner === match.home_club_name ? 'text-emerald-700' : ''}`}>
                                                                            {match.home_club_name}
                                                                        </div>
                                                                        {match.home_tier && match.home_club_name !== 'TBD' && (
                                                                            <div className="text-xs text-slate-400">Tier {match.home_tier}</div>
                                                                        )}
                                                                    </div>
                                                                    <Input 
                                                                        type="number" 
                                                                        className="w-12 h-8 text-center text-sm"
                                                                        value={match.home_score ?? ''}
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        onChange={(e) => updateMatch(round.name, match.match_number, 'home_score', e.target.value ? parseInt(e.target.value) : null)}
                                                                        disabled={match.home_club_name === 'TBD'}
                                                                    />
                                                                    {match.winner === match.home_club_name && <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
                                                                </div>
                                                                <div className="border-t" />
                                                                {/* Away */}
                                                                <div 
                                                                    className={`flex items-center gap-2 p-2 cursor-pointer transition-colors ${
                                                                        match.winner === match.away_club_name ? 'bg-emerald-100' : 
                                                                        match.away_club_name === 'TBD' ? 'bg-slate-50 cursor-not-allowed' : 'hover:bg-slate-50'
                                                                    }`}
                                                                    onClick={() => match.away_club_name !== 'TBD' && setMatchWinner(round.name, match.match_number, match.away_club_name, match.away_club_id, match.away_tier)}
                                                                >
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className={`font-medium text-sm truncate ${match.winner === match.away_club_name ? 'text-emerald-700' : ''}`}>
                                                                            {match.away_club_name}
                                                                        </div>
                                                                        {match.away_tier && match.away_club_name !== 'TBD' && (
                                                                            <div className="text-xs text-slate-400">Tier {match.away_tier}</div>
                                                                        )}
                                                                    </div>
                                                                    <Input 
                                                                        type="number" 
                                                                        className="w-12 h-8 text-center text-sm"
                                                                        value={match.away_score ?? ''}
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        onChange={(e) => updateMatch(round.name, match.match_number, 'away_score', e.target.value ? parseInt(e.target.value) : null)}
                                                                        disabled={match.away_club_name === 'TBD'}
                                                                    />
                                                                    {match.winner === match.away_club_name && <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                {/* Action Buttons */}
                <div className="flex justify-end gap-4 mt-6">
                    <Link to={createPageUrl(`DomesticCupDetail?id=${cupId}`)}>
                        <Button variant="outline">Cancel</Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}