import React from 'react';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function StabilityBadge({ points, status, iconOnly = false }) {
    const getConfig = () => {
        if (status === 'critical' || points <= -5) {
            return {
                icon: XCircle,
                label: 'Critical',
                iconClass: 'text-red-500'
            };
        }
        if (status === 'at_risk' || points <= 0) {
            return {
                icon: AlertTriangle,
                label: 'At Risk',
                iconClass: 'text-amber-500'
            };
        }
        return {
            icon: CheckCircle,
            label: 'Stable',
            iconClass: 'text-green-500'
        };
    };

    const config = getConfig();
    const Icon = config.icon;

    if (iconOnly) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span className="inline-flex">
                            <Icon className={`w-4 h-4 ${config.iconClass}`} />
                        </span>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{config.label} ({points >= 0 ? '+' : ''}{points} pts)</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    return (
        <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded ${
            status === 'critical' ? 'bg-red-100' :
            status === 'at_risk' ? 'bg-amber-100' : 'bg-green-100'
        }`}>
            <Icon className="w-3 h-3" />
            <span>{config.label}</span>
        </span>
    );
}