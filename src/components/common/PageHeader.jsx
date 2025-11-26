import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function PageHeader({ title, subtitle, breadcrumbs = [], image, children }) {
    return (
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?w=1920')] opacity-10 bg-cover bg-center" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 to-transparent" />
            
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
                {breadcrumbs.length > 0 && (
                    <nav className="flex items-center gap-2 text-sm text-slate-400 mb-6">
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
                        <div className="hidden sm:block w-24 h-24 md:w-32 md:h-32 bg-white rounded-2xl p-3 shadow-2xl">
                            <img src={image} alt={title} className="w-full h-full object-contain" />
                        </div>
                    )}
                    <div className="flex-1">
                        <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
                            {title}
                        </h1>
                        {subtitle && (
                            <p className="mt-3 text-lg text-slate-300 max-w-2xl">
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