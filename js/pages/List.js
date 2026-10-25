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

export default {
    components: { Spinner, LevelAuthors },
    template: `
        <main v-if="loading" class="page-loading">
            <Spinner></Spinner>
        </main>
        <main v-else class="page-list">
            <!-- Ranking -->
            <aside class="list-container">
                <input
                    class="list-search"
                    type="search"
                    v-model="query"
                    placeholder="Search levels"
                    aria-label="Search levels"
                />
                <table class="list" v-if="list">
                    <tr v-for="item in filteredList" :key="item.i">
                        <td class="rank">
                            <p v-if="item.i + 1 <= 150" class="type-label-lg">#{{ item.i + 1 }}</p>
                            <p v-else class="type-label-lg legacy">Legacy</p>
                        </td>
                        <td class="level" :class="{ active: selected == item.i, error: !item.level }">
                            <button @click="selected = item.i">
                                <span class="type-label-lg">{{ item.level?.name || \`Error (\${item.err}.json)\` }}</span>
                            </button>
                        </td>
                    </tr>
                    <tr v-if="filteredList.length === 0">
                        <td class="empty" colspan="2">No levels match "{{ query }}".</td>
                    </tr>
                </table>
            </aside>

            <!-- Level detail -->
            <section class="level-container">
                <div class="level" v-if="level">
                    <header class="level-header">
                        <h1>{{ level.name }}</h1>
                        <LevelAuthors :author="level.author" :creators="level.creators" :verifier="level.verifier"></LevelAuthors>
                    </header>

                    <div class="video-wrap">
                        <iframe class="video" id="videoframe" :src="video" frameborder="0" allowfullscreen></iframe>
                    </div>
                    <div class="video-toggle" v-if="level.showcase">
                        <button :class="{ on: !toggledShowcase }" @click="toggledShowcase = false">Verification</button>
                        <button :class="{ on: toggledShowcase }" @click="toggledShowcase = true">Showcase</button>
                    </div>

                    <ul class="stats">
                        <li>
                            <div class="type-title-sm">Points when completed</div>
                            <p>{{ score(selected + 1, 100, level.percentToQualify) }}</p>
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
                        <p v-if="selected + 1 <= 75" class="qualify"><strong>{{ level.percentToQualify }}%</strong> or better to qualify</p>
                        <p v-else-if="selected + 1 <= 150" class="qualify"><strong>100%</strong> or better to qualify</p>
                        <p v-else class="qualify closed">This level does not accept new records.</p>
                    </div>
                    <table class="records">
                        <tr v-for="record in level.records" class="record">
                            <td class="percent">
                                <p>{{ record.percent }}%</p>
                            </td>
                            <td class="user">
                                <a :href="record.link" target="_blank" rel="noopener" class="type-label-lg">{{ record.user }}</a>
                            </td>
                            <td class="mobile">
                                <img v-if="record.mobile" :src="\`/assets/phone-landscape\${store.dark ? '-dark' : ''}.svg\`" alt="Mobile">
                            </td>
                            <td class="hz">
                                <p>{{ record.hz }}Hz</p>
                            </td>
                        </tr>
                    </table>
                </div>
                <div v-else class="level level-empty">
                    <p>(ノಠ益ಠ)ノ彡┻━┻</p>
                </div>
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
        selected: 0,
        query: "",
        toggledShowcase: false,
        errors: [],
        roleIconMap,
        store
    }),
    computed: {
        // Keeps the original index so rank stays correct while searching
        filteredList() {
            const q = this.query.trim().toLowerCase();
            return (this.list || [])
                .map(([level, err], i) => ({ level, err, i }))
                .filter(({ level }) => !q || level?.name?.toLowerCase().includes(q));
        },
        level() {
            return this.list?.[this.selected]?.[0];
        },
        video() {
            if (!this.level) return "";
            if (!this.level.showcase) {
                return embed(this.level.verification);
            }
            return embed(
                this.toggledShowcase
                    ? this.level.showcase
                    : this.level.verification
            );
        },
    },
    watch: {
        selected() {
            this.toggledShowcase = false;
        },
    },
    async mounted() {
        this.list = await fetchList();
        this.editors = await fetchEditors();

        if (!this.list) {
            this.errors = [
                "Failed to load list. Retry in a few minutes or notify list staff.",
            ];
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

        this.loading = false;
    },
    methods: {
        embed,
        score,
    },
};
