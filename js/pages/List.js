/* Demonlist page: modern theme. Load after your existing styles. */
:root {
    --bg: #f5f6f9;
    --surface: #ffffff;
    --surface-2: #eef0f5;
    --line: #dfe3ec;
    --text: #151a24;
    --muted: #667085;
    --accent: #5b6cff;
    --accent-soft: rgba(91, 108, 255, 0.12);
    --danger: #e5484d;
    --radius: 12px;
    --radius-sm: 8px;
}
body.dark, .dark, [data-theme="dark"] {
    --bg: #0f1219;
    --surface: #171c26;
    --surface-2: #1e2430;
    --line: #2a3140;
    --text: #e8ecf4;
    --muted: #8d97ab;
    --accent: #8896ff;
    --accent-soft: rgba(136, 150, 255, 0.16);
    --danger: #ff6b70;
}

.page-list {
    display: grid;
    grid-template-columns: 320px minmax(0, 1fr) 300px;
    gap: 20px;
    align-items: start;
    max-width: 1500px;
    margin: 0 auto;
    padding: 20px;
    color: var(--text);
    background: var(--bg);
    font-family: "Inter", system-ui, -apple-system, "Segoe UI", sans-serif;
}
.page-loading { display: grid; place-items: center; min-height: 60vh; }

/* Shared panel look */
.list-container, .level-container, .meta-container {
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: var(--radius);
}

/* ---------- Ranking ---------- */
.list-container {
    position: sticky;
    top: 20px;
    max-height: calc(100vh - 40px);
    overflow-y: auto;
    padding: 12px;
    scrollbar-width: thin;
}
.list-search {
    width: 100%;
    box-sizing: border-box;
    margin-bottom: 10px;
    padding: 10px 12px;
    color: var(--text);
    background: var(--surface-2);
    border: 1px solid transparent;
    border-radius: var(--radius-sm);
    font: inherit;
    font-size: 0.9rem;
}
.list-search:focus { outline: none; border-color: var(--accent); }

.list { width: 100%; border-collapse: separate; border-spacing: 0 2px; }
.list .rank { width: 56px; padding-left: 10px; color: var(--muted); font-variant-numeric: tabular-nums; }
.list .rank .legacy { font-size: 0.75rem; }
.list .level { border-radius: var(--radius-sm); }
.list .level button {
    width: 100%;
    padding: 10px 12px;
    text-align: left;
    color: var(--text);
    background: none;
    border: 0;
    border-radius: var(--radius-sm);
    font: inherit;
    cursor: pointer;
    transition: background 0.15s;
}
.list .level button:hover { background: var(--surface-2); }
.list .level.active button {
    background: var(--accent-soft);
    color: var(--accent);
    font-weight: 600;
}
.list .level.error button { color: var(--danger); }
.list .empty { padding: 16px 10px; color: var(--muted); font-size: 0.9rem; }

/* ---------- Level detail ---------- */
.level-container { padding: 28px; min-width: 0; }
.level { display: flex; flex-direction: column; gap: 20px; }
.level-empty { min-height: 300px; justify-content: center; align-items: center; color: var(--muted); }
.level-header h1 { margin: 0 0 6px; font-size: 2rem; letter-spacing: -0.02em; line-height: 1.15; }

.video-wrap { aspect-ratio: 16 / 9; border-radius: var(--radius); overflow: hidden; background: #000; }
.video { width: 100%; height: 100%; border: 0; display: block; }

.video-toggle { display: inline-flex; align-self: flex-start; padding: 3px; background: var(--surface-2); border-radius: 999px; }
.video-toggle button {
    padding: 6px 14px;
    color: var(--muted);
    background: none;
    border: 0;
    border-radius: 999px;
    font: inherit;
    font-size: 0.85rem;
    cursor: pointer;
}
.video-toggle button.on { background: var(--surface); color: var(--text); box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12); }

.stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 0; padding: 0; list-style: none; }
.stats li { padding: 14px 16px; background: var(--surface-2); border-radius: var(--radius-sm); min-width: 0; }
.stats .type-title-sm { margin-bottom: 4px; color: var(--muted); font-size: 0.8rem; font-weight: 500; }
.stats p { margin: 0; font-size: 1.15rem; font-weight: 600; overflow-wrap: anywhere; }

.records-head { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 8px; margin-top: 4px; }
.records-head h2 { margin: 0; font-size: 1.25rem; }
.qualify { margin: 0; color: var(--muted); font-size: 0.9rem; }
.qualify strong { color: var(--accent); }
.qualify.closed { color: var(--danger); }

.records { width: 100%; border-collapse: collapse; }
.record td { padding: 12px 8px; border-top: 1px solid var(--line); vertical-align: middle; }
.record p { margin: 0; }
.record .percent { width: 70px; font-weight: 700; font-variant-numeric: tabular-nums; }
.record .user a { color: var(--text); text-decoration: none; }
.record .user a:hover { color: var(--accent); text-decoration: underline; }
.record .mobile { width: 36px; }
.record .mobile img { height: 18px; display: block; }
.record .hz { width: 70px; text-align: right; color: var(--muted); font-size: 0.85rem; font-variant-numeric: tabular-nums; }

/* ---------- Meta ---------- */
.meta-container { position: sticky; top: 20px; padding: 20px; max-height: calc(100vh - 40px); overflow-y: auto; scrollbar-width: thin; }
.meta h3 { margin: 22px 0 10px; font-size: 1rem; }
.meta h3:first-child, .errors + h3 { margin-top: 0; }
.errors .error { margin: 0 0 8px; padding: 10px 12px; color: var(--danger); background: color-mix(in srgb, var(--danger) 10%, transparent); border-radius: var(--radius-sm); font-size: 0.85rem; }
.editors { margin: 0; padding: 0; list-style: none; display: grid; gap: 8px; }
.editors li { display: flex; align-items: center; gap: 10px; }
.editors img { width: 18px; height: 18px; }
.editors p { margin: 0; }
.editors a, .og a { color: var(--accent); text-decoration: none; }
.editors a:hover, .og a:hover { text-decoration: underline; }
.requirements { margin: 0; padding-left: 18px; color: var(--muted); font-size: 0.85rem; line-height: 1.55; display: grid; gap: 8px; }
.og { margin: 24px 0 0; padding-top: 14px; border-top: 1px solid var(--line); color: var(--muted); font-size: 0.8rem; }

/* ---------- Responsive ---------- */
@media (max-width: 1200px) {
    .page-list { grid-template-columns: 280px minmax(0, 1fr); }
    .meta-container { grid-column: 1 / -1; position: static; max-height: none; }
}
@media (max-width: 760px) {
    .page-list { grid-template-columns: 1fr; padding: 12px; }
    .list-container { position: static; max-height: 320px; }
    .level-container { padding: 18px; }
    .stats { grid-template-columns: 1fr; }
}
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
