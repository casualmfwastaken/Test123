import routes from './routes.js';
import { DEFAULTS, loadSettings, applyTheme } from './theme.js';

const read = (k) => { try { return localStorage.getItem(k); } catch { return null; } };

export const store = Vue.reactive({
    dark: read('dark') === null ? true : JSON.parse(read('dark')),
    plus: read('plus') === '1',
    version: 'v1.0', // List.js updates this from _history.json

    // settings panel
    settings: loadSettings(),
    settingsOpen: false,
    accents: ['#0062ff', '#7c3aed', '#db2777', '#dc2626', '#ea580c', '#16a34a'],
    colorKeys: [['bg', 'Background'], ['text', 'Text']],
    groups: [
        { key: 'font', label: 'Font', opts: [['default', 'Default'], ['system', 'System'], ['serif', 'Serif'], ['mono', 'Mono']] },
        { key: 'shape', label: 'Corners', opts: [['default', 'Default'], ['sharp', 'Sharp'], ['round', 'Round']] },
        { key: 'size', label: 'Text size', opts: [['small', 'Small'], ['normal', 'Normal'], ['large', 'Large']] },
    ],

    toggleDark() {
        this.dark = !this.dark;
        localStorage.setItem('dark', JSON.stringify(this.dark));
    },
    setColor(key, value) {
        if (key === 'accent') this.settings.accent = value;
        else this.settings[this.dark ? 'dark' : 'light'][key] = value;
    },
    colorOf(key) {
        if (key === 'accent') return this.settings.accent || '#0062ff';
        const custom = this.settings[this.dark ? 'dark' : 'light'][key];
        if (custom) return custom;
        if (key === 'bg') return this.dark ? '#1b1b20' : '#ffffff';
        return this.dark ? '#ffffff' : '#111111';
    },
    resetSettings() {
        this.settings = DEFAULTS();
    },
});

// Apply and save the settings whenever they (or the theme) change
Vue.watch(
    () => [store.dark, JSON.stringify(store.settings)],
    () => {
        applyTheme(store.settings, store.dark);
        try { localStorage.setItem('settings', JSON.stringify(store.settings)); } catch {}
    },
    { immediate: true }
);

const app = Vue.createApp({
    data: () => ({ store }),
    mounted() {
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') store.settingsOpen = false;
        });
    },
});
const router = VueRouter.createRouter({
    history: VueRouter.createWebHashHistory(),
    routes,
});

app.use(router);

app.mount('#app');
const boot = document.getElementById('boot');
if (boot) {
    boot.style.transition = 'opacity .25s';
    boot.style.opacity = '0';
    setTimeout(() => boot.remove(), 260);
}
