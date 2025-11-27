import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export function useIsAdmin() {
    const { data: user, isLoading } = useQuery({
        queryKey: ['currentUser'],
        queryFn: async () => {
            try {
                return await base44.auth.me();
            } catch {
                return null;
            }
        },
        staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    });

    return {
        isAdmin: user?.role === 'admin',
        isLoading,
        user
    };
}

export default function AdminOnly({ children, fallback = null }) {
    const { isAdmin, isLoading } = useIsAdmin();

    if (isLoading) return null;
    if (!isAdmin) return fallback;

    return <>{children}</>;
}