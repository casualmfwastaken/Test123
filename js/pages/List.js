import { store } from "../main.js";
import { embed } from "../util.js";
import { score } from "../score.js";
import { fetchEditors, fetchList } from "../content.js";

import Spinner from "../components/Spinner.js";
import LevelAuthors from "../components/List/LevelAuthors.js";

const roleIconMap = {
    owner: "crown",
    admin: "user-gear",
    helper: "user-shield",
    dev: "code",
    trial: "user-lock"
};

const submissionRequirements = [
    "Achieved the record without using hacks (FPS bypass allowed up to 360fps)",
    "Check level ID before submitting a record",
    "Have either source audio or clicks/taps in the video",
    "Recording must show previous attempt and entire death animation",
    "Recording must show the player hit the endwall",
    "Do not use secret routes or bug routes",
    "Do not use easy modes",
    "24 hours limit after a level falls onto Legacy List"
];

export default {
    components: { Spinner, LevelAuthors },
    data: () => ({
        list: [],
        editors: [],
        loading: true,
        selected: 0,
        toggledShowcase: false,
        errors: [],
        roleIconMap,
        submissionRequirements,
        store
    }),
    computed: {
        level() {
            return this.list[this.selected] ? this.list[this.selected] : null;
        },
        video() {
            if (!this.level) return '';
            return this.embed(this.toggledShowcase && this.level.showcase ? this.level.showcase : this.level.verification);
        }
    },
    async mounted() {
        try {
            const [l, e] = await Promise.all([fetchList(), fetchEditors()]);
            this.list = l || [];
            this.editors = e || [];
            if (!l) this.errors.push("Failed to load list.");
            else this.errors.push(...this.list.filter(([_, err]) => err).map(([_, err]) => `Error (${err}.json)`));
            if (!e) this.errors.push("Failed to load list editors.");
        } catch (err) {
            this.errors.push("An unexpected error occurred.");
        } finally {
            this.loading = false;
        }
    },
    methods: { embed, score },
    template: `
        <main v-if="loading" class="loading-state">
            <Spinner></Spinner>
        </main>
        
        <main v-else class="dashboard">
            <!-- Left Navigation Sidebar -->
            <section class="nav-side">
                <div class="side-hdr"><h2>Levels</h2></div>
                <div class="scroll-v">
                    <table class="lvl-tbl">
                        <tr v-for="([lvl, err], i) in list" :key="i" :class="{'active': selected === i, 'err': !lvl}" @click="selected = i">
                            <td class="c-rank">
                                <span class="rank-bdg">{{ i + 1 <= 150 ? '#' + (i + 1) : 'Legacy' }}</span>
                            </td>
                            <td class="c-name">
                                <span class="lvl-txt">{{ lvl?.name || 'Error (' + err + '.json)' }}</span>
                            </td>
                        </tr>
                    </table>
                </div>
            </section>

            <!-- Main Focused Content Area -->
            <section class="main-panel">
                <div v-if="level" class="scroll-v p-4">
                    <header class="lvl-hdr">
                        <h1>{{ level.name }}</h1>
                        <LevelAuthors :author="level.author" :creators="level.creators" :verifier="level.verifier"></LevelAuthors>
                    </header>

                    <div class="vid-wrap">
                        <iframe :src="video" frameborder="0" allowfullscreen></iframe>
                    </div>
                    
                    <div class="stats-grid">
                        <div class="card"><span class="lbl">Points</span><span class="val">{{ score(selected + 1, 100, level.percentToQualify) }}</span></div>
                        <div class="card"><span class="lbl">ID</span><span class="val code">{{ level.id }}</span></div>
                        <div class="card"><span class="lbl">Password</span><span class="val">{{ level.password || 'Free to Copy' }}</span></div>
                    </div>

                    <div class="rec-sec">
                        <div class="sec-bar">
                            <h2>Player Records</h2>
                            <div class="q-badge">
                                <span v-if="selected + 1 <= 75">Requires <strong>{{ level.percentToQualify }}%</strong> or better</span>
                                <span v-else-if="selected + 1 <= 150">Requires <strong>100%</strong> to qualify</span>
                                <span v-else>Records Closed</span>
                            </div>
                        </div>
                        
                        <table v-if="level.records?.length" class="rec-tbl">
                            <thead>
                                <tr><th>Percent</th><th>User</th><th>Platform</th><th>Hz</th></tr>
                            </thead>
                            <tbody>
                                <tr v-for="(r, i) in level.records" :key="i">
                                    <td class="bold">{{ r.percent }}%</td>
                                    <td><a :href="r.link" target="_blank" class="user-lnk">{{ r.user }}</a></td>
                                    <td>
                                        <span v-if="r.mobile" class="mobile-p">
                                            <img :src="'/assets/phone-landscape' + (store.dark ? '-dark' : '') + '.svg'"> Mobile
                                        </span>
                                        <span v-else class="pc-p">PC</span>
                                    </td>
                                    <td class="txt-mut">{{ r.hz }}Hz</td>
                                </tr>
                            </tbody>
                        </table>
                        <div v-else class="empty">No records submitted yet.</div>
                    </div>
                </div>
                
                <div v-else class="empty-panel">
                    <div class="ascii">(ノಠ益ಠ)ノ彡┻━┻</div>
                    <p>Select a level from the sidebar to inspect records.</p>
                </div>
            </section>

            <!-- Right Info Aside -->
            <aside class="meta-side">
                <div v-if="errors.length" class="err-box">
                    <ul><li v-for="(e, i) in errors" :key="i">{{ e }}</li></ul>
                </div>

                <div class="meta-card">
                    <h3>Submission Rules</h3>
                    <ol><li v-for="(req, i) in submissionRequirements" :key="i">{{ req }}</li></ol>
                </div>
                
                <div v-if="editors.length" class="meta-card">
                    <h3>List Editors</h3>
                    <ul class="staff">
                        <li v-for="ed in editors" :key="ed.name">
                            <img :src="'/assets/' + roleIconMap[ed.role] + (store.dark ? '-dark' : '') + '.svg'">
                            <div class="staff-info">
                                <a v-if="ed.link" :href="ed.link" target="_blank">{{ ed.name }}</a>
                                <span v-else>{{ ed.name }}</span>
                                <small>{{ ed.role }}</small>
                            </div>
                        </li>
                    </ul>
                </div>
            </aside>
        </main>
    `
};
