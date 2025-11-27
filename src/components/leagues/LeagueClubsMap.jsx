import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function LeagueClubsMap({ clubs = [], nation }) {
    const locationData = useMemo(() => {
        if (clubs.length === 0) return null;

        // Group by region
        const byRegion = {};
        clubs.forEach(club => {
            const region = club.region || 'Unknown';
            if (!byRegion[region]) {
                byRegion[region] = { clubs: [], districts: {} };
            }
            byRegion[region].clubs.push(club);

            // Group by district within region
            const district = club.district || 'Unknown';
            if (!byRegion[region].districts[district]) {
                byRegion[region].districts[district] = [];
            }
            byRegion[region].districts[district].push(club);
        });

        return {
            byRegion,
            totalRegions: Object.keys(byRegion).length,
            regionList: Object.entries(byRegion)
                .map(([name, data]) => ({ name, ...data }))
                .sort((a, b) => b.clubs.length - a.clubs.length)
        };
    }, [clubs]);

    if (!locationData) return null;

    return (
        <Card className="border-0 shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-emerald-500" />
                    Geographic Distribution
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {locationData.regionList.map(region => (
                        <div key={region.name} className="p-4 bg-slate-50 rounded-lg">
                            <div className="flex items-center justify-between mb-3">
                                <Link 
                                    to={createPageUrl(`LocationDetail?name=${encodeURIComponent(region.name)}&type=region&nation_id=${nation?.id}`)}
                                    className="font-semibold text-slate-800 hover:text-emerald-600"
                                >
                                    {region.name}
                                </Link>
                                <span className="text-sm text-slate-500">{region.clubs.length} clubs</span>
                            </div>
                            
                            <div className="space-y-2">
                                {Object.entries(region.districts).slice(0, 4).map(([district, districtClubs]) => (
                                    <div key={district} className="pl-3 border-l-2 border-slate-200">
                                        <div className="text-sm text-slate-600 mb-1">{district}</div>
                                        <div className="flex flex-wrap gap-1">
                                            {districtClubs.slice(0, 5).map(club => (
                                                <Link
                                                    key={club.id}
                                                    to={createPageUrl(`ClubDetail?id=${club.id}`)}
                                                    className="flex items-center gap-1 px-2 py-0.5 bg-white rounded text-xs hover:bg-emerald-50"
                                                >
                                                    {club.logo_url ? (
                                                        <img src={club.logo_url} alt="" className="w-3 h-3 object-contain" />
                                                    ) : (
                                                        <Shield className="w-3 h-3 text-slate-400" />
                                                    )}
                                                    {club.name}
                                                </Link>
                                            ))}
                                            {districtClubs.length > 5 && (
                                                <span className="text-xs text-slate-400 px-2">+{districtClubs.length - 5} more</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {Object.keys(region.districts).length > 4 && (
                                    <div className="text-xs text-slate-400 pl-3">
                                        +{Object.keys(region.districts).length - 4} more districts
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}