/* css/pages/leaderboard.css: matches the list page */
main.page-leaderboard {
    --line: color-mix(in srgb, var(--color-on-background) 14%, transparent);
    --soft: color-mix(in srgb, var(--color-on-background) 7%, transparent);
    --muted: color-mix(in srgb, var(--color-on-background) 62%, transparent);
    --page-bg: color-mix(in srgb, var(--color-on-background) 4%, var(--color-background));
    display: grid;
    grid-template-columns: minmax(18rem, 1fr) minmax(0, 2fr);
    column-gap: 1.25rem;
    align-items: start;
    background-color: var(--page-bg);
    font-family: "Lexend Deca", system-ui, sans-serif;
    padding-block: 1.25rem;
}
main.page-leaderboard.dark { --page-bg: color-mix(in srgb, black 35%, var(--color-background)); }
.page-leaderboard input, .page-leaderboard button { font-family: inherit; }
.page-leaderboard li, .page-leaderboard p { font-size: 0.9rem; }

main.page-leaderboard > * {
    align-self: start;
    max-height: 100%;
    overflow-y: auto;
    box-sizing: border-box;
    min-width: 0;
    background-color: var(--color-background);
    border: 1px solid var(--line);
    border-radius: 0.75rem;
    scrollbar-width: thin;
}

/* ---------- Board ---------- */
.page-leaderboard .board-container { padding: 0.75rem; }
.page-leaderboard .lb-search {
    width: 100%; box-sizing: border-box;
    margin-bottom: 0.75rem; padding: 0.65rem 0.8rem;
    color: var(--color-on-background);
    background: var(--soft);
    border: 1px solid transparent; border-radius: 0.5rem;
    font-size: 0.85rem;
}
.page-leaderboard .lb-search::placeholder { color: var(--muted); }
.page-leaderboard .lb-search:focus { outline: none; border-color: var(--color-on-background); }

.page-leaderboard .lb-error {
    margin: 0 0 0.75rem; padding: 0.75rem 1rem;
    background: var(--color-error); color: var(--color-on-error);
    border-radius: 0.5rem; font-size: 0.8rem;
}

.page-leaderboard .board { display: flex; flex-direction: column; gap: 2px; margin: 0; padding: 0; list-style: none; }
.page-leaderboard .board-row { display: grid; grid-template-columns: 3rem 1fr; align-items: center; }
.page-leaderboard .board-rank {
    padding-right: 0.75rem; text-align: end;
    color: var(--muted); font-size: 0.85rem; font-variant-numeric: tabular-nums;
}
.page-leaderboard .board-name {
    display: flex; justify-content: space-between; align-items: center; gap: 0.5rem;
    width: 100%; padding: 0.7rem 0.8rem;
    text-align: start; word-break: normal; overflow-wrap: anywhere;
    color: var(--color-on-background);
    background: transparent;
    border: none; border-radius: 0.5rem; cursor: pointer;
    transition: background-color 0.15s, color 0.15s;
}
.page-leaderboard .board-name:hover { background-color: var(--color-background-hover); color: var(--color-on-background-hover); }
.page-leaderboard .board-row.active .board-name { background-color: var(--color-primary); color: var(--color-on-primary); }
.page-leaderboard .board-total { flex: none; opacity: 0.7; font-size: 0.8rem; font-variant-numeric: tabular-nums; }
.page-leaderboard .board-empty { padding: 1rem 0.5rem; color: var(--muted); font-size: 0.85rem; }

/* ---------- Player ---------- */
.page-leaderboard .player-container { padding: 1.75rem; }
.page-leaderboard .player { display: flex; flex-direction: column; gap: 1.25rem; max-width: 48rem; margin-inline: auto; }
.page-leaderboard .player-empty { min-height: 300px; justify-content: center; align-items: center; color: var(--muted); }
.page-leaderboard .player-head h1 { margin: 0; letter-spacing: -0.02em; line-height: 1.15; overflow-wrap: anywhere; }
.page-leaderboard .player-rank { margin: 0.35rem 0 0; color: var(--muted); }
.page-leaderboard .player h2 { margin: 0.5rem 0 0; font-size: 1.1rem; }

.page-leaderboard .lb-stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.75rem; margin: 0; padding: 0; list-style: none; }
.page-leaderboard .lb-stats li { padding: 0.9rem 1rem; background: var(--soft); border-radius: 0.5rem; }
.page-leaderboard .lb-stats .type-title-sm { margin-bottom: 0.3rem; color: var(--muted); font-size: 0.75rem; }
.page-leaderboard .lb-stats p { margin: 0; font-size: 1.05rem; font-weight: 700; overflow-wrap: anywhere; }

.page-leaderboard .table { width: 100%; border-collapse: collapse; table-layout: fixed; }
.page-leaderboard .table td { padding: 0.8rem 0.5rem; border-top: 1px solid var(--line); vertical-align: middle; }
.page-leaderboard .table p { margin: 0; }
.page-leaderboard .table .rank { width: 4rem; text-align: start; color: var(--muted); font-variant-numeric: tabular-nums; }
.page-leaderboard .table .level { width: auto; overflow-wrap: anywhere; }
.page-leaderboard .table .level a { color: var(--color-on-background); text-decoration: none; }
.page-leaderboard .table .level a:hover { text-decoration: underline; }
.page-leaderboard .table .score { width: 6rem; text-align: end; font-weight: 700; font-variant-numeric: tabular-nums; }

.page-leaderboard :focus-visible { outline: 2px solid var(--color-on-background); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) { .page-leaderboard *, .page-leaderboard *::before { transition: none !important; } }

/* ---------- Mobile ---------- */
.page-leaderboard .m-nav { display: none; }

@media (max-width: 820px) {
    main.page-leaderboard { display: block; padding: 0.75rem 0.75rem calc(4.5rem + env(safe-area-inset-bottom)); }
    main.page-leaderboard > * { display: none; max-height: none; }
    main.page-leaderboard.pane-board > .board-container,
    main.page-leaderboard.pane-player > .player-container { display: block; width: 100%; }

    main.page-leaderboard > .m-nav {
        display: flex; position: fixed; left: 0; right: 0; bottom: 0; z-index: 50;
        padding-bottom: env(safe-area-inset-bottom);
        border-radius: 0; border-width: 1px 0 0;
    }
    .page-leaderboard .m-nav button { flex: 1; min-height: 3.5rem; color: var(--muted); background: none; border: 0; font-size: 0.85rem; }
    .page-leaderboard .m-nav button.on { color: var(--color-on-background); font-weight: 700; }

    .page-leaderboard .lb-search { font-size: 16px; }
    .page-leaderboard .board-name { min-height: 2.75rem; }
    .page-leaderboard .player-container { padding: 1rem; }
    .page-leaderboard .lb-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
