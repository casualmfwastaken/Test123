import { store } from "../main.js";
import { embed } from "../util.js";
import { score } from "../score.js";
import { fetchEditors, fetchList } from "../content.js";

import Spinner from "../components/Spinner.js";
import LevelAuthors from "../components/List/LevelAuthors.js";

const dir = "/data"; // folder that holds _list.json and the level files

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

// Time machine data: [{ date: "YYYY-MM-DD", label?: string, list: ["level-file", ...] }]
async function fetchHistory() {
    try {
        const res = await fetch(`${dir}/_history.json`);
        if (!res.ok) return [];
        const data = await res.json();
        return data
            .filter((s) => s && s.date && Array.isArray(s.list))
            .sort((a, b) => (a.date < b.date ? -1 : 1));
    } catch {
        return [];
    }
}

// Loads a level that is no longer on the current list
async function fetchLevel(path) {
    try {
        const res = await fetch(`${dir}/${path}.json`);
        const level = await res.json();
        return [
            {
                ...level,
                path,
                records: [...(level.records || [])].sort((a, b) => b.percent - a.percent),
            },
            null,
        ];
    } catch {
        return [null, path];
    }
}

export default {
    components: { Spinner, LevelAuthors },
    template: `
        <main v-if="loading" class="page-loading">
            <Spinner></Spinner>
        </main>
        <main v-else class="page-list">
            <!-- Ranking -->
            <aside class="list-container">
                <div class="tm" v-if="history.length">
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
                                    <span v-if="snap">{{ fmt(snap.date) }}</span>
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

                <input class="list-search" type="search" v-model="query" placeholder="Search levels" aria-label="Search levels" />

                <transition-group name="flip" tag="ul" class="list" :class="{ busy: timeBusy }" v-if="list">
                    <li v-for="item in filteredView" :key="item.key || item.rank" class="row" :class="{ active: item.key === selectedItem?.key, error: !item.level }">
                        <span class="rank">
                            <template v-if="item.rank <= 150">#{{ item.rank }}</template>
                            <template v-else>Legacy</template>
                        </span>
                        <button type="button" class="name" @click="selectedKey = item.key">
                            <span class="type-label-lg">{{ item.level?.name || \`Error (\${item.err}.json)\` }}</span>
                            <small class="delta" v-if="delta(item)">{{ delta(item) }}</small>
                        </button>
                    </li>
                    <li class="empty" key="empty" v-if="filteredView.length === 0">No levels match "{{ query }}".</li>
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
                            <h1>{{ level.name }}</h1>
                            <LevelAuthors :author="level.author" :creators="level.creators" :verifier="level.verifier"></LevelAuthors>
                        </div>

                        <div class="video-wrap">
                            <iframe class="video" id="videoframe" :src="video" frameborder="0" allowfullscreen></iframe>
                        </div>
                        <div class="video-toggle" v-if="level.showcase">
                            <button type="button" :class="{ on: !toggledShowcase }" @click="toggledShowcase = false">Verification</button>
                            <button type="button" :class="{ on: toggledShowcase }" @click="toggledShowcase = true">Showcase</button>
                        </div>

                        <ul class="stats">
                            <li>
                                <div class="type-title-sm">Points when completed</div>
                                <p>{{ score(rank, 100, level.percentToQualify) }}</p>
                            </li>
                            <li>
                                <div class="type-title-sm">ID</div>
                                <p>{{ level.id }}</p>
                            </li>
                            <li>
                                <div class="type-title-sm">Password</div>
                                <p>{{ level.password || 'Free to Copy' }}</p>
                            </li>
                        </ul>

                        <div class="records-head">
                            <h2>Records</h2>
                            <p v-if="!isToday" class="qualify">Records up to <strong>{{ fmt(snap.date) }}</strong></p>
                            <p v-else-if="rank <= 75" class="qualify"><strong>{{ level.percentToQualify }}%</strong> or better to qualify</p>
                            <p v-else-if="rank <= 150" class="qualify"><strong>100%</strong> or better to qualify</p>
                            <p v-else class="qualify closed">This level does not accept new records.</p>
                        </div>
                        <table class="records">
                            <tr v-for="record in records" class="record">
                                <td class="percent"><p>{{ record.percent }}%</p></td>
                                <td class="user">
                                    <a :href="record.link" target="_blank" rel="noopener" class="type-label-lg">{{ record.user }}</a>
                                </td>
                                <td class="mobile">
                                    <img v-if="record.mobile" :src="\`/assets/phone-landscape\${store.dark ? '-dark' : ''}.svg\`" alt="Mobile">
                                </td>
                                <td class="hz"><p>{{ record.hz }}Hz</p></td>
                            </tr>
                        </table>
                    </div>
                    <div v-else class="level level-empty" key="empty">
                        <p>(ノಠ益ಠ)ノ彡┻━┻</p>
                    </div>
                </transition>
            </section>

            <!-- Meta -->
            <aside class="meta-container">
                <div class="meta">
                    <div class="errors" v-show="errors.length > 0">
                        <p class="error" v-for="error of errors">{{ error }}</p>
                    </div>

                    <template v-if="editors">
                        <h3>List editors</h3>
                        <ol class="editors">
                            <li v-for="editor in editors">
                                <img :src="\`/assets/\${roleIconMap[editor.role]}\${store.dark ? '-dark' : ''}.svg\`" :alt="editor.role">
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

                    <p class="og type-label-md">Website layout made by <a href="https://tsl.pages.dev/" target="_blank" rel="noopener">TheShittyList</a></p>
                </div>
            </aside>
        </main>
    `,
    data: () => ({
        list: [],
        editors: [],
        loading: true,
        selectedKey: null,
        query: "",
        toggledShowcase: false,
        errors: [],
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
        byKey() {
            const m = {};
            for (const e of this.list || []) {
                const k = keyOf(e);
                if (k) m[k] = e;
            }
            return m;
        },
        currentRank() {
            const m = {};
            (this.list || []).forEach((e, i) => {
                const k = keyOf(e);
                if (k) m[k] = i + 1;
            });
            return m;
        },
        hasPaths() {
            return (this.list || []).every(([l]) => !l || l.path);
        },
        isToday() {
            return this.timeIndex >= this.history.length;
        },
        snap() {
            return this.history[this.timeIndex] || null;
        },
        whenLabel() {
            return this.snap ? this.snap.label || fmt(this.snap.date) : "Today";
        },
        view() {
            const entries = this.snap
                ? this.snap.list.map((p) => this.byKey[p] || this.extra[p] || [null, p])
                : this.list || [];
            return entries.map((e, i) => ({ level: e[0], err: e[1], key: keyOf(e), rank: i + 1 }));
        },
        filteredView() {
            const q = this.query.trim().toLowerCase();
            return this.view.filter((v) => !q || v.level?.name?.toLowerCase().includes(q));
        },
        selectedItem() {
            return this.view.find((v) => v.key === this.selectedKey) || this.view[0];
        },
        level() {
            return this.selectedItem?.level;
        },
        rank() {
            return this.selectedItem?.rank;
        },
        records() {
            const r = this.level?.records || [];
            return this.snap ? r.filter((x) => !x.date || x.date <= this.snap.date) : r;
        },
        video() {
            if (!this.level) return "";
            if (!this.level.showcase) return embed(this.level.verification);
            return embed(this.toggledShowcase ? this.level.showcase : this.level.verification);
        },
    },
    watch: {
        "selectedItem.key"() {
            this.toggledShowcase = false;
        },
        sliderIndex(i) {
            this.applyTime(i);
        },
    },
    async mounted() {
        this.list = await fetchList();
        this.editors = await fetchEditors();
        this.history = await fetchHistory();
        this.timeIndex = this.sliderIndex = this.history.length;

        if (!this.list) {
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
        }

        this.selectedKey = this.view[0]?.key ?? null;
        this.loading = false;
    },
    methods: {
        embed,
        score,
        fmt,
        step(d) {
            this.sliderIndex = Math.min(this.history.length, Math.max(0, this.sliderIndex + d));
        },
        toToday() {
            this.sliderIndex = this.history.length;
        },
        // Loads any levels the snapshot needs, then applies it (latest drag wins)
        async applyTime(i) {
            const token = ++this.timeToken;
            const snap = this.history[i];
            if (snap) {
                const missing = snap.list.filter((p) => !this.byKey[p] && !(p in this.extra));
                if (missing.length) {
                    this.timeBusy = true;
                    const loaded = await Promise.all(missing.map(fetchLevel));
                    missing.forEach((p, n) => (this.extra[p] = loaded[n]));
                    if (token !== this.timeToken) return;
                }
            }
            this.timeBusy = false;
            this.timeIndex = i;
            if (!this.view.some((v) => v.key === this.selectedKey)) {
                this.selectedKey = this.view[0]?.key ?? null;
            }
        },
        // Small note next to a level when viewing the past
        delta(item) {
            if (this.isToday || !this.hasPaths || !item.key) return "";
            const now = this.currentRank[item.key];
            if (now === undefined) return "off list";
            return now === item.rank ? "" : `now #${now}`;
        },
    },
};
