import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shuffle, Trophy, ArrowRight, Info, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * Cup Draw Engine - Implements FA Cup-style bracket logic
 * 
 * Power of 2 Rule: Tournament must reduce to 2^n teams
 * Bye Calculation: M = T - 2^n (where 2^n is highest power of 2 < T)
 * Tiered Entry: Teams enter at specified rounds
 * Seeded Draw: Higher tiers protected from each other
 */

export default function CupDrawEngine({ 
    availableTeams, 
    roundName, 
    drawStyle = 'random',
    onDrawComplete,
    disabled = false
}) {
    const [isDrawing, setIsDrawing] = useState(false);
    const [drawnPairs, setDrawnPairs] = useState([]);

    // Calculate power of 2 bracket math
    const bracketMath = useMemo(() => {
        const T = availableTeams.length;
        if (T === 0) return null;

        // Find highest power of 2 less than T
        let n = 0;
        while (Math.pow(2, n + 1) < T) {
            n++;
        }

        const powerOf2 = Math.pow(2, n);
        const matchesNeeded = T - powerOf2; // Teams that must play
        const byes = powerOf2 * 2 - T; // Teams that get byes
        const nextRoundTeams = powerOf2; // Teams in next round (2^n)

        return {
            totalTeams: T,
            matchesNeeded,
            byes,
            nextRoundTeams,
            powerOf2,
            isAlreadyPowerOf2: T === powerOf2
        };
    }, [availableTeams]);

    // Perform the draw
    const conductDraw = () => {
        setIsDrawing(true);

        setTimeout(() => {
            const pairs = [];
            let teamsPool = [...availableTeams];
            const { matchesNeeded, byes } = bracketMath;

            if (drawStyle === 'seeded') {
                // Seeded draw: Lower tiers play, higher tiers get byes
                const sorted = [...teamsPool].sort((a, b) => {
                    const tierA = a.tier || 999;
                    const tierB = b.tier || 999;
                    return tierB - tierA; // Higher tier numbers (lower divisions) first
                });

                // Lower tier teams play each other
                const playingTeams = sorted.slice(0, matchesNeeded * 2);
                const byeTeams = sorted.slice(matchesNeeded * 2);

                // Shuffle playing teams and pair them
                const shuffled = playingTeams.sort(() => Math.random() - 0.5);
                for (let i = 0; i < shuffled.length; i += 2) {
                    if (i + 1 < shuffled.length) {
                        pairs.push({
                            home: shuffled[i],
                            away: shuffled[i + 1]
                        });
                    }
                }

                // Add byes for remaining teams
                byeTeams.forEach(team => {
                    pairs.push({ home: team, away: null, isBye: true });
                });

            } else {
                // Random draw: Randomly select who plays
                const shuffled = teamsPool.sort(() => Math.random() - 0.5);
                
                // First matchesNeeded*2 teams play
                const playingTeams = shuffled.slice(0, matchesNeeded * 2);
                const byeTeams = shuffled.slice(matchesNeeded * 2);

                // Pair playing teams
                for (let i = 0; i < playingTeams.length; i += 2) {
                    if (i + 1 < playingTeams.length) {
                        pairs.push({
                            home: playingTeams[i],
                            away: playingTeams[i + 1]
                        });
                    }
                }

                // Add byes
                byeTeams.forEach(team => {
                    pairs.push({ home: team, away: null, isBye: true });
                });
            }

            setDrawnPairs(pairs);
            setIsDrawing(false);
        }, 1500); // Simulate draw ceremony delay
    };

    const confirmDraw = () => {
        onDrawComplete(drawnPairs);
        setDrawnPairs([]);
    };

    if (!bracketMath) {
        return (
            <Alert>
                <Info className="w-4 h-4" />
                <AlertDescription>No teams available for draw</AlertDescription>
            </Alert>
        );
    }

    return (
        <Card className="border-2 border-emerald-500">
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-emerald-600" />
                        {roundName} Draw
                    </span>
                    <Badge variant="outline" className="text-lg">
                        {availableTeams.length} teams
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Bracket Mathematics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="text-center p-3 bg-slate-50 rounded-lg">
                        <div className="text-2xl font-bold text-emerald-600">{bracketMath.matchesNeeded}</div>
                        <div className="text-xs text-slate-500">Matches</div>
                    </div>
                    <div className="text-center p-3 bg-slate-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{bracketMath.byes}</div>
                        <div className="text-xs text-slate-500">Byes</div>
                    </div>
                    <div className="text-center p-3 bg-slate-50 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">{bracketMath.nextRoundTeams}</div>
                        <div className="text-xs text-slate-500">Next Round (2^n)</div>
                    </div>
                    <div className="text-center p-3 bg-slate-50 rounded-lg">
                        <div className="text-sm font-bold text-slate-700">{drawStyle}</div>
                        <div className="text-xs text-slate-500">Draw Style</div>
                    </div>
                </div>

                {/* Info */}
                <Alert>
                    <Info className="w-4 h-4" />
                    <AlertDescription className="text-xs">
                        <strong>Power of 2 Logic:</strong> {bracketMath.totalTeams} teams → {bracketMath.matchesNeeded} matches + {bracketMath.byes} byes = {bracketMath.nextRoundTeams} teams advance
                        {drawStyle === 'seeded' && <span className="block mt-1 text-blue-600">🛡️ Seeded: Higher tier teams protected from each other</span>}
                    </AlertDescription>
                </Alert>

                {/* Draw Results */}
                {drawnPairs.length > 0 && (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {drawnPairs.map((pair, idx) => (
                            <div key={idx} className="flex items-center gap-2 p-3 bg-white border rounded-lg">
                                <Badge variant="outline" className="w-8 text-center">{idx + 1}</Badge>
                                <div className="flex-1 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        {pair.home.logo_url && (
                                            <img src={pair.home.logo_url} alt="" className="w-6 h-6 object-contain" />
                                        )}
                                        <span className="font-semibold">{pair.home.name}</span>
                                        <Badge variant="outline" className="text-xs">T{pair.home.tier}</Badge>
                                    </div>
                                    {pair.isBye ? (
                                        <Badge className="bg-blue-500">BYE</Badge>
                                    ) : (
                                        <>
                                            <ArrowRight className="w-4 h-4 text-slate-400" />
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="text-xs">T{pair.away.tier}</Badge>
                                                <span className="font-semibold">{pair.away.name}</span>
                                                {pair.away.logo_url && (
                                                    <img src={pair.away.logo_url} alt="" className="w-6 h-6 object-contain" />
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                    {drawnPairs.length === 0 ? (
                        <Button 
                            onClick={conductDraw} 
                            disabled={disabled || isDrawing}
                            className="w-full bg-emerald-600 hover:bg-emerald-700"
                        >
                            {isDrawing ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Drawing...
                                </>
                            ) : (
                                <>
                                    <Shuffle className="w-4 h-4 mr-2" />
                                    Conduct Draw
                                </>
                            )}
                        </Button>
                    ) : (
                        <>
                            <Button 
                                variant="outline" 
                                onClick={() => setDrawnPairs([])}
                                className="flex-1"
                            >
                                Redraw
                            </Button>
                            <Button 
                                onClick={confirmDraw}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                            >
                                Confirm & Create Matches
                            </Button>
                        </>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}