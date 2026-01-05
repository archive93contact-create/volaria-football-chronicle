import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Search, Shield, Trophy, ChevronDown, ChevronUp, MapPin, Calendar, Star, TrendingUp, TrendingDown, Target, Globe, Flag, Briefcase } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from '@/components/common/PageHeader';
import BulkKitGenerator from '@/components/clubs/BulkKitGenerator';
import AdminOnly from '@/components/common/AdminOnly';

export default function AllClubs() {
    const [search, setSearch] = useState('');
    const [nationFilter, setNationFilter] = useState('all');
    const [regionFilter, setRegionFilter] = useState('all');
    const [tierFilter, setTierFilter] = useState('all');
    const [membershipFilter, setMembershipFilter] = useState('all');
    const [sortField, setSortField] = useState('name');
    const [sortDir, setSortDir] = useState('asc');
    const [statusFilter, setStatusFilter] = useState('all');

    const { data: clubs = [], isLoading: clubsLoading } = useQuery({
        queryKey: ['allClubs'],
        queryFn: () => base44.entities.Club.list(),
    });

    const { data: nations = [] } = useQuery({
        queryKey: ['allNations'],
        queryFn: () => base44.entities.Nation.list(),
    });

    const { data: leagues = [] } = useQuery({
        queryKey: ['allLeagues'],
        queryFn: () => base44.entities.League.list(),
    });

    const { data: players = [] } = useQuery({
        queryKey: ['allPlayers'],
        queryFn: () => base44.entities.Player.list(),
    });

    // Create lookup maps
    const nationMap = useMemo(() => {
        const map = {};
        nations.forEach(n => { map[n.id] = n; });
        return map;
    }, [nations]);

    const leagueMap = useMemo(() => {
        const map = {};
        leagues.forEach(l => { map[l.id] = l; });
        return map;
    }, [leagues]);

    // Calculate club OVR ratings
    const clubOVRMap = useMemo(() => {
        const map = {};
        clubs.forEach(club => {
            const clubPlayers = players.filter(p => p.club_id === club.id && !p.is_youth_player && p.overall_rating);
            if (clubPlayers.length > 0) {
                const avgOVR = clubPlayers.reduce((sum, p) => sum + p.overall_rating, 0) / clubPlayers.length;
                map[club.id] = Math.round(avgOVR);
            }
        });
        return map;
    }, [clubs, players]);

    // Extract unique filter values
    const filterOptions = useMemo(() => {
        const nationsList = nations.sort((a, b) => a.name.localeCompare(b.name));
        
        // Get regions based on selected nation
        let regionsList = [];
        if (nationFilter !== 'all') {
            regionsList = [...new Set(
                clubs
                    .filter(c => c.nation_id === nationFilter && c.region)
                    .map(c => c.region)
            )].sort();
        } else {
            regionsList = [...new Set(clubs.filter(c => c.region).map(c => c.region))].sort();
        }
        
        // Get tiers
        const tiersList = [...new Set(leagues.map(l => l.tier).filter(Boolean))].sort((a, b) => a - b);
        
        return { nations: nationsList, regions: regionsList, tiers: tiersList };
    }, [clubs, nations, leagues, nationFilter]);

    // Filter and sort clubs
    const filteredClubs = useMemo(() => {
        let result = clubs.filter(club => {
            const nation = nationMap[club.nation_id];
            
            const matchesSearch = club.name.toLowerCase().includes(search.toLowerCase()) ||
                club.city?.toLowerCase().includes(search.toLowerCase()) ||
                club.settlement?.toLowerCase().includes(search.toLowerCase()) ||
                nation?.name?.toLowerCase().includes(search.toLowerCase());
            
            const matchesNation = nationFilter === 'all' || club.nation_id === nationFilter;
            const matchesRegion = regionFilter === 'all' || club.region === regionFilter;
            const matchesMembership = membershipFilter === 'all' || nation?.membership === membershipFilter;
            const matchesStatus = statusFilter === 'all' || 
                club.professional_status === statusFilter || 
                (statusFilter === 'amateur' && !club.professional_status);
            
            let matchesTier = true;
            if (tierFilter !== 'all') {
                const league = leagueMap[club.league_id];
                matchesTier = league?.tier === parseInt(tierFilter);
            }
            
            return matchesSearch && matchesNation && matchesRegion && matchesTier && matchesMembership && matchesStatus;
        });
        
        // Sort inactive clubs to the end
        result.sort((a, b) => {
            const aInactive = a.is_active === false;
            const bInactive = b.is_active === false;
            if (aInactive && !bInactive) return 1;
            if (!aInactive && bInactive) return -1;
            return 0;
        });

        // Sort
        result.sort((a, b) => {
            let aVal, bVal;
            
            switch (sortField) {
                case 'name':
                    aVal = a.name || '';
                    bVal = b.name || '';
                    break;
                case 'nation':
                    aVal = nationMap[a.nation_id]?.name || '';
                    bVal = nationMap[b.nation_id]?.name || '';
                    break;
                case 'tier':
                    aVal = leagueMap[a.league_id]?.tier || 99;
                    bVal = leagueMap[b.league_id]?.tier || 99;
                    break;
                case 'titles':
                    aVal = (a.league_titles || 0);
                    bVal = (b.league_titles || 0);
                    break;
                case 'founded':
                    aVal = a.founded_year || 9999;
                    bVal = b.founded_year || 9999;
                    break;
                case 'topFlight':
                    aVal = a.seasons_top_flight || 0;
                    bVal = b.seasons_top_flight || 0;
                    break;
                case 'cups':
                    aVal = a.domestic_cup_titles || 0;
                    bVal = b.domestic_cup_titles || 0;
                    break;
                case 'vcc':
                    aVal = a.vcc_titles || 0;
                    bVal = b.vcc_titles || 0;
                    break;
                case 'ccc':
                    aVal = a.ccc_titles || 0;
                    bVal = b.ccc_titles || 0;
                    break;
                case 'totalTrophies':
                    aVal = (a.league_titles || 0) + (a.domestic_cup_titles || 0) + (a.vcc_titles || 0) + (a.ccc_titles || 0);
                    bVal = (b.league_titles || 0) + (b.domestic_cup_titles || 0) + (b.vcc_titles || 0) + (b.ccc_titles || 0);
                    break;
                case 'ovr':
                    aVal = clubOVRMap[a.id] || 0;
                    bVal = clubOVRMap[b.id] || 0;
                    break;
                default:
                    aVal = a.name || '';
                    bVal = b.name || '';
            }

            if (typeof aVal === 'string') {
                return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            }
            return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
        });

        return result;
    }, [clubs, nations, search, nationFilter, regionFilter, tierFilter, membershipFilter, statusFilter, sortField, sortDir, nationMap, leagueMap]);

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir(field === 'name' || field === 'nation' || field === 'founded' ? 'asc' : 'desc');
        }
    };

    const SortIcon = ({ field }) => {
        if (sortField !== field) return null;
        return sortDir === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
    };

    // Reset region filter when nation changes
    const handleNationChange = (value) => {
        setNationFilter(value);
        setRegionFilter('all');
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <PageHeader 
                title="All Clubs"
                subtitle={`Browse all ${clubs.length} clubs across Volaria`}
                breadcrumbs={[
                    { label: 'All Clubs' }
                ]}
            />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Bulk Kit Generator */}
                <AdminOnly>
                    <div className="mb-6">
                        <BulkKitGenerator clubs={clubs} />
                    </div>
                </AdminOnly>

                {/* Filters */}
                <Card className="border-0 shadow-sm mb-6">
                    <CardContent className="p-4">
                        <div className="flex flex-col lg:flex-row gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input
                                    placeholder="Search clubs or nations..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            
                            <Select value={nationFilter} onValueChange={handleNationChange}>
                                <SelectTrigger className="w-full lg:w-48">
                                    <Flag className="w-4 h-4 mr-2 text-slate-400" />
                                    <SelectValue placeholder="Nation" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Nations</SelectItem>
                                    {filterOptions.nations.map(n => (
                                        <SelectItem key={n.id} value={n.id}>
                                            {n.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={membershipFilter} onValueChange={setMembershipFilter}>
                                <SelectTrigger className="w-full lg:w-40">
                                    <Star className="w-4 h-4 mr-2 text-slate-400" />
                                    <SelectValue placeholder="Membership" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Members</SelectItem>
                                    <SelectItem value="VCC">VCC (Full)</SelectItem>
                                    <SelectItem value="CCC">CCC (Associate)</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-full lg:w-40">
                                    <Briefcase className="w-4 h-4 mr-2 text-slate-400" />
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="professional">Professional</SelectItem>
                                    <SelectItem value="semi-professional">Semi-Pro</SelectItem>
                                    <SelectItem value="amateur">Amateur</SelectItem>
                                </SelectContent>
                            </Select>

                            {filterOptions.regions.length > 0 && (
                                <Select value={regionFilter} onValueChange={setRegionFilter}>
                                    <SelectTrigger className="w-full lg:w-40">
                                        <MapPin className="w-4 h-4 mr-2 text-slate-400" />
                                        <SelectValue placeholder="Region" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Regions</SelectItem>
                                        {filterOptions.regions.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            )}

                            {filterOptions.tiers.length > 0 && (
                                <Select value={tierFilter} onValueChange={setTierFilter}>
                                    <SelectTrigger className="w-full lg:w-36">
                                        <SelectValue placeholder="Division" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Tiers</SelectItem>
                                        {filterOptions.tiers.map(t => <SelectItem key={t} value={String(t)}>Tier {t}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Results count */}
                <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-slate-500">
                        Showing {filteredClubs.length} of {clubs.length} clubs
                    </p>
                </div>

                {/* Table */}
                {clubsLoading ? (
                    <Skeleton className="h-96" />
                ) : filteredClubs.length === 0 ? (
                    <Card className="border-dashed border-2 border-slate-300">
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <Shield className="w-12 h-12 text-slate-300 mb-4" />
                            <h3 className="text-lg font-semibold text-slate-700">No Clubs Found</h3>
                            <p className="text-slate-500">Try adjusting your filters</p>
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="border-0 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-100">
                                        <TableHead className="w-12">#</TableHead>
                                        <TableHead>
                                            <button onClick={() => handleSort('name')} className="flex items-center gap-1 hover:text-slate-900">
                                                Club <SortIcon field="name" />
                                            </button>
                                        </TableHead>
                                        <TableHead>
                                            <button onClick={() => handleSort('nation')} className="flex items-center gap-1 hover:text-slate-900">
                                                Nation <SortIcon field="nation" />
                                            </button>
                                        </TableHead>
                                        <TableHead className="hidden md:table-cell">Location</TableHead>
                                        <TableHead>
                                            <button onClick={() => handleSort('tier')} className="flex items-center gap-1 hover:text-slate-900">
                                                Division <SortIcon field="tier" />
                                            </button>
                                        </TableHead>
                                        <TableHead className="text-center">
                                            <button onClick={() => handleSort('titles')} className="flex items-center gap-1 hover:text-slate-900">
                                                <Trophy className="w-3 h-3" /> Titles <SortIcon field="titles" />
                                            </button>
                                        </TableHead>
                                        <TableHead className="text-center hidden lg:table-cell">
                                            <button onClick={() => handleSort('founded')} className="flex items-center gap-1 hover:text-slate-900">
                                                <Calendar className="w-3 h-3" /> Founded <SortIcon field="founded" />
                                            </button>
                                        </TableHead>
                                        <TableHead className="text-center hidden lg:table-cell">
                                            <button onClick={() => handleSort('topFlight')} className="flex items-center gap-1 hover:text-slate-900">
                                                Top Flight <SortIcon field="topFlight" />
                                            </button>
                                        </TableHead>
                                        <TableHead className="text-center hidden lg:table-cell">
                                            <button onClick={() => handleSort('cups')} className="flex items-center gap-1 hover:text-slate-900">
                                                Cups <SortIcon field="cups" />
                                            </button>
                                        </TableHead>
                                        <TableHead className="text-center hidden xl:table-cell">
                                            <button onClick={() => handleSort('vcc')} className="flex items-center gap-1 hover:text-slate-900">
                                                VCC <SortIcon field="vcc" />
                                            </button>
                                        </TableHead>
                                        <TableHead className="text-center hidden xl:table-cell">
                                            <button onClick={() => handleSort('ccc')} className="flex items-center gap-1 hover:text-slate-900">
                                                CCC <SortIcon field="ccc" />
                                            </button>
                                        </TableHead>
                                        <TableHead className="text-center hidden xl:table-cell">
                                            <button onClick={() => handleSort('totalTrophies')} className="flex items-center gap-1 hover:text-slate-900">
                                                Total <SortIcon field="totalTrophies" />
                                            </button>
                                        </TableHead>
                                        <TableHead className="text-center hidden 2xl:table-cell">VCC Apps</TableHead>
                                        <TableHead className="text-center hidden 2xl:table-cell">CCC Apps</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredClubs.map((club, idx) => {
                                       const nation = nationMap[club.nation_id];
                                       const league = leagueMap[club.league_id];
                                       const isInactive = club.is_active === false;
                                       return (
                                           <TableRow key={club.id} className={`hover:bg-slate-50 ${isInactive ? 'opacity-50 bg-slate-50' : ''}`}>
                                               <TableCell className="text-slate-400 font-medium">{idx + 1}</TableCell>
                                               <TableCell>
                                                   <Link to={createPageUrl(`ClubDetail?id=${club.id}`)} className={`flex items-center gap-3 hover:text-emerald-600 ${isInactive ? 'italic' : ''}`}>
                                                       {club.logo_url ? (
                                                           <img src={club.logo_url} alt="" className={`w-8 h-8 object-contain ${isInactive ? 'grayscale' : ''}`} />
                                                       ) : (
                                                           <div className="w-8 h-8 rounded bg-slate-200 flex items-center justify-center">
                                                               <Shield className="w-4 h-4 text-slate-400" />
                                                           </div>
                                                       )}
                                                       <div>
                                                           <div className="font-medium flex items-center gap-1.5">
                                                               {club.name}
                                                               {isInactive ? (
                                                                   <Badge variant="outline" className="text-xs bg-slate-100 text-slate-500 border-slate-300">Inactive</Badge>
                                                               ) : (
                                                                   <span className={`text-xs px-1 py-0.5 rounded ${
                                                                       club.professional_status === 'professional' ? 'bg-blue-100 text-blue-700' :
                                                                       club.professional_status === 'semi-professional' ? 'bg-purple-100 text-purple-700' :
                                                                       'bg-slate-100 text-slate-500'
                                                                   }`}>
                                                                       {club.professional_status === 'professional' ? 'PRO' : 
                                                                        club.professional_status === 'semi-professional' ? 'SEMI' : 'AM'}
                                                                   </span>
                                                               )}
                                                           </div>
                                                           {club.nickname && <div className="text-xs text-slate-500">{club.nickname}</div>}
                                                       </div>
                                                   </Link>
                                               </TableCell>
                                                <TableCell>
                                                    {nation ? (
                                                        <Link to={createPageUrl(`NationDetail?id=${nation.id}`)} className="flex items-center gap-2 hover:text-emerald-600">
                                                            {nation.flag_url && (
                                                                <img src={nation.flag_url} alt="" className="w-5 h-3 object-contain" />
                                                            )}
                                                            <span className="text-sm">{nation.name}</span>
                                                            {nation.membership && (
                                                                <Badge variant="outline" className={`text-xs ${nation.membership === 'VCC' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
                                                                    {nation.membership}
                                                                </Badge>
                                                            )}
                                                        </Link>
                                                    ) : (
                                                        <span className="text-slate-400">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="hidden md:table-cell">
                                                    <div className="text-sm">
                                                        {club.settlement || club.city || '-'}
                                                    </div>
                                                    {club.region && <div className="text-xs text-slate-400">{club.region}</div>}
                                                </TableCell>
                                                <TableCell>
                                                    {league ? (
                                                        <Link to={createPageUrl(`LeagueDetail?id=${league.id}`)} className="hover:text-emerald-600">
                                                            <Badge 
                                                                variant="outline" 
                                                                className={league.tier === 1 ? 'bg-amber-50 text-amber-700 border-amber-200' : ''}
                                                            >
                                                                {league.tier === 1 ? 'Top Flight' : `Tier ${league.tier}`}
                                                            </Badge>
                                                        </Link>
                                                    ) : (
                                                        <span className="text-slate-400">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {club.league_titles > 0 ? (
                                                        <div className="flex items-center justify-center gap-1">
                                                            <Trophy className="w-4 h-4 text-amber-500" />
                                                            <span className="font-bold text-amber-600">{club.league_titles}</span>
                                                            {club.lower_tier_titles > 0 && (
                                                                <span className="text-slate-400 text-sm">+{club.lower_tier_titles}</span>
                                                            )}
                                                        </div>
                                                    ) : club.lower_tier_titles > 0 ? (
                                                        <span className="text-slate-500">{club.lower_tier_titles}</span>
                                                    ) : (
                                                        <span className="text-slate-300">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center hidden lg:table-cell">
                                                    {club.founded_year || '-'}
                                                </TableCell>
                                                <TableCell className="text-center hidden lg:table-cell">
                                                    {club.seasons_top_flight > 0 ? (
                                                        <span className="font-medium">{club.seasons_top_flight}</span>
                                                    ) : (
                                                        <span className="text-slate-300">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center hidden lg:table-cell">
                                                    {club.domestic_cup_titles > 0 ? (
                                                        <span className="font-medium text-orange-600">{club.domestic_cup_titles}</span>
                                                    ) : (
                                                        <span className="text-slate-300">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center hidden xl:table-cell">
                                                    {club.vcc_titles > 0 ? (
                                                        <div className="flex items-center justify-center gap-1">
                                                            <Star className="w-3 h-3 text-amber-500" />
                                                            <span className="font-bold text-amber-600">{club.vcc_titles}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-300">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center hidden xl:table-cell">
                                                    {club.ccc_titles > 0 ? (
                                                        <div className="flex items-center justify-center gap-1">
                                                            <Shield className="w-3 h-3 text-blue-500" />
                                                            <span className="font-bold text-blue-600">{club.ccc_titles}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-300">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center hidden xl:table-cell">
                                                    {(() => {
                                                        const total = (club.league_titles || 0) + (club.domestic_cup_titles || 0) + (club.vcc_titles || 0) + (club.ccc_titles || 0);
                                                        return total > 0 ? (
                                                            <span className="font-bold text-emerald-600">{total}</span>
                                                        ) : (
                                                            <span className="text-slate-300">-</span>
                                                        );
                                                    })()}
                                                </TableCell>
                                                <TableCell className="text-center hidden 2xl:table-cell">
                                                    {club.vcc_appearances > 0 ? (
                                                        <span className="text-amber-600">{club.vcc_appearances}</span>
                                                    ) : (
                                                        <span className="text-slate-300">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center hidden 2xl:table-cell">
                                                    {club.ccc_appearances > 0 ? (
                                                        <span className="text-blue-600">{club.ccc_appearances}</span>
                                                    ) : (
                                                        <span className="text-slate-300">-</span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                )}
            </div>
        </div>
    );
}