import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { MapPin, Calendar, Users, Shield, Trophy, Swords } from 'lucide-react';

export default function ClubDNA({ club, league, nation, allClubs = [] }) {
    const rivals = (club.rival_club_ids || [])
        .map(id => allClubs.find(c => c.id === id))
        .filter(Boolean)
        .slice(0, 4);

    const items = [
        club.founded_year && { icon: Calendar, label: 'Founded', value: club.founded_year, color: 'text-amber-400' },
        (club.settlement || club.city) && { icon: MapPin, label: 'Home', value: club.settlement || club.city, color: 'text-blue-400' },
        club.stadium && { icon: Shield, label: 'Ground', value: club.stadium, sub: club.stadium_capacity ? `Cap. ${club.stadium_capacity.toLocaleString()}` : null, color: 'text-emerald-400' },
        league && { icon: Trophy, label: 'League', value: league.name, link: createPageUrl(`LeagueDetail?id=${league.id}`), color: 'text-purple-400' },
        club.manager && { icon: Users, label: 'Manager', value: club.manager, color: 'text-rose-400' },
    ].filter(Boolean);

    if (items.length === 0 && rivals.length === 0) return null;

    return (
        <div
            className="mx-4 sm:mx-6 lg:mx-8 -mt-6 mb-6 rounded-2xl shadow-xl overflow-hidden relative z-10"
            style={{
                background: club.primary_color
                    ? `linear-gradient(135deg, ${club.primary_color}20, ${club.secondary_color || club.primary_color}15)`
                    : 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(12px)',
                border: club.accent_color ? `1px solid ${club.accent_color}30` : '1px solid rgba(255,255,255,0.3)',
            }}
        >
            <div
                className="h-1 w-full"
                style={{ background: club.accent_color || club.primary_color || '#10b981' }}
            />
            <div className="p-4 md:p-6">
                <div className="flex flex-wrap gap-4 md:gap-8">
                    {items.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-2 min-w-0">
                            <item.icon className={`w-4 h-4 mt-0.5 shrink-0 ${item.color}`} />
                            <div>
                                <div className="text-xs text-slate-500 font-medium">{item.label}</div>
                                {item.link ? (
                                    <Link to={item.link} className="text-sm font-bold text-slate-800 hover:text-emerald-600 transition-colors">
                                        {item.value}
                                    </Link>
                                ) : (
                                    <div className="text-sm font-bold text-slate-800">{item.value}</div>
                                )}
                                {item.sub && <div className="text-xs text-slate-500">{item.sub}</div>}
                            </div>
                        </div>
                    ))}

                    {rivals.length > 0 && (
                        <div className="flex items-start gap-2">
                            <Swords className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
                            <div>
                                <div className="text-xs text-slate-500 font-medium">Rivals</div>
                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                    {rivals.map(r => (
                                        <Link key={r.id} to={createPageUrl(`ClubDetail?id=${r.id}`)} className="flex items-center gap-1 hover:opacity-80 transition-opacity">
                                            {r.logo_url && <img src={r.logo_url} alt={r.name} className="w-5 h-5 object-contain bg-white rounded" />}
                                            <span className="text-xs font-semibold text-slate-700">{r.shortened_name || r.name}</span>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}