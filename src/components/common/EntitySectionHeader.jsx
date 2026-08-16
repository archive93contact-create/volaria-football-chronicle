import React from 'react';

export default function EntitySectionHeader({ eyebrow, title, description, accentColor = '#334155', className = '' }) {
    return (
        <div className={`mb-4 sm:mb-5 ${className}`}>
            {eyebrow && <div className="text-[10px] sm:text-xs font-black uppercase tracking-[0.18em] text-slate-400 mb-1.5">{eyebrow}</div>}
            <div className="flex items-start gap-3">
                <span className="w-1 self-stretch min-h-9 rounded-full shrink-0" style={{ backgroundColor: accentColor }} />
                <div>
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950">{title}</h2>
                    {description && <p className="mt-1 text-sm text-slate-500 max-w-3xl leading-relaxed">{description}</p>}
                </div>
            </div>
        </div>
    );
}
