import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Search, Plus, Trophy, Shield, MapPin, Filter, ArrowUpDown, LayoutGrid, List, Users, BarChart3, Star, Globe } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import PageHeader from '@/components/common/PageHeader';
import AdminOnly from '@/components/common/AdminOnly';
import BulkNationEnhancer from '@/components/nations/BulkNationEnhancer';

import { estimateNationPopulation, estimateSustainableProClubs } from '@/components/common/populationUtils';

// Estimate league strength - matches NationStats component logic
function estimateStrength(clubs, leagues, coefficient, membership) {
    let score = membership === 'VCC' ? 15 : membership === 'CCC' ? 5 : 0;
    if (coefficient?.rank) {
        if (coefficient.rank <= 5) score += 35;
        else if (coefficient.rank <= 10) score += 25;
        else if (coefficient.rank <= 20) score += 15;
        else score += 8;
    }
    score += clubs.filter(c => c.vcc_titles > 0).length * 10;
    score += clubs.filter(c => c.ccc_titles > 0).length * 5;
    
    // Depth of pyramid
    const maxTier = Math.max(...leagues.map(l => l.tier || 1), 1);
    score += maxTier * 3;
    
    // Number of top-flight clubs
    const topFlightLeagues = leagues.filter(l => l.tier === 1);
    const topFlightTeams = topFlightLeagues.reduce((sum, l) => sum + (l.number_of_teams || 12), 0);
    score += Math.min(topFlightTeams, 20);
    
    score = Math.min(score, 100);
    
    let tier, color, bg;
    if (score >= 80) { tier = 'Elite'; color = 'text-amber-500'; bg = 'bg-amber-50'; }
    else if (score >= 60) { tier = 'Strong'; color = 'text-emerald-500'; bg = 'bg-emerald-50'; }
    else if (score >= 40) { tier = 'Developing'; color = 'text-blue-500'; bg = 'bg-blue-50'; }
    else if (score >= 20) { tier = 'Emerging'; color = 'text-purple-500'; bg = 'bg-purple-50'; }
    else { tier = 'Growing'; color = 'text-slate-500'; bg = 'bg-slate-50'; }
    
    return { score, tier, color, bg };
}

