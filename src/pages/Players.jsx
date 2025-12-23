import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Users, Search, Filter, Shield } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import PageHeader from '@/components/common/PageHeader';

export default function Players() {
    const [search, setSearch] = useState('');
    const [nationalityFilter, setNationalityFilter] = useState('all');
    const [positionFilter, setPositionFilter] = useState('all');
    const [clubFilter, setClubFilter] = useState('all');
    const [minAge, setMinAge] = useState('');
    const [maxAge, setMaxAge] = useState('');
    const [minRating, setMinRating] = useState('');

    const { data: players = [] } = useQuery({
        queryKey: ['allPlayers'],
        queryFn: () => base44.entities.Player.list(),
    });

    const { data: nations = [] } = useQuery({
        queryKey: ['allNations'],
        queryFn: () => base44.entities.Nation.list(),
    });

    const { data: clubs = [] } = useQuery({
        queryKey: ['allClubs'],
        queryFn: () => base44.entities.Club.list(),
    });

    const uniqueNationalities = [...new Set(players.map(p => p.nationality).filter(Boolean))].sort();
    const uniquePositions = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST'];
    const uniqueClubs = [...new Set(players.map(p => p.club_id).filter(Boolean))];

    const filteredPlayers = players.filter(player => {
        const matchesSearch = !search || 
            player.full_name?.toLowerCase().includes(search.toLowerCase()) ||
            player.first_name?.toLowerCase().includes(search.toLowerCase()) ||
            player.last_name?.toLowerCase().includes(search.toLowerCase());
        const matchesNationality = nationalityFilter === 'all' || player.nationality === nationalityFilter;
        const matchesPosition = positionFilter === 'all' || player.position === positionFilter;
        const matchesClub = clubFilter === 'all' || player.club_id === clubFilter;
        const matchesMinAge = !minAge || (player.age && player.age >= parseInt(minAge));
        const matchesMaxAge = !maxAge || (player.age && player.age <= parseInt(maxAge));
        const matchesMinRating = !minRating || (player.overall_rating && player.overall_rating >= parseInt(minRating));
        
        return matchesSearch && matchesNationality && matchesPosition && matchesClub && 
               matchesMinAge && matchesMaxAge && matchesMinRating;
    });

    const getClubName = (clubId) => {
        const club = clubs.find(c => c.id === clubId);
        return club?.name || 'Free Agent';
    };

    const getNationFlag = (nationality) => {
        const nation = nations.find(n => n.name === nationality);
        return nation?.flag_url;
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <PageHeader
                title="All Players"
                subtitle={`${filteredPlayers.length} players registered in Volaria`}
                breadcrumbs={[{ label: 'Players' }]}
            />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Filters */}
                <Card className="border-0 shadow-sm mb-6">
                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <label className="text-xs text-slate-500 mb-1 block">Search</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input
                                        placeholder="Search by name..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 mb-1 block">Nationality</label>
                                <Select value={nationalityFilter} onValueChange={setNationalityFilter}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Nations</SelectItem>
                                        {uniqueNationalities.map(nat => (
                                            <SelectItem key={nat} value={nat}>{nat}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 mb-1 block">Position</label>
                                <Select value={positionFilter} onValueChange={setPositionFilter}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Positions</SelectItem>
                                        {uniquePositions.map(pos => (
                                            <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 mb-1 block">Club</label>
                                <Select value={clubFilter} onValueChange={setClubFilter}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Clubs</SelectItem>
                                        {uniqueClubs.map(clubId => {
                                            const club = clubs.find(c => c.id === clubId);
                                            return club && <SelectItem key={clubId} value={clubId}>{club.name}</SelectItem>;
                                        })}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 mb-1 block">Age Range</label>
                                <div className="flex gap-2">
                                    <Input
                                        type="number"
                                        placeholder="Min"
                                        value={minAge}
                                        onChange={(e) => setMinAge(e.target.value)}
                                        className="w-20"
                                    />
                                    <Input
                                        type="number"
                                        placeholder="Max"
                                        value={maxAge}
                                        onChange={(e) => setMaxAge(e.target.value)}
                                        className="w-20"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 mb-1 block">Min Rating</label>
                                <Input
                                    type="number"
                                    placeholder="e.g., 70"
                                    value={minRating}
                                    onChange={(e) => setMinRating(e.target.value)}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Players Table */}
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-100">
                                    <TableHead>Player</TableHead>
                                    <TableHead>Nationality</TableHead>
                                    <TableHead>Club</TableHead>
                                    <TableHead className="text-center">Pos</TableHead>
                                    <TableHead className="text-center">Age</TableHead>
                                    <TableHead className="text-center">OVR</TableHead>
                                    <TableHead className="text-center">POT</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredPlayers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                                            No players found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredPlayers.map(player => (
                                        <TableRow key={player.id} className="hover:bg-slate-50">
                                            <TableCell>
                                                <Link 
                                                    to={createPageUrl(`PlayerDetail?id=${player.id}`)}
                                                    className="flex items-center gap-3 hover:text-emerald-600"
                                                >
                                                    {player.photo_url ? (
                                                        <img src={player.photo_url} alt={player.full_name} className="w-10 h-10 rounded-full object-cover" />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center">
                                                            <Users className="w-5 h-5 text-emerald-600" />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="font-semibold">{player.full_name || `${player.first_name} ${player.last_name}`}</div>
                                                        {player.birth_place && <div className="text-xs text-slate-500">{player.birth_place}</div>}
                                                    </div>
                                                </Link>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {getNationFlag(player.nationality) && (
                                                        <img src={getNationFlag(player.nationality)} alt={player.nationality} className="w-6 h-4 object-cover rounded shadow-sm" />
                                                    )}
                                                    <span>{player.nationality}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {player.club_id ? (
                                                    <Link 
                                                        to={createPageUrl(`ClubDetail?id=${player.club_id}`)}
                                                        className="flex items-center gap-2 hover:text-emerald-600"
                                                    >
                                                        <Shield className="w-4 h-4 text-slate-400" />
                                                        {getClubName(player.club_id)}
                                                    </Link>
                                                ) : (
                                                    <span className="text-slate-400">Free Agent</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className="px-2 py-1 bg-slate-100 rounded text-xs font-semibold">
                                                    {player.position}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-center">{player.age}</TableCell>
                                            <TableCell className="text-center">
                                                <span className="font-bold text-emerald-600">{player.overall_rating}</span>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className="font-bold text-blue-600">{player.potential}</span>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}