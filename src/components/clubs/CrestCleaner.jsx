import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Loader2, ShieldCheck, Sparkles, Upload, Wand2 } from 'lucide-react';

const idx = (x, y, width) => (y * width + x) * 4;

function isEdgeWhite(data, offset, threshold, tolerance = 28) {
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];
    const a = data[offset + 3];
    if (a < 20) return false;
    const hi = Math.max(r, g, b);
    const lo = Math.min(r, g, b);
    return lo >= threshold && hi - lo <= tolerance;
}

function removeEdgeConnectedWhite(imageData, threshold) {
    const { width, height, data } = imageData;
    const seen = new Uint8Array(width * height);
    const queue = [];

    const add = (x, y) => {
        if (x < 0 || y < 0 || x >= width || y >= height) return;
        const p = y * width + x;
        if (seen[p]) return;
        const o = p * 4;
        if (!isEdgeWhite(data, o, threshold)) return;
        seen[p] = 1;
        queue.push(p);
    };

    for (let x = 0; x < width; x += 1) {
        add(x, 0);
        add(x, height - 1);
    }
    for (let y = 0; y < height; y += 1) {
        add(0, y);
        add(width - 1, y);
    }

    let q = 0;
    while (q < queue.length) {
        const p = queue[q++];
        const x = p % width;
        const y = Math.floor(p / width);
        const o = p * 4;
        data[o + 3] = 0;
        for (let dy = -1; dy <= 1; dy += 1) {
            for (let dx = -1; dx <= 1; dx += 1) {
                if (dx || dy) add(x + dx, y + dy);
            }
        }
    }

    return imageData;
}

function fillEnclosedTransparency(imageData) {
    const { width, height, data } = imageData;
    const exterior = new Uint8Array(width * height);
    const queue = [];

    const isTransparent = (p) => data[p * 4 + 3] < 20;
    const add = (x, y) => {
        if (x < 0 || y < 0 || x >= width || y >= height) return;
        const p = y * width + x;
        if (exterior[p] || !isTransparent(p)) return;
        exterior[p] = 1;
        queue.push(p);
    };

    for (let x = 0; x < width; x += 1) {
        add(x, 0);
        add(x, height - 1);
    }
    for (let y = 0; y < height; y += 1) {
        add(0, y);
        add(width - 1, y);
    }

    let q = 0;
    while (q < queue.length) {
        const p = queue[q++];
        const x = p % width;
        const y = Math.floor(p / width);
        add(x + 1, y);
        add(x - 1, y);
        add(x, y + 1);
        add(x, y - 1);
    }

    for (let p = 0; p < width * height; p += 1) {
        if (isTransparent(p) && !exterior[p]) {
            const o = p * 4;
            data[o] = 255;
            data[o + 1] = 255;
            data[o + 2] = 255;
            data[o + 3] = 255;
        }
    }
    return imageData;
}

