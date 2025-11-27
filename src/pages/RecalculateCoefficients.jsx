import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { RefreshCw, Check, AlertCircle, Trophy, Shield, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from '@/components/common/PageHeader';
import AdminOnly from '@/components/common/AdminOnly';
import { calculateCoefficients } from '@/components/coefficients/CoefficientCalculator';

export default function RecalculateCoefficients() {
    const queryClient = useQueryClient();
    const [calculatedData, setCalculatedData] = useState(null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const { data: competitions = [] } = useQuery({
        queryKey: ['continentalCompetitions'],
        queryFn: () => base44.entities.ContinentalCompetition.list(),
    });

    const { data: seasons = [] } = useQuery({
        queryKey: ['continentalSeasons'],
        queryFn: () => base44.entities.ContinentalSeason.list(),
    });

    const { data: matches = [] } = useQuery({
        queryKey: ['allContinentalMatches'],
        queryFn: () => base44.entities.ContinentalMatch.list(),
    });

    const { data: nations = [] } = useQuery({
        queryKey: ['nations'],
        queryFn: () => base44.entities.Nation.list(),
    });

    const { data: clubs = [] } = useQuery({
        queryKey: ['allClubs'],
        queryFn: () => base44.entities.Club.list(),
    });

    const { data: existingCountryCoeffs = [] } = useQuery({
        queryKey: ['coefficients'],
        queryFn: () => base44.entities.CountryCoefficient.list(),
    });

    const { data: existingClubCoeffs = [] } = useQuery({
        queryKey: ['clubCoefficients'],
        queryFn: () => base44.entities.ClubCoefficient.list(),
    });

    const handleCalculate = () => {
        const result = calculateCoefficients(seasons, matches, competitions, nations, clubs);
        setCalculatedData(result);
        setSaved(false);
    };

    const handleSave = async () => {
        if (!calculatedData) return;
        
        setSaving(true);
        
        // Delete existing coefficients
        for (const coeff of existingCountryCoeffs) {
            await base44.entities.CountryCoefficient.delete(coeff.id);
        }
        for (const coeff of existingClubCoeffs) {
            await base44.entities.ClubCoefficient.delete(coeff.id);
        }
        
        // Create new country coefficients
        for (const coeff of calculatedData.nationCoefficients) {
            await base44.entities.CountryCoefficient.create(coeff);
        }
        
        // Create new club coefficients
        for (const coeff of calculatedData.clubCoefficients) {
            await base44.entities.ClubCoefficient.create(coeff);
        }
        
        queryClient.invalidateQueries(['coefficients']);
        queryClient.invalidateQueries(['clubCoefficients']);
        
        setSaving(false);
        setSaved(true);
    };

    const vccNations = calculatedData?.nationCoefficients.filter(n => n.membership === 'VCC') || [];
    const cccNations = calculatedData?.nationCoefficients.filter(n => n.membership === 'CCC') || [];
    const vccClubs = calculatedData?.clubCoefficients.filter(c => c.membership === 'VCC') || [];
    const cccClubs = calculatedData?.clubCoefficients.filter(c => c.membership === 'CCC') || [];

    return (
        <div className="min-h-screen bg-slate-50">
            <PageHeader 
                title="Recalculate Coefficients"
                subtitle="Automatically calculate rankings from continental competition results"
                breadcrumbs={[
                    { label: 'Country Coefficients', url: createPageUrl('CountryCoefficients') },
                    { label: 'Recalculate' }
                ]}
            />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Info Card */}
                <Card className="border-0 shadow-sm mb-6">
                    <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center">
                                <RefreshCw className="w-6 h-6 text-emerald-600" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-lg mb-2">How Coefficients Are Calculated</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-600">
                                    <div>
                                        <p className="font-medium text-amber-700 mb-1">VCC Points (per match)</p>
                                        <ul className="space-y-1">
                                            <li>Round of 32: 0.2 win / 0.1 draw / 0.05 loss</li>
                                            <li>Round of 16: 0.5 win / 0.25 draw / 0.12 loss</li>
                                            <li>Quarter-final: 0.7 win / 0.35 draw / 0.17 loss</li>
                                            <li>Semi-final: 1.0 win / 0.5 draw / 0.25 loss</li>
                                            <li>Final: 1.2 win / 0.8 draw / 0.4 loss</li>
                                        </ul>
                                    </div>
                                    <div>
                                        <p className="font-medium text-blue-700 mb-1">CCC Points (per match)</p>
                                        <ul className="space-y-1">
                                            <li>Round of 32: 0.05 win / 0.025 draw / 0.015 loss</li>
                                            <li>Round of 16: 0.1 win / 0.05 draw / 0.025 loss</li>
                                            <li>Quarter-final: 0.25 win / 0.12 draw / 0.07 loss</li>
                                            <li>Semi-final: 0.35 win / 0.25 draw / 0.1 loss</li>
                                            <li>Final: 0.5 win / 0.35 draw / 0.12 loss</li>
                                        </ul>
                                    </div>
                                </div>
                                <p className="text-sm text-slate-500 mt-3">
                                    Points are calculated per leg (two-legged ties count as two matches). 
                                    Nation rankings are the sum of all their clubs' points over the last 4 years.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold">{seasons.length}</div>
                            <div className="text-sm text-slate-500">Seasons</div>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold">{matches.length}</div>
                            <div className="text-sm text-slate-500">Matches</div>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold">{calculatedData?.years?.length || 0}</div>
                            <div className="text-sm text-slate-500">Years Used</div>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold">{calculatedData?.nationCoefficients?.length || 0}</div>
                            <div className="text-sm text-slate-500">Nations Ranked</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mb-8">
                    <Button onClick={handleCalculate} className="bg-emerald-600 hover:bg-emerald-700">
                        <RefreshCw className="w-4 h-4 mr-2" /> Calculate Coefficients
                    </Button>
                    {calculatedData && (
                        <AdminOnly>
                            <Button 
                                onClick={handleSave} 
                                disabled={saving || saved}
                                variant={saved ? "outline" : "default"}
                                className={saved ? "border-green-500 text-green-600" : ""}
                            >
                                {saving ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                                ) : saved ? (
                                    <><Check className="w-4 h-4 mr-2" /> Saved!</>
                                ) : (
                                    'Save to Database'
                                )}
                            </Button>
                        </AdminOnly>
                    )}
                </div>

                {/* Results */}
                {calculatedData && (
                    <Tabs defaultValue="nations" className="space-y-6">
                        <TabsList>
                            <TabsTrigger value="nations">Nation Rankings</TabsTrigger>
                            <TabsTrigger value="clubs">Club Rankings</TabsTrigger>
                        </TabsList>

                        <TabsContent value="nations">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* VCC Nations */}
                                <Card className="border-0 shadow-lg overflow-hidden">
                                    <CardHeader className="bg-gradient-to-r from-amber-600 to-amber-500">
                                        <CardTitle className="text-white flex items-center gap-2">
                                            <Trophy className="w-5 h-5" /> VCC Country Rankings
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-12">#</TableHead>
                                                    <TableHead>Nation</TableHead>
                                                    <TableHead className="text-right">Total</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {vccNations.map(nation => (
                                                    <TableRow key={nation.nation_name}>
                                                        <TableCell className="font-bold">{nation.rank}</TableCell>
                                                        <TableCell className="font-medium">{nation.nation_name}</TableCell>
                                                        <TableCell className="text-right font-bold">{nation.total_points.toFixed(3)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>

                                {/* CCC Nations */}
                                <Card className="border-0 shadow-lg overflow-hidden">
                                    <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-500">
                                        <CardTitle className="text-white flex items-center gap-2">
                                            <Shield className="w-5 h-5" /> CCC Country Rankings
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-12">#</TableHead>
                                                    <TableHead>Nation</TableHead>
                                                    <TableHead className="text-right">Total</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {cccNations.map(nation => (
                                                    <TableRow key={nation.nation_name}>
                                                        <TableCell className="font-bold">{nation.rank}</TableCell>
                                                        <TableCell className="font-medium">{nation.nation_name}</TableCell>
                                                        <TableCell className="text-right font-bold">{nation.total_points.toFixed(3)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>

                        <TabsContent value="clubs">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* VCC Clubs */}
                                <Card className="border-0 shadow-lg overflow-hidden">
                                    <CardHeader className="bg-gradient-to-r from-amber-600 to-amber-500">
                                        <CardTitle className="text-white flex items-center gap-2">
                                            <Trophy className="w-5 h-5" /> VCC Club Rankings
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0 max-h-[500px] overflow-y-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-12">#</TableHead>
                                                    <TableHead>Club</TableHead>
                                                    <TableHead>Nation</TableHead>
                                                    <TableHead className="text-right">Total</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {vccClubs.map(club => (
                                                    <TableRow key={`${club.club_name}-${club.nation_name}`}>
                                                        <TableCell className="font-bold">{club.rank}</TableCell>
                                                        <TableCell className="font-medium">{club.club_name}</TableCell>
                                                        <TableCell className="text-slate-500 text-sm">{club.nation_name}</TableCell>
                                                        <TableCell className="text-right font-bold">{club.total_points.toFixed(3)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>

                                {/* CCC Clubs */}
                                <Card className="border-0 shadow-lg overflow-hidden">
                                    <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-500">
                                        <CardTitle className="text-white flex items-center gap-2">
                                            <Shield className="w-5 h-5" /> CCC Club Rankings
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0 max-h-[500px] overflow-y-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-12">#</TableHead>
                                                    <TableHead>Club</TableHead>
                                                    <TableHead>Nation</TableHead>
                                                    <TableHead className="text-right">Total</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {cccClubs.map(club => (
                                                    <TableRow key={`${club.club_name}-${club.nation_name}`}>
                                                        <TableCell className="font-bold">{club.rank}</TableCell>
                                                        <TableCell className="font-medium">{club.club_name}</TableCell>
                                                        <TableCell className="text-slate-500 text-sm">{club.nation_name}</TableCell>
                                                        <TableCell className="text-right font-bold">{club.total_points.toFixed(3)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>
                    </Tabs>
                )}

                {!calculatedData && (
                    <Card className="border-dashed border-2 border-slate-300">
                        <CardContent className="flex flex-col items-center justify-center py-16">
                            <RefreshCw className="w-16 h-16 text-slate-300 mb-4" />
                            <h3 className="text-xl font-semibold text-slate-700 mb-2">Ready to Calculate</h3>
                            <p className="text-slate-500 mb-6">Click the button above to calculate coefficients from continental match data</p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}