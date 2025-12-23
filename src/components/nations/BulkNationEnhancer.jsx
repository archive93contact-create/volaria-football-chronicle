import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

export default function BulkNationEnhancer() {
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0, success: 0, failed: 0 });
    const [logs, setLogs] = useState([]);

    const { data: nations = [] } = useQuery({
        queryKey: ['nations'],
        queryFn: () => base44.entities.Nation.list(),
    });

    const unenhancedNations = nations.filter(n => !n.culture && !n.geography);

    const addLog = (message, type = 'info') => {
        setLogs(prev => [...prev, { message, type, time: new Date().toLocaleTimeString() }]);
    };

    const enhanceNation = async (nation) => {
        try {
            const context = `Nation: ${nation.name}
Language: ${nation.language || 'Not specified'}
Capital: ${nation.capital || 'Not specified'}
Region: ${nation.region || 'Global'}
Federation: ${nation.federation_name || 'Not specified'}
Membership: ${nation.membership || 'Not specified'}`;

            const prompt = `Generate detailed, immersive national content for this fictional nation. CRITICAL: All media outlet names MUST sound authentic to the ${nation.language || 'local'} language - NOT English generic names.

Context:
${context}

Generate the following as a JSON object:
{
  "culture": "Rich 250-word cultural description - traditions, values, social norms, arts, music, festivals, national character, regional variations",
  "geography": "Geographic description - climate zones, terrain, major rivers/mountains, natural resources, environmental features",
  "national_media": "5-7 major AUTHENTIC ${nation.language || 'local language'} media outlets. CRITICAL: Use language-appropriate words (NOT 'Times', 'Herald', 'News', 'Broadcasting'). For Nordic: 'Dagbladet', 'Televisjon'; Romance: 'Quotidiano', 'Televisione'; Slavic: 'Gazeta', 'Telewizja'; Germanic: 'Zeitung', 'Rundfunk'. Make them feel NATIVE and unique.",
  "cuisine": "Traditional foods, signature dishes, dining culture, regional specialties with authentic dish names in the local language",
  "famous_for": "What the nation is internationally known for - exports, achievements, contributions, unique characteristics",
  "government_type": "Type of government (e.g., Constitutional Monarchy, Federal Republic, Parliamentary Democracy)"
}

CRITICAL: Research the language phonetics and naming patterns. Create authentic-sounding names that feel like they belong to that culture, NOT English translations.`;

            const result = await base44.integrations.Core.InvokeLLM({
                prompt,
                response_json_schema: {
                    type: "object",
                    properties: {
                        culture: { type: "string" },
                        geography: { type: "string" },
                        national_media: { type: "string" },
                        cuisine: { type: "string" },
                        famous_for: { type: "string" },
                        government_type: { type: "string" }
                    }
                }
            });

            await base44.entities.Nation.update(nation.id, result);
            return { success: true, nation: nation.name };
        } catch (error) {
            return { success: false, nation: nation.name, error: error.message };
        }
    };

    const handleBulkEnhance = async () => {
        setIsProcessing(true);
        setProgress({ current: 0, total: unenhancedNations.length, success: 0, failed: 0 });
        setLogs([]);
        addLog(`Starting bulk enhancement for ${unenhancedNations.length} nations...`);

        for (let i = 0; i < unenhancedNations.length; i++) {
            const nation = unenhancedNations[i];
            addLog(`Processing ${nation.name}...`, 'info');
            
            const result = await enhanceNation(nation);
            
            if (result.success) {
                addLog(`✓ ${nation.name} enhanced successfully`, 'success');
                setProgress(prev => ({ ...prev, current: i + 1, success: prev.success + 1 }));
            } else {
                addLog(`✗ ${nation.name} failed: ${result.error}`, 'error');
                setProgress(prev => ({ ...prev, current: i + 1, failed: prev.failed + 1 }));
            }
        }

        addLog(`Completed! ${progress.success} succeeded, ${progress.failed} failed`, 'info');
        queryClient.invalidateQueries(['nations']);
        setIsProcessing(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <Sparkles className="w-4 h-4" />
                    Bulk AI Enhance ({unenhancedNations.length})
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Bulk Nation Enhancement</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-slate-600">
                            {unenhancedNations.length} nations without AI-generated content
                        </p>
                        {!isProcessing && unenhancedNations.length > 0 && (
                            <Button onClick={handleBulkEnhance} className="bg-emerald-600">
                                <Sparkles className="w-4 h-4 mr-2" />
                                Start Enhancement
                            </Button>
                        )}
                    </div>

                    {isProcessing && (
                        <div className="space-y-3">
                            <Progress value={(progress.current / progress.total) * 100} />
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-600">
                                    Progress: {progress.current} / {progress.total}
                                </span>
                                <div className="flex gap-3">
                                    <Badge className="bg-green-500 text-white">
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                        {progress.success}
                                    </Badge>
                                    <Badge className="bg-red-500 text-white">
                                        <XCircle className="w-3 h-3 mr-1" />
                                        {progress.failed}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="border rounded-lg p-4 bg-slate-50 max-h-96 overflow-y-auto">
                        <h4 className="font-semibold mb-2 text-sm">Activity Log</h4>
                        {logs.length === 0 ? (
                            <p className="text-sm text-slate-500">No activity yet</p>
                        ) : (
                            <div className="space-y-1">
                                {logs.map((log, idx) => (
                                    <div key={idx} className="flex items-start gap-2 text-xs">
                                        <span className="text-slate-400">{log.time}</span>
                                        <span className={
                                            log.type === 'success' ? 'text-green-600' :
                                            log.type === 'error' ? 'text-red-600' :
                                            'text-slate-600'
                                        }>{log.message}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}