function repairMissingWhitePanels(imageData, strength = 5) {
    const { width, height, data } = imageData;
    const size = width * height;
    const originalVisible = new Uint8Array(size);

    for (let p = 0; p < size; p += 1) {
        originalVisible[p] = data[p * 4 + 3] >= 32 ? 1 : 0;
    }

    // Bridge small breaks in the badge outline. A previous background-removal pass often
    // leaves 1-50px gaps in what should have been a closed shield/roundel boundary.
    const minSide = Math.min(width, height);
    const gapRatio = 0.004 + Math.max(1, Math.min(12, strength)) * 0.0025;
    const maxGap = Math.max(2, Math.round(minSide * gapRatio));
    let mask = originalVisible.slice();

    const bridgeRows = (source) => {
        const out = source.slice();
        for (let y = 0; y < height; y += 1) {
            let last = -1;
            for (let x = 0; x < width; x += 1) {
                const p = y * width + x;
                if (!source[p]) continue;
                if (last >= 0) {
                    const gap = x - last - 1;
                    if (gap > 0 && gap <= maxGap) {
                        for (let fx = last + 1; fx < x; fx += 1) out[y * width + fx] = 1;
                    }
                }
                last = x;
            }
        }
        return out;
    };

    const bridgeCols = (source) => {
        const out = source.slice();
        for (let x = 0; x < width; x += 1) {
            let last = -1;
            for (let y = 0; y < height; y += 1) {
                const p = y * width + x;
                if (!source[p]) continue;
                if (last >= 0) {
                    const gap = y - last - 1;
                    if (gap > 0 && gap <= maxGap) {
                        for (let fy = last + 1; fy < y; fy += 1) out[fy * width + x] = 1;
                    }
                }
                last = y;
            }
        }
        return out;
    };

    // Two passes catches tiny diagonal/anti-aliased breaks without globally expanding the badge.
    mask = bridgeCols(bridgeRows(mask));
    mask = bridgeRows(bridgeCols(mask));

    // Flood the true exterior using the repaired silhouette as the boundary.
    const exterior = new Uint8Array(size);
    const queue = new Int32Array(size);
    let qStart = 0;
    let qEnd = 0;
    const addExterior = (x, y) => {
        if (x < 0 || y < 0 || x >= width || y >= height) return;
        const p = y * width + x;
        if (exterior[p] || mask[p]) return;
        exterior[p] = 1;
        queue[qEnd++] = p;
    };

    for (let x = 0; x < width; x += 1) {
        addExterior(x, 0);
        addExterior(x, height - 1);
    }
    for (let y = 0; y < height; y += 1) {
        addExterior(0, y);
        addExterior(width - 1, y);
    }

    while (qStart < qEnd) {
        const p = queue[qStart++];
        const x = p % width;
        const y = Math.floor(p / width);
        addExterior(x + 1, y);
        addExterior(x - 1, y);
        addExterior(x, y + 1);
        addExterior(x, y - 1);
    }

    // At stronger settings, infer the interior silhouette from crossings in both directions.
    // This helps when a white panel has been deleted all the way through a larger opening.
    let rowMin = null;
    let rowMax = null;
    let colMin = null;
    let colMax = null;
    if (strength >= 8) {
        rowMin = new Int32Array(height).fill(width);
        rowMax = new Int32Array(height).fill(-1);
        colMin = new Int32Array(width).fill(height);
        colMax = new Int32Array(width).fill(-1);
        for (let y = 0; y < height; y += 1) {
            for (let x = 0; x < width; x += 1) {
                const p = y * width + x;
                if (!mask[p]) continue;
                if (x < rowMin[y]) rowMin[y] = x;
                if (x > rowMax[y]) rowMax[y] = x;
                if (y < colMin[x]) colMin[x] = y;
                if (y > colMax[x]) colMax[x] = y;
            }
        }
    }

    let repaired = 0;
    for (let p = 0; p < size; p += 1) {
        if (data[p * 4 + 3] >= 32) continue;
        const x = p % width;
        const y = Math.floor(p / width);
        const enclosedAfterRepair = !exterior[p];
        const inferredInterior = strength >= 8 &&
            rowMax[y] >= 0 && colMax[x] >= 0 &&
            x > rowMin[y] && x < rowMax[y] &&
            y > colMin[x] && y < colMax[x];

        if (enclosedAfterRepair || inferredInterior) {
            const o = p * 4;
            data[o] = 255;
            data[o + 1] = 255;
            data[o + 2] = 255;
            data[o + 3] = 255;
            repaired += 1;
        }
    }

    return { imageData, repaired, maxGap };
}

function trimCanvas(sourceCanvas, paddingRatio = 0.045) {
    const ctx = sourceCanvas.getContext('2d');
    const { width, height } = sourceCanvas;
    const data = ctx.getImageData(0, 0, width, height).data;
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            if (data[idx(x, y, width) + 3] > 20) {
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
            }
        }
    }

    if (maxX < minX || maxY < minY) return sourceCanvas;
    const contentW = maxX - minX + 1;
    const contentH = maxY - minY + 1;
    const pad = Math.max(6, Math.round(Math.max(contentW, contentH) * paddingRatio));
    const sx = Math.max(0, minX - pad);
    const sy = Math.max(0, minY - pad);
    const ex = Math.min(width - 1, maxX + pad);
    const ey = Math.min(height - 1, maxY + pad);

    const out = document.createElement('canvas');
    out.width = ex - sx + 1;
    out.height = ey - sy + 1;
    out.getContext('2d').drawImage(sourceCanvas, sx, sy, out.width, out.height, 0, 0, out.width, out.height);
    return out;
}

async function canvasToFile(canvas, filename) {
    const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((value) => value ? resolve(value) : reject(new Error('Could not export crest')), 'image/png');
    });
    return new File([blob], filename, { type: 'image/png' });
}

