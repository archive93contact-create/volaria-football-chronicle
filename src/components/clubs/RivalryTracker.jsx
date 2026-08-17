import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Swords, MapPin, Trophy, Globe2, TrendingUp, History, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Badge } from '@/components/ui/badge';
import { buildRivalriesForClub } from '@/lib/rivalryEngine';

const TYPE_ICONS = {
  local_derby: MapPin,
  district_derby: MapPin,
  regional_rivalry: MapPin,
  title_rivalry: Trophy,
  promotion_rivalry: TrendingUp,
  survival_rivalry: Shield,
  continental: Globe2,
  historic_rivalry: History,
  competitive_rivalry: Swords,
  football_rivalry: Swords,
};

const intensityClasses = {
  Legendary: 'bg-violet-50 text-violet-800 border-violet-200',
  Fierce: 'bg-red-50 text-red-800 border-red-200',
  Intense: 'bg-orange-50 text-orange-800 border-orange-200',
  Strong: 'bg-amber-50 text-amber-800 border-amber-200',
  Emerging: 'bg-cyan-50 text-cyan-800 border-cyan-200',
  Historic: 'bg-slate-100 text-slate-700 border-slate-300',
  Cooling: 'bg-slate-50 text-slate-600 border-slate-200',
  Fading: 'bg-slate-50 text-slate-500 border-dashed border-slate-300',
  Rivals: 'bg-slate-50 text-slate-700 border-slate-200',
};

