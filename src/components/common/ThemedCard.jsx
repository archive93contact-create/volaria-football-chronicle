import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getEntityTheme } from '@/utils/entityTheme';

export default function ThemedCard({ 
    title, 
    icon: Icon, 
    children, 
    primaryColor, 
    accentColor,
    className = ''
}) {
    const theme = getEntityTheme({ primary: primaryColor, accent: accentColor });
    const hasIdentity = Boolean(primaryColor || accentColor);

    return (
        <Card 
            className={`relative overflow-hidden border shadow-sm ${className}`}
            style={{
                borderColor: hasIdentity ? theme.border : '#e2e8f0',
                background: hasIdentity
                    ? `radial-gradient(circle at 0% 0%, ${theme.tintStrong} 0%, transparent 42%), linear-gradient(135deg, ${theme.tint} 0%, rgba(255,255,255,0.98) 34%, #ffffff 78%)`
                    : '#ffffff'
            }}
        >
            {hasIdentity && (
                <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${theme.ui}, ${theme.accent}, transparent 82%)` }} />
            )}
            {title && (
                <CardHeader className="relative pb-4">
                    <CardTitle className="flex items-center gap-3 text-slate-950">
                        {Icon && (
                            <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: theme.tintStrong }}>
                                <Icon className="w-5 h-5" style={{ color: theme.ui }} />
                            </span>
                        )}
                        <span>{title}</span>
                    </CardTitle>
                </CardHeader>
            )}
            <CardContent className={`relative ${!title ? 'p-6' : ''}`}>
                {children}
            </CardContent>
        </Card>
    );
}