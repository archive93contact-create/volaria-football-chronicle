import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, MapPin, Award } from 'lucide-react';

export default function GeographicSuccessMap({ clubs, leagueTables, leagues }) {
    const locationStats = useMemo(() => {
        if (!clubs || !leagueTables || leagueTables.length === 0) return [];

        const locations = {};

        clubs.forEach(club => {
            // Track each location level separately
            const locationLevels = [
                { key: club.region, type: 'region' },
                { key: club.district, type: 'district' },
                { key: club.settlement, type: 'settlement' }
            ].filter(l => l.key);

            locationLevels.forEach(({ key, type }) => {
                if (!locations[key]) {
                    locations[key] = {
                        name: key,
                        type: type,
                        region: club.region,
                        district: club.district,
                        settlement: club.settlement,
                        clubs: [],
                        titles: 0,
                        topThreeFinishes: 0,
                        totalSeasons: 0,
                        clubCount: 0
                    };
                }

                // Only add club once per location
                if (!locations[key].clubs.find(c => c.id === club.id)) {
                    locations[key].clubs.push(club);
                    locations[key].clubCount++;
                }
            });
        });

        // Calculate success metrics from league tables for all location levels
        leagueTables.forEach(entry => {
            const club = clubs.find(c => c.id === entry.club_id);
            if (!club) return;

            const league = leagues?.find(l => l.id === entry.league_id);
            const tier = entry.tier || league?.tier || 1;

            // Update all location levels for this club
            [club.region, club.district, club.settlement].filter(Boolean).forEach(locationKey => {
                if (!locations[locationKey]) return;

                locations[locationKey].totalSeasons++;

                if (entry.status === 'champion' && tier === 1) {
                    locations[locationKey].titles++;
                }

                if (entry.position <= 3 && tier === 1) {
                    locations[locationKey].topThreeFinishes++;
                }
            });
        });

        // Calculate dominance score
        Object.values(locations).forEach(loc => {
            loc.dominanceScore = (loc.titles * 10) + (loc.topThreeFinishes * 3) + (loc.clubCount * 2);
        });

        return Object.values(locations)
            .filter(loc => loc.totalSeasons > 0)
            .sort((a, b) => b.dominanceScore - a.dominanceScore);
    }, [clubs, leagueTables, leagues]);

    const getDominanceLevel = (location) => {
        if (location.titles >= 5) return { label: '🏆 Dominant', color: 'bg-amber-100 text-amber-800 border-amber-300' };
        if (location.titles >= 2) return { label: '⭐ Strong', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
        if (location.topThreeFinishes >= 5) return { label: '💪 Competitive', color: 'bg-blue-100 text-blue-800 border-blue-300' };
        if (location.totalSeasons >= 10) return { label: '📍 Established', color: 'bg-slate-100 text-slate-800 border-slate-300' };
        return { label: '🌱 Emerging', color: 'bg-purple-100 text-purple-800 border-purple-300' };
    };

    if (locationStats.length === 0) {
        return (
            <Card>
                <CardContent className="py-8">
                    <p className="text-slate-500 text-center">No location data available</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Geographic Success Map
                </CardTitle>
                <CardDescription>
                    Which regions, districts, and settlements dominate the football landscape
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {locationStats.map((location, idx) => {
                        const dominance = getDominanceLevel(location);
                        return (
                            <div 
                                key={location.name} 
                                className={`border-2 rounded-lg p-4 ${dominance.color}`}
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="text-lg font-bold text-slate-900">{location.name}</h3>
                                            <Badge variant="outline" className="text-xs">
                                                {location.type}
                                            </Badge>
                                        </div>
                                        {location.type === 'settlement' && (
                                            <p className="text-sm text-slate-600">
                                                {location.district && `${location.district}, `}{location.region}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge className={`${dominance.color} border text-sm px-3 py-1`}>
                                            {dominance.label}
                                        </Badge>
                                        <span className="text-2xl font-bold text-slate-400">#{idx + 1}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-4 gap-3 mb-3">
                                    <div className="bg-white/80 rounded p-2 text-center">
                                        <div className="text-2xl font-bold text-amber-600">{location.titles}</div>
                                        <div className="text-xs text-slate-600">Titles</div>
                                    </div>
                                    <div className="bg-white/80 rounded p-2 text-center">
                                        <div className="text-2xl font-bold text-emerald-600">{location.topThreeFinishes}</div>
                                        <div className="text-xs text-slate-600">Top 3</div>
                                    </div>
                                    <div className="bg-white/80 rounded p-2 text-center">
                                        <div className="text-2xl font-bold text-blue-600">{location.clubCount}</div>
                                        <div className="text-xs text-slate-600">Clubs</div>
                                    </div>
                                    <div className="bg-white/80 rounded p-2 text-center">
                                        <div className="text-2xl font-bold text-slate-600">{location.totalSeasons}</div>
                                        <div className="text-xs text-slate-600">Seasons</div>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {location.clubs.map(club => (
                                        <Link 
                                            key={club.id}
                                            to={createPageUrl('ClubDetail', `?id=${club.id}`)}
                                            className="inline-flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border hover:bg-slate-50 transition-colors"
                                        >
                                            {club.logo_url && (
                                                <img 
                                                    src={club.logo_url} 
                                                    alt={club.name}
                                                    className="w-4 h-4 object-contain"
                                                />
                                            )}
                                            <span className="text-sm font-medium text-slate-700">{club.name}</span>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}