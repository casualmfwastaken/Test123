// Automatic background remover for difficulty faces (runs in the browser).
const WHITE_MIN = 215;   // pixels this bright (all channels) count as white background
const TOLERANCE = 60;    // for non-white backgrounds
const MAX_SIZE = 256;
const cache = new Map();

const dist = (d, i, r, g, b) => {
    const dr = d[i] - r, dg = d[i + 1] - g, db = d[i + 2] - b;
    return Math.sqrt(dr * dr + dg * dg + db * db);
};
const isWhite = (d, i) => d[i] >= WHITE_MIN && d[i + 1] >= WHITE_MIN && d[i + 2] >= WHITE_MIN;

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

    const corners = [0, (w - 1) * 4, (h - 1) * w * 4, ((h - 1) * w + (w - 1)) * 4];
    if (corners.some((i) => d[i + 3] < 10)) return c.toDataURL('image/png'); // already transparent

    // White background? Otherwise use the average corner colour.
    const white = corners.filter((i) => isWhite(d, i)).length >= 3;
    let r = 0, g = 0, b = 0;
    for (const i of corners) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
    r /= 4; g /= 4; b /= 4;
    const bg = (i) => (white ? isWhite(d, i) : dist(d, i, r, g, b) <= TOLERANCE);

    // Flood fill from the border: only background connected to the edge is removed
    const removed = new Uint8Array(w * h);
    const stack = [];
    const push = (x, y) => {
        const p = y * w + x;
        if (removed[p] || !bg(p * 4)) return;
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

    // Soften the cut edge: fade pixels next to removed ones by how white they are
    for (let p = 0; p < w * h; p++) {
        if (removed[p]) continue;
        const x = p % w, y = (p / w) | 0;
        const near =
            (x > 0 && removed[p - 1]) || (x < w - 1 && removed[p + 1]) ||
            (y > 0 && removed[p - w]) || (y < h - 1 && removed[p + w]);
        if (!near) continue;
        const i = p * 4;
        const k = white
            ? (255 - Math.min(d[i], d[i + 1], d[i + 2])) / (255 - 170)
            : (dist(d, i, r, g, b) - TOLERANCE) / TOLERANCE;
        d[i + 3] = Math.round(255 * Math.min(1, Math.max(0, k)));
    }
    for (let p = 0; p < w * h; p++) if (removed[p]) d[p * 4 + 3] = 0;

    ctx.putImageData(im, 0, 0);
    return c.toDataURL('image/png');
}

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
