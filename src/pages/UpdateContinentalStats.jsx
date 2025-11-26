import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { RefreshCw, Trophy, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from '@/components/common/PageHeader';

const ROUND_RANK = {
    'Final': 1,
    'Semi-final': 2,
    'Quarter-final': 3,
    'Round of 16': 4,
    'Round of 32': 5,
    'Group Stage': 6
};

const ROUND_DISPLAY = {
    'Final': 'Winner',
    'Semi-final': 'Semi-final',
    'Quarter-final': 'Quarter-final',
    'Round of 16': 'Round of 16',
    'Round of 32': 'Round of 32',
    'Group Stage': 'Group Stage'
};

export default function UpdateContinentalStats() {
    const queryClient = useQueryClient();
    const urlParams = new URLSearchParams(window.location.search);
    const preSelectedSeason = urlParams.get('season');
    
    const [selectedCompetition, setSelectedCompetition] = useState('');
    const [selectedSeason, setSelectedSeason] = useState(preSelectedSeason || '');
    const [results, setResults] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);

    const { data: competitions = [] } = useQuery({
        queryKey: ['competitions'],
        queryFn: () => base44.entities.ContinentalCompetition.list(),
    });

    const { data: continentalSeasons = [] } = useQuery({
        queryKey: ['continentalSeasons'],
        queryFn: () => base44.entities.ContinentalSeason.list('-year'),
    });

    const { data: matches = [] } = useQuery({
        queryKey: ['allContinentalMatches'],
        queryFn: () => base44.entities.ContinentalMatch.list(),
    });

    const { data: clubs = [] } = useQuery({
        queryKey: ['allClubs'],
        queryFn: () => base44.entities.Club.list(),
    });

    const { data: nations = [] } = useQuery({
        queryKey: ['nations'],
        queryFn: () => base44.entities.Nation.list(),
    });

    const filteredSeasons = selectedCompetition 
        ? continentalSeasons.filter(s => s.competition_id === selectedCompetition)
        : continentalSeasons;

    const processStats = async () => {
        if (!selectedSeason) return;
        
        setIsProcessing(true);
        setResults([]);
        const updateResults = [];

        const season = continentalSeasons.find(s => s.id === selectedSeason);
        const competition = competitions.find(c => c.id === season?.competition_id);
        if (!season || !competition) {
            setIsProcessing(false);
            return;
        }

        const isVCC = competition.short_name === 'VCC' || competition.tier === 1;
        const seasonMatches = matches.filter(m => m.season_id === selectedSeason);

        // Build participation map - track best finish per club
        const clubParticipation = {};
        
        seasonMatches.forEach(match => {
            const isFinalMatch = match.round === 'Final';
            
            // Home team
            if (match.home_club_name) {
                const key = match.home_club_name.toLowerCase().trim();
                if (!clubParticipation[key]) {
                    clubParticipation[key] = {
                        name: match.home_club_name,
                        nation: match.home_club_nation,
                        bestRound: match.round,
                        isWinner: false,
                        isRunnerUp: false
                    };
                } else {
                    const currentRank = ROUND_RANK[clubParticipation[key].bestRound] || 99;
                    const newRank = ROUND_RANK[match.round] || 99;
                    if (newRank < currentRank) {
                        clubParticipation[key].bestRound = match.round;
                    }
                }
                // Only mark as winner if they won THE FINAL
                if (isFinalMatch && match.winner === match.home_club_name) {
                    clubParticipation[key].isWinner = true;
                    clubParticipation[key].bestRound = 'Final';
                }
            }
            
            // Away team
            if (match.away_club_name) {
                const key = match.away_club_name.toLowerCase().trim();
                if (!clubParticipation[key]) {
                    clubParticipation[key] = {
                        name: match.away_club_name,
                        nation: match.away_club_nation,
                        bestRound: match.round,
                        isWinner: false,
                        isRunnerUp: false
                    };
                } else {
                    const currentRank = ROUND_RANK[clubParticipation[key].bestRound] || 99;
                    const newRank = ROUND_RANK[match.round] || 99;
                    if (newRank < currentRank) {
                        clubParticipation[key].bestRound = match.round;
                    }
                }
                // Only mark as winner if they won THE FINAL
                if (isFinalMatch && match.winner === match.away_club_name) {
                    clubParticipation[key].isWinner = true;
                    clubParticipation[key].bestRound = 'Final';
                }
            }
        });

        // Mark runner-up from final
        const finalMatch = seasonMatches.find(m => m.round === 'Final');
        if (finalMatch) {
            const loser = finalMatch.winner === finalMatch.home_club_name 
                ? finalMatch.away_club_name 
                : finalMatch.home_club_name;
            const loserKey = loser?.toLowerCase().trim();
            if (loserKey && clubParticipation[loserKey]) {
                clubParticipation[loserKey].isRunnerUp = true;
                clubParticipation[loserKey].bestRound = 'Final';
            }
        }

        // Update each club
        for (const [key, data] of Object.entries(clubParticipation)) {
            // Find matching club in database
            const club = clubs.find(c => c.name.toLowerCase().trim() === key);
            
            if (!club) {
                updateResults.push({
                    club: data.name,
                    status: 'not_found',
                    message: `Club not found in database`
                });
                continue;
            }

            const prefix = isVCC ? 'vcc' : 'ccc';
            const bestFinishField = `${prefix}_best_finish`;
            const bestFinishYearField = `${prefix}_best_finish_year`;
            const titlesField = `${prefix}_titles`;
            const titleYearsField = `${prefix}_title_years`;
            const runnerUpField = `${prefix}_runner_up`;
            const appearancesField = `${prefix}_appearances`;

            // Determine best finish display - only winner if they actually won the final
            let bestFinishDisplay;
            if (data.isWinner && data.bestRound === 'Final') {
                bestFinishDisplay = 'Winner';
            } else if (data.isRunnerUp) {
                bestFinishDisplay = 'Final';
            } else {
                bestFinishDisplay = ROUND_DISPLAY[data.bestRound] || data.bestRound;
            }

            // Build update data
            const updateData = {};
            let changes = [];

            // Calculate rank for comparison (lower is better)
            const getBestFinishRank = (finish) => {
                if (finish === 'Winner') return 0;
                if (finish === 'Final') return 0.5;
                return ROUND_RANK[finish] || 99;
            };

            const existingBestFinish = club[bestFinishField];
            const existingBestRank = getBestFinishRank(existingBestFinish);
            const newBestRank = getBestFinishRank(bestFinishDisplay);

            if (newBestRank < existingBestRank || !existingBestFinish) {
                updateData[bestFinishField] = bestFinishDisplay;
                updateData[bestFinishYearField] = season.year;
                changes.push(`Best finish: ${bestFinishDisplay}`);
            }

            // Update titles ONLY if they won the final
            if (data.isWinner && data.bestRound === 'Final') {
                const currentTitles = club[titlesField] || 0;
                const currentTitleYears = club[titleYearsField] || '';
                if (!currentTitleYears.includes(season.year)) {
                    updateData[titlesField] = currentTitles + 1;
                    updateData[titleYearsField] = currentTitleYears 
                        ? `${currentTitleYears}, ${season.year}` 
                        : season.year;
                    changes.push(`Added title for ${season.year}`);
                }
            }

            // Update runner-up count only for actual runner-up
            if (data.isRunnerUp) {
                const currentRunnerUp = club[runnerUpField] || 0;
                updateData[runnerUpField] = currentRunnerUp + 1;
                changes.push(`Runner-up +1`);
            }

            // Update appearances
            const currentAppearances = club[appearancesField] || 0;
            updateData[appearancesField] = currentAppearances + 1;
            changes.push(`Appearances: ${currentAppearances + 1}`);

            if (Object.keys(updateData).length > 0) {
                await base44.entities.Club.update(club.id, updateData);
                updateResults.push({
                    club: data.name,
                    status: 'updated',
                    message: changes.join(', ')
                });
            } else {
                updateResults.push({
                    club: data.name,
                    status: 'no_change',
                    message: 'No updates needed'
                });
            }
        }

        setResults(updateResults);
        setIsProcessing(false);
        queryClient.invalidateQueries(['allClubs']);
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <PageHeader 
                title="Update Continental Stats"
                subtitle="Sync club profiles with continental competition results"
                breadcrumbs={[
                    { label: 'Continental Cups', url: createPageUrl('ContinentalCompetitions') },
                    { label: 'Update Stats' }
                ]}
            />

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle>Select Competition Season</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium mb-1 block">Competition</label>
                                <Select value={selectedCompetition} onValueChange={(v) => { setSelectedCompetition(v); setSelectedSeason(''); }}>
                                    <SelectTrigger><SelectValue placeholder="All competitions" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={null}>All Competitions</SelectItem>
                                        {competitions.map(c => (
                                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Season</label>
                                <Select value={selectedSeason} onValueChange={setSelectedSeason}>
                                    <SelectTrigger><SelectValue placeholder="Select season" /></SelectTrigger>
                                    <SelectContent>
                                        {filteredSeasons.map(s => {
                                            const comp = competitions.find(c => c.id === s.competition_id);
                                            return (
                                                <SelectItem key={s.id} value={s.id}>
                                                    {comp?.short_name || comp?.name} {s.year}
                                                </SelectItem>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <Button 
                            onClick={processStats} 
                            disabled={!selectedSeason || isProcessing}
                            className="bg-emerald-600 hover:bg-emerald-700"
                        >
                            {isProcessing ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                            ) : (
                                <><RefreshCw className="w-4 h-4 mr-2" /> Update Club Stats</>
                            )}
                        </Button>
                    </CardContent>
                </Card>

                {results.length > 0 && (
                    <Card className="border-0 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Trophy className="w-5 h-5 text-amber-500" />
                                Update Results
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {results.map((r, idx) => (
                                    <div key={idx} className={`flex items-center gap-3 p-3 rounded-lg ${
                                        r.status === 'updated' ? 'bg-green-50' : 
                                        r.status === 'not_found' ? 'bg-red-50' : 'bg-slate-50'
                                    }`}>
                                        {r.status === 'updated' ? (
                                            <CheckCircle className="w-5 h-5 text-green-500" />
                                        ) : r.status === 'not_found' ? (
                                            <AlertCircle className="w-5 h-5 text-red-500" />
                                        ) : (
                                            <CheckCircle className="w-5 h-5 text-slate-400" />
                                        )}
                                        <div className="flex-1">
                                            <span className="font-medium">{r.club}</span>
                                            <span className="text-slate-500 text-sm ml-2">- {r.message}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}