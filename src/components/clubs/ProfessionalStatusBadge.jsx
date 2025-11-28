import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Briefcase, Users, Heart } from 'lucide-react';

export default function ProfessionalStatusBadge({ status, size = 'default' }) {
    const getConfig = () => {
        switch (status) {
            case 'professional':
                return {
                    icon: Briefcase,
                    label: 'PRO',
                    fullLabel: 'Professional',
                    className: 'bg-blue-100 text-blue-700 border-blue-300'
                };
            case 'semi-professional':
                return {
                    icon: Users,
                    label: 'SEMI',
                    fullLabel: 'Semi-Professional',
                    className: 'bg-purple-100 text-purple-700 border-purple-300'
                };
            default:
                return {
                    icon: Heart,
                    label: 'AM',
                    fullLabel: 'Amateur',
                    className: 'bg-slate-100 text-slate-600 border-slate-300'
                };
        }
    };

    const config = getConfig();
    const Icon = config.icon;
    
    if (size === 'small') {
        return (
            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium ${config.className}`}>
                <Icon className="w-3 h-3" />
                {config.label}
            </span>
        );
    }

    return (
        <Badge variant="outline" className={`${config.className} flex items-center gap-1`}>
            <Icon className="w-3.5 h-3.5" />
            <span>{config.fullLabel}</span>
        </Badge>
    );
}