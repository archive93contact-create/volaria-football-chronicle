import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Globe, Trophy, Shield, ChevronRight, Plus, Star, Crown, Heart, Coffee, BookOpen, ArrowRight, Flame } from 'lucide-react';
import AdminOnly from '@/components/common/AdminOnly';
import GlobalSearch from '@/components/common/GlobalSearch';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Home() {
    const { data: nations = [] } = useQuery({
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

    const categorizedNations = useMemo(() => {
        const complete = [];
        const inProgress = [];
        const planned = [];

        nations.forEach(nation => {
            const nationLeagues = leagues.filter(l => l.nation_id === nation.id && l.is_active !== false);
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

            if (hasSeasons) complete.push(enrichedNation);
            else if (nationLeagues.length > 0 || nationClubs.length > 0) inProgress.push(enrichedNation);
            else planned.push(enrichedNation);
        });

        complete.sort((a, b) => {
            if (a.membership !== b.membership) {
                if (a.membership === 'VCC') return -1;
                if (b.membership === 'VCC') return 1;
            }
            return a.rank - b.rank;
        });
        inProgress.sort((a, b) => a.name.localeCompare(b.name));
        planned.sort((a, b) => a.name.localeCompare(b.name));

        return { complete, inProgress, planned };
    }, [nations, leagues, clubs, coefficients, seasons]);

    const featuredNations = useMemo(() => categorizedNations.complete.slice(0, 6), [categorizedNations]);

    const iconicClubs = useMemo(() => clubs
        .filter(c => (c.vcc_titles > 0 || c.ccc_titles > 0 || c.league_titles >= 5))
        .sort((a, b) => ((b.vcc_titles || 0) * 3 + (b.ccc_titles || 0) * 2 + (b.league_titles || 0)) -
                       ((a.vcc_titles || 0) * 3 + (a.ccc_titles || 0) * 2 + (a.league_titles || 0)))
        .slice(0, 5), [clubs]);

    return (
        <div className="min-h-screen bg-slate-950">

            {/* ── HERO ─────────────────────────────────────────────────── */}
            <div className="relative overflow-hidden">
                {/* Stadium photo */}
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1920')] bg-cover bg-center opacity-25" />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-slate-950/60 via-slate-950/70 to-slate-950" />

                <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-sm font-medium mb-8">
                        <Heart className="w-3.5 h-3.5" />
                        18+ Years of Fictional Football History
                    </div>
                    <h1 className="text-6xl md:text-8xl font-black text-white tracking-tight mb-4">
                        Volaria
                    </h1>
                    <p className="text-xl md:text-2xl text-slate-300 mb-3 font-light">
                        A world of football, built from imagination.
                    </p>
                    <p className="text-base text-slate-500 max-w-2xl mx-auto mb-10">
                        {nations.length} nations · {clubs.length.toLocaleString()} clubs · {seasons.length.toLocaleString()} seasons of history
                    </p>

                    {/* Search */}
                    <div className="flex justify-center mb-8">
                        <GlobalSearch />
                    </div>

                    <div className="flex flex-wrap justify-center gap-3">
                        <Link to={createPageUrl('Nations')}>
                            <Button size="lg" className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-8 rounded-full">
                                Explore the World <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                        </Link>
                        <Link to={createPageUrl('About')}>
                            <Button size="lg" variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/10 rounded-full px-8">
                                <BookOpen className="w-4 h-4 mr-2" /> The Story
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            {/* ── HOW TO EXPLORE ───────────────────────────────────────── */}
            <div className="bg-slate-900 border-y border-slate-800">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <p className="text-center text-slate-500 text-sm uppercase tracking-widest mb-8 font-medium">Your Journey Starts Here</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { step: '1', icon: Globe, color: 'from-emerald-600 to-teal-700', title: 'Choose a Nation', desc: 'Each nation has its own culture, colours, and football story. Start with a complete football system.', page: 'Nations', cta: 'Browse Nations' },
                            { step: '2', icon: Trophy, color: 'from-amber-600 to-orange-700', title: 'Follow the Leagues', desc: 'Dive into league tables, season-by-season history, and the full pyramid structure.', page: 'Seasons', cta: 'View Seasons' },
                            { step: '3', icon: Shield, color: 'from-blue-600 to-indigo-700', title: 'Discover the Clubs', desc: 'Every club has a crest, kit colours, rivalries, and decades of stats. Find your favourite.', page: 'AllClubs', cta: 'Browse Clubs' },
                        ].map(({ step, icon: Icon, color, title, desc, page, cta }) => (
                            <Link key={step} to={createPageUrl(page)} className="group">
                                <div className="bg-slate-800/60 hover:bg-slate-800 border border-slate-700 hover:border-slate-500 rounded-2xl p-6 transition-all duration-300 h-full">
                                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-4 shadow-lg`}>
                                        <Icon className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">Step {step}</div>
                                    <h3 className="text-lg font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors">{title}</h3>
                                    <p className="text-sm text-slate-400 mb-4 leading-relaxed">{desc}</p>
                                    <span className="text-sm text-emerald-400 font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                                        {cta} <ArrowRight className="w-3.5 h-3.5" />
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── FEATURED NATIONS ─────────────────────────────────────── */}
            {featuredNations.length > 0 && (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <div className="flex items-end justify-between mb-8">
                        <div>
                            <p className="text-emerald-500 text-sm font-semibold uppercase tracking-widest mb-1">Complete Football Systems</p>
                            <h2 className="text-3xl font-black text-white">Nations of Volaria</h2>
                        </div>
                        <Link to={createPageUrl('Nations')} className="text-slate-400 hover:text-white text-sm flex items-center gap-1 transition-colors">
                            All {nations.length} nations <ChevronRight className="w-4 h-4" />
                        </Link>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                        {featuredNations.map((nation) => {
                            const primaryColor = nation.primary_color || '#1e293b';
                            const secondaryColor = nation.secondary_color || primaryColor;
                            return (
                                <Link key={nation.id} to={createPageUrl(`NationDetail?id=${nation.id}`)} className="group">
                                    <div
                                        className="relative overflow-hidden rounded-2xl aspect-square flex flex-col items-center justify-center p-4 transition-all duration-300 group-hover:scale-105 group-hover:shadow-2xl"
                                        style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
                                    >
                                        {/* Flag watermark */}
                                        {nation.flag_url && (
                                            <div
                                                className="absolute inset-0 opacity-10 bg-cover bg-center"
                                                style={{ backgroundImage: `url(${nation.flag_url})` }}
                                            />
                                        )}
                                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />

                                        {/* Flag */}
                                        {nation.flag_url ? (
                                            <img src={nation.flag_url} alt={nation.name} className="relative z-10 w-14 h-10 object-contain drop-shadow-lg mb-3" />
                                        ) : (
                                            <Globe className="relative z-10 w-10 h-10 text-white/80 mb-3" />
                                        )}

                                        <div className="relative z-10 text-center">
                                            <div className="text-white font-bold text-sm leading-tight">{nation.name}</div>
                                            {nation.rank < 999 && (
                                                <div className="text-white/70 text-xs mt-1">#{nation.rank}</div>
                                            )}
                                        </div>

                                        {nation.membership && (
                                            <div className="absolute top-2 right-2 z-10">
                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${nation.membership === 'VCC' ? 'bg-amber-500 text-white' : 'bg-blue-500 text-white'}`}>
                                                    {nation.membership}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-2 px-1">
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <span className="flex items-center gap-1"><Trophy className="w-3 h-3" />{nation.leagueCount}</span>
                                            <span className="flex items-center gap-1"><Shield className="w-3 h-3" />{nation.clubCount}</span>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>

                    {/* In progress + planned as chips */}
                    {categorizedNations.inProgress.length > 0 && (
                        <div className="mb-4">
                            <p className="text-xs text-slate-600 mb-2 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block"></span>
                                In Development
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {categorizedNations.inProgress.map(n => (
                                    <Link key={n.id} to={createPageUrl(`NationDetail?id=${n.id}`)}>
                                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors text-sm text-slate-400 hover:text-white">
                                            {n.flag_url && <img src={n.flag_url} alt="" className="w-4 h-3 object-contain" />}
                                            {n.name}
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                    {categorizedNations.planned.length > 0 && (
                        <div>
                            <p className="text-xs text-slate-600 mb-2 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-600 inline-block"></span>
                                Coming Soon
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {categorizedNations.planned.map(n => (
                                    <Link key={n.id} to={createPageUrl(`NationDetail?id=${n.id}`)}>
                                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors text-sm text-slate-600 hover:text-slate-400">
                                            {n.flag_url && <img src={n.flag_url} alt="" className="w-4 h-3 object-contain opacity-50" />}
                                            {n.name}
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── ICONIC CLUBS + CONTINENTAL ───────────────────────────── */}
            {(iconicClubs.length > 0) && (
                <div className="bg-slate-900 border-y border-slate-800 py-16">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">

                            {/* Iconic Clubs */}
                            <div>
                                <p className="text-amber-500 text-sm font-semibold uppercase tracking-widest mb-1 flex items-center gap-2">
                                    <Crown className="w-4 h-4" /> Legendary Clubs
                                </p>
                                <h2 className="text-2xl font-black text-white mb-6">Most Decorated in Volaria</h2>
                                <div className="space-y-3">
                                    {iconicClubs.map((club, idx) => {
                                        const nation = nations.find(n => n.id === club.nation_id);
                                        const totalTrophies = (club.vcc_titles || 0) + (club.ccc_titles || 0) + (club.league_titles || 0) + (club.domestic_cup_titles || 0);
                                        return (
                                            <Link key={club.id} to={createPageUrl(`ClubDetail?id=${club.id}`)} className="group">
                                                <div
                                                    className="flex items-center gap-4 p-4 rounded-xl border border-slate-700 hover:border-slate-500 bg-slate-800/40 hover:bg-slate-800 transition-all"
                                                    style={club.primary_color ? { borderLeftColor: club.primary_color, borderLeftWidth: 3 } : {}}
                                                >
                                                    <span className="text-slate-600 font-bold text-lg w-6 text-center">{idx + 1}</span>
                                                    {club.logo_url ? (
                                                        <img src={club.logo_url} alt={club.name} className="w-10 h-10 object-contain bg-white rounded-lg p-1 shrink-0" />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center shrink-0">
                                                            <Shield className="w-5 h-5 text-slate-500" />
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-bold text-white group-hover:text-amber-400 transition-colors truncate">{club.name}</div>
                                                        <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                                                            {nation?.flag_url && <img src={nation.flag_url} alt="" className="w-4 h-3 object-contain" />}
                                                            {nation?.name}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        {club.vcc_titles > 0 && <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">{club.vcc_titles} VCC</Badge>}
                                                        {club.league_titles > 0 && <Badge className="bg-slate-700 text-slate-300 text-xs">{club.league_titles} 🏆</Badge>}
                                                    </div>
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                                <Link to={createPageUrl('AllClubs')} className="inline-flex items-center text-sm text-amber-400 hover:text-amber-300 font-medium mt-5 gap-1 transition-colors">
                                    Browse all clubs <ArrowRight className="w-3.5 h-3.5" />
                                </Link>
                            </div>

                            {/* Continental */}
                            <div>
                                <p className="text-purple-400 text-sm font-semibold uppercase tracking-widest mb-1 flex items-center gap-2">
                                    <Flame className="w-4 h-4" /> Continental Competitions
                                </p>
                                <h2 className="text-2xl font-black text-white mb-6">Where Legends Are Made</h2>
                                <div className="space-y-4">
                                    <Link to={createPageUrl('ContinentalCompetitions')} className="group block">
                                        <div className="p-5 rounded-xl bg-gradient-to-br from-amber-900/30 to-orange-900/20 border border-amber-800/40 hover:border-amber-600/60 transition-all">
                                            <div className="flex items-center gap-3 mb-2">
                                                <Badge className="bg-amber-500 text-white font-bold">VCC</Badge>
                                                <span className="font-bold text-white group-hover:text-amber-300 transition-colors">Volarian Champions Cup</span>
                                            </div>
                                            <p className="text-sm text-slate-400">The pinnacle of Volarian club football. Full member nations only.</p>
                                        </div>
                                    </Link>
                                    <Link to={createPageUrl('ContinentalCompetitions')} className="group block">
                                        <div className="p-5 rounded-xl bg-gradient-to-br from-blue-900/30 to-indigo-900/20 border border-blue-800/40 hover:border-blue-600/60 transition-all">
                                            <div className="flex items-center gap-3 mb-2">
                                                <Badge className="bg-blue-500 text-white font-bold">CCC</Badge>
                                                <span className="font-bold text-white group-hover:text-blue-300 transition-colors">Continental Challenge Cup</span>
                                            </div>
                                            <p className="text-sm text-slate-400">For associate member nations. A pathway to continental glory.</p>
                                        </div>
                                    </Link>
                                    <Link to={createPageUrl('Coefficients')} className="group block">
                                        <div className="p-5 rounded-xl bg-gradient-to-br from-slate-800/60 to-slate-800/40 border border-slate-700 hover:border-slate-500 transition-all">
                                            <div className="flex items-center gap-3 mb-2">
                                                <Star className="w-5 h-5 text-slate-400" />
                                                <span className="font-bold text-white group-hover:text-slate-300 transition-colors">Nation & Club Rankings</span>
                                            </div>
                                            <p className="text-sm text-slate-400">Coefficient rankings based on continental performance over 5 years.</p>
                                        </div>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── SUPPORT ──────────────────────────────────────────────── */}
            <div className="max-w-3xl mx-auto px-4 py-16 text-center">
                <Heart className="w-8 h-8 text-rose-500 mx-auto mb-4" />
                <h2 className="text-2xl font-black text-white mb-3">Help Keep Volaria Growing</h2>
                <p className="text-slate-400 mb-6 leading-relaxed">
                    Volaria is a labour of love — 18+ years of imagining, building, and refining this fictional football world. If you enjoy exploring it, consider supporting its continued development.
                </p>
                <div className="flex justify-center gap-3 flex-wrap">
                    <a href="https://ko-fi.com/volaria" target="_blank" rel="noopener noreferrer">
                        <Button className="bg-rose-500 hover:bg-rose-600 text-white rounded-full px-6">
                            <Coffee className="w-4 h-4 mr-2" /> Buy Me a Coffee
                        </Button>
                    </a>
                    <Link to={createPageUrl('About')}>
                        <Button variant="ghost" className="text-slate-400 hover:text-white rounded-full px-6">Learn More</Button>
                    </Link>
                </div>
            </div>

            <AdminOnly>
                <div className="text-center pb-12">
                    <Link to={createPageUrl('AddNation')}>
                        <Button variant="outline" className="border-slate-700 text-slate-400 hover:text-white">
                            <Plus className="w-4 h-4 mr-2" /> Add Nation
                        </Button>
                    </Link>
                </div>
            </AdminOnly>
        </div>
    );
}