import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Shirt, Loader2, Sparkles, Wand2, Settings2, RefreshCw, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const patternDescription = (pattern) => ({
  vertical_stripes: 'clean vertical stripes with historically believable stripe width',
  horizontal_hoops: 'horizontal hoops wrapping naturally around the shirt',
  sash: 'a single diagonal sash',
  diagonal_stripe: 'a single diagonal band',
  halves: 'traditional half-and-half body',
  quarters: 'traditional quartered body',
  solid: 'predominantly solid body',
}[pattern] || 'predominantly solid body');

const eraDescription = (yearValue) => {
  const year = Number(String(yearValue || '').match(/\d{4}/)?.[0] || 0);
  if (!year) return 'period-neutral traditional football shirt, avoiding futuristic details';
  if (year < 1965) return `${year} era football shirt: simple heavyweight fabric, plain crew or V neck, no glossy modern panels, no sleeve sponsor and almost no manufacturer branding`;
  if (year < 1980) return `${year} era football shirt: simple athletic cut, traditional collar or V neck, restrained trim, small period manufacturer mark only`;
  if (year < 1995) return `${year} era football shirt: boxier polyester cut, subtle sheen, woven crest, V neck or fold collar, period-correct manufacturer wordmark and restrained graphic treatment`;
  if (year < 2010) return `${year} era football shirt: slightly loose technical cut, embroidered crest, panel construction and era-appropriate manufacturer branding`;
  return `${year} era football shirt: modern technical fabric and contemporary cut, but still recognisably tied to the club's traditional identity`;
};

