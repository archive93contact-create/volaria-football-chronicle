import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';
import { Search, Globe, Shield, Users, Trophy, MapPin, X } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export default function GlobalSearch() {
    const [query, setQuery] = useState('');
    const [showResults, setShowResults] = useState(false);
    const navigate = useNavigate();

    const { data: nations = [] } = useQuery({
        queryKey: ['nations'],
        queryFn: () => base44.entities.Nation.list(),
    });

    const { data: clubs = [] } = useQuery({
        queryKey: ['clubs'],
        queryFn: () => base44.entities.Club.list(),
    });

    const { data: players = [] } = useQuery({
        queryKey: ['players'],
        queryFn: () => base44.entities.Player.list('-overall_rating', 500),
    });

    const { data: leagues = [] } = useQuery({
        queryKey: ['leagues'],
        queryFn: () => base44.entities.League.list(),
    });

    // Filter results based on query
    const results = React.useMemo(() => {
        if (!query || query.length < 2) return { nations: [], clubs: [], players: [], leagues: [], pages: [] };

        const q = query.toLowerCase();

        // Static pages
        const pages = [
            { name: 'World Map', url: createPageUrl('WorldMap'), icon: MapPin },
            { name: 'Nations', url: createPageUrl('Nations'), icon: Globe },
            { name: 'Clubs', url: createPageUrl('AllClubs'), icon: Shield },
            { name: 'Players', url: createPageUrl('Players'), icon: Users },
            { name: 'Seasons', url: createPageUrl('Seasons'), icon: Trophy },
            { name: 'Continental', url: createPageUrl('ContinentalCompetitions'), icon: Trophy },
            { name: 'Coefficients', url: createPageUrl('Coefficients'), icon: Trophy },
        ].filter(p => p.name.toLowerCase().includes(q));

        return {
            nations: nations.filter(n => n.name?.toLowerCase().includes(q)).slice(0, 5),
            clubs: clubs.filter(c => c.name?.toLowerCase().includes(q)).slice(0, 5),
            players: players.filter(p => p.full_name?.toLowerCase().includes(q) || p.last_name?.toLowerCase().includes(q)).slice(0, 5),
            leagues: leagues.filter(l => l.name?.toLowerCase().includes(q)).slice(0, 5),
            pages: pages.slice(0, 3),
        };
    }, [query, nations, clubs, players, leagues]);

    const hasResults = results.nations.length > 0 || results.clubs.length > 0 || 
                      results.players.length > 0 || results.leagues.length > 0 || 
                      results.pages.length > 0;

    const handleSelect = (url) => {
        navigate(url);
        setQuery('');
        setShowResults(false);
    };

    const clearSearch = () => {
        setQuery('');
        setShowResults(false);
    };

    // Close results when clicking outside
    useEffect(() => {
        const handleClick = (e) => {
            if (!e.target.closest('.global-search-container')) {
                setShowResults(false);
            }
        };
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, []);

    return (
        <div className="global-search-container relative w-full max-w-2xl">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                    type="text"
                    placeholder="Search nations, clubs, players, leagues, pages..."
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setShowResults(true);
                    }}
                    onFocus={() => setShowResults(true)}
                    className="pl-10 pr-10 py-6 text-lg border-2 border-slate-200 focus:border-emerald-500 rounded-xl shadow-sm"
                />
                {query && (
                    <button
                        onClick={clearSearch}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Results Dropdown */}
            {showResults && query.length >= 2 && (
                <Card className="absolute top-full mt-2 w-full max-h-[500px] overflow-y-auto z-50 shadow-xl border-2 border-slate-200">
                    {!hasResults ? (
                        <div className="p-6 text-center text-slate-500">
                            No results found for "{query}"
                        </div>
                    ) : (
                        <div className="py-2">
                            {/* Pages */}
                            {results.pages.length > 0 && (
                                <div className="mb-2">
                                    <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Pages</div>
                                    {results.pages.map((page, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleSelect(page.url)}
                                            className="w-full px-4 py-3 hover:bg-slate-100 flex items-center gap-3 text-left transition-colors"
                                        >
                                            <page.icon className="w-5 h-5 text-slate-400" />
                                            <span className="font-medium">{page.name}</span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Nations */}
                            {results.nations.length > 0 && (
                                <div className="mb-2">
                                    <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Nations</div>
                                    {results.nations.map(nation => (
                                        <button
                                            key={nation.id}
                                            onClick={() => handleSelect(createPageUrl(`NationDetail?id=${nation.id}`))}
                                            className="w-full px-4 py-3 hover:bg-slate-100 flex items-center gap-3 text-left transition-colors"
                                        >
                                            {nation.flag_url ? (
                                                <img src={nation.flag_url} alt={nation.name} className="w-8 h-6 object-cover rounded border" />
                                            ) : (
                                                <Globe className="w-5 h-5 text-slate-400" />
                                            )}
                                            <div>
                                                <div className="font-medium">{nation.name}</div>
                                                <div className="text-xs text-slate-500">{nation.region}</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Clubs */}
                            {results.clubs.length > 0 && (
                                <div className="mb-2">
                                    <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Clubs</div>
                                    {results.clubs.map(club => (
                                        <button
                                            key={club.id}
                                            onClick={() => handleSelect(createPageUrl(`ClubDetail?id=${club.id}`))}
                                            className="w-full px-4 py-3 hover:bg-slate-100 flex items-center gap-3 text-left transition-colors"
                                        >
                                            {club.logo_url ? (
                                                <img src={club.logo_url} alt={club.name} className="w-8 h-8 object-contain bg-white rounded border" />
                                            ) : (
                                                <Shield className="w-5 h-5 text-slate-400" />
                                            )}
                                            <div>
                                                <div className="font-medium">{club.name}</div>
                                                <div className="text-xs text-slate-500">{club.city || club.settlement}</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Players */}
                            {results.players.length > 0 && (
                                <div className="mb-2">
                                    <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Players</div>
                                    {results.players.map(player => (
                                        <button
                                            key={player.id}
                                            onClick={() => handleSelect(createPageUrl(`PlayerDetail?id=${player.id}`))}
                                            className="w-full px-4 py-3 hover:bg-slate-100 flex items-center gap-3 text-left transition-colors"
                                        >
                                            {player.photo_url ? (
                                                <img src={player.photo_url} alt={player.full_name} className="w-8 h-8 object-cover rounded-full" />
                                            ) : (
                                                <Users className="w-5 h-5 text-slate-400" />
                                            )}
                                            <div>
                                                <div className="font-medium">{player.full_name}</div>
                                                <div className="text-xs text-slate-500">{player.position} • OVR {player.overall_rating}</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Leagues */}
                            {results.leagues.length > 0 && (
                                <div>
                                    <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Leagues</div>
                                    {results.leagues.map(league => (
                                        <button
                                            key={league.id}
                                            onClick={() => handleSelect(createPageUrl(`LeagueDetail?id=${league.id}`))}
                                            className="w-full px-4 py-3 hover:bg-slate-100 flex items-center gap-3 text-left transition-colors"
                                        >
                                            <Trophy className="w-5 h-5 text-slate-400" />
                                            <div>
                                                <div className="font-medium">{league.name}</div>
                                                <div className="text-xs text-slate-500">Tier {league.tier}</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </Card>
            )}
        </div>
    );
}