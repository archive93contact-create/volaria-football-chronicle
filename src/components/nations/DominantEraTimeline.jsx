import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Crown, TrendingUp } from 'lucide-react';

export default function DominantEraTimeline({ clubs, leagueTables }) {
    const eraData = useMemo(() => {
        if (!leagueTables || leagueTables.length === 0) return [];

        // Group by decade
        const decades = {};
        
        leagueTables.forEach(entry => {
            // Only count top-tier titles
            if (entry.status !== 'champion' || (entry.tier && entry.tier !== 1)) return;

            const year = parseInt(entry.year);
            const decade = Math.floor(year / 10) * 10;
            const decadeLabel = `${decade}s`;

            if (!decades[decadeLabel]) {
                decades[decadeLabel] = {
                    decade: decadeLabel,
                    startYear: decade,
                    endYear: decade + 9,
                    clubTitles: {},
                    totalTitles: 0,
                    uniqueChampions: 0
                };
            }

            const clubName = entry.club_name;
            if (!decades[decadeLabel].clubTitles[clubName]) {
                decades[decadeLabel].clubTitles[clubName] = {
                    count: 0,
                    years: [],
                    club_id: entry.club_id
                };
            }

            decades[decadeLabel].clubTitles[clubName].count++;
            decades[decadeLabel].clubTitles[clubName].years.push(entry.year);
            decades[decadeLabel].totalTitles++;
        });

        // Process each decade
        Object.values(decades).forEach(decade => {
            decade.uniqueChampions = Object.keys(decade.clubTitles).length;
            
            // Find dominant club(s)
            const sortedClubs = Object.entries(decade.clubTitles)
                .sort(([, a], [, b]) => b.count - a.count);
            
            decade.dominantClub = sortedClubs[0];
            decade.secondPlace = sortedClubs[1];
            
            // Determine era type
            const topClubTitles = decade.dominantClub[1].count;
            const competitiveness = decade.uniqueChampions / decade.totalTitles;

            if (topClubTitles >= 7) {
                decade.eraType = 'dynasty';
                decade.eraLabel = '👑 Dynasty Era';
                decade.eraColor = 'bg-amber-50 border-amber-300';
            } else if (topClubTitles >= 5) {
                decade.eraType = 'dominant';
                decade.eraLabel = '🏆 Dominant Era';
                decade.eraColor = 'bg-yellow-50 border-yellow-300';
            } else if (competitiveness >= 0.7) {
                decade.eraType = 'competitive';
                decade.eraLabel = '⚔️ Competitive Era';
                decade.eraColor = 'bg-blue-50 border-blue-300';
            } else {
                decade.eraType = 'transitional';
                decade.eraLabel = '🔄 Transitional Era';
                decade.eraColor = 'bg-slate-50 border-slate-300';
            }
        });

        return Object.values(decades).sort((a, b) => b.startYear - a.startYear);
    }, [clubs, leagueTables]);

    const getClubLogo = (clubId) => {
        if (!clubs || !clubId) return null;
        const club = clubs.find(c => c.id === clubId);
        return club?.logo_url;
    };

    if (eraData.length === 0) {
        return (
            <Card>
                <CardContent className="py-8">
                    <p className="text-slate-500 text-center">No title data available</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Crown className="w-5 h-5" />
                    Dominant Era Timeline
                </CardTitle>
                <CardDescription>
                    Which clubs ruled each decade
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {eraData.map((era) => (
                        <div 
                            key={era.decade} 
                            className={`border-2 rounded-lg p-4 ${era.eraColor}`}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="text-2xl font-bold text-slate-900">{era.decade}</h3>
                                    <p className="text-sm text-slate-600">
                                        {era.totalTitles} {era.totalTitles === 1 ? 'title' : 'titles'} • {era.uniqueChampions} {era.uniqueChampions === 1 ? 'champion' : 'different champions'}
                                    </p>
                                </div>
                                <Badge className={`${era.eraColor} border text-base px-3 py-1`}>
                                    {era.eraLabel}
                                </Badge>
                            </div>

                            {/* Dominant Club */}
                            {era.dominantClub && (
                                <div className="bg-white rounded-lg p-4 mb-3 border-2 border-amber-200">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Crown className="w-5 h-5 text-amber-600" />
                                        <span className="text-xs font-semibold text-amber-700 uppercase">Era Dominance</span>
                                    </div>
                                    <Link 
                                        to={createPageUrl('ClubDetail', `?id=${era.dominantClub[1].club_id}`)}
                                        className="flex items-center gap-3 hover:underline group"
                                    >
                                        {getClubLogo(era.dominantClub[1].club_id) && (
                                            <img 
                                                src={getClubLogo(era.dominantClub[1].club_id)} 
                                                alt={era.dominantClub[0]}
                                                className="w-10 h-10 object-contain bg-white rounded"
                                            />
                                        )}
                                        <div className="flex-1">
                                            <h4 className="text-lg font-bold text-slate-900 group-hover:text-emerald-600">
                                                {era.dominantClub[0]}
                                            </h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge className="bg-amber-100 text-amber-800">
                                                    <Trophy className="w-3 h-3 mr-1" />
                                                    {era.dominantClub[1].count} {era.dominantClub[1].count === 1 ? 'title' : 'titles'}
                                                </Badge>
                                                <span className="text-xs text-slate-600">
                                                    {era.dominantClub[1].years.join(', ')}
                                                </span>
                                            </div>
                                        </div>
                                    </Link>
                                </div>
                            )}

                            {/* Other Champions */}
                            {Object.keys(era.clubTitles).length > 1 && (
                                <div className="bg-white rounded-lg p-3 border">
                                    <p className="text-xs font-semibold text-slate-600 uppercase mb-2">Other Champions</p>
                                    <div className="flex flex-wrap gap-2">
                                        {Object.entries(era.clubTitles)
                                            .filter(([name]) => name !== era.dominantClub[0])
                                            .sort(([, a], [, b]) => b.count - a.count)
                                            .map(([clubName, data]) => (
                                                <Link
                                                    key={clubName}
                                                    to={createPageUrl('ClubDetail', `?id=${data.club_id}`)}
                                                    className="inline-flex items-center gap-2 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-full border transition-colors"
                                                >
                                                    {getClubLogo(data.club_id) && (
                                                        <img 
                                                            src={getClubLogo(data.club_id)} 
                                                            alt={clubName}
                                                            className="w-4 h-4 object-contain"
                                                        />
                                                    )}
                                                    <span className="text-sm font-medium text-slate-700">{clubName}</span>
                                                    <Badge variant="outline" className="text-xs">
                                                        {data.count}
                                                    </Badge>
                                                </Link>
                                            ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}