export default function RivalryTracker({ club, allClubs = [], allLeagueTables = [] }) {
  const { data: continentalMatches = [] } = useQuery({
    queryKey: ['continentalMatchesForRivalry'],
    queryFn: () => base44.entities.ContinentalMatch.list(),
    enabled: !!club?.id,
    staleTime: 10 * 60 * 1000,
  });

  const { data: nations = [] } = useQuery({
    queryKey: ['nationsForRivalry'],
    queryFn: () => base44.entities.Nation.list(),
    staleTime: 30 * 60 * 1000,
  });

  const { data: allClubsData = [] } = useQuery({
    queryKey: ['allClubsForRivalry'],
    queryFn: () => base44.entities.Club.list(),
    enabled: !!club?.id,
    staleTime: 10 * 60 * 1000,
  });

  const { data: fetchedLeagueTables = [] } = useQuery({
    queryKey: ['leagueTablesForRivalry'],
    queryFn: () => base44.entities.LeagueTable.list(),
    enabled: !!club?.id,
    staleTime: 10 * 60 * 1000,
  });

  const clubPool = allClubsData.length ? allClubsData : allClubs;
  const leagueTables = allLeagueTables.length ? allLeagueTables : fetchedLeagueTables;
  const candidates = useMemo(() => {
    if (!club) return [];
    const opponentNames = new Set();
    const opponentIds = new Set();
    continentalMatches.forEach(match => {
      const homeMatchesClub = match.home_club_id === club.id || match.home_club_name === club.name;
      const awayMatchesClub = match.away_club_id === club.id || match.away_club_name === club.name;
      if (homeMatchesClub) {
        if (match.away_club_id) opponentIds.add(match.away_club_id);
        if (match.away_club_name) opponentNames.add(match.away_club_name);
      } else if (awayMatchesClub) {
        if (match.home_club_id) opponentIds.add(match.home_club_id);
        if (match.home_club_name) opponentNames.add(match.home_club_name);
      }
    });
    return clubPool.filter(c => c.id !== club.id && !c.is_former_name && (
      c.nation_id === club.nation_id || opponentIds.has(c.id) || opponentNames.has(c.name)
    ));
  }, [club, clubPool, continentalMatches]);
  const rivalries = useMemo(
    () => buildRivalriesForClub(club, candidates, leagueTables, continentalMatches, nations, 12),
    [club, candidates, leagueTables, continentalMatches, nations]
  );

  if (!rivalries.length) return null;

  const top = rivalries[0];
  const accent = club.primary_color || club.accent_color || '#334155';

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden border border-slate-200 shadow-sm">
        <div className="h-1" style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }} />
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Rivalry landscape</div>
              <CardTitle className="mt-1 flex items-center gap-2 text-xl"><Swords className="w-5 h-5" style={{ color: accent }} />{club.name}'s football enemies</CardTitle>
              <p className="mt-1 text-sm text-slate-500 max-w-2xl">Locality creates the base; shared divisions, title races, promotions, relegations and continental meetings decide how much weight the rivalry acquires over time.</p>
            </div>
            <Badge variant="outline" className="w-fit">{rivalries.length} significant rivalries</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 sm:p-5">
            <div className="flex items-start gap-4">
              <div className="flex items-center gap-2 flex-shrink-0">
                {club.logo_url ? <img src={club.logo_url} alt="" className="w-12 h-12 object-contain" /> : <Shield className="w-10 h-10 text-slate-300" />}
                <Swords className="w-5 h-5 text-slate-400" />
                {top.club.logo_url ? <img src={top.club.logo_url} alt="" className="w-12 h-12 object-contain" /> : <Shield className="w-10 h-10 text-slate-300" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link to={createPageUrl(`ClubDetail?id=${top.club.id}`)} className="text-lg font-black text-slate-900 hover:underline">{top.club.name}</Link>
                  <Badge className={`border ${intensityClasses[top.intensity.label] || intensityClasses.Rivals}`}>{top.intensity.label}</Badge>
                  <Badge variant="outline">{top.primaryType.label}</Badge>
                </div>
                <div className="mt-2 text-sm leading-6 text-slate-600">{top.statusNote || `${top.sharedSeasons} shared league seasons have given this rivalry its competitive history.`}</div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {top.reasons.map(reason => <span key={reason} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{reason}</span>)}
                </div>
              </div>
              <div className="hidden sm:block text-right flex-shrink-0"><div className="text-2xl font-black text-slate-900">{top.score}</div><div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Rivalry index</div></div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {rivalries.slice(1).map(rivalry => {
          const TypeIcon = TYPE_ICONS[rivalry.primaryType.key] || Swords;
          const style = intensityClasses[rivalry.intensity.label] || intensityClasses.Rivals;
          return (
            <Card key={rivalry.club.id} className={`border shadow-none ${rivalry.status === 'fading' ? 'border-dashed border-slate-300' : 'border-slate-200'}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {rivalry.club.logo_url ? <img src={rivalry.club.logo_url} alt="" className="w-10 h-10 object-contain flex-shrink-0" /> : <Shield className="w-9 h-9 text-slate-300 flex-shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link to={createPageUrl(`ClubDetail?id=${rivalry.club.id}`)} className="font-black text-slate-900 hover:underline">{rivalry.club.name}</Link>
                      {rivalry.nationFlag && rivalry.club.nation_id !== club.nation_id && <img src={rivalry.nationFlag} alt="" className="w-5 h-3 rounded object-cover" />}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Badge className={`border text-[10px] ${style}`}>{rivalry.intensity.label}</Badge>
                      <Badge variant="outline" className="text-[10px]"><TypeIcon className="w-3 h-3 mr-1" />{rivalry.primaryType.label}</Badge>
                    </div>
                    {rivalry.statusNote && <div className="mt-2 text-xs italic text-slate-500">{rivalry.statusNote}</div>}
                  </div>
                  <div className="text-right"><div className="font-black text-slate-800">{rivalry.score}</div><div className="text-[9px] uppercase text-slate-400">index</div></div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {rivalry.reasons.slice(0, 4).map(reason => <span key={reason} className="rounded bg-slate-50 px-2 py-1 text-[11px] text-slate-500">{reason}</span>)}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="text-xs text-slate-400">Rivalry type can change through history: a local derby can also become a title rivalry, while old competitive rivalries may cool or become historic when clubs stop meeting.</div>
    </div>
  );
}
