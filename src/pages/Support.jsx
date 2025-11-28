import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Heart, Coffee, Globe, Download, FileText, Map, Share2, Twitter, MessageCircle, ChevronRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PageHeader from '@/components/common/PageHeader';

export default function Support() {
    return (
        <div className="min-h-screen bg-slate-50">
            <PageHeader 
                title="Support Volaria"
                subtitle="Help keep this passion project growing"
                breadcrumbs={[{ label: 'Support' }]}
            />

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Intro */}
                <Card className="border-0 shadow-lg mb-8 overflow-hidden">
                    <div className="bg-gradient-to-r from-red-500 to-pink-500 p-8 text-white">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                                <Heart className="w-8 h-8" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold">A Labour of Love</h2>
                                <p className="text-red-100">18+ years of fictional football, built with passion</p>
                            </div>
                        </div>
                    </div>
                    <CardContent className="p-8">
                        <p className="text-lg text-slate-700 leading-relaxed mb-4">
                            Volaria is a hobby project — created in spare moments, developed over nearly two decades, 
                            and shared freely with anyone who wants to explore it. There's no paywall, no premium 
                            tier, no ads. Just a fictional football world, waiting to be discovered.
                        </p>
                        <p className="text-slate-600 leading-relaxed">
                            If you've enjoyed exploring Volaria and want to support its continued development, 
                            here are some ways you can help. Every bit of support — whether financial or just 
                            spreading the word — means the world.
                        </p>
                    </CardContent>
                </Card>

                {/* Support Options */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {/* Financial Support */}
                    <Card className="border-0 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Coffee className="w-5 h-5 text-amber-500" />
                                Buy Me a Coffee
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-slate-600 text-sm mb-4">
                                A small one-time contribution to fuel late-night worldbuilding sessions. 
                                No subscriptions, no obligations — just a way to say thanks.
                            </p>
                            <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white">
                                <Coffee className="w-4 h-4 mr-2" />
                                Support on Ko-fi
                            </Button>
                            <p className="text-xs text-slate-400 mt-3 text-center">
                                100% goes toward hosting costs and development time
                            </p>
                        </CardContent>
                    </Card>

                    {/* Spread the Word */}
                    <Card className="border-0 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Share2 className="w-5 h-5 text-blue-500" />
                                Spread the Word
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-slate-600 text-sm mb-4">
                                Know someone who loves football, worldbuilding, or fictional universes? 
                                Share Volaria with them — word of mouth is the best promotion.
                            </p>
                            <div className="flex gap-2">
                                <Button variant="outline" className="flex-1">
                                    <Twitter className="w-4 h-4 mr-2" />
                                    Tweet
                                </Button>
                                <Button variant="outline" className="flex-1">
                                    <MessageCircle className="w-4 h-4 mr-2" />
                                    Share
                                </Button>
                            </div>
                            <p className="text-xs text-slate-400 mt-3 text-center">
                                Every share helps this project reach new explorers
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Digital Extras */}
                <Card className="border-0 shadow-sm mb-8">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Download className="w-5 h-5 text-purple-500" />
                            Digital Extras
                            <Badge variant="outline" className="ml-2">Coming Soon</Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-slate-600 text-sm mb-6">
                            Optional paid downloads to support ongoing development. All main content remains free forever.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 rounded-lg border border-dashed border-slate-300 bg-slate-50">
                                <div className="flex items-start gap-3">
                                    <Map className="w-10 h-10 text-emerald-500" />
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-slate-800">Volaria World Map</h4>
                                        <p className="text-xs text-slate-500 mb-2">
                                            High-resolution printable A3 map showing all nations and regions
                                        </p>
                                        <div className="flex items-center justify-between">
                                            <Badge className="bg-slate-200 text-slate-600">PDF Download</Badge>
                                            <span className="text-sm font-medium text-slate-400">Coming Soon</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 rounded-lg border border-dashed border-slate-300 bg-slate-50">
                                <div className="flex items-start gap-3">
                                    <FileText className="w-10 h-10 text-blue-500" />
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-slate-800">Starter Guide</h4>
                                        <p className="text-xs text-slate-500 mb-2">
                                            Introduction to Volaria: history, key nations, legendary clubs
                                        </p>
                                        <div className="flex items-center justify-between">
                                            <Badge className="bg-slate-200 text-slate-600">PDF Guide</Badge>
                                            <span className="text-sm font-medium text-slate-400">Coming Soon</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 rounded-lg border border-dashed border-slate-300 bg-slate-50">
                                <div className="flex items-start gap-3">
                                    <Globe className="w-10 h-10 text-amber-500" />
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-slate-800">Raw Data Pack</h4>
                                        <p className="text-xs text-slate-500 mb-2">
                                            Spreadsheets with all historical data for your own analysis
                                        </p>
                                        <div className="flex items-center justify-between">
                                            <Badge className="bg-slate-200 text-slate-600">CSV/Excel</Badge>
                                            <span className="text-sm font-medium text-slate-400">Coming Soon</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 rounded-lg border border-dashed border-slate-300 bg-slate-50">
                                <div className="flex items-start gap-3">
                                    <Heart className="w-10 h-10 text-red-500" />
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-slate-800">Club Crest Pack</h4>
                                        <p className="text-xs text-slate-500 mb-2">
                                            High-resolution logos for all major clubs
                                        </p>
                                        <div className="flex items-center justify-between">
                                            <Badge className="bg-slate-200 text-slate-600">PNG/SVG</Badge>
                                            <span className="text-sm font-medium text-slate-400">Coming Soon</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* FAQ */}
                <Card className="border-0 shadow-sm mb-8">
                    <CardHeader>
                        <CardTitle>Frequently Asked Questions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <h4 className="font-semibold text-slate-800 mb-1">Will content ever be paywalled?</h4>
                            <p className="text-slate-600 text-sm">
                                No. All nations, clubs, leagues, and historical data will always be free to explore. 
                                Digital extras are optional bonuses for supporters, not gated content.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-slate-800 mb-1">How is support money used?</h4>
                            <p className="text-slate-600 text-sm">
                                Primarily hosting costs and domain fees. Any remainder goes toward development time — 
                                which means more nations, more history, and more stories.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-slate-800 mb-1">Can I contribute content?</h4>
                            <p className="text-slate-600 text-sm">
                                At this stage, Volaria is a personal project with a specific vision. But feedback, 
                                suggestions, and corrections are always welcome via the Contact page.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Back to Exploring */}
                <Card className="border-0 shadow-sm bg-emerald-50">
                    <CardContent className="p-8 text-center">
                        <Globe className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Thank You</h3>
                        <p className="text-slate-600 mb-6">
                            Whether you support financially or just enjoy exploring, you're part of what makes this worthwhile.
                        </p>
                        <Link to={createPageUrl('Home')}>
                            <Button className="bg-emerald-600 hover:bg-emerald-700">
                                Back to Volaria
                                <ChevronRight className="w-4 h-4 ml-2" />
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}