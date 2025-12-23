import React from 'react';
import PageHeader from '@/components/common/PageHeader';
import AdminOnly, { useIsAdmin } from '@/components/common/AdminOnly';
import UpdatePlayerImages from '@/components/players/UpdatePlayerImages';
import { Loader2 } from 'lucide-react';

export default function UpdateAllPlayerImages() {
    const { isAdmin, isLoading } = useIsAdmin();

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <p className="text-slate-500">Admin access required</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <PageHeader
                title="Update Player Images"
                subtitle="Regenerate all player images to match current club colors"
                breadcrumbs={[{ label: 'Update Player Images' }]}
            />

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <UpdatePlayerImages clubId={null} />
            </div>
        </div>
    );
}