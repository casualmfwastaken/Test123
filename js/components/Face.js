import { cutout } from '../faces.js?v=4';

export default {
    props: {
        src: { type: String, default: '' },
        alt: { type: String, default: '' },
        large: { type: Boolean, default: false },
    },
    data: () => ({ out: '' }),
    watch: {
        src: {
            immediate: true,
            handler(s) {
                this.out = '';
                if (!s) return;
                cutout(s).then((r) => {
                    if (this.src === s) this.out = r;
                });
            },
        },
    },
    template: `<img v-if="out" class="diff-face" :class="{ 'diff-face--lg': large }" :src="out" :alt="alt" :title="alt">`,
};
