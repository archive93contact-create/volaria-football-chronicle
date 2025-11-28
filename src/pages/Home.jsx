import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Globe, Trophy, Shield, ChevronRight, Plus, MapPin, Star, Sparkles, Calendar, Heart, Users, BookOpen, ArrowRight, Flame } from 'lucide-react';
import AdminOnly from '@/components/common/AdminOnly';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function Home() {
    const { data: nations = [], isLoading: nationsLoading } = useQuery({
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

    const { data: seasons = [] } = useQuery({
        queryKey: ['allSeasons'],
        queryFn: () => base44.entities.Season.list(),
    });

    // Featured nations (top ranked with content)
    const featuredNations = nations
        .filter(n => {
            const nationLeagues = leagues.filter(l => l.nation_id === n.id);
            return nationLeagues.length > 0;
        })
        .sort((a, b) => {
            const coeffA = coefficients.find(c => c.nation_id === a.id);
            const coeffB = coefficients.find(c => c.nation_id === b.id);
            return (coeffA?.rank || 999) - (coeffB?.rank || 999);
        })
        .slice(0, 5);

    // Iconic clubs (most titles or continental success)
    const iconicClubs = clubs
        .filter(c => (c.league_titles > 0 || c.vcc_titles > 0 || c.ccc_titles > 0) && !c.is_defunct && !c.is_former_name)
        .sort((a, b) => {
            const scoreA = (a.league_titles || 0) * 2 + (a.vcc_titles || 0) * 5 + (a.ccc_titles || 0) * 3;
            const scoreB = (b.league_titles || 0) * 2 + (b.vcc_titles || 0) * 5 + (b.ccc_titles || 0) * 3;
            return scoreB - scoreA;
        })
        .slice(0, 6);

    // Nations grouped by development status
    const nationsWithData = nations.map(n => ({
        ...n,
        leagueCount: leagues.filter(l => l.nation_id === n.id).length,
        clubCount: clubs.filter(c => c.nation_id === n.id).length,
        coefficient: coefficients.find(c => c.nation_id === n.id),
    }));

    const fullyDeveloped = nationsWithData.filter(n => n.leagueCount >= 3);
    const inProgress = nationsWithData.filter(n => n.leagueCount > 0 && n.leagueCount < 3);
    const planned = nationsWithData.filter(n => n.leagueCount === 0);

    const stats = [
        { icon: Globe, label: 'Nations', value: nations.length, color: 'from-emerald-500 to-teal-600' },
        { icon: Trophy, label: 'Leagues', value: leagues.length, color: 'from-amber-500 to-orange-600' },
        { icon: Shield, label: 'Clubs', value: clubs.length, color: 'from-blue-500 to-indigo-600' },
        { icon: Calendar, label: 'Seasons', value: seasons.length, color: 'from-purple-500 to-pink-600' },
    ];

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Hero Section */}
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1920')] opacity-20 bg-cover bg-center" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent" />
                
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
                    <div className="text-center max-w-4xl mx-auto">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm font-medium mb-6">
                            <Sparkles className="w-4 h-4" />
                            A Fictional Football Universe Since 2007
                        </div>
                        <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight mb-6">
                            Welcome to Volaria
                        </h1>
                        <p className="text-xl md:text-2xl text-slate-300 max-w-3xl mx-auto mb-4">
                            Discover a meticulously crafted fictional continent where every nation has its own football story, 
                            every club has its own legacy, and 18+ years of imagined history awaits exploration.
                        </p>
                        <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10">
                            From legendary dynasties to underdog triumphs, from heated derbies to continental glory — 
                            this is football as it might have been, in a world that never was.
                        </p>
                        
                        <div className="flex flex-wrap justify-center gap-4">
                            <Link to={createPageUrl('Nations')}>
                                <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-lg px-8">
                                    Explore All Nations
                                    <ChevronRight className="w-5 h-5 ml-2" />
                                </Button>
                            </Link>
                            <Link to={createPageUrl('About')}>
                                <Button size="lg" variant="outline" className="text-lg px-8 border-white/30 text-white hover:bg-white/10">
                                    <BookOpen className="w-5 h-5 mr-2" />
                                    The Story Behind Volaria
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Stats Bar */}
                <div className="relative bg-slate-900/80 backdrop-blur-sm border-t border-white/10">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
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

            {/* Quick Start Section */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold text-slate-900 mb-3">New Here? Start Exploring</h2>
                    <p className="text-slate-600 max-w-2xl mx-auto">
                        Volaria can feel vast — here are some great starting points to discover the world
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
                    {/* Featured Nations */}
                    <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-teal-50 overflow-hidden">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center">
                                    <Globe className="w-5 h-5 text-white" />
                                </div>
                                <h3 className="font-bold text-lg text-slate-900">Start With These Nations</h3>
                            </div>
                            <p className="text-slate-600 text-sm mb-4">
                                The most developed football nations with complete league pyramids and rich history
                            </p>
                            <div className="space-y-2">
                                {featuredNations.slice(0, 4).map(nation => (
                                    <Link 
                                        key={nation.id} 
                                        to={createPageUrl(`NationDetail?id=${nation.id}`)}
                                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/50 transition-colors"
                                    >
                                        {nation.flag_url ? (
                                            <img src={nation.flag_url} alt="" className="w-8 h-5 object-cover rounded" />
                                        ) : (
                                            <div className="w-8 h-5 bg-slate-200 rounded" />
                                        )}
                                        <span className="font-medium text-slate-800">{nation.name}</span>
                                        <ChevronRight className="w-4 h-4 text-slate-400 ml-auto" />
                                    </Link>
                                ))}
                            </div>
                            <Link to={createPageUrl('Nations')} className="inline-flex items-center gap-1 text-emerald-600 font-medium text-sm mt-4 hover:underline">
                                View all nations <ArrowRight className="w-4 h-4" />
                            </Link>
                        </CardContent>
                    </Card>

                    {/* Iconic Clubs */}
                    <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50 to-orange-50 overflow-hidden">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center">
                                    <Trophy className="w-5 h-5 text-white" />
                                </div>
                                <h3 className="font-bold text-lg text-slate-900">Iconic Clubs</h3>
                            </div>
                            <p className="text-slate-600 text-sm mb-4">
                                Legendary clubs with storied histories, continental glory, and passionate fanbases
                            </p>
                            <div className="space-y-2">
                                {iconicClubs.slice(0, 4).map(club => {
                                    const nation = nations.find(n => n.id === club.nation_id);
                                    return (
                                        <Link 
                                            key={club.id} 
                                            to={createPageUrl(`ClubDetail?id=${club.id}`)}
                                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/50 transition-colors"
                                        >
                                            {club.logo_url ? (
                                                <img src={club.logo_url} alt="" className="w-6 h-6 object-contain" />
                                            ) : (
                                                <Shield className="w-6 h-6 text-slate-400" />
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-slate-800 truncate">{club.name}</div>
                                                <div className="text-xs text-slate-500">{nation?.name}</div>
                                            </div>
                                            {(club.vcc_titles > 0 || club.ccc_titles > 0) && (
                                                <Star className="w-4 h-4 text-amber-500" />
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                            <Link to={createPageUrl('AllClubs')} className="inline-flex items-center gap-1 text-amber-600 font-medium text-sm mt-4 hover:underline">
                                Browse all clubs <ArrowRight className="w-4 h-4" />
                            </Link>
                        </CardContent>
                    </Card>

                    {/* Continental Competitions */}
                    <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-indigo-50 overflow-hidden">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center">
                                    <Star className="w-5 h-5 text-white" />
                                </div>
                                <h3 className="font-bold text-lg text-slate-900">Continental Glory</h3>
                            </div>
                            <p className="text-slate-600 text-sm mb-4">
                                The biggest prizes in Volarian football — where legends are made
                            </p>
                            <div className="space-y-3">
                                <Link 
                                    to={createPageUrl('ContinentalCompetitions')}
                                    className="block p-3 rounded-lg bg-white/50 hover:bg-white transition-colors"
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <Badge className="bg-amber-500 text-white">VCC</Badge>
                                        <span className="font-medium text-slate-800">Volarian Champions Cup</span>
                                    </div>
                                    <p className="text-xs text-slate-500">The pinnacle of continental club football</p>
                                </Link>
                                <Link 
                                    to={createPageUrl('ContinentalCompetitions')}
                                    className="block p-3 rounded-lg bg-white/50 hover:bg-white transition-colors"
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <Badge className="bg-blue-500 text-white">CCC</Badge>
                                        <span className="font-medium text-slate-800">Continental Challenge Cup</span>
                                    </div>
                                    <p className="text-xs text-slate-500">For associates and second-tier qualifiers</p>
                                </Link>
                            </div>
                            <Link to={createPageUrl('Coefficients')} className="inline-flex items-center gap-1 text-purple-600 font-medium text-sm mt-4 hover:underline">
                                View rankings <ArrowRight className="w-4 h-4" />
                            </Link>
                        </CardContent>
                    </Card>
                </div>

                {/* Nations by Status */}
                <div className="mb-16">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900">Nations of Volaria</h2>
                            <p className="text-slate-600 mt-1">Explore by development status</p>
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
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {[...Array(12)].map((_, i) => (
                                <Skeleton key={i} className="h-32 rounded-xl" />
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-10">
                            {/* Fully Developed */}
                            {fullyDeveloped.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                        <h3 className="font-semibold text-slate-700">Complete Football Systems</h3>
                                        <span className="text-sm text-slate-500">({fullyDeveloped.length})</span>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                        {fullyDeveloped.sort((a, b) => (a.coefficient?.rank || 999) - (b.coefficient?.rank || 999)).map(nation => (
                                            <NationCard key={nation.id} nation={nation} />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* In Progress */}
                            {inProgress.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-3 h-3 rounded-full bg-amber-500" />
                                        <h3 className="font-semibold text-slate-700">In Development</h3>
                                        <span className="text-sm text-slate-500">({inProgress.length})</span>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                        {inProgress.sort((a, b) => a.name.localeCompare(b.name)).map(nation => (
                                            <NationCard key={nation.id} nation={nation} status="progress" />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Planned */}
                            {planned.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-3 h-3 rounded-full bg-slate-300" />
                                        <h3 className="font-semibold text-slate-700">Coming Soon</h3>
                                        <span className="text-sm text-slate-500">({planned.length})</span>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                        {planned.sort((a, b) => a.name.localeCompare(b.name)).map(nation => (
                                            <NationCard key={nation.id} nation={nation} status="planned" />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Support Section */}
                <Card className="border-0 shadow-lg bg-gradient-to-r from-slate-900 to-slate-800 text-white overflow-hidden">
                    <CardContent className="p-8 md:p-12">
                        <div className="flex flex-col md:flex-row items-center gap-8">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-3">
                                    <Heart className="w-5 h-5 text-red-400" />
                                    <span className="text-emerald-400 font-medium">Support Volaria</span>
                                </div>
                                <h3 className="text-2xl md:text-3xl font-bold mb-4">
                                    A Passion Project 18+ Years in the Making
                                </h3>
                                <p className="text-slate-300 mb-6">
                                    Volaria is a labour of love — created, maintained, and expanded as a creative hobby. 
                                    If you enjoy exploring this world, consider supporting its continued development. 
                                    Every contribution helps keep the dream alive.
                                </p>
                                <div className="flex flex-wrap gap-3">
                                    <Button className="bg-emerald-600 hover:bg-emerald-700">
                                        <Heart className="w-4 h-4 mr-2" />
                                        Buy Me a Coffee
                                    </Button>
                                    <Link to={createPageUrl('About')}>
                                        <Button variant="outline" className="border-white/30 text-white hover:bg-white/10">
                                            Learn More
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                            <div className="hidden md:block">
                                <div className="w-48 h-48 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
                                    <Globe className="w-24 h-24 text-emerald-400/50" />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function NationCard({ nation, status }) {
    const opacity = status === 'planned' ? 'opacity-60' : '';
    
    return (
        <Link 
            to={createPageUrl(`NationDetail?id=${nation.id}`)}
            className="group"
        >
            <Card className={`overflow-hidden border-0 shadow-sm hover:shadow-xl transition-all duration-300 bg-white group-hover:-translate-y-1 h-full ${opacity}`}>
                <div className="aspect-[4/3] bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
                    {nation.flag_url ? (
                        <img 
                            src={nation.flag_url} 
                            alt={nation.name}
                            className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500"
                        />
                    ) : (
                        <div className="w-16 h-10 bg-gradient-to-br from-slate-200 to-slate-300 rounded flex items-center justify-center">
                            <MapPin className="w-6 h-6 text-slate-400" />
                        </div>
                    )}
                    {nation.coefficient?.rank && nation.coefficient.rank < 999 && (
                        <div className="absolute top-1 right-1 bg-white/90 px-1.5 py-0.5 rounded text-xs font-bold text-slate-700">
                            #{nation.coefficient.rank}
                        </div>
                    )}
                    {status === 'progress' && (
                        <div className="absolute top-1 left-1">
                            <Badge className="bg-amber-500 text-white text-xs">WIP</Badge>
                        </div>
                    )}
                    {status === 'planned' && (
                        <div className="absolute top-1 left-1">
                            <Badge variant="outline" className="bg-white/80 text-xs">Soon</Badge>
                        </div>
                    )}
                </div>
                <CardContent className="p-3">
                    <h3 className="font-bold text-sm text-slate-900 group-hover:text-emerald-600 transition-colors truncate">
                        {nation.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                        <span>{nation.leagueCount} league{nation.leagueCount !== 1 ? 's' : ''}</span>
                        <span>•</span>
                        <span>{nation.clubCount} club{nation.clubCount !== 1 ? 's' : ''}</span>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}