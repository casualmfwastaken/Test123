import routes from './routes.js';

const read = (k) => { try { return localStorage.getItem(k); } catch { return null; } };

export const store = Vue.reactive({
    dark: JSON.parse(read('dark')) || false,
    plus: read('plus') === '1',
    version: 'v1.0', // List.js updates this from _history.json
    toggleDark() {
        this.dark = !this.dark;
        localStorage.setItem('dark', JSON.stringify(this.dark));
    },
});

const app = Vue.createApp({
    data: () => ({ store }),
});
const router = VueRouter.createRouter({
    history: VueRouter.createWebHashHistory(),
    routes,
});

app.use(router);

app.mount('#app');
