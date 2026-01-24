import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, Target, Star, TrendingUp, Award, Shield } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function YouthSetup({ club, allLeagues = [] }) {
    const [selectedTeamId, setSelectedTeamId] = useState(null);

    // Fetch youth teams for this club
    const { data: youthTeams = [] } = useQuery({
        queryKey: ['youthTeams', club.id],
        queryFn: async () => {
            const teams = await base44.entities.Club.filter({ 
                parent_club_id: club.id,
                club_type: 'youth'
            });
            return teams || [];
        },
        enabled: !!club.id
    });

    // Fetch league tables for selected youth team
    const { data: youthSeasons = [] } = useQuery({
        queryKey: ['youthSeasons', selectedTeamId],
        queryFn: async () => {
            if (!selectedTeamId) return [];
            const tables = await base44.entities.LeagueTable.filter({ 
                club_id: selectedTeamId 
            }, '-year');
            return tables || [];
        },
        enabled: !!selectedTeamId
    });

    const selectedTeam = youthTeams.find(t => t.id === selectedTeamId);
    const selectedTeamLeague = selectedTeam ? allLeagues.find(l => l.id === selectedTeam.league_id) : null;

    // Calculate youth trophy haul across ALL youth teams
    const youthTrophyHaul = React.useMemo(() => {
        const allYouthSeasons = youthTeams.flatMap(team => 
            youthSeasons.filter(s => s.club_id === team.id)
        );
        
        const titles = allYouthSeasons.filter(s => s.status === 'champion').length;
        const titleYears = allYouthSeasons
            .filter(s => s.status === 'champion')
            .map(s => s.year)
            .sort()
            .join(', ');
        
        return { titles, titleYears };
    }, [youthTeams, youthSeasons]);

    if (!club.has_youth_academy) {
        return (
            <Card className="border-dashed border-2 border-slate-300">
                <CardContent className="flex flex-col items-center justify-center py-16">
                    <Users className="w-16 h-16 text-slate-300 mb-4" />
                    <h3 className="text-xl font-semibold text-slate-700 mb-2">No Youth Academy</h3>
                    <p className="text-slate-500">This club does not currently operate a youth academy</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Youth Academy Overview */}
            <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="w-6 h-6 text-blue-600" />
                        Youth Academy
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-3 bg-white rounded-lg">
                            <div className="text-xs text-slate-500 mb-1">Academy Rating</div>
                            <div className="flex items-center gap-1">
                                {[...Array(5)].map((_, i) => (
                                    <Star 
                                        key={i} 
                                        className={`w-4 h-4 ${i < (club.youth_academy_rating || 0) ? 'text-amber-500 fill-amber-500' : 'text-slate-300'}`} 
                                    />
                                ))}
                            </div>
                        </div>
                        <div className="p-3 bg-white rounded-lg">
                            <div className="text-xs text-slate-500 mb-1">Youth Teams</div>
                            <div className="text-2xl font-bold text-blue-600">{youthTeams.length}</div>
                        </div>
                        <div className="p-3 bg-white rounded-lg">
                            <div className="text-xs text-slate-500 mb-1">Youth Titles</div>
                            <div className="text-2xl font-bold text-amber-600">{youthTrophyHaul.titles}</div>
                        </div>
                        <div className="p-3 bg-white rounded-lg">
                            <div className="text-xs text-slate-500 mb-1">Status</div>
                            <Badge className="bg-blue-500 text-white">Active</Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Youth Trophy Haul */}
            {youthTrophyHaul.titles > 0 && (
                <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-yellow-50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Trophy className="w-6 h-6 text-amber-600" />
                            Youth Trophy Haul
                        </CardTitle>
                        <p className="text-sm text-slate-600 mt-1">Youth achievements are tracked separately from senior honours</p>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                                <div className="flex items-center gap-3">
                                    <Trophy className="w-8 h-8 text-amber-500" />
                                    <div>
                                        <div className="font-semibold text-slate-900">Youth League Titles</div>
                                        <div className="text-xs text-amber-600">{youthTrophyHaul.titleYears}</div>
                                    </div>
                                </div>
                                <div className="text-3xl font-bold text-amber-600">{youthTrophyHaul.titles}</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Youth Teams List */}
            <Card className="border-0 shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-blue-600" />
                        Youth Teams
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {youthTeams.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                            <p>No youth teams registered yet</p>
                            <p className="text-xs mt-1">Youth teams can be added to track academy development</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {youthTeams.map(team => {
                                const teamLeague = allLeagues.find(l => l.id === team.league_id);
                                const teamSeasons = youthSeasons.filter(s => s.club_id === team.id);
                                const titles = teamSeasons.filter(s => s.status === 'champion').length;
                                
                                return (
                                    <div 
                                        key={team.id} 
                                        className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            {team.logo_url ? (
                                                <img src={team.logo_url} alt={team.name} className="w-12 h-12 object-contain" />
                                            ) : (
                                                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                                    <Users className="w-6 h-6 text-blue-600" />
                                                </div>
                                            )}
                                            <div>
                                                <div className="font-semibold text-slate-900">{team.name}</div>
                                                {team.age_group && (
                                                    <Badge variant="outline" className="mt-1">{team.age_group}</Badge>
                                                )}
                                                {teamLeague && (
                                                    <div className="text-sm text-slate-600 mt-1">
                                                        League: <Link to={createPageUrl(`LeagueDetail?id=${teamLeague.id}`)} className="text-blue-600 hover:underline">{teamLeague.name}</Link>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            {titles > 0 && (
                                                <div className="flex items-center gap-2 px-3 py-1 bg-amber-100 rounded-full">
                                                    <Trophy className="w-4 h-4 text-amber-600" />
                                                    <span className="text-sm font-bold text-amber-700">{titles}</span>
                                                </div>
                                            )}
                                            <Link 
                                                to={createPageUrl(`ClubDetail?id=${team.id}`)}
                                                className="text-sm text-blue-600 hover:underline"
                                            >
                                                View Details →
                                            </Link>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Youth Team History Selector */}
            {youthTeams.length > 0 && (
                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Target className="w-5 h-5 text-emerald-600" />
                            Youth Team History
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-slate-700 mb-2 block">Select Youth Team</label>
                            <Select value={selectedTeamId || ''} onValueChange={setSelectedTeamId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Choose a youth team to view history..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {youthTeams.map(team => (
                                        <SelectItem key={team.id} value={team.id}>
                                            {team.name} {team.age_group ? `(${team.age_group})` : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {selectedTeam && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                                    <div>
                                        <div className="font-semibold text-slate-900">{selectedTeam.name}</div>
                                        {selectedTeamLeague && (
                                            <div className="text-sm text-slate-600 mt-1">
                                                Current League: <span className="font-medium">{selectedTeamLeague.name}</span>
                                            </div>
                                        )}
                                    </div>
                                    {selectedTeam.age_group && (
                                        <Badge className="bg-blue-500 text-white">{selectedTeam.age_group}</Badge>
                                    )}
                                </div>

                                {youthSeasons.length === 0 ? (
                                    <div className="text-center py-8 text-slate-500">
                                        <p>No season history available yet</p>
                                    </div>
                                ) : (
                                    <div>
                                        <h4 className="font-semibold text-slate-900 mb-3">Season History</h4>
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-slate-100">
                                                    <TableHead>Season</TableHead>
                                                    <TableHead>League</TableHead>
                                                    <TableHead className="text-center">Pos</TableHead>
                                                    <TableHead className="text-center">P</TableHead>
                                                    <TableHead className="text-center">W</TableHead>
                                                    <TableHead className="text-center">D</TableHead>
                                                    <TableHead className="text-center">L</TableHead>
                                                    <TableHead className="text-center">Pts</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {youthSeasons.map(season => {
                                                    const league = allLeagues.find(l => l.id === season.league_id);
                                                    return (
                                                        <TableRow key={season.id} style={{ backgroundColor: season.highlight_color || 'transparent' }}>
                                                            <TableCell className="font-medium">{season.year}</TableCell>
                                                            <TableCell>
                                                                {league ? (
                                                                    <Link to={createPageUrl(`LeagueDetail?id=${league.id}`)} className="hover:text-blue-600 hover:underline">
                                                                        {league.name}
                                                                    </Link>
                                                                ) : '-'}
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                <span className="flex items-center justify-center gap-1">
                                                                    {season.position}
                                                                    {season.status === 'champion' && <Trophy className="w-4 h-4 text-amber-500" />}
                                                                    {season.status === 'promoted' && <TrendingUp className="w-4 h-4 text-green-500" />}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell className="text-center">{season.played}</TableCell>
                                                            <TableCell className="text-center">{season.won}</TableCell>
                                                            <TableCell className="text-center">{season.drawn}</TableCell>
                                                            <TableCell className="text-center">{season.lost}</TableCell>
                                                            <TableCell className="text-center font-bold">{season.points}</TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}