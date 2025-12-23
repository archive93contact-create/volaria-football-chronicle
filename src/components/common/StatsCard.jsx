import React from 'react';
import { Card, CardContent } from "@/components/ui/card";

export default function StatsCard({ 
    icon: Icon, 
    label, 
    value, 
    color = 'slate', 
    gradient = false,
    size = 'default'
}) {
    const colorClasses = {
        amber: gradient ? 'bg-gradient-to-br from-amber-100 to-yellow-100 border-amber-200' : 'bg-amber-50',
        green: gradient ? 'bg-gradient-to-br from-green-100 to-emerald-100 border-green-200' : 'bg-green-50',
        red: gradient ? 'bg-gradient-to-br from-red-100 to-rose-100 border-red-200' : 'bg-red-50',
        blue: gradient ? 'bg-gradient-to-br from-blue-100 to-indigo-100 border-blue-200' : 'bg-blue-50',
        purple: gradient ? 'bg-gradient-to-br from-purple-100 to-pink-100 border-purple-200' : 'bg-purple-50',
        slate: gradient ? 'bg-gradient-to-br from-slate-100 to-gray-100 border-slate-200' : 'bg-slate-50',
        orange: gradient ? 'bg-gradient-to-br from-orange-100 to-amber-100 border-orange-200' : 'bg-orange-50'
    };

    const iconColorClasses = {
        amber: 'text-amber-500',
        green: 'text-green-500',
        red: 'text-red-500',
        blue: 'text-blue-500',
        purple: 'text-purple-500',
        slate: 'text-slate-500',
        orange: 'text-orange-500'
    };

    const textColorClasses = {
        amber: 'text-amber-800',
        green: 'text-green-800',
        red: 'text-red-800',
        blue: 'text-blue-800',
        purple: 'text-purple-800',
        slate: 'text-slate-800',
        orange: 'text-orange-800'
    };

    const sizeClasses = size === 'small' ? 'p-3' : 'p-4';
    const iconSize = size === 'small' ? 'w-5 h-5' : 'w-6 h-6';
    const textSize = size === 'small' ? 'text-lg' : 'text-2xl';

    return (
        <Card className={`border-0 shadow-sm ${colorClasses[color]} ${gradient ? 'border' : ''}`}>
            <CardContent className={`${sizeClasses} text-center`}>
                <Icon className={`${iconSize} ${iconColorClasses[color]} mx-auto mb-2`} />
                <div className={`${textSize} font-bold ${textColorClasses[color]}`}>{value}</div>
                <div className="text-xs text-slate-600">{label}</div>
            </CardContent>
        </Card>
    );
}