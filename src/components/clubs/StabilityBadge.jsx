import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TrendingUp, TrendingDown, AlertTriangle, Shield, Skull } from 'lucide-react';

const statusConfig = {
    thriving: { 
        label: 'Thriving', 
        color: 'bg-emerald-500 hover:bg-emerald-600', 
        icon: TrendingUp,
        description: 'Excellent financial health and facilities'
    },
    stable: { 
        label: 'Stable', 
        color: 'bg-blue-500 hover:bg-blue-600', 
        icon: Shield,
        description: 'Solid foundation with good facilities'
    },
    struggling: { 
        label: 'Struggling', 
        color: 'bg-amber-500 hover:bg-amber-600', 
        icon: TrendingDown,
        description: 'Financial difficulties, limited facilities'
    },
    at_risk: { 
        label: 'At Risk', 
        color: 'bg-red-500 hover:bg-red-600', 
        icon: AlertTriangle,
        description: 'Severe financial problems, may fold'
    },
    folded: { 
        label: 'Folded', 
        color: 'bg-slate-500 hover:bg-slate-600', 
        icon: Skull,
        description: 'Club has ceased operations'
    }
};

export default function StabilityBadge({ status, points, showPoints = false, size = 'default' }) {
    if (!status) return null;
    
    const config = statusConfig[status] || statusConfig.stable;
    const Icon = config.icon;
    
    const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1';

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger>
                    <Badge className={`${config.color} ${sizeClasses} inline-flex items-center gap-1`}>
                        <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
                        {config.label}
                        {showPoints && points !== undefined && (
                            <span className="ml-1 opacity-80">({points})</span>
                        )}
                    </Badge>
                </TooltipTrigger>
                <TooltipContent>
                    <p className="font-medium">{config.description}</p>
                    {points !== undefined && <p className="text-xs opacity-80">Stability Points: {points}</p>}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}