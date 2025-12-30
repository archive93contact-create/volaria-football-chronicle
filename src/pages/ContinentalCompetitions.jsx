import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Plus, Trophy, Edit2, Trash2, Globe, Star, Calendar, Award, ChevronRight, Crown, Shield, Sparkles, BookOpen } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from '@/components/common/PageHeader';
import AdminOnly from '@/components/common/AdminOnly';
import ImageUploaderWithColors from '@/components/common/ImageUploaderWithColors';

export default function ContinentalCompetitions() {
    const queryClient = useQueryClient();
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editingComp, setEditingComp] = useState(null);
    const [formData, setFormData] = useState({
        name: '', short_name: '', description: '', history: '', 
        founded_year: '', format: '', number_of_teams: '',
        current_champion: '', most_titles_club: '', most_titles_count: '',
        primary_color: '#1e40af', secondary_color: '#fbbf24', tier: 1
    });

    const { data: competitions = [], isLoading } = useQuery({
        queryKey: ['continentalCompetitions'],
        queryFn: () => base44.entities.ContinentalCompetition.list('tier'),
    });

    const { data: seasons = [] } = useQuery({
        queryKey: ['continentalSeasons'],
        queryFn: () => base44.entities.ContinentalSeason.list('-year'),
    });

    const { data: nations = [] } = useQuery({
        queryKey: ['nations'],
        queryFn: () => base44.entities.Nation.list(),
    });

    const { data: clubs = [] } = useQuery({
        queryKey: ['clubs'],
        queryFn: () => base44.entities.Club.list(),
    });

    // Calculate stats
    const stats = useMemo(() => {
        const totalSeasons = seasons.length;
        const uniqueWinners = new Set(seasons.map(s => s.champion_name)).size;
        const uniqueNations = new Set(seasons.map(s => s.champion_nation)).size;
        
        // Most successful club
        const clubWins = {};
        seasons.forEach(s => {
            if (s.champion_name) {
                clubWins[s.champion_name] = (clubWins[s.champion_name] || 0) + 1;
            }
        });
        const topClub = Object.entries(clubWins).sort((a, b) => b[1] - a[1])[0];
        
        // Most successful nation
        const nationWins = {};
        seasons.forEach(s => {
            if (s.champion_nation) {
                nationWins[s.champion_nation] = (nationWins[s.champion_nation] || 0) + 1;
            }
        });
        const topNation = Object.entries(nationWins).sort((a, b) => b[1] - a[1])[0];
        
        return { totalSeasons, uniqueWinners, uniqueNations, topClub, topNation };
    }, [seasons]);

    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.ContinentalCompetition.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['continentalCompetitions']);
            setIsAddOpen(false);
            resetForm();
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.ContinentalCompetition.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['continentalCompetitions']);
            setEditingComp(null);
            resetForm();
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.ContinentalCompetition.delete(id),
        onSuccess: () => queryClient.invalidateQueries(['continentalCompetitions']),
    });

    const resetForm = () => {
        setFormData({
            name: '', short_name: '', description: '', history: '',
            founded_year: '', format: '', number_of_teams: '',
            current_champion: '', most_titles_club: '', most_titles_count: '',
            primary_color: '#1e40af', secondary_color: '#fbbf24', tier: 1
        });
    };

    const openEdit = (comp) => {
        setFormData(comp);
        setEditingComp(comp);
    };

    const handleSubmit = () => {
        const submitData = {
            ...formData,
            founded_year: formData.founded_year ? parseInt(formData.founded_year) : null,
            number_of_teams: formData.number_of_teams ? parseInt(formData.number_of_teams) : null,
            most_titles_count: formData.most_titles_count ? parseInt(formData.most_titles_count) : null,
            tier: parseInt(formData.tier) || 1,
        };
        if (editingComp) {
            updateMutation.mutate({ id: editingComp.id, data: submitData });
        } else {
            createMutation.mutate(submitData);
        }
    };

    const compFormContent = (
        <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label>Competition Name *</Label>
                    <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="e.g., Volaria Champions Cup" className="mt-1" />
                </div>
                <div>
                    <Label>Short Name</Label>
                    <Input value={formData.short_name} onChange={(e) => setFormData({...formData, short_name: e.target.value})} placeholder="e.g., VCC" className="mt-1" />
                </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
                <div>
                    <Label>Founded Year</Label>
                    <Input type="number" value={formData.founded_year} onChange={(e) => setFormData({...formData, founded_year: e.target.value})} className="mt-1" />
                </div>
                <div>
                    <Label>Number of Teams</Label>
                    <Input type="number" value={formData.number_of_teams} onChange={(e) => setFormData({...formData, number_of_teams: e.target.value})} className="mt-1" />
                </div>
                <div>
                    <Label>Tier (1=Top, 2=Secondary)</Label>
                    <Input type="number" min="1" max="3" value={formData.tier} onChange={(e) => setFormData({...formData, tier: e.target.value})} className="mt-1" />
                </div>
            </div>
            <div>
                <Label>Format</Label>
                <Input value={formData.format} onChange={(e) => setFormData({...formData, format: e.target.value})} placeholder="e.g., Group stage + Knockout rounds" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label>Current Champion</Label>
                    <Input value={formData.current_champion} onChange={(e) => setFormData({...formData, current_champion: e.target.value})} className="mt-1" />
                </div>
                <div>
                    <Label>Most Titles (Club)</Label>
                    <Input value={formData.most_titles_club} onChange={(e) => setFormData({...formData, most_titles_club: e.target.value})} className="mt-1" />
                </div>
            </div>
            <div className="flex justify-center">
                <ImageUploaderWithColors 
                    currentImage={formData.logo_url} 
                    onUpload={(url) => setFormData({...formData, logo_url: url})} 
                    primaryColor={formData.primary_color}
                    secondaryColor={formData.secondary_color}
                    onColorsChange={(primary, secondary) => setFormData({...formData, primary_color: primary, secondary_color: secondary})}
                    label="Upload Logo" 
                />
            </div>
            <div>
                <Label>Participating Nations (for VCC select all VCC nations, for CCC select CCC nations)</Label>
                <Textarea 
                    value={formData.participating_nation_ids?.join(',') || ''} 
                    onChange={(e) => setFormData({...formData, participating_nation_ids: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})}
                    placeholder="Paste nation IDs, comma separated"
                    rows={2}
                    className="mt-1 text-xs"
                />
            </div>
            <div>
                <Label>Description</Label>
                <Textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={3} className="mt-1" />
            </div>
            <div>
                <Label>History</Label>
                <Textarea value={formData.history} onChange={(e) => setFormData({...formData, history: e.target.value})} rows={4} className="mt-1" />
            </div>
            <div>
                <Label>Custom Round Names (Optional)</Label>
                <p className="text-xs text-slate-500 mb-2">Rename default rounds for this competition</p>
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <Label className="text-xs">Round of 32 →</Label>
                        <Input 
                            value={formData.round_names?.['Round of 32'] || ''} 
                            onChange={(e) => setFormData({
                                ...formData, 
                                round_names: { ...(formData.round_names || {}), 'Round of 32': e.target.value }
                            })}
                            placeholder="e.g., Qualifying Round"
                            className="mt-1 text-sm"
                        />
                    </div>
                    <div>
                        <Label className="text-xs">Round of 16 →</Label>
                        <Input 
                            value={formData.round_names?.['Round of 16'] || ''} 
                            onChange={(e) => setFormData({
                                ...formData, 
                                round_names: { ...(formData.round_names || {}), 'Round of 16': e.target.value }
                            })}
                            placeholder="e.g., Round One"
                            className="mt-1 text-sm"
                        />
                    </div>
                    <div>
                        <Label className="text-xs">Quarter-final →</Label>
                        <Input 
                            value={formData.round_names?.['Quarter-final'] || ''} 
                            onChange={(e) => setFormData({
                                ...formData, 
                                round_names: { ...(formData.round_names || {}), 'Quarter-final': e.target.value }
                            })}
                            placeholder="e.g., Quarter-final"
                            className="mt-1 text-sm"
                        />
                    </div>
                    <div>
                        <Label className="text-xs">Semi-final →</Label>
                        <Input 
                            value={formData.round_names?.['Semi-final'] || ''} 
                            onChange={(e) => setFormData({
                                ...formData, 
                                round_names: { ...(formData.round_names || {}), 'Semi-final': e.target.value }
                            })}
                            placeholder="e.g., Semi-final"
                            className="mt-1 text-sm"
                        />
                    </div>
                </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => { setIsAddOpen(false); setEditingComp(null); resetForm(); }}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={!formData.name} className="bg-emerald-600 hover:bg-emerald-700">
                    {editingComp ? 'Save Changes' : 'Create Competition'}
                </Button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Hero Section */}
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1920')] opacity-10 bg-cover bg-center" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 to-transparent" />
                
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
                    <nav className="flex items-center gap-2 text-sm text-white/70 mb-6">
                        <Link to={createPageUrl('Home')} className="hover:text-white">Volaria</Link>
                        <ChevronRight className="w-4 h-4" />
                        <span className="text-white">Continental Competitions</span>
                    </nav>
                    
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-sm font-medium mb-6">
                            <Crown className="w-4 h-4" />
                            The Pinnacle of Club Football
                        </div>
                        <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight mb-4">
                            Continental Competitions
                        </h1>
                        <p className="text-xl text-slate-300 max-w-3xl mx-auto">
                            Where the greatest clubs from across Volaria compete for continental glory. 
                            The premier VCC showcases full member nations, while the CCC provides a pathway for developing nations.
                        </p>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
                        <div className="text-center">
                            <div className="text-3xl md:text-4xl font-bold text-white">{stats.totalSeasons}</div>
                            <div className="text-slate-400 text-sm">Finals Played</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl md:text-4xl font-bold text-white">{stats.uniqueWinners}</div>
                            <div className="text-slate-400 text-sm">Different Winners</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl md:text-4xl font-bold text-white">{stats.uniqueNations}</div>
                            <div className="text-slate-400 text-sm">Winning Nations</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl md:text-4xl font-bold text-white">{competitions.length}</div>
                            <div className="text-slate-400 text-sm">Competitions</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Tabs for History & Competitions */}
                <Tabs defaultValue="competitions" className="mb-12">
                    <TabsList className="mb-8">
                        <TabsTrigger value="competitions" className="flex items-center gap-2">
                            <Trophy className="w-4 h-4" />
                            Competitions
                        </TabsTrigger>
                        <TabsTrigger value="history" className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4" />
                            History & Legacy
                        </TabsTrigger>
                        <TabsTrigger value="most-successful" className="flex items-center gap-2">
                            <Crown className="w-4 h-4" />
                            Most Successful
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="history">
                        <Card className="border-0 shadow-lg overflow-hidden">
                            <CardContent className="p-8">
                                <div className="flex items-center gap-3 mb-6">
                                    <Sparkles className="w-6 h-6 text-amber-500" />
                                    <h2 className="text-2xl font-bold text-slate-900">The Story of Continental Football</h2>
                                </div>
                                
                                <div className="space-y-8">
                                    {/* VCC Section */}
                                    <div className="p-6 rounded-xl bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200">
                                        <div className="flex items-center gap-3 mb-4">
                                            <Crown className="w-8 h-8 text-amber-600" />
                                            <div>
                                                <h3 className="text-xl font-bold text-amber-900">Volarian Champions Cup</h3>
                                                <p className="text-sm text-amber-600">The Pinnacle of Club Football</p>
                                            </div>
                                        </div>
                                        <div className="space-y-4 text-slate-700">
                                            <p>
                                                The <strong>VCC</strong> represents the absolute pinnacle of club football in Volaria. Founded to unite the continent's 
                                                strongest footballing nations, it features only clubs from <strong>full member nations</strong>—those with established 
                                                league systems, professional infrastructure, and proven track records on the continental stage.
                                            </p>
                                            <p>
                                                To lift the VCC trophy is to achieve immortality in Volarian football. The competition showcases the highest tactical 
                                                sophistication, the most talented players, and the wealthiest clubs. VCC nights are when legends are born and dynasties 
                                                are forged. The pressure, prestige, and spotlight far exceed any domestic competition.
                                            </p>
                                            <p className="font-semibold text-amber-800">
                                                A VCC title is universally recognized as the greatest achievement in club football—worth more than any domestic league 
                                                championship and considered the ultimate test of a club's greatness.
                                            </p>
                                        </div>
                                    </div>

                                    {/* CCC Section */}
                                    <div className="p-6 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
                                        <div className="flex items-center gap-3 mb-4">
                                            <Shield className="w-8 h-8 text-blue-600" />
                                            <div>
                                                <h3 className="text-xl font-bold text-blue-900">Continental Challenge Cup</h3>
                                                <p className="text-sm text-blue-600">The Pathway for Developing Nations</p>
                                            </div>
                                        </div>
                                        <div className="space-y-4 text-slate-700">
                                            <p>
                                                The <strong>CCC</strong> serves as a vital stepping stone for <strong>associate member nations</strong>—developing 
                                                footballing countries working to strengthen their domestic leagues and continental competitiveness. While it provides 
                                                crucial international experience and generates important revenue for participating clubs, the CCC operates in the shadow 
                                                of the VCC.
                                            </p>
                                            <p>
                                                CCC clubs face lower-quality opposition, receive less media coverage, and generate significantly smaller commercial revenues. 
                                                The competition serves its purpose as a development platform, but <strong>CCC success does not carry the same weight</strong> 
                                                as VCC achievement in footballing prestige or historical significance.
                                            </p>
                                            <p className="text-sm italic text-blue-700">
                                                Many clubs that excel in the CCC dream of one day seeing their nation promoted to full VCC membership, where they can 
                                                compete against the continent's true elite.
                                            </p>
                                        </div>
                                    </div>

                                    {/* The Origins */}
                                    <div className="p-6 rounded-xl bg-slate-50 border border-slate-200">
                                        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                                            <BookOpen className="w-5 h-5 text-slate-600" />
                                            The Origins
                                        </h3>
                                        <div className="space-y-3 text-slate-700">
                                            <p>
                                                Continental competition emerged from a desire to determine the ultimate club champion across Volaria. As domestic leagues 
                                                matured, the question arose: which nation truly produced the best football? The VCC was created to answer that question, 
                                                bringing together the continent's most established footballing powers.
                                            </p>
                                            <p>
                                                The two-tier system was established to balance competitive integrity with inclusivity. Full member nations earned their 
                                                VCC status through years of consistent performance, infrastructure investment, and proven ability to compete at the highest level. 
                                                Associate members were given their own platform to develop, with the long-term goal of eventual VCC promotion as their leagues mature.
                                            </p>
                                        </div>
                                    </div>

                                    {/* The Future */}
                                    <div className="p-6 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200">
                                        <h3 className="text-lg font-bold text-emerald-900 mb-4 flex items-center gap-2">
                                            <Sparkles className="w-5 h-5 text-emerald-600" />
                                            The Future of Continental Football
                                        </h3>
                                        <div className="space-y-3 text-slate-700">
                                            <p>
                                                As Volarian football continues to evolve, the pathway from CCC to VCC membership remains the ultimate ambition for 
                                                developing nations. Several associate members are building professional infrastructure, investing in youth development, 
                                                and strengthening their domestic competitions with the goal of earning full VCC status.
                                            </p>
                                            <p>
                                                The VCC itself continues to raise standards, with broadcast deals, sponsorships, and global viewership cementing its status 
                                                as one of sport's premier competitions. The gap between VCC and CCC quality shows no signs of narrowing—if anything, the 
                                                financial advantages enjoyed by VCC nations continue to grow.
                                            </p>
                                            <p className="font-semibold text-emerald-800">
                                                The dual-competition structure ensures that while the VCC maintains its elite status and prestige, developing nations 
                                                have a pathway to continental competition—and perhaps, one day, a chance to join the elite.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="most-successful">
                        <Card className="border-0 shadow-lg overflow-hidden">
                            <CardContent className="p-8">
                                <div className="flex items-center gap-3 mb-6">
                                    <Crown className="w-6 h-6 text-amber-500" />
                                    <h2 className="text-2xl font-bold text-slate-900">Continental Royalty</h2>
                                </div>
                                
                                <div className="grid md:grid-cols-2 gap-6 mb-8">
                                    {/* VCC Winners */}
                                    <div className="p-6 rounded-xl bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-300">
                                        <h3 className="text-lg font-bold text-amber-900 mb-4 flex items-center gap-2">
                                            <Trophy className="w-5 h-5" />
                                            VCC Champions - Elite Status
                                        </h3>
                                        {(() => {
                                            const vccSeasons = seasons.filter(s => {
                                                const comp = competitions.find(c => c.id === s.competition_id);
                                                return comp?.tier === 1;
                                            });
                                            const vccClubWins = {};
                                            vccSeasons.forEach(s => {
                                                if (s.champion_name) vccClubWins[s.champion_name] = (vccClubWins[s.champion_name] || 0) + 1;
                                            });
                                            const topVCCClubs = Object.entries(vccClubWins).sort((a, b) => b[1] - a[1]).slice(0, 10);
                                            
                                            return topVCCClubs.length > 0 ? (
                                                <div className="space-y-2">
                                                    {topVCCClubs.map(([clubName, count], idx) => {
                                                        const clubObj = clubs.find(c => c.name === clubName);
                                                        const nationObj = nations.find(n => n.id === clubObj?.nation_id);
                                                        return (
                                                            <Link 
                                                                key={clubName}
                                                                to={clubObj ? createPageUrl(`ClubDetail?id=${clubObj.id}`) : '#'}
                                                                className="flex items-center justify-between p-3 rounded-lg bg-white hover:bg-amber-100 transition-colors border border-amber-200"
                                                            >
                                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                                                                        idx === 0 ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-700'
                                                                    }`}>
                                                                        {idx + 1}
                                                                    </span>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="font-semibold text-slate-900 truncate">{clubName}</div>
                                                                        {nationObj && <div className="text-xs text-slate-500">{nationObj.name}</div>}
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <Trophy className="w-4 h-4 text-amber-600" />
                                                                    <span className="font-bold text-amber-700 text-lg">{count}</span>
                                                                </div>
                                                            </Link>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <p className="text-slate-500 text-sm">No VCC champions yet</p>
                                            );
                                        })()}
                                    </div>

                                    {/* CCC Winners */}
                                    <div className="p-6 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
                                        <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
                                            <Shield className="w-5 h-5" />
                                            CCC Champions - Developing Nations
                                        </h3>
                                        {(() => {
                                            const cccSeasons = seasons.filter(s => {
                                                const comp = competitions.find(c => c.id === s.competition_id);
                                                return comp?.tier === 2;
                                            });
                                            const cccClubWins = {};
                                            cccSeasons.forEach(s => {
                                                if (s.champion_name) cccClubWins[s.champion_name] = (cccClubWins[s.champion_name] || 0) + 1;
                                            });
                                            const topCCCClubs = Object.entries(cccClubWins).sort((a, b) => b[1] - a[1]).slice(0, 10);
                                            
                                            return topCCCClubs.length > 0 ? (
                                                <div className="space-y-2">
                                                    {topCCCClubs.map(([clubName, count], idx) => {
                                                        const clubObj = clubs.find(c => c.name === clubName);
                                                        const nationObj = nations.find(n => n.id === clubObj?.nation_id);
                                                        return (
                                                            <Link 
                                                                key={clubName}
                                                                to={clubObj ? createPageUrl(`ClubDetail?id=${clubObj.id}`) : '#'}
                                                                className="flex items-center justify-between p-3 rounded-lg bg-white hover:bg-blue-100 transition-colors border border-blue-200"
                                                            >
                                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                                    <span className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-700">
                                                                        {idx + 1}
                                                                    </span>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="font-medium text-slate-900 truncate">{clubName}</div>
                                                                        {nationObj && <div className="text-xs text-slate-500">{nationObj.name}</div>}
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <Shield className="w-4 h-4 text-blue-600" />
                                                                    <span className="font-bold text-blue-700">{count}</span>
                                                                </div>
                                                            </Link>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <p className="text-slate-500 text-sm">No CCC champions yet</p>
                                            );
                                        })()}
                                    </div>
                                </div>

                                {/* Nations comparison */}
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900 mb-4">VCC Nations</h3>
                                        {(() => {
                                            const vccSeasons = seasons.filter(s => {
                                                const comp = competitions.find(c => c.id === s.competition_id);
                                                return comp?.tier === 1;
                                            });
                                            const vccNationWins = {};
                                            vccSeasons.forEach(s => {
                                                if (s.champion_nation) vccNationWins[s.champion_nation] = (vccNationWins[s.champion_nation] || 0) + 1;
                                            });
                                            const topVCCNations = Object.entries(vccNationWins).sort((a, b) => b[1] - a[1]).slice(0, 8);
                                            
                                            return topVCCNations.length > 0 ? (
                                                <div className="space-y-2">
                                                    {topVCCNations.map(([nationName, count]) => {
                                                        const nationObj = nations.find(n => n.name === nationName);
                                                        return (
                                                            <Link 
                                                                key={nationName}
                                                                to={nationObj ? createPageUrl(`NationDetail?id=${nationObj.id}`) : '#'}
                                                                className="flex items-center justify-between p-3 rounded-lg bg-amber-50 hover:bg-amber-100 transition-colors"
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    {nationObj?.flag_url && (
                                                                        <img src={nationObj.flag_url} alt={nationName} className="w-8 h-6 object-cover rounded" />
                                                                    )}
                                                                    <span className="font-medium text-slate-900">{nationName}</span>
                                                                </div>
                                                                <span className="font-bold text-amber-700">{count}</span>
                                                            </Link>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <p className="text-slate-500 text-sm">No data yet</p>
                                            );
                                        })()}
                                    </div>

                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900 mb-4">CCC Nations</h3>
                                        {(() => {
                                            const cccSeasons = seasons.filter(s => {
                                                const comp = competitions.find(c => c.id === s.competition_id);
                                                return comp?.tier === 2;
                                            });
                                            const cccNationWins = {};
                                            cccSeasons.forEach(s => {
                                                if (s.champion_nation) cccNationWins[s.champion_nation] = (cccNationWins[s.champion_nation] || 0) + 1;
                                            });
                                            const topCCCNations = Object.entries(cccNationWins).sort((a, b) => b[1] - a[1]).slice(0, 8);
                                            
                                            return topCCCNations.length > 0 ? (
                                                <div className="space-y-2">
                                                    {topCCCNations.map(([nationName, count]) => {
                                                        const nationObj = nations.find(n => n.name === nationName);
                                                        return (
                                                            <Link 
                                                                key={nationName}
                                                                to={nationObj ? createPageUrl(`NationDetail?id=${nationObj.id}`) : '#'}
                                                                className="flex items-center justify-between p-3 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors"
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    {nationObj?.flag_url && (
                                                                        <img src={nationObj.flag_url} alt={nationName} className="w-8 h-6 object-cover rounded" />
                                                                    )}
                                                                    <span className="font-medium text-slate-900">{nationName}</span>
                                                                </div>
                                                                <span className="font-bold text-blue-700">{count}</span>
                                                            </Link>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <p className="text-slate-500 text-sm">No data yet</p>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="competitions">

                <div className="mb-8 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-slate-900">Active Competitions</h2>
                    <AdminOnly>
                        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                            <DialogTrigger asChild>
                                <Button className="bg-emerald-600 hover:bg-emerald-700">
                                    <Plus className="w-4 h-4 mr-2" /> Add Competition
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                                <DialogHeader><DialogTitle>Add Continental Competition</DialogTitle></DialogHeader>
                                {compFormContent}
                            </DialogContent>
                        </Dialog>
                    </AdminOnly>
                </div>

                {competitions.length === 0 ? (
                    <Card className="border-dashed border-2 border-slate-300">
                        <CardContent className="flex flex-col items-center justify-center py-16">
                            <Globe className="w-16 h-16 text-slate-300 mb-4" />
                            <h3 className="text-xl font-semibold text-slate-700 mb-2">No Competitions Yet</h3>
                            <p className="text-slate-500 mb-6">Add your first continental competition like VCC or CCC</p>
                            <AdminOnly>
                                <Button onClick={() => setIsAddOpen(true)}><Plus className="w-4 h-4 mr-2" /> Add Competition</Button>
                            </AdminOnly>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-8">
                        {competitions.map(comp => {
                            const compSeasons = seasons.filter(s => s.competition_id === comp.id);
                            const latestSeason = compSeasons[0];
                            const compNations = nations.filter(n => 
                                comp.participating_nation_ids?.includes(n.id) || 
                                n.membership === (comp.tier === 1 ? 'VCC' : 'CCC')
                            );
                            
                            // Get club and nation win counts for this comp
                            const clubWins = {};
                            const nationWins = {};
                            compSeasons.forEach(s => {
                                if (s.champion_name) clubWins[s.champion_name] = (clubWins[s.champion_name] || 0) + 1;
                                if (s.champion_nation) nationWins[s.champion_nation] = (nationWins[s.champion_nation] || 0) + 1;
                            });
                            const topClubs = Object.entries(clubWins).sort((a, b) => b[1] - a[1]).slice(0, 5);
                            
                            return (
                                <Card key={comp.id} className="overflow-hidden border-0 shadow-xl">
                                    {/* Competition Header */}
                                    <div className="relative" style={{ background: `linear-gradient(135deg, ${comp.primary_color || '#1e40af'}, ${comp.secondary_color || '#fbbf24'})` }}>
                                        <div className="absolute inset-0 bg-black/10" />
                                        <div className="relative p-8">
                                            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                                                <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                                                    {comp.tier === 1 ? <Star className="w-10 h-10 text-white" /> : <Trophy className="w-10 h-10 text-white" />}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <h3 className="text-2xl md:text-3xl font-bold text-white">{comp.name}</h3>
                                                        {comp.short_name && (
                                                            <Badge className="bg-white/20 text-white border-white/30">{comp.short_name}</Badge>
                                                        )}
                                                    </div>
                                                    {comp.description && (
                                                        <p className="text-white/80 max-w-2xl">{comp.description}</p>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap gap-4 text-white">
                                                    {comp.founded_year && (
                                                        <div className="text-center">
                                                            <div className="text-2xl font-bold">{comp.founded_year}</div>
                                                            <div className="text-xs text-white/60">Founded</div>
                                                        </div>
                                                    )}
                                                    <div className="text-center">
                                                        <div className="text-2xl font-bold">{compSeasons.length}</div>
                                                        <div className="text-xs text-white/60">Editions</div>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="text-2xl font-bold">{compNations.length}</div>
                                                        <div className="text-xs text-white/60">Nations</div>
                                                    </div>
                                                </div>
                                                <AdminOnly>
                                                    <div className="flex gap-1">
                                                        <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={() => openEdit(comp)}><Edit2 className="w-4 h-4" /></Button>
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-white hover:bg-white/20"><Trash2 className="w-4 h-4" /></Button></AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>Delete {comp.name}?</AlertDialogTitle>
                                                                    <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                    <AlertDialogAction onClick={() => deleteMutation.mutate(comp.id)} className="bg-red-600">Delete</AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </div>
                                                </AdminOnly>
                                            </div>

                                            {/* Nation Flags */}
                                            {compNations.length > 0 && (
                                                <div className="mt-6 pt-6 border-t border-white/20">
                                                    <div className="flex flex-wrap justify-center gap-2">
                                                        {compNations.slice(0, 20).map(nation => (
                                                            nation.flag_url ? (
                                                                <Link key={nation.id} to={createPageUrl(`NationDetail?id=${nation.id}`)}>
                                                                    <img 
                                                                        src={nation.flag_url} 
                                                                        alt={nation.name}
                                                                        title={nation.name}
                                                                        className="w-10 h-7 object-cover rounded shadow border border-white/30 hover:border-white hover:scale-110 transition-all"
                                                                    />
                                                                </Link>
                                                            ) : null
                                                        ))}
                                                        {compNations.length > 20 && (
                                                            <div className="w-10 h-7 bg-white/20 rounded flex items-center justify-center text-xs text-white">
                                                                +{compNations.length - 20}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Competition Content */}
                                    <CardContent className="p-6">
                                        <div className="grid md:grid-cols-3 gap-6">
                                            {/* Most Recent Final */}
                                            {latestSeason && (
                                                <div className="md:col-span-2">
                                                    <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                                        <Calendar className="w-4 h-4" />
                                                        Most Recent Final - {latestSeason.year}
                                                    </h4>
                                                    <div className="p-4 bg-slate-50 rounded-xl">
                                                        <div className="flex items-center justify-between">
                                                            <div className="text-center flex-1">
                                                                {(() => {
                                                                    const champClub = clubs.find(c => c.name === latestSeason.champion_name);
                                                                    return champClub ? (
                                                                        <Link to={createPageUrl(`ClubDetail?id=${champClub.id}`)} className="text-lg font-bold text-emerald-600 hover:underline">{latestSeason.champion_name}</Link>
                                                                    ) : (
                                                                        <div className="text-lg font-bold text-emerald-600">{latestSeason.champion_name}</div>
                                                                    );
                                                                })()}
                                                                <div className="text-sm text-slate-500">{latestSeason.champion_nation}</div>
                                                                <Badge className="mt-1 bg-amber-100 text-amber-700">Champion</Badge>
                                                            </div>
                                                            <div className="px-4 text-2xl font-bold text-slate-800">
                                                                {latestSeason.final_score || 'vs'}
                                                            </div>
                                                            <div className="text-center flex-1">
                                                                {(() => {
                                                                    const runnerClub = clubs.find(c => c.name === latestSeason.runner_up);
                                                                    return runnerClub ? (
                                                                        <Link to={createPageUrl(`ClubDetail?id=${runnerClub.id}`)} className="text-lg font-bold text-slate-700 hover:underline">{latestSeason.runner_up}</Link>
                                                                    ) : (
                                                                        <div className="text-lg font-bold text-slate-700">{latestSeason.runner_up}</div>
                                                                    );
                                                                })()}
                                                                <div className="text-sm text-slate-500">{latestSeason.runner_up_nation}</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Top Winners */}
                                            {topClubs.length > 0 && (
                                                <div>
                                                    <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                                        <Trophy className="w-4 h-4" />
                                                        Most Titles
                                                    </h4>
                                                    <div className="space-y-2">
                                                        {topClubs.map(([clubName, count], idx) => {
                                                            const clubObj = clubs.find(c => c.name === clubName);
                                                            return (
                                                                <Link 
                                                                    key={clubName} 
                                                                    to={clubObj ? createPageUrl(`ClubDetail?id=${clubObj.id}`) : '#'}
                                                                    className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-100 transition-colors"
                                                                >
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold">
                                                                            {idx + 1}
                                                                        </span>
                                                                        <span className="text-sm font-medium text-slate-700 hover:text-emerald-600 truncate">{clubName}</span>
                                                                    </div>
                                                                    <span className="font-bold" style={{ color: comp.primary_color }}>{count}</span>
                                                                </Link>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* History excerpt */}
                                        {comp.history && (
                                            <div className="mt-6 pt-6 border-t">
                                                <p className="text-slate-600 text-sm line-clamp-2">{comp.history}</p>
                                            </div>
                                        )}

                                        {/* Action Button */}
                                        <div className="mt-6">
                                            <Link to={createPageUrl(`CompetitionDetail?id=${comp.id}`)}>
                                                <Button className="w-full" style={{ backgroundColor: comp.primary_color }}>
                                                    <Trophy className="w-4 h-4 mr-2" />
                                                    View Full History & Records
                                                    <ChevronRight className="w-4 h-4 ml-2" />
                                                </Button>
                                            </Link>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
                    </TabsContent>
                </Tabs>
            </div>

            {/* Edit Dialog */}
            <Dialog open={!!editingComp} onOpenChange={(open) => { if (!open) { setEditingComp(null); resetForm(); } }}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>Edit Competition</DialogTitle></DialogHeader>
                    {compFormContent}
                </DialogContent>
            </Dialog>
        </div>
    );
}