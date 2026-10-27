// Turns the saved settings into CSS and applies it to the page.
export const DEFAULTS = () => ({
    accent: '',
    light: { bg: '', text: '' },
    dark: { bg: '', text: '' },
    font: 'default',
    shape: 'default',
    size: 'normal',
    faces: true,
    motion: true,
});

const HEX = /^#[0-9a-f]{6}$/i;
const ok = (v) => (typeof v === 'string' && HEX.test(v) ? v : '');
const contrast = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    const lum = (((n >> 16) & 255) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000;
    return lum > 150 ? '#000000' : '#ffffff';
};

const FONTS = {
    system: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    serif: 'Georgia, "Times New Roman", serif',
    mono: 'ui-monospace, "Cascadia Code", Consolas, monospace',
};
const SIZES = { small: 14, large: 18 };

const CARDS = 'main.page-list > *, main.page-leaderboard > *, main.page-home > *, .settings-modal';
const INNER = [
    '.page-list .tm', '.page-list .stats li', '.page-list .list-search', '.page-list .row .name',
    '.page-list .video-wrap', '.page-list .tm-banner-row', '.page-list .meta .errors .error',
    '.page-leaderboard .lb-search', '.page-leaderboard .board-name', '.page-leaderboard .lb-stats li',
    '.page-leaderboard .lb-error',
].join(', ');
const PILLS = [
    '.topbar .nav__tab', '.topbar .nav__cta', '.topbar .logo__ver', '.page-list .video-toggle',
    '.page-list .video-toggle button', '.page-list .copy', '.page-list .tm-reset',
    '.page-list .proof-list button', '.settings-modal .seg', '.settings-modal .seg button',
].join(', ');

export function loadSettings() {
    const d = DEFAULTS();
    try {
        const raw = JSON.parse(localStorage.getItem('settings'));
        if (raw && typeof raw === 'object') {
            return { ...d, ...raw, light: { ...d.light, ...raw.light }, dark: { ...d.dark, ...raw.dark } };
        }
    } catch {}
    return d;
}

export function buildCss(s, dark) {
    const m = (dark ? s.dark : s.light) || {};
    const accent = ok(s.accent);
    const bg = ok(m.bg);
    const text = ok(m.text);

    const v = [];
    if (accent) v.push(`--color-primary:${accent}`, `--color-on-primary:${contrast(accent)}`);
    if (bg) v.push(`--color-background:${bg}`);
    if (text) v.push(`--color-on-background:${text}`);
    if (bg || text) {
        v.push(
            '--color-background-hover:color-mix(in srgb, var(--color-on-background) 10%, var(--color-background))',
            '--color-on-background-hover:var(--color-on-background)'
        );
    }

    const out = [];
    if (v.length) {
        out.push(`:root, body, header.topbar, main, .dark, .settings-overlay { ${v.map((x) => x + ' !important').join('; ')} }`);
    }
    if (bg) out.push(`html, body { background-color: ${bg} !important }`);
    if (FONTS[s.font]) out.push(`body, body * { font-family: ${FONTS[s.font]} !important }`);
    if (SIZES[s.size]) out.push(`html { font-size: ${SIZES[s.size]}px !important }`);
    if (s.shape === 'sharp') {
        out.push(`${CARDS}, ${INNER} { border-radius: 0 !important }`, `${PILLS} { border-radius: 0.25rem !important }`);
    } else if (s.shape === 'round') {
        out.push(`${CARDS} { border-radius: 1.5rem !important }`, `${INNER} { border-radius: 1rem !important }`);
    }
    if (s.faces === false) out.push('.diff-face { display: none !important }');
    if (s.motion === false) {
        out.push('*, *::before, *::after { transition: none !important; animation: none !important; scroll-behavior: auto !important }');
    }
    return out.join('\n');
}

export function applyTheme(s, dark) {
    let el = document.getElementById('user-theme');
    if (!el) {
        el = document.createElement('style');
        el.id = 'user-theme';
        document.head.appendChild(el);
    }
    el.textContent = buildCss(s, dark);
}
