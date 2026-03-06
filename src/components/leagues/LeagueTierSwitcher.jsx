import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ChevronDown, ChevronUp, Layers } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

export default function LeagueTierSwitcher({ currentLeagueId, allLeagues = [] }) {
    const [showSidebar, setShowSidebar] = useState(false);

    const professionalLeagues = allLeagues
        .filter(l => l.league_type !== 'youth' && l.league_type !== 'reserve')
        .sort((a, b) => (a.tier || 99) - (b.tier || 99));

    if (professionalLeagues.length <= 1) return null;

    const tierGroups = professionalLeagues.reduce((acc, league) => {
        const tier = league.tier || 99;
        if (!acc[tier]) acc[tier] = [];
        acc[tier].push(league);
        return acc;
    }, {});

    const currentLeague = professionalLeagues.find(l => l.id === currentLeagueId);
    const currentTier = currentLeague?.tier;

    return (
        <div className="bg-slate-900 border-b border-slate-700">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Tier Switcher Bar */}
                <div className="flex items-center gap-2 py-2 overflow-x-auto scrollbar-hide">
                    <span className="text-slate-400 text-xs font-medium whitespace-nowrap flex items-center gap-1 mr-2">
                        <Layers className="w-3 h-3" /> Tiers:
                    </span>
                    {Object.entries(tierGroups).map(([tier, leagues]) => {
                        const tierNum = parseInt(tier);
                        const isCurrentTier = tierNum === currentTier;
                        const isSingleLeague = leagues.length === 1;

                        if (isSingleLeague) {
                            return (
                                <Link
                                    key={tier}
                                    to={createPageUrl(`LeagueDetail?id=${leagues[0].id}`)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                                        isCurrentTier
                                            ? 'bg-emerald-500 text-white'
                                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'
                                    }`}
                                >
                                    <span className="opacity-60">T{tierNum}</span>
                                    <span>{leagues[0].name}</span>
                                </Link>
                            );
                        }

                        // Multiple leagues at same tier — show grouped
                        return (
                            <div key={tier} className="relative group">
                                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer ${
                                    isCurrentTier
                                        ? 'bg-emerald-500 text-white'
                                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'
                                }`}>
                                    <span className="opacity-60">T{tierNum}</span>
                                    <span>Tier {tierNum} ({leagues.length})</span>
                                    <ChevronDown className="w-3 h-3" />
                                </div>
                                <div className="absolute top-full left-0 mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-50 min-w-48 hidden group-hover:block">
                                    {leagues.map(l => (
                                        <Link
                                            key={l.id}
                                            to={createPageUrl(`LeagueDetail?id=${l.id}`)}
                                            className={`block px-3 py-2 text-xs hover:bg-slate-700 transition-colors ${l.id === currentLeagueId ? 'text-emerald-400 font-semibold' : 'text-slate-300'}`}
                                        >
                                            {l.name}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        );
                    })}

                    {/* Sidebar Toggle */}
                    <button
                        onClick={() => setShowSidebar(!showSidebar)}
                        className="ml-auto flex items-center gap-1 text-slate-400 hover:text-white text-xs px-2 py-1 rounded transition-colors whitespace-nowrap"
                    >
                        {showSidebar ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        Full Pyramid
                    </button>
                </div>

                {/* Expandable Pyramid Panel */}
                {showSidebar && (
                    <div className="py-4 border-t border-slate-700 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {Object.entries(tierGroups).map(([tier, leagues]) => (
                            <div key={tier}>
                                <div className="text-xs text-slate-500 font-semibold mb-2 uppercase tracking-wide">
                                    {parseInt(tier) === 1 ? '🏆 Top Flight' : parseInt(tier) === 2 ? '🥈 Second Tier' : `Tier ${tier}`}
                                </div>
                                <div className="space-y-1">
                                    {leagues.map(l => (
                                        <Link
                                            key={l.id}
                                            to={createPageUrl(`LeagueDetail?id=${l.id}`)}
                                            className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${
                                                l.id === currentLeagueId
                                                    ? 'bg-emerald-600 text-white'
                                                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                {l.logo_url && <img src={l.logo_url} alt="" className="w-4 h-4 object-contain bg-white rounded" />}
                                                <span className="font-medium">{l.name}</span>
                                            </div>
                                            {l.current_champion && (
                                                <span className="text-xs opacity-70 truncate max-w-24">🏆 {l.current_champion}</span>
                                            )}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}