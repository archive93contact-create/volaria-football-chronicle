import React from 'react';
import { getEntityTheme } from '@/utils/entityTheme';

export default function AnalyticsInsightGrid({ items = [], accentColor = '#334155' }) {
    const theme = getEntityTheme({ primary: accentColor });
    const visible = items.filter(item => item && item.value !== undefined && item.value !== null && item.value !== '');
    if (!visible.length) return null;

    return (
        <div className="rounded-2xl border overflow-hidden shadow-sm" style={{ borderColor: theme.border, background: `linear-gradient(135deg, ${theme.tint}, rgba(255,255,255,.99) 44%, #fff)` }}>
            <div className="h-[3px]" style={{ background: `linear-gradient(90deg, ${theme.ui}, ${theme.accent}, transparent 82%)` }} />
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/80">
                {visible.map((item, index) => {
                    const Icon = item.icon;
                    const semanticColor = item.tone === 'positive' ? '#15803d' : item.tone === 'negative' ? '#b91c1c' : theme.ui;
                    return (
                        <div key={`${item.label}-${index}`} className="p-4 sm:p-5 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                                {Icon && <Icon className="w-4 h-4 shrink-0" style={{ color: semanticColor }} />}
                                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{item.label}</span>
                            </div>
                            <div className="text-xl font-black tracking-tight" style={{ color: semanticColor }}>{item.value}</div>
                            {item.detail && <p className="mt-1 text-xs leading-relaxed text-slate-500">{item.detail}</p>}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
