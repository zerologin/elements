import { defineCustomElement } from 'vue';
import zerologinCE from './components/zerologin.ce.vue';

const zerologinAuth = defineCustomElement(zerologinCE);
customElements.define('zerologin-auth', zerologinAuth);

export { zerologinAuth };