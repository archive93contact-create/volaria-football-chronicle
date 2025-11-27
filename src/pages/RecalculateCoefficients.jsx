import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { RefreshCw, Check, AlertCircle, Trophy, Shield, ChevronRight, Loader2, TrendingUp, TrendingDown, Minus, Star } from 'lucide-react';
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
        const result = calculateCoefficients(seasons, matches, competitions, nations, clubs, existingCountryCoeffs);
        setCalculatedData(result);
        setSaved(false);
    };

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
                            <div className="space-y-6">
                                {/* VCC Nations */}
                                <Card className="border-0 shadow-lg overflow-hidden">
                                    <CardHeader className="bg-gradient-to-r from-amber-600 to-amber-500">
                                        <CardTitle className="text-white flex items-center gap-2">
                                            <Trophy className="w-5 h-5" /> VCC Country Rankings
                                            {calculatedData?.previousVccChampionNation && (
                                                <span className="text-sm font-normal ml-2">
                                                    (Holder: {calculatedData.previousVccChampionNation})
                                                </span>
                                            )}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <div className="overflow-x-auto">
                                            <Table>
                                                <TableHeader className="bg-slate-100">
                                                    <TableRow>
                                                        <TableHead className="w-16">Rank</TableHead>
                                                        <TableHead>Nation</TableHead>
                                                        {calculatedData?.yearsOldestFirst?.map((year, i) => (
                                                            <TableHead key={year} className="text-center">{year}</TableHead>
                                                        ))}
                                                        <TableHead className="text-center font-bold">Total</TableHead>
                                                        <TableHead className="text-center">Spots</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {vccNations.map((nation, idx) => {
                                                        const rankChange = getRankChange(nation.rank, nation.previous_rank);
                                                        return (
                                                            <TableRow key={nation.nation_name} className={idx < 5 ? 'bg-amber-50/50' : ''}>
                                                                <TableCell>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className={`font-bold text-lg ${idx < 5 ? 'text-amber-600' : ''}`}>{nation.rank}</span>
                                                                        {rankChange && <rankChange.icon className={`w-4 h-4 ${rankChange.color}`} />}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div className="flex items-center gap-2">
                                                                        {getNationFlag(nation.nation_name) && (
                                                                            <img src={getNationFlag(nation.nation_name)} alt="" className="w-6 h-4 object-cover rounded" />
                                                                        )}
                                                                        <span className="font-semibold">{nation.nation_name}</span>
                                                                        {nation.champion_qualifier && (
                                                                            <Star className="w-4 h-4 text-amber-500" title="Title Holder" />
                                                                        )}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="text-center text-slate-600">{nation.year_4_points?.toFixed(3) || '-'}</TableCell>
                                                                <TableCell className="text-center text-slate-600">{nation.year_3_points?.toFixed(3) || '-'}</TableCell>
                                                                <TableCell className="text-center text-slate-600">{nation.year_2_points?.toFixed(3) || '-'}</TableCell>
                                                                <TableCell className="text-center text-slate-600">{nation.year_1_points?.toFixed(3) || '-'}</TableCell>
                                                                <TableCell className="text-center font-bold text-lg">{nation.total_points.toFixed(3)}</TableCell>
                                                                <TableCell className="text-center">
                                                                    <div className="flex items-center justify-center gap-1">
                                                                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-700 font-bold text-sm">
                                                                            {nation.vcc_spots}
                                                                        </span>
                                                                        {nation.champion_qualifier && (
                                                                            <span className="text-xs text-amber-600">+TH</span>
                                                                        )}
                                                                    </div>
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* CCC Nations */}
                                <Card className="border-0 shadow-lg overflow-hidden">
                                    <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-500">
                                        <CardTitle className="text-white flex items-center gap-2">
                                            <Shield className="w-5 h-5" /> CCC Country Rankings
                                            {calculatedData?.previousCccChampionNation && (
                                                <span className="text-sm font-normal ml-2">
                                                    (Holder: {calculatedData.previousCccChampionNation})
                                                </span>
                                            )}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <div className="overflow-x-auto">
                                            <Table>
                                                <TableHeader className="bg-slate-100">
                                                    <TableRow>
                                                        <TableHead className="w-16">Rank</TableHead>
                                                        <TableHead>Nation</TableHead>
                                                        {calculatedData?.yearsOldestFirst?.map((year, i) => (
                                                            <TableHead key={year} className="text-center">{year}</TableHead>
                                                        ))}
                                                        <TableHead className="text-center font-bold">Total</TableHead>
                                                        <TableHead className="text-center">Spots</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {cccNations.map((nation, idx) => {
                                                        const rankChange = getRankChange(nation.rank, nation.previous_rank);
                                                        return (
                                                            <TableRow key={nation.nation_name} className={idx < 9 ? 'bg-blue-50/50' : ''}>
                                                                <TableCell>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className={`font-bold text-lg ${idx < 9 ? 'text-blue-600' : ''}`}>{nation.rank}</span>
                                                                        {rankChange && <rankChange.icon className={`w-4 h-4 ${rankChange.color}`} />}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div className="flex items-center gap-2">
                                                                        {getNationFlag(nation.nation_name) && (
                                                                            <img src={getNationFlag(nation.nation_name)} alt="" className="w-6 h-4 object-cover rounded" />
                                                                        )}
                                                                        <span className="font-semibold">{nation.nation_name}</span>
                                                                        {nation.champion_qualifier && (
                                                                            <Star className="w-4 h-4 text-blue-500" title="Title Holder" />
                                                                        )}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="text-center text-slate-600">{nation.year_4_points?.toFixed(3) || '-'}</TableCell>
                                                                <TableCell className="text-center text-slate-600">{nation.year_3_points?.toFixed(3) || '-'}</TableCell>
                                                                <TableCell className="text-center text-slate-600">{nation.year_2_points?.toFixed(3) || '-'}</TableCell>
                                                                <TableCell className="text-center text-slate-600">{nation.year_1_points?.toFixed(3) || '-'}</TableCell>
                                                                <TableCell className="text-center font-bold text-lg">{nation.total_points.toFixed(3)}</TableCell>
                                                                <TableCell className="text-center">
                                                                    <div className="flex items-center justify-center gap-1">
                                                                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
                                                                            {nation.ccc_spots}
                                                                        </span>
                                                                        {nation.champion_qualifier && (
                                                                            <span className="text-xs text-blue-600">+TH</span>
                                                                        )}
                                                                    </div>
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Legend */}
                            <div className="mt-6 flex flex-wrap gap-6 text-sm text-slate-600">
                                <div className="flex items-center gap-2">
                                    <Star className="w-4 h-4 text-amber-500" />
                                    <span>Title Holder (auto-qualifies)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium">+TH</span>
                                    <span>Extra spot for title holder nation</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-green-500" />
                                    <span>Rank Improved</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <TrendingDown className="w-4 h-4 text-red-500" />
                                    <span>Rank Dropped</span>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="clubs">
                            <div className="space-y-6">
                                {/* VCC Clubs */}
                                <Card className="border-0 shadow-lg overflow-hidden">
                                    <CardHeader className="bg-gradient-to-r from-amber-600 to-amber-500">
                                        <CardTitle className="text-white flex items-center gap-2">
                                            <Trophy className="w-5 h-5" /> VCC Club Rankings
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0 max-h-[600px] overflow-y-auto">
                                        <Table>
                                            <TableHeader className="bg-slate-100 sticky top-0">
                                                <TableRow>
                                                    <TableHead className="w-12">#</TableHead>
                                                    <TableHead>Club</TableHead>
                                                    <TableHead>Nation</TableHead>
                                                    {calculatedData?.yearsOldestFirst?.map((year) => (
                                                        <TableHead key={year} className="text-center">{year}</TableHead>
                                                    ))}
                                                    <TableHead className="text-center font-bold">Total</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {vccClubs.map((club, idx) => (
                                                    <TableRow key={`${club.club_name}-${club.nation_name}`} className={idx < 10 ? 'bg-amber-50/50' : ''}>
                                                        <TableCell className={`font-bold ${idx < 10 ? 'text-amber-600' : ''}`}>{club.rank}</TableCell>
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
                                                        <TableCell className="text-center text-slate-600">{club.year_4_points?.toFixed(3) || '-'}</TableCell>
                                                        <TableCell className="text-center text-slate-600">{club.year_3_points?.toFixed(3) || '-'}</TableCell>
                                                        <TableCell className="text-center text-slate-600">{club.year_2_points?.toFixed(3) || '-'}</TableCell>
                                                        <TableCell className="text-center text-slate-600">{club.year_1_points?.toFixed(3) || '-'}</TableCell>
                                                        <TableCell className="text-center font-bold text-lg">{club.total_points.toFixed(3)}</TableCell>
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
                                    <CardContent className="p-0 max-h-[600px] overflow-y-auto">
                                        <Table>
                                            <TableHeader className="bg-slate-100 sticky top-0">
                                                <TableRow>
                                                    <TableHead className="w-12">#</TableHead>
                                                    <TableHead>Club</TableHead>
                                                    <TableHead>Nation</TableHead>
                                                    {calculatedData?.yearsOldestFirst?.map((year) => (
                                                        <TableHead key={year} className="text-center">{year}</TableHead>
                                                    ))}
                                                    <TableHead className="text-center font-bold">Total</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {cccClubs.map((club, idx) => (
                                                    <TableRow key={`${club.club_name}-${club.nation_name}`} className={idx < 10 ? 'bg-blue-50/50' : ''}>
                                                        <TableCell className={`font-bold ${idx < 10 ? 'text-blue-600' : ''}`}>{club.rank}</TableCell>
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
                                                        <TableCell className="text-center text-slate-600">{club.year_4_points?.toFixed(3) || '-'}</TableCell>
                                                        <TableCell className="text-center text-slate-600">{club.year_3_points?.toFixed(3) || '-'}</TableCell>
                                                        <TableCell className="text-center text-slate-600">{club.year_2_points?.toFixed(3) || '-'}</TableCell>
                                                        <TableCell className="text-center text-slate-600">{club.year_1_points?.toFixed(3) || '-'}</TableCell>
                                                        <TableCell className="text-center font-bold text-lg">{club.total_points.toFixed(3)}</TableCell>
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