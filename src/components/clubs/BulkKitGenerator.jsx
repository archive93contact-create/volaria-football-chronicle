import React, { useState } from 'react';
import { Wand2, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function BulkKitGenerator({ clubs }) {
    const [generating, setGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentClub, setCurrentClub] = useState('');

    const generateKitForClub = async (club, type) => {
        if (!club.primary_color) return null;

        const pattern = club.pattern_preference || 'solid';
        const primary = club.primary_color;
        const secondary = club.secondary_color || primary;
        const accent = club.accent_color;
        
        let prompt = '';
        
        if (type === 'home') {
            const patternDesc = pattern === 'vertical_stripes' ? 'with bold vertical stripes' : 
                               pattern === 'horizontal_hoops' ? 'with horizontal hoops' : 
                               pattern === 'sash' ? 'with diagonal sash' : 
                               pattern === 'diagonal_stripe' ? 'with diagonal stripe' : 
                               pattern === 'halves' ? 'with half and half split design' : 
                               pattern === 'quarters' ? 'with quartered design' : 'solid color';
            prompt = `Professional football soccer jersey, short sleeve, ${patternDesc}, main color ${primary}, accent color ${secondary}, modern athletic cut, front view straight on, centered composition, studio product photography, plain white background, no person wearing it, jersey only`;
        } else if (type === 'away') {
            prompt = `Professional football soccer jersey, short sleeve, solid or minimal design, main color ${secondary || '#ffffff'}, accent trim ${primary}, modern athletic cut, front view straight on, centered composition, studio product photography, plain white background, no person wearing it, jersey only`;
        } else {
            const thirdColor = accent || '#1a1a1a';
            prompt = `Professional football soccer jersey, short sleeve, clean modern design, main color ${thirdColor}, modern athletic cut, front view straight on, centered composition, studio product photography, plain white background, no person wearing it, jersey only`;
        }

        try {
            const result = await base44.integrations.Core.GenerateImage({
                prompt,
                existing_image_urls: club.logo_url ? [club.logo_url] : []
            });

            if (result?.url) {
                const updates = {};
                if (type === 'home') updates.home_kit_url = result.url;
                else if (type === 'away') updates.away_kit_url = result.url;
                else updates.third_kit_url = result.url;
                
                await base44.entities.Club.update(club.id, updates);
                return true;
            }
        } catch (error) {
            console.error(`Failed to generate ${type} kit for ${club.name}:`, error);
        }
        return false;
    };

    const generateAllKits = async () => {
        setGenerating(true);
        setProgress(0);
        
        const clubsWithColors = clubs.filter(c => c.primary_color);
        const total = clubsWithColors.length * 3; // 3 kits per club
        let completed = 0;

        for (const club of clubsWithColors) {
            setCurrentClub(club.name);
            
            for (const type of ['home', 'away', 'third']) {
                await generateKitForClub(club, type);
                completed++;
                setProgress(Math.round((completed / total) * 100));
            }
        }

        setGenerating(false);
        setCurrentClub('');
        toast.success(`Generated kits for ${clubsWithColors.length} clubs!`);
    };

    return (
        <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-pink-50">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Wand2 className="w-5 h-5 text-purple-600" />
                    Bulk Kit Generator
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-sm text-slate-600">
                    Generate AI kits for all clubs with defined colors ({clubs.filter(c => c.primary_color).length} clubs)
                </p>
                
                {generating && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600">Generating: {currentClub}</span>
                            <span className="font-bold text-purple-600">{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                    </div>
                )}
                
                <Button
                    onClick={generateAllKits}
                    disabled={generating}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                    {generating ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating Kits...</>
                    ) : (
                        <><Wand2 className="w-4 h-4 mr-2" /> Generate All Club Kits</>
                    )}
                </Button>
            </CardContent>
        </Card>
    );
}