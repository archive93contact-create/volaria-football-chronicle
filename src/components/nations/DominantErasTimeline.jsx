import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, MapPin, Trophy } from 'lucide-react';

export default function DominantErasTimeline({ seasons = [], clubs = [], leagues = [] }) {
    const eraData = useMemo(() => {
        if (!seasons || seasons.length === 0) return [];

        // Group seasons by decade
        const decades = {};
        seasons.forEach(season => {
            if (!season.champion_name || !season.year) return;
            
            const year = parseInt(season.year);
            const decade = Math.floor(year / 10) * 10;
            
            if (!decades[decade]) {
                decades[decade] = {
                    decade,
                    champions: {},
                    regions: {},
                    totalSeasons: 0,
                };
            }

            decades[decade].totalSeasons++;
            decades[decade].champions[season.champion_name] = (decades[decade].champions[season.champion_name] || 0) + 1;

            // Track region dominance
            const club = clubs.find(c => c.name === season.champion_name);
            if (club?.region) {
                decades[decade].regions[club.region] = (decades[decade].regions[club.region] || 0) + 1;
            }
        });

        // Process each decade to find dominant club and region
        return Object.values(decades)
            .sort((a, b) => b.decade - a.decade)
            .map(era => {
                const dominantClub = Object.entries(era.champions)
                    .sort((a, b) => b[1] - a[1])[0];
                
                const dominantRegion = Object.entries(era.regions)
                    .sort((a, b) => b[1] - a[1])[0];

                const club = dominantClub ? clubs.find(c => c.name === dominantClub[0]) : null;

                return {
                    decade: era.decade,
                    decadeLabel: `${era.decade}s`,
                    totalSeasons: era.totalSeasons,
                    dominantClub: dominantClub?.[0],
                    dominantClubId: club?.id,
                    dominantClubTitles: dominantClub?.[1] || 0,
                    dominantRegion: dominantRegion?.[0],
                    dominantRegionTitles: dominantRegion?.[1] || 0,
                    uniqueChampions: Object.keys(era.champions).length,
                    clubLogo: club?.logo_url,
                };
            });
    }, [seasons, clubs]);

    if (eraData.length === 0) {
        return null;
    }

    return (
        <Card className="border-0 shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-amber-600" />
                    Dominant Eras by Decade
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {eraData.map((era, idx) => (
                        <div 
                            key={era.decade}
                            className="relative flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200 hover:border-emerald-300 transition-all bg-gradient-to-r from-slate-50 to-white"
                        >
                            {/* Decade Label */}
                            <div className="flex-shrink-0 w-24 text-center">
                                <div className="text-3xl font-bold text-emerald-700">{era.decadeLabel}</div>
                                <div className="text-xs text-slate-500">{era.totalSeasons} seasons</div>
                            </div>

                            {/* Vertical Divider */}
                            <div className="h-20 w-0.5 bg-slate-200" />

                            {/* Dominant Club */}
                            <div className="flex-1">
                                <div className="flex items-center gap-3">
                                    {era.clubLogo && (
                                        <img 
                                            src={era.clubLogo} 
                                            alt={era.dominantClub}
                                            className="w-12 h-12 object-contain bg-white rounded-lg p-1 shadow-sm"
                                        />
                                    )}
                                    <div>
                                        <div className="text-xs text-slate-500 mb-1">Most Successful Club</div>
                                        {era.dominantClubId ? (
                                            <Link 
                                                to={createPageUrl(`ClubDetail?id=${era.dominantClubId}`)}
                                                className="font-bold text-lg text-slate-900 hover:text-emerald-600 flex items-center gap-2"
                                            >
                                                {era.dominantClub}
                                                <Trophy className="w-4 h-4 text-amber-500" />
                                            </Link>
                                        ) : (
                                            <div className="font-bold text-lg text-slate-900">{era.dominantClub}</div>
                                        )}
                                        <div className="text-sm text-amber-700">
                                            {era.dominantClubTitles} {era.dominantClubTitles === 1 ? 'title' : 'titles'} 
                                            <span className="text-slate-500 ml-2">
                                                ({(era.dominantClubTitles / era.totalSeasons * 100).toFixed(0)}% dominance)
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Dominant Region */}
                            {era.dominantRegion && (
                                <>
                                    <div className="h-20 w-0.5 bg-slate-200 hidden lg:block" />
                                    <div className="flex-shrink-0 hidden lg:block">
                                        <div className="text-xs text-slate-500 mb-1">Dominant Region</div>
                                        <Link 
                                            to={createPageUrl(`LocationDetail?name=${encodeURIComponent(era.dominantRegion)}&type=region&nation_id=${leagues[0]?.nation_id || ''}`)}
                                            className="font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                                        >
                                            <MapPin className="w-4 h-4" />
                                            {era.dominantRegion}
                                        </Link>
                                        <div className="text-sm text-slate-600">{era.dominantRegionTitles} titles</div>
                                    </div>
                                </>
                            )}

                            {/* Competition Metric */}
                            <div className="flex-shrink-0 text-center hidden md:block">
                                <div className="text-xs text-slate-500 mb-1">Competition</div>
                                <Badge variant={era.uniqueChampions > 3 ? 'default' : 'outline'} className={
                                    era.uniqueChampions > 5 ? 'bg-green-600' : 
                                    era.uniqueChampions > 3 ? 'bg-blue-600' : 
                                    'bg-amber-600 text-white'
                                }>
                                    {era.uniqueChampions} different winners
                                </Badge>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}