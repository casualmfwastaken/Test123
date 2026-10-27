import { store } from "../main.js";
import { embed } from "../util.js";
import { score } from "../score.js";
import { fetchEditors, fetchList } from "../content.js";
import Face from "../components/Face.js";

import Spinner from "../components/Spinner.js";
import LevelAuthors from "../components/List/LevelAuthors.js";

const dir = "/data"; // folder that holds _list.json and the level files
const VERSION_MAJOR = 1; // list version = v{VERSION_MAJOR}.{number of updates}
const PLUS_MULT = 1.5; // default points multiplier for the PLUS list

const roleIconMap = {
    owner: "crown",
    admin: "user-gear",
    helper: "user-shield",
    dev: "code",
    trial: "user-lock",
};

const keyOf = ([level, err]) => level?.path ?? err ?? level?.name;
const fmt = (d) =>
    new Date(`${d}T00:00:00`).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
    });

/* ---------- helpers ---------- */

async function getJSON(url, timeout = 8000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeout);
    try {
        const res = await fetch(url, { signal: ctrl.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } finally {
        clearTimeout(t);
    }
}

const safe = (fn) => fn().catch(() => null);

const safeEmbed = (url) => {
    try {
        return url ? embed(url) : "";
    } catch {
        return "";
    }
};

// Unverified levels (no verifier) get no rank and don't take up a spot in the ranking.
// Unverified levels (no verifier, or listed in _unverified_list.json) get no rank.
// Verified levels get a Placed rank. Unverified levels get their own separate numbering.
function build(entries) {
    let r = 0;
    let u = 0;
    return (entries || []).map((e) => {
        const level = e?.[0];
        const unverified =
            !!level && (!!level.unverified || !String(level.verifier || "").trim());
        return {
            level,
            err: e?.[1],
            key: keyOf(e || []),
            unverified,
            rank: unverified ? null : ++r,
            urank: unverified ? ++u : null,
        };
    });
}

// Levenshtein distance, used for "Did you mean ...?"
function lev(a, b) {
    if (a === b) return 0;
    const m = a.length;
    const n = b.length;
    if (!m) return n;
    if (!n) return m;
    let prev = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) {
        const cur = [i];
        for (let j = 1; j <= n; j++) {
            cur[j] = Math.min(
                prev[j] + 1,
                cur[j - 1] + 1,
                prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
            );
        }
        prev = cur;
    }
    return prev[n];
}

function closeness(q, name) {
    const n = name.toLowerCase();
    let best = lev(q, n);
    best = Math.min(best, lev(q, n.slice(0, q.length)) + 1);
    for (const w of n.split(/\s+/)) if (w) best = Math.min(best, lev(q, w));
    return best;
}

// [{ date: "YYYY-MM-DD", label?: string, version?: string, list: ["level-file", ...] }]
async function fetchHistory() {
    try {
        const data = await getJSON(`${dir}/_history.json`);
        if (!Array.isArray(data)) return [];
        return data
            .filter((s) => s && s.date && Array.isArray(s.list))
            .sort((a, b) => (a.date < b.date ? -1 : 1));
    } catch {
        return [];
    }
}

// Difficulty faces: { "level-file": "insane", ... }  ->  /assets/faces/insane.png
async function fetchFaces() {
    try {
        const data = await getJSON(`${dir}/_faces.json`);
        return data && typeof data === "object" && !Array.isArray(data) ? data : {};
    } catch {
        return {};
    }
}

async function fetchLevel(path) {
    try {
        const level = await getJSON(`${dir}/${path}.json`);
        if (!level || typeof level !== "object") throw new Error("bad level");
        return [
            {
                ...level,
                path,
                records: [...(Array.isArray(level.records) ? level.records : [])].sort(
                    (a, b) => b.percent - a.percent
                ),
            },
            null,
        ];
    } catch {
        return [null, path];
    }
}

// _list_plus.json is either ["level-file", ...] or { "multiplier": 1.5, "list": [...] }
async function fetchPlus() {
    try {
        const data = await getJSON(`${dir}/_list_plus.json`);
        const paths = Array.isArray(data) ? data : data?.list;
        if (!Array.isArray(paths)) throw new Error("bad format");
        const m = Number(data?.multiplier);
        const levels = await Promise.all(paths.map(fetchLevel));
        return { levels, multiplier: m > 0 ? m : PLUS_MULT, error: null };
    } catch {
        return {
            levels: [],
            multiplier: PLUS_MULT,
            error: "Failed to load the PLUS list (_list_plus.json).",
        };
    }
}

