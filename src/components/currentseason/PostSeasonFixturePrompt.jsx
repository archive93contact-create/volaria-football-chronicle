import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Zap, Save, X, Shuffle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function generateRoundRobin(teams) {
    const n = teams.length;
    const teamList = [...teams];
    if (n % 2 !== 0) teamList.push(null);
    const rounds = [];
    const total = teamList.length - 1;
    for (let r = 0; r < total; r++) {
        const round = [];
        for (let i = 0; i < teamList.length / 2; i++) {
            const home = teamList[i];
            const away = teamList[teamList.length - 1 - i];
            if (home && away) round.push({ home, away });
        }
        rounds.push(round);
        teamList.splice(1, 0, teamList.pop());
    }
    return rounds;
}

export default function PostSeasonFixturePrompt({ season, league, clubs, onDismiss }) {
    const [generated, setGenerated] = useState([]);
    const [saving, setSaving] = useState(false);
    const [done, setDone] = useState(false);
    const queryClient = useQueryClient();

    const leagueClubs = clubs.filter(c => c.league_id === league?.id && !c.is_defunct);

    const handleGenerate = () => {
        if (leagueClubs.length < 2) {
            toast.error('Need at least 2 clubs in this league');
            return;
        }
        const rounds = generateRoundRobin(leagueClubs);
        setGenerated(rounds);
    };

    const handleSave = async () => {
        setSaving(true);
        const fixtures = generated.flatMap((round, ri) =>
            round.map(f => ({
                season_id: season.id,
                league_id: league.id,
                year: season.year,
                matchday: ri + 1,
                home_club_id: f.home.id,
                home_club_name: f.home.name,
                away_club_id: f.away.id,
                away_club_name: f.away.name,
            }))
        );
        await base44.entities.Match.bulkCreate(fixtures);
        queryClient.invalidateQueries({ queryKey: ['allMatches'] });
        toast.success(`Generated ${fixtures.length} fixtures across ${generated.length} matchdays!`);
        setSaving(false);
        setDone(true);
    };

    if (done) {
        return (
            <Card className="border-emerald-200 bg-emerald-50 border-0 shadow-md">
                <CardContent className="p-4 flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                    <div className="flex-1">
                        <div className="font-semibold text-emerald-800">Fixtures generated successfully!</div>
                        <div className="text-sm text-emerald-600">{generated.length} matchdays · {generated.reduce((a, r) => a + r.length, 0)} fixtures saved</div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={onDismiss}>Dismiss</Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-amber-200 bg-amber-50 border-2 shadow-md">
            <CardContent className="p-4">
                <div className="flex items-start gap-3">
                    <Zap className="w-6 h-6 text-amber-500 mt-0.5 shrink-0" />
                    <div className="flex-1">
                        <div className="font-semibold text-amber-800 mb-1">Generate Fixtures for {season?.year}?</div>
                        <div className="text-sm text-amber-700 mb-3">
                            {leagueClubs.length} clubs found in {league?.name}. 
                            A full round-robin schedule will create {leagueClubs.length % 2 === 0 ? leagueClubs.length - 1 : leagueClubs.length} matchdays × {Math.floor(leagueClubs.length / 2)} fixtures each.
                        </div>

                        {generated.length > 0 && (
                            <div className="mb-3 p-2 bg-white rounded-lg border border-amber-200 text-xs text-slate-600">
                                <div className="font-semibold mb-1 text-amber-700">Preview (first matchday):</div>
                                {generated[0].slice(0, 3).map((f, i) => (
                                    <div key={i} className="flex items-center gap-2 py-0.5">
                                        <span className="flex-1 text-right truncate">{f.home.name}</span>
                                        <span className="text-slate-400">vs</span>
                                        <span className="flex-1 truncate">{f.away.name}</span>
                                    </div>
                                ))}
                                {generated[0].length > 3 && <div className="text-slate-400">...and {generated[0].length - 3} more</div>}
                            </div>
                        )}

                        <div className="flex gap-2 flex-wrap">
                            {generated.length === 0 ? (
                                <Button size="sm" onClick={handleGenerate} className="bg-amber-500 hover:bg-amber-600 text-white">
                                    <Shuffle className="w-4 h-4 mr-1" /> Generate Fixtures
                                </Button>
                            ) : (
                                <>
                                    <Button size="sm" onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                                        <Save className="w-4 h-4 mr-1" /> Save {generated.reduce((a, r) => a + r.length, 0)} Fixtures
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={handleGenerate}>
                                        <Shuffle className="w-4 h-4 mr-1" /> Re-shuffle
                                    </Button>
                                </>
                            )}
                            <Button size="sm" variant="ghost" onClick={onDismiss} className="text-slate-500">
                                <X className="w-4 h-4 mr-1" /> Skip
                            </Button>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}