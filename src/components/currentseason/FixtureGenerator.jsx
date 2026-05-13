import React, { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Zap, Plus, Save, X, ChevronDown, ChevronUp, Shuffle, Trophy, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import AdminOnly from '@/components/common/AdminOnly';
import ScoreEntryPanel from './ScoreEntryPanel';

function generateRoundRobin(teams) {
    const n = teams.length;
    const rounds = [];
    const teamList = [...teams];
    if (n % 2 !== 0) teamList.push(null); // bye

    const total = teamList.length - 1;
    for (let r = 0; r < total; r++) {
        const round = [];
        for (let i = 0; i < teamList.length / 2; i++) {
            const home = teamList[i];
            const away = teamList[teamList.length - 1 - i];
            if (home && away) {
                round.push({ home, away });
            }
        }
        rounds.push(round);
        // Rotate (keep first fixed)
        teamList.splice(1, 0, teamList.pop());
    }
    return rounds;
}

export default function FixtureGenerator({ leagues, seasons, clubs, nations, matches, selectedNation }) {
    const [selectedLeague, setSelectedLeague] = useState('');
    const [selectedSeason, setSelectedSeason] = useState('');
    const [generatedFixtures, setGeneratedFixtures] = useState([]);
    const [showScoreEntry, setShowScoreEntry] = useState(false);
    const [saving, setSaving] = useState(false);
    const queryClient = useQueryClient();

    const visibleLeagues = selectedNation === 'all'
        ? leagues
        : leagues.filter(l => l.nation_id === selectedNation);

    const league = leagues.find(l => l.id === selectedLeague);
    const nation = league ? nations.find(n => n.id === league.nation_id) : null;
    const leagueSeasons = seasons.filter(s => s.league_id === selectedLeague).sort((a, b) => b.year.localeCompare(a.year));
    const season = leagueSeasons.find(s => s.id === selectedSeason || s.year === selectedSeason);

    // Clubs in this league
    const leagueClubs = clubs.filter(c => c.league_id === selectedLeague && !c.is_defunct);

    // Existing matches for this season
    const existingMatches = matches.filter(m => m.league_id === selectedLeague && season && m.year === season.year);

    const handleGenerate = () => {
        if (leagueClubs.length < 2) {
            toast.error('Need at least 2 clubs in this league to generate fixtures');
            return;
        }
        const rounds = generateRoundRobin(leagueClubs);
        setGeneratedFixtures(rounds);
        toast.success(`Generated ${rounds.length} matchdays (${rounds.reduce((a, r) => a + r.length, 0)} fixtures)`);
    };

    const handleSaveFixtures = async () => {
        if (!season) {
            toast.error('Please select a season first');
            return;
        }
        setSaving(true);
        const allFixtures = generatedFixtures.flatMap((round, roundIdx) =>
            round.map(f => ({
                season_id: season.id,
                league_id: selectedLeague,
                year: season.year,
                matchday: roundIdx + 1,
                home_club_id: f.home.id,
                home_club_name: f.home.name,
                away_club_id: f.away.id,
                away_club_name: f.away.name,
            }))
        );
        await base44.entities.Match.bulkCreate(allFixtures);
        queryClient.invalidateQueries({ queryKey: ['allMatches'] });
        setGeneratedFixtures([]);
        toast.success(`Saved ${allFixtures.length} fixtures!`);
        setSaving(false);
    };

    return (
        <div className="space-y-6">
            <AdminOnly fallback={
                <Card className="border-dashed border-2 border-slate-200">
                    <CardContent className="flex flex-col items-center py-12">
                        <Shield className="w-12 h-12 text-slate-300 mb-3" />
                        <p className="text-slate-500">Admin access required to generate fixtures</p>
                    </CardContent>
                </Card>
            }>
                {/* League & Season Selection */}
                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Zap className="w-5 h-5 text-emerald-500" /> Fixture Generator
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label>Select League</Label>
                                <Select value={selectedLeague} onValueChange={v => { setSelectedLeague(v); setSelectedSeason(''); setGeneratedFixtures([]); }}>
                                    <SelectTrigger className="mt-1">
                                        <SelectValue placeholder="Choose a league..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {visibleLeagues.map(l => {
                                            const n = nations.find(na => na.id === l.nation_id);
                                            return (
                                                <SelectItem key={l.id} value={l.id}>
                                                    {l.name} {n ? `(${n.name})` : ''} {l.tier ? `– Tier ${l.tier}` : ''}
                                                </SelectItem>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                            </div>

                            {selectedLeague && (
                                <div>
                                    <Label>Select Season</Label>
                                    <Select value={selectedSeason} onValueChange={setSelectedSeason}>
                                        <SelectTrigger className="mt-1">
                                            <SelectValue placeholder="Choose a season..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {leagueSeasons.map(s => (
                                                <SelectItem key={s.id} value={s.id}>{s.year}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>

                        {selectedLeague && (
                            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                <Trophy className="w-4 h-4 text-slate-400" />
                                <span className="text-sm text-slate-600">
                                    <strong>{leagueClubs.length}</strong> clubs in {league?.name}
                                    {existingMatches.length > 0 && <span className="ml-2 text-amber-600">· {existingMatches.length} existing fixtures</span>}
                                </span>
                                {leagueClubs.length > 0 && (
                                    <Button onClick={handleGenerate} className="ml-auto bg-emerald-600 hover:bg-emerald-700" size="sm">
                                        <Shuffle className="w-4 h-4 mr-2" /> Generate Fixtures
                                    </Button>
                                )}
                            </div>
                        )}

                        {/* Generated Fixtures Preview */}
                        {generatedFixtures.length > 0 && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-semibold text-slate-700">
                                        Generated: {generatedFixtures.length} matchdays · {generatedFixtures.reduce((a, r) => a + r.length, 0)} fixtures
                                    </h4>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={() => setGeneratedFixtures([])}>
                                            <X className="w-4 h-4 mr-1" /> Clear
                                        </Button>
                                        <Button size="sm" onClick={handleSaveFixtures} disabled={saving || !selectedSeason} className="bg-emerald-600 hover:bg-emerald-700">
                                            <Save className="w-4 h-4 mr-1" /> Save All Fixtures
                                        </Button>
                                    </div>
                                </div>
                                <div className="max-h-64 overflow-y-auto space-y-2">
                                    {generatedFixtures.slice(0, 5).map((round, ri) => (
                                        <div key={ri} className="border rounded-lg p-2">
                                            <div className="text-xs font-semibold text-slate-500 mb-1">Matchday {ri + 1}</div>
                                            {round.map((f, fi) => (
                                                <div key={fi} className="flex items-center gap-2 text-sm py-0.5">
                                                    <span className="flex-1 text-right truncate">{f.home.name}</span>
                                                    <span className="text-slate-400 text-xs shrink-0">vs</span>
                                                    <span className="flex-1 truncate">{f.away.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                    {generatedFixtures.length > 5 && (
                                        <p className="text-xs text-center text-slate-400">...and {generatedFixtures.length - 5} more matchdays</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Score Entry Panel */}
                {selectedLeague && selectedSeason && existingMatches.length > 0 && (
                    <ScoreEntryPanel
                        season={season}
                        league={league}
                        matches={existingMatches}
                        clubs={leagueClubs}
                    />
                )}
            </AdminOnly>
        </div>
    );
}