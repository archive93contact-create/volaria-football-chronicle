import React from 'react';

export default function EntitySectionHeader({ eyebrow, title, description, accentColor = '#334155', className = '' }) {
    return (
        <div className={`mb-4 sm:mb-5 ${className}`}>
            {eyebrow && (
                <div className="flex items-center gap-2 mb-1.5">
                    <span className="h-[2px] w-7 rounded-full" style={{ backgroundColor: accentColor }} />
                    <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.18em] text-slate-400">{eyebrow}</span>
                </div>
            )}
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950">{title}</h2>
            {description && <p className="mt-1 text-sm text-slate-500 max-w-3xl leading-relaxed">{description}</p>}
        </div>
    );
}
