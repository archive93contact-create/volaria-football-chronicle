import React, { useMemo } from 'react';
import { BookOpen, Clock3, Sparkles, TrendingUp, Trophy, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import ThemedCard from '@/components/common/ThemedCard';
import AnalyticsInsightGrid from '@/components/analytics/AnalyticsInsightGrid';
import { buildComparativeInsights, buildHistoricalInsights, buildLivingNarrative, detectClubEras } from '@/lib/clubImmersion';

const ERA_TONES = {
    golden_era: 'border-amber-200 bg-amber-50/70 text-amber-900',
    dynasty: 'border-amber-200 bg-amber-50/70 text-amber-900',
    rise: 'border-emerald-200 bg-emerald-50/70 text-emerald-900',
    revival: 'border-emerald-200 bg-emerald-50/70 text-emerald-900',
    decline: 'border-red-200 bg-red-50/60 text-red-900',
    yo_yo: 'border-violet-200 bg-violet-50/60 text-violet-900',
    top_flight_stability: 'border-sky-200 bg-sky-50/60 text-sky-900',
    wilderness: 'border-slate-300 bg-slate-100/70 text-slate-800',
};

export default function ClubLivingHistory({ club, seasons = [], leagues = [], allClubs = [], accentColor = '#334155' }) {
    const eras = useMemo(() => detectClubEras(seasons, leagues), [seasons, leagues]);
    const historicalInsights = useMemo(() => buildHistoricalInsights(club, seasons, leagues), [club, seasons, leagues]);
    const comparative = useMemo(() => buildComparativeInsights(club, allClubs, seasons, leagues), [club, allClubs, seasons, leagues]);
    const narrative = useMemo(() => buildLivingNarrative(club, seasons, leagues), [club, seasons, leagues]);
    const latestYear = useMemo(() => [...seasons].sort((a, b) => String(b.year || '').localeCompare(String(a.year || ''), undefined, { numeric: true }))[0]?.year, [seasons]);

    const comparisonItems = comparative.map((item, index) => ({
        ...item,
        icon: index === 0 ? Trophy : index === 3 ? MapPin : TrendingUp,
    }));

    return (
        <div className="space-y-6">
            <ThemedCard title="Living Club History" icon={BookOpen} primaryColor={accentColor} accentColor={accentColor}>
                <div className="flex flex-wrap items-center gap-2 mb-5">
                    <Badge variant="outline" className="bg-white/65 border-slate-200 text-slate-600">
                        <Clock3 className="w-3 h-3 mr-1" /> Through {latestYear || 'no recorded season'}
                    </Badge>
                    <Badge variant="outline" className="bg-white/65 border-slate-200 text-slate-600">
                        <Sparkles className="w-3 h-3 mr-1" /> Recalculates from league data
                    </Badge>
                </div>
                <div className="max-w-4xl">
                    {narrative.split('\n\n').map((paragraph, index) => (
                        <p key={index} className="text-[15px] sm:text-base text-slate-700 leading-7 mb-4 last:mb-0">{paragraph}</p>
                    ))}
                </div>
            </ThemedCard>

            {eras.length > 0 && (
                <ThemedCard title="Detected Eras" icon={Clock3} primaryColor={accentColor} accentColor={accentColor}>
                    <div className="relative ml-2 sm:ml-3 border-l border-slate-200 pl-5 sm:pl-7 space-y-5">
                        {eras.map((item, index) => (
                            <div key={`${item.type}-${item.startYear}-${index}`} className="relative">
                                <span className="absolute -left-[27px] sm:-left-[35px] top-2 w-3 h-3 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: accentColor }} />
                                <div className={`rounded-xl border px-4 py-3 ${ERA_TONES[item.type] || 'border-slate-200 bg-white/65 text-slate-800'}`}>
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="font-black text-sm sm:text-base">{item.label}</div>
                                        <div className="text-xs font-bold opacity-65">{item.startYear}–{item.endYear}</div>
                                    </div>
                                    <p className="mt-1.5 text-sm leading-6 opacity-80">{item.summary}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </ThemedCard>
            )}

            {comparisonItems.length > 0 && (
                <div>
                    <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.15em] text-slate-500">
                        <TrendingUp className="w-4 h-4" style={{ color: accentColor }} /> Comparative standing
                    </div>
                    <AnalyticsInsightGrid items={comparisonItems} accentColor={accentColor} />
                </div>
            )}

            {historicalInsights.length > 0 && (
                <ThemedCard title="Why This Matters" icon={Trophy} primaryColor={accentColor} accentColor={accentColor}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                        {historicalInsights.map((item, index) => (
                            <div key={`${item.headline}-${index}`} className="py-3 border-b border-slate-200/70 last:border-b-0 md:[&:nth-last-child(-n+2)]:border-b-0">
                                <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{item.category}</div>
                                <div className="mt-1 font-bold text-slate-900">{item.headline}</div>
                                <div className="mt-1 text-sm leading-6 text-slate-600">{item.detail}</div>
                            </div>
                        ))}
                    </div>
                </ThemedCard>
            )}
        </div>
    );
}
