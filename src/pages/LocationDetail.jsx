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
import EnhancedLocationDetail from '@/components/locations/EnhancedLocationDetail';
import PersonalizedLocationStory from '@/components/locations/PersonalizedLocationStory';

import { estimateNationPopulation, estimateLocationPopulation } from '@/components/common/populationUtils';

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

    const { data: allLeagueTables = [] } = useQuery({
        queryKey: ['allLeagueTables'],
        queryFn: () => base44.entities.LeagueTable.list(),
    });

    const { data: allLocations = [] } = useQuery({
        queryKey: ['allLocations'],
        queryFn: () => base44.entities.Location.list(),
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
            population: (() => {
                // Calculate nation population for context
                const nationClubs = clubs.filter(c => c.nation_id === nationId);
                const nationLeagues = leagues.filter(l => l.nation_id === nationId);
                const maxTier = Math.max(...nationLeagues.map(l => l.tier || 1), 1);
                const nationPop = estimateNationPopulation(nationClubs.length, nationLeagues.length, nation?.membership, maxTier);
                return estimateLocationPopulation(locationType, locationClubs, nation, displayName, nationPop.value);
            })(),
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
                <EnhancedLocationDetail
                    isCapital={isCapital}
                    locationName={locationName}
                    locationType={locationType}
                    nationId={nationId}
                    locationClubs={locationClubs}
                    nation={nation}
                    leagues={leagues}
                    clubs={clubs}
                    parentInfo={parentInfo}
                    subLocations={subLocations}
                    allLeagueTables={allLeagueTables}
                    allLocations={allLocations}
                />
            </div>
        </div>
    );
}