import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, Target, Shield, Flame, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function LeagueRecords({ leagueTables = [], clubs = [], seasons = [] }) {
    const records = useMemo(() => {
        if (leagueTables.length === 0) return [];

        // Find the most recent season year from the data
        const allYears = leagueTables.map(t => t.year).filter(Boolean);
        const mostRecentYear = allYears.length > 0 
            ? Math.max(...allYears.map(y => parseInt(y.split('-')[0])))
            : new Date().getFullYear();
        
        const result = [];

        // Helper to find club ID
        const getClubId = (clubName) => {
            const club = clubs.find(c => c.name?.toLowerCase() === clubName?.toLowerCase());
            return club?.id;
        };

        // Helper to calculate years held (based on most recent season in data)
        const yearsHeld = (year) => {
            if (!year) return 0;
            const recordYear = parseInt(year.split('-')[0]);
            return mostRecentYear - recordYear;
        };

        // Sort tables by year for finding "first" records
        const sortedTables = [...leagueTables].sort((a, b) => a.year.localeCompare(b.year));

        // POSITIVE RECORDS

        // Most Points
        const validPoints = leagueTables.filter(t => t.points && t.points > 0);
        if (validPoints.length > 0) {
            const record = validPoints.reduce((max, t) => t.points > max.points ? t : max);
            result.push({
                category: 'Attacking',
                icon: Trophy,
                iconColor: 'text-amber-500',
                title: 'Most Points',
                value: record.points,
                club: record.club_name,
                clubId: getClubId(record.club_name),
                year: record.year,
                held: yearsHeld(record.year),
                position: record.position
            });
        }

        // Most Wins
        const validWins = leagueTables.filter(t => t.won !== undefined && t.won !== null);
        if (validWins.length > 0) {
            const record = validWins.reduce((max, t) => t.won > max.won ? t : max);
            result.push({
                category: 'Attacking',
                icon: TrendingUp,
                iconColor: 'text-green-500',
                title: 'Most Wins',
                value: record.won,
                club: record.club_name,
                clubId: getClubId(record.club_name),
                year: record.year,
                held: yearsHeld(record.year),
                position: record.position
            });
        }

        // Most Goals Scored
        const validGoalsFor = leagueTables.filter(t => t.goals_for && t.goals_for > 0);
        if (validGoalsFor.length > 0) {
            const record = validGoalsFor.reduce((max, t) => t.goals_for > max.goals_for ? t : max);
            result.push({
                category: 'Attacking',
                icon: Flame,
                iconColor: 'text-red-500',
                title: 'Most Goals Scored',
                value: record.goals_for,
                club: record.club_name,
                clubId: getClubId(record.club_name),
                year: record.year,
                held: yearsHeld(record.year),
                position: record.position
            });
        }

        // Best Goal Difference
        const validGD = leagueTables.filter(t => t.goal_difference !== undefined && t.goal_difference !== null);
        if (validGD.length > 0) {
            const record = validGD.reduce((max, t) => t.goal_difference > max.goal_difference ? t : max);
            result.push({
                category: 'Attacking',
                icon: Target,
                iconColor: 'text-indigo-500',
                title: 'Best Goal Difference',
                value: `+${record.goal_difference}`,
                club: record.club_name,
                clubId: getClubId(record.club_name),
                year: record.year,
                held: yearsHeld(record.year),
                position: record.position
            });
        }

        // Most Draws
        const validDraws = leagueTables.filter(t => t.drawn !== undefined && t.drawn !== null);
        if (validDraws.length > 0) {
            const record = validDraws.reduce((max, t) => t.drawn > max.drawn ? t : max);
            result.push({
                category: 'Other',
                icon: Shield,
                iconColor: 'text-slate-500',
                title: 'Most Draws',
                value: record.drawn,
                club: record.club_name,
                clubId: getClubId(record.club_name),
                year: record.year,
                held: yearsHeld(record.year),
                position: record.position
            });
        }

        // DEFENSIVE RECORDS (for champions/top finishers)

        // Fewest Goals Conceded (Champions only)
        const champions = leagueTables.filter(t => t.status === 'champion' && t.goals_against && t.goals_against > 0);
        if (champions.length > 0) {
            const record = champions.reduce((min, t) => t.goals_against < min.goals_against ? t : min);
            result.push({
                category: 'Defensive',
                icon: Shield,
                iconColor: 'text-emerald-500',
                title: 'Fewest Goals Conceded (Champion)',
                value: record.goals_against,
                club: record.club_name,
                clubId: getClubId(record.club_name),
                year: record.year,
                held: yearsHeld(record.year),
                position: record.position
            });
        }

        // Fewest Losses (Champions only)
        const championsWithLosses = leagueTables.filter(t => t.status === 'champion' && t.lost !== undefined);
        if (championsWithLosses.length > 0) {
            const record = championsWithLosses.reduce((min, t) => t.lost < min.lost ? t : min);
            result.push({
                category: 'Defensive',
                icon: Shield,
                iconColor: 'text-green-600',
                title: 'Fewest Losses (Champion)',
                value: record.lost,
                suffix: record.lost === 0 ? ' (Invincible)' : '',
                club: record.club_name,
                clubId: getClubId(record.club_name),
                year: record.year,
                held: yearsHeld(record.year),
                position: record.position
            });
        }

        // NEGATIVE RECORDS

        // Fewest Points
        const minPoints = validPoints.filter(t => t.points > 0);
        if (minPoints.length > 0) {
            const record = minPoints.reduce((min, t) => t.points < min.points ? t : min);
            result.push({
                category: 'Unwanted',
                icon: TrendingDown,
                iconColor: 'text-red-500',
                title: 'Fewest Points',
                value: record.points,
                club: record.club_name,
                clubId: getClubId(record.club_name),
                year: record.year,
                held: yearsHeld(record.year),
                position: record.position
            });
        }

        // Most Losses
        const validLosses = leagueTables.filter(t => t.lost !== undefined && t.lost !== null);
        if (validLosses.length > 0) {
            const record = validLosses.reduce((max, t) => t.lost > max.lost ? t : max);
            result.push({
                category: 'Unwanted',
                icon: TrendingDown,
                iconColor: 'text-red-600',
                title: 'Most Losses',
                value: record.lost,
                club: record.club_name,
                clubId: getClubId(record.club_name),
                year: record.year,
                held: yearsHeld(record.year),
                position: record.position
            });
        }

        // Most Goals Conceded
        const validGoalsAgainst = leagueTables.filter(t => t.goals_against && t.goals_against > 0);
        if (validGoalsAgainst.length > 0) {
            const record = validGoalsAgainst.reduce((max, t) => t.goals_against > max.goals_against ? t : max);
            result.push({
                category: 'Unwanted',
                icon: TrendingDown,
                iconColor: 'text-orange-500',
                title: 'Most Goals Conceded',
                value: record.goals_against,
                club: record.club_name,
                clubId: getClubId(record.club_name),
                year: record.year,
                held: yearsHeld(record.year),
                position: record.position
            });
        }

        // Fewest Wins
        const fewWins = validWins.filter(t => t.won >= 0);
        if (fewWins.length > 0) {
            const record = fewWins.reduce((min, t) => t.won < min.won ? t : min);
            result.push({
                category: 'Unwanted',
                icon: TrendingDown,
                iconColor: 'text-slate-500',
                title: 'Fewest Wins',
                value: record.won,
                club: record.club_name,
                clubId: getClubId(record.club_name),
                year: record.year,
                held: yearsHeld(record.year),
                position: record.position
            });
        }

        // Worst Goal Difference
        if (validGD.length > 0) {
            const record = validGD.reduce((min, t) => t.goal_difference < min.goal_difference ? t : min);
            result.push({
                category: 'Unwanted',
                icon: TrendingDown,
                iconColor: 'text-red-700',
                title: 'Worst Goal Difference',
                value: record.goal_difference,
                club: record.club_name,
                clubId: getClubId(record.club_name),
                year: record.year,
                held: yearsHeld(record.year),
                position: record.position
            });
        }

        // Fewest Goals Scored
        const fewGoals = validGoalsFor.filter(t => t.goals_for > 0);
        if (fewGoals.length > 0) {
            const record = fewGoals.reduce((min, t) => t.goals_for < min.goals_for ? t : min);
            result.push({
                category: 'Unwanted',
                icon: TrendingDown,
                iconColor: 'text-orange-600',
                title: 'Fewest Goals Scored',
                value: record.goals_for,
                club: record.club_name,
                clubId: getClubId(record.club_name),
                year: record.year,
                held: yearsHeld(record.year),
                position: record.position
            });
        }

        // Fewest Draws
        const fewDraws = validDraws.filter(t => t.drawn >= 0);
        if (fewDraws.length > 0) {
            const record = fewDraws.reduce((min, t) => t.drawn < min.drawn ? t : min);
            result.push({
                category: 'Other',
                icon: Shield,
                iconColor: 'text-slate-400',
                title: 'Fewest Draws',
                value: record.drawn,
                club: record.club_name,
                clubId: getClubId(record.club_name),
                year: record.year,
                held: yearsHeld(record.year),
                position: record.position
            });
        }

        return result;
    }, [leagueTables, clubs]);

    // Group records by category
    const groupedRecords = useMemo(() => {
        const groups = {
            'Attacking': [],
            'Defensive': [],
            'Unwanted': [],
            'Other': []
        };
        records.forEach(r => {
            if (groups[r.category]) {
                groups[r.category].push(r);
            }
        });
        return groups;
    }, [records]);

    if (records.length === 0) {
        return (
            <Card className="border-0 shadow-sm">
                <CardContent className="p-8 text-center text-slate-500">
                    No records available - add season data with statistics to see records.
                </CardContent>
            </Card>
        );
    }

    const formatPosition = (pos) => {
        if (!pos) return '';
        if (pos === 1) return '1st';
        if (pos === 2) return '2nd';
        if (pos === 3) return '3rd';
        return `${pos}th`;
    };

    return (
        <div className="space-y-6">
            {Object.entries(groupedRecords).map(([category, categoryRecords]) => {
                if (categoryRecords.length === 0) return null;
                
                const categoryConfig = {
                    'Attacking': { title: 'Attacking & Points Records', bg: 'bg-amber-50', border: 'border-amber-200' },
                    'Defensive': { title: 'Defensive Records (Champions)', bg: 'bg-emerald-50', border: 'border-emerald-200' },
                    'Unwanted': { title: 'Unwanted Records', bg: 'bg-red-50', border: 'border-red-200' },
                    'Other': { title: 'Other Records', bg: 'bg-slate-50', border: 'border-slate-200' }
                }[category];

                return (
                    <Card key={category} className={`border-0 shadow-sm ${categoryConfig.bg}`}>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg">{categoryConfig.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[200px]">Record</TableHead>
                                        <TableHead>Club</TableHead>
                                        <TableHead className="text-center">Value</TableHead>
                                        <TableHead className="text-center">Season</TableHead>
                                        <TableHead className="text-center hidden md:table-cell">Position</TableHead>
                                        <TableHead className="text-center hidden md:table-cell">Years Held</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {categoryRecords.map((record, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <record.icon className={`w-4 h-4 ${record.iconColor}`} />
                                                    <span className="font-medium">{record.title}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {record.clubId ? (
                                                    <Link 
                                                        to={createPageUrl(`ClubDetail?id=${record.clubId}`)} 
                                                        className="font-semibold text-emerald-600 hover:underline"
                                                    >
                                                        {record.club}
                                                    </Link>
                                                ) : (
                                                    <span className="font-semibold">{record.club}</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className="font-bold text-lg">{record.value}</span>
                                                {record.suffix && <span className="text-xs text-emerald-600 ml-1">{record.suffix}</span>}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className="text-slate-600">{record.year}</span>
                                            </TableCell>
                                            <TableCell className="text-center hidden md:table-cell">
                                                <span className="text-slate-500">{formatPosition(record.position)}</span>
                                            </TableCell>
                                            <TableCell className="text-center hidden md:table-cell">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Calendar className="w-3 h-3 text-slate-400" />
                                                    <span className="text-slate-500">
                                                        {record.held === 0 ? 'New' : `${record.held} yr${record.held !== 1 ? 's' : ''}`}
                                                    </span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}