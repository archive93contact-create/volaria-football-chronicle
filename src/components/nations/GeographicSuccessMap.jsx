import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, MapPin, Award } from 'lucide-react';

export default function GeographicSuccessMap({ clubs, leagueTables, leagues }) {
    const [viewMode, setViewMode] = useState('region'); // 'region', 'district', 'settlement'

    const locationStats = useMemo(() => {
        if (!clubs || !leagueTables || leagueTables.length === 0) return { region: [], district: [], settlement: [] };

        const regionData = {};
        const districtData = {};
        const settlementData = {};

        clubs.forEach(club => {
            // Initialize locations for each level
            if (club.region && !regionData[club.region]) {
                regionData[club.region] = { name: club.region, type: 'region', clubs: [], titles: 0, cupTitles: 0, topThreeFinishes: 0, topFlightSeasons: 0, totalSeasons: 0 };
            }
            if (club.district && !districtData[club.district]) {
                districtData[club.district] = { name: club.district, type: 'district', region: club.region, clubs: [], titles: 0, cupTitles: 0, topThreeFinishes: 0, topFlightSeasons: 0, totalSeasons: 0 };
            }
            if (club.settlement && !settlementData[club.settlement]) {
                settlementData[club.settlement] = { name: club.settlement, type: 'settlement', region: club.region, district: club.district, clubs: [], titles: 0, cupTitles: 0, topThreeFinishes: 0, topFlightSeasons: 0, totalSeasons: 0 };
            }

            // Add club to each location
            if (club.region && !regionData[club.region].clubs.find(c => c.id === club.id)) {
                regionData[club.region].clubs.push(club);
                regionData[club.region].titles += (club.league_titles || 0);
                regionData[club.region].cupTitles += (club.domestic_cup_titles || 0);
            }
            if (club.district && !districtData[club.district].clubs.find(c => c.id === club.id)) {
                districtData[club.district].clubs.push(club);
                districtData[club.district].titles += (club.league_titles || 0);
                districtData[club.district].cupTitles += (club.domestic_cup_titles || 0);
            }
            if (club.settlement && !settlementData[club.settlement].clubs.find(c => c.id === club.id)) {
                settlementData[club.settlement].clubs.push(club);
                settlementData[club.settlement].titles += (club.league_titles || 0);
                settlementData[club.settlement].cupTitles += (club.domestic_cup_titles || 0);
            }
        });

        // Calculate additional metrics from league tables
        leagueTables.forEach(entry => {
            const club = clubs.find(c => c.id === entry.club_id);
            if (!club) return;

            const league = leagues?.find(l => l.id === entry.league_id);
            const tier = entry.tier || league?.tier || 1;

            // Update all location levels for this club
            if (club.region && regionData[club.region]) {
                regionData[club.region].totalSeasons++;
                if (tier === 1) regionData[club.region].topFlightSeasons++;
                if (entry.position <= 3 && tier === 1) regionData[club.region].topThreeFinishes++;
            }
            if (club.district && districtData[club.district]) {
                districtData[club.district].totalSeasons++;
                if (tier === 1) districtData[club.district].topFlightSeasons++;
                if (entry.position <= 3 && tier === 1) districtData[club.district].topThreeFinishes++;
            }
            if (club.settlement && settlementData[club.settlement]) {
                settlementData[club.settlement].totalSeasons++;
                if (tier === 1) settlementData[club.settlement].topFlightSeasons++;
                if (entry.position <= 3 && tier === 1) settlementData[club.settlement].topThreeFinishes++;
            }
        });

        // Calculate dominance score and average top flight seasons
        const processLocations = (data) => {
            return Object.values(data).map(loc => {
                loc.avgTopFlightSeasons = loc.clubs.length > 0 ? (loc.topFlightSeasons / loc.clubs.length).toFixed(1) : 0;
                loc.dominanceScore = (loc.titles * 10) + (loc.cupTitles * 8) + (loc.topThreeFinishes * 3);
                return loc;
            }).sort((a, b) => b.dominanceScore - a.dominanceScore);
        };

        return {
            region: processLocations(regionData),
            district: processLocations(districtData),
            settlement: processLocations(settlementData)
        };
    }, [clubs, leagueTables, leagues]);

    const currentData = locationStats[viewMode] || [];

    const getDominanceLevel = (location) => {
        if (location.titles >= 5) return { label: '🏆 Dominant', color: 'bg-amber-100 text-amber-800 border-amber-300' };
        if (location.titles >= 2) return { label: '⭐ Strong', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
        if (location.topThreeFinishes >= 5) return { label: '💪 Competitive', color: 'bg-blue-100 text-blue-800 border-blue-300' };
        if (location.totalSeasons >= 10) return { label: '📍 Established', color: 'bg-slate-100 text-slate-800 border-slate-300' };
        return { label: '🌱 Emerging', color: 'bg-purple-100 text-purple-800 border-purple-300' };
    };

    if (currentData.length === 0) {
        return (
            <Card>
                <CardContent className="py-8">
                    <p className="text-slate-500 text-center">No location data available for {viewMode}s</p>
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
                {/* Filter Buttons */}
                <div className="flex gap-2 mb-6">
                    <Button 
                        variant={viewMode === 'region' ? 'default' : 'outline'}
                        onClick={() => setViewMode('region')}
                        size="sm"
                    >
                        Regions
                    </Button>
                    <Button 
                        variant={viewMode === 'district' ? 'default' : 'outline'}
                        onClick={() => setViewMode('district')}
                        size="sm"
                    >
                        Districts
                    </Button>
                    <Button 
                        variant={viewMode === 'settlement' ? 'default' : 'outline'}
                        onClick={() => setViewMode('settlement')}
                        size="sm"
                    >
                        Settlements
                    </Button>
                </div>

                <div className="space-y-4">
                    {currentData.map((location, idx) => {
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

                                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
                                    <div className="bg-white/80 rounded p-2 text-center">
                                        <div className="text-2xl font-bold text-amber-600">{location.titles}</div>
                                        <div className="text-xs text-slate-600">League Titles</div>
                                    </div>
                                    <div className="bg-white/80 rounded p-2 text-center">
                                        <div className="text-2xl font-bold text-orange-600">{location.cupTitles}</div>
                                        <div className="text-xs text-slate-600">Cup Titles</div>
                                    </div>
                                    <div className="bg-white/80 rounded p-2 text-center">
                                        <div className="text-2xl font-bold text-emerald-600">{location.topThreeFinishes}</div>
                                        <div className="text-xs text-slate-600">Top 3 Finishes</div>
                                    </div>
                                    <div className="bg-white/80 rounded p-2 text-center">
                                        <div className="text-2xl font-bold text-blue-600">{location.clubs.length}</div>
                                        <div className="text-xs text-slate-600">Clubs</div>
                                    </div>
                                    <div className="bg-white/80 rounded p-2 text-center">
                                        <div className="text-2xl font-bold text-slate-600">{location.avgTopFlightSeasons}</div>
                                        <div className="text-xs text-slate-600">Avg Top Flight</div>
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