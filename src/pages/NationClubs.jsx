import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Search, Filter, Shield, Trophy, ChevronRight, ChevronDown, ChevronUp, MapPin, Calendar, Star, TrendingUp, TrendingDown, Target, Briefcase } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from '@/components/common/PageHeader';

export default function NationClubs() {
    const urlParams = new URLSearchParams(window.location.search);
    const nationId = urlParams.get('id');

    const [search, setSearch] = useState('');
    const [regionFilter, setRegionFilter] = useState('all');
    const [districtFilter, setDistrictFilter] = useState('all');
    const [settlementFilter, setSettlementFilter] = useState('all');
    const [tierFilter, setTierFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortField, setSortField] = useState('name');
    const [sortDir, setSortDir] = useState('asc');

    const { data: nation } = useQuery({
        queryKey: ['nation', nationId],
        queryFn: async () => {
            const nations = await base44.entities.Nation.filter({ id: nationId });
            return nations[0];
        },
        enabled: !!nationId,
    });

    const { data: clubs = [], isLoading } = useQuery({
        queryKey: ['nationClubs', nationId],
        queryFn: () => base44.entities.Club.filter({ nation_id: nationId }),
        enabled: !!nationId,
    });

    const { data: leagues = [] } = useQuery({
        queryKey: ['nationLeagues', nationId],
        queryFn: () => base44.entities.League.filter({ nation_id: nationId }),
        enabled: !!nationId,
    });

    const { data: players = [] } = useQuery({
        queryKey: ['nationPlayers', nationId],
        queryFn: async () => {
            const allPlayers = await base44.entities.Player.list();
            const clubIds = clubs.map(c => c.id);
            return allPlayers.filter(p => clubIds.includes(p.club_id));
        },
        enabled: clubs.length > 0,
    });

    const { data: allLeagueTables = [] } = useQuery({
        queryKey: ['allLeagueTables', nationId],
        queryFn: async () => {
            // Get all league tables for leagues in this nation
            const nationLeagueIds = leagues.map(l => l.id);
            const tables = await base44.entities.LeagueTable.list();
            return tables.filter(t => nationLeagueIds.includes(t.league_id));
        },
        enabled: leagues.length > 0,
    });

    const isTuruliand = nation?.name?.toLowerCase() === 'turuliand';

    // Calculate seasons from league table data
    const getCalculatedSeasons = (clubId) => {
        const clubTables = allLeagueTables.filter(t => t.club_id === clubId);
        let topFlightSeasons = 0;
        let tfaSeasons = 0;
        
        clubTables.forEach(table => {
            const league = leagues.find(l => l.id === table.league_id);
            if (league) {
                if (league.tier === 1) topFlightSeasons++;
                if (league.tier <= 4) tfaSeasons++;
            }
        });
        
        return { topFlightSeasons, tfaSeasons };
    };

    // Find the most recent season year across all leagues
    const mostRecentSeasonYear = useMemo(() => {
        if (allLeagueTables.length === 0) return null;
        const years = allLeagueTables.map(t => t.year).filter(Boolean);
        return years.sort().reverse()[0] || null;
    }, [allLeagueTables]);

    // Get the last season a club appeared in
    const getLastSeasonYear = (clubId) => {
        const clubTables = allLeagueTables.filter(t => t.club_id === clubId);
        if (clubTables.length === 0) return null;
        const years = clubTables.map(t => t.year).filter(Boolean);
        return years.sort().reverse()[0] || null;
    };

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

    // Check if a club is inactive (not in most recent season)
    const isClubInactive = (clubId) => {
        if (!mostRecentSeasonYear) return false;
        const lastSeason = getLastSeasonYear(clubId);
        return lastSeason && lastSeason !== mostRecentSeasonYear;
    };

    // Extract unique filter values
    const filterOptions = useMemo(() => {
        const regions = [...new Set(clubs.filter(c => c.region).map(c => c.region))].sort();
        const districts = [...new Set(clubs.filter(c => c.district).map(c => c.district))].sort();
        const settlements = [...new Set(clubs.filter(c => c.settlement).map(c => c.settlement))].sort();
        const tiers = [...new Set(leagues.map(l => l.tier))].sort((a, b) => a - b);
        return { regions, districts, settlements, tiers };
    }, [clubs, leagues]);

    // Get league info for each club
    const getLeagueInfo = (leagueId) => {
        return leagues.find(l => l.id === leagueId);
    };

    // Filter and sort clubs
    const filteredClubs = useMemo(() => {
        let result = clubs.filter(club => {
            const matchesSearch = club.name.toLowerCase().includes(search.toLowerCase()) ||
                club.city?.toLowerCase().includes(search.toLowerCase()) ||
                club.settlement?.toLowerCase().includes(search.toLowerCase());
            const matchesRegion = regionFilter === 'all' || club.region === regionFilter;
            const matchesDistrict = districtFilter === 'all' || club.district === districtFilter;
            const matchesSettlement = settlementFilter === 'all' || club.settlement === settlementFilter;
            
            let matchesTier = true;
            if (tierFilter !== 'all') {
                const league = getLeagueInfo(club.league_id);
                matchesTier = league?.tier === parseInt(tierFilter);
            }
            const matchesStatus = statusFilter === 'all' || 
                club.professional_status === statusFilter || 
                (statusFilter === 'amateur' && !club.professional_status);
            
            return matchesSearch && matchesRegion && matchesDistrict && matchesSettlement && matchesTier && matchesStatus;
        });

        // Sort
        result.sort((a, b) => {
            let aVal, bVal;
            
            switch (sortField) {
                case 'name':
                    aVal = a.name || '';
                    bVal = b.name || '';
                    break;
                case 'tier':
                    aVal = getLeagueInfo(a.league_id)?.tier || 99;
                    bVal = getLeagueInfo(b.league_id)?.tier || 99;
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
                case 'tfa':
                    aVal = a.seasons_in_tfa || 0;
                    bVal = b.seasons_in_tfa || 0;
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
    }, [clubs, search, regionFilter, districtFilter, settlementFilter, tierFilter, statusFilter, sortField, sortDir, leagues]);

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir(field === 'name' || field === 'founded' ? 'asc' : 'desc');
        }
    };

    const SortIcon = ({ field }) => {
        if (sortField !== field) return null;
        return sortDir === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
    };

    if (!nation) {
        return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Skeleton className="w-32 h-8" /></div>;
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <PageHeader 
                title={`${nation.name} Clubs`}
                subtitle={`Complete list of all ${clubs.length} clubs`}
                image={nation.flag_url}
                breadcrumbs={[
                    { label: 'Nations', url: createPageUrl('Nations') },
                    { label: nation.name, url: createPageUrl(`NationDetail?id=${nationId}`) },
                    { label: 'All Clubs' }
                ]}
            />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Filters */}
                <Card className="border-0 shadow-sm mb-6">
                    <CardContent className="p-4">
                        <div className="flex flex-col lg:flex-row gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input
                                    placeholder="Search clubs..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            
                            {filterOptions.regions.length > 0 && (
                                <Select value={regionFilter} onValueChange={setRegionFilter}>
                                    <SelectTrigger className="w-full lg:w-40">
                                        <SelectValue placeholder="Region" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Regions</SelectItem>
                                        {filterOptions.regions.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            )}

                            {filterOptions.districts.length > 0 && (
                                <Select value={districtFilter} onValueChange={setDistrictFilter}>
                                    <SelectTrigger className="w-full lg:w-40">
                                        <SelectValue placeholder="District" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Districts</SelectItem>
                                        {filterOptions.districts.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            )}

                            {filterOptions.settlements.length > 0 && (
                                <Select value={settlementFilter} onValueChange={setSettlementFilter}>
                                    <SelectTrigger className="w-full lg:w-40">
                                        <SelectValue placeholder="Settlement" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Settlements</SelectItem>
                                        {filterOptions.settlements.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            )}

                            {filterOptions.tiers.length > 0 && (
                                <Select value={tierFilter} onValueChange={setTierFilter}>
                                    <SelectTrigger className="w-full lg:w-40">
                                        <SelectValue placeholder="Division" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Divisions</SelectItem>
                                        {filterOptions.tiers.map(t => <SelectItem key={t} value={String(t)}>Tier {t}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            )}

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
                {isLoading ? (
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
                                        <TableHead className="text-center">
                                            <button onClick={() => handleSort('ovr')} className="flex items-center gap-1 hover:text-slate-900">
                                                OVR <SortIcon field="ovr" />
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
                                        {isTuruliand && (
                                            <TableHead className="text-center hidden xl:table-cell">
                                                <button onClick={() => handleSort('tfa')} className="flex items-center gap-1 hover:text-slate-900">
                                                    TFA Seasons <SortIcon field="tfa" />
                                                </button>
                                            </TableHead>
                                        )}
                                        <TableHead className="text-center hidden lg:table-cell">
                                            <div className="flex items-center gap-1">
                                                <TrendingUp className="w-3 h-3 text-green-500" />/<TrendingDown className="w-3 h-3 text-red-500" />
                                            </div>
                                        </TableHead>
                                        <TableHead className="text-center hidden xl:table-cell">
                                            <Target className="w-3 h-3" />
                                        </TableHead>
                                        <TableHead className="text-center hidden md:table-cell">
                                            Last Season
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredClubs.map((club, idx) => {
                                        const league = getLeagueInfo(club.league_id);
                                        const inactive = isClubInactive(club.id);
                                        const lastSeason = getLastSeasonYear(club.id);
                                        return (
                                            <TableRow key={club.id} className={`hover:bg-slate-50 ${inactive ? 'bg-slate-50' : ''}`}>
                                                <TableCell className="text-slate-400 font-medium">{idx + 1}</TableCell>
                                                <TableCell>
                                                    <Link to={createPageUrl(`ClubDetail?id=${club.id}`)} className={`flex items-center gap-3 hover:text-emerald-600 ${inactive ? 'italic' : ''}`}>
                                                        {club.logo_url ? (
                                                            <img src={club.logo_url} alt="" className={`w-8 h-8 object-contain ${inactive ? 'opacity-50' : ''}`} />
                                                        ) : (
                                                            <div className={`w-8 h-8 rounded bg-slate-200 flex items-center justify-center ${inactive ? 'opacity-50' : ''}`}>
                                                                <Shield className="w-4 h-4 text-slate-400" />
                                                            </div>
                                                        )}
                                                        <div>
                                                            <div className={`font-medium flex items-center gap-2 ${inactive ? 'text-slate-500' : ''}`}>
                                                                {club.name}
                                                                {!inactive && (
                                                                    <span className={`text-xs px-1 py-0.5 rounded ${
                                                                        club.professional_status === 'professional' ? 'bg-blue-100 text-blue-700' :
                                                                        club.professional_status === 'semi-professional' ? 'bg-purple-100 text-purple-700' :
                                                                        'bg-slate-100 text-slate-500'
                                                                    }`}>
                                                                        {club.professional_status === 'professional' ? 'PRO' : 
                                                                         club.professional_status === 'semi-professional' ? 'SEMI' : 'AM'}
                                                                    </span>
                                                                )}
                                                                {isTuruliand && league?.tier && league.tier <= 4 && !inactive && (
                                                                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">TFA</Badge>
                                                                )}
                                                                {inactive && (
                                                                    <Badge variant="outline" className="text-xs bg-slate-100 text-slate-500 border-slate-300">Inactive</Badge>
                                                                )}
                                                            </div>
                                                            {club.nickname && <div className="text-xs text-slate-500">{club.nickname}</div>}
                                                        </div>
                                                    </Link>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {clubOVRMap[club.id] ? (
                                                        <span className="font-bold text-emerald-600">{clubOVRMap[club.id]}</span>
                                                    ) : (
                                                        <span className="text-slate-300">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="hidden md:table-cell">
                                                    <div className="text-sm">
                                                        {club.settlement || club.city || '-'}
                                                        {club.district && <span className="text-slate-400">, {club.district}</span>}
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
                                                            <div className="text-xs text-slate-500 mt-1 truncate max-w-[120px]">{league.name}</div>
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
                                                {(() => {
                                                    const calc = getCalculatedSeasons(club.id);
                                                    const val = club.seasons_top_flight || calc.topFlightSeasons;
                                                    return val > 0 ? (
                                                        <span className="font-medium">{val}</span>
                                                    ) : (
                                                        <span className="text-slate-300">-</span>
                                                    );
                                                })()}
                                                </TableCell>
                                                {isTuruliand && (
                                                    <TableCell className="text-center hidden xl:table-cell">
                                                        {(() => {
                                                            const calc = getCalculatedSeasons(club.id);
                                                            const val = club.seasons_in_tfa || calc.tfaSeasons;
                                                            return val > 0 ? (
                                                                <span className={`font-medium ${inactive ? 'text-slate-400' : 'text-blue-600'}`}>{val}</span>
                                                            ) : (
                                                                <span className="text-slate-300">-</span>
                                                            );
                                                        })()}
                                                    </TableCell>
                                                )}
                                                <TableCell className="text-center hidden lg:table-cell">
                                                    <div className="flex items-center justify-center gap-1 text-xs">
                                                        {(club.promotions || 0) > 0 && (
                                                            <span className="text-green-600 font-medium">{club.promotions}↑</span>
                                                        )}
                                                        {(club.relegations || 0) > 0 && (
                                                            <span className="text-red-600 font-medium">{club.relegations}↓</span>
                                                        )}
                                                        {!(club.promotions || club.relegations) && (
                                                            <span className="text-slate-300">-</span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center hidden xl:table-cell">
                                                    <div className="text-xs">
                                                        {club.best_finish ? (
                                                            <div className="flex flex-col items-center">
                                                                <span className="text-emerald-600 font-medium">
                                                                    {club.best_finish}{club.best_finish === 1 ? 'st' : club.best_finish === 2 ? 'nd' : club.best_finish === 3 ? 'rd' : 'th'}
                                                                </span>
                                                                {club.best_finish_tier && (
                                                                    <span className="text-slate-400">T{club.best_finish_tier}</span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-300">-</span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className={`text-center hidden md:table-cell ${inactive ? 'italic text-slate-500' : ''}`}>
                                                    {lastSeason ? (
                                                        inactive ? (
                                                            <span className="text-amber-600">{lastSeason}</span>
                                                        ) : (
                                                            <span className="text-slate-400">{lastSeason}</span>
                                                        )
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