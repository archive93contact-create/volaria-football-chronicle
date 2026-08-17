import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Shield, Plus, Loader2, History } from 'lucide-react';
import AdminOnly from '@/components/common/AdminOnly';
import ThemedCard from '@/components/common/ThemedCard';
import ImageUploader from '@/components/common/ImageUploader';

export default function ClubCrestHistory({ club, accentColor = '#334155' }) {
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ crest_url: '', identity_name: club.name, start_year: '', end_year: '', notes: '', change_reason: '', is_current: false });

  const { data: rows = [] } = useQuery({
    queryKey: ['clubCrestHistory', club?.id],
    queryFn: () => base44.entities.ClubCrestHistory.filter({ club_id: club.id }, 'start_year'),
    enabled: !!club?.id,
  });

  const displayRows = [...rows];
  if (club.logo_url && !displayRows.some(r => r.crest_url === club.logo_url)) {
    displayRows.push({ id: 'current-club-crest', crest_url: club.logo_url, identity_name: club.name, is_current: true, start_year: null, notes: 'Current crest' });
  }
  displayRows.sort((a, b) => Number(a.start_year || 9999) - Number(b.start_year || 9999));

  const save = async () => {
    if (!form.crest_url) return;
    setSaving(true);
    try {
      if (form.is_current) {
        for (const row of rows.filter(r => r.is_current)) await base44.entities.ClubCrestHistory.update(row.id, { is_current: false, end_year: form.start_year ? Number(form.start_year) - 1 : row.end_year });
      }
      await base44.entities.ClubCrestHistory.create({
        club_id: club.id,
        crest_url: form.crest_url,
        identity_name: form.identity_name || club.name,
        start_year: form.start_year ? Number(form.start_year) : undefined,
        end_year: form.end_year ? Number(form.end_year) : undefined,
        notes: form.notes || '',
        change_reason: form.change_reason || '',
        is_current: !!form.is_current,
      });
      if (form.is_current) {
        await base44.entities.Club.update(club.id, { logo_url: form.crest_url });
        queryClient.invalidateQueries({ queryKey: ['club', club.id] });
      }
      queryClient.invalidateQueries({ queryKey: ['clubCrestHistory', club.id] });
      setForm({ crest_url: '', identity_name: club.name, start_year: '', end_year: '', notes: '', change_reason: '', is_current: false });
      setAdding(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ThemedCard title="Crest Evolution" icon={History} primaryColor={accentColor} accentColor={accentColor}>
      {displayRows.length ? (
        <div className="relative border-l border-slate-200 ml-4 pl-7 space-y-6">
          {displayRows.map((crest, index) => (
            <div key={crest.id || index} className="relative flex gap-4 items-start">
              <span className="absolute -left-[34px] top-7 w-3 h-3 rounded-full border-2 border-white" style={{ backgroundColor: crest.is_current ? accentColor : '#94a3b8' }} />
              <div className="w-20 h-20 flex-shrink-0 rounded-xl bg-slate-50/80 border border-slate-200 flex items-center justify-center p-2">
                {crest.crest_url ? <img src={crest.crest_url} alt="" className="max-w-full max-h-full object-contain drop-shadow-sm" /> : <Shield className="w-8 h-8 text-slate-300" />}
              </div>
              <div className="min-w-0 flex-1 pt-1">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="font-black text-slate-900">{crest.identity_name || club.name}</div>
                  {crest.is_current && <Badge variant="outline" style={{ color: accentColor, borderColor: `${accentColor}55` }}>Current crest</Badge>}
                </div>
                <div className="mt-1 text-sm text-slate-500">{crest.start_year || '?'}–{crest.is_current ? 'present' : crest.end_year || '?'}</div>
                {crest.change_reason && <div className="mt-2 text-sm text-slate-700">{crest.change_reason}</div>}
                {crest.notes && crest.notes !== 'Current crest' && <div className="mt-1 text-sm leading-6 text-slate-500">{crest.notes}</div>}
              </div>
            </div>
          ))}
        </div>
      ) : <div className="py-6 text-center text-sm text-slate-500">No crest history has been entered yet.</div>}

      <AdminOnly>
        <div className="mt-6 pt-5 border-t border-slate-200/70">
          {!adding ? <Button size="sm" variant="outline" onClick={() => setAdding(true)}><Plus className="w-4 h-4 mr-2" />Add historical crest</Button> : (
            <div className="rounded-xl border border-slate-200 bg-white/70 p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-[150px_1fr] gap-5">
                <ImageUploader currentImage={form.crest_url} onUpload={url => setForm({...form, crest_url: url})} label="Upload crest" />
                <div className="space-y-3">
                  <div><Label>Club identity/name at the time</Label><Input className="mt-1" value={form.identity_name} onChange={e => setForm({...form, identity_name: e.target.value})} /></div>
                  <div className="grid grid-cols-2 gap-3"><div><Label>From year</Label><Input className="mt-1" type="number" value={form.start_year} onChange={e => setForm({...form, start_year: e.target.value})} /></div><div><Label>To year</Label><Input className="mt-1" type="number" value={form.end_year} onChange={e => setForm({...form, end_year: e.target.value})} placeholder={form.is_current ? 'present' : ''} disabled={form.is_current} /></div></div>
                  <div><Label>Reason for change</Label><Input className="mt-1" value={form.change_reason} onChange={e => setForm({...form, change_reason: e.target.value})} placeholder="e.g. merger, modernisation, return to traditional badge" /></div>
                  <div><Label>Notes</Label><Textarea className="mt-1" rows={2} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>
                  <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={form.is_current} onChange={e => setForm({...form, is_current: e.target.checked, end_year: e.target.checked ? '' : form.end_year})} />Make this the current crest too</label>
                </div>
              </div>
              <div className="flex gap-2"><Button onClick={save} disabled={saving || !form.crest_url}>{saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}Save crest era</Button><Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button></div>
            </div>
          )}
        </div>
      </AdminOnly>
    </ThemedCard>
  );
}
