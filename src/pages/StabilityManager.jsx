import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import { Shield, AlertTriangle, CheckCircle, XCircle, RefreshCw, BarChart3, Loader2, Info } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import PageHeader from '@/components/common/PageHeader';
import AdminOnly from '@/components/common/AdminOnly';
import StabilityBadge from '@/components/stability/StabilityBadge';
import ProfessionalStatusBadge from '@/components/clubs/ProfessionalStatusBadge';
import { estimateNationPopulation, estimateSustainableProClubs } from '@/components/common/populationUtils';

// Stability calculation functions
const getBaseStabilityByTier = (tier, maxTierInNation = 4) => {
    const nationSizeAdjust = Math.min(0, (maxTierInNation - 4) * 2);
    let base;
    if (tier === 1) base = 18;
    else if (tier === 2) base = 16;
    else if (tier === 3) base = 14;
    else if (tier === 4) base = 12;
    else if (tier <= 6) base = 10;
    else if (tier <= 9) base = 8;
    else base = 6;
    return Math.max(5, base + nationSizeAdjust);
};

const getChampionBonus = (tier) => {
    if (tier === 1) return 4;
    if (tier === 2) return 3;
    if (tier <= 4) return 2;
    return 1;
};

const getPromotionBonus = (tier) => {
    if (tier === 1) return 3;
    if (tier === 2) return 2;
    return 1;
};

const calculateClubStability = (clubId, leagueTables, leagues, seasons, maxTierInNation = 4) => {
    const clubSeasons = leagueTables
        .filter(lt => lt.club_id === clubId)
        .sort((a, b) => a.year.localeCompare(b.year));

    if (clubSeasons.length === 0) {
        return { points: 0, status: 'stable' };
    }

    let currentPoints = 0;

    clubSeasons.forEach((season, index) => {
        const league = leagues.find(l => l.id === season.league_id);
        const tier = league?.tier || 1;
        const seasonData = seasons.find(s => s.league_id === season.league_id && s.year === season.year);
        const teamsInLeague = seasonData?.number_of_teams || 12;

        if (index === 0) {
            currentPoints = getBaseStabilityByTier(tier, maxTierInNation);
        }

        if (season.status === 'champion' || season.position === 1) {
            currentPoints += getChampionBonus(tier);
        } else if (season.status === 'promoted' || season.status === 'playoff_winner') {
            currentPoints += getPromotionBonus(tier);
        } else if (season.status === 'relegated') {
            currentPoints -= season.position === teamsInLeague ? 3 : 2;
        } else if (season.position <= Math.floor(teamsInLeague / 2)) {
            currentPoints += 1;
        }
    });

    let status = 'stable';
    if (currentPoints <= -5) status = 'critical';
    else if (currentPoints <= 0) status = 'at_risk';

    return { points: currentPoints, status };
};

const calculateProClubEstimate = (nationClubs, nationLeagues, nation) => {
    const membership = nation?.membership;
    const maxTier = Math.max(...nationLeagues.map(l => l.tier || 1), 1);
    
    const topFlightLeagues = nationLeagues.filter(l => l.tier === 1);
    let topDivisionSize = topFlightLeagues.reduce((max, l) => Math.max(max, l.number_of_teams || 0), 0);
    if (topDivisionSize === 0 && topFlightLeagues.length > 0) {
        const topFlightLeagueIds = topFlightLeagues.map(l => l.id);
        const topFlightClubs = nationClubs.filter(c => topFlightLeagueIds.includes(c.league_id));
        topDivisionSize = topFlightClubs.length || 8;
    }
    if (topDivisionSize === 0) topDivisionSize = 12;
    
    const geoRegions = new Set(nationClubs.map(c => c.region).filter(Boolean));
    const geoDistricts = new Set(nationClubs.map(c => c.district).filter(Boolean));
    const geoSettlements = new Set(nationClubs.map(c => c.settlement || c.city).filter(Boolean));
    
    const leaguesWithTeams = nationLeagues.filter(l => l.number_of_teams > 0);
    const avgDivisionSize = leaguesWithTeams.length > 0 
        ? leaguesWithTeams.reduce((sum, l) => sum + l.number_of_teams, 0) / leaguesWithTeams.length 
        : topDivisionSize;
    
    const populationData = estimateNationPopulation(nationClubs.length, nationLeagues.length, membership, maxTier, {
        topDivisionSize,
        avgDivisionSize,
        totalDivisions: nationLeagues.length,
        regionCount: geoRegions.size,
        districtCount: geoDistricts.size,
        settlementCount: geoSettlements.size
    });
    
    let strengthScore = membership === 'VCC' ? 50 : membership === 'CCC' ? 30 : 20;
    strengthScore += nationClubs.filter(c => c.vcc_titles > 0).length * 10;
    strengthScore += nationClubs.filter(c => c.ccc_titles > 0).length * 5;
    strengthScore += maxTier * 3;
    strengthScore += (nation?.nation_strength || 5) * 5;
    strengthScore = Math.min(strengthScore, 100);
    
    const proClubs = estimateSustainableProClubs(populationData.value, topDivisionSize, maxTier, membership, strengthScore);
    
    return { 
        proClubsMax: proClubs.max, 
        proClubsMin: proClubs.min, 
        topDivisionSize, 
        maxTier 
    };
};

