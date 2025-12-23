import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function ImmersiveHeader({ 
    title, 
    subtitle, 
    breadcrumbs = [], 
    image, 
    children,
    primaryColor,
    secondaryColor,
    accentColor,
    textStyle = 'modern',
    pattern,
    atmosphere
}) {
    // Typography based on text style
    const fontFamily = textStyle === 'classic' ? 'Georgia, serif' : 
                       textStyle === 'bold' ? 'Impact, "Arial Black", sans-serif' : 
                       'system-ui, -apple-system, sans-serif';
    
    const fontClass = textStyle === 'classic' ? 'font-serif' : 
                     textStyle === 'bold' ? 'font-black tracking-tight' : 
                     'font-sans';
    
    // Generate gradient
    const gradient = accentColor 
        ? `linear-gradient(135deg, ${primaryColor || '#1e293b'}, ${accentColor}, ${secondaryColor || '#334155'})`
        : `linear-gradient(135deg, ${primaryColor || '#1e293b'}, ${secondaryColor || primaryColor || '#334155'})`;
    
    // Pattern overlay based on pattern preference
    const patternOverlay = pattern === 'vertical_stripes' ? 'repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 0px, transparent 2px, transparent 20px, rgba(255,255,255,0.03) 22px)' :
                          pattern === 'horizontal_hoops' ? 'repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0px, transparent 2px, transparent 20px, rgba(255,255,255,0.03) 22px)' :
                          pattern === 'diagonal_stripe' ? 'repeating-linear-gradient(45deg, rgba(255,255,255,0.03) 0px, transparent 2px, transparent 30px, rgba(255,255,255,0.03) 32px)' :
                          'none';
    
    // Atmosphere descriptor styling
    const atmosphereText = atmosphere ? {
        'electric': '⚡ Electric Atmosphere',
        'historic': '🏛️ Historic Ground',
        'intimate': '🤝 Intimate Setting',
        'fortress': '🏰 Fortress',
        'modern': '✨ Modern Arena'
    }[atmosphere] : null;

    return (
        <div className="relative overflow-hidden" style={{ background: gradient }}>
            <div className="absolute inset-0 bg-black/30" style={{ backgroundImage: patternOverlay }} />
            {atmosphere && (
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1920')] opacity-5 bg-cover bg-center" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
                {breadcrumbs.length > 0 && (
                    <nav className="flex items-center gap-2 text-sm text-white/70 mb-6 flex-wrap">
                        <Link to={createPageUrl('Home')} className="hover:text-white transition-colors">
                            Volaria
                        </Link>
                        {breadcrumbs.map((crumb, index) => (
                            <React.Fragment key={index}>
                                <ChevronRight className="w-4 h-4" />
                                {crumb.url ? (
                                    <Link to={crumb.url} className="hover:text-white transition-colors">
                                        {crumb.label}
                                    </Link>
                                ) : (
                                    <span className="text-white">{crumb.label}</span>
                                )}
                            </React.Fragment>
                        ))}
                    </nav>
                )}
                
                <div className="flex items-center gap-6">
                    {image && (
                        <div className="hidden sm:block w-24 h-24 md:w-32 md:h-32 bg-white rounded-2xl p-3 shadow-2xl ring-4 ring-white/20">
                            <img src={image} alt={title} className="w-full h-full object-contain" />
                        </div>
                    )}
                    <div className="flex-1">
                        {atmosphereText && (
                            <div className="text-white/80 text-sm font-medium mb-2">
                                {atmosphereText}
                            </div>
                        )}
                        <h1 className={`text-3xl md:text-5xl font-bold text-white tracking-tight ${fontClass}`} style={{ fontFamily }}>
                            {title}
                        </h1>
                        {subtitle && (
                            <p className="mt-3 text-lg text-white/90 max-w-2xl">
                                {subtitle}
                            </p>
                        )}
                    </div>
                    {children}
                </div>
            </div>
        </div>
    );
}