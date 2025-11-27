import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown, Trophy, Star, Calendar } from 'lucide-react';

export default function DynastyTracker({ club, combinedStats }) {
    const dynasties = useMemo(() => {
        if (!club || !combinedStats?.title_years) return [];

        // Parse title years
        const years = combinedStats.title_years
            .split(',')
            .map(y => parseInt(y.trim()))
            .filter(y => !isNaN(y))
            .sort((a, b) => a - b);

        if (years.length < 2) return [];

        // Find consecutive runs
        const runs = [];
        let currentRun = [years[0]];

        for (let i = 1; i < years.length; i++) {
            if (years[i] === years[i - 1] + 1) {
                currentRun.push(years[i]);
            } else {
                if (currentRun.length >= 2) {
                    runs.push([...currentRun]);
                }
                currentRun = [years[i]];
            }
        }
        if (currentRun.length >= 2) {
            runs.push(currentRun);
        }

        // Sort by length
        runs.sort((a, b) => b.length - a.length);

        return runs.map(run => ({
            start: run[0],
            end: run[run.length - 1],
            count: run.length,
            years: run
        }));
    }, [club, combinedStats]);

    // Also find domestic cup dynasties
    const cupDynasties = useMemo(() => {
        if (!combinedStats?.domestic_cup_title_years) return [];

        const years = combinedStats.domestic_cup_title_years
            .split(',')
            .map(y => parseInt(y.trim()))
            .filter(y => !isNaN(y))
            .sort((a, b) => a - b);

        if (years.length < 2) return [];

        const runs = [];
        let currentRun = [years[0]];

        for (let i = 1; i < years.length; i++) {
            if (years[i] === years[i - 1] + 1) {
                currentRun.push(years[i]);
            } else {
                if (currentRun.length >= 2) {
                    runs.push([...currentRun]);
                }
                currentRun = [years[i]];
            }
        }
        if (currentRun.length >= 2) {
            runs.push(currentRun);
        }

        runs.sort((a, b) => b.length - a.length);

        return runs.map(run => ({
            start: run[0],
            end: run[run.length - 1],
            count: run.length,
            years: run,
            type: 'cup'
        }));
    }, [combinedStats]);

    const allDynasties = [...dynasties.map(d => ({ ...d, type: 'league' })), ...cupDynasties];

    if (allDynasties.length === 0) return null;

    return (
        <Card className="border-0 shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-amber-500" />
                    Dynasties & Dominant Periods
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {allDynasties.map((dynasty, idx) => (
                        <div 
                            key={idx}
                            className={`p-4 rounded-lg ${
                                dynasty.type === 'league' 
                                    ? 'bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200'
                                    : 'bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200'
                            }`}
                        >
                            <div className="flex items-center gap-2 mb-2">
                                {dynasty.type === 'league' ? (
                                    <Trophy className="w-5 h-5 text-amber-600" />
                                ) : (
                                    <Star className="w-5 h-5 text-orange-600" />
                                )}
                                <span className="font-bold text-lg">
                                    {dynasty.count} {dynasty.type === 'league' ? 'League' : 'Cup'} Titles in a Row
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-600">
                                <Calendar className="w-4 h-4" />
                                <span>{dynasty.start} - {dynasty.end}</span>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1">
                                {dynasty.years.map(year => (
                                    <span 
                                        key={year}
                                        className={`px-2 py-1 rounded text-xs font-medium ${
                                            dynasty.type === 'league'
                                                ? 'bg-amber-200 text-amber-800'
                                                : 'bg-orange-200 text-orange-800'
                                        }`}
                                    >
                                        {year}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}