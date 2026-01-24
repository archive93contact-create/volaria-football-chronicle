import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Trophy, Award, MapPin, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function YouthTeamCard({ youthTeam, league }) {
    const totalTrophies = (youthTeam.youth_league_titles || 0) + (youthTeam.youth_cup_titles || 0);

    return (
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-indigo-200 flex items-center justify-center">
                            <Users className="w-6 h-6 text-indigo-700" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">{youthTeam.name}</CardTitle>
                            <Badge className="mt-1 bg-indigo-600 text-white">{youthTeam.age_group}</Badge>
                        </div>
                    </div>
                    {totalTrophies > 0 && (
                        <div className="flex items-center gap-1 text-amber-600">
                            <Trophy className="w-5 h-5" />
                            <span className="font-bold">{totalTrophies}</span>
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {league && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Users className="w-4 h-4" />
                        <span>League: </span>
                        <Link 
                            to={createPageUrl(`LeagueDetail?id=${league.id}`)} 
                            className="font-medium text-indigo-600 hover:underline"
                        >
                            {league.name}
                        </Link>
                    </div>
                )}
                
                {youthTeam.manager && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Users className="w-4 h-4" />
                        <span>Manager: {youthTeam.manager}</span>
                    </div>
                )}

                {youthTeam.home_ground && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                        <MapPin className="w-4 h-4" />
                        <span>{youthTeam.home_ground}</span>
                    </div>
                )}

                {youthTeam.best_league_finish && (
                    <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
                        <TrendingUp className="w-4 h-4" />
                        <span>Best Finish: {youthTeam.best_league_finish === 1 ? '1st' : youthTeam.best_league_finish === 2 ? '2nd' : youthTeam.best_league_finish === 3 ? '3rd' : `${youthTeam.best_league_finish}th`}</span>
                        {youthTeam.best_league_finish_year && <span className="text-xs text-slate-500">({youthTeam.best_league_finish_year})</span>}
                    </div>
                )}

                {youthTeam.notable_graduates && (
                    <div className="pt-3 border-t border-indigo-200">
                        <div className="text-xs text-slate-600 mb-1">Notable Graduates:</div>
                        <div className="text-sm text-indigo-700 font-medium">{youthTeam.notable_graduates}</div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}