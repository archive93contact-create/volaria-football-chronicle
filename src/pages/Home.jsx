import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Globe, Trophy, Shield, ChevronRight, Plus, MapPin, Star, Sparkles, Crown, Heart, Coffee, BookOpen, ArrowRight, Flame, Award } from 'lucide-react';
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

    // Categorize nations based on whether they have seasons (complete) or not
    const categorizedNations = useMemo(() => {
        const complete = [];
        const inProgress = [];
        const planned = [];

        nations.forEach(nation => {
            const nationLeagues = leagues.filter(l => l.nation_id === nation.id);
            const nationLeagueIds = nationLeagues.map(l => l.id);
            const nationClubs = clubs.filter(c => c.nation_id === nation.id);
            const coeff = coefficients.find(c => c.nation_id === nation.id);
            const hasSeasons = seasons.some(s => nationLeagueIds.includes(s.league_id));
            
            const enrichedNation = {
                ...nation,
                leagueCount: nationLeagues.length,
                clubCount: nationClubs.length,
                coefficient: coeff,
                rank: coeff?.rank || 999,
                hasSeasons
            };

            if (hasSeasons) {
                complete.push(enrichedNation);
            } else if (nationLeagues.length > 0 || nationClubs.length > 0) {
                inProgress.push(enrichedNation);
            } else {
                planned.push(enrichedNation);
            }
        });

        // Sort by coefficient rank for complete, alphabetically for others
        complete.sort((a, b) => a.rank - b.rank);
        inProgress.sort((a, b) => a.name.localeCompare(b.name));
        planned.sort((a, b) => a.name.localeCompare(b.name));

        return { complete, inProgress, planned };
    }, [nations, leagues, clubs, coefficients, seasons]);

    // Featured nations (top ranked with seasons)
    const featuredNations = useMemo(() => {
        return categorizedNations.complete.slice(0, 4);
    }, [categorizedNations]);

    // Iconic clubs (those with VCC/CCC titles)
    const iconicClubs = useMemo(() => {
        return clubs
            .filter(c => (c.vcc_titles > 0 || c.ccc_titles > 0 || c.league_titles >= 5))
            .sort((a, b) => ((b.vcc_titles || 0) * 3 + (b.ccc_titles || 0) * 2 + (b.league_titles || 0)) - 
                           ((a.vcc_titles || 0) * 3 + (a.ccc_titles || 0) * 2 + (a.league_titles || 0)))
            .slice(0, 6);
    }, [clubs]);

    const stats = [
        { icon: Globe, label: 'Nations', value: nations.length, color: 'from-emerald-500 to-teal-600' },
        { icon: Trophy, label: 'Leagues', value: leagues.length, color: 'from-amber-500 to-orange-600' },
        { icon: Shield, label: 'Clubs', value: clubs.length, color: 'from-blue-500 to-indigo-600' },
        { icon: Star, label: 'Seasons', value: seasons.length, color: 'from-purple-500 to-pink-600' },
    ];

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Hero Section */}
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1920')] opacity-20 bg-cover bg-center" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent" />
                
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
                    <div className="text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm font-medium mb-6">
                            <Heart className="w-4 h-4" />
                            18+ Years of Fictional Football
                        </div>
                        <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight mb-6">
                            Volaria
                        </h1>
                        <p className="text-xl md:text-2xl text-slate-300 max-w-3xl mx-auto mb-4">
                            A fictional football universe spanning {nations.length} nations, {clubs.length.toLocaleString()} clubs, and over {seasons.length} seasons of rich history.
                        </p>
                        <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10">
                            Every club has a story. Every season tells a tale. Discover rivalries, dynasties, and the beautiful game reimagined.
                        </p>
                        
                        <div className="flex flex-wrap justify-center gap-4">
                            <Link to={createPageUrl('Nations')}>
                                <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-lg px-8">
                                    Start Exploring
                                    <ChevronRight className="w-5 h-5 ml-2" />
                                </Button>
                            </Link>
                            <Link to={createPageUrl('About')}>
                                <Button size="lg" variant="outline" className="text-lg px-8 border-slate-300 bg-white/10 text-white hover:bg-white/20">
                                    <BookOpen className="w-5 h-5 mr-2" />
                                    The Story
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Stats Bar */}
                <div className="relative bg-slate-900/80 backdrop-blur-sm border-t border-white/10">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            {stats.map((stat) => (
                                <div key={stat.label} className="text-center">
                                    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} mb-3`}>
                                        <stat.icon className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="text-3xl md:text-4xl font-bold text-white">{stat.value.toLocaleString()}</div>
                                    <div className="text-slate-400">{stat.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* New Here Section */}
            <div className="bg-white border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">New Here? Start Exploring</h2>
                        <p className="text-slate-500">Volaria can feel vast — here are some great starting points to discover the world</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Start With These Nations */}
                        <Card className="border-0 shadow-sm bg-emerald-50">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
                                        <Globe className="w-4 h-4 text-white" />
                                    </div>
                                    <h3 className="font-bold text-slate-900">Start With These Nations</h3>
                                </div>
                                <p className="text-sm text-slate-600 mb-4">The most developed football nations with complete league pyramids and rich history</p>
                                <div className="space-y-2">
                                    {featuredNations.map((nation) => (
                                        <Link 
                                            key={nation.id} 
                                            to={createPageUrl(`NationDetail?id=${nation.id}`)}
                                            className="flex items-center justify-between p-2 rounded-lg hover:bg-emerald-100 transition-colors group"
                                        >
                                            <div className="flex items-center gap-2">
                                                {nation.flag_url ? (
                                                    <img src={nation.flag_url} alt="" className="w-5 h-4 object-cover rounded-sm" />
                                                ) : (
                                                    <div className="w-5 h-4 bg-slate-300 rounded-sm" />
                                                )}
                                                <span className="font-medium text-slate-800 group-hover:text-emerald-700">{nation.name}</span>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600" />
                                        </Link>
                                    ))}
                                </div>
                                <Link to={createPageUrl('Nations')} className="inline-flex items-center text-sm text-emerald-600 hover:text-emerald-700 font-medium mt-4">
                                    View all nations <ArrowRight className="w-3 h-3 ml-1" />
                                </Link>
                            </CardContent>
                        </Card>

                        {/* Iconic Clubs */}
                        <Card className="border-0 shadow-sm bg-amber-50">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
                                        <Crown className="w-4 h-4 text-white" />
                                    </div>
                                    <h3 className="font-bold text-slate-900">Iconic Clubs</h3>
                                </div>
                                <p className="text-sm text-slate-600 mb-4">Legendary clubs with storied histories, continental glory, and passionate fanbases</p>
                                <div className="space-y-2">
                                    {iconicClubs.slice(0, 4).map((club) => {
                                        const nation = nations.find(n => n.id === club.nation_id);
                                        return (
                                            <Link 
                                                key={club.id} 
                                                to={createPageUrl(`ClubDetail?id=${club.id}`)}
                                                className="flex items-center justify-between p-2 rounded-lg hover:bg-amber-100 transition-colors group"
                                            >
                                                <div className="flex items-center gap-2">
                                                    {club.logo_url ? (
                                                        <img src={club.logo_url} alt="" className="w-5 h-5 object-contain" />
                                                    ) : (
                                                        <Shield className="w-5 h-5 text-slate-400" />
                                                    )}
                                                    <div>
                                                        <span className="font-medium text-slate-800 group-hover:text-amber-700">{club.name}</span>
                                                        <span className="text-xs text-slate-500 ml-1">{nation?.name}</span>
                                                    </div>
                                                </div>
                                                {club.vcc_titles > 0 && (
                                                    <Star className="w-4 h-4 text-amber-500" />
                                                )}
                                            </Link>
                                        );
                                    })}
                                </div>
                                <Link to={createPageUrl('AllClubs')} className="inline-flex items-center text-sm text-amber-600 hover:text-amber-700 font-medium mt-4">
                                    Browse all clubs <ArrowRight className="w-3 h-3 ml-1" />
                                </Link>
                            </CardContent>
                        </Card>

                        {/* Continental Glory */}
                        <Card className="border-0 shadow-sm bg-purple-50">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-8 h-8 rounded-lg bg-purple-500 flex items-center justify-center">
                                        <Trophy className="w-4 h-4 text-white" />
                                    </div>
                                    <h3 className="font-bold text-slate-900">Continental Glory</h3>
                                </div>
                                <p className="text-sm text-slate-600 mb-4">The biggest prizes in Volarian football — where legends are made</p>
                                <div className="space-y-3">
                                    <Link 
                                        to={createPageUrl('ContinentalCompetitions')}
                                        className="block p-3 rounded-lg bg-white/60 hover:bg-white transition-colors group"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Badge className="bg-amber-500 text-white text-xs">VCC</Badge>
                                            <span className="font-medium text-slate-800 group-hover:text-purple-700">Volarian Champions Cup</span>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1">The pinnacle of continental club football</p>
                                    </Link>
                                    <Link 
                                        to={createPageUrl('ContinentalCompetitions')}
                                        className="block p-3 rounded-lg bg-white/60 hover:bg-white transition-colors group"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Badge className="bg-blue-500 text-white text-xs">CCC</Badge>
                                            <span className="font-medium text-slate-800 group-hover:text-purple-700">Continental Challenge Cup</span>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1">For associates and second-tier qualifiers</p>
                                    </Link>
                                </div>
                                <Link to={createPageUrl('Coefficients')} className="inline-flex items-center text-sm text-purple-600 hover:text-purple-700 font-medium mt-4">
                                    View rankings <ArrowRight className="w-3 h-3 ml-1" />
                                </Link>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Nations Section */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

                {/* All Nations */}
                <div className="mb-16">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
                                <Globe className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900">All Nations</h2>
                                <p className="text-slate-500">{categorizedNations.complete.length} complete, {categorizedNations.inProgress.length + categorizedNations.planned.length} in development</p>
                            </div>
                        </div>
                        <Link to={createPageUrl('Nations')}>
                            <Button variant="outline">
                                View All <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </Link>
                    </div>

                    {nationsLoading ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {[...Array(12)].map((_, i) => (
                                <Skeleton key={i} className="h-40 rounded-2xl" />
                            ))}
                        </div>
                    ) : (
                        <>
                            {/* Nations with Data */}
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
                                {categorizedNations.complete.slice(0, 12).map((nation) => (
                                    <Link 
                                        key={nation.id} 
                                        to={createPageUrl(`NationDetail?id=${nation.id}`)}
                                        className="group"
                                    >
                                        <Card className="overflow-hidden border-0 shadow-sm hover:shadow-lg transition-all duration-300 bg-white group-hover:-translate-y-1">
                                            <div className="aspect-[4/3] bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
                                                {nation.flag_url ? (
                                                    <img 
                                                        src={nation.flag_url} 
                                                        alt={nation.name}
                                                        className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500"
                                                    />
                                                ) : (
                                                    <MapPin className="w-8 h-8 text-slate-400" />
                                                )}
                                                {nation.rank < 999 && (
                                                    <div className="absolute top-1 right-1 bg-white/90 px-1.5 py-0.5 rounded text-xs font-bold text-slate-600">
                                                        #{nation.rank}
                                                    </div>
                                                )}
                                            </div>
                                            <CardContent className="p-3">
                                                <h3 className="font-semibold text-sm text-slate-900 group-hover:text-emerald-600 transition-colors truncate">
                                                    {nation.name}
                                                </h3>
                                                <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                                                    <span>{nation.leagueCount} leagues</span>
                                                    <span>•</span>
                                                    <span>{nation.clubCount} clubs</span>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                ))}
                            </div>

                            {/* In Progress Nations */}
                            {(categorizedNations.inProgress.length > 0 || categorizedNations.planned.length > 0) && (
                                <div>
                                    <p className="text-sm text-slate-500 mb-3 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                                        Coming Soon — Nations in development
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {[...categorizedNations.inProgress, ...categorizedNations.planned].map((nation) => (
                                            <Link 
                                                key={nation.id} 
                                                to={createPageUrl(`NationDetail?id=${nation.id}`)}
                                                className="group"
                                            >
                                                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors">
                                                    {nation.flag_url ? (
                                                        <img src={nation.flag_url} alt="" className="w-5 h-4 object-cover rounded-sm" />
                                                    ) : (
                                                        <div className="w-5 h-4 bg-slate-300 rounded-sm" />
                                                    )}
                                                    <span className="text-sm text-slate-600 group-hover:text-slate-900">{nation.name}</span>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Support Section */}
                <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-900 to-slate-800 text-white overflow-hidden">
                    <CardContent className="p-8 md:p-12">
                        <div className="flex flex-col md:flex-row items-center gap-8">
                            <div className="flex-1">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-medium mb-4">
                                    <Heart className="w-4 h-4" /> Support Volaria
                                </div>
                                <h2 className="text-2xl md:text-3xl font-bold mb-4">Help Keep Volaria Growing</h2>
                                <p className="text-slate-300 mb-6">
                                    Volaria is a labour of love — 18+ years of imagining, building, and refining this fictional football world. 
                                    If you enjoy exploring it, consider supporting its continued development. Every contribution helps keep the dream alive.
                                </p>
                                <div className="flex flex-wrap gap-3">
                                    <a 
                                        href="https://ko-fi.com/volaria" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                    >
                                        <Button className="bg-[#FF5E5B] hover:bg-[#ff4744] text-white">
                                            <Coffee className="w-4 h-4 mr-2" />
                                            Buy Me a Coffee
                                        </Button>
                                    </a>
                                    <Link to={createPageUrl('About')}>
                                        <Button variant="outline" className="border-white/30 text-white hover:bg-white/10">
                                            Learn More
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                            <div className="hidden md:block">
                                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                                    <Globe className="w-16 h-16 text-white" />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <AdminOnly>
                    <div className="mt-8 text-center">
                        <Link to={createPageUrl('AddNation')}>
                            <Button className="bg-slate-900 hover:bg-slate-800">
                                <Plus className="w-4 h-4 mr-2" />
                                Add Nation
                            </Button>
                        </Link>
                    </div>
                </AdminOnly>
            </div>
        </div>
    );
}