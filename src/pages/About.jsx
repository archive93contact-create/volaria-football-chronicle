import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Globe, Heart, Calendar, Sparkles, BookOpen, Users, Trophy, MapPin, Star, Coffee, Download, FileText, Map, ChevronRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PageHeader from '@/components/common/PageHeader';

export default function About() {
    return (
        <div className="min-h-screen bg-slate-50">
            <PageHeader 
                title="About Volaria"
                subtitle="The story behind 18+ years of fictional football"
                breadcrumbs={[{ label: 'About' }]}
            />

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Origin Story */}
                <Card className="border-0 shadow-lg mb-8 overflow-hidden">
                    <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-8 text-white">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                                <Sparkles className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold">The Origin Story</h2>
                                <p className="text-emerald-100">How Volaria Came to Be</p>
                            </div>
                        </div>
                    </div>
                    <CardContent className="p-8">
                        <div className="prose prose-slate max-w-none">
                            <p className="text-lg text-slate-700 leading-relaxed mb-6">
                                Volaria began in 2007 as a simple notebook filled with imaginary football leagues, 
                                scribbled during breaks and quiet evenings. What started as idle daydreaming about 
                                fictional clubs and their histories slowly grew into something much larger — a fully 
                                realised continent with its own geography, culture, and 100+ years of sporting history.
                            </p>
                            <p className="text-slate-600 leading-relaxed mb-6">
                                Over the years, the project evolved from paper notes to spreadsheets, and finally 
                                to this digital home. Each nation has been carefully developed with its own football 
                                identity — from the powerhouse leagues of established federations to the emerging 
                                scenes of smaller nations finding their place in continental competition.
                            </p>
                            <p className="text-slate-600 leading-relaxed">
                                This isn't just a database of fictional stats. It's a living world where clubs have 
                                risen and fallen, where dynasties have been built and broken, where every number 
                                tells a story. Some clubs are inspired by real-world football culture, others are 
                                entirely original — but all of them feel real to me, and I hope they will to you too.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Timeline */}
                <Card className="border-0 shadow-sm mb-8">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-emerald-500" />
                            The Journey So Far
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            <div className="flex gap-4">
                                <div className="w-16 text-right">
                                    <Badge className="bg-emerald-100 text-emerald-700">2007</Badge>
                                </div>
                                <div className="flex-1 pb-6 border-l-2 border-emerald-200 pl-6 relative">
                                    <div className="absolute w-3 h-3 bg-emerald-500 rounded-full -left-[7px] top-1" />
                                    <h4 className="font-semibold text-slate-800">The First Notebooks</h4>
                                    <p className="text-slate-600 text-sm">First fictional leagues created on paper, inspired by a love of football and worldbuilding</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-16 text-right">
                                    <Badge className="bg-blue-100 text-blue-700">2010s</Badge>
                                </div>
                                <div className="flex-1 pb-6 border-l-2 border-blue-200 pl-6 relative">
                                    <div className="absolute w-3 h-3 bg-blue-500 rounded-full -left-[7px] top-1" />
                                    <h4 className="font-semibold text-slate-800">Digital Migration</h4>
                                    <p className="text-slate-600 text-sm">Moved to spreadsheets, expanded to multiple nations, created continental competitions</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-16 text-right">
                                    <Badge className="bg-purple-100 text-purple-700">2020s</Badge>
                                </div>
                                <div className="flex-1 pb-6 border-l-2 border-purple-200 pl-6 relative">
                                    <div className="absolute w-3 h-3 bg-purple-500 rounded-full -left-[7px] top-1" />
                                    <h4 className="font-semibold text-slate-800">Volaria Goes Online</h4>
                                    <p className="text-slate-600 text-sm">Built this website to share the world, added detailed club histories and narratives</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-16 text-right">
                                    <Badge className="bg-amber-100 text-amber-700">Now</Badge>
                                </div>
                                <div className="flex-1 pl-6 relative">
                                    <div className="absolute w-3 h-3 bg-amber-500 rounded-full -left-[7px] top-1" />
                                    <h4 className="font-semibold text-slate-800">Continuous Expansion</h4>
                                    <p className="text-slate-600 text-sm">Adding new nations, filling in historical gaps, and sharing stories with fellow football dreamers</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* What Makes Volaria Special */}
                <Card className="border-0 shadow-sm mb-8">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Star className="w-5 h-5 text-amber-500" />
                            What Makes Volaria Special
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-4 rounded-lg bg-slate-50">
                                <Trophy className="w-8 h-8 text-amber-500 mb-3" />
                                <h4 className="font-semibold text-slate-800 mb-2">Deep History</h4>
                                <p className="text-slate-600 text-sm">
                                    Every league has decades of results, every club has a story arc — 
                                    from founding to glory days to potential decline.
                                </p>
                            </div>
                            <div className="p-4 rounded-lg bg-slate-50">
                                <MapPin className="w-8 h-8 text-emerald-500 mb-3" />
                                <h4 className="font-semibold text-slate-800 mb-2">Geographic Logic</h4>
                                <p className="text-slate-600 text-sm">
                                    Nations have regions, districts, and settlements. Clubs are placed 
                                    in locations that make sense for local rivalries.
                                </p>
                            </div>
                            <div className="p-4 rounded-lg bg-slate-50">
                                <Users className="w-8 h-8 text-blue-500 mb-3" />
                                <h4 className="font-semibold text-slate-800 mb-2">Rivalries & Derbies</h4>
                                <p className="text-slate-600 text-sm">
                                    Organic rivalries emerge from geography and history — 
                                    city derbies, regional conflicts, and old grudges.
                                </p>
                            </div>
                            <div className="p-4 rounded-lg bg-slate-50">
                                <BookOpen className="w-8 h-8 text-purple-500 mb-3" />
                                <h4 className="font-semibold text-slate-800 mb-2">Narrative Focus</h4>
                                <p className="text-slate-600 text-sm">
                                    This isn't just stats — it's stories. Every dynasty, 
                                    every relegation battle, every unexpected champion.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Support Section */}
                <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-900 to-slate-800 text-white mb-8">
                    <CardContent className="p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                                <Heart className="w-6 h-6 text-red-400" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold">Support This Project</h2>
                                <p className="text-slate-300">Help keep Volaria growing</p>
                            </div>
                        </div>
                        
                        <p className="text-slate-300 mb-6 leading-relaxed">
                            Volaria is and always will be free to explore. This is a hobby, not a business. 
                            But if you enjoy wandering through this fictional world and want to support its 
                            continued development, there are a few ways you can help:
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <div className="p-4 rounded-lg bg-white/10">
                                <Coffee className="w-6 h-6 text-amber-400 mb-2" />
                                <h4 className="font-semibold mb-1">Buy Me a Coffee</h4>
                                <p className="text-slate-400 text-sm mb-3">
                                    A small contribution to fuel late-night worldbuilding sessions
                                </p>
                                <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white">
                                    Support on Ko-fi
                                </Button>
                            </div>
                            <div className="p-4 rounded-lg bg-white/10">
                                <Globe className="w-6 h-6 text-emerald-400 mb-2" />
                                <h4 className="font-semibold mb-1">Spread the Word</h4>
                                <p className="text-slate-400 text-sm mb-3">
                                    Share Volaria with fellow football fans and worldbuilding enthusiasts
                                </p>
                                <Button size="sm" variant="outline" className="border-white/30 hover:bg-white/10">
                                    Share Volaria
                                </Button>
                            </div>
                        </div>

                        <div className="border-t border-white/10 pt-6">
                            <h4 className="font-semibold mb-4 flex items-center gap-2">
                                <Download className="w-5 h-5 text-blue-400" />
                                Digital Extras (Coming Soon)
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                                    <Map className="w-8 h-8 text-slate-400" />
                                    <div>
                                        <div className="font-medium text-sm">Volaria World Map</div>
                                        <div className="text-xs text-slate-400">Printable A3 poster (PDF)</div>
                                    </div>
                                    <Badge variant="outline" className="ml-auto text-xs">Soon</Badge>
                                </div>
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                                    <FileText className="w-8 h-8 text-slate-400" />
                                    <div>
                                        <div className="font-medium text-sm">Starter Guide</div>
                                        <div className="text-xs text-slate-400">Introduction to the world (PDF)</div>
                                    </div>
                                    <Badge variant="outline" className="ml-auto text-xs">Soon</Badge>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Get Started CTA */}
                <Card className="border-0 shadow-sm bg-emerald-50">
                    <CardContent className="p-8 text-center">
                        <Globe className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Ready to Explore?</h3>
                        <p className="text-slate-600 mb-6">
                            Dive into the nations, clubs, and competitions of Volaria
                        </p>
                        <div className="flex flex-wrap justify-center gap-3">
                            <Link to={createPageUrl('Nations')}>
                                <Button className="bg-emerald-600 hover:bg-emerald-700">
                                    Explore Nations
                                    <ChevronRight className="w-4 h-4 ml-2" />
                                </Button>
                            </Link>
                            <Link to={createPageUrl('AllClubs')}>
                                <Button variant="outline">
                                    Browse Clubs
                                </Button>
                            </Link>
                            <Link to={createPageUrl('ContinentalCompetitions')}>
                                <Button variant="outline">
                                    Continental Cups
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}