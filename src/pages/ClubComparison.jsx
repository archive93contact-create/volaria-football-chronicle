import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Shield, Plus, X, Trophy, Target, TrendingUp, BarChart3 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import PageHeader from '@/components/common/PageHeader';
import ClubComparisonChart from '@/components/clubs/ClubComparisonChart';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function ClubComparison() {
    const [selectedClubIds, setSelectedClubIds] = useState([]);
    
    const { data: clubs = [] } = useQuery({
        queryKey: ['allClubs'],
        queryFn: () => base44.entities.Club.list('name'),
    });

    const { data: nations = [] } = useQuery({
        queryKey: ['nations'],
        queryFn: () => base44.entities.Nation.list(),
    });

    const { data: leagues = [] } = useQuery({
        queryKey: ['leagues'],
        queryFn: () => base44.entities.League.list(),
    });

    const { data: leagueTables = [] } = useQuery({
        queryKey: ['allLeagueTables'],
        queryFn: () => base44.entities.LeagueTable.list(),
    });

    const selectedClubs = selectedClubIds.map(id => clubs.find(c => c.id === id)).filter(Boolean);
    
    const addClub = (clubId) => {
        if (clubId && !selectedClubIds.includes(clubId) && selectedClubIds.length < 6) {
            setSelectedClubIds([...selectedClubIds, clubId]);
        }
    };

    const removeClub = (clubId) => {
        setSelectedClubIds(selectedClubIds.filter(id => id !== clubId));
    };

    const getNation = (nationId) => nations.find(n => n.id === nationId);
    const getLeague = (leagueId) => leagues.find(l => l.id === leagueId);

    const getClubSeasons = (clubId) => {
        const club = clubs.find(c => c.id === clubId);
        let seasons = leagueTables.filter(t => t.club_id === clubId);
        
        // Include predecessor data
        if (club?.predecessor_club_id) {
            seasons = [...seasons, ...leagueTables.filter(t => t.club_id === club.predecessor_club_id)];
        }
        if (club?.predecessor_club_2_id) {
            seasons = [...seasons, ...leagueTables.filter(t => t.club_id === club.predecessor_club_2_id)];
        }
        
        return seasons.sort((a, b) => a.year.localeCompare(b.year));
    };

    const availableClubs = clubs.filter(c => !selectedClubIds.includes(c.id) && !c.is_defunct);

    return (
        <div className="min-h-screen bg-slate-50">
            <PageHeader 
                title="Club Comparison"
                subtitle="Compare historical performance of multiple clubs side-by-side"
                breadcrumbs={[{ label: 'Club Comparison' }]}
            />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                {/* Club Selection */}
                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="w-5 h-5 text-emerald-600" />
                            Select Clubs to Compare (up to 6)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-3 mb-4">
                            {selectedClubs.map((club, idx) => {
                                const nation = getNation(club.nation_id);
                                return (
                                    <div 
                                        key={club.id} 
                                        className="flex items-center gap-2 px-3 py-2 rounded-lg border-2"
                                        style={{ borderColor: COLORS[idx] }}
                                    >
                                        {club.logo_url ? (
                                            <img src={club.logo_url} alt={club.name} className="w-6 h-6 object-contain" />
                                        ) : (
                                            <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center">
                                                <Shield className="w-3 h-3 text-slate-400" />
                                            </div>
                                        )}
                                        <span className="font-medium">{club.name}</span>
                                        {nation?.flag_url && (
                                            <img src={nation.flag_url} alt={nation.name} className="w-5 h-3 object-contain" />
                                        )}
                                        <button onClick={() => removeClub(club.id)} className="ml-1 text-slate-400 hover:text-red-500">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                );
                            })}
                            
                            {selectedClubIds.length < 6 && (
                                <Select onValueChange={addClub}>
                                    <SelectTrigger className="w-64">
                                        <SelectValue placeholder="Add a club..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableClubs.map(club => {
                                            const nation = getNation(club.nation_id);
                                            return (
                                                <SelectItem key={club.id} value={club.id}>
                                                    <span className="flex items-center gap-2">
                                                        {club.name}
                                                        {nation && <span className="text-slate-400 text-xs">({nation.name})</span>}
                                                    </span>
                                                </SelectItem>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                        
                        {selectedClubIds.length === 0 && (
                            <p className="text-slate-500 text-center py-8">Select at least 2 clubs to compare their historical performance</p>
                        )}
                    </CardContent>
                </Card>

                {selectedClubs.length >= 2 && (
                    <>
                        {/* Stats Comparison Table */}
                        <Card className="border-0 shadow-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5 text-blue-600" />
                                    Statistics Comparison
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-48">Statistic</TableHead>
                                            {selectedClubs.map((club, idx) => (
                                                <TableHead key={club.id} className="text-center min-w-32">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx] }} />
                                                        <Link to={createPageUrl(`ClubDetail?id=${club.id}`)} className="hover:text-emerald-600">
                                                            {club.name}
                                                        </Link>
                                                    </div>
                                                </TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell className="font-medium">Founded</TableCell>
                                            {selectedClubs.map(club => (
                                                <TableCell key={club.id} className="text-center">{club.founded_year || '-'}</TableCell>
                                            ))}
                                        </TableRow>
                                        <TableRow className="bg-amber-50">
                                            <TableCell className="font-medium flex items-center gap-2">
                                                <Trophy className="w-4 h-4 text-amber-500" /> League Titles
                                            </TableCell>
                                            {selectedClubs.map(club => (
                                                <TableCell key={club.id} className="text-center font-bold text-amber-600">
                                                    {club.league_titles || 0}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-medium">Lower Tier Titles</TableCell>
                                            {selectedClubs.map(club => (
                                                <TableCell key={club.id} className="text-center">{club.lower_tier_titles || 0}</TableCell>
                                            ))}
                                        </TableRow>
                                        <TableRow className="bg-emerald-50">
                                            <TableCell className="font-medium flex items-center gap-2">
                                                <Target className="w-4 h-4 text-emerald-500" /> Best Finish
                                            </TableCell>
                                            {selectedClubs.map(club => (
                                                <TableCell key={club.id} className="text-center">
                                                    {club.best_finish ? (
                                                        <span>
                                                            {club.best_finish === 1 ? '1st' : club.best_finish === 2 ? '2nd' : club.best_finish === 3 ? '3rd' : `${club.best_finish}th`}
                                                            {club.best_finish_tier && <span className="text-slate-400 text-xs ml-1">(T{club.best_finish_tier})</span>}
                                                        </span>
                                                    ) : '-'}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-medium">Seasons Played</TableCell>
                                            {selectedClubs.map(club => (
                                                <TableCell key={club.id} className="text-center">{club.seasons_played || getClubSeasons(club.id).length}</TableCell>
                                            ))}
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-medium">Top Flight Seasons</TableCell>
                                            {selectedClubs.map(club => (
                                                <TableCell key={club.id} className="text-center">{club.seasons_top_flight || 0}</TableCell>
                                            ))}
                                        </TableRow>
                                        <TableRow className="bg-blue-50">
                                            <TableCell className="font-medium">VCC Titles</TableCell>
                                            {selectedClubs.map(club => (
                                                <TableCell key={club.id} className="text-center font-bold text-blue-600">{club.vcc_titles || 0}</TableCell>
                                            ))}
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-medium">VCC Appearances</TableCell>
                                            {selectedClubs.map(club => (
                                                <TableCell key={club.id} className="text-center">{club.vcc_appearances || 0}</TableCell>
                                            ))}
                                        </TableRow>
                                        <TableRow className="bg-purple-50">
                                            <TableCell className="font-medium">CCC Titles</TableCell>
                                            {selectedClubs.map(club => (
                                                <TableCell key={club.id} className="text-center font-bold text-purple-600">{club.ccc_titles || 0}</TableCell>
                                            ))}
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-medium">CCC Appearances</TableCell>
                                            {selectedClubs.map(club => (
                                                <TableCell key={club.id} className="text-center">{club.ccc_appearances || 0}</TableCell>
                                            ))}
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-medium">Total Wins</TableCell>
                                            {selectedClubs.map(club => (
                                                <TableCell key={club.id} className="text-center text-green-600">{club.total_wins || 0}</TableCell>
                                            ))}
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-medium">Total Draws</TableCell>
                                            {selectedClubs.map(club => (
                                                <TableCell key={club.id} className="text-center text-slate-500">{club.total_draws || 0}</TableCell>
                                            ))}
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-medium">Total Losses</TableCell>
                                            {selectedClubs.map(club => (
                                                <TableCell key={club.id} className="text-center text-red-500">{club.total_losses || 0}</TableCell>
                                            ))}
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-medium flex items-center gap-2">
                                                <TrendingUp className="w-4 h-4 text-green-500" /> Promotions
                                            </TableCell>
                                            {selectedClubs.map(club => (
                                                <TableCell key={club.id} className="text-center text-green-600">{club.promotions || 0}</TableCell>
                                            ))}
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-medium">Relegations</TableCell>
                                            {selectedClubs.map(club => (
                                                <TableCell key={club.id} className="text-center text-red-500">{club.relegations || 0}</TableCell>
                                            ))}
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-medium">Goals Scored</TableCell>
                                            {selectedClubs.map(club => (
                                                <TableCell key={club.id} className="text-center">{club.total_goals_scored || 0}</TableCell>
                                            ))}
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-medium">Goals Conceded</TableCell>
                                            {selectedClubs.map(club => (
                                                <TableCell key={club.id} className="text-center">{club.total_goals_conceded || 0}</TableCell>
                                            ))}
                                        </TableRow>
                                        <TableRow className="bg-slate-100">
                                            <TableCell className="font-medium">Goal Difference</TableCell>
                                            {selectedClubs.map(club => {
                                                const gd = (club.total_goals_scored || 0) - (club.total_goals_conceded || 0);
                                                return (
                                                    <TableCell key={club.id} className={`text-center font-bold ${gd > 0 ? 'text-green-600' : gd < 0 ? 'text-red-600' : ''}`}>
                                                        {gd > 0 ? `+${gd}` : gd}
                                                    </TableCell>
                                                );
                                            })}
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        {/* Historical Chart */}
                        <ClubComparisonChart 
                            clubs={selectedClubs}
                            leagueTables={leagueTables}
                            leagues={leagues}
                            colors={COLORS}
                        />
                    </>
                )}
            </div>
        </div>
    );
}