export default function CrestCleaner({ open, onOpenChange, club, item, entityType = 'Club', imageField = 'logo_url', assetLabel = 'crest', onSaved }) {
    const subject = item || club;
    const [threshold, setThreshold] = useState(242);
    const [fillHoles, setFillHoles] = useState(false);
    const [repairWhite, setRepairWhite] = useState(false);
    const [repairStrength, setRepairStrength] = useState(5);
    const [repairInfo, setRepairInfo] = useState(null);
    const [trim, setTrim] = useState(true);
    const [sourceUrl, setSourceUrl] = useState(subject?.[imageField] || '');
    const [sourceName, setSourceName] = useState(`current ${assetLabel}`);
    const [workingCanvas, setWorkingCanvas] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!open) return;
        setSourceUrl(subject?.[imageField] || '');
        setSourceName(`current ${assetLabel}`);
        setWorkingCanvas(null);
        setPreviewUrl('');
        setRepairInfo(null);
        setError('');
    }, [open, subject?.[imageField], imageField]);

    const canProcess = useMemo(() => Boolean(sourceUrl), [sourceUrl]);

    const processImage = async () => {
        if (!sourceUrl) return;
        setIsProcessing(true);
        setError('');
        try {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = () => reject(new Error('Could not load this crest. Try uploading the source image below.'));
                img.src = sourceUrl;
            });

            const maxSide = 1400;
            const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
            canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

            // If the source already has real transparency around its outer edge, do not run
            // white-background removal at all. This protects clean PNG crests whose internal
            // white areas may legitimately touch the badge boundary.
            const borderAlpha = [];
            const stepX = Math.max(1, Math.floor(canvas.width / 120));
            const stepY = Math.max(1, Math.floor(canvas.height / 120));
            for (let x = 0; x < canvas.width; x += stepX) {
                borderAlpha.push(imageData.data[idx(x, 0, canvas.width) + 3]);
                borderAlpha.push(imageData.data[idx(x, canvas.height - 1, canvas.width) + 3]);
            }
            for (let y = 0; y < canvas.height; y += stepY) {
                borderAlpha.push(imageData.data[idx(0, y, canvas.width) + 3]);
                borderAlpha.push(imageData.data[idx(canvas.width - 1, y, canvas.width) + 3]);
            }
            const transparentBorderRatio = borderAlpha.filter(a => a < 32).length / Math.max(1, borderAlpha.length);
            const alreadyTransparent = transparentBorderRatio > 0.12;

            if (!alreadyTransparent) {
                imageData = removeEdgeConnectedWhite(imageData, threshold);
            }

            if (repairWhite) {
                const repaired = repairMissingWhitePanels(imageData, repairStrength);
                imageData = repaired.imageData;
                setRepairInfo({ pixels: repaired.repaired, maxGap: repaired.maxGap });
            } else if (fillHoles) {
                imageData = fillEnclosedTransparency(imageData);
                setRepairInfo(null);
            } else {
                setRepairInfo(null);
            }
            ctx.putImageData(imageData, 0, 0);

            const finalCanvas = trim ? trimCanvas(canvas) : canvas;

            // Safety guard: never offer an effectively empty badge as a valid result.
            const finalCtx = finalCanvas.getContext('2d', { willReadFrequently: true });
            const finalData = finalCtx.getImageData(0, 0, finalCanvas.width, finalCanvas.height).data;
            let visiblePixels = 0;
            for (let i = 3; i < finalData.length; i += 4) if (finalData[i] > 24) visiblePixels += 1;
            if (visiblePixels < Math.max(80, finalCanvas.width * finalCanvas.height * 0.008)) {
                throw new Error('That setting removed too much of the crest. Raise the threshold or use the original transparent image.');
            }

            setWorkingCanvas(finalCanvas);
            setPreviewUrl(finalCanvas.toDataURL('image/png'));
        } catch (e) {
            console.error(e);
            setError(e.message || 'Could not clean crest');
            setWorkingCanvas(null);
            setPreviewUrl('');
            setRepairInfo(null);
        } finally {
            setIsProcessing(false);
        }
    };

    useEffect(() => {
        if (open && sourceUrl) processImage();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, sourceUrl, threshold, fillHoles, repairWhite, repairStrength, trim]);

    const handleLocalFile = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        setSourceUrl(url);
        setSourceName(file.name);
    };

    const save = async () => {
        if (!workingCanvas || !subject?.id) return;
        setIsSaving(true);
        setError('');
        try {
            const safeName = (subject.name || entityType).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            const file = await canvasToFile(workingCanvas, `${safeName}-${assetLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-clean.png`);
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            const entityApi = {
                Club: base44.entities.Club,
                Nation: base44.entities.Nation,
                League: base44.entities.League,
            }[entityType];
            if (!entityApi) throw new Error(`Unsupported asset type: ${entityType}`);
            const updated = await entityApi.update(subject.id, { [imageField]: file_url });
            onSaved?.(updated, file_url);
            onOpenChange(false);
        } catch (e) {
            console.error(e);
            setError(e.message || 'Could not save cleaned crest');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><Wand2 className="w-5 h-5" /> Clean {subject?.name} {assetLabel}</DialogTitle>
                    <DialogDescription>Transparent images are left transparent. For artwork with a baked-in white background, only light pixels connected to the outside edge are removed. Use the restore option only when genuine white detail was lost in an older image.</DialogDescription>
                </DialogHeader>

                <div className="grid md:grid-cols-2 gap-5">
                    <div className="space-y-3">
                        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Before</div>
                        <div className="aspect-square rounded-xl border border-slate-200 bg-[linear-gradient(45deg,#e5e7eb_25%,transparent_25%),linear-gradient(-45deg,#e5e7eb_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#e5e7eb_75%),linear-gradient(-45deg,transparent_75%,#e5e7eb_75%)] bg-[length:20px_20px] bg-[position:0_0,0_10px,10px_-10px,-10px_0px] flex items-center justify-center p-5 overflow-hidden">
                            {sourceUrl ? <img src={sourceUrl} alt={`Original ${assetLabel}`} className="max-w-full max-h-full object-contain" /> : <ShieldCheck className="w-20 h-20 text-slate-300" />}
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Cleaned preview</div>
                        <div className="relative aspect-square rounded-xl border border-slate-800 bg-[linear-gradient(45deg,#111827_25%,#1f2937_25%,#1f2937_75%,#111827_75%,#111827),linear-gradient(45deg,#111827_25%,#1f2937_25%,#1f2937_75%,#111827_75%,#111827)] bg-[length:24px_24px] bg-[position:0_0,12px_12px] flex items-center justify-center p-5 overflow-hidden">
                            {previewUrl && <img src={previewUrl} alt={`Cleaned ${assetLabel} preview`} className="max-w-full max-h-full object-contain" />}
                            {isProcessing && <div className="absolute inset-0 bg-slate-950/45 flex items-center justify-center"><Loader2 className="w-7 h-7 animate-spin text-white" /></div>}
                            {!isProcessing && !previewUrl && <ShieldCheck className="w-20 h-20 text-white/20" />}
                        </div>
                    </div>
                </div>

                <div className="space-y-5 rounded-xl border border-slate-200 p-4 bg-slate-50">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between"><Label>White-background threshold</Label><span className="text-xs font-mono text-slate-500">{threshold}</span></div>
                        <Slider value={[threshold]} onValueChange={(v) => setThreshold(v[0])} min={220} max={252} step={1} />
                        <p className="text-xs text-slate-500">Lower = more aggressive. If the source already has transparent outer edges, white removal is skipped automatically so genuine white parts of the badge are left alone.</p>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                        <div><Label>Restore fully enclosed white holes</Label><p className="text-xs text-slate-500 mt-1">Conservative repair for transparent patches that are completely surrounded by the badge.</p></div>
                        <Switch checked={fillHoles} onCheckedChange={(checked) => { setFillHoles(checked); if (checked) setRepairWhite(false); }} />
                    </div>
                    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-3">
                        <div className="flex items-center justify-between gap-4">
                            <div><Label>Repair missing white panels</Label><p className="text-xs text-slate-500 mt-1">For damaged transparent crests where white areas connect to the outside through broken outlines or gaps.</p></div>
                            <Switch checked={repairWhite} onCheckedChange={(checked) => { setRepairWhite(checked); if (checked) setFillHoles(false); }} />
                        </div>
                        {repairWhite && (
                            <div className="space-y-2 pt-1">
                                <div className="flex items-center justify-between"><Label className="text-xs">Repair strength</Label><span className="text-xs font-mono text-slate-500">{repairStrength}/12</span></div>
                                <Slider value={[repairStrength]} onValueChange={(v) => setRepairStrength(v[0])} min={1} max={12} step={1} />
                                <p className="text-xs text-slate-500">Start around 4–6. Increase it only until the missing white returns. Levels 8–12 can reconstruct larger broken panels, so use the preview carefully on unusual open-shaped badges.</p>
                                {repairInfo && <p className="text-[11px] text-slate-400">Preview repaired {repairInfo.pixels.toLocaleString()} transparent pixels; outline gaps up to about {repairInfo.maxGap}px are being bridged.</p>}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center justify-between gap-4">
                        <div><Label>Trim empty outer padding</Label><p className="text-xs text-slate-500 mt-1">Makes the badge itself appear larger in headers without changing its proportions.</p></div>
                        <Switch checked={trim} onCheckedChange={setTrim} />
                    </div>
                    <label className="block">
                        <input type="file" accept="image/*" className="hidden" onChange={handleLocalFile} />
                        <Button type="button" variant="outline" asChild className="w-full"><span><Upload className="w-4 h-4 mr-2" /> Use a different source image</span></Button>
                    </label>
                    <div className="text-[11px] text-slate-400 truncate">Source: {sourceName}</div>
                </div>

                {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={save} disabled={!workingCanvas || isProcessing || isSaving}>
                        {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : <><Sparkles className="w-4 h-4 mr-2" /> Use cleaned {assetLabel}</>}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
