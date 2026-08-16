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
import ContinentalCompetitionCard from '@/components/continental/ContinentalCompetitionCard';
import { getEntityTheme } from '@/utils/entityTheme';

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
                <Label>Participating Nations</Label>
                <p className="text-xs text-slate-500 mt-1 mb-2">Select the actual nation records. IDs are stored automatically.</p>
                <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/60 p-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
                    {nations.map(nation => {
                        const selected = formData.participating_nation_ids?.includes(nation.id) || false;
                        return (
                            <label key={nation.id} className={`flex items-center gap-2 rounded-md px-2.5 py-2 cursor-pointer transition-colors ${selected ? 'bg-white shadow-sm' : 'hover:bg-white/70'}`}>
                                <input
                                    type="checkbox"
                                    checked={selected}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        participating_nation_ids: e.target.checked
                                            ? [...new Set([...(prev.participating_nation_ids || []), nation.id])]
                                            : (prev.participating_nation_ids || []).filter(id => id !== nation.id)
                                    }))}
                                />
                                {nation.flag_url && <img src={nation.flag_url} alt="" className="w-6 h-4 object-contain" />}
                                <span className="text-sm text-slate-700">{nation.name}</span>
                            </label>
                        );
                    })}
                </div>
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
            {/* Continental archive masthead */}
            <section className="relative overflow-hidden bg-[#0b0c0e] text-white border-b border-white/10">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(255,255,255,.08),transparent_28%),linear-gradient(120deg,#090a0b_0%,#15181c_55%,#08090a_100%)]" />
                {competitions.slice(0, 2).map((comp, index) => comp.logo_url ? (
                    <img
                        key={comp.id}
                        src={comp.logo_url}
                        alt=""
                        aria-hidden="true"
                        className={`pointer-events-none absolute object-contain grayscale opacity-[0.055] ${index === 0 ? '-left-20 -bottom-24 w-80 h-80 sm:w-[430px] sm:h-[430px]' : '-right-20 -top-24 w-80 h-80 sm:w-[430px] sm:h-[430px]'}`}
                    />
                ) : null)}

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-10 sm:pb-12">
                    <nav className="flex items-center gap-2 text-xs sm:text-sm text-white/55 mb-8">
                        <Link to={createPageUrl('Home')} className="hover:text-white">Volaria</Link>
                        <ChevronRight className="w-3.5 h-3.5" />
                        <span className="text-white">Continental Competitions</span>
                    </nav>

                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-end">
                        <div className="max-w-3xl">
                            <div className="text-[10px] sm:text-xs font-black uppercase tracking-[0.22em] text-white/45 mb-3">VFC continental archive</div>
                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-[-0.045em] leading-[0.95]">Continental competitions</h1>
                            <p className="mt-4 text-base sm:text-lg text-white/65 leading-relaxed max-w-2xl">Explore Volaria's cross-border club tournaments, their participating nations, recorded editions, finals and title histories.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            {competitions.slice(0, 3).map(comp => comp.logo_url ? (
                                <Link key={comp.id} to={createPageUrl(`CompetitionDetail?id=${comp.id}`)} className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border border-white/10 bg-white/5 p-2 flex items-center justify-center hover:bg-white/10 transition-colors" title={comp.name}>
                                    <img src={comp.logo_url} alt={`${comp.name} logo`} className="max-w-full max-h-full object-contain drop-shadow-lg" />
                                </Link>
                            ) : null)}
                        </div>
                    </div>

                    <div className="mt-8 grid grid-cols-4 border border-white/12 rounded-xl overflow-hidden bg-black/20 backdrop-blur-sm max-w-3xl">
                        <div className="px-3 sm:px-5 py-3 border-r border-white/10"><div className="text-xl sm:text-2xl font-black">{stats.totalSeasons}</div><div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-white/45">Recorded editions</div></div>
                        <div className="px-3 sm:px-5 py-3 border-r border-white/10"><div className="text-xl sm:text-2xl font-black">{stats.uniqueWinners}</div><div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-white/45">Winners</div></div>
                        <div className="px-3 sm:px-5 py-3 border-r border-white/10"><div className="text-xl sm:text-2xl font-black">{stats.uniqueNations}</div><div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-white/45">Winning nations</div></div>
                        <div className="px-3 sm:px-5 py-3"><div className="text-xl sm:text-2xl font-black">{competitions.length}</div><div className="text-[9px] sm:text-[10px] uppercase tracking-wider text-white/45">Competitions</div></div>
                    </div>
                </div>
            </section>

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

                    <TabsContent value="history" className="space-y-6">
                        <div className="mb-6">
                            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] font-black text-slate-400 mb-2">
                                <BookOpen className="w-4 h-4" /> Continental archive
                            </div>
                            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950">History & legacy</h2>
                            <p className="mt-2 text-sm text-slate-500 max-w-3xl">Competition history comes from the records stored for each tournament rather than a generic hierarchy narrative.</p>
                        </div>

                        {competitions.map(comp => {
                            const theme = getEntityTheme({ primary: comp.primary_color, secondary: comp.secondary_color });
                            const compSeasons = seasons.filter(s => s.competition_id === comp.id);
                            const participating = nations.filter(n => comp.participating_nation_ids?.includes(n.id));
                            return (
                                <Card key={comp.id} className="overflow-hidden border shadow-sm" style={{ borderColor: theme.border }}>
                                    <div className="relative overflow-hidden bg-[#090a0b] text-white p-5 sm:p-7">
                                        <div className="absolute inset-0" style={{ background: `linear-gradient(110deg, #070809 0%, ${theme.heroPrimary}df 55%, ${theme.heroSecondary}bf 100%)` }} />
                                        {comp.logo_url && <img src={comp.logo_url} alt="" aria-hidden="true" className="absolute -right-10 -bottom-20 w-64 h-64 object-contain opacity-[0.08] grayscale" />}
                                        <div className="relative flex items-center gap-5">
                                            {comp.logo_url ? <img src={comp.logo_url} alt={`${comp.name} logo`} className="w-20 h-20 sm:w-24 sm:h-24 object-contain drop-shadow-xl shrink-0" /> : <Trophy className="w-14 h-14 text-white/50 shrink-0" />}
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap gap-2 items-center mb-1">
                                                    {comp.short_name && <Badge className="bg-white/10 border border-white/15 text-white">{comp.short_name}</Badge>}
                                                    {comp.founded_year && <span className="text-[10px] uppercase tracking-wider text-white/50">Founded {comp.founded_year}</span>}
                                                </div>
                                                <h3 className="text-2xl font-black tracking-tight">{comp.name}</h3>
                                                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-white/55">
                                                    <span>{compSeasons.length} recorded editions</span>
                                                    <span>{participating.length || comp.participating_nation_ids?.length || 0} participating nations</span>
                                                    {comp.format && <span>{comp.format}</span>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <CardContent className="p-5 sm:p-7" style={{ background: `linear-gradient(135deg, ${theme.tint}, #fff 40%)` }}>
                                        {comp.description && <p className="text-base font-semibold text-slate-800 leading-relaxed mb-5">{comp.description}</p>}
                                        {comp.history ? (
                                            <div className="space-y-4">
                                                {String(comp.history).split(/\n\n+/).filter(Boolean).map((paragraph, index) => (
                                                    <p key={index} className="text-sm sm:text-base text-slate-600 leading-relaxed">{paragraph}</p>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">No dedicated history has been written for this competition yet.</div>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </TabsContent>

                    <TabsContent value="most-successful" className="space-y-6">
                        <div className="mb-6">
                            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] font-black text-slate-400 mb-2"><Crown className="w-4 h-4" /> Record book</div>
                            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950">Continental royalty</h2>
                            <p className="mt-2 text-sm text-slate-500">Title leaders are calculated independently for each competition from the recorded season winners.</p>
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                            {competitions.map(comp => {
                                const theme = getEntityTheme({ primary: comp.primary_color, secondary: comp.secondary_color });
                                const compSeasons = seasons.filter(s => s.competition_id === comp.id);
                                const clubWins = new Map();
                                const nationWins = new Map();
                                compSeasons.forEach(season => {
                                    if (season.champion_name || season.champion_id) {
                                        const club = clubs.find(c => c.id === season.champion_id) || clubs.find(c => c.name === season.champion_name);
                                        const key = club?.id || `name:${season.champion_name}`;
                                        const current = clubWins.get(key) || { club, name: club?.name || season.champion_name, count: 0 };
                                        current.count++;
                                        clubWins.set(key, current);
                                    }
                                    if (season.champion_nation || season.champion_nation_id) {
                                        const nation = nations.find(n => n.id === season.champion_nation_id) || nations.find(n => n.name === season.champion_nation);
                                        const key = nation?.id || `name:${season.champion_nation}`;
                                        const current = nationWins.get(key) || { nation, name: nation?.name || season.champion_nation, count: 0 };
                                        current.count++;
                                        nationWins.set(key, current);
                                    }
                                });
                                const clubLeaders = [...clubWins.values()].sort((a,b) => b.count-a.count || a.name.localeCompare(b.name)).slice(0,10);
                                const nationLeaders = [...nationWins.values()].sort((a,b) => b.count-a.count || a.name.localeCompare(b.name)).slice(0,6);

                                return (
                                    <Card key={comp.id} className="overflow-hidden border shadow-sm" style={{ borderColor: theme.border }}>
                                        <div className="relative p-5 text-white overflow-hidden bg-[#090a0b]">
                                            <div className="absolute inset-0" style={{ background: `linear-gradient(110deg, ${theme.heroPrimary}e8, ${theme.heroSecondary}c5)` }} />
                                            {comp.logo_url && <img src={comp.logo_url} alt="" aria-hidden="true" className="absolute -right-8 -bottom-16 w-48 h-48 object-contain opacity-[0.08] grayscale" />}
                                            <div className="relative flex items-center gap-4">
                                                {comp.logo_url ? <img src={comp.logo_url} alt={`${comp.name} logo`} className="w-16 h-16 object-contain drop-shadow-xl" /> : <Trophy className="w-10 h-10 text-white/60" />}
                                                <div>
                                                    <div className="text-[10px] uppercase tracking-wider text-white/50">{comp.short_name || 'Continental competition'}</div>
                                                    <h3 className="text-xl font-black">{comp.name}</h3>
                                                    <div className="text-xs text-white/55 mt-1">{compSeasons.length} recorded editions</div>
                                                </div>
                                            </div>
                                        </div>
                                        <CardContent className="p-0" style={{ background: `linear-gradient(135deg, ${theme.tint}, #fff 42%)` }}>
                                            <div className="grid grid-cols-1 md:grid-cols-[1.2fr_.8fr] divide-y md:divide-y-0 md:divide-x divide-slate-200/80">
                                                <div className="p-5">
                                                    <div className="text-[10px] uppercase tracking-[0.14em] font-black text-slate-400 mb-3">Club title leaders</div>
                                                    {clubLeaders.length ? <div className="space-y-2">{clubLeaders.map((entry, index) => (
                                                        <Link key={`${entry.name}-${index}`} to={entry.club ? createPageUrl(`ClubDetail?id=${entry.club.id}`) : '#'} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/70 transition-colors">
                                                            <span className="w-5 text-xs font-black text-slate-400">{index+1}</span>
                                                            {entry.club?.logo_url ? <img src={entry.club.logo_url} alt="" className="w-8 h-8 object-contain" /> : <Trophy className="w-5 h-5 text-slate-300" />}
                                                            <span className="flex-1 min-w-0 truncate text-sm font-semibold text-slate-700">{entry.name}</span>
                                                            <span className="font-black" style={{ color: theme.ui }}>{entry.count}</span>
                                                        </Link>
                                                    ))}</div> : <p className="text-sm text-slate-500">No champions recorded yet.</p>}
                                                </div>
                                                <div className="p-5">
                                                    <div className="text-[10px] uppercase tracking-[0.14em] font-black text-slate-400 mb-3">Winning nations</div>
                                                    {nationLeaders.length ? <div className="space-y-2">{nationLeaders.map((entry, index) => (
                                                        <Link key={`${entry.name}-${index}`} to={entry.nation ? createPageUrl(`NationDetail?id=${entry.nation.id}`) : '#'} className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-white/70 transition-colors">
                                                            {entry.nation?.flag_url ? <img src={entry.nation.flag_url} alt="" className="w-7 h-5 object-contain" /> : <Globe className="w-4 h-4 text-slate-300" />}
                                                            <span className="flex-1 min-w-0 truncate text-sm text-slate-700">{entry.name}</span>
                                                            <span className="font-black" style={{ color: theme.ui }}>{entry.count}</span>
                                                        </Link>
                                                    ))}</div> : <p className="text-sm text-slate-500">No nation records yet.</p>}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
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
                    <div className="space-y-6">
                        {competitions.map(comp => (
                            <ContinentalCompetitionCard
                                key={comp.id}
                                competition={comp}
                                seasons={seasons}
                                nations={nations}
                                clubs={clubs}
                                onEdit={openEdit}
                                onDelete={(id) => deleteMutation.mutate(id)}
                            />
                        ))}
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