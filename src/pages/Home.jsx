import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Globe, Trophy, Shield, ChevronRight, Plus, MapPin, Star } from 'lucide-react';
import AdminOnly from '@/components/common/AdminOnly';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
    const { data: nations = [], isLoading: nationsLoading } = useQuery({
        queryKey: ['nations'],
        queryFn: () => base44.entities.Nation.list(),
    });

    const { data: coefficients = [] } = useQuery({
        queryKey: ['coefficients'],
        queryFn: () => base44.entities.CountryCoefficient.list(),
    });

    const sortedNations = [...nations].sort((a, b) => {
        const coeffA = coefficients.find(c => c.nation_id === a.id);
        const coeffB = coefficients.find(c => c.nation_id === b.id);
        if (coeffA && coeffB) return (coeffA.rank || 999) - (coeffB.rank || 999);
        if (coeffA) return -1;
        if (coeffB) return 1;
        return a.name.localeCompare(b.name);
    });

    const { data: leagues = [] } = useQuery({
        queryKey: ['leagues'],
        queryFn: () => base44.entities.League.list(),
    });

    const { data: clubs = [] } = useQuery({
        queryKey: ['clubs'],
        queryFn: () => base44.entities.Club.list(),
    });

    const stats = [
        { icon: Globe, label: 'Nations', value: nations.length, color: 'from-emerald-500 to-teal-600' },
        { icon: Trophy, label: 'Leagues', value: leagues.length, color: 'from-amber-500 to-orange-600' },
        { icon: Shield, label: 'Clubs', value: clubs.length, color: 'from-blue-500 to-indigo-600' },
    ];

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Hero Section */}
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1920')] opacity-20 bg-cover bg-center" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent" />
                
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-40">
                    <div className="text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm font-medium mb-8">
                            <Globe className="w-4 h-4" />
                            18+ Years of Fictional Football
                        </div>
                        <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight mb-6">
                            Volaria
                        </h1>
                        <p className="text-xl md:text-2xl text-slate-300 max-w-3xl mx-auto mb-12">
                            Welcome to my fictional football world, home to the fictional continent of Volaria, 100+ seasons of history, and 1000s of clubs with their own stories, a fictional football passion project.
                        </p>
                        
                        <div className="flex flex-wrap justify-center gap-4">
                            <Link to={createPageUrl('Nations')}>
                                <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-lg px-8">
                                    Explore Nations
                                    <ChevronRight className="w-5 h-5 ml-2" />
                                </Button>
                            </Link>
                            <AdminOnly>
                                <Link to={createPageUrl('AddNation')}>
                                    <Button size="lg" variant="outline" className="text-lg px-8 border-white/30 text-white hover:bg-white/10">
                                        <Plus className="w-5 h-5 mr-2" />
                                        Add Nation
                                    </Button>
                                </Link>
                            </AdminOnly>
                        </div>
                    </div>
                </div>

                {/* Stats Bar */}
                <div className="relative bg-slate-900/80 backdrop-blur-sm border-t border-white/10">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                        <div className="grid grid-cols-3 gap-8">
                            {stats.map((stat) => (
                                <div key={stat.label} className="text-center">
                                    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} mb-3`}>
                                        <stat.icon className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="text-3xl md:text-4xl font-bold text-white">{stat.value}</div>
                                    <div className="text-slate-400">{stat.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Nations Grid */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="flex items-center justify-between mb-10">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-900">Nations of Volaria</h2>
                        <p className="text-slate-600 mt-2">Select a nation to explore its football structure</p>
                    </div>
                    <AdminOnly>
                        <Link to={createPageUrl('AddNation')}>
                            <Button className="bg-slate-900 hover:bg-slate-800">
                                <Plus className="w-4 h-4 mr-2" />
                                Add Nation
                            </Button>
                        </Link>
                    </AdminOnly>
                </div>

                {nationsLoading ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {[...Array(10)].map((_, i) => (
                            <Skeleton key={i} className="h-40 rounded-2xl" />
                        ))}
                    </div>
                ) : nations.length === 0 ? (
                    <Card className="border-dashed border-2 border-slate-300">
                        <CardContent className="flex flex-col items-center justify-center py-16">
                            <Globe className="w-16 h-16 text-slate-300 mb-4" />
                            <h3 className="text-xl font-semibold text-slate-700 mb-2">No Nations Yet</h3>
                            <p className="text-slate-500 mb-6">Start building your football universe</p>
                            <AdminOnly>
                                <Link to={createPageUrl('AddNation')}>
                                    <Button>
                                        <Plus className="w-4 h-4 mr-2" />
                                        Add Your First Nation
                                    </Button>
                                </Link>
                            </AdminOnly>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {sortedNations.map((nation) => {
                            const nationLeagues = leagues.filter(l => l.nation_id === nation.id);
                            const nationClubs = clubs.filter(c => c.nation_id === nation.id);
                            
                            return (
                                <Link 
                                    key={nation.id} 
                                    to={createPageUrl(`NationDetail?id=${nation.id}`)}
                                    className="group"
                                >
                                    <Card className="overflow-hidden border-0 shadow-sm hover:shadow-xl transition-all duration-300 bg-white group-hover:-translate-y-1">
                                        <div className="aspect-[4/3] bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center p-6 relative overflow-hidden">
                                            {nation.flag_url ? (
                                                <img 
                                                    src={nation.flag_url} 
                                                    alt={nation.name}
                                                    className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500"
                                                />
                                            ) : (
                                                <div className="w-20 h-14 bg-gradient-to-br from-slate-200 to-slate-300 rounded-lg flex items-center justify-center">
                                                    <MapPin className="w-8 h-8 text-slate-400" />
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                        <CardContent className="p-4">
                                            <h3 className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors truncate">
                                                {nation.name}
                                            </h3>
                                            <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                                                <span className="flex items-center gap-1">
                                                    <Trophy className="w-3 h-3" />
                                                    {nationLeagues.length} leagues
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Shield className="w-3 h-3" />
                                                    {nationClubs.length} clubs
                                                </span>
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