/**
 * Assign professional status based on stability ranking.
 * Max Pro slots = proClubsMax from estimate
 * Max Semi-Pro slots = proClubsMax * 1.5
 * Rest = Amateur
 */
const assignProfessionalStatusForNation = (nationClubsWithStability, nation, leagues) => {
    const nationLeagues = leagues.filter(l => l.nation_id === nation?.id);
    if (nationLeagues.length === 0) return {};
    
    const { proClubsMax, topDivisionSize } = calculateProClubEstimate(nationClubsWithStability, nationLeagues, nation);
    
    const activeClubs = nationClubsWithStability
        .filter(c => !c.is_defunct && !c.is_former_name);
    
    // Sort by stability points (highest first)
    const sortedByStability = [...activeClubs].sort((a, b) => {
        return (b.stability_points || 0) - (a.stability_points || 0);
    });
    
    const assignments = {};
    
    // Max Pro = estimate (at least top division size)
    const maxProSlots = Math.max(proClubsMax, topDivisionSize);
    // Max Semi-Pro = Pro * 1.5
    const maxSemiProSlots = Math.round(maxProSlots * 1.5);
    
    let proCount = 0;
    let semiProCount = 0;
    
    // Assign based on stability ranking
    sortedByStability.forEach((club) => {
        if (proCount < maxProSlots) {
            assignments[club.id] = 'professional';
            proCount++;
        } else if (semiProCount < maxSemiProSlots) {
            assignments[club.id] = 'semi-professional';
            semiProCount++;
        } else {
            assignments[club.id] = 'amateur';
        }
    });
    
    return assignments;
};

