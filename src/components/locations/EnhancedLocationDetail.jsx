import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { MapPin, Users, Shield, Trophy, Star, Globe, Building2, Home, Landmark, Edit2, Save, X, Plus, Trash2, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import PageHeader from '@/components/common/PageHeader';
import LocationNarratives from '@/components/locations/LocationNarratives';
import AdminOnly from '@/components/common/AdminOnly';
import { estimateLocationPopulation } from '@/components/common/populationUtils';

export default function EnhancedLocationDetail({ 
    locationName, 
    locationType, 
    nationId,
    locationClubs,
    nation,
    leagues,
    clubs,
    parentInfo,
    subLocations
}) {
    const queryClient = useQueryClient();
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({});
    const [selectedClubIds, setSelectedClubIds] = useState([]);

    // Check if location exists in database
    const { data: existingLocation } = useQuery({
        queryKey: ['location', nationId, locationName, locationType],
        queryFn: async () => {
            const locs = await base44.entities.Location.filter({ 
                nation_id: nationId, 
                name: locationName, 
                type: locationType 
            });
            return locs[0] || null;
        },
        enabled: !!nationId && !!locationName,
    });

    const isCapital = nation?.capital?.toLowerCase() === locationName?.toLowerCase();

    // Predict settlement size
    const settlementSize = useMemo(() => {
        if (locationType !== 'settlement') return null;
        const clubCount = locationClubs.length;
        if (isCapital || clubCount >= 3) return 'city';
        if (clubCount === 2) return 'town';
        return 'village';
    }, [locationType, locationClubs, isCapital]);

    // Get all nation clubs for multi-select
    const { data: allNationClubs = [] } = useQuery({
        queryKey: ['nationClubs', nationId],
        queryFn: () => base44.entities.Club.filter({ nation_id: nationId }),
        enabled: !!nationId,
    });

    // Calculate population using the actual utility function
    const population = useMemo(() => {
        if (!locationName || !nation) return null;
        // Get nation population first
        const nationClubs = clubs.filter(c => c.nation_id === nationId);
        const nationLeagues = leagues.filter(l => l.nation_id === nationId);
        const maxTier = Math.max(...nationLeagues.map(l => l.tier || 1), 1);
        
        return estimateLocationPopulation(locationType, locationClubs, nation, locationName);
    }, [locationType, locationClubs, nation, locationName, clubs, leagues, nationId]);

    const updateLocationMutation = useMutation({
        mutationFn: (data) => {
            if (existingLocation) {
                return base44.entities.Location.update(existingLocation.id, data);
            } else {
                return base44.entities.Location.create(data);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['location']);
            queryClient.invalidateQueries(['locations']);
            setIsEditing(false);
        },
    });

    const handleEdit = () => {
        setEditData({
            name: existingLocation?.name || locationName,
            description: existingLocation?.description || '',
            notes: existingLocation?.notes || '',
            settlement_size: existingLocation?.settlement_size || settlementSize,
        });
        setSelectedClubIds(existingLocation?.club_ids || locationClubs.map(c => c.id));
        setIsEditing(true);
    };

    const handleSave = () => {
        updateLocationMutation.mutate({
            name: editData.name,
            type: locationType,
            nation_id: nationId,
            parent_region: parentInfo?.region || null,
            parent_district: parentInfo?.district || null,
            is_capital: isCapital,
            settlement_size: locationType === 'settlement' ? editData.settlement_size : null,
            population: population?.value || 0,
            club_ids: selectedClubIds,
            description: editData.description,
            notes: editData.notes,
        });
    };

    const toggleClub = (clubId) => {
        setSelectedClubIds(prev => 
            prev.includes(clubId) ? prev.filter(id => id !== clubId) : [...prev, clubId]
        );
    };

    const stats = useMemo(() => {
        const totalTrophies = locationClubs.reduce((sum, c) => sum + (c.league_titles || 0) + (c.domestic_cup_titles || 0), 0);
        const continentalTrophies = locationClubs.reduce((sum, c) => sum + (c.vcc_titles || 0) + (c.ccc_titles || 0), 0);
        const topFlightClubs = locationClubs.filter(c => {
            const league = leagues.find(l => l.id === c.league_id);
            return league?.tier === 1;
        }).length;
        
        return { totalTrophies, continentalTrophies, topFlightClubs };
    }, [locationClubs, leagues]);

    const TypeIcon = locationType === 'region' ? Globe : locationType === 'district' ? Building2 : Home;
    const sizeLabel = locationType === 'settlement' ? (existingLocation?.settlement_size || settlementSize) : locationType;

    return (
        <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
                <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-teal-50">
                    <CardContent className="p-4 text-center">
                        <TypeIcon className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
                        <div className="text-lg font-bold capitalize">{sizeLabel}</div>
                        <div className="text-xs text-slate-500">Location Type</div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-4 text-center">
                        <Users className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                        <div className="text-lg font-bold">~{population?.display || '—'}</div>
                        <div className="text-xs text-slate-500">Est. Population</div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-4 text-center">
                        <Shield className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                        <div className="text-2xl font-bold">{locationClubs.length}</div>
                        <div className="text-xs text-slate-500">Football Clubs</div>
                    </CardContent>
                </Card>
                {stats.topFlightClubs > 0 && (
                    <Card className="border-0 shadow-sm bg-amber-50">
                        <CardContent className="p-4 text-center">
                            <Star className="w-6 h-6 text-amber-600 mx-auto mb-2" />
                            <div className="text-2xl font-bold">{stats.topFlightClubs}</div>
                            <div className="text-xs text-slate-500">Top Flight</div>
                        </CardContent>
                    </Card>
                )}
                {stats.totalTrophies > 0 && (
                    <Card className="border-0 shadow-sm bg-yellow-50">
                        <CardContent className="p-4 text-center">
                            <Trophy className="w-6 h-6 text-yellow-600 mx-auto mb-2" />
                            <div className="text-2xl font-bold">{stats.totalTrophies}</div>
                            <div className="text-xs text-slate-500">Domestic Trophies</div>
                        </CardContent>
                    </Card>
                )}
                {stats.continentalTrophies > 0 && (
                    <Card className="border-0 shadow-sm bg-purple-50">
                        <CardContent className="p-4 text-center">
                            <Star className="w-6 h-6 text-purple-600 mx-auto mb-2 fill-purple-600" />
                            <div className="text-2xl font-bold">{stats.continentalTrophies}</div>
                            <div className="text-xs text-slate-500">Continental</div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Description if exists */}
            {existingLocation?.description && (
                <Card className="border-0 shadow-sm mb-6 bg-blue-50 border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                        <p className="text-slate-700 italic">{existingLocation.description}</p>
                    </CardContent>
                </Card>
            )}

            {/* Parent Locations - Navigate Through */}
            {(parentInfo?.region || parentInfo?.district) && (
                <Card className="border-0 shadow-sm mb-6">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 text-sm text-slate-600 flex-wrap">
                            <MapPin className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-500">Located in:</span>
                            {parentInfo.region && (
                                <>
                                    <Link 
                                        to={createPageUrl(`LocationDetail?name=${encodeURIComponent(parentInfo.region)}&type=region&nation_id=${nationId}`)}
                                        className="font-medium text-emerald-600 hover:underline flex items-center gap-1"
                                    >
                                        <Globe className="w-3 h-3" />
                                        {parentInfo.region}
                                    </Link>
                                    {parentInfo.district && <ChevronRight className="w-3 h-3 text-slate-400" />}
                                </>
                            )}
                            {parentInfo.district && (
                                <Link 
                                    to={createPageUrl(`LocationDetail?name=${encodeURIComponent(parentInfo.district)}&type=district&nation_id=${nationId}`)}
                                    className="font-medium text-blue-600 hover:underline flex items-center gap-1"
                                >
                                    <Building2 className="w-3 h-3" />
                                    {parentInfo.district}
                                </Link>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Location Narratives */}
            <LocationNarratives 
                locationName={locationName}
                locationType={locationType}
                clubs={locationClubs}
                leagues={leagues}
                nation={nation}
                isCapital={isCapital}
                parentRegion={parentInfo?.region}
                parentDistrict={parentInfo?.district}
                settlementSize={sizeLabel}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
                {/* Main Content - Clubs */}
                <div className="lg:col-span-2">
                    <Card className="border-0 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="w-5 h-5 text-emerald-600" />
                                Football Clubs in {locationName}
                            </CardTitle>
                            <AdminOnly>
                                <Button variant="outline" size="sm" onClick={handleEdit}>
                                    <Edit2 className="w-4 h-4 mr-2" /> Manage Location
                                </Button>
                            </AdminOnly>
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
                                            <TableHead className="text-center">Continental</TableHead>
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
                                                                    <img src={club.logo_url} alt="" className="w-10 h-10 object-contain bg-white rounded-lg p-1" />
                                                                ) : (
                                                                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                                                                        <Shield className="w-5 h-5 text-slate-400" />
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
                                                            {(club.league_titles || 0) + (club.domestic_cup_titles || 0) > 0 ? (
                                                                <span className="flex items-center justify-center gap-1 text-amber-600 font-medium">
                                                                    <Trophy className="w-4 h-4" />
                                                                    {(club.league_titles || 0) + (club.domestic_cup_titles || 0)}
                                                                </span>
                                                            ) : '-'}
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            {(club.vcc_titles || 0) + (club.ccc_titles || 0) > 0 ? (
                                                                <span className="flex items-center justify-center gap-1">
                                                                    {club.vcc_titles > 0 && (
                                                                        <Badge className="bg-amber-500 text-white text-xs">{club.vcc_titles} VCC</Badge>
                                                                    )}
                                                                    {club.ccc_titles > 0 && (
                                                                        <Badge className="bg-blue-500 text-white text-xs">{club.ccc_titles} CCC</Badge>
                                                                    )}
                                                                </span>
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

                    {/* Notes */}
                    {existingLocation?.notes && (
                        <Card className="border-0 shadow-sm mt-6">
                            <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
                            <CardContent>
                                <p className="text-slate-600 whitespace-pre-line">{existingLocation.notes}</p>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Sub-locations with large cities highlighted */}
                    {subLocations?.districts?.length > 0 && (
                        <Card className="border-0 shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Building2 className="w-5 h-5 text-blue-500" />
                                    Districts
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2 max-h-80 overflow-y-auto">
                                    {subLocations.districts.map(district => (
                                        <Link 
                                            key={district.name}
                                            to={createPageUrl(`LocationDetail?name=${encodeURIComponent(district.name)}&type=district&nation_id=${nationId}`)}
                                            className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-100"
                                        >
                                            <span className="font-medium text-sm">{district.name}</span>
                                            <Badge variant="outline">{district.clubs.length} clubs</Badge>
                                        </Link>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {subLocations?.settlements?.length > 0 && (
                        <Card className="border-0 shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Home className="w-5 h-5 text-amber-500" />
                                    {locationType === 'region' ? 'Major Cities' : 'Settlements'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2 max-h-80 overflow-y-auto">
                                    {subLocations.settlements
                                        .sort((a, b) => b.clubs.length - a.clubs.length)
                                        .slice(0, 20)
                                        .map(settlement => {
                                            const isLargeCity = settlement.clubs.length >= 3 || 
                                                nation?.capital?.toLowerCase() === settlement.name.toLowerCase();
                                            return (
                                                <Link 
                                                    key={settlement.name}
                                                    to={createPageUrl(`LocationDetail?name=${encodeURIComponent(settlement.name)}&type=settlement&nation_id=${nationId}`)}
                                                    className={`flex items-center justify-between p-2 rounded-lg hover:bg-slate-100 ${isLargeCity ? 'bg-amber-50' : ''}`}
                                                >
                                                    <span className={`font-medium text-sm flex items-center gap-1 ${isLargeCity ? 'text-amber-800' : ''}`}>
                                                        {isLargeCity && <Landmark className="w-3 h-3" />}
                                                        {settlement.name}
                                                    </span>
                                                    <Badge variant={isLargeCity ? "default" : "outline"} className={isLargeCity ? 'bg-amber-500' : ''}>
                                                        {settlement.clubs.length}
                                                    </Badge>
                                                </Link>
                                            );
                                        })}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Most Successful Club */}
                    {locationClubs.length > 0 && (() => {
                        const sorted = [...locationClubs].sort((a, b) => 
                            ((b.vcc_titles || 0) * 10 + (b.league_titles || 0) + (b.domestic_cup_titles || 0)) - 
                            ((a.vcc_titles || 0) * 10 + (a.league_titles || 0) + (a.domestic_cup_titles || 0))
                        );
                        const top = sorted[0];
                        if (!top || ((top.league_titles || 0) + (top.domestic_cup_titles || 0) + (top.vcc_titles || 0) + (top.ccc_titles || 0)) === 0) {
                            return null;
                        }
                        return (
                            <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-yellow-50">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Trophy className="w-5 h-5 text-amber-500" />
                                        Pride of {locationName}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Link to={createPageUrl(`ClubDetail?id=${top.id}`)} className="block hover:bg-white/60 rounded-lg p-3 transition-colors">
                                        <div className="flex items-center gap-3 mb-3">
                                            {top.logo_url ? (
                                                <img src={top.logo_url} alt="" className="w-16 h-16 object-contain bg-white rounded-lg p-2" />
                                            ) : (
                                                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center">
                                                    <Shield className="w-8 h-8 text-slate-400" />
                                                </div>
                                            )}
                                            <div className="flex-1">
                                                <div className="font-bold text-slate-900 text-lg">{top.name}</div>
                                                <div className="text-xs text-slate-500">{top.nickname}</div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            {top.league_titles > 0 && (
                                                <div className="text-amber-700">🏆 {top.league_titles} League</div>
                                            )}
                                            {top.domestic_cup_titles > 0 && (
                                                <div className="text-orange-700">🏆 {top.domestic_cup_titles} Cup</div>
                                            )}
                                            {top.vcc_titles > 0 && (
                                                <div className="text-purple-700 font-bold">⭐ {top.vcc_titles} VCC</div>
                                            )}
                                            {top.ccc_titles > 0 && (
                                                <div className="text-blue-700">⭐ {top.ccc_titles} CCC</div>
                                            )}
                                        </div>
                                    </Link>
                                </CardContent>
                            </Card>
                        );
                    })()}
                </div>
            </div>

            {/* Edit Location Dialog */}
            <Dialog open={isEditing} onOpenChange={setIsEditing}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Manage {locationName}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Location Name</Label>
                                <Input 
                                    value={editData.name || ''} 
                                    onChange={(e) => setEditData({...editData, name: e.target.value})} 
                                    className="mt-1"
                                />
                            </div>
                            {locationType === 'settlement' && (
                                <div>
                                    <Label>Size Classification</Label>
                                    <Select 
                                        value={editData.settlement_size || settlementSize} 
                                        onValueChange={(v) => setEditData({...editData, settlement_size: v})}
                                    >
                                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="city">City</SelectItem>
                                            <SelectItem value="town">Town</SelectItem>
                                            <SelectItem value="village">Village</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>
                        <div>
                            <Label>Description</Label>
                            <Textarea 
                                value={editData.description || ''} 
                                onChange={(e) => setEditData({...editData, description: e.target.value})}
                                rows={3}
                                className="mt-1"
                                placeholder="Add a custom description for this location..."
                            />
                        </div>
                        <div>
                            <Label>Clubs in this Location ({selectedClubIds.length} selected)</Label>
                            <div className="mt-2 border rounded-lg p-4 bg-slate-50 max-h-80 overflow-y-auto">
                                <div className="grid grid-cols-2 gap-2">
                                    {allNationClubs
                                        .sort((a, b) => a.name.localeCompare(b.name))
                                        .map(club => {
                                            const isSelected = selectedClubIds.includes(club.id);
                                            return (
                                                <label 
                                                    key={club.id} 
                                                    className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${isSelected ? 'bg-emerald-100' : 'hover:bg-slate-100'}`}
                                                >
                                                    <Checkbox
                                                        checked={isSelected}
                                                        onCheckedChange={() => toggleClub(club.id)}
                                                    />
                                                    {club.logo_url && (
                                                        <img src={club.logo_url} alt="" className="w-5 h-5 object-contain bg-white rounded p-0.5" />
                                                    )}
                                                    <span className="text-sm truncate flex-1">{club.name}</span>
                                                </label>
                                            );
                                        })}
                                </div>
                            </div>
                        </div>
                        <div>
                            <Label>Notes</Label>
                            <Textarea 
                                value={editData.notes || ''} 
                                onChange={(e) => setEditData({...editData, notes: e.target.value})}
                                rows={3}
                                className="mt-1"
                                placeholder="Historical context, interesting facts..."
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                            <Button variant="outline" onClick={() => setIsEditing(false)}>
                                <X className="w-4 h-4 mr-2" /> Cancel
                            </Button>
                            <Button 
                                onClick={handleSave} 
                                disabled={updateLocationMutation.isPending}
                                className="bg-emerald-600"
                            >
                                <Save className="w-4 h-4 mr-2" /> 
                                {updateLocationMutation.isPending ? 'Saving...' : 'Save Location'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}