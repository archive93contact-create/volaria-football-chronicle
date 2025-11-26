import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Globe, Trophy, Shield, Star, BarChart3, Menu, X, Home } from 'lucide-react';
import { Button } from "@/components/ui/button";

export default function Layout({ children, currentPageName }) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const navItems = [
        { name: 'Home', icon: Home, page: 'Home' },
        { name: 'Nations', icon: Globe, page: 'Nations' },
        { name: 'Continental Cups', icon: Star, page: 'ContinentalCompetitions' },
        { name: 'Coefficients', icon: BarChart3, page: 'CountryCoefficients' },
    ];

    return (
        <div className="min-h-screen bg-slate-50">
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
                            {navItems.map((item) => (
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
                            {navItems.map((item) => (
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
            <main>{children}</main>
        </div>
    );
}