import React from 'react';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function EntityStickyNav({ image, name, items = [], accentColor = '#334155' }) {
    return (
        <div className="md:hidden sticky top-16 z-40 -mx-4 bg-white/95 backdrop-blur-md border-y border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 px-3 pt-2 min-w-0">
                {image && <img src={image} alt="" className="w-7 h-7 object-contain shrink-0" />}
                <div className="text-xs font-black tracking-tight text-slate-900 truncate">{name}</div>
            </div>
            <div className="overflow-x-auto px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <TabsList className="h-10 w-max min-w-full justify-start gap-0 rounded-none bg-transparent p-0">
                    {items.map(([value, label]) => (
                        <TabsTrigger
                            key={value}
                            value={value}
                            className="h-10 rounded-none border-b-2 border-transparent px-3 text-xs font-semibold text-slate-500 data-[state=active]:bg-transparent data-[state=active]:text-slate-950 data-[state=active]:shadow-none"
                            style={{ '--entity-nav-accent': accentColor }}
                        >
                            <span className="relative">{label}</span>
                        </TabsTrigger>
                    ))}
                </TabsList>
            </div>
            <style>{`.sticky [role="tab"][data-state="active"] { border-bottom-color: var(--entity-nav-accent) !important; }`}</style>
        </div>
    );
}
