// Automatic background remover for difficulty faces (runs in the browser).
const TOLERANCE = 48; // higher removes more of the background
const MAX_SIZE = 256; // faces are drawn tiny, so this keeps it fast
const cache = new Map();

const dist = (d, i, r, g, b) => {
    const dr = d[i] - r, dg = d[i + 1] - g, db = d[i + 2] - b;
    return Math.sqrt(dr * dr + dg * dg + db * db);
};
const nearest = (d, i, pal) => {
    let m = Infinity;
    for (const c of pal) {
        const v = dist(d, i, c[0], c[1], c[2]);
        if (v < m) m = v;
    }
    return m;
};

function process(img) {
    const scale = Math.min(1, MAX_SIZE / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, h);
    const im = ctx.getImageData(0, 0, w, h);
    const d = im.data;

    // Collect every pixel on the border
    const border = [];
    for (let x = 0; x < w; x++) { border.push(x, (h - 1) * w + x); }
    for (let y = 0; y < h; y++) { border.push(y * w, y * w + (w - 1)); }

    // Already transparent? Leave it alone.
    const clear = border.filter((p) => d[p * 4 + 3] < 10).length;
    if (clear > border.length * 0.5) return c.toDataURL('image/png');

    // Background palette = the common colours on the border (handles solid colours AND checkerboards)
    const buckets = new Map();
    for (const p of border) {
        const i = p * 4;
        const key = ((d[i] >> 5) << 6) | ((d[i + 1] >> 5) << 3) | (d[i + 2] >> 5);
        const b = buckets.get(key) || { r: 0, g: 0, b: 0, n: 0 };
        b.r += d[i]; b.g += d[i + 1]; b.b += d[i + 2]; b.n++;
        buckets.set(key, b);
    }
    const all = [...buckets.values()].sort((a, b) => b.n - a.n);
    let pal = all.filter((b) => b.n >= border.length * 0.06).map((b) => [b.r / b.n, b.g / b.n, b.b / b.n]);
    if (!pal.length && all[0]) pal = [[all[0].r / all[0].n, all[0].g / all[0].n, all[0].b / all[0].n]];

    // Flood fill from the edges, so only background touching the border is removed
    const removed = new Uint8Array(w * h);
    const stack = [];
    const push = (x, y) => {
        const p = y * w + x;
        if (removed[p]) return;
        if (nearest(d, p * 4, pal) > TOLERANCE) return;
        removed[p] = 1;
        stack.push(p);
    };
    for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
    for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
    while (stack.length) {
        const p = stack.pop();
        const x = p % w, y = (p / w) | 0;
        if (x > 0) push(x - 1, y);
        if (x < w - 1) push(x + 1, y);
        if (y > 0) push(x, y - 1);
        if (y < h - 1) push(x, y + 1);
    }

    // Soften the cut edge
    for (let p = 0; p < w * h; p++) {
        if (removed[p]) continue;
        const x = p % w, y = (p / w) | 0;
        const near =
            (x > 0 && removed[p - 1]) || (x < w - 1 && removed[p + 1]) ||
            (y > 0 && removed[p - w]) || (y < h - 1 && removed[p + w]);
        if (!near) continue;
        const k = (nearest(d, p * 4, pal) - TOLERANCE) / TOLERANCE;
        d[p * 4 + 3] = Math.round(255 * Math.min(1, Math.max(0, k)));
    }
    for (let p = 0; p < w * h; p++) if (removed[p]) d[p * 4 + 3] = 0;

    ctx.putImageData(im, 0, 0);
    return c.toDataURL('image/png');
}

// Returns a cut-out data URL, or '' if the image can't be loaded
export function cutout(src) {
    if (!src) return Promise.resolve('');
    if (!cache.has(src)) {
        cache.set(
            src,
            new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    try { resolve(process(img)); } catch { resolve(src); }
                };
                img.onerror = () => resolve('');
                img.src = src;
            })
        );
    }
    return cache.get(src);
}
