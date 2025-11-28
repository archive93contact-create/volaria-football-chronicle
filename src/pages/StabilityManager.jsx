import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { ChevronRight, Shield, AlertTriangle, XCircle, CheckCircle, TrendingUp, TrendingDown, Calculator, Filter } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StabilityCalculator from '@/components/stability/StabilityCalculator';
import StabilityBadge from '@/components/stability/StabilityBadge';
import AdminOnly from '@/components/common/AdminOnly';

export default function StabilityManager() {
    const [selectedNation, setSelectedNation] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');

    const { data: nations = [] } = useQuery({
        queryKey: ['nations'],
        queryFn: () => base44.entities.Nation.list('name'),
    });

    const { data: clubs = [], refetch: refetchClubs } = useQuery({
        queryKey: ['allClubs'],
        queryFn: () => base44.entities.Club.list(),
    });

    const { data: leagues = [] } = useQuery({
        queryKey: ['allLeagues'],
        queryFn: () => base44.entities.League.list(),
    });

    // Filter clubs
    const filteredClubs = clubs.filter(club => {
        if (club.is_defunct || club.is_former_name) return false;
        if (selectedNation !== 'all' && club.nation_id !== selectedNation) return false;
        if (statusFilter === 'stable' && club.stability_status !== 'stable') return false;
        if (statusFilter === 'at_risk' && club.stability_status !== 'at_risk') return false;
        if (statusFilter === 'critical' && club.stability_status !== 'critical') return false;
        if (statusFilter === 'unset' && club.stability_points !== undefined) return false;
        return true;
    }).sort((a, b) => (a.stability_points || 0) - (b.stability_points || 0));

    // Stats
    const stats = {
        total: clubs.filter(c => !c.is_defunct && !c.is_former_name).length,
        stable: clubs.filter(c => c.stability_status === 'stable').length,
        atRisk: clubs.filter(c => c.stability_status === 'at_risk').length,
        critical: clubs.filter(c => c.stability_status === 'critical').length,
        unset: clubs.filter(c => c.stability_points === undefined && !c.is_defunct && !c.is_former_name).length,
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Hero */}
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-purple-900">
                <div className="absolute inset-0 bg-black/20" />
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <nav className="flex items-center gap-2 text-sm text-white/70 mb-4">
                        <Link to={createPageUrl('Home')} className="hover:text-white">Volaria</Link>
                        <ChevronRight className="w-4 h-4" />
                        <span className="text-white">Club Stability Manager</span>
                    </nav>
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-purple-500/30 rounded-xl flex items-center justify-center">
                            <Calculator className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-white">Club Stability Manager</h1>
                            <p className="text-white/70 mt-1">Track and manage club financial health across Volaria</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-slate-700">{stats.total}</div>
                            <div className="text-xs text-slate-500">Total Clubs</div>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm bg-green-50">
                        <CardContent className="p-4 text-center">
                            <CheckCircle className="w-5 h-5 text-green-500 mx-auto mb-1" />
                            <div className="text-2xl font-bold text-green-700">{stats.stable}</div>
                            <div className="text-xs text-green-600">Stable</div>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm bg-amber-50">
                        <CardContent className="p-4 text-center">
                            <AlertTriangle className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                            <div className="text-2xl font-bold text-amber-700">{stats.atRisk}</div>
                            <div className="text-xs text-amber-600">At Risk</div>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm bg-red-50">
                        <CardContent className="p-4 text-center">
                            <XCircle className="w-5 h-5 text-red-500 mx-auto mb-1" />
                            <div className="text-2xl font-bold text-red-700">{stats.critical}</div>
                            <div className="text-xs text-red-600">Critical</div>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm bg-slate-100">
                        <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-slate-500">{stats.unset}</div>
                            <div className="text-xs text-slate-500">Not Calculated</div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Calculator */}
                    <div className="lg:col-span-1">
                        <AdminOnly>
                            <StabilityCalculator 
                                nationId={selectedNation !== 'all' ? selectedNation : null}
                                onComplete={refetchClubs}
                            />
                        </AdminOnly>

                        {/* Legend */}
                        <Card className="border-0 shadow-sm mt-6">
                            <CardHeader>
                                <CardTitle className="text-sm">Stability Points Guide</CardTitle>
                            </CardHeader>
                            <CardContent className="text-xs space-y-3">
                                <div>
                                    <div className="font-semibold text-slate-700 mb-1">Base Points by Tier</div>
                                    <div className="space-y-1 text-slate-600">
                                        <div>Tiers 1-4: 20 pts</div>
                                        <div>Tier 5: 16 pts</div>
                                        <div>Tiers 6-9: 14 pts</div>
                                        <div>Tiers 10-11: 12 pts</div>
                                        <div>Tiers 12-14: 10 pts</div>
                                        <div>Tiers 15+: 8 pts</div>
                                    </div>
                                </div>
                                <div>
                                    <div className="font-semibold text-slate-700 mb-1">Season Adjustments</div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between">
                                            <span className="text-green-600">Champion T1</span>
                                            <span>+7</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-green-600">Promoted</span>
                                            <span>+2 to +5</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-blue-600">Mid-table</span>
                                            <span>+1</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-red-600">Relegated</span>
                                            <span>-2</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-red-600">Bottom</span>
                                            <span>-3</span>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Club List */}
                    <div className="lg:col-span-2">
                        <Card className="border-0 shadow-sm">
                            <CardHeader>
                                <div className="flex flex-wrap items-center justify-between gap-4">
                                    <CardTitle>Club Stability</CardTitle>
                                    <div className="flex gap-2">
                                        <Select value={selectedNation} onValueChange={setSelectedNation}>
                                            <SelectTrigger className="w-40">
                                                <SelectValue placeholder="All Nations" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Nations</SelectItem>
                                                {nations.map(n => (
                                                    <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                                            <SelectTrigger className="w-32">
                                                <SelectValue placeholder="All Status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Status</SelectItem>
                                                <SelectItem value="stable">Stable</SelectItem>
                                                <SelectItem value="at_risk">At Risk</SelectItem>
                                                <SelectItem value="critical">Critical</SelectItem>
                                                <SelectItem value="unset">Not Set</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="border rounded-lg overflow-hidden max-h-[600px] overflow-y-auto">
                                    <Table>
                                        <TableHeader className="sticky top-0 bg-slate-100">
                                            <TableRow>
                                                <TableHead>Club</TableHead>
                                                <TableHead>Nation</TableHead>
                                                <TableHead>League</TableHead>
                                                <TableHead className="text-center">Points</TableHead>
                                                <TableHead>Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredClubs.map(club => {
                                                const nation = nations.find(n => n.id === club.nation_id);
                                                const league = leagues.find(l => l.id === club.league_id);
                                                
                                                return (
                                                    <TableRow 
                                                        key={club.id}
                                                        className={
                                                            club.stability_status === 'critical' ? 'bg-red-50' :
                                                            club.stability_status === 'at_risk' ? 'bg-amber-50' : ''
                                                        }
                                                    >
                                                        <TableCell>
                                                            <Link 
                                                                to={createPageUrl(`ClubDetail?id=${club.id}`)}
                                                                className="flex items-center gap-2 hover:text-emerald-600"
                                                            >
                                                                {club.logo_url ? (
                                                                    <img src={club.logo_url} alt="" className="w-6 h-6 object-contain" />
                                                                ) : (
                                                                    <Shield className="w-6 h-6 text-slate-300" />
                                                                )}
                                                                <span className="font-medium">{club.name}</span>
                                                            </Link>
                                                        </TableCell>
                                                        <TableCell className="text-sm text-slate-600">
                                                            {nation?.name || '-'}
                                                        </TableCell>
                                                        <TableCell className="text-sm text-slate-600">
                                                            {league?.name || '-'}
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <span className={`font-mono font-bold ${
                                                                (club.stability_points || 0) < 0 ? 'text-red-600' : 'text-green-600'
                                                            }`}>
                                                                {club.stability_points !== undefined 
                                                                    ? (club.stability_points >= 0 ? '+' : '') + club.stability_points
                                                                    : '-'}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell>
                                                            {club.stability_status ? (
                                                                <StabilityBadge 
                                                                    points={club.stability_points} 
                                                                    status={club.stability_status}
                                                                    showPoints={false}
                                                                    size="small"
                                                                />
                                                            ) : (
                                                                <Badge variant="outline" className="text-xs">Not Set</Badge>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                                <p className="text-xs text-slate-500 mt-2 text-center">
                                    Showing {filteredClubs.length} clubs
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}