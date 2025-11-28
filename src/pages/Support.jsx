import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Heart, Coffee, Globe, Download, FileText, Map, ChevronRight, Star, Gift, Sparkles } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Support() {
    return (
        <div className="min-h-screen bg-slate-50">
            {/* Hero */}
            <div className="relative overflow-hidden bg-gradient-to-br from-rose-900 via-slate-900 to-slate-800">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?w=1920')] opacity-10 bg-cover bg-center" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 to-transparent" />
                
                <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-400 text-sm font-medium mb-6">
                        <Heart className="w-4 h-4" />
                        Support Volaria
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-6">
                        Help Keep the Dream Alive
                    </h1>
                    <p className="text-xl text-slate-300 max-w-2xl mx-auto">
                        18+ years of passion. Thousands of clubs. One fictional football universe - built with love, sustained by your support.
                    </p>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                {/* Main Support Card */}
                <Card className="border-0 shadow-xl mb-12 overflow-hidden">
                    <div className="bg-gradient-to-r from-[#FF5E5B] to-[#ff7875] p-8 text-white">
                        <div className="flex flex-col md:flex-row items-center gap-6">
                            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center">
                                <Coffee className="w-10 h-10" />
                            </div>
                            <div className="flex-1 text-center md:text-left">
                                <h2 className="text-2xl font-bold mb-2">Buy Me a Coffee</h2>
                                <p className="text-white/90 mb-4">
                                    The simplest way to support Volaria. Every coffee helps cover hosting costs and fuels late-night worldbuilding sessions.
                                </p>
                                <a 
                                    href="https://ko-fi.com/volaria" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                >
                                    <Button size="lg" className="bg-white text-[#FF5E5B] hover:bg-white/90">
                                        <Coffee className="w-5 h-5 mr-2" />
                                        Support on Ko-fi
                                    </Button>
                                </a>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* What Your Support Does */}
                <div className="mb-12">
                    <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">What Your Support Does</h2>
                    <div className="grid md:grid-cols-3 gap-6">
                        <Card className="border-0 shadow-sm">
                            <CardContent className="p-6 text-center">
                                <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-emerald-100 flex items-center justify-center">
                                    <Globe className="w-6 h-6 text-emerald-600" />
                                </div>
                                <h3 className="font-bold text-slate-900 mb-2">Keeps Volaria Online</h3>
                                <p className="text-slate-600 text-sm">Hosting, domain costs, and infrastructure to keep the site running smoothly.</p>
                            </CardContent>
                        </Card>
                        <Card className="border-0 shadow-sm">
                            <CardContent className="p-6 text-center">
                                <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-amber-100 flex items-center justify-center">
                                    <Sparkles className="w-6 h-6 text-amber-600" />
                                </div>
                                <h3 className="font-bold text-slate-900 mb-2">Enables New Features</h3>
                                <p className="text-slate-600 text-sm">More nations, richer histories, better visualizations, and new ways to explore.</p>
                            </CardContent>
                        </Card>
                        <Card className="border-0 shadow-sm">
                            <CardContent className="p-6 text-center">
                                <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-rose-100 flex items-center justify-center">
                                    <Heart className="w-6 h-6 text-rose-600" />
                                </div>
                                <h3 className="font-bold text-slate-900 mb-2">Fuels the Passion</h3>
                                <p className="text-slate-600 text-sm">Knowing others enjoy Volaria motivates continued work on this labour of love.</p>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Digital Extras */}
                <Card className="border-0 shadow-lg mb-12">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Gift className="w-5 h-5 text-purple-500" />
                            Digital Extras
                            <Badge className="ml-2 bg-purple-100 text-purple-700">Coming Soon</Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-slate-600 mb-6">
                            Optional ways to support Volaria while getting something in return. All main content remains free forever.
                        </p>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                                <div className="flex items-start gap-3">
                                    <Map className="w-8 h-8 text-blue-500 mt-1" />
                                    <div>
                                        <h3 className="font-semibold text-slate-900">Volaria World Map</h3>
                                        <p className="text-sm text-slate-600 mb-2">High-resolution printable map of the Volarian continent with all nations.</p>
                                        <Badge variant="outline" className="text-xs">Coming Soon</Badge>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                                <div className="flex items-start gap-3">
                                    <FileText className="w-8 h-8 text-emerald-500 mt-1" />
                                    <div>
                                        <h3 className="font-semibold text-slate-900">Starter Guide PDF</h3>
                                        <p className="text-sm text-slate-600 mb-2">Introduction to Volaria with key nations, clubs, and stories to explore first.</p>
                                        <Badge variant="outline" className="text-xs">Coming Soon</Badge>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                                <div className="flex items-start gap-3">
                                    <Download className="w-8 h-8 text-amber-500 mt-1" />
                                    <div>
                                        <h3 className="font-semibold text-slate-900">Raw Data Pack</h3>
                                        <p className="text-sm text-slate-600 mb-2">CSV/JSON exports of all clubs, leagues, and seasons for your own projects.</p>
                                        <Badge variant="outline" className="text-xs">Coming Soon</Badge>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                                <div className="flex items-start gap-3">
                                    <Star className="w-8 h-8 text-purple-500 mt-1" />
                                    <div>
                                        <h3 className="font-semibold text-slate-900">Club Logo Pack</h3>
                                        <p className="text-sm text-slate-600 mb-2">Collection of all club logos in high resolution for personal use.</p>
                                        <Badge variant="outline" className="text-xs">Coming Soon</Badge>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Free Forever Note */}
                <Card className="border-0 shadow-sm bg-emerald-50 border-l-4 border-l-emerald-500 mb-12">
                    <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                            <Globe className="w-8 h-8 text-emerald-600 mt-1" />
                            <div>
                                <h3 className="font-bold text-emerald-900 mb-2">Volaria is Free Forever</h3>
                                <p className="text-emerald-800">
                                    All nations, clubs, leagues, and histories will always be free to explore. 
                                    Supporting is entirely optional — a way to say thanks and help the project grow. 
                                    No paywalls. No locked content. Just football.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* CTA */}
                <div className="text-center">
                    <h2 className="text-xl font-bold text-slate-900 mb-4">Thank You for Being Here</h2>
                    <p className="text-slate-600 mb-6">Whether you support or simply explore, you're part of the Volaria story.</p>
                    <div className="flex flex-wrap justify-center gap-4">
                        <Link to={createPageUrl('Home')}>
                            <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700">
                                Start Exploring
                                <ChevronRight className="w-5 h-5 ml-2" />
                            </Button>
                        </Link>
                        <Link to={createPageUrl('About')}>
                            <Button size="lg" variant="outline">
                                Read the Story
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}