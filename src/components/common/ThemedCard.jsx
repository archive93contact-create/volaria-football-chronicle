import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ThemedCard({ 
    title, 
    icon: Icon, 
    children, 
    primaryColor, 
    accentColor,
    className = ''
}) {
    const borderColor = accentColor || primaryColor;
    
    return (
        <Card 
            className={`border-0 shadow-sm ${className}`}
            style={{
                borderLeft: borderColor ? `4px solid ${borderColor}` : undefined,
                backgroundColor: primaryColor ? `${primaryColor}05` : undefined
            }}
        >
            {title && (
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        {Icon && <Icon className="w-5 h-5" style={{ color: accentColor || primaryColor }} />}
                        {title}
                    </CardTitle>
                </CardHeader>
            )}
            <CardContent className={!title ? 'p-6' : ''}>
                {children}
            </CardContent>
        </Card>
    );
}