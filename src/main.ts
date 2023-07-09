import { defineCustomElement } from 'vue';
import zerologinCE from './components/zerologin.ce.vue';
import zerologinSigauthCE from './components/zerologin-sigauth.ce.vue';

// LNURL Auth
const zerologinAuth = defineCustomElement(zerologinCE);
customElements.define('zerologin-auth', zerologinAuth);

// Sigauth
const zerologinSigauth = defineCustomElement(zerologinSigauthCE);
customElements.define('zerologin-sigauth', zerologinSigauth);

export { zerologinAuth, zerologinSigauth };