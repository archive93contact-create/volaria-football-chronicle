import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Trophy, Calendar, ChevronRight, Star, Edit2, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import AdminOnly from '@/components/common/AdminOnly';
import { getEntityTheme } from '@/utils/entityTheme';

const yearSortDesc = (a, b) => String(b?.year || '').localeCompare(String(a?.year || ''), undefined, { numeric: true });

export default function ContinentalCompetitionCard({ competition, seasons = [], nations = [], clubs = [], onEdit, onDelete }) {
    const theme = getEntityTheme({ primary: competition.primary_color, secondary: competition.secondary_color });
    const compSeasons = seasons.filter(s => s.competition_id === competition.id).sort(yearSortDesc);
    const latestSeason = compSeasons[0];
    const participantNations = nations.filter(n =>
        competition.participating_nation_ids?.includes(n.id) ||
        (!competition.participating_nation_ids?.length && n.membership === (competition.tier === 1 ? 'VCC' : 'CCC'))
    );

    const winnerCounts = new Map();
    compSeasons.forEach(season => {
        if (!season.champion_name && !season.champion_id) return;
        const club = clubs.find(c => c.id === season.champion_id) || clubs.find(c => c.name === season.champion_name);
        const key = club?.id || `name:${season.champion_name}`;
        const current = winnerCounts.get(key) || { club, name: club?.name || season.champion_name, count: 0 };
        current.count++;
        winnerCounts.set(key, current);
    });
    const topWinners = [...winnerCounts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, 5);

    const championClub = latestSeason
        ? clubs.find(c => c.id === latestSeason.champion_id) || clubs.find(c => c.name === latestSeason.champion_name)
        : null;
    const runnerClub = latestSeason
        ? clubs.find(c => c.id === latestSeason.runner_up_id) || clubs.find(c => c.name === latestSeason.runner_up)
        : null;

    return (
        <Card className="overflow-hidden border shadow-sm bg-white" style={{ borderColor: theme.border }}>
            <div className="relative overflow-hidden bg-[#090a0b] text-white">
                <div className="absolute inset-0" style={{ background: `linear-gradient(108deg, #070809 0%, ${theme.heroPrimary}e8 52%, ${theme.heroSecondary}c9 100%)` }} />
                <div className="absolute inset-0 bg-gradient-to-r from-black/45 via-black/10 to-black/35" />
                {competition.logo_url && (
                    <img src={competition.logo_url} alt="" aria-hidden="true" className="pointer-events-none absolute -right-14 -bottom-24 w-80 h-80 object-contain opacity-[0.09] grayscale" />
                )}

                <div className="relative p-5 sm:p-7">
                    <div className="flex items-start gap-5 sm:gap-7">
                        <div className="relative w-20 h-20 sm:w-28 sm:h-28 shrink-0 flex items-center justify-center">
                            <div className="absolute inset-[10%] rounded-full blur-2xl opacity-45" style={{ backgroundColor: competition.secondary_color || competition.primary_color || '#fff' }} />
                            {competition.logo_url ? (
                                <img src={competition.logo_url} alt={`${competition.name} logo`} className="relative z-10 max-w-full max-h-full object-contain drop-shadow-[0_14px_20px_rgba(0,0,0,.55)]" />
                            ) : (
                                <div className="relative z-10 w-full h-full rounded-full border border-white/15 bg-black/20 flex items-center justify-center">
                                    {competition.tier === 1 ? <Star className="w-10 h-10 text-white/55" /> : <Trophy className="w-10 h-10 text-white/55" />}
                                </div>
                            )}
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                {competition.short_name && <Badge className="bg-white/10 border border-white/15 text-white">{competition.short_name}</Badge>}
                                <span className="text-[10px] uppercase tracking-[0.16em] font-bold text-white/55">
                                    {competition.tier === 1 ? 'Premier continental competition' : competition.tier === 2 ? 'Secondary continental competition' : `Continental tier ${competition.tier || '—'}`}
                                </span>
                            </div>
                            <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">{competition.name}</h2>
                            {competition.description && <p className="mt-2 text-sm sm:text-base text-white/68 max-w-3xl leading-relaxed line-clamp-2">{competition.description}</p>}
                        </div>

                        <AdminOnly>
                            <div className="flex gap-1 shrink-0">
                                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white" onClick={() => onEdit?.(competition)}><Edit2 className="w-4 h-4" /></Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-white hover:bg-red-500/15 hover:text-white"><Trash2 className="w-4 h-4" /></Button></AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader><AlertDialogTitle>Delete {competition.name}?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => onDelete?.(competition.id)} className="bg-red-600">Delete</AlertDialogAction></AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </AdminOnly>
                    </div>

                    <div className="mt-6 grid grid-cols-4 border border-white/12 rounded-xl overflow-hidden bg-black/18 backdrop-blur-sm">
                        <div className="px-3 py-3 border-r border-white/10"><div className="text-lg sm:text-2xl font-black">{competition.founded_year || '—'}</div><div className="text-[9px] uppercase tracking-wider text-white/45">Founded</div></div>
                        <div className="px-3 py-3 border-r border-white/10"><div className="text-lg sm:text-2xl font-black">{compSeasons.length}</div><div className="text-[9px] uppercase tracking-wider text-white/45">Editions</div></div>
                        <div className="px-3 py-3 border-r border-white/10"><div className="text-lg sm:text-2xl font-black">{participantNations.length}</div><div className="text-[9px] uppercase tracking-wider text-white/45">Nations</div></div>
                        <div className="px-3 py-3"><div className="text-lg sm:text-2xl font-black">{competition.number_of_teams || '—'}</div><div className="text-[9px] uppercase tracking-wider text-white/45">Teams</div></div>
                    </div>

                    {participantNations.length > 0 && (
                        <div className="mt-5 flex flex-wrap gap-2">
                            {participantNations.slice(0, 18).map(nation => nation.flag_url ? (
                                <Link key={nation.id} to={createPageUrl(`NationDetail?id=${nation.id}`)} title={nation.name} className="w-8 h-6 flex items-center justify-center rounded border border-white/15 bg-black/15 p-0.5 hover:border-white/45 transition-colors">
                                    <img src={nation.flag_url} alt={`${nation.name} flag`} className="max-w-full max-h-full object-contain" />
                                </Link>
                            ) : null)}
                            {participantNations.length > 18 && <span className="text-xs text-white/55 self-center">+{participantNations.length - 18}</span>}
                        </div>
                    )}
                </div>
                <div className="h-1.5 flex"><div className="flex-[3]" style={{ backgroundColor: theme.primary }} /><div className="flex-[2]" style={{ backgroundColor: theme.secondary }} /></div>
            </div>

            <CardContent className="p-0" style={{ background: `linear-gradient(135deg, ${theme.tint}, #fff 35%)` }}>
                <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] divide-y lg:divide-y-0 lg:divide-x divide-slate-200/80">
                    <div className="p-5 sm:p-6">
                        <div className="flex items-center gap-2 mb-4 text-slate-500"><Calendar className="w-4 h-4" /><span className="text-[10px] uppercase tracking-[0.14em] font-black">Latest final</span></div>
                        {latestSeason ? (
                            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-5">
                                <div className="min-w-0 text-center">
                                    {championClub?.logo_url && <img src={championClub.logo_url} alt={`${championClub.name} crest`} className="w-12 h-12 object-contain mx-auto mb-2" />}
                                    {championClub ? <Link to={createPageUrl(`ClubDetail?id=${championClub.id}`)} className="font-black text-slate-900 hover:underline block truncate">{championClub.name}</Link> : <div className="font-black text-slate-900 truncate">{latestSeason.champion_name || '—'}</div>}
                                    <div className="text-xs text-slate-500 truncate">{latestSeason.champion_nation}</div>
                                    <Badge className="mt-2 text-white" style={{ backgroundColor: theme.ui }}>Champion</Badge>
                                </div>
                                <div className="text-center">
                                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">{latestSeason.year}</div>
                                    <div className="text-xl sm:text-2xl font-black text-slate-800 mt-1">{latestSeason.final_score || 'vs'}</div>
                                    {latestSeason.final_venue && <div className="mt-1 text-[10px] text-slate-400 max-w-28 line-clamp-2">{latestSeason.final_venue}</div>}
                                </div>
                                <div className="min-w-0 text-center">
                                    {runnerClub?.logo_url && <img src={runnerClub.logo_url} alt={`${runnerClub.name} crest`} className="w-12 h-12 object-contain mx-auto mb-2" />}
                                    {runnerClub ? <Link to={createPageUrl(`ClubDetail?id=${runnerClub.id}`)} className="font-bold text-slate-700 hover:underline block truncate">{runnerClub.name}</Link> : <div className="font-bold text-slate-700 truncate">{latestSeason.runner_up || '—'}</div>}
                                    <div className="text-xs text-slate-500 truncate">{latestSeason.runner_up_nation}</div>
                                </div>
                            </div>
                        ) : <p className="text-sm text-slate-500">No completed edition recorded yet.</p>}
                    </div>

                    <div className="p-5 sm:p-6">
                        <div className="flex items-center gap-2 mb-4 text-slate-500"><Trophy className="w-4 h-4" /><span className="text-[10px] uppercase tracking-[0.14em] font-black">Title leaders</span></div>
                        {topWinners.length ? (
                            <div className="space-y-2.5">
                                {topWinners.map((winner, index) => (
                                    <Link key={`${winner.name}-${index}`} to={winner.club ? createPageUrl(`ClubDetail?id=${winner.club.id}`) : '#'} className="flex items-center gap-3 group">
                                        <span className="w-6 text-xs font-black text-slate-400">{index + 1}</span>
                                        {winner.club?.logo_url ? <img src={winner.club.logo_url} alt="" className="w-7 h-7 object-contain shrink-0" /> : <span className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.tintStrong }}><Trophy className="w-3.5 h-3.5" style={{ color: theme.ui }} /></span>}
                                        <span className="flex-1 min-w-0 truncate text-sm font-semibold text-slate-700 group-hover:text-slate-950">{winner.name}</span>
                                        <span className="font-black" style={{ color: theme.ui }}>{winner.count}</span>
                                    </Link>
                                ))}
                            </div>
                        ) : <p className="text-sm text-slate-500">No champions recorded yet.</p>}
                    </div>
                </div>

                <div className="border-t border-slate-200/80 p-4 sm:px-6 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                        {competition.format && <div className="text-xs text-slate-500 truncate">{competition.format}</div>}
                    </div>
                    <Link to={createPageUrl(`CompetitionDetail?id=${competition.id}`)}>
                        <Button className="text-white" style={{ backgroundColor: theme.ui }}>View competition <ChevronRight className="w-4 h-4 ml-1" /></Button>
                    </Link>
                </div>
            </CardContent>
        </Card>
    );
}
