import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { MapPin, Users, Shield, ChevronRight, Trophy, Globe, Building2, Home, TrendingUp, Star, Landmark } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import PageHeader from '@/components/common/PageHeader';
import LocationNarratives from '@/components/locations/LocationNarratives';

// Estimate population for a single settlement
function estimateSettlementPopulation(locationName, clubs, isCapital = false) {
    const seed = locationName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const pseudoRandom = (min, max) => {
        const x = Math.sin(seed) * 10000;
        const rand = x - Math.floor(x);
        return Math.floor(rand * (max - min + 1)) + min;
    };
    
    let base = 20000;
    
    // Calculate tier bonus - higher tier clubs = larger population
    let tierBonus = 0;
    clubs.forEach(club => {
        if (club.league_id) tierBonus += 15000;
        if (club.seasons_top_flight > 0) tierBonus += club.seasons_top_flight * 2000;
        if (club.league_titles > 0) tierBonus += club.league_titles * 10000;
    });
    
    if (isCapital) {
        base = 300000;
    }
    
    const variance = 0.7 + (pseudoRandom(0, 70) / 100);
    let population = Math.floor((clubs.length * base + tierBonus + base * 0.3) * variance);
    const remainder = pseudoRandom(100, 9999);
    population = Math.floor(population / 10000) * 10000 + remainder;
    
    if (isCapital && population < 600000) {
        population = 600000 + (clubs.length * 120000) + pseudoRandom(10000, 99999);
    }
    
    return population;
}

// Estimate population by aggregating child locations
function estimatePopulation(locationType, locationClubs, allClubs, nationId, nation, locationName) {
    const seed = locationName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const pseudoRandom = (min, max) => {
        const x = Math.sin(seed) * 10000;
        const rand = x - Math.floor(x);
        return Math.floor(rand * (max - min + 1)) + min;
    };
    
    let totalPopulation = 0;
    
    if (locationType === 'settlement') {
        const isCapital = nation?.capital?.toLowerCase() === locationName.toLowerCase();
        totalPopulation = estimateSettlementPopulation(locationName, locationClubs, isCapital);
    } else {
        // For regions/districts, aggregate settlement populations
        const settlements = new Map();
        locationClubs.forEach(club => {
            const settlementName = club.settlement || club.city;
            if (settlementName) {
                if (!settlements.has(settlementName)) {
                    settlements.set(settlementName, []);
                }
                settlements.get(settlementName).push(club);
            }
        });
        
        settlements.forEach((clubs, name) => {
            const isCapital = nation?.capital?.toLowerCase() === name.toLowerCase();
            totalPopulation += estimateSettlementPopulation(name, clubs, isCapital);
        });
        
        // Add rural population (people not in tracked settlements)
        const ruralBase = locationType === 'region' ? 100000 : 30000;
        const ruralVariance = 0.5 + (pseudoRandom(0, 100) / 100);
        totalPopulation += Math.floor(ruralBase * ruralVariance) + pseudoRandom(1000, 9999);
    }
    
    if (totalPopulation >= 1000000) {
        return { value: totalPopulation, display: `${(totalPopulation / 1000000).toFixed(2)} million` };
    }
    return { value: totalPopulation, display: totalPopulation.toLocaleString() };
}

