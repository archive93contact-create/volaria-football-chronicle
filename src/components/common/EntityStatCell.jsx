import React from 'react';

export default function EntityStatCell({ icon: Icon, value, label, accentColor = '#334155', valueColor, iconColor, className = '' }) {
    const resolvedIcon = iconColor || valueColor || accentColor;
    const resolvedValue = valueColor || '#0f172a';

    return (
        <div className={`relative min-h-[106px] px-4 py-4 flex flex-col items-center justify-center text-center ${className}`}>
            {Icon && (
                <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ backgroundColor: `${resolvedIcon}12` }}>
                    <Icon className="w-4.5 h-4.5" style={{ color: resolvedIcon }} />
                </div>
            )}
            <div className="text-xl sm:text-2xl font-black tracking-tight" style={{ color: resolvedValue }}>{value}</div>
            <div className="mt-1 text-[10px] sm:text-[11px] uppercase tracking-[0.12em] font-bold text-slate-500 leading-tight">{label}</div>
        </div>
    );
}
