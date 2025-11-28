import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Globe, Trophy, Shield, Calendar, Heart, ChevronRight, Coffee, Sparkles, BookOpen, Users, Star, MapPin, Clock, Zap } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function About() {
    const { data: nations = [] } = useQuery({
        queryKey: ['nations'],
        queryFn: () => base44.entities.Nation.list(),
    });

    const { data: clubs = [] } = useQuery({
        queryKey: ['clubs'],
        queryFn: () => base44.entities.Club.list(),
    });

    const { data: seasons = [] } = useQuery({
        queryKey: ['allSeasons'],
        queryFn: () => base44.entities.Season.list(),
    });

    const { data: leagues = [] } = useQuery({
        queryKey: ['leagues'],
        queryFn: () => base44.entities.League.list(),
    });

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Hero */}
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1920')] opacity-10 bg-cover bg-center" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 to-transparent" />
                
                <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm font-medium mb-6">
                        <Heart className="w-4 h-4" />
                        A Passion Project
                    </div>
                    <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight mb-6">
                        The Story of Volaria
                    </h1>
                    <p className="text-xl text-slate-300 max-w-2xl mx-auto">
                        18+ years of imagination, one fictional football universe at a time
                    </p>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                {/* Origin Story */}
                <div className="grid md:grid-cols-3 gap-8 mb-16">
                    <div className="md:col-span-2">
                        <Card className="border-0 shadow-lg h-full">
                            <CardContent className="p-8 md:p-10">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                                        <BookOpen className="w-6 h-6 text-white" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-slate-900">How It All Began</h2>
                                </div>
                                <div className="prose prose-lg prose-slate max-w-none space-y-4">
                                    <p className="text-lg text-slate-600">
                                        It started with <strong className="text-emerald-600">dice games</strong>. As a kid, I always dreamed of running my own football league — creating teams, inventing histories, imagining the drama of promotion battles and title races. 
                                    </p>
                                    <p className="text-slate-600">
                                        My friends and I would gather, roll dice, and play out matches with our made-up teams based on the English Football League system. Each team had a name, a story, and — most importantly — rivals.
                                    </p>
                                    <p className="text-slate-600">
                                        What began as childhood games evolved into something much bigger. The <strong className="text-emerald-600">TFA Football League</strong> — my original creation — grew into a complete league pyramid. Then came more nations. More history. More stories.
                                    </p>
                                    <p className="text-slate-600">
                                        Over 18+ years, I've run seasons using everything from pen-and-paper to spreadsheets to Football Manager. Each era added new layers of depth — club backstories, continental competitions, coefficients, and the rich tapestry of rivalries that make football magical.
                                    </p>
                                    <p className="text-slate-600">
                                        Today, <strong className="text-emerald-600">Volaria</strong> is the culmination of all that work — a fictional continent home to {nations.length} nations, {clubs.length.toLocaleString()} clubs, and over {seasons.length} seasons of imagined football history. Every club has a story. Every season tells a tale.
                                    </p>
                                </div>
                                <div className="mt-8 pt-6 border-t border-slate-200 flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
                                        <Users className="w-7 h-7 text-slate-500" />
                                    </div>
                                    <div>
                                        <p className="text-xl font-bold text-slate-800">— Matt</p>
                                        <p className="text-slate-500">Creator of Volaria</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                    <div className="space-y-4">
                        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                            <CardContent className="p-6">
                                <Clock className="w-8 h-8 mb-3 opacity-80" />
                                <div className="text-4xl font-bold">18+</div>
                                <div className="text-emerald-100">Years in the Making</div>
                            </CardContent>
                        </Card>
                        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                            <CardContent className="p-6">
                                <Globe className="w-8 h-8 mb-3 opacity-80" />
                                <div className="text-4xl font-bold">{nations.length}</div>
                                <div className="text-blue-100">Nations</div>
                            </CardContent>
                        </Card>
                        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-500 to-orange-600 text-white">
                            <CardContent className="p-6">
                                <Trophy className="w-8 h-8 mb-3 opacity-80" />
                                <div className="text-4xl font-bold">{seasons.length}</div>
                                <div className="text-amber-100">Seasons Played</div>
                            </CardContent>
                        </Card>
                        <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-500 to-pink-600 text-white">
                            <CardContent className="p-6">
                                <Shield className="w-8 h-8 mb-3 opacity-80" />
                                <div className="text-4xl font-bold">{clubs.length.toLocaleString()}</div>
                                <div className="text-purple-100">Clubs with Stories</div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Timeline */}
                <Card className="border-0 shadow-lg mb-16">
                    <CardContent className="p-8">
                        <h2 className="text-2xl font-bold text-slate-900 mb-8 flex items-center gap-3">
                            <Sparkles className="w-6 h-6 text-amber-500" />
                            The Evolution of Volaria
                        </h2>
                        <div className="space-y-6">
                            <div className="flex gap-4">
                                <div className="w-24 flex-shrink-0 text-right">
                                    <span className="text-sm font-bold text-emerald-600">~2006</span>
                                </div>
                                <div className="w-3 h-3 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0"></div>
                                <div>
                                    <h3 className="font-semibold text-slate-900">The Beginning</h3>
                                    <p className="text-slate-600">Dice games with friends, creating made-up teams and playing out matches on paper.</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-24 flex-shrink-0 text-right">
                                    <span className="text-sm font-bold text-blue-600">2008-2012</span>
                                </div>
                                <div className="w-3 h-3 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></div>
                                <div>
                                    <h3 className="font-semibold text-slate-900">TFA is Born</h3>
                                    <p className="text-slate-600">The TFA Football League takes shape — a full pyramid based on English football, with hundreds of clubs.</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-24 flex-shrink-0 text-right">
                                    <span className="text-sm font-bold text-purple-600">2012-2018</span>
                                </div>
                                <div className="w-3 h-3 rounded-full bg-purple-500 mt-1.5 flex-shrink-0"></div>
                                <div>
                                    <h3 className="font-semibold text-slate-900">Expansion Era</h3>
                                    <p className="text-slate-600">More nations join. Continental competitions emerge. Spreadsheets grow massive. Football Manager simulates seasons.</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-24 flex-shrink-0 text-right">
                                    <span className="text-sm font-bold text-amber-600">2018-2023</span>
                                </div>
                                <div className="w-3 h-3 rounded-full bg-amber-500 mt-1.5 flex-shrink-0"></div>
                                <div>
                                    <h3 className="font-semibold text-slate-900">The Volarian Continent</h3>
                                    <p className="text-slate-600">All nations unified under one fictional continent. Rich backstories, coefficients, and interconnected histories.</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-24 flex-shrink-0 text-right">
                                    <span className="text-sm font-bold text-rose-600">2024+</span>
                                </div>
                                <div className="w-3 h-3 rounded-full bg-rose-500 mt-1.5 flex-shrink-0"></div>
                                <div>
                                    <h3 className="font-semibold text-slate-900">This Website</h3>
                                    <p className="text-slate-600">Finally, a home for Volaria online — where everyone can explore the world I've been building for nearly two decades.</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* What Makes Volaria Special */}
                <div className="mb-16">
                    <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">What Makes Volaria Special</h2>
                    <div className="grid md:grid-cols-3 gap-6">
                        <Card className="border-0 shadow-sm">
                            <CardContent className="p-6 text-center">
                                <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-amber-100 flex items-center justify-center">
                                    <Trophy className="w-6 h-6 text-amber-600" />
                                </div>
                                <h3 className="font-bold text-slate-900 mb-2">Complete Histories</h3>
                                <p className="text-slate-600 text-sm">Every season tracked. Every champion recorded. Decades of fictional football preserved.</p>
                            </CardContent>
                        </Card>
                        <Card className="border-0 shadow-sm">
                            <CardContent className="p-6 text-center">
                                <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-red-100 flex items-center justify-center">
                                    <Zap className="w-6 h-6 text-red-600" />
                                </div>
                                <h3 className="font-bold text-slate-900 mb-2">Real Rivalries</h3>
                                <p className="text-slate-600 text-sm">Derbies, grudge matches, and heated competitions that have evolved over imaginary decades.</p>
                            </CardContent>
                        </Card>
                        <Card className="border-0 shadow-sm">
                            <CardContent className="p-6 text-center">
                                <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-emerald-100 flex items-center justify-center">
                                    <MapPin className="w-6 h-6 text-emerald-600" />
                                </div>
                                <h3 className="font-bold text-slate-900 mb-2">Rich Geography</h3>
                                <p className="text-slate-600 text-sm">Nations with distinct football cultures, from powerhouses to emerging minnows.</p>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Support Section */}
                <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-900 to-slate-800 text-white overflow-hidden mb-16">
                    <CardContent className="p-8 md:p-10">
                        <div className="flex flex-col md:flex-row items-center gap-8">
                            <div className="flex-1">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-400 text-sm font-medium mb-4">
                                    <Heart className="w-4 h-4" /> Support This Project
                                </div>
                                <h2 className="text-2xl md:text-3xl font-bold mb-4">Help Volaria Grow</h2>
                                <p className="text-slate-300 mb-6">
                                    This is a hobby project — built with love over 18+ years. If you enjoy exploring Volaria, consider supporting its ongoing development. 
                                    Your support helps cover hosting costs and motivates continued work on new features, more nations, and richer histories.
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
                                </div>
                                <p className="text-slate-400 text-sm mt-4">
                                    All content remains free. Supporting is entirely optional but deeply appreciated.
                                </p>
                            </div>
                            <div className="hidden md:block">
                                <div className="w-28 h-28 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                                    <Globe className="w-14 h-14 text-white" />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* CTA */}
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-slate-900 mb-4">Ready to Explore?</h2>
                    <p className="text-slate-600 mb-6">Dive into the world of Volarian football</p>
                    <div className="flex flex-wrap justify-center gap-4">
                        <Link to={createPageUrl('Nations')}>
                            <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700">
                                Explore Nations
                                <ChevronRight className="w-5 h-5 ml-2" />
                            </Button>
                        </Link>
                        <Link to={createPageUrl('Contact')}>
                            <Button size="lg" variant="outline">
                                Get in Touch
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}