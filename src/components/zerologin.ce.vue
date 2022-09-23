<script setup lang="ts">
import { onMounted, ref } from "vue";
import QRCode from "qrcode";
import ky from "ky";

const emit = defineEmits<{
  (
    e: "success",
    {
      pubkey,
      jwt,
      refreshToken,
    }: { pubkey: string; jwt: string; refreshToken: string }
  ): void;
  (e: "error", value: string): void;
}>();

let props = withDefaults(defineProps<{ url: string; publicId?: string }>(), {
  url: "",
});

const lnurl = ref("");
const textCopy = ref("Click to copy");
const weblnSupported = ref(false);
const canvas = ref();

function copy() {
  textCopy.value = "Copied";
  navigator.clipboard.writeText(lnurl.value);
  setTimeout(() => {
    textCopy.value = "Click to copy";
  }, 3000);
}

async function weblnConnect() {
  // @ts-ignore
  await window.webln.enable();
  try {
    // @ts-ignore
    await webln.lnurl(lnurl.value);
  } catch (e) {
    console.error(e);
  }
}

onMounted(() => {
  const prefixUrl = props.url.includes("api/internal")
    ? props.url
    : `${props.url}/api/v1`;

  const sseUrl = new URL(prefixUrl + "/sse/lnurl");

  if (props.publicId) {
    sseUrl.searchParams.append("publicId", props.publicId);
  }

  const source = new EventSource(sseUrl);
  source.addEventListener(
    "message",
    async (e) => {
      const parsed = JSON.parse(e.data);
      if (parsed.message === "challenge") {
        lnurl.value = parsed.encoded;
        // @ts-ignore
        QRCode.toCanvas(canvas.value, parsed.encoded, function (error) {
          if (error) console.error(error);
        });
      }
      if (parsed.message === "loggedin") {
        try {
          const result = await ky
            .post(parsed.callback, {
              headers: { "Content-Type": "application/json" },
              credentials: "include",
            })
            .json();

          // @ts-ignore
          emit("success", result);
        } catch (error) {
          // @ts-ignore
          emit("error", error);
        }
      }
    },
    false
  );

  const maxInterval = 1500;
  let currentIntervalChecking = 0;
  const intervalTime = 100;
  const interval = setInterval(() => {
    currentIntervalChecking += intervalTime;
    // @ts-ignore
    if (typeof window.webln !== "undefined") {
      weblnSupported.value = true;
      clearInterval(interval);
    }
    if (currentIntervalChecking >= maxInterval) {
      clearInterval(interval);
    }
  }, intervalTime);
});
</script>

<template>
  <div class="zl">
    <div class="zl-webln" v-if="weblnSupported">
      <div>Login browser extension detected</div>
      <button @click="weblnConnect()">Open</button>

      <div class="or-scan">or scan</div>
    </div>

    <canvas class="zl-canvas" ref="canvas"></canvas>
    <div class="zl-lnurl-input-group" @click="copy()">
      <input type="text" v-model="lnurl" disabled="true" />
      <span class="zl-copy-text" ref="copyText">{{ textCopy }}</span>
    </div>
    <div class="zl-powered">
      Powered by <a href="https://zerologin.co" target="_blank">Zerologin</a>
    </div>
  </div>
</template>

<style scoped>
.zl {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.zl-webln {
  font-size: 12px;
  color: #626262;
  text-align: center;
}
.zl-webln > button {
  background-color: #000;
  color: #fff;
  border: none;
  border-radius: 4px;
  padding: 8px 15px;
  cursor: pointer;
  margin-top: 3px;
}
.zl-webln > button:hover {
  background-color: #4d4d4d;
}

.or-scan {
  margin-top: 15px;
  margin-bottom: 5px;
}

.zl-lnurl-input-group {
  position: relative;
  cursor: pointer;
}
.zl-lnurl-input-group > input {
  width: 180px;
  padding: 5px 10px;
  background-color: #fff;
  border: 1px solid #000;
  border-radius: 0;
  cursor: pointer;
}
.zl-lnurl-input-group > .zl-copy-text {
  position: absolute;
  top: 15%;
  left: 30%;
  display: none;
  cursor: pointer;
}
.zl-lnurl-input-group:hover > input {
  filter: blur(5px);
}
.zl-lnurl-input-group:hover > input + .zl-copy-text {
  display: block;
}

.zl-powered {
  margin-top: 10px;
  font-size: 12px;
  color: #626262;
}
.zl-powered > a {
  color: #000;
}
</style>
