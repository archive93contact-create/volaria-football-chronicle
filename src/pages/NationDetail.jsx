import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Plus, Trophy, Shield, Edit2, Trash2, ChevronRight, Save, X, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import PageHeader from '@/components/common/PageHeader';
import ImageUploader from '@/components/common/ImageUploader';
import { useNavigate } from 'react-router-dom';

export default function NationDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    const nationId = urlParams.get('id');
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({});

    const { data: nation, isLoading } = useQuery({
        queryKey: ['nation', nationId],
        queryFn: async () => {
            const nations = await base44.entities.Nation.filter({ id: nationId });
            return nations[0];
        },
        enabled: !!nationId,
    });

    const { data: leagues = [] } = useQuery({
        queryKey: ['leagues', nationId],
        queryFn: () => base44.entities.League.filter({ nation_id: nationId }, 'tier'),
    });

    const { data: clubs = [] } = useQuery({
        queryKey: ['clubs', nationId],
        queryFn: () => base44.entities.Club.filter({ nation_id: nationId }, 'name'),
    });

    const updateMutation = useMutation({
        mutationFn: (data) => base44.entities.Nation.update(nationId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['nation', nationId] });
            queryClient.invalidateQueries({ queryKey: ['nations'] });
            setIsEditing(false);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: () => base44.entities.Nation.delete(nationId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['nations'] });
            navigate(createPageUrl('Nations'));
        },
    });

    const handleEdit = () => {
        setEditData(nation);
        setIsEditing(true);
    };

    const handleSave = () => {
        const submitData = {
            ...editData,
            founded_year: editData.founded_year ? parseInt(editData.founded_year) : null
        };
        updateMutation.mutate(submitData);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50">
                <Skeleton className="h-64 w-full" />
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <Skeleton className="h-48 mb-8" />
                </div>
            </div>
        );
    }

    if (!nation) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Card className="max-w-md">
                    <CardContent className="text-center py-8">
                        <h2 className="text-xl font-bold mb-4">Nation Not Found</h2>
                        <Link to={createPageUrl('Nations')}>
                            <Button>Back to Nations</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Group leagues by tier
    const leaguesByTier = leagues.reduce((acc, league) => {
        const tier = league.tier || 1;
        if (!acc[tier]) acc[tier] = [];
        acc[tier].push(league);
        return acc;
    }, {});

    // Build custom header style if nation has colors
    const headerStyle = nation.primary_color ? {
        background: `linear-gradient(135deg, ${nation.primary_color}, ${nation.secondary_color || nation.primary_color}90)`
    } : null;

    return (
        <div className="min-h-screen bg-slate-50">
            {headerStyle ? (
                <div className="relative overflow-hidden" style={headerStyle}>
                    <div className="absolute inset-0 bg-black/20" />
                    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
                        <nav className="flex items-center gap-2 text-sm text-white/70 mb-6">
                            <Link to={createPageUrl('Home')} className="hover:text-white">Volaria</Link>
                            <ChevronRight className="w-4 h-4" />
                            <Link to={createPageUrl('Nations')} className="hover:text-white">Nations</Link>
                            <ChevronRight className="w-4 h-4" />
                            <span className="text-white">{nation.name}</span>
                        </nav>
                        <div className="flex items-center gap-6">
                            {nation.flag_url && (
                                <div className="hidden sm:block w-24 h-24 md:w-32 md:h-32 bg-white rounded-2xl p-3 shadow-2xl">
                                    <img src={nation.flag_url} alt={nation.name} className="w-full h-full object-contain" />
                                </div>
                            )}
                            <div className="flex-1">
                                <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight">{nation.name}</h1>
                                {(nation.description || nation.federation_name) && (
                                    <p className="mt-3 text-lg text-white/80 max-w-2xl">{nation.description || nation.federation_name}</p>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" className="border-white/30 text-white hover:bg-white/10" onClick={handleEdit}>
                                    <Edit2 className="w-4 h-4 mr-2" /> Edit
                                </Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="outline" className="border-red-400/50 text-red-300 hover:bg-red-500/20"><Trash2 className="w-4 h-4" /></Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Delete {nation.name}?</AlertDialogTitle>
                                            <AlertDialogDescription>This will permanently delete this nation.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-red-600">Delete</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
            <PageHeader 
                title={nation.name}
                subtitle={nation.description || nation.federation_name}
                image={nation.flag_url}
                breadcrumbs={[
                    { label: 'Nations', url: createPageUrl('Nations') },
                    { label: nation.name }
                ]}
            >
                <div className="flex gap-2">
                    <Button variant="outline" className="border-white/30 text-white hover:bg-white/10" onClick={handleEdit}>
                        <Edit2 className="w-4 h-4 mr-2" />
                        Edit
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="outline" className="border-red-400/50 text-red-300 hover:bg-red-500/20">
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete {nation.name}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will permanently delete this nation. This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-red-600 hover:bg-red-700">
                                    Delete
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </PageHeader>
            )}

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-4 text-center">
                            <Trophy className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                            <div className="text-2xl font-bold">{leagues.length}</div>
                            <div className="text-sm text-slate-500">Leagues</div>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-4 text-center">
                            <Shield className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                            <div className="text-2xl font-bold">{clubs.length}</div>
                            <div className="text-sm text-slate-500">Clubs</div>
                        </CardContent>
                    </Card>
                    {nation.founded_year && (
                        <Card className="border-0 shadow-sm">
                            <CardContent className="p-4 text-center">
                                <div className="text-2xl font-bold">{nation.founded_year}</div>
                                <div className="text-sm text-slate-500">Football Founded</div>
                            </CardContent>
                        </Card>
                    )}
                    {nation.region && (
                        <Card className="border-0 shadow-sm">
                            <CardContent className="p-4 text-center">
                                <div className="text-lg font-bold text-emerald-600">{nation.region}</div>
                                <div className="text-sm text-slate-500">Region</div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Leagues Section */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-slate-900">League Structure</h2>
                            <Link to={createPageUrl(`AddLeague?nation_id=${nationId}`)}>
                                <Button className="bg-emerald-600 hover:bg-emerald-700">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add League
                                </Button>
                            </Link>
                        </div>

                        {Object.keys(leaguesByTier).length === 0 ? (
                            <Card className="border-dashed border-2 border-slate-300">
                                <CardContent className="flex flex-col items-center justify-center py-12">
                                    <Trophy className="w-12 h-12 text-slate-300 mb-4" />
                                    <h3 className="text-lg font-semibold text-slate-700 mb-2">No Leagues Yet</h3>
                                    <p className="text-slate-500 mb-4">Start building the league structure</p>
                                    <Link to={createPageUrl(`AddLeague?nation_id=${nationId}`)}>
                                        <Button>Add First League</Button>
                                    </Link>
                                </CardContent>
                            </Card>
                        ) : (
                            Object.entries(leaguesByTier).sort(([a], [b]) => a - b).map(([tier, tierLeagues]) => (
                                <div key={tier}>
                                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
                                        {tier === '1' ? 'Top Division' : `Tier ${tier}`}
                                    </h3>
                                    <div className="space-y-3">
                                        {tierLeagues.map(league => {
                                            const leagueClubs = clubs.filter(c => c.league_id === league.id);
                                            return (
                                                <Link 
                                                    key={league.id} 
                                                    to={createPageUrl(`LeagueDetail?id=${league.id}`)}
                                                    className="block"
                                                >
                                                    <Card className="border-0 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
                                                        <CardContent className="p-4 flex items-center gap-4">
                                                            {league.logo_url ? (
                                                                <img 
                                                                    src={league.logo_url} 
                                                                    alt={league.name}
                                                                    className="w-14 h-14 object-contain rounded-lg bg-slate-100 p-2"
                                                                />
                                                            ) : (
                                                                <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center">
                                                                    <Trophy className="w-6 h-6 text-amber-600" />
                                                                </div>
                                                            )}
                                                            <div className="flex-1">
                                                                <h4 className="font-bold text-slate-900">{league.name}</h4>
                                                                <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
                                                                    <span>{leagueClubs.length} clubs</span>
                                                                    {league.current_champion && (
                                                                        <span className="text-emerald-600">
                                                                            🏆 {league.current_champion}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <ChevronRight className="w-5 h-5 text-slate-400" />
                                                        </CardContent>
                                                    </Card>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Info & Clubs Sidebar */}
                    <div className="space-y-6">
                        {/* History */}
                        {nation.football_history && (
                            <Card className="border-0 shadow-sm">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg">Football History</CardTitle>
                                </CardHeader>
                                <CardContent className="prose prose-sm prose-slate">
                                    <p className="text-slate-600 whitespace-pre-line">{nation.football_history}</p>
                                </CardContent>
                            </Card>
                        )}

                        {/* Most Successful Clubs */}
                            {clubs.length > 0 && (
                                <Card className="border-0 shadow-sm">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-lg">Most Successful Clubs</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-3">
                                            {clubs
                                                .map(club => ({
                                                    ...club,
                                                    totalTitles: (club.league_titles || 0) + (club.lower_tier_titles || 0)
                                                }))
                                                .filter(club => club.totalTitles > 0)
                                                .sort((a, b) => b.league_titles - a.league_titles || b.totalTitles - a.totalTitles)
                                                .slice(0, 10)
                                                .map((club, idx) => (
                                                    <Link 
                                                        key={club.id} 
                                                        to={createPageUrl(`ClubDetail?id=${club.id}`)}
                                                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 transition-colors"
                                                    >
                                                        <span className="w-6 text-center font-bold text-slate-400">{idx + 1}</span>
                                                        {club.logo_url ? (
                                                            <img src={club.logo_url} alt={club.name} className="w-8 h-8 object-contain" />
                                                        ) : (
                                                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                                                                <Shield className="w-4 h-4 text-slate-400" />
                                                            </div>
                                                        )}
                                                        <span className="font-medium text-sm text-slate-700 flex-1 truncate">{club.name}</span>
                                                        <div className="flex items-center gap-2 text-xs">
                                                            {club.league_titles > 0 && (
                                                                <span className="flex items-center gap-1 text-amber-600 font-semibold">
                                                                    <Trophy className="w-3 h-3" /> {club.league_titles}
                                                                </span>
                                                            )}
                                                            {club.lower_tier_titles > 0 && (
                                                                <span className="text-slate-500">+{club.lower_tier_titles}</span>
                                                            )}
                                                        </div>
                                                    </Link>
                                                ))}
                                            {clubs.filter(c => (c.league_titles || 0) + (c.lower_tier_titles || 0) > 0).length === 0 && (
                                                <p className="text-slate-500 text-sm">No title winners yet</p>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* All Clubs */}
                                          <Card className="border-0 shadow-sm">
                                              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                                                  <CardTitle className="text-lg">All Clubs</CardTitle>
                                                  <div className="flex gap-1">
                                                      <Link to={createPageUrl(`NationClubs?id=${nationId}`)}>
                                                          <Button size="sm" variant="outline">View All</Button>
                                                      </Link>
                                                      <Link to={createPageUrl(`AddClub?nation_id=${nationId}`)}>
                                                          <Button size="sm" variant="ghost">
                                                              <Plus className="w-4 h-4" />
                                                          </Button>
                                                      </Link>
                                                  </div>
                                          </CardHeader>
                            <CardContent>
                                {clubs.length === 0 ? (
                                    <p className="text-slate-500 text-sm">No clubs added yet</p>
                                ) : (
                                    <div className="space-y-2 max-h-96 overflow-y-auto">
                                        {clubs.slice(0, 20).map(club => (
                                            <Link 
                                                key={club.id} 
                                                to={createPageUrl(`ClubDetail?id=${club.id}`)}
                                                className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 transition-colors"
                                            >
                                                {club.logo_url ? (
                                                    <img src={club.logo_url} alt={club.name} className="w-8 h-8 object-contain" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                                                        <Shield className="w-4 h-4 text-slate-400" />
                                                    </div>
                                                )}
                                                <span className="font-medium text-sm text-slate-700 truncate">{club.name}</span>
                                                {nation.flag_url && (
                                                    <img src={nation.flag_url} alt={nation.name} className="w-5 h-3 object-contain ml-auto" />
                                                )}
                                            </Link>
                                        ))}
                                        {clubs.length > 20 && (
                                            <p className="text-sm text-slate-500 text-center py-2">
                                                + {clubs.length - 20} more clubs
                                            </p>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Edit Dialog */}
            <Dialog open={isEditing} onOpenChange={setIsEditing}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Nation</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                        <div className="flex justify-center">
                            <ImageUploader
                                currentImage={editData.flag_url}
                                onUpload={(url) => setEditData({...editData, flag_url: url})}
                                label="Upload Flag"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Nation Name</Label>
                                <Input
                                    value={editData.name || ''}
                                    onChange={(e) => setEditData({...editData, name: e.target.value})}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label>Region</Label>
                                <Input
                                    value={editData.region || ''}
                                    onChange={(e) => setEditData({...editData, region: e.target.value})}
                                    className="mt-1"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Federation Name</Label>
                                <Input
                                    value={editData.federation_name || ''}
                                    onChange={(e) => setEditData({...editData, federation_name: e.target.value})}
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <Label>Founded Year</Label>
                                <Input
                                    type="number"
                                    value={editData.founded_year || ''}
                                    onChange={(e) => setEditData({...editData, founded_year: e.target.value})}
                                    className="mt-1"
                                />
                            </div>
                        </div>
                        <div>
                            <Label>Description</Label>
                            <Textarea
                                value={editData.description || ''}
                                onChange={(e) => setEditData({...editData, description: e.target.value})}
                                rows={3}
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label>Football History</Label>
                            <Textarea
                                value={editData.football_history || ''}
                                onChange={(e) => setEditData({...editData, football_history: e.target.value})}
                                rows={5}
                                className="mt-1"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Primary Color (from flag)</Label>
                                <div className="flex gap-2 mt-1">
                                    <Input
                                        type="color"
                                        value={editData.primary_color || '#1e40af'}
                                        onChange={(e) => setEditData({...editData, primary_color: e.target.value})}
                                        className="w-14 h-10 p-1 cursor-pointer"
                                    />
                                    <Input
                                        value={editData.primary_color || ''}
                                        onChange={(e) => setEditData({...editData, primary_color: e.target.value})}
                                        placeholder="#1e40af"
                                        className="flex-1"
                                    />
                                </div>
                            </div>
                            <div>
                                <Label>Secondary Color (from flag)</Label>
                                <div className="flex gap-2 mt-1">
                                    <Input
                                        type="color"
                                        value={editData.secondary_color || '#3b82f6'}
                                        onChange={(e) => setEditData({...editData, secondary_color: e.target.value})}
                                        className="w-14 h-10 p-1 cursor-pointer"
                                    />
                                    <Input
                                        value={editData.secondary_color || ''}
                                        onChange={(e) => setEditData({...editData, secondary_color: e.target.value})}
                                        placeholder="#3b82f6"
                                        className="flex-1"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setIsEditing(false)}>
                                <X className="w-4 h-4 mr-2" /> Cancel
                            </Button>
                            <Button onClick={handleSave} disabled={updateMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700">
                                {updateMutation.isPending ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                                ) : (
                                    <><Save className="w-4 h-4 mr-2" /> Save Changes</>
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}