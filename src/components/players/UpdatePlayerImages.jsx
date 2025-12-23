import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, ImagePlus, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function UpdatePlayerImages({ clubId, onComplete }) {
    const [updating, setUpdating] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0, status: {} });
    const queryClient = useQueryClient();

    const { data: players = [] } = useQuery({
        queryKey: ['players', clubId],
        queryFn: () => clubId ? base44.entities.Player.filter({ club_id: clubId }) : base44.entities.Player.list(),
        enabled: !!clubId || clubId === null,
    });

    const { data: clubs = [] } = useQuery({
        queryKey: ['allClubs'],
        queryFn: () => base44.entities.Club.list(),
    });

    const { data: nations = [] } = useQuery({
        queryKey: ['allNations'],
        queryFn: () => base44.entities.Nation.list(),
    });

    const updatePlayerImage = async (player) => {
        const club = clubs.find(c => c.id === player.club_id);
        const nation = nations.find(n => n.name === player.nationality);
        const namingStyles = nation?.naming_styles?.join(', ') || 'diverse';
        const clubColor = club?.primary_color || 'blue';

        const prompt = `Professional headshot portrait of a MALE football/soccer player wearing ${clubColor} colored football jersey, age ${player.age}, ${namingStyles} cultural appearance and ethnic features, athletic build, neutral expression, modern sports photography style, clean background, high quality, photorealistic. Appearance should authentically reflect ${namingStyles} heritage. MUST be wearing football kit/jersey.`;

        const imageResult = await base44.integrations.Core.GenerateImage({
            prompt,
            existing_image_urls: player.photo_url ? [player.photo_url] : undefined
        });

        if (imageResult?.url) {
            await base44.entities.Player.update(player.id, { photo_url: imageResult.url });
            return true;
        }
        return false;
    };

    const handleUpdateAll = async () => {
        if (players.length === 0) {
            toast.error('No players to update');
            return;
        }

        toast.warning('⚠️ Updating player images... This will take a few minutes.', { duration: 10000 });
        setUpdating(true);
        setProgress({ current: 0, total: players.length, status: {} });

        // Process in batches of 5 for speed
        const batchSize = 5;
        for (let i = 0; i < players.length; i += batchSize) {
            const batch = players.slice(i, i + batchSize);
            
            await Promise.all(batch.map(async (player) => {
                try {
                    await updatePlayerImage(player);
                    setProgress(prev => ({
                        ...prev,
                        current: prev.current + 1,
                        status: { ...prev.status, [player.id]: 'success' }
                    }));
                } catch (error) {
                    setProgress(prev => ({
                        ...prev,
                        current: prev.current + 1,
                        status: { ...prev.status, [player.id]: 'error' }
                    }));
                    console.error(`Failed to update ${player.full_name}:`, error);
                }
            }));
        }

        setUpdating(false);
        queryClient.invalidateQueries(['players']);
        toast.success(`Updated ${Object.values(progress.status).filter(s => s === 'success').length} player images!`);
        if (onComplete) onComplete();
    };

    const successCount = Object.values(progress.status).filter(s => s === 'success').length;
    const errorCount = Object.values(progress.status).filter(s => s === 'error').length;

    return (
        <Card className="border-0 shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ImagePlus className="w-5 h-5 text-blue-600" />
                    Update Player Images with Club Colors
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-sm text-slate-600">
                    This will regenerate all player images to match their current club's colors. 
                    Existing faces will be used as reference to maintain player identity.
                </p>

                {updating ? (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-blue-800 font-semibold">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Updating player images...
                        </div>
                        <Progress 
                            value={(progress.current / progress.total) * 100} 
                            className="h-2"
                        />
                        <div className="flex justify-between text-sm">
                            <span>{progress.current} / {progress.total} processed</span>
                            <div className="flex gap-3">
                                <span className="text-green-600 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> {successCount}
                                </span>
                                {errorCount > 0 && (
                                    <span className="text-red-600 flex items-center gap-1">
                                        <XCircle className="w-3 h-3" /> {errorCount}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">
                            {players.length} player{players.length !== 1 ? 's' : ''} to update
                        </span>
                        <Button 
                            onClick={handleUpdateAll}
                            disabled={players.length === 0}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            <ImagePlus className="w-4 h-4 mr-2" />
                            Update All Images
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}