export default function LocationDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    const locationNameParam = urlParams.get('name');
    const locationType = urlParams.get('type') || 'settlement';
    const nationId = urlParams.get('nation_id');

    const { data: nations = [] } = useQuery({
        queryKey: ['nations'],
        queryFn: () => base44.entities.Nation.list(),
    });

    const { data: clubs = [] } = useQuery({
        queryKey: ['allClubs'],
        queryFn: () => base44.entities.Club.list(),
    });

    const { data: leagues = [] } = useQuery({
        queryKey: ['allLeagues'],
        queryFn: () => base44.entities.League.list(),
    });

    const nation = nations.find(n => n.id === nationId);
    
    // Check if this location is the capital
    const isCapital = nation?.capital && locationNameParam && 
        nation.capital.toLowerCase() === locationNameParam.toLowerCase();

    // Find the actual location name with correct case from clubs data
    const locationName = useMemo(() => {
        if (!locationNameParam) return null;
        const searchName = locationNameParam.toLowerCase();
        
        for (const club of clubs) {
            if (nationId && club.nation_id !== nationId) continue;
            
            if (locationType === 'region' && club.region?.toLowerCase() === searchName) {
                return club.region;
            } else if (locationType === 'district' && club.district?.toLowerCase() === searchName) {
                return club.district;
            } else if (locationType === 'settlement') {
                if (club.settlement?.toLowerCase() === searchName) return club.settlement;
                if (club.city?.toLowerCase() === searchName) return club.city;
            }
        }
        // Fallback: capitalize first letter of each word
        return locationNameParam.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    }, [clubs, locationNameParam, locationType, nationId]);

    // Find all clubs in this location (case-insensitive matching)
    const locationClubs = useMemo(() => {
        if (!locationNameParam) return [];
        const searchName = locationNameParam.toLowerCase();
        
        return clubs.filter(club => {
            if (nationId && club.nation_id !== nationId) return false;
            
            if (locationType === 'region') {
                return club.region?.toLowerCase() === searchName;
            } else if (locationType === 'district') {
                return club.district?.toLowerCase() === searchName;
            } else {
                return club.settlement?.toLowerCase() === searchName || club.city?.toLowerCase() === searchName;
            }
        });
    }, [clubs, locationNameParam, locationType, nationId]);

    // Get sub-locations
    const subLocations = useMemo(() => {
        if (locationType === 'region') {
            const districts = new Map();
            const settlements = new Map();
            locationClubs.forEach(club => {
                if (club.district) {
                    if (!districts.has(club.district)) {
                        districts.set(club.district, { name: club.district, clubs: [] });
                    }
                    districts.get(club.district).clubs.push(club);
                }
                if (club.settlement || club.city) {
                    const name = club.settlement || club.city;
                    if (!settlements.has(name)) {
                        settlements.set(name, { name, clubs: [] });
                    }
                    settlements.get(name).clubs.push(club);
                }
            });
            return {
                districts: Array.from(districts.values()).sort((a, b) => b.clubs.length - a.clubs.length),
                settlements: Array.from(settlements.values()).sort((a, b) => b.clubs.length - a.clubs.length)
            };
        } else if (locationType === 'district') {
            const settlements = new Map();
            locationClubs.forEach(club => {
                if (club.settlement || club.city) {
                    const name = club.settlement || club.city;
                    if (!settlements.has(name)) {
                        settlements.set(name, { name, clubs: [] });
                    }
                    settlements.get(name).clubs.push(club);
                }
            });
            return {
                settlements: Array.from(settlements.values()).sort((a, b) => b.clubs.length - a.clubs.length)
            };
        }
        return {};
    }, [locationClubs, locationType]);

    // Get parent location info
    const parentInfo = useMemo(() => {
        if (locationType === 'settlement' || locationType === 'district') {
            const firstClub = locationClubs[0];
            if (firstClub) {
                return {
                    region: firstClub.region,
                    district: locationType === 'settlement' ? firstClub.district : null
                };
            }
        }
        return {};
    }, [locationClubs, locationType]);

    // Display name with proper formatting
    const displayName = locationName || locationNameParam;

    // Stats
    const stats = useMemo(() => {
        const totalTrophies = locationClubs.reduce((sum, c) => sum + (c.league_titles || 0) + (c.domestic_cup_titles || 0), 0);
        const continentalTrophies = locationClubs.reduce((sum, c) => sum + (c.vcc_titles || 0) + (c.ccc_titles || 0), 0);
        const topFlightClubs = locationClubs.filter(c => {
            const league = leagues.find(l => l.id === c.league_id);
            return league?.tier === 1;
        }).length;
        
        return {
            population: estimatePopulation(locationType, locationClubs, clubs, nationId, nation, displayName),
            totalTrophies,
            continentalTrophies,
            topFlightClubs
        };
    }, [locationClubs, clubs, leagues, locationType, nationId, nation, displayName]);

    const typeIcon = locationType === 'region' ? Globe : locationType === 'district' ? Building2 : Home;
    const TypeIcon = typeIcon;

    if (!locationNameParam) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <p className="text-slate-500">Location not found</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <PageHeader 
                title={
                    <span className="flex items-center gap-2">
                        {displayName}
                        {isCapital && <Landmark className="w-6 h-6 text-amber-400" title="Capital City" />}
                    </span>
                }
                subtitle={`${isCapital ? 'Capital • ' : ''}${locationType.charAt(0).toUpperCase() + locationType.slice(1)} in ${nation?.name || 'Volaria'}`}
                image={nation?.flag_url}
                breadcrumbs={[
                    { label: 'Nations', url: createPageUrl('Nations') },
                    ...(nation ? [{ label: nation.name, url: createPageUrl(`NationDetail?id=${nation.id}`) }] : []),
                    { label: 'Locations', url: createPageUrl(`Locations${nationId ? `?nation_id=${nationId}` : ''}`) },
                    { label: displayName }
                ]}
            />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Capital Badge */}
                {isCapital && (
                    <Card className="border-0 shadow-sm mb-6 bg-gradient-to-r from-amber-50 to-yellow-50 border-l-4 border-l-amber-500">
                        <CardContent className="p-4 flex items-center gap-3">
                            <Landmark className="w-8 h-8 text-amber-600" />
                            <div>
                                <span className="font-semibold text-amber-800">National Capital of {nation?.name}</span>
                                <p className="text-sm text-amber-700">The political and cultural heart of the nation, home to the country's most prestigious institutions.</p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Location Narratives */}
                <LocationNarratives 
                    locationName={displayName}
                    locationType={locationType}
                    clubs={locationClubs}
                    leagues={leagues}
                    nation={nation}
                    isCapital={isCapital}
                    parentRegion={parentInfo.region}
                    parentDistrict={parentInfo.district}
                />

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-4 text-center">
                            <TypeIcon className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                            <div className="text-lg font-bold capitalize">{locationType}</div>
                            <div className="text-xs text-slate-500">Location Type</div>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-4 text-center">
                            <Users className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                            <div className="text-lg font-bold">~{stats.population.display}</div>
                            <div className="text-xs text-slate-500">Est. Population</div>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-4 text-center">
                            <Shield className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                            <div className="text-2xl font-bold">{locationClubs.length}</div>
                            <div className="text-xs text-slate-500">Clubs</div>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-4 text-center">
                            <TrendingUp className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                            <div className="text-2xl font-bold">{stats.topFlightClubs}</div>
                            <div className="text-xs text-slate-500">Top Flight</div>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-4 text-center">
                            <Trophy className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                            <div className="text-2xl font-bold">{stats.totalTrophies}</div>
                            <div className="text-xs text-slate-500">Domestic Trophies</div>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-4 text-center">
                            <Star className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
                            <div className="text-2xl font-bold">{stats.continentalTrophies}</div>
                            <div className="text-xs text-slate-500">Continental</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Parent Location Links */}
                {(parentInfo.region || parentInfo.district) && (
                    <Card className="border-0 shadow-sm mb-6">
                        <CardContent className="p-4 flex items-center gap-4 flex-wrap">
                            <span className="text-slate-500 text-sm">Located in:</span>
                            {parentInfo.region && (
                                <Link to={createPageUrl(`LocationDetail?name=${encodeURIComponent(parentInfo.region)}&type=region&nation_id=${nationId}`)}>
                                    <Badge variant="outline" className="hover:bg-slate-100">
                                        <Globe className="w-3 h-3 mr-1" />
                                        {parentInfo.region}
                                    </Badge>
                                </Link>
                            )}
                            {parentInfo.district && (
                                <Link to={createPageUrl(`LocationDetail?name=${encodeURIComponent(parentInfo.district)}&type=district&nation_id=${nationId}`)}>
                                    <Badge variant="outline" className="hover:bg-slate-100">
                                        <Building2 className="w-3 h-3 mr-1" />
                                        {parentInfo.district}
                                    </Badge>
                                </Link>
                            )}
                        </CardContent>
                    </Card>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Clubs List */}
                    <div className="lg:col-span-2">
                        <Card className="border-0 shadow-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Shield className="w-5 h-5 text-emerald-600" />
                                    Clubs in {displayName}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                {locationClubs.length === 0 ? (
                                    <p className="p-6 text-center text-slate-500">No clubs found in this location</p>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Club</TableHead>
                                                <TableHead>League</TableHead>
                                                <TableHead className="text-center">Titles</TableHead>
                                                <TableHead className="text-center">Cups</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {locationClubs
                                                .sort((a, b) => {
                                                    const aLeague = leagues.find(l => l.id === a.league_id);
                                                    const bLeague = leagues.find(l => l.id === b.league_id);
                                                    return (aLeague?.tier || 99) - (bLeague?.tier || 99);
                                                })
                                                .map(club => {
                                                    const league = leagues.find(l => l.id === club.league_id);
                                                    return (
                                                        <TableRow key={club.id}>
                                                            <TableCell>
                                                                <Link 
                                                                    to={createPageUrl(`ClubDetail?id=${club.id}`)}
                                                                    className="flex items-center gap-3 hover:text-emerald-600"
                                                                >
                                                                    {club.logo_url ? (
                                                                        <img src={club.logo_url} alt="" className="w-8 h-8 object-contain" />
                                                                    ) : (
                                                                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                                                                            <Shield className="w-4 h-4 text-slate-400" />
                                                                        </div>
                                                                    )}
                                                                    <span className="font-medium">{club.name}</span>
                                                                </Link>
                                                            </TableCell>
                                                            <TableCell>
                                                                {league ? (
                                                                    <Link to={createPageUrl(`LeagueDetail?id=${league.id}`)} className="text-slate-600 hover:text-emerald-600">
                                                                        {league.name}
                                                                        <span className="ml-1 text-xs text-slate-400">(T{league.tier})</span>
                                                                    </Link>
                                                                ) : '-'}
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                {club.league_titles > 0 ? (
                                                                    <span className="flex items-center justify-center gap-1 text-amber-600">
                                                                        <Trophy className="w-4 h-4" />
                                                                        {club.league_titles}
                                                                    </span>
                                                                ) : '-'}
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                {club.domestic_cup_titles > 0 ? (
                                                                    <span className="text-orange-600">{club.domestic_cup_titles}</span>
                                                                ) : '-'}
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sub-locations Sidebar */}
                    <div className="space-y-6">
                        {/* Districts (for regions) */}
                        {subLocations.districts?.length > 0 && (
                            <Card className="border-0 shadow-sm">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Building2 className="w-5 h-5 text-blue-500" />
                                        Districts
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {subLocations.districts.slice(0, 10).map(district => (
                                            <Link 
                                                key={district.name}
                                                to={createPageUrl(`LocationDetail?name=${encodeURIComponent(district.name)}&type=district&nation_id=${nationId}`)}
                                                className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-100"
                                            >
                                                <span className="font-medium text-sm">{district.name}</span>
                                                <Badge variant="outline">{district.clubs.length}</Badge>
                                            </Link>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Settlements */}
                        {subLocations.settlements?.length > 0 && (
                            <Card className="border-0 shadow-sm">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Home className="w-5 h-5 text-amber-500" />
                                        Settlements
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2 max-h-80 overflow-y-auto">
                                        {subLocations.settlements.slice(0, 15).map(settlement => (
                                            <Link 
                                                key={settlement.name}
                                                to={createPageUrl(`LocationDetail?name=${encodeURIComponent(settlement.name)}&type=settlement&nation_id=${nationId}`)}
                                                className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-100"
                                            >
                                                <span className="font-medium text-sm">{settlement.name}</span>
                                                <Badge variant="outline">{settlement.clubs.length}</Badge>
                                            </Link>
                                        ))}
                                        {subLocations.settlements.length > 15 && (
                                            <p className="text-xs text-slate-500 text-center pt-2">
                                                +{subLocations.settlements.length - 15} more
                                            </p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Most Successful Club */}
                        {locationClubs.length > 0 && (
                            <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-yellow-50">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Trophy className="w-5 h-5 text-amber-500" />
                                        Most Successful
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {(() => {
                                        const sorted = [...locationClubs].sort((a, b) => 
                                            ((b.league_titles || 0) + (b.domestic_cup_titles || 0)) - 
                                            ((a.league_titles || 0) + (a.domestic_cup_titles || 0))
                                        );
                                        const top = sorted[0];
                                        if (!top || ((top.league_titles || 0) + (top.domestic_cup_titles || 0)) === 0) {
                                            return <p className="text-slate-500 text-sm">No trophy winners yet</p>;
                                        }
                                        return (
                                            <Link to={createPageUrl(`ClubDetail?id=${top.id}`)} className="flex items-center gap-3">
                                                {top.logo_url ? (
                                                    <img src={top.logo_url} alt="" className="w-12 h-12 object-contain" />
                                                ) : (
                                                    <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
                                                        <Shield className="w-6 h-6 text-slate-400" />
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="font-bold text-slate-900">{top.name}</div>
                                                    <div className="text-sm text-amber-700">
                                                        {top.league_titles || 0} league, {top.domestic_cup_titles || 0} cup titles
                                                    </div>
                                                </div>
                                            </Link>
                                        );
                                    })()}
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}