import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, Trophy, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function GoldenEras({ clubs = [], nation }) {
    const eras = useMemo(() => {
        if (clubs.length === 0) return [];

        // Collect all continental success years
        const successYears = [];
        
        clubs.forEach(club => {
            // VCC titles
            if (club.vcc_title_years) {
                club.vcc_title_years.split(',').forEach(y => {
                    const year = parseInt(y.trim());
                    if (year) successYears.push({ year, type: 'vcc', club: club.name, clubId: club.id });
                });
            }
            // CCC titles
            if (club.ccc_title_years) {
                club.ccc_title_years.split(',').forEach(y => {
                    const year = parseInt(y.trim());
                    if (year) successYears.push({ year, type: 'ccc', club: club.name, clubId: club.id });
                });
            }
        });

        if (successYears.length === 0) return [];

        // Sort by year
        successYears.sort((a, b) => a.year - b.year);

        // Find clusters of success (golden eras)
        const goldenEras = [];
        let currentEra = null;

        successYears.forEach(success => {
            if (!currentEra) {
                currentEra = { start: success.year, end: success.year, successes: [success] };
            } else if (success.year - currentEra.end <= 5) {
                // Within 5 years of last success, extend era
                currentEra.end = success.year;
                currentEra.successes.push(success);
            } else {
                // Gap too large, start new era
                if (currentEra.successes.length >= 2) {
                    goldenEras.push(currentEra);
                }
                currentEra = { start: success.year, end: success.year, successes: [success] };
            }
        });

        if (currentEra && currentEra.successes.length >= 2) {
            goldenEras.push(currentEra);
        }

        // Sort by number of successes
        goldenEras.sort((a, b) => b.successes.length - a.successes.length);

        return goldenEras.slice(0, 5);
    }, [clubs]);

    if (eras.length === 0) return null;

    return (
        <Card className="border-0 shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-amber-500" />
                    Golden Eras
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {eras.map((era, idx) => {
                        const vccCount = era.successes.filter(s => s.type === 'vcc').length;
                        const cccCount = era.successes.filter(s => s.type === 'ccc').length;
                        const clubsInvolved = [...new Set(era.successes.map(s => s.club))];

                        return (
                            <div 
                                key={idx} 
                                className="p-4 rounded-lg bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200"
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <Calendar className="w-4 h-4 text-amber-600" />
                                    <span className="font-bold text-amber-800">
                                        {era.start} - {era.end}
                                    </span>
                                    <span className="text-amber-600 text-sm">
                                        ({era.end - era.start + 1} years)
                                    </span>
                                </div>
                                
                                <div className="flex items-center gap-4 mb-3">
                                    {vccCount > 0 && (
                                        <div className="flex items-center gap-1 text-amber-700">
                                            <Trophy className="w-4 h-4" />
                                            <span className="font-semibold">{vccCount} VCC</span>
                                        </div>
                                    )}
                                    {cccCount > 0 && (
                                        <div className="flex items-center gap-1 text-blue-700">
                                            <Trophy className="w-4 h-4" />
                                            <span className="font-semibold">{cccCount} CCC</span>
                                        </div>
                                    )}
                                </div>

                                <div className="text-sm text-amber-700">
                                    <span className="font-medium">Clubs: </span>
                                    {era.successes.map((s, i) => (
                                        <span key={i}>
                                            {i > 0 && ', '}
                                            <Link 
                                                to={createPageUrl(`ClubDetail?id=${s.clubId}`)} 
                                                className="hover:underline"
                                            >
                                                {s.club} ({s.year} {s.type.toUpperCase()})
                                            </Link>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}