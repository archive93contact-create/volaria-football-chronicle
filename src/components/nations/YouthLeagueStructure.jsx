import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Trophy, Users, Loader2, GraduationCap } from 'lucide-react';

export default function YouthLeagueStructure({ nationId }) {
    const { data: youthLeagues = [], isLoading } = useQuery({
        queryKey: ['youthLeagues', nationId],
        queryFn: async () => {
            const allLeagues = await base44.entities.League.list() || [];
            return allLeagues.filter(l => l.nation_id === nationId && l.league_type === 'youth');
        },
    });

    const { data: allSeasons = [] } = useQuery({
        queryKey: ['allSeasons'],
        queryFn: async () => await base44.entities.Season.list() || [],
    });

    // Group by age group
    const groupedByAge = youthLeagues.reduce((acc, league) => {
        const ageGroup = league.age_group || 'Other';
        if (!acc[ageGroup]) acc[ageGroup] = [];
        acc[ageGroup].push(league);
        return acc;
    }, {});

    // Sort age groups (U-23 first, then descending)
    const sortedAgeGroups = Object.keys(groupedByAge).sort((a, b) => {
        const extractAge = (str) => {
            const match = str.match(/U-(\d+)/);
            return match ? parseInt(match[1]) : 0;
        };
        return extractAge(b) - extractAge(a);
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (youthLeagues.length === 0) {
        return (
            <Card className="border-dashed border-2 border-slate-300">
                <CardContent className="flex flex-col items-center justify-center py-16">
                    <GraduationCap className="w-16 h-16 text-slate-300 mb-4" />
                    <h3 className="text-xl font-semibold text-slate-700 mb-2">No Youth Leagues</h3>
                    <p className="text-slate-500 mb-4 text-center">
                        Create youth leagues using the league builder with league_type="youth"
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {sortedAgeGroups.map(ageGroup => {
                const leagues = groupedByAge[ageGroup];
                return (
                    <div key={ageGroup}>
                        <h3 className="text-xl font-bold text-indigo-900 mb-4 flex items-center gap-2">
                            <Users className="w-5 h-5" />
                            {ageGroup}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {leagues.map(league => {
                                const leagueSeasons = allSeasons.filter(s => s.league_id === league.id);
                                const latestSeason = leagueSeasons.sort((a, b) => 
                                    b.year.localeCompare(a.year)
                                )[0];

                                return (
                                    <Link
                                        key={league.id}
                                        to={createPageUrl(`LeagueDetail?id=${league.id}`)}
                                    >
                                        <Card className="border-0 shadow-sm hover:shadow-md transition-all bg-gradient-to-br from-indigo-50 to-blue-50 cursor-pointer">
                                            <CardHeader>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex-1">
                                                        <CardTitle className="text-base text-indigo-900">
                                                            {league.name}
                                                        </CardTitle>
                                                    </div>
                                                    <Badge className="bg-indigo-600 text-white">
                                                        {league.age_group}
                                                    </Badge>
                                                </div>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-2 text-sm">
                                                    {league.number_of_teams && (
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-slate-600">Teams:</span>
                                                            <span className="font-semibold">{league.number_of_teams}</span>
                                                        </div>
                                                    )}
                                                    {latestSeason && (
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-slate-600">Current Champion:</span>
                                                            <span className="font-semibold flex items-center gap-1">
                                                                <Trophy className="w-3 h-3 text-amber-500" />
                                                                {latestSeason.champion_name}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {leagueSeasons.length > 0 && (
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-slate-600">Seasons:</span>
                                                            <span className="font-semibold">{leagueSeasons.length}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}