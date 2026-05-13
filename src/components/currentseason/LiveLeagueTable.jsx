import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Trophy, Shield, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const STATUS_COLORS = {
    champion: '#fef3c7',
    promoted: '#d1fae5',
    playoff: '#dbeafe',
    relegated: '#fee2e2',
    european: '#ede9fe',
};

export default function LiveLeagueTable({ league, nation, season, tableEntries, clubs, matches }) {
    const [expanded, setExpanded] = useState(true);

    const recentMatches = matches
        .filter(m => m.home_score !== null && m.home_score !== undefined)
        .slice(-5)
        .reverse();

    return (
        <Card className="border-0 shadow-md overflow-hidden">
            {/* Header */}
            <div
                className="p-4 cursor-pointer flex items-center justify-between"
                style={{ background: league.primary_color ? `linear-gradient(135deg, ${league.primary_color}22, ${league.secondary_color || league.primary_color}11)` : 'linear-gradient(135deg, #f8fafc, #f1f5f9)' }}
                onClick={() => setExpanded(e => !e)}
            >
                <div className="flex items-center gap-3">
                    {league.logo_url ? (
                        <img src={league.logo_url} alt={league.name} className="w-9 h-9 object-contain bg-white rounded p-0.5 shadow-sm" />
                    ) : (
                        <div className="w-9 h-9 rounded bg-slate-200 flex items-center justify-center">
                            <Trophy className="w-5 h-5 text-slate-400" />
                        </div>
                    )}
                    <div>
                        <div className="flex items-center gap-2">
                            <Link
                                to={createPageUrl(`LeagueDetail?id=${league.id}`)}
                                className="font-bold text-slate-800 hover:text-emerald-600 transition-colors"
                                onClick={e => e.stopPropagation()}
                            >
                                {league.name}
                            </Link>
                            {nation && (
                                <span className="flex items-center gap-1 text-xs text-slate-500">
                                    {nation.flag_url && <img src={nation.flag_url} alt={nation.name} className="w-4 h-3 object-cover rounded" />}
                                    {nation.name}
                                </span>
                            )}
                        </div>
                        <div className="text-xs text-slate-500">
                            {season?.year} season
                            {season?.champion_name && ` · Defending: ${season.champion_name}`}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{tableEntries.length} clubs</Badge>
                    {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
            </div>

            {expanded && (
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50 text-xs">
                                <TableHead className="w-8 py-2">#</TableHead>
                                <TableHead className="py-2">Club</TableHead>
                                <TableHead className="text-center py-2">P</TableHead>
                                <TableHead className="text-center py-2">W</TableHead>
                                <TableHead className="text-center py-2">D</TableHead>
                                <TableHead className="text-center py-2">L</TableHead>
                                <TableHead className="text-center py-2 hidden sm:table-cell">GD</TableHead>
                                <TableHead className="text-center py-2 font-bold">Pts</TableHead>
                                <TableHead className="text-center py-2 hidden lg:table-cell">Form</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {tableEntries.map((row) => {
                                const club = clubs.find(c => c.id === row.club_id);
                                const bgColor = row.highlight_color || STATUS_COLORS[row.status] || 'transparent';
                                // Calculate form from matches
                                const clubMatches = matches
                                    .filter(m => (m.home_club_id === row.club_id || m.away_club_id === row.club_id) && m.home_score !== null)
                                    .slice(-5);
                                const form = clubMatches.map(m => {
                                    const isHome = m.home_club_id === row.club_id;
                                    const scored = isHome ? m.home_score : m.away_score;
                                    const conceded = isHome ? m.away_score : m.home_score;
                                    if (scored > conceded) return 'W';
                                    if (scored === conceded) return 'D';
                                    return 'L';
                                });

                                return (
                                    <TableRow key={row.id} style={{ backgroundColor: bgColor }} className="text-sm">
                                        <TableCell className="py-2 font-bold text-slate-600">
                                            <span className="flex items-center gap-1">
                                                {row.position}
                                                {row.status === 'champion' && <Trophy className="w-3 h-3 text-amber-500" />}
                                            </span>
                                        </TableCell>
                                        <TableCell className="py-2">
                                            <div className="flex items-center gap-2">
                                                {club?.logo_url ? (
                                                    <img src={club.logo_url} alt={row.club_name} className="w-5 h-5 object-contain" />
                                                ) : (
                                                    <Shield className="w-4 h-4 text-slate-300" />
                                                )}
                                                {row.club_id ? (
                                                    <Link to={createPageUrl(`ClubDetail?id=${row.club_id}`)} className="font-medium hover:text-emerald-600 truncate max-w-[120px]">
                                                        {club?.shortened_name || row.club_name}
                                                    </Link>
                                                ) : (
                                                    <span className="font-medium truncate max-w-[120px]">{club?.shortened_name || row.club_name}</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center py-2">{row.played || 0}</TableCell>
                                        <TableCell className="text-center py-2">{row.won || 0}</TableCell>
                                        <TableCell className="text-center py-2">{row.drawn || 0}</TableCell>
                                        <TableCell className="text-center py-2">{row.lost || 0}</TableCell>
                                        <TableCell className="text-center py-2 hidden sm:table-cell text-slate-600">
                                            {row.goal_difference > 0 ? `+${row.goal_difference}` : row.goal_difference}
                                        </TableCell>
                                        <TableCell className="text-center py-2 font-bold">{row.points || 0}</TableCell>
                                        <TableCell className="text-center py-2 hidden lg:table-cell">
                                            <div className="flex gap-0.5 justify-center">
                                                {form.map((r, i) => (
                                                    <span key={i} className={`w-5 h-5 flex items-center justify-center rounded text-xs font-bold text-white ${r === 'W' ? 'bg-emerald-500' : r === 'D' ? 'bg-slate-400' : 'bg-red-500'}`}>
                                                        {r}
                                                    </span>
                                                ))}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>

                    <div className="p-3 flex justify-between items-center border-t bg-slate-50">
                        <div className="flex gap-3 text-xs text-slate-500">
                            {tableEntries.some(t => t.status === 'champion') && <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: STATUS_COLORS.champion }} />Champion</span>}
                            {tableEntries.some(t => t.status === 'promoted') && <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: STATUS_COLORS.promoted }} />Promoted</span>}
                            {tableEntries.some(t => t.status === 'playoff') && <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: STATUS_COLORS.playoff }} />Playoff</span>}
                            {tableEntries.some(t => t.status === 'relegated') && <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: STATUS_COLORS.relegated }} />Relegated</span>}
                        </div>
                        <Link to={createPageUrl(`LeagueDetail?id=${league.id}`)} className="text-xs text-emerald-600 hover:underline flex items-center gap-1">
                            Full details <ChevronRight className="w-3 h-3" />
                        </Link>
                    </div>
                </CardContent>
            )}
        </Card>
    );
}