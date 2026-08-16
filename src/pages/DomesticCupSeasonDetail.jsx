import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { ChevronRight, Trophy, Edit2, Trash2, Plus, Check, Users, Zap } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import AdminOnly, { useIsAdmin } from '@/components/common/AdminOnly';
import DomesticCupDrawer from '@/components/cups/DomesticCupDrawer';
import SyncDomesticCupStats from '@/components/cups/SyncDomesticCupStats';
import EnhancedBracketView from '@/components/continental/EnhancedBracketView';
import { syncCupStatsToClubs } from '@/components/common/SyncCupStats';

const ROUND_ORDER = ['Round of 128', 'Round of 64', 'Round of 32', 'Round of 16', 'Quarter-final', 'Semi-final', 'Final'];

// Higher rank = later round. Handles standard + custom round names so no
// round is silently dropped, and so rounds display in chronological order.
const rankRound = (round) => {
    if (!round) return 0;
    const r = round.toLowerCase();
    if (r.includes('final') && !r.includes('semi') && !r.includes('quarter')) return 1000;
    if (r.includes('semi')) return 900;
    if (r.includes('quarter')) return 800;
    const ron = r.match(/round of (\d+)/);
    if (ron) {
        const n = parseInt(ron[1], 10);
        return 700 - (Math.log2(n) - 4) * 10;
    }
    if (r.includes('last 16')) return 700;
    if (r.includes('group') || r.includes('league')) return 500;
    if (r.includes('preliminary')) return 400;
    const words = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'];
    for (let i = 0; i < words.length; i++) {
        if (r.includes(words[i])) return 100 + i * 10;
    }
    const m = r.match(/(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
};

export default function DomesticCupSeasonDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    const seasonId = urlParams.get('id');
    const queryClient = useQueryClient();

    const { isAdmin } = useIsAdmin();
    const [editingMatch, setEditingMatch] = useState(null);
    const [matchFormData, setMatchFormData] = useState({});
    const [isAddMatchOpen, setIsAddMatchOpen] = useState(false);
    const [renamingRound, setRenamingRound] = useState(null);
    const [renameValue, setRenameValue] = useState('');
    const [renameOrder, setRenameOrder] = useState(null);

    const { data: season } = useQuery({
        queryKey: ['cupSeason', seasonId],
        queryFn: async () => {
            const seasons = await base44.entities.DomesticCupSeason.filter({ id: seasonId });
            return seasons[0];
        },
        enabled: !!seasonId,
    });

    const { data: cup } = useQuery({
        queryKey: ['domesticCup', season?.cup_id],
        queryFn: async () => {
            const cups = await base44.entities.DomesticCup.filter({ id: season.cup_id });
            return cups[0];
        },
        enabled: !!season?.cup_id,
    });

    const { data: nation } = useQuery({
        queryKey: ['nation', cup?.nation_id],
        queryFn: async () => {
            const nations = await base44.entities.Nation.filter({ id: cup.nation_id });
            return nations[0];
        },
        enabled: !!cup?.nation_id,
    });

    const { data: matches = [] } = useQuery({
        queryKey: ['cupMatches', seasonId],
        queryFn: () => base44.entities.DomesticCupMatch.filter({ season_id: seasonId }),
        enabled: !!seasonId,
    });

    const { data: clubs = [] } = useQuery({
        queryKey: ['nationClubs', cup?.nation_id],
        queryFn: () => base44.entities.Club.filter({ nation_id: cup.nation_id }),
        enabled: !!cup?.nation_id,
    });

    const { data: leagues = [] } = useQuery({
        queryKey: ['nationLeagues', cup?.nation_id],
        queryFn: () => base44.entities.League.filter({ nation_id: cup.nation_id }),
        enabled: !!cup?.nation_id,
    });

    const { data: leagueTables = [] } = useQuery({
        queryKey: ['yearLeagueTables', season?.year, cup?.nation_id],
        queryFn: async () => {
            const nationLeagueIds = leagues.map(l => l.id);
            // Fetch ALL league tables (no limit) then filter
            const tables = await base44.entities.LeagueTable.list('-year', 5000);
            return tables.filter(t => t.year === season.year && nationLeagueIds.includes(t.league_id));
        },
        enabled: !!season?.year && leagues.length > 0,
    });

    const updateSeasonFromFinal = async (matchData) => {
        if (matchData.round === 'Final' && matchData.winner) {
            const loser = matchData.winner === matchData.home_club_name 
                ? matchData.away_club_name 
                : matchData.home_club_name;
            const winnerClub = clubs.find(c => c.name === matchData.winner);
            const loserClub = clubs.find(c => c.name === loser);
            await base44.entities.DomesticCupSeason.update(seasonId, {
                champion_name: matchData.winner,
                champion_id: winnerClub?.id || null,
                runner_up: loser,
                runner_up_id: loserClub?.id || null,
            });
            if (cup?.nation_id) await syncCupStatsToClubs(cup.nation_id);
            queryClient.invalidateQueries({ queryKey: ['cupSeason', seasonId] });
            queryClient.invalidateQueries({ queryKey: ['cupSeasons', cup?.id] });
            queryClient.invalidateQueries({ queryKey: ['domesticCup', cup?.id] });
            queryClient.invalidateQueries({ queryKey: ['clubs', cup?.nation_id] });
            queryClient.invalidateQueries({ queryKey: ['club'] });
            queryClient.invalidateQueries({ queryKey: ['allClubs'] });
        }
    };

    const updateMatchMutation = useMutation({
        mutationFn: async ({ id, data }) => {
            await base44.entities.DomesticCupMatch.update(id, data);
            await updateSeasonFromFinal(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['cupMatches']);
            setEditingMatch(null);
        },
    });

    const createMatchMutation = useMutation({
        mutationFn: async (data) => {
            const existingOrder = matchesByRound[data.round]?.[0]?.round_order;
            const order = data.round_order ?? existingOrder ?? nextRoundOrder();
            await base44.entities.DomesticCupMatch.create({ ...data, round_order: order, season_id: seasonId });
            await updateSeasonFromFinal(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['cupMatches']);
            setIsAddMatchOpen(false);
            setMatchFormData({});
        },
    });

    const deleteMatchMutation = useMutation({
        mutationFn: async (id) => {
            await base44.entities.DomesticCupMatch.delete(id);
            if (cup?.nation_id) await syncCupStatsToClubs(cup.nation_id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cupMatches', seasonId] });
            queryClient.invalidateQueries({ queryKey: ['clubs', cup?.nation_id] });
            queryClient.invalidateQueries({ queryKey: ['club'] });
            queryClient.invalidateQueries({ queryKey: ['allClubs'] });
        },
    });

    const renameRoundMutation = useMutation({
        mutationFn: async ({ oldName, newName, order }) => {
            const set = Number.isFinite(order) ? { round: newName, round_order: order } : { round: newName };
            await base44.entities.DomesticCupMatch.updateMany(
                { season_id: seasonId, round: oldName },
                { $set: set }
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['cupMatches']);
            setRenamingRound(null);
        },
    });

    // Unique clubs that actually took part (excluding byes/TBD).
    const participantCount = useMemo(() => {
        const set = new Set();
        matches.forEach(m => {
            [m.home_club_name, m.away_club_name].forEach(n => {
                if (n && n !== 'TBD' && n.toLowerCase() !== 'bye') set.add(n);
            });
        });
        return set.size;
    }, [matches]);

    const getClubByName = (name) => clubs.find(c => c.name?.toLowerCase().trim() === name?.toLowerCase().trim());

    const getClubTier = (clubName) => {
        const table = leagueTables.find(t => t.club_name?.toLowerCase().trim() === clubName?.toLowerCase().trim());
        if (!table) return null;
        const league = leagues.find(l => l.id === table.league_id);
        return league?.tier || null;
    };

    // Find giant killings (lower tier beating higher tier)
    // Exclude byes and TBD matches
    const giantKillings = matches.filter(m => {
        // Skip if either team is TBD, BYE, or empty
        if (!m.home_club_name || !m.away_club_name) return false;
        if (m.home_club_name === 'TBD' || m.away_club_name === 'TBD') return false;
        if (m.home_club_name.toLowerCase() === 'bye' || m.away_club_name.toLowerCase() === 'bye') return false;
        
        const homeTier = getClubTier(m.home_club_name);
        const awayTier = getClubTier(m.away_club_name);
        if (!homeTier || !awayTier) return false;
        if (m.winner === m.home_club_name && homeTier > awayTier) return true;
        if (m.winner === m.away_club_name && awayTier > homeTier) return true;
        return false;
    });

    // Group matches by round
    const matchesByRound = matches.reduce((acc, m) => {
        if (!acc[m.round]) acc[m.round] = [];
        acc[m.round].push(m);
        return acc;
    }, {});

    // Order each round by its explicit round_order (lower = earlier round),
    // falling back to the name heuristic when no order is stored. Custom/renamed
    // rounds keep a stable position because the user controls the number directly.
    const roundOrder = (name) => {
        const rms = matchesByRound[name] || [];
        for (const m of rms) {
            if (m.round_order != null) return m.round_order;
        }
        return rankRound(name);
    };
    const nextRoundOrder = () => {
        const max = Object.keys(matchesByRound).reduce((acc, r) => {
            const o = roundOrder(r);
            return Math.max(acc, Number.isFinite(o) ? o : 0);
        }, 0);
        return max + 1;
    };
    const sortedRounds = Object.keys(matchesByRound).sort((a, b) => {
        const da = roundOrder(a), db = roundOrder(b);
        return da - db || a.localeCompare(b);
    });

    if (!season || !cup) {
        return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full" /></div>;
    }

    const championClub = getClubByName(season.champion_name);
    const runnerUpClub = getClubByName(season.runner_up);

    const MatchCard = ({ match, isFinal }) => {
        const homeClub = getClubByName(match.home_club_name);
        const awayClub = getClubByName(match.away_club_name);
        const homeIsWinner = match.winner === match.home_club_name;
        const awayIsWinner = match.winner === match.away_club_name;
        const homeTier = getClubTier(match.home_club_name);
        const awayTier = getClubTier(match.away_club_name);
        const isGiantKilling = (homeIsWinner && homeTier > awayTier) || (awayIsWinner && awayTier > homeTier);

        return (
            <div 
                className={`bg-white border rounded-lg overflow-hidden ${isAdmin ? 'hover:shadow-md transition-shadow cursor-pointer' : ''} ${isFinal ? 'ring-2 ring-amber-400' : ''} ${isGiantKilling ? 'ring-2 ring-purple-300' : ''}`}
                onClick={() => {
                    if (isAdmin) {
                        setMatchFormData(match);
                        setEditingMatch(match);
                    }
                }}
            >
                {isFinal && (
                    <div className="bg-amber-400 text-amber-900 text-xs font-bold text-center py-1">
                        <Trophy className="w-3 h-3 inline mr-1" /> FINAL
                    </div>
                )}
                {isGiantKilling && !isFinal && (
                    <div className="bg-purple-400 text-white text-xs font-bold text-center py-1">
                        <Zap className="w-3 h-3 inline mr-1" /> GIANT KILLING
                    </div>
                )}
                <div className={`flex items-center gap-2 p-3 ${homeIsWinner ? 'bg-emerald-50' : ''}`}>
                    {homeTier && <Badge variant="outline" className="text-xs h-5 flex-shrink-0">T{homeTier}</Badge>}
                    <span className={`flex-1 text-sm truncate ${homeIsWinner ? 'font-bold text-emerald-700' : ''}`}>
                        {match.home_club_name}
                    </span>
                    <span className={`font-mono ${homeIsWinner ? 'font-bold' : ''}`}>{match.home_score ?? '-'}</span>
                </div>
                <div className="border-t" />
                <div className={`flex items-center gap-2 p-3 ${awayIsWinner ? 'bg-emerald-50' : ''}`}>
                    {awayTier && <Badge variant="outline" className="text-xs h-5 flex-shrink-0">T{awayTier}</Badge>}
                    <span className={`flex-1 text-sm truncate ${awayIsWinner ? 'font-bold text-emerald-700' : ''}`}>
                        {match.away_club_name}
                    </span>
                    <span className={`font-mono ${awayIsWinner ? 'font-bold' : ''}`}>{match.away_score ?? '-'}</span>
                </div>
                {match.extra_time && <div className="bg-blue-50 text-xs text-blue-600 text-center py-1">AET</div>}
                {match.penalties && <div className="bg-purple-50 text-xs text-purple-600 text-center py-1">Pens: {match.penalties}</div>}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Hero */}
            <div className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${cup.primary_color || '#1e40af'}, ${cup.secondary_color || '#fbbf24'})` }}>
                <div className="absolute inset-0 bg-black/20" />
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <nav className="flex items-center gap-2 text-sm text-white/70 mb-4 flex-wrap">
                        <Link to={createPageUrl('Home')} className="hover:text-white">Volaria</Link>
                        <ChevronRight className="w-4 h-4" />
                        {nation && <Link to={createPageUrl(`NationDetail?id=${nation.id}`)} className="hover:text-white">{nation.name}</Link>}
                        <ChevronRight className="w-4 h-4" />
                        <Link to={createPageUrl(`DomesticCupDetail?id=${cup.id}`)} className="hover:text-white">{cup.name}</Link>
                        <ChevronRight className="w-4 h-4" />
                        <span className="text-white">{season.year}</span>
                    </nav>
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center">
                            <Trophy className="w-10 h-10 text-white" />
                        </div>
                        <div className="flex-1">
                            <h1 className="text-3xl md:text-4xl font-bold text-white">{cup.name} {season.year}</h1>
                            {season.number_of_teams && <p className="text-white/80 mt-1">{season.number_of_teams} teams</p>}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Final Info */}
                {season.champion_name && (
                    <Card className="border-0 shadow-sm mb-8 bg-gradient-to-r from-amber-50 to-yellow-50">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-center gap-8 flex-wrap">
                                <div className="text-center">
                                    {championClub?.logo_url && <img src={championClub.logo_url} alt="" className="w-16 h-16 object-contain mx-auto mb-2" />}
                                    <Link to={createPageUrl(`ClubDetail?id=${championClub?.id}`)} className="font-bold text-lg text-emerald-700 hover:underline">{season.champion_name}</Link>
                                    <div className="text-xs text-slate-500">Champion</div>
                                    {getClubTier(season.champion_name) && (
                                        <Badge variant="outline" className="mt-1">Tier {getClubTier(season.champion_name)}</Badge>
                                    )}
                                </div>
                                <div className="text-center">
                                    <Trophy className="w-8 h-8 text-amber-500 mx-auto mb-1" />
                                    <div className="text-3xl font-bold">{season.final_score || 'vs'}</div>
                                    {season.final_venue && <div className="text-xs text-slate-500">{season.final_venue}</div>}
                                </div>
                                <div className="text-center">
                                    {runnerUpClub?.logo_url && <img src={runnerUpClub.logo_url} alt="" className="w-16 h-16 object-contain mx-auto mb-2" />}
                                    <Link to={createPageUrl(`ClubDetail?id=${runnerUpClub?.id}`)} className="font-bold text-lg hover:underline">{season.runner_up}</Link>
                                    <div className="text-xs text-slate-500">Runner-up</div>
                                    {getClubTier(season.runner_up) && (
                                        <Badge variant="outline" className="mt-1">Tier {getClubTier(season.runner_up)}</Badge>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Draw System & Finals */}
                <AdminOnly>
                    <div className="mb-8">
                        <DomesticCupDrawer
                            season={season}
                            cup={cup}
                            allClubs={clubs}
                            existingMatches={matches}
                            allLeagueTables={leagueTables}
                            leagues={leagues}
                        />
                    </div>
                </AdminOnly>

                {/* Giant Killings */}
                {giantKillings.length > 0 && (
                    <Card className="border-0 shadow-sm mb-8 bg-gradient-to-r from-purple-50 to-pink-50">
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-purple-700">
                                <Zap className="w-5 h-5" />
                                Giant Killings ({giantKillings.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-2 md:grid-cols-2">
                                {giantKillings.map((m, idx) => {
                                    const winnerTier = getClubTier(m.winner);
                                    const loser = m.winner === m.home_club_name ? m.away_club_name : m.home_club_name;
                                    const loserTier = getClubTier(loser);
                                    return (
                                        <div key={idx} className="flex items-center gap-2 p-2 bg-white rounded-lg">
                                            <Zap className="w-4 h-4 text-purple-500" />
                                            <span className="font-medium text-purple-700">{m.winner}</span>
                                            <Badge variant="outline" className="text-xs">T{winnerTier}</Badge>
                                            <span className="text-slate-500">beat</span>
                                            <span>{loser}</span>
                                            <Badge variant="outline" className="text-xs">T{loserTier}</Badge>
                                            <span className="text-xs text-slate-400 ml-auto">{m.round}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Bracket */}
                <Tabs defaultValue="bracket" className="space-y-6">
                    <div className="flex items-center justify-between">
                        <TabsList>
                            <TabsTrigger value="bracket">Tournament Bracket</TabsTrigger>
                            <TabsTrigger value="participants">Participants ({season.number_of_teams || participantCount})</TabsTrigger>
                            <TabsTrigger value="rounds">By Round</TabsTrigger>
                        </TabsList>
                        <AdminOnly>
                            <div className="flex gap-2">
                                <SyncDomesticCupStats season={season} cup={cup} clubs={clubs} />
                                <Button onClick={() => { setMatchFormData({ round: 'Quarter-final', match_number: 1 }); setIsAddMatchOpen(true); }} className="bg-emerald-600 hover:bg-emerald-700">
                                    <Plus className="w-4 h-4 mr-2" /> Add Match
                                </Button>
                            </div>
                        </AdminOnly>
                    </div>

                    <TabsContent value="bracket">
                        <Card className="border-0 shadow-sm">
                            <CardContent className="pt-6">
                                {matches.length === 0 ? (
                                    <div className="text-center py-12 text-slate-500">
                                        <Trophy className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                                        <p>No matches recorded yet. Use the draw button above to start the tournament.</p>
                                    </div>
                                ) : (
                                    <EnhancedBracketView
                                        matches={matches}
                                        getNationFlag={() => null}
                                        clubs={clubs}
                                        nations={[nation]}
                                        competition={{ ...cup, tier: 1 }}
                                        onEditMatch={isAdmin ? (match) => {
                                            setMatchFormData(match);
                                            setEditingMatch(match);
                                        } : null}
                                        isDomesticCup={true}
                                    />
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="participants">
                        <Card className="border-0 shadow-sm">
                            <CardHeader>
                                <CardTitle>Participating Clubs</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {(() => {
                                    // Get unique clubs that actually participated (from matches)
                                    const participatingClubs = new Map();
                                    matches.forEach(m => {
                                        if (m.home_club_name && m.home_club_name !== 'TBD' && m.home_club_name !== 'BYE') {
                                            const club = clubs.find(c => c.name === m.home_club_name);
                                            if (club && !participatingClubs.has(club.id)) {
                                                const table = leagueTables.find(t => t.club_name?.toLowerCase().trim() === club.name?.toLowerCase().trim());
                                                const league = leagues.find(l => l.id === table?.league_id);
                                                participatingClubs.set(club.id, {
                                                    ...club,
                                                    tier: league?.tier,
                                                    position: table?.position
                                                });
                                            }
                                        }
                                        if (m.away_club_name && m.away_club_name !== 'TBD' && m.away_club_name !== 'BYE') {
                                            const club = clubs.find(c => c.name === m.away_club_name);
                                            if (club && !participatingClubs.has(club.id)) {
                                                const table = leagueTables.find(t => t.club_name?.toLowerCase().trim() === club.name?.toLowerCase().trim());
                                                const league = leagues.find(l => l.id === table?.league_id);
                                                participatingClubs.set(club.id, {
                                                    ...club,
                                                    tier: league?.tier,
                                                    position: table?.position
                                                });
                                            }
                                        }
                                    });

                                    const participantArray = Array.from(participatingClubs.values())
                                        .sort((a, b) => {
                                            if (a.tier !== b.tier) return a.tier - b.tier;
                                            return (a.position || 0) - (b.position || 0);
                                        });

                                    if (participantArray.length === 0) {
                                        return (
                                            <div className="text-center py-12 text-slate-500">
                                                <Users className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                                                <p>No participating clubs yet. Use the draw system to add matches.</p>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="space-y-4">
                                            <p className="text-sm text-slate-600">
                                                {season.number_of_teams
                                                    ? `${season.number_of_teams} teams in this edition • ${participantArray.length} played`
                                                    : `${participantArray.length} clubs participated in this edition`}
                                            </p>
                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                                {participantArray.map(club => (
                                                    <Link
                                                        key={club.id}
                                                        to={createPageUrl(`ClubDetail?id=${club.id}`)}
                                                        className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                                                    >
                                                        {club.logo_url && (
                                                            <img src={club.logo_url} alt="" className="w-8 h-8 object-contain" />
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-sm font-medium truncate">{club.name}</div>
                                                            {club.tier && (
                                                                <div className="text-xs text-slate-500">
                                                                    Tier {club.tier}
                                                                    {club.name === season.champion_name && ' • Champion 🏆'}
                                                                    {club.name === season.runner_up && ' • Runner-up'}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="rounds">
                        <div className="space-y-6">
                            {sortedRounds.length === 0 ? (
                                <Card className="border-dashed border-2">
                                    <CardContent className="text-center py-12 text-slate-500">
                                        <Trophy className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                                        <p>No rounds yet</p>
                                    </CardContent>
                                </Card>
                            ) : (
                                sortedRounds.map(round => (
                                    <Card key={round} className="border-0 shadow-sm">
                                        <CardHeader className="pb-2">
                                            <div className="flex items-center justify-between">
                                                <CardTitle className={`text-lg flex items-center gap-2 flex-wrap ${round === 'Final' ? 'text-amber-700' : ''}`}>
                                                    {round === 'Final' && <Trophy className="w-4 h-4" />}
                                                    {round}
                                                    <Badge variant="outline" className="text-xs font-normal text-slate-500">#{roundOrder(round)}</Badge>
                                                    <span className="text-sm font-normal text-slate-400">({matchesByRound[round].length} {matchesByRound[round].length === 1 ? 'match' : 'matches'})</span>
                                                </CardTitle>
                                                <AdminOnly>
                                                    <div className="flex gap-2">
                                                        <Button size="sm" variant="outline" onClick={() => { setMatchFormData({ round, round_order: roundOrder(round), match_number: matchesByRound[round].length + 1 }); setIsAddMatchOpen(true); }}>
                                                            <Plus className="w-4 h-4 mr-1" /> Add Result
                                                        </Button>
                                                        <Button size="sm" variant="outline" onClick={() => { setRenamingRound(round); setRenameValue(round); setRenameOrder(roundOrder(round)); }}>
                                                            <Edit2 className="w-4 h-4 mr-1" /> Rename
                                                        </Button>
                                                    </div>
                                                </AdminOnly>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {matchesByRound[round]?.sort((a, b) => (a.match_number || 0) - (b.match_number || 0)).map(match => (
                                                    <MatchCard key={match.id} match={match} isFinal={round === 'Final'} />
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Edit Match Dialog */}
            <Dialog open={!!editingMatch} onOpenChange={(open) => { if (!open) setEditingMatch(null); }}>
                <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle>Edit Match</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                            💡 You can change the round name here if it was incorrectly assigned
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            <div className="col-span-2 sm:col-span-1">
                                <Label>Round *</Label>
                                <Input
                                    list="round-suggestions"
                                    value={matchFormData.round || ''}
                                    onChange={(e) => setMatchFormData({...matchFormData, round: e.target.value})}
                                    placeholder="e.g. Round of 32, Quarter-final"
                                    className="mt-1"
                                />
                                <datalist id="round-suggestions">
                                    {[...new Set([...ROUND_ORDER, ...Object.keys(matchesByRound)])].map(r => <option key={r} value={r} />)}
                                </datalist>
                            </div>
                            <div>
                                <Label>Round #</Label>
                                <Input type="number" value={matchFormData.round_order ?? ''} onChange={(e) => setMatchFormData({...matchFormData, round_order: e.target.value ? parseInt(e.target.value) : null})} placeholder="Lower = earlier" className="mt-1" />
                            </div>
                            <div>
                                <Label>Match #</Label>
                                <Input type="number" value={matchFormData.match_number || ''} onChange={(e) => setMatchFormData({...matchFormData, match_number: parseInt(e.target.value) || 1})} className="mt-1" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Home Club</Label>
                                <Input value={matchFormData.home_club_name || ''} onChange={(e) => setMatchFormData({...matchFormData, home_club_name: e.target.value})} className="mt-1" />
                            </div>
                            <div>
                                <Label>Home Score</Label>
                                <Input type="number" value={matchFormData.home_score ?? ''} onChange={(e) => setMatchFormData({...matchFormData, home_score: e.target.value ? parseInt(e.target.value) : null})} className="mt-1" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Away Club</Label>
                                <Input value={matchFormData.away_club_name || ''} onChange={(e) => setMatchFormData({...matchFormData, away_club_name: e.target.value})} className="mt-1" />
                            </div>
                            <div>
                                <Label>Away Score</Label>
                                <Input type="number" value={matchFormData.away_score ?? ''} onChange={(e) => setMatchFormData({...matchFormData, away_score: e.target.value ? parseInt(e.target.value) : null})} className="mt-1" />
                            </div>
                        </div>
                        <div>
                            <Label>Winner</Label>
                            <Select value={matchFormData.winner || ''} onValueChange={(v) => setMatchFormData({...matchFormData, winner: v})}>
                                <SelectTrigger className="mt-1"><SelectValue placeholder="Select winner" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={matchFormData.home_club_name || 'home'}>{matchFormData.home_club_name || 'Home'}</SelectItem>
                                    <SelectItem value={matchFormData.away_club_name || 'away'}>{matchFormData.away_club_name || 'Away'}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Penalties (if applicable)</Label>
                            <Input value={matchFormData.penalties || ''} onChange={(e) => setMatchFormData({...matchFormData, penalties: e.target.value})} placeholder="e.g., 4-3" className="mt-1" />
                        </div>
                        <div className="flex justify-between pt-4">
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="outline" className="text-red-500"><Trash2 className="w-4 h-4 mr-2" /> Delete</Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>Delete this match?</AlertDialogTitle></AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => { deleteMatchMutation.mutate(editingMatch.id); setEditingMatch(null); }} className="bg-red-600">Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => setEditingMatch(null)}>Cancel</Button>
                                <Button onClick={() => updateMatchMutation.mutate({ id: editingMatch.id, data: matchFormData })} className="bg-emerald-600">Save</Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Rename Round Dialog */}
            <Dialog open={!!renamingRound} onOpenChange={(open) => { if (!open) setRenamingRound(null); }}>
                <DialogContent className="max-w-sm">
                    <DialogHeader><DialogTitle>Rename Round</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <p className="text-sm text-slate-500">
                            Renaming <strong>{renamingRound}</strong> updates all {renamingRound ? matchesByRound[renamingRound]?.length : 0} matches in this round.
                        </p>
                        <div>
                            <Label>New Round Name</Label>
                            <Input
                                list="round-suggestions"
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                className="mt-1"
                            />
                            <datalist id="round-suggestions">
                                {[...new Set([...ROUND_ORDER, ...Object.keys(matchesByRound)])].map(r => <option key={r} value={r} />)}
                            </datalist>
                        </div>
                        <div>
                            <Label>Round # (order)</Label>
                            <Input
                                type="number"
                                value={renameOrder ?? ''}
                                onChange={(e) => setRenameOrder(e.target.value ? parseInt(e.target.value) : null)}
                                placeholder="Lower = earlier round"
                                className="mt-1"
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" onClick={() => setRenamingRound(null)}>Cancel</Button>
                            <Button
                                onClick={() => renameRoundMutation.mutate({ oldName: renamingRound, newName: renameValue.trim(), order: renameOrder })}
                                disabled={!renameValue.trim()}
                                className="bg-emerald-600"
                            >
                                Rename Round
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Add Match Dialog */}
            <Dialog open={isAddMatchOpen} onOpenChange={setIsAddMatchOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle>Add Match</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            <div className="col-span-2 sm:col-span-1">
                                <Label>Round</Label>
                                <Input
                                    list="round-suggestions"
                                    value={matchFormData.round || ''}
                                    onChange={(e) => setMatchFormData({...matchFormData, round: e.target.value})}
                                    placeholder="e.g. Round of 32, Quarter-final"
                                    className="mt-1"
                                />
                                <datalist id="round-suggestions">
                                    {[...new Set([...ROUND_ORDER, ...Object.keys(matchesByRound)])].map(r => <option key={r} value={r} />)}
                                </datalist>
                            </div>
                            <div>
                                <Label>Round #</Label>
                                <Input type="number" value={matchFormData.round_order ?? ''} onChange={(e) => setMatchFormData({...matchFormData, round_order: e.target.value ? parseInt(e.target.value) : null})} placeholder="Lower = earlier" className="mt-1" />
                            </div>
                            <div>
                                <Label>Match #</Label>
                                <Input type="number" value={matchFormData.match_number || ''} onChange={(e) => setMatchFormData({...matchFormData, match_number: parseInt(e.target.value) || 1})} className="mt-1" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Home Club</Label>
                                <Input value={matchFormData.home_club_name || ''} onChange={(e) => setMatchFormData({...matchFormData, home_club_name: e.target.value})} className="mt-1" />
                            </div>
                            <div>
                                <Label>Home Score</Label>
                                <Input type="number" value={matchFormData.home_score ?? ''} onChange={(e) => setMatchFormData({...matchFormData, home_score: e.target.value ? parseInt(e.target.value) : null})} className="mt-1" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Away Club</Label>
                                <Input value={matchFormData.away_club_name || ''} onChange={(e) => setMatchFormData({...matchFormData, away_club_name: e.target.value})} className="mt-1" />
                            </div>
                            <div>
                                <Label>Away Score</Label>
                                <Input type="number" value={matchFormData.away_score ?? ''} onChange={(e) => setMatchFormData({...matchFormData, away_score: e.target.value ? parseInt(e.target.value) : null})} className="mt-1" />
                            </div>
                        </div>
                        <div>
                            <Label>Winner</Label>
                            <Input value={matchFormData.winner || ''} onChange={(e) => setMatchFormData({...matchFormData, winner: e.target.value})} className="mt-1" />
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={() => setIsAddMatchOpen(false)}>Cancel</Button>
                            <Button onClick={() => createMatchMutation.mutate(matchFormData)} className="bg-emerald-600">Add Match</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}