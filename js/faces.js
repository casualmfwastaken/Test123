// Automatic background remover for difficulty faces (runs in the browser).
const TOLERANCE = 48; // higher removes more of the background colour
const MAX_SIZE = 256; // faces are drawn tiny, so this keeps it fast
const cache = new Map();

const dist = (d, i, r, g, b) => {
    const dr = d[i] - r, dg = d[i + 1] - g, db = d[i + 2] - b;
    return Math.sqrt(dr * dr + dg * dg + db * db);
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

    // Background colour = average of the four corners
    const corners = [0, (w - 1) * 4, (h - 1) * w * 4, ((h - 1) * w + (w - 1)) * 4];
    if (corners.some((i) => d[i + 3] < 10)) return c.toDataURL('image/png'); // already transparent
    let r = 0, g = 0, b = 0;
    for (const i of corners) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
    r /= 4; g /= 4; b /= 4;

    // Flood fill from every edge pixel, so only background touching the border is removed
    const removed = new Uint8Array(w * h);
    const stack = [];
    const push = (x, y) => {
        const p = y * w + x;
        if (removed[p]) return;
        if (dist(d, p * 4, r, g, b) > TOLERANCE) return;
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

    // Soften the edge so there's no hard halo
    for (let p = 0; p < w * h; p++) {
        if (removed[p]) continue;
        const x = p % w, y = (p / w) | 0;
        const near =
            (x > 0 && removed[p - 1]) || (x < w - 1 && removed[p + 1]) ||
            (y > 0 && removed[p - w]) || (y < h - 1 && removed[p + w]);
        if (!near) continue;
        const k = (dist(d, p * 4, r, g, b) - TOLERANCE) / TOLERANCE;
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
