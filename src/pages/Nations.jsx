import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Search, Plus, Trophy, Shield, MapPin, Filter } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from '@/components/common/PageHeader';

export default function Nations() {
    const [search, setSearch] = useState('');
    const [regionFilter, setRegionFilter] = useState('all');

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

    const regions = [...new Set(nations.filter(n => n.region).map(n => n.region))];

    const filteredNations = nations
        .filter(nation => {
            const matchesSearch = nation.name.toLowerCase().includes(search.toLowerCase());
            const matchesRegion = regionFilter === 'all' || nation.region === regionFilter;
            return matchesSearch && matchesRegion;
        })
        .sort((a, b) => {
            const coeffA = coefficients.find(c => c.nation_id === a.id);
            const coeffB = coefficients.find(c => c.nation_id === b.id);
            
            // Both have rankings - sort by rank
            if (coeffA && coeffB) {
                return (coeffA.rank || 999) - (coeffB.rank || 999);
            }
            // Only A has ranking - A comes first
            if (coeffA) return -1;
            // Only B has ranking - B comes first
            if (coeffB) return 1;
            // Neither has ranking - sort alphabetically
            return a.name.localeCompare(b.name);
        });

    return (
        <div className="min-h-screen bg-slate-50">
            <PageHeader 
                title="Nations of Volaria"
                subtitle="Explore all 37 nations and their complete football structures"
                breadcrumbs={[{ label: 'Nations' }]}
            >
                <Link to={createPageUrl('AddNation')}>
                    <Button className="bg-emerald-600 hover:bg-emerald-700">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Nation
                    </Button>
                </Link>
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
                    {regions.length > 0 && (
                        <Select value={regionFilter} onValueChange={setRegionFilter}>
                            <SelectTrigger className="w-full sm:w-48 h-12 bg-white">
                                <Filter className="w-4 h-4 mr-2 text-slate-400" />
                                <SelectValue placeholder="All Regions" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Regions</SelectItem>
                                {regions.map(region => (
                                    <SelectItem key={region} value={region}>{region}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>

                {/* Grid */}
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
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredNations.map((nation) => {
                            const nationLeagues = leagues.filter(l => l.nation_id === nation.id);
                            const nationClubs = clubs.filter(c => c.nation_id === nation.id);
                            
                            return (
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
                                        </div>
                                        <CardContent className="p-5">
                                            <h3 className="text-xl font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                                                {nation.name}
                                            </h3>
                                            {nation.region && (
                                                <p className="text-sm text-slate-500 mt-1">{nation.region}</p>
                                            )}
                                            <div className="flex items-center gap-6 mt-4 pt-4 border-t border-slate-100">
                                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                                    <Trophy className="w-4 h-4 text-amber-500" />
                                                    <span className="font-medium">{nationLeagues.length}</span>
                                                    <span className="text-slate-400">leagues</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                                    <Shield className="w-4 h-4 text-blue-500" />
                                                    <span className="font-medium">{nationClubs.length}</span>
                                                    <span className="text-slate-400">clubs</span>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}