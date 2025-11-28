import React from 'react';
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

export default function StabilityBadge({ points, status, showPoints = true, size = 'default' }) {
    const getConfig = () => {
        if (status === 'critical' || points <= -5) {
            return {
                icon: XCircle,
                label: 'Critical',
                className: 'bg-red-100 text-red-700 border-red-300',
                iconClass: 'text-red-500'
            };
        }
        if (status === 'at_risk' || points <= 0) {
            return {
                icon: AlertTriangle,
                label: 'At Risk',
                className: 'bg-amber-100 text-amber-700 border-amber-300',
                iconClass: 'text-amber-500'
            };
        }
        return {
            icon: CheckCircle,
            label: 'Stable',
            className: 'bg-green-100 text-green-700 border-green-300',
            iconClass: 'text-green-500'
        };
    };

    const config = getConfig();
    const Icon = config.icon;
    const sizeClasses = size === 'small' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1';

    return (
        <Badge variant="outline" className={`${config.className} ${sizeClasses} flex items-center gap-1`}>
            <Icon className={`${size === 'small' ? 'w-3 h-3' : 'w-4 h-4'} ${config.iconClass}`} />
            <span>{config.label}</span>
            {showPoints && points !== undefined && (
                <span className="font-mono ml-1">({points >= 0 ? '+' : ''}{points})</span>
            )}
        </Badge>
    );
}