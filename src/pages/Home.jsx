import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Globe, Trophy, Shield, ChevronRight, Plus, MapPin, Star, Sparkles, Crown, Heart, Coffee, BookOpen, ArrowRight, Flame } from 'lucide-react';
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

    // Featured nations (top ranked with good data)
    const featuredNations = useMemo(() => {
        return categorizedNations.complete
            .filter(n => n.clubCount >= 10 && n.leagueCount >= 2)
            .slice(0, 5);
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

            {/* What is Volaria - Quick Intro */}
            <div className="bg-white border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="max-w-3xl mx-auto text-center">
                        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">What is Volaria?</h2>
                        <p className="text-lg text-slate-600 mb-6">
                            Volaria is a passion project 18+ years in the making — a fictional football continent with complete league pyramids, 
                            club histories, continental competitions, and stories that have evolved over thousands of imagined seasons. 
                            Think of it as a parallel football universe, lovingly crafted one match at a time.
                        </p>
                        <Link to={createPageUrl('About')} className="inline-flex items-center text-emerald-600 hover:text-emerald-700 font-medium">
                            Read the full story <ArrowRight className="w-4 h-4 ml-1" />
                        </Link>
                    </div>
                </div>
            </div>

            {/* Featured Entry Points */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                {/* Start Here Section */}
                {featuredNations.length > 0 && (
                    <div className="mb-16">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                                <Sparkles className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900">Start Here</h2>
                                <p className="text-slate-500">These nations have the richest histories — perfect for newcomers</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                            {featuredNations.map((nation, idx) => (
                                <Link 
                                    key={nation.id} 
                                    to={createPageUrl(`NationDetail?id=${nation.id}`)}
                                    className="group"
                                >
                                    <Card className="overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 bg-white group-hover:-translate-y-1 relative">
                                        {idx === 0 && (
                                            <div className="absolute top-2 left-2 z-10">
                                                <Badge className="bg-amber-500 text-white">
                                                    <Crown className="w-3 h-3 mr-1" /> #1 Ranked
                                                </Badge>
                                            </div>
                                        )}
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
                                        </div>
                                        <CardContent className="p-4">
                                            <h3 className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                                                {nation.name}
                                            </h3>
                                            <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                                                <span className="flex items-center gap-1">
                                                    <Trophy className="w-3 h-3" />
                                                    {nation.leagueCount}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Shield className="w-3 h-3" />
                                                    {nation.clubCount}
                                                </span>
                                                {nation.rank < 999 && (
                                                    <span className="ml-auto text-emerald-600 font-medium">#{nation.rank}</span>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* Iconic Clubs */}
                {iconicClubs.length > 0 && (
                    <div className="mb-16">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                                <Crown className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900">Iconic Clubs</h2>
                                <p className="text-slate-500">Legendary clubs that have shaped Volarian football</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                            {iconicClubs.map((club) => {
                                const nation = nations.find(n => n.id === club.nation_id);
                                return (
                                    <Link 
                                        key={club.id} 
                                        to={createPageUrl(`ClubDetail?id=${club.id}`)}
                                        className="group"
                                    >
                                        <Card className="overflow-hidden border-0 shadow-sm hover:shadow-lg transition-all duration-300 bg-white group-hover:-translate-y-1">
                                            <div 
                                                className="aspect-square flex items-center justify-center p-4 relative"
                                                style={{ 
                                                    background: `linear-gradient(135deg, ${club.primary_color || '#1e40af'}20, ${club.secondary_color || club.primary_color || '#3b82f6'}10)` 
                                                }}
                                            >
                                                {club.logo_url ? (
                                                    <img 
                                                        src={club.logo_url} 
                                                        alt={club.name}
                                                        className="w-16 h-16 object-contain group-hover:scale-110 transition-transform duration-300"
                                                    />
                                                ) : (
                                                    <Shield 
                                                        className="w-12 h-12" 
                                                        style={{ color: club.primary_color || '#64748b' }}
                                                    />
                                                )}
                                            </div>
                                            <CardContent className="p-3 text-center">
                                                <h3 className="font-bold text-sm text-slate-900 group-hover:text-emerald-600 transition-colors truncate">
                                                    {club.name}
                                                </h3>
                                                <p className="text-xs text-slate-500 truncate">{nation?.name}</p>
                                                <div className="flex items-center justify-center gap-2 mt-2">
                                                    {club.vcc_titles > 0 && (
                                                        <Badge className="bg-amber-100 text-amber-700 text-xs">
                                                            VCC ×{club.vcc_titles}
                                                        </Badge>
                                                    )}
                                                    {club.league_titles > 0 && (
                                                        <Badge variant="outline" className="text-xs">
                                                            {club.league_titles} titles
                                                        </Badge>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                );
                            })}
                        </div>
                        <div className="text-center mt-6">
                            <Link to={createPageUrl('AllClubs')}>
                                <Button variant="outline">
                                    View All Clubs <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                )}

                {/* Quick Links */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
                    <Link to={createPageUrl('ContinentalCompetitions')} className="group">
                        <Card className="border-0 shadow-sm hover:shadow-lg transition-all h-full bg-gradient-to-br from-amber-50 to-orange-50 group-hover:-translate-y-1">
                            <CardContent className="p-6">
                                <Trophy className="w-10 h-10 text-amber-500 mb-4" />
                                <h3 className="text-xl font-bold text-slate-900 mb-2">Continental Cups</h3>
                                <p className="text-slate-600">VCC, CCC, and the drama of European-style competition across Volaria</p>
                            </CardContent>
                        </Card>
                    </Link>
                    <Link to={createPageUrl('Coefficients')} className="group">
                        <Card className="border-0 shadow-sm hover:shadow-lg transition-all h-full bg-gradient-to-br from-blue-50 to-indigo-50 group-hover:-translate-y-1">
                            <CardContent className="p-6">
                                <Flame className="w-10 h-10 text-blue-500 mb-4" />
                                <h3 className="text-xl font-bold text-slate-900 mb-2">Rankings</h3>
                                <p className="text-slate-600">National and club coefficients — see who's on top</p>
                            </CardContent>
                        </Card>
                    </Link>
                    <Link to={createPageUrl('ClubComparison')} className="group">
                        <Card className="border-0 shadow-sm hover:shadow-lg transition-all h-full bg-gradient-to-br from-purple-50 to-pink-50 group-hover:-translate-y-1">
                            <CardContent className="p-6">
                                <Shield className="w-10 h-10 text-purple-500 mb-4" />
                                <h3 className="text-xl font-bold text-slate-900 mb-2">Compare Clubs</h3>
                                <p className="text-slate-600">Head-to-head stats and historical comparisons</p>
                            </CardContent>
                        </Card>
                    </Link>
                </div>

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
                                {categorizedNations.withData.slice(0, 12).map((nation) => (
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
                            {categorizedNations.inProgress.length > 0 && (
                                <div>
                                    <p className="text-sm text-slate-500 mb-3 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                                        Coming Soon — Nations in development
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {categorizedNations.inProgress.map((nation) => (
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