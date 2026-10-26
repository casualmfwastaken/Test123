import { fetchLeaderboard } from '../content.js';
import { localize } from '../util.js';

import Spinner from '../components/Spinner.js';

export default {
    components: {
        Spinner,
    },
    data: () => ({
        leaderboard: [],
        loading: true,
        selectedUser: null,
        query: '',
        err: [],
        failed: false,
        mobilePane: 'board', // 'board' | 'player'
    }),
    template: `
        <main v-if="loading" class="page-loading">
            <Spinner></Spinner>
        </main>
        <main v-else class="page-leaderboard" :class="'pane-' + mobilePane">
            <aside class="board-container">
                <p class="lb-error" v-if="failed" role="alert">Couldn't load the leaderboard. Try again in a few minutes.</p>
                <p class="lb-error" v-else-if="err.length > 0">
                    Leaderboard may be incorrect, as the following levels could not be loaded: {{ err.join(', ') }}
                </p>

                <input class="lb-search" type="search" v-model="query" placeholder="Search players" aria-label="Search players" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" />

                <ul class="board">
                    <li v-for="p in filtered" :key="p.user" class="board-row" :class="{ active: p.user === entry?.user }">
                        <span class="board-rank">#{{ p.rank }}</span>
                        <button type="button" class="board-name" @click="select(p.user)">
                            <span class="type-label-lg">{{ p.user }}</span>
                            <small class="board-total">{{ localize(p.total) }}</small>
                        </button>
                    </li>
                    <li class="board-empty" v-if="filtered.length === 0">
                        {{ query.trim() ? 'No players match "' + query + '".' : 'No players yet.' }}
                    </li>
                </ul>
            </aside>

            <section class="player-container">
                <div class="player" v-if="entry">
                    <div class="player-head">
                        <h1>{{ entry.user }}</h1>
                        <p class="player-rank">Rank #{{ entryRank }}</p>
                    </div>

                    <ul class="lb-stats">
                        <li>
                            <div class="type-title-sm">Total points</div>
                            <p>{{ localize(entry.total) }}</p>
                        </li>
                        <li>
                            <div class="type-title-sm">Verified</div>
                            <p>{{ entry.verified.length }}</p>
                        </li>
                        <li>
                            <div class="type-title-sm">Completed</div>
                            <p>{{ entry.completed.length }}</p>
                        </li>
                        <li>
                            <div class="type-title-sm">Progressed</div>
                            <p>{{ entry.progressed.length }}</p>
                        </li>
                    </ul>

                    <template v-if="entry.verified.length > 0">
                        <h2>Verified ({{ entry.verified.length }})</h2>
                        <table class="table">
                            <tr v-for="s in entry.verified" :key="'v' + s.rank + s.level">
                                <td class="rank"><p>#{{ s.rank }}</p></td>
                                <td class="level">
                                    <a v-if="s.link" class="type-label-lg" target="_blank" rel="noopener" :href="s.link">{{ s.level }}</a>
                                    <span v-else class="type-label-lg">{{ s.level }}</span>
                                </td>
                                <td class="score"><p>+{{ localize(s.score) }}</p></td>
                            </tr>
                        </table>
                    </template>

                    <template v-if="entry.completed.length > 0">
                        <h2>Completed ({{ entry.completed.length }})</h2>
                        <table class="table">
                            <tr v-for="s in entry.completed" :key="'c' + s.rank + s.level">
                                <td class="rank"><p>#{{ s.rank }}</p></td>
                                <td class="level">
                                    <a v-if="s.link" class="type-label-lg" target="_blank" rel="noopener" :href="s.link">{{ s.level }}</a>
                                    <span v-else class="type-label-lg">{{ s.level }}</span>
                                </td>
                                <td class="score"><p>+{{ localize(s.score) }}</p></td>
                            </tr>
                        </table>
                    </template>

                    <template v-if="entry.progressed.length > 0">
                        <h2>Progressed ({{ entry.progressed.length }})</h2>
                        <table class="table">
                            <tr v-for="s in entry.progressed" :key="'p' + s.rank + s.level">
                                <td class="rank"><p>#{{ s.rank }}</p></td>
                                <td class="level">
                                    <a v-if="s.link" class="type-label-lg" target="_blank" rel="noopener" :href="s.link">{{ s.percent }}% {{ s.level }}</a>
                                    <span v-else class="type-label-lg">{{ s.percent }}% {{ s.level }}</span>
                                </td>
                                <td class="score"><p>+{{ localize(s.score) }}</p></td>
                            </tr>
                        </table>
                    </template>
                </div>
                <div class="player player-empty" v-else>
                    <p>No players to show yet.</p>
                </div>
            </section>

            <nav class="m-nav" aria-label="Sections">
                <button type="button" :class="{ on: mobilePane === 'board' }" @click="mobilePane = 'board'">Players</button>
                <button type="button" :class="{ on: mobilePane === 'player' }" @click="mobilePane = 'player'">Profile</button>
            </nav>
        </main>
    `,
    computed: {
        ranked() {
            return this.leaderboard.map((e, i) => ({ ...e, rank: i + 1 }));
        },
        filtered() {
            const q = this.query.trim().toLowerCase();
            return this.ranked.filter((p) => !q || p.user.toLowerCase().includes(q));
        },
        entry() {
            return (
                this.leaderboard.find((e) => e.user === this.selectedUser) ||
                this.leaderboard[0] ||
                null
            );
        },
        entryRank() {
            return this.entry ? this.leaderboard.indexOf(this.entry) + 1 : 0;
        },
    },
    async mounted() {
        try {
            const [leaderboard, err] = await fetchLeaderboard();
            this.leaderboard = leaderboard || [];
            this.err = err || [];
        } catch {
            this.failed = true;
        }
        this.loading = false;
    },
    methods: {
        localize,
        select(user) {
            this.selectedUser = user;
            this.mobilePane = 'player';
        },
    },
};
