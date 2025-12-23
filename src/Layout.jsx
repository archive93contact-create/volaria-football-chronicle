import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Globe, Trophy, Shield, Star, BarChart3, Menu, X, Home, Info, Mail, ChevronDown, Sparkles, MapPin, Heart, Users } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import PageTransition from '@/components/common/PageTransition';

export default function Layout({ children, currentPageName }) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const location = useLocation();

    // Scroll to top on page change
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [location.pathname, location.search]);

    const mainNavItems = [
                                        { name: 'Home', icon: Home, page: 'Home' },
                                        { name: 'Nations', icon: Globe, page: 'Nations' },
                                        { name: 'Clubs', icon: Shield, page: 'AllClubs' },
                                        { name: 'Players', icon: Users, page: 'Players' },
                                        { name: 'Seasons', icon: Trophy, page: 'Seasons' },
                                        { name: 'Continental', icon: Star, page: 'ContinentalCompetitions' },
                                    ];

            const toolsDropdown = [
                { name: 'Bulk Squad Builder', icon: Users, page: 'BulkSquadBuilder' },
                { name: 'Coefficients', icon: BarChart3, page: 'Coefficients' },
                { name: 'Stability Manager', icon: BarChart3, page: 'StabilityManager' },
                { name: 'Nation Generator', icon: Sparkles, page: 'NationGenerator' },
                { name: 'Kit Generator', icon: Sparkles, page: 'KitGenerator' },
                { name: 'Compare Clubs', icon: Shield, page: 'ClubComparison' },
                { name: 'Compare Leagues', icon: Trophy, page: 'LeagueComparison' },
                { name: 'Locations', icon: MapPin, page: 'Locations' },
            ];

            const moreDropdown = [
                { name: 'About', icon: Info, page: 'About' },
                { name: 'Contact', icon: Mail, page: 'Contact' },
                { name: 'Support', icon: Heart, page: 'Support' },
            ];

            const mobileNavItems = [
                ...mainNavItems,
                ...toolsDropdown,
                ...moreDropdown,
            ];

    return (
        <div className="min-h-screen bg-slate-50">
            <style>{`
                /* White backgrounds for all club crests and nation flags */
                img[src*="logo"],
                img[alt*="crest"],
                img[alt*="flag"],
                .club-crest,
                .nation-flag {
                    background-color: white;
                    padding: 2px;
                    border-radius: 4px;
                }
            `}</style>
            {/* Top Navigation */}
            <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <Link to={createPageUrl('Home')} className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                                <Globe className="w-6 h-6 text-white" />
                            </div>
                            <span className="text-xl font-bold text-white">Volaria</span>
                        </Link>

                        {/* Desktop Nav */}
                                                    <div className="hidden md:flex items-center gap-1">
                                                        {mainNavItems.map((item) => (
                                                            <Link key={item.page} to={createPageUrl(item.page)}>
                                                                <Button 
                                                                    variant="ghost" 
                                                                    className={`text-slate-300 hover:text-white hover:bg-slate-800 ${
                                                                        currentPageName === item.page ? 'bg-slate-800 text-white' : ''
                                                                    }`}
                                                                >
                                                                    <item.icon className="w-4 h-4 mr-2" />
                                                                    {item.name}
                                                                </Button>
                                                            </Link>
                                                        ))}

                                                        {/* Tools Dropdown */}
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-slate-800">
                                                                    <BarChart3 className="w-4 h-4 mr-2" />
                                                                    Tools
                                                                    <ChevronDown className="w-3 h-3 ml-1" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent className="bg-slate-800 border-slate-700">
                                                                {toolsDropdown.map((item) => (
                                                                    <DropdownMenuItem key={item.page} asChild>
                                                                        <Link to={createPageUrl(item.page)} className="flex items-center gap-2 text-slate-200 hover:text-white cursor-pointer">
                                                                            <item.icon className="w-4 h-4" />
                                                                            {item.name}
                                                                        </Link>
                                                                    </DropdownMenuItem>
                                                                ))}
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>

                                                        {/* More Dropdown */}
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-slate-800">
                                                                    More
                                                                    <ChevronDown className="w-3 h-3 ml-1" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent className="bg-slate-800 border-slate-700">
                                                                {moreDropdown.map((item) => (
                                                                    <DropdownMenuItem key={item.page} asChild>
                                                                        <Link to={createPageUrl(item.page)} className="flex items-center gap-2 text-slate-200 hover:text-white cursor-pointer">
                                                                            <item.icon className="w-4 h-4" />
                                                                            {item.name}
                                                                        </Link>
                                                                    </DropdownMenuItem>
                                                                ))}
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>

                        {/* Mobile Menu Button */}
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="md:hidden text-white"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        >
                            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </Button>
                    </div>
                </div>

                {/* Mobile Menu */}
                                    {mobileMenuOpen && (
                                        <div className="md:hidden bg-slate-800 border-t border-slate-700">
                                            <div className="px-4 py-3 space-y-1">
                                                {mobileNavItems.map((item) => (
                                                    <Link 
                                                        key={item.page} 
                                                        to={createPageUrl(item.page)}
                                                        onClick={() => setMobileMenuOpen(false)}
                                                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                                                            currentPageName === item.page 
                                                                ? 'bg-emerald-600 text-white' 
                                                                : 'text-slate-300 hover:bg-slate-700'
                                                        }`}
                                                    >
                                                        <item.icon className="w-5 h-5" />
                                                        {item.name}
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    )}
            </nav>

            {/* Page Content */}
            <main>
                <PageTransition>
                    {children}
                </PageTransition>
            </main>
        </div>
    );
}