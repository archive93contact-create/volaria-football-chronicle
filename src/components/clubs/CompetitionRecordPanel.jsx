import React from 'react';
import { Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function CompetitionRecordPanel({ competition, shortName, theme, appearances = 0, titles = 0, runnerUp = 0, bestFinish, bestFinishYear, titleYears }) {
    return (
        <div
            className="overflow-hidden rounded-2xl border"
            style={{
                borderColor: theme.border,
                background: `radial-gradient(circle at 0% 0%, ${theme.tintStrong} 0%, transparent 48%), linear-gradient(145deg, ${theme.tint} 0%, rgba(255,255,255,.98) 42%, #ffffff 84%)`
            }}
        >
            <div className="h-[3px]" style={{ background: `linear-gradient(90deg, ${theme.primary}, ${theme.secondary}, transparent 84%)` }} />
            <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <Badge className="text-white" style={{ backgroundColor: theme.primary }}>{shortName}</Badge>
                            <h3 className="font-black text-slate-900">{competition?.name || shortName}</h3>
                        </div>
                        {competition?.description && <p className="mt-1 text-xs text-slate-500 leading-relaxed">{competition.description}</p>}
                    </div>
                    {titles > 0 && <Trophy className="w-5 h-5 shrink-0" style={{ color: theme.ui }} />}
                </div>

                <div className="grid grid-cols-2 divide-x divide-y border rounded-xl overflow-hidden" style={{ borderColor: theme.border }}>
                    <Stat label="Appearances" value={appearances} />
                    <Stat label="Titles" value={titles} valueColor={theme.ui} />
                    <Stat label="Finals lost" value={runnerUp} />
                    <Stat label="Best finish" value={bestFinish || (titles > 0 ? 'Winner' : 'N/A')} sub={bestFinishYear} />
                </div>

                {titleYears && (
                    <div className="mt-4 pt-4 border-t text-sm" style={{ borderColor: theme.border }}>
                        <span className="text-slate-400 uppercase tracking-[0.12em] text-[10px] font-black">Title years</span>
                        <div className="mt-1 font-semibold text-slate-800">{titleYears}</div>
                    </div>
                )}
            </div>
        </div>
    );
}

function Stat({ label, value, sub, valueColor = '#0f172a' }) {
    return (
        <div className="p-4 bg-white/55">
            <div className="text-[10px] uppercase tracking-[0.12em] font-bold text-slate-400">{label}</div>
            <div className="mt-1 text-xl font-black" style={{ color: valueColor }}>{value}</div>
            {sub && <div className="text-xs text-slate-500">{sub}</div>}
        </div>
    );
}