export default function StabilityManager() {
    const queryClient = useQueryClient();
    const [nationFilter, setNationFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortBy, setSortBy] = useState('stability');
    const [isCalculating, setIsCalculating] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0, nation: '' });

    const { data: nations = [] } = useQuery({
        queryKey: ['nations'],
        queryFn: () => base44.entities.Nation.list(),
    });

    const { data: clubs = [] } = useQuery({
        queryKey: ['clubs'],
        queryFn: () => base44.entities.Club.list(),
    });

    const { data: leagues = [] } = useQuery({
        queryKey: ['leagues'],
        queryFn: () => base44.entities.League.list(),
    });

    const { data: leagueTables = [] } = useQuery({
        queryKey: ['leagueTables'],
        queryFn: () => base44.entities.LeagueTable.list(),
    });

    const { data: seasons = [] } = useQuery({
        queryKey: ['seasons'],
        queryFn: () => base44.entities.Season.list(),
    });

    const calculateAllClubs = async () => {
        setIsCalculating(true);
        setProgress({ current: 0, total: clubs.length, nation: 'Starting...' });
        
        const nationIds = [...new Set(clubs.map(c => c.nation_id).filter(Boolean))];
        let processed = 0;
        
        for (const nationId of nationIds) {
            const nation = nations.find(n => n.id === nationId);
            setProgress(p => ({ ...p, nation: nation?.name || 'Unknown' }));
            
            const nationClubs = clubs.filter(c => c.nation_id === nationId);
            const nationLeagues = leagues.filter(l => l.nation_id === nationId);
            const maxTierInNation = Math.max(...nationLeagues.map(l => l.tier || 1), 1);
            
            // Calculate stability for all clubs
            const stabilityUpdates = {};
            for (const club of nationClubs) {
                const { points, status } = calculateClubStability(club.id, leagueTables, leagues, seasons, maxTierInNation);
                stabilityUpdates[club.id] = { points, status };
            }
            
            // Create updated club list with stability
            const updatedNationClubs = nationClubs.map(c => ({
                ...c,
                stability_points: stabilityUpdates[c.id]?.points ?? 0
            }));
            
            // Assign professional status based on stability ranking
            const proStatusAssignments = assignProfessionalStatusForNation(updatedNationClubs, nation, leagues);
            
            // Update each club
            for (const club of nationClubs) {
                const stability = stabilityUpdates[club.id] || { points: 0, status: 'stable' };
                const proStatus = proStatusAssignments[club.id] || 'amateur';
                
                await base44.entities.Club.update(club.id, {
                    stability_points: stability.points,
                    stability_status: stability.status,
                    professional_status: proStatus
                });
                
                processed++;
                setProgress(p => ({ ...p, current: processed }));
            }
        }
        
        queryClient.invalidateQueries(['clubs']);
        setIsCalculating(false);
        setProgress({ current: 0, total: 0, nation: '' });
    };

    const filteredClubs = useMemo(() => {
        return clubs
            .filter(club => {
                if (nationFilter !== 'all' && club.nation_id !== nationFilter) return false;
                if (statusFilter === 'stable' && club.stability_status !== 'stable') return false;
                if (statusFilter === 'at_risk' && club.stability_status !== 'at_risk') return false;
                if (statusFilter === 'critical' && club.stability_status !== 'critical') return false;
                if (statusFilter === 'unset' && club.stability_points !== undefined && club.stability_points !== null) return false;
                return true;
            })
            .sort((a, b) => {
                if (sortBy === 'stability') return (b.stability_points || 0) - (a.stability_points || 0);
                if (sortBy === 'name') return a.name.localeCompare(b.name);
                return 0;
            });
    }, [clubs, nationFilter, statusFilter, sortBy]);

    const stats = useMemo(() => {
        const total = clubs.length;
        const stable = clubs.filter(c => c.stability_status === 'stable').length;
        const atRisk = clubs.filter(c => c.stability_status === 'at_risk').length;
        const critical = clubs.filter(c => c.stability_status === 'critical').length;
        const unset = clubs.filter(c => c.stability_points === undefined || c.stability_points === null).length;
        const pro = clubs.filter(c => c.professional_status === 'professional').length;
        const semiPro = clubs.filter(c => c.professional_status === 'semi-professional').length;
        const amateur = clubs.filter(c => c.professional_status === 'amateur').length;
        return { total, stable, atRisk, critical, unset, pro, semiPro, amateur };
    }, [clubs]);

    return (
        <div className="min-h-screen bg-slate-50">
            <PageHeader 
                title="Club Stability Manager"
                subtitle="Monitor and manage financial stability across all clubs"
                breadcrumbs={[{ label: 'Stability' }]}
            />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold">{stats.total}</div>
                            <div className="text-xs text-slate-500">Total</div>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm bg-green-50">
                        <CardContent className="p-4 text-center">
                            <CheckCircle className="w-4 h-4 text-green-500 mx-auto mb-1" />
                            <div className="text-xl font-bold text-green-700">{stats.stable}</div>
                            <div className="text-xs text-green-600">Stable</div>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm bg-amber-50">
                        <CardContent className="p-4 text-center">
                            <AlertTriangle className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                            <div className="text-xl font-bold text-amber-700">{stats.atRisk}</div>
                            <div className="text-xs text-amber-600">At Risk</div>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm bg-red-50">
                        <CardContent className="p-4 text-center">
                            <XCircle className="w-4 h-4 text-red-500 mx-auto mb-1" />
                            <div className="text-xl font-bold text-red-700">{stats.critical}</div>
                            <div className="text-xs text-red-600">Critical</div>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm bg-indigo-50">
                        <CardContent className="p-4 text-center">
                            <div className="text-xl font-bold text-indigo-700">{stats.pro}</div>
                            <div className="text-xs text-indigo-600">Professional</div>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm bg-purple-50">
                        <CardContent className="p-4 text-center">
                            <div className="text-xl font-bold text-purple-700">{stats.semiPro}</div>
                            <div className="text-xs text-purple-600">Semi-Pro</div>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm bg-slate-100">
                        <CardContent className="p-4 text-center">
                            <div className="text-xl font-bold text-slate-600">{stats.amateur}</div>
                            <div className="text-xs text-slate-500">Amateur</div>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm bg-slate-100">
                        <CardContent className="p-4 text-center">
                            <Info className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                            <div className="text-xl font-bold text-slate-600">{stats.unset}</div>
                            <div className="text-xs text-slate-500">Unset</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Admin Actions */}
                <AdminOnly>
                    <Card className="border-0 shadow-sm mb-8">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <BarChart3 className="w-5 h-5" />
                                Recalculate All Stability & Pro Status
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-slate-600 mb-4">
                                Calculates stability from ALL existing seasons. Pro status: Top N by stability = PRO (N = nation limit), 
                                next N×1.5 = Semi-Pro, rest = Amateur.
                            </p>
                            
                            {isCalculating ? (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span className="text-sm">Processing {progress.nation}...</span>
                                    </div>
                                    <Progress value={(progress.current / progress.total) * 100} />
                                    <p className="text-xs text-slate-500">{progress.current} / {progress.total} clubs</p>
                                </div>
                            ) : (
                                <Button onClick={calculateAllClubs} className="bg-emerald-600 hover:bg-emerald-700">
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Calculate All Clubs Now
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                </AdminOnly>

                {/* Filters */}
                <div className="flex flex-wrap gap-4 mb-6">
                    <Select value={nationFilter} onValueChange={setNationFilter}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Filter by nation" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Nations</SelectItem>
                            {nations.map(n => (
                                <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="stable">Stable</SelectItem>
                            <SelectItem value="at_risk">At Risk</SelectItem>
                            <SelectItem value="critical">Critical</SelectItem>
                            <SelectItem value="unset">Not Set</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="stability">Stability</SelectItem>
                            <SelectItem value="name">Name</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Clubs Table */}
                <Card className="border-0 shadow-sm">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-100">
                                <TableHead>Club</TableHead>
                                <TableHead>Nation</TableHead>
                                <TableHead>League</TableHead>
                                <TableHead className="text-center">Stability</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                                <TableHead className="text-center">Pro Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredClubs.slice(0, 100).map(club => {
                                const nation = nations.find(n => n.id === club.nation_id);
                                const league = leagues.find(l => l.id === club.league_id);
                                return (
                                    <TableRow key={club.id}>
                                        <TableCell>
                                            <Link to={createPageUrl(`ClubDetail?id=${club.id}`)} className="font-medium hover:text-emerald-600">
                                                {club.name}
                                            </Link>
                                        </TableCell>
                                        <TableCell className="text-slate-600">{nation?.name || '-'}</TableCell>
                                        <TableCell className="text-slate-600">{league?.name || '-'}</TableCell>
                                        <TableCell className="text-center">
                                            <span className={`font-bold ${
                                                (club.stability_points || 0) > 0 ? 'text-green-600' :
                                                (club.stability_points || 0) < 0 ? 'text-red-600' : 'text-slate-500'
                                            }`}>
                                                {club.stability_points !== undefined && club.stability_points !== null ? 
                                                    (club.stability_points >= 0 ? '+' : '') + club.stability_points : 
                                                    '-'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {club.stability_status ? (
                                                <StabilityBadge points={club.stability_points} status={club.stability_status} />
                                            ) : (
                                                <span className="text-slate-400">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {club.professional_status ? (
                                                <ProfessionalStatusBadge status={club.professional_status} size="small" />
                                            ) : (
                                                <span className="text-slate-400">-</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                    {filteredClubs.length > 100 && (
                        <div className="p-4 text-center text-sm text-slate-500">
                            Showing 100 of {filteredClubs.length} clubs. Use filters to narrow down.
                        </div>
                    )}
                </Card>

                {/* Guide */}
                <Card className="border-0 shadow-sm mt-8">
                    <CardHeader>
                        <CardTitle>How It Works</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                            <div>
                                <h4 className="font-semibold mb-2">Stability Points</h4>
                                <ul className="space-y-1 text-slate-600">
                                    <li>• Base points set by starting tier</li>
                                    <li>• Champions: +2 to +4 pts</li>
                                    <li>• Promoted: +1 to +3 pts</li>
                                    <li>• Top half finish: +1 pt</li>
                                    <li>• Relegated: -2 to -3 pts</li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold mb-2">Professional Status</h4>
                                <ul className="space-y-1 text-slate-600">
                                    <li>• Max PRO = nation's limit (from population)</li>
                                    <li>• Max Semi-Pro = PRO limit × 1.5</li>
                                    <li>• Top clubs by stability fill PRO slots</li>
                                    <li>• Next batch fill Semi-Pro slots</li>
                                    <li>• Rest = Amateur</li>
                                </ul>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}