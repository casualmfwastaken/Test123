import { fetchEditors } from '../content.js';
import Spinner from '../components/Spinner.js';

const SITE = {
    name: 'Sample List',
    tagline: 'The list which ranks levels in Geometry Dash.',
    description: 'Write a short description of your list here.',
    discord: '#',
    youtube: '#',
};

export default {
    components: { Spinner },
    data: () => ({ site: SITE, editors: [], loading: true }),
    template: `
        <main v-if="loading" class="page-loading">
            <Spinner></Spinner>
        </main>
        <main v-else class="page-home">
            <aside class="staff-panel">
                <div class="staff-head">
                    <h2>Staff &amp; Community</h2>
                    <p>The staff team</p>
                </div>
                <div class="staff-count">
                    <span>LIST STAFF ({{ staff.length }})</span>
                    <span>ROLE</span>
                </div>
                <ul class="staff-list" v-if="staff.length">
                    <li v-for="e in staff" :key="e.name">
                        <span class="avatar">{{ initial(e.name) }}</span>
                        <a v-if="e.link" class="staff-name" :href="e.link" target="_blank" rel="noopener">{{ e.name }}</a>
                        <span v-else class="staff-name">{{ e.name }}</span>
                        <span class="role" :class="'role-' + e.role">{{ e.role }}</span>
                    </li>
                </ul>
                <p class="staff-empty" v-else>Couldn't load the staff list.</p>
            </aside>

            <section class="hero">
                <h1>{{ site.name }}</h1>
                <p class="hero-lead">{{ site.tagline }}</p>
                <p class="hero-sub">{{ site.description }}</p>

                <div class="hero-links">
                    <a class="hcard" :href="site.discord" target="_blank" rel="noopener">
                        <span class="hcard-icon"><img src="/assets/discord.svg" alt=""></span>
                        <span><strong>Discord</strong><small>Our server</small></span>
                    </a>
                    <a class="hcard" :href="site.youtube" target="_blank" rel="noopener">
                        <span class="hcard-icon">
                            <svg viewBox="0 0 24 24" width="20" height="20" fill="#ff3b3b" aria-hidden="true"><path d="M9 7l8 5-8 5z"/></svg>
                        </span>
                        <span><strong>YouTube</strong><small>Our channel</small></span>
                    </a>
                </div>

                <div class="hero-actions">
                    <router-link class="hbtn hbtn--primary" to="/list">Explore Levels</router-link>
                    <router-link class="hbtn" to="/leaderboard">View Leaderboard</router-link>
                    <router-link class="hbtn" to="/roulette">Roulette</router-link>
                </div>
            </section>
        </main>
    `,
    computed: {
        staff() {
            return Array.isArray(this.editors) ? this.editors : [];
        },
    },
    async mounted() {
        try {
            this.editors = await fetchEditors();
        } catch {
            this.editors = [];
        }
        this.loading = false;
    },
    methods: {
        initial(n) {
            return String(n || '?').charAt(0).toUpperCase();
        },
    },
};
