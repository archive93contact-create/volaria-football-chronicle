import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Trophy, Star, TrendingUp } from 'lucide-react';

export default function GeographicSuccessMap({ seasons = [], clubs = [], nationId }) {
    const locationData = useMemo(() => {
        if (!seasons || seasons.length === 0) return { regions: [], districts: [], settlements: [] };

        // Track successes by location
        const regions = {};
        const districts = {};
        const settlements = {};

        seasons.forEach(season => {
            if (!season.champion_name) return;
            
            const club = clubs.find(c => c.name === season.champion_name);
            if (!club) return;

            // Count by region
            if (club.region) {
                if (!regions[club.region]) {
                    regions[club.region] = { name: club.region, titles: 0, clubs: new Set() };
                }
                regions[club.region].titles++;
                regions[club.region].clubs.add(club.name);
            }

            // Count by district
            if (club.district) {
                if (!districts[club.district]) {
                    districts[club.district] = { name: club.district, titles: 0, clubs: new Set(), region: club.region };
                }
                districts[club.district].titles++;
                districts[club.district].clubs.add(club.name);
            }

            // Count by settlement
            if (club.settlement) {
                if (!settlements[club.settlement]) {
                    settlements[club.settlement] = { name: club.settlement, titles: 0, clubs: new Set(), district: club.district, region: club.region };
                }
                settlements[club.settlement].titles++;
                settlements[club.settlement].clubs.add(club.name);
            }
        });

        // Convert Sets to counts and sort
        const processLocations = (obj) => Object.values(obj)
            .map(loc => ({ ...loc, uniqueClubs: loc.clubs.size }))
            .sort((a, b) => b.titles - a.titles);

        return {
            regions: processLocations(regions),
            districts: processLocations(districts),
            settlements: processLocations(settlements),
        };
    }, [seasons, clubs]);

    const hasData = locationData.regions.length > 0 || locationData.districts.length > 0 || locationData.settlements.length > 0;

    if (!hasData) {
        return null;
    }

    const LocationList = ({ locations, type, icon: Icon, color }) => {
        if (locations.length === 0) return null;

        return (
            <Card className="border-0 shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Icon className={`w-5 h-5 ${color}`} />
                        {type === 'region' ? 'Regions' : type === 'district' ? 'Districts' : 'Settlements'}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {locations.slice(0, 10).map((location, idx) => (
                            <Link
                                key={location.name}
                                to={createPageUrl(`LocationDetail?name=${encodeURIComponent(location.name)}&type=${type}&nation_id=${nationId}`)}
                                className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 border border-slate-100 transition-all"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                                        idx === 0 ? 'bg-amber-100 text-amber-700' :
                                        idx === 1 ? 'bg-slate-200 text-slate-700' :
                                        idx === 2 ? 'bg-orange-100 text-orange-700' :
                                        'bg-slate-50 text-slate-600'
                                    }`}>
                                        {idx + 1}
                                    </div>
                                    <div>
                                        <div className="font-semibold text-slate-900 hover:text-emerald-600">
                                            {location.name}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {location.uniqueClubs} champion{location.uniqueClubs > 1 ? 's' : ''} from here
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge className="bg-amber-500 text-white">
                                        <Trophy className="w-3 h-3 mr-1" />
                                        {location.titles}
                                    </Badge>
                                </div>
                            </Link>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    };

    return (
        <div className="space-y-6">
            <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-teal-50 border-l-4 border-l-emerald-500">
                <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                        <MapPin className="w-8 h-8 text-emerald-600" />
                        <div>
                            <div className="font-semibold text-emerald-900">Geographic Success Distribution</div>
                            <div className="text-sm text-emerald-700">
                                Which locations have produced the most champions across all leagues
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <LocationList locations={locationData.regions} type="region" icon={MapPin} color="text-emerald-600" />
                <LocationList locations={locationData.districts} type="district" icon={MapPin} color="text-blue-600" />
                <LocationList locations={locationData.settlements} type="settlement" icon={MapPin} color="text-amber-600" />
            </div>
        </div>
    );
}