export default function AIKitGenerator({ club, onKitsGenerated, compact = false, nation = null }) {
  const [generating, setGenerating] = useState(false);
  const [generatingType, setGeneratingType] = useState(null);
  const [identityGenerating, setIdentityGenerating] = useState(false);
  const [showCustomParams, setShowCustomParams] = useState(false);
  const [customParams, setCustomParams] = useState({
    pattern: club.pattern_preference || 'solid',
    primaryColor: club.primary_color || '#ffffff',
    secondaryColor: club.secondary_color || '#111111',
    accentColor: club.accent_color || '',
    sponsor: club.kit_sponsor_name || '',
    manufacturer: club.kit_manufacturer_name || '',
    seasonYear: club.kit_season_year || club.last_season_year || '',
  });

  const locationName = club?.settlement || club?.district || club?.region || club?.city;
  const { data: locations = [] } = useQuery({
    queryKey: ['kitGeneratorLocation', club?.nation_id, locationName],
    queryFn: () => base44.entities.Location.filter({ nation_id: club.nation_id, name: locationName }),
    enabled: !!club?.nation_id && !!locationName,
    staleTime: 15 * 60 * 1000,
  });
  const location = locations[0] || null;

  const proposeIdentity = async (force = false) => {
    if (!force && customParams.manufacturer && customParams.sponsor) {
      return { sponsor_name: customParams.sponsor, manufacturer_name: customParams.manufacturer, sponsor_sector: club.kit_sponsor_sector || '', design_direction: '' };
    }
    setIdentityGenerating(true);
    try {
      const seasonYear = customParams.seasonYear || club.last_season_year || '';
      const year = Number(String(seasonYear).match(/\d{4}/)?.[0] || 0);
      const prompt = `Create a believable COMMERCIAL IDENTITY for one football kit set in a fictional football universe.

CLUB: ${club.name}
Nation: ${nation?.name || 'unknown'}
Language/naming style: ${nation?.language || 'unknown'}; ${Array.isArray(nation?.naming_styles) ? nation.naming_styles.join(', ') : nation?.naming_styles || 'unknown'}
Settlement/district/region: ${[club.settlement, club.district, club.region].filter(Boolean).join(', ') || club.city || 'unknown'}
Season/year: ${seasonYear || 'latest era not specified'}
Professional status: ${club.professional_status || 'unknown'}
Commercial rating: ${club.commercial_rating || 'unknown'} / 5
Local industries: ${location?.industries || 'not supplied'}
Known local employers/companies: ${location?.major_companies || 'not supplied'}
Nation/club flavour: ${nation?.culture || nation?.description || 'not supplied'}

Generate ONE shirt sponsor brand and ONE kit manufacturer brand that would plausibly exist in this world.

SPONSOR RULES:
- The sponsor must sound like a real brand people would recognise on a shirt, normally 1-3 words.
- DO NOT create lazy names such as '${club.name.split(' ')[0]} Industries', '${club.name.split(' ')[0]} Group', '${club.name.split(' ')[0]} Energy', '${club.name.split(' ')[0]} Bank', '[town] Motors' or other place-name + generic-sector formulas.
- Prefer distinctive brand names with implied history: regional builders merchants, coach firms, insurers, food producers, newspapers, machinery companies, department stores, electronics firms, breweries, logistics companies, engineering works, finance houses, textile firms, utilities or retailers as appropriate to era and local economy.
- You MAY use an existing company from the supplied local employers exactly if it makes commercial sense. Otherwise create new low-stakes commercial canon that fits the nation's naming language.
- A small amateur club should usually attract a local/regional firm; a major professional club can attract a national brand.
- If ${year || 'the era'} is clearly before widespread shirt sponsorship would be believable, return sponsor_name as "NONE" rather than forcing an anachronistic sponsor.

MANUFACTURER RULES:
- Create a distinctive sportswear/manufacturing brand, normally one short word or two compact words.
- Do not use Nike, Adidas, Puma, Umbro or other real brands.
- Lower-level clubs may use a small regional sportswear maker; elite clubs may use a larger national brand.
- Do not derive the manufacturer from the club name.

Return sponsor_name, sponsor_sector, manufacturer_name and one short design_direction describing the era-appropriate visual character. Do not explain the prompt.`;
      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false,
        response_json_schema: {
          type: 'object',
          properties: {
            sponsor_name: { type: 'string' },
            sponsor_sector: { type: 'string' },
            manufacturer_name: { type: 'string' },
            design_direction: { type: 'string' },
          },
          required: ['sponsor_name', 'manufacturer_name', 'design_direction'],
        },
      });
      const sponsor = result?.sponsor_name || 'NONE';
      const manufacturer = result?.manufacturer_name || 'Independent';
      setCustomParams(p => ({ ...p, sponsor, manufacturer }));
      await base44.entities.Club.update(club.id, {
        kit_sponsor_name: sponsor,
        kit_sponsor_sector: result?.sponsor_sector || '',
        kit_manufacturer_name: manufacturer,
        kit_season_year: seasonYear || undefined,
      });
      return { ...result, sponsor_name: sponsor, manufacturer_name: manufacturer };
    } finally {
      setIdentityGenerating(false);
    }
  };

  const generateKit = async (type, useCustomParams = false, identityOverride = null) => {
    const params = useCustomParams ? customParams : {
      pattern: club.pattern_preference || 'solid',
      primaryColor: club.primary_color,
      secondaryColor: club.secondary_color,
      accentColor: club.accent_color,
      sponsor: customParams.sponsor || club.kit_sponsor_name || '',
      manufacturer: customParams.manufacturer || club.kit_manufacturer_name || '',
      seasonYear: customParams.seasonYear || club.kit_season_year || club.last_season_year || '',
    };
    if (!params.primaryColor) return toast.error('Please set club colours first');

    setGenerating(true);
    setGeneratingType(type);
    try {
      const identity = identityOverride || await proposeIdentity(false);
      const sponsor = params.sponsor || identity?.sponsor_name || 'NONE';
      const manufacturer = params.manufacturer || identity?.manufacturer_name || 'Independent';
      const sponsorInstruction = sponsor && sponsor !== 'NONE'
        ? `one clearly legible central shirt sponsor wordmark reading exactly "${sponsor}", no other sponsor text`
        : 'NO shirt sponsor, keep the centre chest clean';
      const era = eraDescription(params.seasonYear);
      const primary = params.primaryColor;
      const secondary = params.secondaryColor || '#ffffff';
      const accent = params.accentColor || secondary;

      let palette;
      let design;
      if (type === 'home') {
        palette = `dominant ${primary}, secondary ${secondary}, trim ${accent}`;
        design = `${patternDescription(params.pattern)}; this is the club's recognisable HOME identity`;
      } else if (type === 'away') {
        const awayBase = secondary && secondary !== primary ? secondary : '#f2f2ee';
        palette = `dominant ${awayBase}, contrasting details from ${primary} and ${accent}`;
        design = 'AWAY shirt clearly distinguishable from the home shirt, simpler than a third kit, with a different pattern arrangement while retaining small club-colour references';
      } else {
        const thirdBase = accent && accent !== primary && accent !== secondary ? accent : '#202124';
        palette = `dominant ${thirdBase}, controlled details from ${primary} and ${secondary}`;
        design = 'THIRD shirt with a distinctive alternative pattern that still looks like a real match kit rather than a concept-art fashion shirt';
      }

      const prompt = `Ultra-realistic football shirt product photograph, shirt only, straight-on front view, no person, no mannequin, no shorts, no hanger, neutral off-white studio background.

CLUB KIT REQUIREMENTS:
- ${era}
- ${design}
- Colour palette: ${palette}
- Use the supplied club crest reference as the actual badge on the LEFT CHEST. Keep it small, correctly proportioned, transparent around its true shape, and DO NOT redesign or invent a replacement crest.
- Small kit manufacturer mark/wordmark "${manufacturer}" on the RIGHT CHEST, restrained and era-appropriate.
- ${sponsorInstruction}.
- Realistic sewn collar, cuffs, seams and fabric texture appropriate to the era.
- Correct football-jersey proportions; symmetric product presentation.
- No extra logos, no fake league patches, no player name, no number, no watermark, no text floating outside the shirt.
- Avoid generic futuristic paneling, oversized gradients, fashion-template mockups and random decorative graphics.
${identity?.design_direction ? `- Creative direction: ${identity.design_direction}` : ''}`;

      const referenceImages = club.logo_url ? [club.logo_url] : [];
      if (type !== 'home' && club.home_kit_url) referenceImages.push(club.home_kit_url);
      const result = await base44.integrations.Core.GenerateImage({ prompt, existing_image_urls: referenceImages });
      if (!result?.url) throw new Error('No image returned');

      const updates = {
        kit_sponsor_name: sponsor,
        kit_sponsor_sector: identity?.sponsor_sector || club.kit_sponsor_sector || '',
        kit_manufacturer_name: manufacturer,
        kit_season_year: params.seasonYear || club.kit_season_year || club.last_season_year || undefined,
      };
      if (type === 'home') updates.home_kit_url = result.url;
      else if (type === 'away') updates.away_kit_url = result.url;
      else updates.third_kit_url = result.url;
      await base44.entities.Club.update(club.id, updates);
      onKitsGenerated?.({ ...club, ...updates });
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} kit generated`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to generate kit');
    } finally {
      setGenerating(false);
      setGeneratingType(null);
    }
  };

  const generateAllKits = async () => {
    setGenerating(true);
    try {
      const identity = await proposeIdentity(false);
      for (const type of ['home', 'away', 'third']) await generateKit(type, false, identity);
    } finally {
      setGenerating(false);
      setGeneratingType(null);
    }
  };

  const handleCustomGenerate = (type) => {
    setShowCustomParams(false);
    generateKit(type, true, customParams.sponsor && customParams.manufacturer ? {
      sponsor_name: customParams.sponsor,
      manufacturer_name: customParams.manufacturer,
      sponsor_sector: club.kit_sponsor_sector || '',
      design_direction: '',
    } : null);
  };

  if (compact) {
    return (
      <div className="flex gap-2">
        {['home', 'away', 'third'].map(type => {
          const kitUrl = type === 'home' ? club.home_kit_url : type === 'away' ? club.away_kit_url : club.third_kit_url;
          return <div key={type} className="relative group">
            <div className="w-16 h-20 bg-white/10 rounded-lg border border-white/20 flex items-center justify-center overflow-hidden">
              {kitUrl ? <img src={kitUrl} alt={`${type} kit`} className="w-full h-full object-cover" /> : <Shirt className="w-6 h-6 text-white/40" />}
            </div>
            <Button size="sm" variant="ghost" className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-black/60 text-white" onClick={() => generateKit(type)} disabled={generating}>
              {generating && generatingType === type ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            </Button>
          </div>;
        })}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h4 className="font-semibold">Club Kit Studio</h4>
          <p className="text-xs text-slate-500">Era-aware designs with a persistent sponsor and manufacturer identity.</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(customParams.sponsor || club.kit_sponsor_name) && <Badge variant="outline"><Building2 className="w-3 h-3 mr-1" />{customParams.sponsor || club.kit_sponsor_name}</Badge>}
            {(customParams.manufacturer || club.kit_manufacturer_name) && <Badge variant="outline">Kit: {customParams.manufacturer || club.kit_manufacturer_name}</Badge>}
            {(customParams.seasonYear || club.kit_season_year) && <Badge variant="outline">{customParams.seasonYear || club.kit_season_year}</Badge>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => proposeIdentity(true)} disabled={identityGenerating || generating}>
            {identityGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}New identity
          </Button>
          <Dialog open={showCustomParams} onOpenChange={setShowCustomParams}>
            <DialogTrigger asChild><Button size="sm" variant="outline"><Settings2 className="w-4 h-4 mr-2" />Custom</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Kit identity & design</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div><Label>Season / year</Label><Input className="mt-1" value={customParams.seasonYear} onChange={e => setCustomParams({...customParams, seasonYear: e.target.value})} placeholder="e.g. 1986" /></div>
                  <div><Label>Sponsor</Label><Input className="mt-1" value={customParams.sponsor} onChange={e => setCustomParams({...customParams, sponsor: e.target.value})} placeholder="Generate or enter" /></div>
                  <div><Label>Manufacturer</Label><Input className="mt-1" value={customParams.manufacturer} onChange={e => setCustomParams({...customParams, manufacturer: e.target.value})} placeholder="Generate or enter" /></div>
                </div>
                <div><Label>Pattern</Label><Select value={customParams.pattern} onValueChange={v => setCustomParams({...customParams, pattern: v})}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{[['solid','Solid'],['vertical_stripes','Vertical stripes'],['horizontal_hoops','Hoops'],['sash','Sash'],['diagonal_stripe','Diagonal stripe'],['halves','Halves'],['quarters','Quarters']].map(([v,l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select></div>
                <div className="grid grid-cols-3 gap-3">
                  {[['primaryColor','Primary'],['secondaryColor','Secondary'],['accentColor','Accent']].map(([key,label]) => <div key={key}><Label className="text-xs">{label}</Label><Input type="color" value={customParams[key] || '#ffffff'} onChange={e => setCustomParams({...customParams, [key]: e.target.value})} className="mt-1 h-10" /></div>)}
                </div>
                <div className="flex gap-2"><Button onClick={() => handleCustomGenerate('home')} className="flex-1">Home</Button><Button onClick={() => handleCustomGenerate('away')} variant="outline" className="flex-1">Away</Button><Button onClick={() => handleCustomGenerate('third')} variant="outline" className="flex-1">Third</Button></div>
              </div>
            </DialogContent>
          </Dialog>
          <Button size="sm" onClick={generateAllKits} disabled={generating || identityGenerating}><Wand2 className="w-4 h-4 mr-2" />Generate set</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {['home', 'away', 'third'].map(type => {
          const kitUrl = type === 'home' ? club.home_kit_url : type === 'away' ? club.away_kit_url : club.third_kit_url;
          const isGenerating = generating && generatingType === type;
          return <div key={type} className="text-center space-y-2">
            <div className="aspect-[3/4] bg-[#f7f7f5] rounded-xl border border-slate-200 flex items-center justify-center overflow-hidden relative">
              {kitUrl ? <img src={kitUrl} alt={`${type} kit`} className="w-full h-full object-contain p-2" /> : <Shirt className="w-12 h-12 text-slate-300" />}
              {isGenerating && <div className="absolute inset-0 bg-white/70 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-600" /></div>}
            </div>
            <div className="text-sm font-bold capitalize">{type}</div>
            <Button size="sm" variant="outline" onClick={() => generateKit(type)} disabled={generating || identityGenerating} className="w-full"><Sparkles className="w-3 h-3 mr-1" />{kitUrl ? 'Regenerate' : 'Generate'}</Button>
          </div>;
        })}
      </div>
    </div>
  );
}
