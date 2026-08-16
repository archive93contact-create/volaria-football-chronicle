from pathlib import Path

p = Path('src/pages/LeagueDetail.jsx')
s = p.read_text()
start = '''            {/* Immersive Hero */}
            <ImmersiveHeader'''
end = '''            </ImmersiveHeader>'''
new = '''            <section className="relative overflow-hidden bg-[#090a0b] text-white border-b border-white/10" style={{ '--league-primary': league.primary_color || '#334155', '--league-secondary': league.secondary_color || '#111827', '--league-accent': league.accent_color || league.primary_color || '#f59e0b' }}>
                <div className="absolute inset-0" style={{ background: `linear-gradient(108deg, #070809 0%, ${league.primary_color || '#334155'}e8 48%, ${league.secondary_color || league.primary_color || '#111827'}d8 100%)` }} />
                <div className="absolute inset-0 bg-gradient-to-r from-black/45 via-black/10 to-black/35" />
                <div className="absolute inset-0 opacity-[0.10]" style={{ backgroundImage: `radial-gradient(circle at 17% 30%, rgba(255,255,255,.24), transparent 28%), linear-gradient(115deg, transparent 0 58%, rgba(255,255,255,.10) 58% 59%, transparent 59% 100%)` }} />
                {league.logo_url && <img src={league.logo_url} alt="" aria-hidden="true" className="pointer-events-none absolute -right-14 sm:right-0 -bottom-20 sm:-bottom-32 w-[390px] sm:w-[590px] h-[390px] sm:h-[590px] object-contain opacity-[0.10] grayscale" />}

                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-8 md:pb-10">
                    <div className="flex items-center justify-between gap-4 mb-7">
                        <nav className="flex items-center gap-2 text-xs sm:text-sm text-white/60 min-w-0 overflow-hidden">
                            <Link to={createPageUrl('Nations')} className="hover:text-white transition-colors shrink-0">Nations</Link>
                            <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                            {nation && <><Link to={createPageUrl(`NationDetail?id=${nation.id}`)} className="hover:text-white transition-colors truncate">{nation.name}</Link><ChevronRight className="w-3.5 h-3.5 shrink-0" /></>}
                            <span className="text-white truncate">{league.name}</span>
                        </nav>
                        <AdminOnly>
                            <div className="flex gap-2 shrink-0">
                                <Button size="sm" variant="outline" className="bg-black/20 border-white/25 text-white hover:bg-white/15 hover:text-white" onClick={() => setLogoCleanerOpen(true)}><Sparkles className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Clean logo</span></Button>
                                <Button size="sm" variant="outline" className="bg-black/20 border-white/25 text-white hover:bg-white/15 hover:text-white" onClick={handleEdit}><Edit2 className="w-4 h-4 sm:mr-2" /><span className="hidden sm:inline">Edit league</span></Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild><Button size="sm" variant="outline" className="bg-black/20 border-red-300/30 text-red-200 hover:bg-red-500/20 hover:text-red-100"><Trash2 className="w-4 h-4" /></Button></AlertDialogTrigger>
                                    <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete {league.name}?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-red-600">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </AdminOnly>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-[170px_minmax(0,1fr)] md:grid-cols-[205px_minmax(0,1fr)] gap-6 sm:gap-8 items-center">
                        <div className="relative w-36 h-36 sm:w-full sm:h-44 md:h-48 flex items-center justify-center">
                            <div className="absolute inset-[9%] rounded-full blur-3xl opacity-50" style={{ backgroundColor: league.accent_color || league.secondary_color || league.primary_color || '#ffffff' }} />
                            <div className="absolute inset-[5%] rounded-full border border-white/10 bg-black/10 backdrop-blur-[1px]" />
                            {league.logo_url ? <img src={league.logo_url} alt={`${league.name} logo`} className="relative z-10 max-w-[110%] max-h-[110%] object-contain drop-shadow-[0_18px_22px_rgba(0,0,0,0.50)]" /> : <div className="relative z-10 w-[82%] h-[82%] rounded-full border border-white/20 bg-black/20 flex items-center justify-center"><Trophy className="w-20 h-20 text-white/35" /></div>}
                        </div>

                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                <span className="text-[11px] uppercase tracking-[0.18em] font-semibold text-white/65">{league.league_type === 'youth' ? (league.age_group || 'Youth League') : league.league_type === 'reserve' ? 'Reserve League' : `Tier ${league.tier || '—'}`}</span>
                                {!league.is_active && <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded bg-red-950/60 border border-red-300/25 text-red-100">Inactive</span>}
                            </div>
                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-[-0.045em] leading-[0.95] text-white break-words" style={{ fontFamily: league.text_style === 'classic' ? 'Georgia, serif' : undefined }}>{league.name}</h1>
                            {league.description && <p className="mt-4 text-base sm:text-lg text-white/72 max-w-3xl leading-relaxed">{league.description}</p>}
                            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/70">
                                {nation && <Link to={createPageUrl(`NationDetail?id=${nation.id}`)} className="inline-flex items-center gap-2 hover:text-white">{nation.flag_url && <img src={nation.flag_url} alt="" className="w-6 h-4 object-cover rounded-sm shadow-sm" />}{nation.name}</Link>}
                                {league.governing_body && <span className="flex items-center gap-1.5"><Shield className="w-4 h-4" /> {league.governing_body}</span>}
                                {league.format && <span>{league.format}</span>}
                                {league.founded_year && <span>Est. {league.founded_year}</span>}
                            </div>
                            {league.current_champion && <div className="mt-5 inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-300/25 bg-amber-400/12 text-sm"><Trophy className="w-4 h-4 text-amber-300" /><span className="text-white/60">Current champion</span><span className="font-bold text-white">{league.current_champion}</span></div>}
                        </div>
                    </div>

                    <div className="mt-7 grid grid-cols-3 sm:grid-cols-5 border border-white/15 rounded-xl overflow-hidden bg-black/20 backdrop-blur-sm">
                        <div className="px-3 sm:px-4 py-3 border-r border-white/10"><div className="text-2xl font-black">{league.number_of_teams || clubs.length}</div><div className="text-[10px] uppercase tracking-wider text-white/50">Teams</div></div>
                        <div className="px-3 sm:px-4 py-3 border-r border-white/10"><div className="text-2xl font-black">{seasons.length}</div><div className="text-[10px] uppercase tracking-wider text-white/50">Seasons</div></div>
                        <div className="px-3 sm:px-4 py-3 sm:border-r border-white/10"><div className="text-2xl font-black">{league.tier || '—'}</div><div className="text-[10px] uppercase tracking-wider text-white/50">Tier</div></div>
                        <div className="hidden sm:block px-4 py-3 border-r border-white/10"><div className="text-2xl font-black">{league.promotion_spots ?? '—'}</div><div className="text-[10px] uppercase tracking-wider text-white/50">Promotion</div></div>
                        <div className="hidden sm:block px-4 py-3"><div className="text-2xl font-black">{league.relegation_spots ?? '—'}</div><div className="text-[10px] uppercase tracking-wider text-white/50">Relegation</div></div>
                    </div>
                </div>
                <div className="h-1.5 flex"><div className="flex-[3]" style={{ backgroundColor: league.primary_color || '#334155' }} /><div className="flex-[2]" style={{ backgroundColor: league.secondary_color || league.primary_color || '#111827' }} /><div className="flex-1" style={{ backgroundColor: league.accent_color || league.primary_color || '#f59e0b' }} /></div>
            </section>

            <CrestCleaner
                open={logoCleanerOpen}
                onOpenChange={setLogoCleanerOpen}
                item={league}
                entityType="League"
                imageField="logo_url"
                assetLabel="logo"
                onSaved={() => {
                    queryClient.invalidateQueries({ queryKey: ['league', leagueId] });
                    queryClient.invalidateQueries({ queryKey: ['leagues'] });
                }}
            />'''

si = s.index(start)
ei = s.index(end, si) + len(end)
p.write_text(s[:si] + new + s[ei:])
print('League header replaced')
