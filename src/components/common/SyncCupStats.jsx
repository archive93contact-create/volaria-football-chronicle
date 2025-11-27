import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { base44 } from '@/api/base44Client';
import { RefreshCw, Loader2, CheckCircle } from 'lucide-react';

// Helper to initialize club stats
const initClubStats = (clubStats, clubId) => {
    if (!clubStats[clubId]) {
        clubStats[clubId] = { 
            titles: 0, 
            titleYears: [], 
            runnerUp: 0,
            bestFinish: null,
            bestFinishYear: null
        };
    }
};

// Round order for comparing best finishes (lower index = better)
const ROUND_ORDER = [
    'Winner', 'Final', 'Semi-final', 'Quarter-final', 
    'Round of 16', 'Round of 32', 'Round of 64', 'Round of 128',
    'Fifth Round', 'Fourth Round', 'Third Round', 'Second Round', 'First Round'
];

function isRoundBetter(newRound, currentRound) {
    if (!currentRound) return true;
    const newIdx = ROUND_ORDER.indexOf(newRound);
    const currIdx = ROUND_ORDER.indexOf(currentRound);
    // If not found in list, treat as worse than anything known
    if (newIdx === -1) return false;
    if (currIdx === -1) return true;
    return newIdx < currIdx;
}

// Utility function to sync domestic cup stats to clubs
export async function syncCupStatsToClubs(nationId = null) {
    // Fetch all cup seasons
    const cupSeasons = await base44.entities.DomesticCupSeason.list();
    const cups = await base44.entities.DomesticCup.list();
    const clubs = await base44.entities.Club.list();
    
    // Filter by nation if specified, and only main cups
    const relevantCups = nationId 
        ? cups.filter(c => c.nation_id === nationId && c.is_main_cup !== false)
        : cups.filter(c => c.is_main_cup !== false);
    const cupIds = relevantCups.map(c => c.id);
    const relevantSeasons = cupSeasons.filter(s => cupIds.includes(s.cup_id));
    
    // Build stats per club
    const clubStats = {};
    
    relevantSeasons.forEach(season => {
        // Winner stats
        if (season.champion_name) {
            const club = clubs.find(c => c.name === season.champion_name || c.id === season.champion_id);
            if (club) {
                initClubStats(clubStats, club.id);
                clubStats[club.id].titles++;
                clubStats[club.id].titleYears.push(season.year);
                if (isRoundBetter('Winner', clubStats[club.id].bestFinish)) {
                    clubStats[club.id].bestFinish = 'Winner';
                    clubStats[club.id].bestFinishYear = season.year;
                }
            }
        }
        
        // Runner-up stats
        if (season.runner_up) {
            const club = clubs.find(c => c.name === season.runner_up || c.id === season.runner_up_id);
            if (club) {
                initClubStats(clubStats, club.id);
                clubStats[club.id].runnerUp++;
                if (isRoundBetter('Final', clubStats[club.id].bestFinish)) {
                    clubStats[club.id].bestFinish = 'Final';
                    clubStats[club.id].bestFinishYear = season.year;
                }
            }
        }
    });
    
    // Also check cup matches for all participants
    const cupMatches = await base44.entities.DomesticCupMatch.list();
    const relevantMatches = cupMatches.filter(m => {
        const season = relevantSeasons.find(s => s.id === m.season_id);
        return !!season;
    });
    
    relevantMatches.forEach(match => {
        const season = relevantSeasons.find(s => s.id === match.season_id);
        if (!season || !match.winner) return;
        
        // Determine the round the loser went out in
        const loser = match.winner === match.home_club_name ? match.away_club_name : match.home_club_name;
        const loserId = match.winner === match.home_club_name ? match.away_club_id : match.home_club_id;
        const club = clubs.find(c => c.name === loser || c.id === loserId);
        
        if (club) {
            initClubStats(clubStats, club.id);
            // The loser's best finish for this season is the round they lost in
            if (isRoundBetter(match.round, clubStats[club.id].bestFinish)) {
                clubStats[club.id].bestFinish = match.round;
                clubStats[club.id].bestFinishYear = season.year;
            }
        }
    });
    
    // Update clubs
    const updates = [];
    for (const [clubId, stats] of Object.entries(clubStats)) {
        updates.push(
            base44.entities.Club.update(clubId, {
                domestic_cup_titles: stats.titles,
                domestic_cup_title_years: stats.titleYears.sort().join(', '),
                domestic_cup_runner_up: stats.runnerUp,
                domestic_cup_best_finish: stats.bestFinish,
                domestic_cup_best_finish_year: stats.bestFinishYear
            })
        );
    }
    
    await Promise.all(updates);
    return Object.keys(clubStats).length;
}

export default function SyncCupStatsButton({ nationId = null, onComplete }) {
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState(null);

    const handleSync = async () => {
        setIsSyncing(true);
        setSyncResult(null);
        try {
            const count = await syncCupStatsToClubs(nationId);
            setSyncResult({ success: true, count });
            if (onComplete) onComplete();
        } catch (error) {
            console.error('Sync failed:', error);
            setSyncResult({ success: false, error: error.message });
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <div className="flex items-center gap-2">
            <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSync}
                disabled={isSyncing}
            >
                {isSyncing ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Syncing...</>
                ) : (
                    <><RefreshCw className="w-4 h-4 mr-2" /> Sync Cup Stats</>
                )}
            </Button>
            {syncResult?.success && (
                <span className="text-sm text-emerald-600 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" /> Updated {syncResult.count} clubs
                </span>
            )}
        </div>
    );
}