export default function Nations() {
    const [search, setSearch] = useState('');
    const [regionFilter, setRegionFilter] = useState('all');
    const [membershipFilter, setMembershipFilter] = useState('all');
    const [sortBy, setSortBy] = useState('rank');
    const [viewMode, setViewMode] = useState('grid');

    const { data: nations = [], isLoading } = useQuery({
        queryKey: ['nations'],
        queryFn: () => base44.entities.Nation.list(),
    });

    const { data: coefficients = [] } = useQuery({
        queryKey: ['coefficients'],
        queryFn: () => base44.entities.CountryCoefficient.list(),
    });

    const { data: leagues = [] } = useQuery({
        queryKey: ['leagues'],
        queryFn: () => base44.entities.League.list(),
    });

    const { data: clubs = [] } = useQuery({
        queryKey: ['clubs'],
        queryFn: () => base44.entities.Club.list(),
    });

    const { data: players = [] } = useQuery({
        queryKey: ['allPlayers'],
        queryFn: () => base44.entities.Player.list(),
    });

    const filterRegions = [...new Set(nations.filter(n => n.region).map(n => n.region))];

    // Compute nation stats
    const nationStats = useMemo(() => {
        return nations.map(nation => {
            const nationLeagues = leagues.filter(l => l.nation_id === nation.id);
            const nationClubs = clubs.filter(c => c.nation_id === nation.id);
            const coeff = coefficients.find(c => c.nation_id === nation.id);
            const maxTier = Math.max(...nationLeagues.map(l => l.tier || 1), 1);
            
            // Calculate division sizes - prefer league.number_of_teams, but infer from clubs if not set
            const topFlightLeagues = nationLeagues.filter(l => l.tier === 1);
            let topDivisionSize = topFlightLeagues.reduce((max, l) => Math.max(max, l.number_of_teams || 0), 0);
            
            // If no number_of_teams set, infer from clubs in top tier leagues
            if (topDivisionSize === 0 && topFlightLeagues.length > 0) {
                const topFlightLeagueIds = topFlightLeagues.map(l => l.id);
                const topFlightClubs = nationClubs.filter(c => topFlightLeagueIds.includes(c.league_id));
                topDivisionSize = topFlightClubs.length || 8; // Default to 8 if no data
            }
            
            const leaguesWithTeams = nationLeagues.filter(l => l.number_of_teams > 0);
            const avgDivisionSize = leaguesWithTeams.length > 0 
                ? leaguesWithTeams.reduce((sum, l) => sum + l.number_of_teams, 0) / leaguesWithTeams.length 
                : topDivisionSize; // Use top division as fallback
            
            // Count geographic locations
            const geoRegions = new Set(nationClubs.map(c => c.region).filter(Boolean));
            const geoDistricts = new Set(nationClubs.map(c => c.district).filter(Boolean));
            const geoSettlements = new Set(nationClubs.map(c => c.settlement || c.city).filter(Boolean));
            
            const populationData = estimateNationPopulation(nationClubs.length, nationLeagues.length, nation.membership, maxTier, {
                topDivisionSize,
                avgDivisionSize,
                totalDivisions: nationLeagues.length,
                regionCount: geoRegions.size,
                districtCount: geoDistricts.size,
                settlementCount: geoSettlements.size
            });
            const population = populationData.value;
            const strength = estimateStrength(nationClubs, nationLeagues, coeff, nation.membership);
            const proClubs = estimateSustainableProClubs(population, topDivisionSize, maxTier, nation.membership, strength.score);
            
            // Calculate national team average OVR (players in the national squad)
            const nationalTeamPlayers = players.filter(p => 
                p.nation_id === nation.id && p.is_national_team && p.overall_rating
            );
            const avgOVR = nationalTeamPlayers.length > 0 
                ? Math.round(nationalTeamPlayers.reduce((sum, p) => sum + p.overall_rating, 0) / nationalTeamPlayers.length)
                : null;
            
            return {
                ...nation,
                leagueCount: nationLeagues.length,
                clubCount: nationClubs.length,
                coefficient: coeff,
                rank: coeff?.rank || 999,
                population,
                strength,
                maxTier,
                topDivisionSize,
                proClubs,
                avgOVR
            };
        });
    }, [nations, leagues, clubs, coefficients]);

    const filteredNations = nationStats
        .filter(nation => {
            const matchesSearch = nation.name.toLowerCase().includes(search.toLowerCase());
            const matchesRegion = regionFilter === 'all' || nation.region === regionFilter;
            const matchesMembership = membershipFilter === 'all' || nation.membership === membershipFilter;
            return matchesSearch && matchesRegion && matchesMembership;
        })
        .sort((a, b) => {
            // ALWAYS VCC before CCC regardless of sort
            if (a.membership !== b.membership) {
                if (a.membership === 'VCC') return -1;
                if (b.membership === 'VCC') return 1;
            }
            
            // Then apply user's sort preference within same membership tier
            switch (sortBy) {
                case 'name': return a.name.localeCompare(b.name);
                case 'population': return b.population - a.population;
                case 'clubs': return b.clubCount - a.clubCount;
                case 'leagues': return b.leagueCount - a.leagueCount;
                case 'strength': return b.strength.score - a.strength.score;
                case 'ovr': return (b.avgOVR || 0) - (a.avgOVR || 0);
                case 'rank':
                default:
                    if (a.rank !== b.rank) return a.rank - b.rank;
                    return a.name.localeCompare(b.name);
            }
        });

    return (
        <div className="min-h-screen bg-slate-50">
            <PageHeader 
                title="Nations of Volaria"
                subtitle="Explore all 37 nations and their complete football structures"
                breadcrumbs={[{ label: 'Nations' }]}
            >
                <AdminOnly>
                        <div className="flex gap-2">
                            <BulkNationEnhancer />
                            <Link to={createPageUrl('AddNation')}>
                                <Button className="bg-emerald-600 hover:bg-emerald-700">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Nation
                                </Button>
                            </Link>
                        </div>
                    </AdminOnly>
            </PageHeader>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4 mb-8">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <Input
                            placeholder="Search nations..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 h-12 bg-white border-slate-200"
                        />
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {filterRegions.length > 0 && (
                            <Select value={regionFilter} onValueChange={setRegionFilter}>
                                <SelectTrigger className="w-[150px] h-12 bg-white">
                                    <Globe className="w-4 h-4 mr-2 text-slate-400" />
                                    <SelectValue placeholder="Region" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Regions</SelectItem>
                                    {filterRegions.map(region => (
                                        <SelectItem key={region} value={region}>{region}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                        <Select value={membershipFilter} onValueChange={setMembershipFilter}>
                            <SelectTrigger className="w-[140px] h-12 bg-white">
                                <Star className="w-4 h-4 mr-2 text-slate-400" />
                                <SelectValue placeholder="Membership" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Members</SelectItem>
                                <SelectItem value="VCC">VCC (Full)</SelectItem>
                                <SelectItem value="CCC">CCC (Associate)</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={sortBy} onValueChange={setSortBy}>
                            <SelectTrigger className="w-[150px] h-12 bg-white">
                                <ArrowUpDown className="w-4 h-4 mr-2 text-slate-400" />
                                <SelectValue placeholder="Sort by" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="rank">Ranking</SelectItem>
                                <SelectItem value="name">Name (A-Z)</SelectItem>
                                <SelectItem value="ovr">Avg OVR</SelectItem>
                                <SelectItem value="population">Population</SelectItem>
                                <SelectItem value="clubs">Most Clubs</SelectItem>
                                <SelectItem value="leagues">Most Leagues</SelectItem>
                                <SelectItem value="strength">Strength</SelectItem>
                            </SelectContent>
                        </Select>
                        <div className="flex border rounded-lg bg-white">
                            <Button 
                                variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
                                size="icon" 
                                className="h-12 w-12"
                                onClick={() => setViewMode('grid')}
                            >
                                <LayoutGrid className="w-4 h-4" />
                            </Button>
                            <Button 
                                variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
                                size="icon" 
                                className="h-12 w-12"
                                onClick={() => setViewMode('list')}
                            >
                                <List className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Content */}
                {isLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {[...Array(12)].map((_, i) => (
                            <Skeleton key={i} className="h-64 rounded-2xl" />
                        ))}
                    </div>
                ) : filteredNations.length === 0 ? (
                    <Card className="border-dashed border-2 border-slate-300">
                        <CardContent className="flex flex-col items-center justify-center py-16">
                            <MapPin className="w-16 h-16 text-slate-300 mb-4" />
                            <h3 className="text-xl font-semibold text-slate-700 mb-2">No Nations Found</h3>
                            <p className="text-slate-500">Try adjusting your search or filters</p>
                        </CardContent>
                    </Card>
                ) : viewMode === 'list' ? (
                    <Card className="border-0 shadow-sm overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-100">
                                    <TableHead className="w-12">#</TableHead>
                                    <TableHead>Nation</TableHead>
                                    <TableHead>Membership</TableHead>
                                    <TableHead className="text-center">Rank</TableHead>
                                    <TableHead className="text-center">Avg OVR</TableHead>
                                    <TableHead className="text-center">Clubs</TableHead>
                                    <TableHead className="text-center">Leagues</TableHead>
                                    <TableHead className="text-center">Tiers</TableHead>
                                    <TableHead className="text-right">Population</TableHead>
                                    <TableHead className="text-center">Pro Clubs</TableHead>
                                    <TableHead className="text-center">Strength</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredNations.map((nation, idx) => (
                                    <TableRow key={nation.id} className="hover:bg-slate-50">
                                        <TableCell className="font-medium text-slate-500">{idx + 1}</TableCell>
                                        <TableCell>
                                            <Link to={createPageUrl(`NationDetail?id=${nation.id}`)} className="flex items-center gap-3 hover:text-emerald-600">
                                                {nation.flag_url ? (
                                                    <img src={nation.flag_url} alt="" className="w-8 h-5 object-cover rounded" />
                                                ) : (
                                                    <div className="w-8 h-5 bg-slate-200 rounded" />
                                                )}
                                                <div>
                                                    <div className="font-semibold">{nation.name}</div>
                                                    {nation.region && <div className="text-xs text-slate-500">{nation.region}</div>}
                                                </div>
                                            </Link>
                                        </TableCell>
                                        <TableCell>
                                            {nation.membership && (
                                                <Badge className={nation.membership === 'VCC' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}>
                                                    {nation.membership}
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {nation.rank < 999 ? (
                                                <span className="font-bold">{nation.rank}</span>
                                            ) : (
                                                <span className="text-slate-400">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {nation.avgOVR ? (
                                                <span className="font-bold text-emerald-600">{nation.avgOVR}</span>
                                            ) : (
                                                <span className="text-slate-300">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center font-medium">{nation.clubCount}</TableCell>
                                        <TableCell className="text-center">{nation.leagueCount}</TableCell>
                                        <TableCell className="text-center">{nation.maxTier > 0 ? nation.maxTier : '—'}</TableCell>
                                        <TableCell className="text-right">
                                                    {nation.population >= 1000000 
                                                        ? `${(nation.population / 1000000).toFixed(1)}M`
                                                        : `${Math.round(nation.population / 1000)}K`
                                                    }
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <span className="font-medium text-emerald-600">{nation.proClubs.display}</span>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <span className={`text-xs font-medium ${nation.strength.color}`}>{nation.strength.tier}</span>
                                                        <span className="text-xs text-slate-400">{nation.strength.score}/100</span>
                                                    </div>
                                                </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredNations.map((nation) => (
                            <Link 
                                key={nation.id} 
                                to={createPageUrl(`NationDetail?id=${nation.id}`)}
                                className="group"
                            >
                                <Card className="overflow-hidden border-0 shadow-sm hover:shadow-2xl transition-all duration-500 bg-white group-hover:-translate-y-2 h-full">
                                    <div className="aspect-[3/2] bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center p-8 relative overflow-hidden">
                                        {nation.flag_url ? (
                                            <img 
                                                src={nation.flag_url} 
                                                alt={nation.name}
                                                className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-700"
                                            />
                                        ) : (
                                            <div className="w-24 h-16 bg-gradient-to-br from-slate-200 to-slate-300 rounded-lg flex items-center justify-center">
                                                <MapPin className="w-10 h-10 text-slate-400" />
                                            </div>
                                        )}
                                        {nation.rank < 999 && (
                                            <div className="absolute top-2 right-2 bg-white/90 px-2 py-1 rounded-full text-xs font-bold text-slate-700">
                                                #{nation.rank}
                                            </div>
                                        )}
                                        {nation.membership && (
                                            <div className="absolute top-2 left-2">
                                                <Badge className={nation.membership === 'VCC' ? 'bg-amber-500 text-white' : 'bg-blue-500 text-white'}>
                                                    {nation.membership}
                                                </Badge>
                                            </div>
                                        )}
                                    </div>
                                    <CardContent className="p-5">
                                        <h3 className="text-xl font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                                            {nation.name}
                                        </h3>
                                        {nation.region && (
                                            <p className="text-sm text-slate-500 mt-1">{nation.region}</p>
                                        )}
                                        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100">
                                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                                <Trophy className="w-4 h-4 text-amber-500" />
                                                <span className="font-medium">{nation.leagueCount}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                                <Shield className="w-4 h-4 text-blue-500" />
                                                <span className="font-medium">{nation.clubCount}</span>
                                            </div>
                                            <div className="flex items-center gap-1 ml-auto">
                                                <span className={`text-xs font-medium ${nation.strength.color}`}>{nation.strength.tier}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}