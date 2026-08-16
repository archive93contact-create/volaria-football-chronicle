import React from 'react';
import { Navigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

// Legacy compatibility route.
// ContinentalSeasonDetail is now the single canonical continental-edition page and data model.
export default function CompetitionSeasonDetail() {
    const seasonId = new URLSearchParams(window.location.search).get('id');
    if (!seasonId) return <Navigate to={createPageUrl('ContinentalCompetitions')} replace />;
    return <Navigate to={createPageUrl(`ContinentalSeasonDetail?id=${seasonId}`)} replace />;
}
