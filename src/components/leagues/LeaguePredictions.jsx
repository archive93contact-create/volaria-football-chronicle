import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Trophy, TrendingUp, TrendingDown, AlertTriangle, Target } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function LeaguePredictions({ league, seasons = [], leagueTables = [], clubs = [] }) {
    const [predictions, setPredictions] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const generatePredictions = async () => {
        setLoading(true);
        setError(null);

        // Gather historical data
        const recentSeasons = [...seasons].sort((a, b) => b.year.localeCompare(a.year)).slice(0, 10);
        const champions = recentSeasons.map(s => s.champion_name).filter(Boolean);
        const promotedTeams = recentSeasons.flatMap(s => s.promoted_teams?.split(',').map(t => t.trim()) || []).filter(Boolean);
        const relegatedTeams = recentSeasons.flatMap(s => s.relegated_teams?.split(',').map(t => t.trim()) || []).filter(Boolean);
        
        // Get current clubs in the league
        const currentClubs = clubs.filter(c => c.league_id === league.id);
        
        // Build club performance summaries
        const clubStats = currentClubs.map(club => {
            const clubSeasons = leagueTables.filter(t => t.club_id === club.id || t.club_name === club.name);
            const positions = clubSeasons.map(s => s.position).filter(Boolean);
            const avgPosition = positions.length > 0 ? (positions.reduce((a, b) => a + b, 0) / positions.length).toFixed(1) : 'N/A';
            const titles = club.league_titles || 0;
            const recentPositions = clubSeasons.slice(0, 5).map(s => s.position);
            
            return {
                name: club.name,
                titles,
                avgPosition,
                recentPositions,
                wasPromoted: promotedTeams.includes(club.name),
                wasRelegated: relegatedTeams.includes(club.name)
            };
        });

        const prompt = `You are analyzing the ${league.name} football league to predict next season's outcomes.

LEAGUE INFO:
- Name: ${league.name}
- Tier: ${league.tier || 1}
- Current Champion: ${league.current_champion || 'Unknown'}
- Number of teams: ${currentClubs.length}

RECENT CHAMPIONS (last 10 seasons):
${champions.slice(0, 10).join(', ') || 'No data'}

CURRENT CLUBS AND THEIR STATS:
${clubStats.map(c => `- ${c.name}: ${c.titles} titles, avg position ${c.avgPosition}, recent positions: ${c.recentPositions.join(', ') || 'N/A'}${c.wasPromoted ? ' (recently promoted)' : ''}${c.wasRelegated ? ' (recently relegated)' : ''}`).join('\n')}

Based on this data, provide predictions for next season. Be specific about club names.`;

        try {
            const result = await base44.integrations.Core.InvokeLLM({
                prompt,
                response_json_schema: {
                    type: "object",
                    properties: {
                        title_favorites: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    club: { type: "string" },
                                    reasoning: { type: "string" },
                                    confidence: { type: "string", enum: ["High", "Medium", "Low"] }
                                }
                            }
                        },
                        relegation_candidates: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    club: { type: "string" },
                                    reasoning: { type: "string" }
                                }
                            }
                        },
                        dark_horses: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    club: { type: "string" },
                                    reasoning: { type: "string" }
                                }
                            }
                        },
                        season_narrative: { type: "string" },
                        predicted_champion: { type: "string" },
                        predicted_relegated: { type: "array", items: { type: "string" } }
                    }
                }
            });
            setPredictions(result);
        } catch (err) {
            setError('Failed to generate predictions. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const getClubId = (clubName) => {
        const club = clubs.find(c => c.name.toLowerCase() === clubName?.toLowerCase());
        return club?.id;
    };

    if (!predictions && !loading) {
        return (
            <Card className="border-0 shadow-sm">
                <CardContent className="py-8 text-center">
                    <Sparkles className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                    <h3 className="text-lg font-bold mb-2">AI League Predictions</h3>
                    <p className="text-slate-500 mb-4">Generate AI-powered predictions for next season based on historical data</p>
                    <Button onClick={generatePredictions} className="bg-purple-600 hover:bg-purple-700">
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Predictions
                    </Button>
                </CardContent>
            </Card>
        );
    }

    if (loading) {
        return (
            <Card className="border-0 shadow-sm">
                <CardContent className="py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-4" />
                    <p className="text-slate-500">Analyzing historical data and generating predictions...</p>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="border-0 shadow-sm border-red-200">
                <CardContent className="py-8 text-center">
                    <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-4" />
                    <p className="text-red-600 mb-4">{error}</p>
                    <Button onClick={generatePredictions} variant="outline">Try Again</Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-indigo-50">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-500" />
                    AI Predictions for Next Season
                </CardTitle>
                <Button onClick={generatePredictions} variant="outline" size="sm">
                    Regenerate
                </Button>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Season Narrative */}
                {predictions.season_narrative && (
                    <div className="p-4 bg-white rounded-lg border border-purple-100">
                        <p className="text-slate-700 italic">"{predictions.season_narrative}"</p>
                    </div>
                )}

                {/* Predicted Champion */}
                {predictions.predicted_champion && (
                    <div className="p-4 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg border border-amber-200">
                        <div className="flex items-center gap-3">
                            <Trophy className="w-8 h-8 text-amber-500" />
                            <div>
                                <div className="text-sm text-amber-700 font-medium">Predicted Champion</div>
                                <div className="text-xl font-bold text-amber-800">
                                    {getClubId(predictions.predicted_champion) ? (
                                        <Link to={createPageUrl(`ClubDetail?id=${getClubId(predictions.predicted_champion)}`)} className="hover:underline">
                                            {predictions.predicted_champion}
                                        </Link>
                                    ) : predictions.predicted_champion}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Title Favorites */}
                    <div className="bg-white rounded-lg p-4 border">
                        <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                            <Target className="w-4 h-4 text-emerald-500" />
                            Title Contenders
                        </h4>
                        <div className="space-y-3">
                            {predictions.title_favorites?.slice(0, 4).map((fav, idx) => (
                                <div key={idx} className="p-2 bg-emerald-50 rounded">
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium text-emerald-800">
                                            {getClubId(fav.club) ? (
                                                <Link to={createPageUrl(`ClubDetail?id=${getClubId(fav.club)}`)} className="hover:underline">
                                                    {fav.club}
                                                </Link>
                                            ) : fav.club}
                                        </span>
                                        <Badge className={fav.confidence === 'High' ? 'bg-emerald-500' : fav.confidence === 'Medium' ? 'bg-amber-500' : 'bg-slate-400'}>
                                            {fav.confidence}
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-emerald-700 mt-1">{fav.reasoning}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Relegation Candidates */}
                    <div className="bg-white rounded-lg p-4 border">
                        <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                            <TrendingDown className="w-4 h-4 text-red-500" />
                            Relegation Risk
                        </h4>
                        <div className="space-y-3">
                            {predictions.relegation_candidates?.slice(0, 4).map((club, idx) => (
                                <div key={idx} className="p-2 bg-red-50 rounded">
                                    <span className="font-medium text-red-800">
                                        {getClubId(club.club) ? (
                                            <Link to={createPageUrl(`ClubDetail?id=${getClubId(club.club)}`)} className="hover:underline">
                                                {club.club}
                                            </Link>
                                        ) : club.club}
                                    </span>
                                    <p className="text-xs text-red-700 mt-1">{club.reasoning}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Dark Horses */}
                    <div className="bg-white rounded-lg p-4 border">
                        <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-blue-500" />
                            Dark Horses
                        </h4>
                        <div className="space-y-3">
                            {predictions.dark_horses?.slice(0, 4).map((club, idx) => (
                                <div key={idx} className="p-2 bg-blue-50 rounded">
                                    <span className="font-medium text-blue-800">
                                        {getClubId(club.club) ? (
                                            <Link to={createPageUrl(`ClubDetail?id=${getClubId(club.club)}`)} className="hover:underline">
                                                {club.club}
                                            </Link>
                                        ) : club.club}
                                    </span>
                                    <p className="text-xs text-blue-700 mt-1">{club.reasoning}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <p className="text-xs text-slate-400 text-center">
                    AI predictions are based on historical patterns and should be viewed as entertainment only.
                </p>
            </CardContent>
        </Card>
    );
}