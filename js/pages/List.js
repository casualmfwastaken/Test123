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
    trial: "user-lock",
};

const submissionRequirements = [
    "Achieved the record without using hacks (however, FPS bypass is allowed, up to 360fps)",
    "Achieved the record on the level that is listed on the site - please check the level ID before you submit a record",
    "Have either source audio or clicks/taps in the video. Edited audio only does not count",
    "The recording must have a previous attempt and entire death animation shown before the completion, unless the completion is on the first attempt.",
    "The recording must also show the player hit the endwall, or the completion will be invalidated.",
    "Do not use secret routes or bug routes",
    "Do not use easy modes, only a record of the unmodified level qualifies",
    "Once a level falls onto the Legacy List, we accept records for it for 24 hours after it falls off."
];

export default {
    components: { Spinner, LevelAuthors },
    data: () => ({
        list: [],
        editors: [],
        loading: true,
        selected: 0,
        errors: [],
        roleIconMap,
        submissionRequirements,
        store
    }),
    computed: {
        level() {
            return this.list[this.selected]?.[0] || null;
        },
        video() {
            if (!this.level) return '';
            const sourceVideo = this.toggledShowcase && this.level.showcase 
                ? this.level.showcase 
                : this.level.verification;
            return this.embed(sourceVideo);
        },
    },
    async mounted() {
        try {
            const [listData, editorsData] = await Promise.all([fetchList(), fetchEditors()]);
            this.list = listData || [];
            this.editors = editorsData || [];

            if (!listData) {
                this.errors.push("Failed to load list. Retry in a few minutes or notify list staff.");
            } else {
                const levelErrors = this.list
                    .filter(([_, err]) => err)
                    .map(([_, err]) => `Failed to load level. (${err}.json)`);
                this.errors.push(...levelErrors);
            }

            if (!editorsData) {
                this.errors.push("Failed to load list editors.");
            }
        } catch (e) {
            this.errors.push("An unexpected error occurred while fetching data.");
        } finally {
            this.loading = false;
        }
    },
    methods: {
        embed,
        score,
    },    template: `
        <main v-if="loading" class="list-loading-state">
            <Spinner></Spinner>
        </main>
        
        <main v-else class="dashboard-layout">
            <!-- Left Sidebar: Level Navigation List -->
            <section class="sidebar-panel navigation-panel">
                <div class="panel-header">
                    <h2>Levels</h2>
                </div>
                <div class="scrollable-content">
                    <table class="level-selection-table">
                        <tr 
                            v-for="([level, err], i) in list" 
                            :key="i"
                            class="level-row"
                            :class="{ 'is-active': selected === i, 'has-error': !level }"
                            @click="selected = i"
                        >
                            <td class="cell-rank">
                                <span class="badge-rank">{{ i + 1 <= 150 ? \`#\${i + 1}\` : 'Legacy' }}</span>
                            </td>
                            <td class="cell-name">
                                <span class="level-name-text">{{ level?.name || \`Error (\${err}.json)\` }}</span>
                            </td>
                        </tr>
                    </table>
                </div>
            </section>

            <!-- Center Panel: Selected Level Showcase & Records -->
            <section class="main-content-panel level-focus-panel">
                <div v-if="level" class="scrollable-content container-padding">
                    <header class="level-main-header">
                        <h1 class="display-title">{{ level.name }}</h1>
                        <LevelAuthors :author="level.author" :creators="level.creators" :verifier="level.verifier"></LevelAuthors>
                    </header>

                    <div class="video-wrapper">
                        <iframe class="video-player" id="videoframe" :src="video" frameborder="0" allowfullscreen></iframe>
                    </div>
                    
                    <div class="metrics-grid">
                        <div class="metric-card">
                            <span class="metric-label">Points when completed</span>
                            <span class="metric-value">{{ score(selected + 1, 100, level.percentToQualify) }}</span>
                        </div>
                        <div class="metric-card">
                            <span class="metric-label">Level ID</span>
                            <span class="metric-value code-font">{{ level.id }}</span>
                        </div>
                        <div class="metric-card">
                            <span class="metric-label">Password</span>
                            <span class="metric-value">{{ level.password || 'Free to Copy' }}</span>
                        </div>
                    </div>

                    <div class="records-section">
                        <div class="section-title-bar">
                            <h2>Player Records</h2>
                            <div class="qualification-badge">
                                <span v-if="selected + 1 <= 75">Requires <strong>{{ level.percentToQualify }}%</strong> or better</span>
                                <span v-else-if="selected + 1 <= 150">Requires <strong>100%</strong> to qualify</span>
                                <span v-else class="legacy-text">No longer accepting records</span>
                            </div>
                        </div>
                        
                        <div v-if="level.records?.length" class="table-card-wrapper">
                            <table class="records-data-table">
                                <thead>
                                    <tr>
                                        <th>Percent</th>
                                        <th>User</th>
                                        <th>Platform</th>
                                        <th>Refresh Rate</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="(record, i) in level.records" :key="i" class="data-row">
                                        <td class="text-highlight font-weight-bold">{{ record.percent }}%</td>
                                        <td>
                                            <a :href="record.link" target="_blank" class="user-profile-link">{{ record.user }}</a>
                                        </td>
                                        <td>
                                            <span v-if="record.mobile" class="platform-pill mobile-pill">
                                                <img :src="\`/assets/phone-landscape\${store.dark ? '-dark' : ''}.svg\`" alt="Mobile" class="inline-icon"> Mobile
                                            </span>
                                            <span v-else class="platform-pill pc-pill">PC</span>
                                        </td>
                                        <td class="text-muted">{{ record.hz }}Hz</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div v-else class="empty-state-notice">No records submitted yet.</div>
                    </div>
                </div>
                
                <div v-else class="panel-empty-state container-padding">
                    <div class="ascii-art">(ノಠ益ಠ)ノ彡┻━┻</div>
                    <p>Select a level from the sidebar to inspect its records.</p>
                </div>
            </section>

            <!-- Right Sidebar: Metadata, Requirements & Staff -->
            <aside class="sidebar-panel metadata-panel">
                <div class="scrollable-content container-padding gap-large">
                    <div v-if="errors.length" class="alert-banner error-banner">
                        <h4>System Alerts</h4>
                        <ul>
                            <li v-for="(error, i) of errors" :key="i">{{ error }}</li>
                        </ul>
                    </div>

                    <div class="meta-card style-guide-card">
                        <h3>Submission Rules</h3>
                        <ol class="styled-requirements-list">
                            <li v-for="(req, i) in submissionRequirements" :key="i">{{ req }}</li>
                        </ol>
                    </div>
                    
                    <div v-if="editors.length" class="meta-card staff-card">
                        <h3>List Editors</h3>
                        <ul class="staff-list">
                            <li v-for="editor in editors" :key="editor.name" class="staff-item">
                                <img :src="\`/assets/\${roleIconMap[editor.role]}\${store.dark ? '-dark' : ''}.svg\`" :alt="editor.role" class="role-badge-icon">
                                <div class="staff-info">
                                    <a v-if="editor.link" class="staff-name functional-link" target="_blank" :href="editor.link">{{ editor.name }}</a>
                                    <span v-else class="staff-name">{{ editor.name }}</span>
                                    <span class="staff-role-label">{{ editor.role }}</span>
                                </div>
                            </li>
                        </ul>
                    </div>

                    <footer class="attribution-footer">
                        <p>Layout designed by <a href="https://pages.dev" target="_blank" class="text-link">TheShittyList</a></p>
                    </footer>
                </div>
            </aside>
        </main>
    \`
};

