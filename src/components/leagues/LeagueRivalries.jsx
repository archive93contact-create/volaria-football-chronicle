import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Swords, MapPin, Trophy, Globe2, TrendingUp, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { buildLeagueRivalries } from '@/lib/rivalryEngine';

const TYPE_ICON = {
  local_derby: MapPin,
  district_derby: MapPin,
  regional_rivalry: MapPin,
  title_rivalry: Trophy,
  promotion_rivalry: TrendingUp,
  survival_rivalry: Shield,
  continental: Globe2,
};

export default function LeagueRivalries({ clubs = [], leagueTables = [] }) {
  const { data: continentalMatches = [] } = useQuery({
    queryKey: ['continentalMatchesForLeagueRivalry'],
    queryFn: () => base44.entities.ContinentalMatch.list(),
    staleTime: 15 * 60 * 1000,
  });
  const { data: nations = [] } = useQuery({
    queryKey: ['nationsForLeagueRivalry'],
    queryFn: () => base44.entities.Nation.list(),
    staleTime: 30 * 60 * 1000,
  });

  const activeClubs = useMemo(() => clubs.filter(c => !c.is_former_name && !c.is_defunct && c.is_active !== false), [clubs]);
  const rivalries = useMemo(
    () => buildLeagueRivalries(activeClubs, leagueTables, continentalMatches, nations, 9),
    [activeClubs, leagueTables, continentalMatches, nations]
  );

  if (!rivalries.length) return null;

  return (
    <Card className="border border-slate-200 shadow-sm mb-8 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Current division</div>
            <CardTitle className="mt-1 flex items-center gap-2"><Swords className="w-5 h-5 text-slate-700" />Rivalries inside this league</CardTitle>
            <p className="mt-1 text-sm text-slate-500">The same rivalry model used on club pages: geography provides the natural derby base, while shared history determines intensity.</p>
          </div>
          <Badge variant="outline">{rivalries.length} leading pairings</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {rivalries.map((rivalry, idx) => {
            const Icon = TYPE_ICON[rivalry.primaryType.key] || Swords;
            return (
              <div key={`${rivalry.club1.id}-${rivalry.club2.id}`} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {rivalry.club1.logo_url ? <img src={rivalry.club1.logo_url} alt="" className="w-9 h-9 object-contain" /> : <Shield className="w-8 h-8 text-slate-300" />}
                    <Swords className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    {rivalry.club2.logo_url ? <img src={rivalry.club2.logo_url} alt="" className="w-9 h-9 object-contain" /> : <Shield className="w-8 h-8 text-slate-300" />}
                  </div>
                  <div className="text-right flex-shrink-0"><div className="font-black text-slate-900">{rivalry.score}</div><div className="text-[9px] uppercase tracking-wider text-slate-400">index</div></div>
                </div>
                <div className="mt-3 text-sm font-bold leading-5">
                  <Link to={createPageUrl(`ClubDetail?id=${rivalry.club1.id}`)} className="hover:underline">{rivalry.club1.name}</Link>
                  <span className="text-slate-400 font-normal"> vs </span>
                  <Link to={createPageUrl(`ClubDetail?id=${rivalry.club2.id}`)} className="hover:underline">{rivalry.club2.name}</Link>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge variant="outline" className="text-[10px]"><Icon className="w-3 h-3 mr-1" />{rivalry.primaryType.label}</Badge>
                  <Badge variant="outline" className="text-[10px]">{rivalry.intensity.label}</Badge>
                  {rivalry.status !== 'active' && <Badge variant="outline" className="text-[10px] capitalize">{rivalry.status}</Badge>}
                </div>
                <div className="mt-3 text-xs leading-5 text-slate-500">{rivalry.reasons.slice(0, 3).join(' · ')}</div>
                {idx === 0 && rivalry.statusNote && <div className="mt-2 text-xs italic text-slate-400">{rivalry.statusNote}</div>}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
