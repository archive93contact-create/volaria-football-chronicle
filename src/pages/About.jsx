import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Globe, Trophy, Shield, Calendar, Heart, ChevronRight } from 'lucide-react';
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

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Hero */}
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1920')] opacity-10 bg-cover bg-center" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 to-transparent" />
                
                <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm font-medium mb-6">
                        <Heart className="w-4 h-4" />
                        18+ Years in the Making
                    </div>
                    <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight mb-6">
                        About Volaria
                    </h1>
                    <p className="text-xl text-slate-300 max-w-2xl mx-auto">
                        A passion project brought to life
                    </p>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                {/* Main Story */}
                <Card className="border-0 shadow-lg mb-12">
                    <CardContent className="p-8 md:p-12">
                        <div className="prose prose-lg prose-slate max-w-none">
                            <p className="text-xl leading-relaxed text-slate-700">
                                The Volarian Continent and Football World began with me creating the <strong className="text-emerald-600">TFA Football League</strong> which is a Passion Project that has been going for over <strong>18 years</strong>.
                            </p>
                            
                            <p className="text-lg leading-relaxed text-slate-600 mt-6">
                                As a kid I always wanted to run and envisage my own football league and this is where TFA was born. Originally being dice games me and my friends would play with our made up teams based on the English Football League system. This grew into a full league system with <strong className="text-emerald-600">1000s of teams</strong>.
                            </p>

                            <p className="text-lg leading-relaxed text-slate-600 mt-6">
                                Over the years there have been many different ways in which I ran league seasons and they have now all been collected together into one large History. The Fictional League has over <strong className="text-emerald-600">100 league seasons</strong> with even some clubs having full histories, back stories and also logos.
                            </p>

                            <p className="text-lg leading-relaxed text-slate-600 mt-6">
                                This website is where I can share my passion for everyone to enjoy and explore everything to do with the TFA Football League and the wider Volarian world.
                            </p>

                            <div className="mt-10 pt-8 border-t border-slate-200 text-right">
                                <p className="text-2xl font-bold text-slate-800 italic">— Matt</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                    <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                        <CardContent className="p-6 text-center">
                            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-80" />
                            <div className="text-3xl font-bold">18+</div>
                            <div className="text-sm opacity-80">Years</div>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                        <CardContent className="p-6 text-center">
                            <Globe className="w-8 h-8 mx-auto mb-2 opacity-80" />
                            <div className="text-3xl font-bold">{nations.length || '37'}</div>
                            <div className="text-sm opacity-80">Nations</div>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-500 to-orange-600 text-white">
                        <CardContent className="p-6 text-center">
                            <Trophy className="w-8 h-8 mx-auto mb-2 opacity-80" />
                            <div className="text-3xl font-bold">{seasons.length || '100+'}</div>
                            <div className="text-sm opacity-80">Seasons</div>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-500 to-pink-600 text-white">
                        <CardContent className="p-6 text-center">
                            <Shield className="w-8 h-8 mx-auto mb-2 opacity-80" />
                            <div className="text-3xl font-bold">{clubs.length || '1000s'}</div>
                            <div className="text-sm opacity-80">Clubs</div>
                        </CardContent>
                    </Card>
                </div>

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