export default {
    components: { Spinner, LevelAuthors },
    template: `
        <main v-if="loading" class="page-loading">
            <Spinner></Spinner>
        </main>
        <main v-else class="page-list" :class="'pane-' + mobilePane">
            <!-- Ranking -->
            <aside class="list-container">
                <div class="errors-banner" v-if="!list" role="alert">
                    <p>Couldn't load the list.</p>
                    <button type="button" @click="retry">Retry</button>
                </div>

                <div class="tm" v-if="history.length && !plus">
                    <button type="button" class="tm-toggle" :class="{ on: !isToday }" :aria-expanded="panelOpen" @click="panelOpen = !panelOpen">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
                        <span>Time machine</span>
                        <span class="tm-when">{{ whenLabel }}</span>
                    </button>
                    <div class="tm-drawer" :class="{ open: panelOpen }" :inert="!panelOpen || null">
                        <div class="tm-inner">
                            <div class="tm-body">
                                <div class="tm-read">
                                    <strong>{{ whenLabel }}</strong>
                                    <span v-if="snap">{{ fmt(snap.date) }} &middot; {{ versionFor(timeIndex) }}</span>
                                </div>
                                <div class="tm-track">
                                    <button type="button" class="tm-step" aria-label="Go back one step" :disabled="sliderIndex <= 0" @click="step(-1)">&lsaquo;</button>
                                    <input type="range" min="0" :max="history.length" step="1" v-model.number="sliderIndex" aria-label="Pick a point in time" />
                                    <button type="button" class="tm-step" aria-label="Go forward one step" :disabled="sliderIndex >= history.length" @click="step(1)">&rsaquo;</button>
                                </div>
                                <div class="tm-ends">
                                    <span>{{ fmt(history[0].date) }}</span>
                                    <span>Today</span>
                                </div>
                                <button type="button" class="tm-reset" v-if="!isToday" @click="toToday">Back to today</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="video-toggle list-tabs" role="tablist">
                    <button type="button" role="tab" :aria-selected="tab === 'ranked'" :class="{ on: tab === 'ranked' }" @click="tab = 'ranked'">Placed</button>
                    <button type="button" role="tab" :aria-selected="tab === 'unverified'" :class="{ on: tab === 'unverified' }" @click="tab = 'unverified'">Unverified ({{ unverifiedCount }})</button>
                </div>

                <input class="list-search" type="search" v-model="query" placeholder="Search levels" aria-label="Search levels" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" />

                <p class="list-note" v-if="plus && plusLoading">Loading the PLUS list...</p>

                <transition-group name="flip" tag="ul" class="list" :class="{ busy: timeBusy }" v-if="list && !(plus && plusLoading)">
                    <li v-for="item in filteredView" :key="item.key || item.rank" class="row" :class="{ active: item.key === selectedItem?.key, error: !item.level }">
                        <span class="rank">
                            <template v-if="item.unverified">#{{ item.urank }}</template>
                            <template v-else-if="item.rank <= 150">#{{ item.rank }}</template>
                            <template v-else>Legacy</template>
                        </span>
                        <button type="button" class="name" @click="selectLevel(item.key)">
                            <span class="name-main">
                                <img v-if="faceSrc(item.level)" class="diff-face" :src="faceSrc(item.level)" :alt="faceName(item.level)" :title="faceName(item.level)" loading="lazy" @error="hideImg">
                                <span class="type-label-lg">{{ item.level?.name || \`Error (\${item.err}.json)\` }}</span>
                            </span>
                            <small class="delta" v-if="delta(item)">{{ delta(item) }}</small>
                        </button>
                    </li>
                    <li class="empty" key="empty" v-if="filteredView.length === 0">
                        <template v-if="query.trim()">
                            No levels match "{{ query }}".
                            <span v-if="suggestion" class="didyoumean">
                                Did you mean
                                <button type="button" class="link-btn" @click="applySuggestion">{{ suggestion.level.name }}</button>?
                            </span>
                        </template>
                        <template v-else-if="tab === 'unverified'">No unverified levels.</template>
                        <template v-else>No levels.</template>
                    </li>
                </transition-group>
            </aside>

            <!-- Level detail -->
            <section class="level-container">
                <div class="tm-banner" :class="{ open: !isToday }" :inert="isToday || null">
                    <div class="tm-banner-inner">
                        <div class="tm-banner-row">
                            <p>Viewing the list as of <strong>{{ snap ? fmt(snap.date) : '' }}</strong></p>
                            <button type="button" @click="toToday">Back to today</button>
                        </div>
                    </div>
                </div>

                <transition name="swap" mode="out-in">
                    <div class="level" v-if="level" :key="selectedItem.key">
                        <div class="level-header">
                            <h1>
                                <<Face v-if="faceSrc(level)" large :src="faceSrc(level)" :alt="faceName(level)"></Face>
                                {{ level.name }}
                            </h1>
                            <LevelAuthors :author="level.author" :creators="level.creators" :verifier="level.verifier"></LevelAuthors>
                        </div>

                        <div class="video-wrap" v-if="video">
                            <iframe class="video" id="videoframe" :src="video" frameborder="0" allowfullscreen></iframe>
                        </div>
                        <div class="video-toggle" v-if="level.showcase && level.verification">
                            <button type="button" :class="{ on: !toggledShowcase }" @click="toggledShowcase = false">Verification</button>
                            <button type="button" :class="{ on: toggledShowcase }" @click="toggledShowcase = true">Showcase</button>
                        </div>

                        <ul class="stats">
                            <li>
                                <div class="type-title-sm">Points when completed<template v-if="plus"> (PLUS)</template></div>
                                <p>{{ points }}</p>
                            </li>
                            <li>
                                <div class="type-title-sm">ID</div>
                                <p>{{ level.id ?? 'Unknown' }}</p>
                            </li>
                            <li>
                                <div class="type-title-sm">Password</div>
                                <p class="pw">
                                    <span>{{ level.password || 'Free to Copy' }}</span>
                                    <button type="button" class="copy" v-if="level.password" @click="copyPassword" :aria-label="copied ? 'Password copied' : 'Copy password'">{{ copied ? 'Copied' : 'Copy' }}</button>
                                </p>
                            </li>
                        </ul>

                        <div class="records-head">
                            <h2>Records</h2>
                            <div class="video-toggle records-tabs" role="tablist">
                                <button type="button" role="tab" :aria-selected="recordsTab === 'table'" :class="{ on: recordsTab === 'table' }" @click="recordsTab = 'table'">Table</button>
                                <button type="button" role="tab" :aria-selected="recordsTab === 'proof'" :class="{ on: recordsTab === 'proof' }" @click="recordsTab = 'proof'">Video proof</button>
                            </div>
                            <p v-if="selectedItem.unverified" class="qualify closed">This level is unverified and does not accept records yet.</p>
                            <p v-else-if="!isToday" class="qualify">Records up to <strong>{{ fmt(snap.date) }}</strong></p>
                            <p v-else-if="rank <= 75" class="qualify"><strong>{{ level.percentToQualify }}%</strong> or better to qualify</p>
                            <p v-else-if="rank <= 150" class="qualify"><strong>100%</strong> or better to qualify</p>
                            <p v-else class="qualify closed">This level does not accept new records.</p>
                        </div>

                        <template v-if="recordsTab === 'table'">
                            <p v-if="records.length === 0" class="no-records">No records</p>
                            <table v-else class="records">
                                <tr v-for="(record, i) in records" :key="i" class="record">
                                    <td class="percent"><p>{{ record.percent }}%</p></td>
                                    <td class="user">
                                        <a v-if="record.link" :href="record.link" target="_blank" rel="noopener" class="type-label-lg">{{ record.user }}</a>
                                        <span v-else class="type-label-lg">{{ record.user }}</span>
                                    </td>
                                    <td class="mobile">
                                        <img v-if="record.mobile" :src="\`/assets/phone-landscape\${store.dark ? '-dark' : ''}.svg\`" alt="Mobile">
                                    </td>
                                    <td class="hz"><p>{{ record.hz }}Hz</p></td>
                                </tr>
                            </table>
                        </template>

                        <div v-else class="proof">
                            <p v-if="proofRecords.length === 0" class="no-records">No video proof</p>
                            <template v-else>
                                <div class="video-wrap" v-if="proofVideo">
                                    <iframe class="video" :src="proofVideo" frameborder="0" allowfullscreen></iframe>
                                </div>
                                <p v-else class="no-records">
                                    This video can't be embedded.
                                    <a :href="proofRecords[proofIndex].link" target="_blank" rel="noopener">Open it in a new tab</a>
                                </p>
                                <ul class="proof-list">
                                    <li v-for="(r, i) in proofRecords" :key="i">
                                        <button type="button" :class="{ on: i === proofIndex }" @click="proofIndex = i">{{ r.user }} &ndash; {{ r.percent }}%</button>
                                    </li>
                                </ul>
                            </template>
                        </div>
                    </div>
                    <div v-else class="level level-empty" key="empty">
                        <p>(ノಠ益ಠ)ノ彡┻━┻</p>
                    </div>
                </transition>
            </section>

            <!-- Meta -->
            <aside class="meta-container">
                <div class="meta">
                    <div class="errors" v-show="allErrors.length > 0">
                        <p class="error" v-for="error of allErrors">{{ error }}</p>
                        <button type="button" class="retry" @click="retry">Retry</button>
                    </div>

                    <template v-if="editors">
                        <h3>List editors</h3>
                        <ol class="editors">
                            <li v-for="editor in editors">
                                <img :src="\`/assets/\${roleIconMap[editor.role]}\${store.dark ? '-dark' : ''}.svg\`" :alt="editor.role" @error="hideImg">
                                <a v-if="editor.link" class="type-label-lg link" target="_blank" rel="noopener" :href="editor.link">{{ editor.name }}</a>
                                <p v-else>{{ editor.name }}</p>
                            </li>
                        </ol>
                    </template>

                    <h3>Submission requirements</h3>
                    <ul class="requirements">
                        <li>Achieved the record without using hacks (FPS bypass is allowed, up to 360fps).</li>
                        <li>Achieved the record on the level listed on the site. Check the level ID before you submit.</li>
                        <li>Have either source audio or clicks/taps in the video. Edited audio only does not count.</li>
                        <li>Show a previous attempt and the entire death animation before the completion, unless it is a first-attempt completion. Everyplay records are exempt.</li>
                        <li>Show the player hit the endwall, or the completion is invalidated.</li>
                        <li>Do not use secret routes or bug routes.</li>
                        <li>Do not use easy modes. Only the unmodified level qualifies.</li>
                        <li>Once a level falls onto the Legacy List, records are accepted for 24 hours after it falls off. After that, never.</li>
                    </ul>
                </div>
            </aside>

            <!-- Mobile bottom navigation (hidden on desktop via CSS) -->
            <nav class="m-nav" aria-label="Sections">
                <button type="button" :class="{ on: mobilePane === 'list' }" @click="mobilePane = 'list'">List</button>
                <button type="button" :class="{ on: mobilePane === 'level' }" @click="mobilePane = 'level'">Level</button>
                <button type="button" :class="{ on: mobilePane === 'info' }" @click="mobilePane = 'info'">Info</button>
            </nav>
        </main>
    `,
    data: () => ({
        list: [],
        editors: [],
        faces: {},
        loading: true,
        selectedKey: null,
        query: "",
        tab: "ranked", // "ranked" | "unverified"
        recordsTab: "table", // "table" | "proof"
        proofIndex: 0,
        mobilePane: "list", // "list" | "level" | "info"
        toggledShowcase: false,
        copied: false,
        copyTimer: null,
        errors: [],
        // PLUS list
        plusData: { levels: [], multiplier: PLUS_MULT, error: null },
        plusLoaded: false,
        plusLoading: false,
        // time machine
        history: [],
        extra: {}, // levels loaded from old snapshots
        timeIndex: 0, // applied snapshot (history.length = today)
        sliderIndex: 0, // what the slider shows
        timeToken: 0,
        timeBusy: false,
        panelOpen: false,
        roleIconMap,
        store,
    }),
    computed: {
        plus() {
            return !!this.store.plus;
        },
        plusMult() {
            return this.plusData.multiplier || PLUS_MULT;
        },
        allErrors() {
            return this.plus && this.plusData.error
                ? [...this.errors, this.plusData.error]
                : this.errors;
        },
        byKey() {
            const m = {};
            for (const e of this.list || []) {
                const k = keyOf(e);
                if (k) m[k] = e;
            }
            return m;
            facesLower() {
    const m = {};
    for (const [k, v] of Object.entries(this.faces || {})) m[k.toLowerCase()] = v;
    return m;
        },
        // null = currently unverified, undefined = not on the current list
        currentRank() {
            const m = {};
            build(this.list || []).forEach((item) => {
                if (item.key) m[item.key] = item.rank;
            });
            return m;
        },
        hasPaths() {
            return (this.list || []).every(([l]) => !l || l.path);
        },
        isToday() {
            return this.plus || this.timeIndex >= this.history.length;
        },
        snap() {
            return this.plus ? null : this.history[this.timeIndex] || null;
        },
        whenLabel() {
            return this.snap ? this.snap.label || fmt(this.snap.date) : "Today";
        },
        // Goes up by itself every time a snapshot is added to _history.json
        currentVersion() {
            return this.versionFor(this.history.length);
        },
        view() {
            if (this.plus) return build(this.plusData.levels);
            const entries = this.snap
                ? this.snap.list.map((p) => this.byKey[p] || this.extra[p] || [null, p])
                : this.list || [];
            return build(entries);
        },
        unverifiedCount() {
            return this.view.filter((v) => v.unverified).length;
        },
        tabView() {
            return this.view.filter((v) =>
                this.tab === "unverified" ? v.unverified : !v.unverified
            );
        },
        filteredView() {
            const q = this.query.trim().toLowerCase();
            return this.tabView.filter((v) => !q || v.level?.name?.toLowerCase().includes(q));
        },
        // "Did you mean ...?" (only when nothing matches)
        suggestion() {
            const q = this.query.trim().toLowerCase();
            if (q.length < 3 || this.filteredView.length) return null;
            const max = Math.max(1, Math.floor(q.length / 3));
            let best = null;
            let bestD = Infinity;
            for (const v of this.view) {
                const name = v.level?.name;
                if (!name) continue;
                const d = closeness(q, name);
                if (d < bestD) {
                    bestD = d;
                    best = v;
                }
            }
            return best && bestD <= max ? best : null;
        },
        selectedItem() {
            return this.tabView.find((v) => v.key === this.selectedKey) || this.tabView[0];
        },
        level() {
            return this.selectedItem?.level;
        },
        rank() {
            return this.selectedItem?.rank;
        },
        points() {
            if (!this.level || this.selectedItem.unverified || !this.rank) return "N/A";
            try {
                const base = Number(score(this.rank, 100, this.level.percentToQualify));
                const p = this.plus ? base * this.plusMult : base;
                return Number.isFinite(p) ? Math.round(p * 100) / 100 : "N/A";
            } catch {
                return "N/A";
            }
        },
        records() {
            const r = Array.isArray(this.level?.records) ? this.level.records : [];
            return this.snap ? r.filter((x) => !x.date || x.date <= this.snap.date) : r;
        },
        proofRecords() {
            return this.records.filter((r) => r && r.link);
        },
        proofVideo() {
            return safeEmbed(this.proofRecords[this.proofIndex]?.link);
        },
        video() {
            const l = this.level;
            if (!l) return "";
            const url =
                this.toggledShowcase && l.showcase ? l.showcase : l.verification || l.showcase;
            return safeEmbed(url);
        },
    },
    watch: {
        "selectedItem.key"() {
            this.toggledShowcase = false;
            this.copied = false;
            this.recordsTab = "table";
            this.proofIndex = 0;
        },
        tab() {
            this.selectedKey = this.tabView[0]?.key ?? null;
        },
        sliderIndex(i) {
            this.applyTime(i);
        },
        // The top bar shows this next to the list name
        currentVersion: {
            immediate: true,
            handler(v) {
                this.store.version = v;
            },
        },
        plus(on) {
            try {
                localStorage.setItem("plus", on ? "1" : "0");
            } catch {}
            this.tab = "ranked";
            this.query = "";
            if (on) this.ensurePlus();
            else this.selectedKey = this.tabView[0]?.key ?? null;
        },
    },
    errorCaptured(err) {
        this.errors.push(`Something went wrong: ${err?.message || err}`);
        return false;
    },
    async mounted() {
        await this.load();
        if (this.plus) await this.ensurePlus();
    },
    methods: {
        embed,
        score,
        fmt,
        versionFor(i) {
            return this.history[i]?.version || `v${VERSION_MAJOR}.${i}`;
        },
        faceName(level) {
            if (!level) return "";
            return String(this.faces[level.path] || level.difficulty || "");
        },
        faceSrc(level) {
            const n = this.faceName(level);
            return n ? `/assets/faces/${encodeURIComponent(n)}.png` : "";
        },
        hideImg(e) {
            e.target.style.display = "none";
        },
        selectLevel(key) {
            this.selectedKey = key;
            this.mobilePane = "level";
        },
        applySuggestion() {
            const s = this.suggestion;
            if (!s) return;
            this.tab = s.unverified ? "unverified" : "ranked";
            this.query = s.level.name;
            this.$nextTick(() => (this.selectedKey = s.key));
        },
        async load() {
            this.loading = true;
            this.errors = [];
            const [list, editors, history, faces] = await Promise.all([
                safe(fetchList),
                safe(fetchEditors),
                fetchHistory(),
                fetchFaces(),
            ]);
            this.list = list;
            this.editors = editors;
            this.history = history;
            this.faces = faces;
            this.timeIndex = this.sliderIndex = this.history.length;

            if (!Array.isArray(this.list)) {
                this.list = null;
                this.errors = ["Failed to load list. Retry in a few minutes or notify list staff."];
            } else {
                this.errors.push(
                    ...this.list
                        .filter(([_, err]) => err)
                        .map(([_, err]) => `Failed to load level. (${err}.json)`)
                );
                if (!this.editors) {
                    this.errors.push("Failed to load list editors.");
                }
                const noFace = this.list
                    .map(([l]) => l)
                    .filter((l) => l && !this.faceName(l))
                    .map((l) => l.path);
                if (noFace.length) {
                    console.warn("Levels without a difficulty face (add them to _faces.json):", noFace);
                }
            }

            this.selectedKey = this.tabView[0]?.key ?? null;
            this.loading = false;
        },
        async ensurePlus() {
            if (this.plusLoaded) {
                this.selectedKey = this.tabView[0]?.key ?? null;
                return;
            }
            this.plusLoading = true;
            this.plusData = await fetchPlus();
            this.plusLoaded = !this.plusData.error;
            this.plusLoading = false;
            this.selectedKey = this.tabView[0]?.key ?? null;
        },
        async retry() {
            this.plusLoaded = false;
            await this.load();
            if (this.plus) await this.ensurePlus();
        },
        step(d) {
            this.sliderIndex = Math.min(this.history.length, Math.max(0, this.sliderIndex + d));
        },
        async copyPassword() {
            const text = String(this.level?.password ?? "");
            if (!text) return;
            try {
                await navigator.clipboard.writeText(text);
            } catch {
                const t = document.createElement("textarea");
                t.value = text;
                document.body.appendChild(t);
                t.select();
                try { document.execCommand("copy"); } catch {}
                t.remove();
            }
            this.copied = true;
            clearTimeout(this.copyTimer);
            this.copyTimer = setTimeout(() => (this.copied = false), 1500);
        },
        toToday() {
            this.sliderIndex = this.history.length;
        },
        // Loads any levels the snapshot needs, then applies it (latest drag wins)
        async applyTime(i) {
            if (this.plus) return;
            const token = ++this.timeToken;
            const snap = this.history[i];
            if (snap) {
                const missing = snap.list.filter((p) => !this.byKey[p] && !(p in this.extra));
                if (missing.length) {
                    this.timeBusy = true;
                    try {
                        const loaded = await Promise.all(missing.map(fetchLevel));
                        missing.forEach((p, n) => (this.extra[p] = loaded[n]));
                    } catch {
                        this.errors.push("Failed to load some older levels for this snapshot.");
                    }
                    if (token !== this.timeToken) return;
                }
            }
            this.timeBusy = false;
            this.timeIndex = i;
            if (!this.tabView.some((v) => v.key === this.selectedKey)) {
                this.selectedKey = this.tabView[0]?.key ?? null;
            }
        },
        // Small note next to a level when viewing the past
        delta(item) {
            if (this.isToday || !this.hasPaths || !item.key || item.unverified) return "";
            const now = this.currentRank[item.key];
            if (now === undefined) return "off list";
            if (now === null) return "now unverified";
            return now === item.rank ? "" : `now #${now}`;
        },
    },
};
