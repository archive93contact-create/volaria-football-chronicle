import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { MapPin, Users, Shield, ChevronRight, Search, Globe, Building2, Home, Star } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from '@/components/common/PageHeader';

// Estimate population based on clubs in location
function estimateLocationPopulation(clubCount, locationType) {
    const baseMultipliers = {
        region: 500000,
        district: 100000,
        settlement: 25000
    };
    const base = baseMultipliers[locationType] || 50000;
    const population = clubCount * base + Math.floor(Math.random() * base * 0.5);
    
    if (population >= 1000000) {
        return `${(population / 1000000).toFixed(1)}M`;
    }
    return `${Math.round(population / 1000)}K`;
}

export default function Locations() {
    const urlParams = new URLSearchParams(window.location.search);
    const nationId = urlParams.get('nation_id');
    const locationType = urlParams.get('type') || 'all';
    
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState(locationType);

    const { data: nations = [] } = useQuery({
        queryKey: ['nations'],
        queryFn: () => base44.entities.Nation.list(),
    });

    const { data: clubs = [] } = useQuery({
        queryKey: ['allClubs'],
        queryFn: () => base44.entities.Club.list(),
    });

    const nation = nations.find(n => n.id === nationId);
    const filteredClubs = nationId ? clubs.filter(c => c.nation_id === nationId) : clubs;

    // Extract all unique locations
    const locations = useMemo(() => {
        const regions = new Map();
        const districts = new Map();
        const settlements = new Map();

        filteredClubs.forEach(club => {
            const clubNation = nations.find(n => n.id === club.nation_id);
            
            if (club.region) {
                const key = `${club.nation_id}-${club.region}`;
                if (!regions.has(key)) {
                    regions.set(key, {
                        name: club.region,
                        type: 'region',
                        nation: clubNation,
                        clubs: [],
                        districts: new Set(),
                        settlements: new Set()
                    });
                }
                regions.get(key).clubs.push(club);
                if (club.district) regions.get(key).districts.add(club.district);
                if (club.settlement || club.city) regions.get(key).settlements.add(club.settlement || club.city);
            }

            if (club.district) {
                const key = `${club.nation_id}-${club.district}`;
                if (!districts.has(key)) {
                    districts.set(key, {
                        name: club.district,
                        type: 'district',
                        nation: clubNation,
                        region: club.region,
                        clubs: [],
                        settlements: new Set()
                    });
                }
                districts.get(key).clubs.push(club);
                if (club.settlement || club.city) districts.get(key).settlements.add(club.settlement || club.city);
            }

            if (club.settlement || club.city) {
                const settlementName = club.settlement || club.city;
                const key = `${club.nation_id}-${settlementName}`;
                if (!settlements.has(key)) {
                    settlements.set(key, {
                        name: settlementName,
                        type: 'settlement',
                        nation: clubNation,
                        region: club.region,
                        district: club.district,
                        clubs: []
                    });
                }
                settlements.get(key).clubs.push(club);
            }
        });

        return {
            regions: Array.from(regions.values()).sort((a, b) => b.clubs.length - a.clubs.length),
            districts: Array.from(districts.values()).sort((a, b) => b.clubs.length - a.clubs.length),
            settlements: Array.from(settlements.values()).sort((a, b) => b.clubs.length - a.clubs.length)
        };
    }, [filteredClubs, nations]);

    // Filter by search
    const filterBySearch = (items) => {
        if (!search) return items;
        const term = search.toLowerCase();
        return items.filter(item => 
            item.name.toLowerCase().includes(term) ||
            item.nation?.name.toLowerCase().includes(term)
        );
    };

    const renderLocationCard = (location) => {
        const icon = location.type === 'region' ? Globe : location.type === 'district' ? Building2 : Home;
        const Icon = icon;
        const isCapital = location.type === 'settlement' && location.nation?.capital?.toLowerCase() === location.name.toLowerCase();
        
        return (
            <Link 
                key={`${location.type}-${location.nation?.id}-${location.name}`}
                to={createPageUrl(`LocationDetail?name=${encodeURIComponent(location.name)}&type=${location.type}&nation_id=${location.nation?.id}`)}
            >
                <Card className={`border-0 shadow-sm hover:shadow-lg transition-all hover:-translate-y-0.5 ${isCapital ? 'ring-2 ring-amber-300 bg-amber-50/50' : ''}`}>
                    <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isCapital ? 'bg-gradient-to-br from-amber-200 to-yellow-200' : 'bg-gradient-to-br from-emerald-100 to-teal-100'}`}>
                                <Icon className={`w-6 h-6 ${isCapital ? 'text-amber-600' : 'text-emerald-600'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-bold text-slate-900 truncate">{location.name}</h3>
                                    {isCapital && <Star className="w-4 h-4 text-amber-500 fill-amber-500" />}
                                    <Badge variant="outline" className="text-xs">
                                        {location.type}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-slate-500 flex-wrap">
                                    {location.nation && (
                                        <span className="flex items-center gap-1">
                                            {location.nation.flag_url && (
                                                <img src={location.nation.flag_url} alt="" className="w-4 h-3 object-cover rounded" />
                                            )}
                                            {location.nation.name}
                                        </span>
                                    )}
                                    <span className="flex items-center gap-1">
                                        <Shield className="w-3 h-3" />
                                        {location.clubs.length} club{location.clubs.length !== 1 ? 's' : ''}
                                    </span>
                                    {location.type === 'region' && location.districts?.size > 0 && (
                                        <span className="flex items-center gap-1">
                                            <Building2 className="w-3 h-3" />
                                            {location.districts.size} district{location.districts.size !== 1 ? 's' : ''}
                                        </span>
                                    )}
                                    {(location.type === 'region' || location.type === 'district') && location.settlements?.size > 0 && (
                                        <span className="flex items-center gap-1">
                                            <Home className="w-3 h-3" />
                                            {location.settlements.size} settlement{location.settlements.size !== 1 ? 's' : ''}
                                        </span>
                                    )}
                                    <span className="flex items-center gap-1">
                                        <Users className="w-3 h-3" />
                                        ~{estimateLocationPopulation(location.clubs.length, location.type)}
                                    </span>
                                </div>
                                {location.region && location.type !== 'region' && (
                                    <div className="text-xs text-slate-400 mt-1">
                                        {location.region}{location.district && location.type === 'settlement' ? ` › ${location.district}` : ''}
                                    </div>
                                )}
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-400" />
                        </div>
                    </CardContent>
                </Card>
            </Link>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <PageHeader 
                title={nation ? `${nation.name} Locations` : 'All Locations'}
                subtitle="Regions, districts and settlements across the football world"
                image={nation?.flag_url}
                breadcrumbs={[
                    { label: 'Nations', url: createPageUrl('Nations') },
                    ...(nation ? [{ label: nation.name, url: createPageUrl(`NationDetail?id=${nation.id}`) }] : []),
                    { label: 'Locations' }
                ]}
            />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Search */}
                <div className="mb-6">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Search locations..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-4 text-center">
                            <Globe className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                            <div className="text-2xl font-bold">{locations.regions.length}</div>
                            <div className="text-xs text-slate-500">Regions</div>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-4 text-center">
                            <Building2 className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                            <div className="text-2xl font-bold">{locations.districts.length}</div>
                            <div className="text-xs text-slate-500">Districts</div>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-4 text-center">
                            <Home className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                            <div className="text-2xl font-bold">{locations.settlements.length}</div>
                            <div className="text-xs text-slate-500">Settlements</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="mb-6">
                        <TabsTrigger value="all">All</TabsTrigger>
                        <TabsTrigger value="region">Regions ({locations.regions.length})</TabsTrigger>
                        <TabsTrigger value="district">Districts ({locations.districts.length})</TabsTrigger>
                        <TabsTrigger value="settlement">Settlements ({locations.settlements.length})</TabsTrigger>
                    </TabsList>

                    <TabsContent value="all">
                        <div className="space-y-3">
                            {filterBySearch([...locations.regions, ...locations.districts, ...locations.settlements])
                                .slice(0, 50)
                                .map(renderLocationCard)}
                        </div>
                    </TabsContent>

                    <TabsContent value="region">
                        <div className="space-y-3">
                            {filterBySearch(locations.regions).map(renderLocationCard)}
                            {locations.regions.length === 0 && (
                                <p className="text-center text-slate-500 py-8">No regions defined yet</p>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="district">
                        <div className="space-y-3">
                            {filterBySearch(locations.districts).map(renderLocationCard)}
                            {locations.districts.length === 0 && (
                                <p className="text-center text-slate-500 py-8">No districts defined yet</p>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="settlement">
                        <div className="space-y-3">
                            {filterBySearch(locations.settlements).map(renderLocationCard)}
                            {locations.settlements.length === 0 && (
                                <p className="text-center text-slate-500 py-8">No settlements defined yet</p>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}