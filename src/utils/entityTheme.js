const normalizeHex = (value) => {
    if (!value || typeof value !== 'string') return null;
    const raw = value.trim().replace('#', '');
    if (/^[0-9a-fA-F]{3}$/.test(raw)) return `#${raw.split('').map(c => c + c).join('')}`;
    if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw}`;
    return null;
};

const rgb = (hex) => {
    const value = normalizeHex(hex);
    if (!value) return null;
    return {
        r: parseInt(value.slice(1, 3), 16),
        g: parseInt(value.slice(3, 5), 16),
        b: parseInt(value.slice(5, 7), 16),
    };
};

export const luminance = (hex) => {
    const value = rgb(hex);
    if (!value) return 0.35;
    const channel = (v) => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * channel(value.r) + 0.7152 * channel(value.g) + 0.0722 * channel(value.b);
};

export const mix = (hex, target = '#000000', amount = 0.2) => {
    const a = rgb(hex);
    const b = rgb(target);
    if (!a || !b) return normalizeHex(hex) || '#334155';
    const t = Math.max(0, Math.min(1, amount));
    const part = (key) => Math.round(a[key] + (b[key] - a[key]) * t).toString(16).padStart(2, '0');
    return `#${part('r')}${part('g')}${part('b')}`;
};

export const withAlpha = (hex, alpha = 0.08) => {
    const value = normalizeHex(hex) || '#334155';
    const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255).toString(16).padStart(2, '0');
    return `${value}${a}`;
};

export const getEntityTheme = ({ primary, secondary, accent } = {}) => {
    const p = normalizeHex(primary) || '#334155';
    const s = normalizeHex(secondary) || '#111827';
    const a = normalizeHex(accent);

    // Very light colours are poor UI accents on white surfaces. Prefer another stored colour,
    // otherwise darken the supplied primary while retaining the entity's hue.
    const candidates = [a, p, s].filter(Boolean);
    let ui = candidates.find(c => luminance(c) < 0.62) || mix(p, '#000000', 0.45);
    if (luminance(ui) > 0.55) ui = mix(ui, '#000000', 0.38);

    const heroPrimary = luminance(p) > 0.7 ? mix(p, '#000000', 0.36) : p;
    const heroSecondary = luminance(s) > 0.72 ? mix(s, '#000000', 0.42) : s;

    return {
        primary: p,
        secondary: s,
        accent: a || ui,
        ui,
        heroPrimary,
        heroSecondary,
        tint: withAlpha(ui, 0.055),
        tintStrong: withAlpha(ui, 0.10),
        border: withAlpha(ui, 0.22),
        textOnUi: luminance(ui) > 0.48 ? '#111827' : '#ffffff',
    };
};
