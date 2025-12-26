import React, { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMapEvents, useMap } from 'react-leaflet';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import { Shield, MapPin, Globe, Edit2, Save, X, Layers } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import AdminOnly from '@/components/common/AdminOnly';
import PageHeader from '@/components/common/PageHeader';
import GeographyGenerator from '@/components/map/GeographyGenerator';
import MapEditor from '@/components/map/MapEditor';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Custom CRS for fictional world (0-1000 coordinate system)
const VolariaCRS = L.extend({}, L.CRS.Simple, {
    projection: L.Projection.LonLat,
    transformation: new L.Transformation(1, 0, -1, 1000)
});

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component to handle map clicks for editing
function MapClickHandler({ onMapClick, isEditing }) {
    useMapEvents({
        click: (e) => {
            if (isEditing) {
                onMapClick(e.latlng);
            }
        },
    });
    return null;
}

// Component to recenter map
function RecenterMap({ center, zoom }) {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.setView(center, zoom);
        }
    }, [center, zoom, map]);
    return null;
}

export default function WorldMap() {
    const queryClient = useQueryClient();
    const [editMode, setEditMode] = useState(null); // { type: 'nation'|'club'|'location', id: string }
    const [editingEntity, setEditingEntity] = useState(null);
    const [showClubs, setShowClubs] = useState(true);
    const [showLocations, setShowLocations] = useState(true);
    const [showNationBorders, setShowNationBorders] = useState(true);
    const [selectedNation, setSelectedNation] = useState(null);
    const [mapCenter, setMapCenter] = useState([500, 500]);
    const [mapZoom, setMapZoom] = useState(3);

    const { data: nations = [], refetch: refetchNations } = useQuery({
        queryKey: ['nations'],
        queryFn: () => base44.entities.Nation.list(),
    });

    const { data: clubs = [], refetch: refetchClubs } = useQuery({
        queryKey: ['clubs'],
        queryFn: () => base44.entities.Club.list(),
    });

    const { data: locations = [], refetch: refetchLocations } = useQuery({
        queryKey: ['locations'],
        queryFn: () => base44.entities.Location.list(),
    });

    const { data: leagues = [] } = useQuery({
        queryKey: ['leagues'],
        queryFn: () => base44.entities.League.list(),
    });

    const handleGeographyGenerated = () => {
        refetchNations();
        refetchClubs();
        refetchLocations();
    };

    const handleEntityUpdate = () => {
        queryClient.invalidateQueries(['nations']);
        queryClient.invalidateQueries(['clubs']);
        queryClient.invalidateQueries(['locations']);
        setEditingEntity(null);
    };

    const updateNationMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.Nation.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['nations']);
            setEditMode(null);
        },
    });

    const updateClubMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.Club.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['clubs']);
            setEditMode(null);
        },
    });

    const updateLocationMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.Location.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['locations']);
            setEditMode(null);
        },
    });

    const handleMapClick = (latlng) => {
        if (!editMode) return;

        const lat = Math.round(latlng.lat);
        const lng = Math.round(latlng.lng);

        if (editMode.type === 'nation') {
            updateNationMutation.mutate({
                id: editMode.id,
                data: { latitude: lat, longitude: lng }
            });
        } else if (editMode.type === 'club') {
            updateClubMutation.mutate({
                id: editMode.id,
                data: { latitude: lat, longitude: lng }
            });
        } else if (editMode.type === 'location') {
            updateLocationMutation.mutate({
                id: editMode.id,
                data: { latitude: lat, longitude: lng }
            });
        }
    };

    // Filter clubs by selected nation
    const visibleClubs = useMemo(() => {
        if (!showClubs) return [];
        if (selectedNation) {
            return clubs.filter(c => c.nation_id === selectedNation);
        }
        return clubs;
    }, [clubs, showClubs, selectedNation]);

    // Filter locations by selected nation
    const visibleLocations = useMemo(() => {
        if (!showLocations) return [];
        if (selectedNation) {
            return locations.filter(l => l.nation_id === selectedNation);
        }
        return locations;
    }, [locations, showLocations, selectedNation]);

    // Create custom icons for clubs based on tier
    const getClubIcon = (club) => {
        const league = leagues.find(l => l.id === club.league_id);
        const tier = league?.tier || 5;
        const size = tier === 1 ? 30 : tier === 2 ? 25 : 20;
        const color = club.primary_color || '#3b82f6';
        
        return L.divIcon({
            className: 'custom-club-icon',
            html: `<div style="background-color: ${color}; width: ${size}px; height: ${size}px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
                ${club.logo_url ? `<img src="${club.logo_url}" style="width: ${size-8}px; height: ${size-8}px; object-fit: contain; border-radius: 50%;" />` : ''}
            </div>`,
            iconSize: [size, size],
            iconAnchor: [size/2, size/2],
        });
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <PageHeader 
                title="World Map"
                subtitle={`Interactive map of Volaria - ${nations.length} nations, ${clubs.length} clubs`}
                breadcrumbs={[{ label: 'World Map' }]}
            />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Admin Actions */}
                <AdminOnly>
                    <div className="mb-4 flex justify-end">
                        <GeographyGenerator 
                            nations={nations}
                            clubs={clubs}
                            locations={locations}
                            onComplete={handleGeographyGenerated}
                        />
                    </div>
                </AdminOnly>

                {/* Controls */}
                <Card className="mb-4">
                    <CardContent className="p-4">
                        <div className="flex flex-wrap items-center gap-4">
                            <div className="flex items-center gap-2">
                                <Switch id="clubs" checked={showClubs} onCheckedChange={setShowClubs} />
                                <Label htmlFor="clubs" className="cursor-pointer">Show Clubs</Label>
                            </div>
                            <div className="flex items-center gap-2">
                                <Switch id="locations" checked={showLocations} onCheckedChange={setShowLocations} />
                                <Label htmlFor="locations" className="cursor-pointer">Show Locations</Label>
                            </div>
                            <div className="flex items-center gap-2">
                                <Switch id="borders" checked={showNationBorders} onCheckedChange={setShowNationBorders} />
                                <Label htmlFor="borders" className="cursor-pointer">Show Borders</Label>
                            </div>
                            
                            <div className="flex items-center gap-2 ml-auto">
                                <Label>Filter by Nation:</Label>
                                <select 
                                    value={selectedNation || ''} 
                                    onChange={(e) => {
                                        const nationId = e.target.value;
                                        setSelectedNation(nationId || null);
                                        if (nationId) {
                                            const nation = nations.find(n => n.id === nationId);
                                            if (nation?.latitude && nation?.longitude) {
                                                setMapCenter([nation.latitude, nation.longitude]);
                                                setMapZoom(5);
                                            }
                                        } else {
                                            setMapCenter([500, 500]);
                                            setMapZoom(3);
                                        }
                                    }}
                                    className="px-3 py-2 border rounded-lg"
                                >
                                    <option value="">All Nations</option>
                                    {nations.map(n => (
                                        <option key={n.id} value={n.id}>{n.name}</option>
                                    ))}
                                </select>
                            </div>

                            {editMode && (
                                <div className="flex items-center gap-2 px-3 py-2 bg-amber-100 border border-amber-300 rounded-lg">
                                    <Edit2 className="w-4 h-4 text-amber-700" />
                                    <span className="text-sm text-amber-800">Click map to place</span>
                                    <Button size="sm" variant="ghost" onClick={() => setEditMode(null)}>
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Map */}
                <Card className="overflow-hidden">
                    <CardContent className="p-0">
                        <div style={{ height: '600px', backgroundColor: '#e8f4f8' }}>
                            <MapContainer
                                center={mapCenter}
                                zoom={mapZoom}
                                style={{ height: '100%', width: '100%' }}
                                crs={VolariaCRS}
                                minZoom={2}
                                maxZoom={7}
                            >
                                <RecenterMap center={mapCenter} zoom={mapZoom} />
                                <MapClickHandler onMapClick={handleMapClick} isEditing={!!editMode} />
                                
                                {/* Nation Borders */}
                                {showNationBorders && nations.filter(n => n.map_bounds).map(nation => (
                                    <Polygon
                                        key={nation.id}
                                        positions={[
                                            [nation.map_bounds.north, nation.map_bounds.west],
                                            [nation.map_bounds.north, nation.map_bounds.east],
                                            [nation.map_bounds.south, nation.map_bounds.east],
                                            [nation.map_bounds.south, nation.map_bounds.west],
                                        ]}
                                        pathOptions={{
                                            color: nation.primary_color || '#64748b',
                                            fillColor: nation.primary_color || '#64748b',
                                            fillOpacity: 0.1,
                                            weight: 2,
                                        }}
                                    >
                                        <Popup>
                                            <div className="p-2">
                                                <div className="flex items-center gap-2 mb-2">
                                                    {nation.flag_url && <img src={nation.flag_url} alt={nation.name} className="w-8 h-6 object-cover rounded" />}
                                                    <strong className="text-lg">{nation.name}</strong>
                                                </div>
                                                <Link to={createPageUrl(`NationDetail?id=${nation.id}`)} className="text-blue-600 hover:underline text-sm">
                                                    View Details →
                                                </Link>
                                                <AdminOnly>
                                                    <div className="flex gap-2 mt-2">
                                                        <Button 
                                                            size="sm" 
                                                            variant="outline" 
                                                            className="flex-1"
                                                            onClick={() => setEditMode({ type: 'nation', id: nation.id })}
                                                        >
                                                            Move
                                                        </Button>
                                                        <Button 
                                                            size="sm" 
                                                            variant="outline" 
                                                            className="flex-1"
                                                            onClick={() => setEditingEntity({ entity: nation, type: 'nation' })}
                                                        >
                                                            <Edit2 className="w-3 h-3 mr-1" /> Edit
                                                        </Button>
                                                    </div>
                                                </AdminOnly>
                                            </div>
                                        </Popup>
                                    </Polygon>
                                ))}

                                {/* Nation Centers (for nations without borders) */}
                                {nations.filter(n => n.latitude && n.longitude && !n.map_bounds).map(nation => (
                                    <Marker
                                        key={`nation-${nation.id}`}
                                        position={[nation.latitude, nation.longitude]}
                                        icon={L.divIcon({
                                            className: 'custom-nation-icon',
                                            html: `<div style="position: relative;">
                                                ${nation.flag_url ? `<img src="${nation.flag_url}" style="width: 40px; height: 30px; object-fit: cover; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); border-radius: 4px;" />` : ''}
                                            </div>`,
                                            iconSize: [40, 30],
                                            iconAnchor: [20, 15],
                                        })}
                                    >
                                        <Popup>
                                            <div className="p-2">
                                                <strong className="text-lg">{nation.name}</strong>
                                                <div className="text-sm text-slate-600 mt-1">{nation.region}</div>
                                                <Link to={createPageUrl(`NationDetail?id=${nation.id}`)} className="text-blue-600 hover:underline text-sm block mt-2">
                                                    View Details →
                                                </Link>
                                                <AdminOnly>
                                                    <div className="flex gap-2 mt-2">
                                                        <Button 
                                                            size="sm" 
                                                            variant="outline" 
                                                            className="flex-1"
                                                            onClick={() => setEditMode({ type: 'nation', id: nation.id })}
                                                        >
                                                            Move
                                                        </Button>
                                                        <Button 
                                                            size="sm" 
                                                            variant="outline" 
                                                            className="flex-1"
                                                            onClick={() => setEditingEntity({ entity: nation, type: 'nation' })}
                                                        >
                                                            <Edit2 className="w-3 h-3 mr-1" /> Edit
                                                        </Button>
                                                    </div>
                                                </AdminOnly>
                                            </div>
                                        </Popup>
                                    </Marker>
                                ))}

                                {/* Clubs */}
                                {visibleClubs.filter(c => c.latitude && c.longitude).map(club => {
                                    const nation = nations.find(n => n.id === club.nation_id);
                                    const league = leagues.find(l => l.id === club.league_id);
                                    return (
                                        <Marker
                                            key={`club-${club.id}`}
                                            position={[club.latitude, club.longitude]}
                                            icon={getClubIcon(club)}
                                        >
                                            <Popup>
                                                <div className="p-2 min-w-[200px]">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        {club.logo_url && <img src={club.logo_url} alt={club.name} className="w-8 h-8 object-contain bg-white rounded" />}
                                                        <strong className="text-lg">{club.name}</strong>
                                                    </div>
                                                    {nation && (
                                                        <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
                                                            {nation.flag_url && <img src={nation.flag_url} alt={nation.name} className="w-5 h-4 object-cover rounded" />}
                                                            {nation.name}
                                                        </div>
                                                    )}
                                                    {league && (
                                                        <Badge className="mb-2">{league.name} (T{league.tier})</Badge>
                                                    )}
                                                    {club.settlement && (
                                                        <div className="text-sm text-slate-600 flex items-center gap-1 mb-2">
                                                            <MapPin className="w-3 h-3" /> {club.settlement}
                                                        </div>
                                                    )}
                                                    <Link to={createPageUrl(`ClubDetail?id=${club.id}`)} className="text-blue-600 hover:underline text-sm block">
                                                        View Club →
                                                    </Link>
                                                    <AdminOnly>
                                                        <div className="flex gap-2 mt-2">
                                                            <Button 
                                                                size="sm" 
                                                                variant="outline" 
                                                                className="flex-1"
                                                                onClick={() => setEditMode({ type: 'club', id: club.id })}
                                                            >
                                                                Move
                                                            </Button>
                                                            <Button 
                                                                size="sm" 
                                                                variant="outline" 
                                                                className="flex-1"
                                                                onClick={() => setEditingEntity({ entity: club, type: 'club' })}
                                                            >
                                                                <Edit2 className="w-3 h-3 mr-1" /> Edit
                                                            </Button>
                                                        </div>
                                                    </AdminOnly>
                                                </div>
                                            </Popup>
                                        </Marker>
                                    );
                                })}

                                {/* Locations */}
                                {visibleLocations.filter(l => l.latitude && l.longitude).map(location => {
                                    const nation = nations.find(n => n.id === location.nation_id);
                                    return (
                                        <Marker
                                            key={`location-${location.id}`}
                                            position={[location.latitude, location.longitude]}
                                            icon={L.divIcon({
                                                className: 'custom-location-icon',
                                                html: `<div style="background-color: ${location.is_capital ? '#fbbf24' : '#64748b'}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 1px 4px rgba(0,0,0,0.3);"></div>`,
                                                iconSize: [12, 12],
                                                iconAnchor: [6, 6],
                                            })}
                                        >
                                            <Popup>
                                                <div className="p-2">
                                                    <strong className="text-base">{location.name}</strong>
                                                    <div className="text-sm text-slate-600">
                                                        {location.type} {location.is_capital && '⭐ Capital'}
                                                    </div>
                                                    {nation && <div className="text-xs text-slate-500 mt-1">{nation.name}</div>}
                                                    <Link to={createPageUrl(`LocationDetail?name=${encodeURIComponent(location.name)}&type=${location.type}&nation_id=${location.nation_id}`)} className="text-blue-600 hover:underline text-sm block mt-2">
                                                        View Details →
                                                    </Link>
                                                    <AdminOnly>
                                                        <div className="flex gap-2 mt-2">
                                                            <Button 
                                                                size="sm" 
                                                                variant="outline" 
                                                                className="flex-1"
                                                                onClick={() => setEditMode({ type: 'location', id: location.id })}
                                                            >
                                                                Move
                                                            </Button>
                                                            <Button 
                                                                size="sm" 
                                                                variant="outline" 
                                                                className="flex-1"
                                                                onClick={() => setEditingEntity({ entity: location, type: 'location' })}
                                                            >
                                                                <Edit2 className="w-3 h-3 mr-1" /> Edit
                                                            </Button>
                                                        </div>
                                                    </AdminOnly>
                                                </div>
                                            </Popup>
                                        </Marker>
                                    );
                                })}
                            </MapContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Legend */}
                <Card className="mt-4">
                    <CardContent className="p-4">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <Layers className="w-5 h-5" /> Map Legend
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full border-2 border-white shadow" style={{ backgroundColor: '#3b82f6' }}></div>
                                <span>Tier 1 Club</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full border-2 border-white shadow" style={{ backgroundColor: '#64748b' }}></div>
                                <span>Lower Tier Club</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full border-2 border-white shadow" style={{ backgroundColor: '#fbbf24' }}></div>
                                <span>Capital City</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full border-2 border-white shadow" style={{ backgroundColor: '#64748b' }}></div>
                                <span>Settlement</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Edit Dialog */}
            {editingEntity && (
                <MapEditor 
                    entity={editingEntity.entity}
                    type={editingEntity.type}
                    onClose={() => setEditingEntity(null)}
                    onUpdate={handleEntityUpdate}
                />
            )}
        </div>
    );
}