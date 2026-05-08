import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Shield, Trophy } from 'lucide-react';

export default function LeagueCrestBanner({ league, clubs, currentSeasonTable }) {
    // Get clubs in current season, ordered by position
    const orderedClubs = currentSeasonTable
        .sort((a, b) => a.position - b.position)
        .map(row => {
            const club = clubs.find(c => c.id === row.club_id);
            return club ? { ...club, position: row.position, status: row.status } : null;
        })
        .filter(Boolean);

    // Fall back to all clubs if no season table
    const displayClubs = orderedClubs.length > 0 ? orderedClubs : clubs;

    const primary = league.primary_color || '#1e3a5f';
    const secondary = league.secondary_color || '#0f2440';
    const accent = league.accent_color || '#f59e0b';

    return (
        <div
            className="relative w-full overflow-hidden rounded-2xl"
            style={{
                background: `radial-gradient(ellipse at 30% 50%, ${primary}ee, ${secondary}dd 60%, #0a0a1a)`,
                minHeight: '340px',
            }}
        >
            {/* Decorative background pattern */}
            <div
                className="absolute inset-0 opacity-5"
                style={{
                    backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                    backgroundSize: '40px 40px',
                }}
            />

            {/* Subtle vignette */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />

            {/* League name watermark */}
            <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden"
                aria-hidden
            >
                <span
                    className="text-white/5 font-black uppercase text-center leading-none"
                    style={{
                        fontSize: 'clamp(4rem, 12vw, 10rem)',
                        letterSpacing: '-0.02em',
                    }}
                >
                    {league.name}
                </span>
            </div>

            {/* Content */}
            <div className="relative z-10 p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        {league.logo_url ? (
                            <img
                                src={league.logo_url}
                                alt={league.name}
                                className="w-14 h-14 object-contain bg-white/10 rounded-xl p-2"
                            />
                        ) : (
                            <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center">
                                <Trophy className="w-7 h-7 text-white/60" />
                            </div>
                        )}
                        <div>
                            <h2
                                className="text-2xl font-bold text-white"
                                style={{ fontFamily: league.text_style === 'classic' ? 'Georgia, serif' : undefined }}
                            >
                                {league.name}
                            </h2>
                            <p className="text-white/60 text-sm">
                                {orderedClubs.length > 0
                                    ? `${orderedClubs.length} clubs`
                                    : `${displayClubs.length} clubs`}
                                {league.founded_year && ` · Est. ${league.founded_year}`}
                            </p>
                        </div>
                    </div>
                    {league.current_champion && (
                        <div
                            className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl border"
                            style={{ borderColor: `${accent}60`, backgroundColor: `${accent}20` }}
                        >
                            <Trophy className="w-4 h-4" style={{ color: accent }} />
                            <span className="text-white font-semibold text-sm">{league.current_champion}</span>
                        </div>
                    )}
                </div>

                {/* Crest Grid */}
                <div className="flex flex-wrap gap-5 justify-center">
                    {displayClubs.map((club) => {
                        const isChampion = club.position === 1 || club.status === 'champion';
                        return (
                            <Link
                                key={club.id}
                                to={createPageUrl(`ClubDetail?id=${club.id}`)}
                                className="group flex flex-col items-center gap-2"
                                title={club.name}
                            >
                                <div
                                    className="relative flex items-center justify-center rounded-2xl transition-all duration-300 group-hover:scale-110 group-hover:shadow-2xl"
                                    style={{
                                        width: isChampion ? '110px' : '88px',
                                        height: isChampion ? '110px' : '88px',
                                        backgroundColor: 'white',
                                        padding: isChampion ? '10px' : '8px',
                                        boxShadow: isChampion
                                            ? `0 0 0 3px ${accent}, 0 8px 24px rgba(0,0,0,0.5)`
                                            : '0 4px 16px rgba(0,0,0,0.4)',
                                    }}
                                >
                                    {club.logo_url ? (
                                        <img
                                            src={club.logo_url}
                                            alt={club.name}
                                            className="w-full h-full object-contain"
                                        />
                                    ) : (
                                        <Shield className="w-10 h-10 text-slate-300" />
                                    )}
                                    {isChampion && (
                                        <div
                                            className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center shadow-lg"
                                            style={{ backgroundColor: accent }}
                                        >
                                            <Trophy className="w-4 h-4 text-white" />
                                        </div>
                                    )}
                                </div>
                                <span className="text-white/80 text-xs text-center font-medium max-w-[96px] line-clamp-2 group-hover:text-white transition-colors leading-tight">
                                    {club.shortened_name || club.name}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}