import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { TrendingUp, TrendingDown, Minus, Trophy, Star, Shield, RefreshCw } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import PageHeader from '@/components/common/PageHeader';
import AdminOnly from '@/components/common/AdminOnly';

export default function Coefficients() {
    const { data: countryCoefficients = [] } = useQuery({
        queryKey: ['coefficients'],
        queryFn: () => base44.entities.CountryCoefficient.list('rank'),
    });

    const { data: clubCoefficients = [] } = useQuery({
        queryKey: ['clubCoefficients'],
        queryFn: () => base44.entities.ClubCoefficient.list('rank'),
    });

    const { data: nations = [] } = useQuery({
        queryKey: ['nations'],
        queryFn: () => base44.entities.Nation.list('name'),
    });

    const getRankChange = (current, previous) => {
        if (!previous) return null;
        const diff = previous - current;
        if (diff > 0) return { icon: TrendingUp, color: 'text-green-500', text: `+${diff}` };
        if (diff < 0) return { icon: TrendingDown, color: 'text-red-500', text: `${diff}` };
        return { icon: Minus, color: 'text-slate-400', text: '–' };
    };

    const getNationFlag = (nationName) => {
        const nation = nations.find(n => n.name === nationName);
        return nation?.flag_url;
    };

    const getNationId = (nationName) => {
        const nation = nations.find(n => n.name === nationName);
        return nation?.id;
    };

    // Separate by membership
    const vccCountries = countryCoefficients.filter(c => {
        const nation = nations.find(n => n.id === c.nation_id || n.name === c.nation_name);
        return nation?.membership === 'VCC';
    }).sort((a, b) => a.rank - b.rank);

    const cccCountries = countryCoefficients.filter(c => {
        const nation = nations.find(n => n.id === c.nation_id || n.name === c.nation_name);
        return nation?.membership === 'CCC';
    }).sort((a, b) => a.rank - b.rank);

    const vccClubs = clubCoefficients.filter(c => c.membership === 'VCC').sort((a, b) => a.rank - b.rank);
    const cccClubs = clubCoefficients.filter(c => c.membership === 'CCC').sort((a, b) => a.rank - b.rank);

    const renderCountryTable = (data, type) => (
        <Table>
            <TableHeader className="bg-slate-100">
                <TableRow>
                    <TableHead className="w-16">Rank</TableHead>
                    <TableHead>Nation</TableHead>
                    <TableHead className="text-center font-bold">Total</TableHead>
                    <TableHead className="text-center">{type === 'VCC' ? 'VCC' : 'CCC'} Spots</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {data.map((coeff, idx) => {
                    const rankChange = getRankChange(coeff.rank, coeff.previous_rank);
                    const topSpots = type === 'VCC' ? 5 : 9;
                    return (
                        <TableRow key={coeff.id} className={idx < topSpots ? (type === 'VCC' ? 'bg-amber-50/50' : 'bg-blue-50/50') : ''}>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <span className={`font-bold text-lg ${idx < topSpots ? (type === 'VCC' ? 'text-amber-600' : 'text-blue-600') : ''}`}>
                                        {coeff.rank}
                                    </span>
                                    {rankChange && <rankChange.icon className={`w-4 h-4 ${rankChange.color}`} />}
                                </div>
                            </TableCell>
                            <TableCell>
                                <Link to={createPageUrl(`NationDetail?id=${coeff.nation_id}`)} className="flex items-center gap-2 hover:text-emerald-600">
                                    {getNationFlag(coeff.nation_name) && (
                                        <img src={getNationFlag(coeff.nation_name)} alt="" className="w-6 h-4 object-cover rounded" />
                                    )}
                                    <span className="font-semibold">{coeff.nation_name}</span>
                                </Link>
                            </TableCell>
                            <TableCell className="text-center font-bold text-lg">{coeff.total_points?.toFixed(3)}</TableCell>
                            <TableCell className="text-center">
                                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-bold text-sm ${
                                    type === 'VCC' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                                }`}>
                                    {type === 'VCC' ? (coeff.vcc_spots || (idx < 5 ? 2 : 1)) : (coeff.ccc_spots || (idx < 9 ? 2 : 1))}
                                </span>
                            </TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    );

    const renderClubTable = (data, type) => (
        <Table>
            <TableHeader className="bg-slate-100 sticky top-0">
                <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Club</TableHead>
                    <TableHead>Nation</TableHead>
                    <TableHead className="text-center font-bold">Total</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {data.map((club, idx) => (
                    <TableRow key={club.id} className={idx < 10 ? (type === 'VCC' ? 'bg-amber-50/50' : 'bg-blue-50/50') : ''}>
                        <TableCell className={`font-bold ${idx < 10 ? (type === 'VCC' ? 'text-amber-600' : 'text-blue-600') : ''}`}>
                            {club.rank}
                        </TableCell>
                        <TableCell>
                            <Link to={createPageUrl(`ClubDetail?id=${club.club_id}`)} className="font-medium hover:text-emerald-600">
                                {club.club_name}
                            </Link>
                        </TableCell>
                        <TableCell>
                            <div className="flex items-center gap-2">
                                {getNationFlag(club.nation_name) && (
                                    <img src={getNationFlag(club.nation_name)} alt="" className="w-5 h-3 object-cover rounded" />
                                )}
                                <span className="text-slate-500 text-sm">{club.nation_name}</span>
                            </div>
                        </TableCell>
                        <TableCell className="text-center font-bold text-lg">{club.total_points?.toFixed(3)}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );

    return (
        <div className="min-h-screen bg-slate-50">
            <PageHeader 
                title="Coefficients"
                subtitle="Country and club rankings based on continental competition performance"
                breadcrumbs={[{ label: 'Coefficients' }]}
            >
                <AdminOnly>
                    <Link to={createPageUrl('RecalculateCoefficients')}>
                        <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 mt-4">
                            <RefreshCw className="w-4 h-4 mr-2" /> Recalculate
                        </Button>
                    </Link>
                </AdminOnly>
            </PageHeader>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Tabs defaultValue="vcc-countries" className="space-y-6">
                    <TabsList className="grid grid-cols-4 w-full max-w-2xl">
                        <TabsTrigger value="vcc-countries" className="flex items-center gap-1">
                            <Trophy className="w-4 h-4" /> VCC Countries
                        </TabsTrigger>
                        <TabsTrigger value="vcc-clubs" className="flex items-center gap-1">
                            <Trophy className="w-4 h-4" /> VCC Clubs
                        </TabsTrigger>
                        <TabsTrigger value="ccc-countries" className="flex items-center gap-1">
                            <Shield className="w-4 h-4" /> CCC Countries
                        </TabsTrigger>
                        <TabsTrigger value="ccc-clubs" className="flex items-center gap-1">
                            <Shield className="w-4 h-4" /> CCC Clubs
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="vcc-countries">
                        <Card className="border-0 shadow-lg overflow-hidden">
                            <CardHeader className="bg-gradient-to-r from-amber-600 to-amber-500">
                                <CardTitle className="text-white flex items-center gap-2">
                                    <Trophy className="w-5 h-5" /> VCC Country Rankings
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                {vccCountries.length === 0 ? (
                                    <div className="p-8 text-center text-slate-500">No VCC country rankings yet</div>
                                ) : (
                                    <div className="overflow-x-auto">{renderCountryTable(vccCountries, 'VCC')}</div>
                                )}
                            </CardContent>
                        </Card>
                        <div className="mt-4 text-sm text-slate-600">
                            <p><strong>Qualification:</strong> Top 5 nations get 2 spots, remaining nations get 1 spot. Previous champion auto-qualifies.</p>
                        </div>
                    </TabsContent>

                    <TabsContent value="vcc-clubs">
                        <Card className="border-0 shadow-lg overflow-hidden">
                            <CardHeader className="bg-gradient-to-r from-amber-600 to-amber-500">
                                <CardTitle className="text-white flex items-center gap-2">
                                    <Trophy className="w-5 h-5" /> VCC Club Rankings
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0 max-h-[600px] overflow-y-auto">
                                {vccClubs.length === 0 ? (
                                    <div className="p-8 text-center text-slate-500">No VCC club rankings yet</div>
                                ) : (
                                    renderClubTable(vccClubs, 'VCC')
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="ccc-countries">
                        <Card className="border-0 shadow-lg overflow-hidden">
                            <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-500">
                                <CardTitle className="text-white flex items-center gap-2">
                                    <Shield className="w-5 h-5" /> CCC Country Rankings
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                {cccCountries.length === 0 ? (
                                    <div className="p-8 text-center text-slate-500">No CCC country rankings yet</div>
                                ) : (
                                    <div className="overflow-x-auto">{renderCountryTable(cccCountries, 'CCC')}</div>
                                )}
                            </CardContent>
                        </Card>
                        <div className="mt-4 text-sm text-slate-600">
                            <p><strong>Qualification:</strong> Top 9 nations get 2 spots, remaining nations get 1 spot. Previous champion auto-qualifies.</p>
                        </div>
                    </TabsContent>

                    <TabsContent value="ccc-clubs">
                        <Card className="border-0 shadow-lg overflow-hidden">
                            <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-500">
                                <CardTitle className="text-white flex items-center gap-2">
                                    <Shield className="w-5 h-5" /> CCC Club Rankings
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0 max-h-[600px] overflow-y-auto">
                                {cccClubs.length === 0 ? (
                                    <div className="p-8 text-center text-slate-500">No CCC club rankings yet</div>
                                ) : (
                                    renderClubTable(cccClubs, 'CCC')
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                {/* Legend */}
                <div className="mt-8 flex flex-wrap gap-6 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-green-500" />
                        <span>Rank Improved</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <TrendingDown className="w-4 h-4 text-red-500" />
                        <span>Rank Dropped</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-xs">2</span>
                        <span>VCC Qualification Spots</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">2</span>
                        <span>CCC Qualification Spots</span>
                    </div>
                </div>
            </div>
        </div>
    );
}