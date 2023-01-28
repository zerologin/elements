<template>
  <div class="zerologin">
    <h1 class="zl-title">Login with Lightning⚡️</h1>

    <div class="zl-qr-wrapper" @click="clickToConnect()">
      <img src="" class="zl-qr" ref="qrImage" />
    </div>

    <div class="zl-scan-text">
      Scan, click or copy this code to login using your wallet
    </div>

    <div class="zl-buttons-action">
      <button class="zl-button zl-first" @click="clickToConnect()">
        Click to connect
        <img src="/src/assets/icons/send-icon.svg" alt="send icon" />
      </button>
      <button class="zl-button zl-secondary zl-first" @click="copy()">
        {{ textCopy }}
        <img src="/src/assets/icons/copy-icon.svg" alt="copy icon" />
      </button>
      <!-- <button class="zl-button zl-outline zl-last">What is a wallet?</button> -->
    </div>

    <div class="zl-powered">
      Powered by
      <a href="https://zerologin.co" target="_blank" title="Zerologin">
        <img
          ref="logo"
          class="zl-logo"
          src="/src/assets/icons/logo.svg"
          alt="not visible icon for QR code"
        />
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { AwesomeQR } from "awesome-qr";
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
const textCopy = ref(`Copy`);
const weblnSupported = ref(false);
const qrImage = ref();
const logo = ref();

function copy() {
  textCopy.value = "Copied";
  navigator.clipboard.writeText(lnurl.value);
  setTimeout(() => {
    textCopy.value = "Copy";
  }, 3000);
}

async function clickToConnect() {
  console.log(lnurl.value);
  if (weblnSupported.value) {
    // @ts-ignore
    await window.webln.enable();
    try {
      // @ts-ignore
      await webln.lnurl(lnurl.value);
    } catch (e) {
      console.error(e);
    }
  } else {
    let url = lnurl.value;
    if (!lnurl.value.startsWith("keyauth://")) {
      url = `lightning:${lnurl.value}`;
    }
    window.open(`${url}`, "_self");
  }
}

async function getBase64FromImageUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    var img = new Image();

    img.setAttribute("crossOrigin", "anonymous");

    img.onload = function (ev: Event) {
      var canvas = document.createElement("canvas");
      // @ts-ignore
      canvas.width = this.width;
      // @ts-ignore
      canvas.height = this.height;

      var ctx = canvas.getContext("2d");
      // @ts-ignore
      ctx.drawImage(this, 0, 0);

      var dataURL = canvas.toDataURL("image/png");

      resolve(dataURL);
    };
    img.onerror = function () {
      reject("Can't load image");
    };

    img.src = url;
  });
}

onMounted(async () => {
  const logoPromise = getBase64FromImageUrl(logo.value.src);

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

        const logo = await logoPromise;
        const qr = await new AwesomeQR({
          text: parsed.encoded,
          size: 280,
          logoImage: logo,
          whiteMargin: false,
          margin: 0,
        }).draw();

        qrImage.value.src = qr;
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

<style scoped lang="scss">
@use "sass:math";

$white: #fff;
$black: #000;

$violet-primary-color: #8b5cf6;
$violet-secondary-color: #a78bfa;
$violet-primary-color-hover: mix(
  $white,
  $violet-primary-color,
  math.percentage(math.div(2, 10))
);
$violet-primary-color-active: mix(
  $black,
  $violet-primary-color,
  math.percentage(math.div(2, 10))
);
$violet-primary-color-disabled: mix(
  $white,
  $violet-primary-color,
  math.percentage(math.div(6, 10))
);

$gray-primary-color: #1e293b;
$gray-secondary-color: #0f172a;
$gray-third-color: #475569;
$gray-primary-color-hover: mix(
  $white,
  $gray-primary-color,
  math.percentage(math.div(2, 10))
);
$gray-primary-color-active: mix(
  $black,
  $gray-primary-color,
  math.percentage(math.div(2, 10))
);

.zerologin {
  font-family: "Inter", sans-serif;
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  padding: 24px;
  padding-bottom: 15px;

  max-width: 300px;

  background: #0f172a;

  border: 1px solid #334155;
  border-radius: 24px;

  flex: none;
  order: 0;
  flex-grow: 0;

  .zl-title {
    text-align: center;
    margin: 0;
    padding: 0;
    font-weight: 700;
    font-size: 24px;
    line-height: 140%;
  }
  .zl-scan-text {
    font-style: normal;
    font-weight: 400;
    font-size: 14px;
    text-align: justify;
  }

  .zl-buttons-action {
    display: flex;
    flex-flow: row wrap;
    gap: 16px;
    width: 100%;

    .zl-first {
      flex-grow: 1;
    }

    .zl-last {
      flex-grow: 2;
    }
  }

  .zl-qr-wrapper {
    cursor: pointer;
    padding: 20px;
    background-color: $white;
    border-radius: 24px;

    @media (max-width: 280px) {
      border-radius: 0px;
      padding: 10px;
    }

    .zl-qr {
      width: 100%;
      height: auto;
    }
  }

  .zl-powered {
    font-size: 12px;
    display: flex;
    align-items: center;
    gap: 5px;

    .zl-logo {
      height: 25px;
    }
  }

  .zl-button {
    text-decoration: none;
    cursor: pointer;
    color: $white;
    background-color: $violet-primary-color;
    font-size: 14px;
    border: none;
    border-radius: 12px;
    padding: 15px 12px;
    font-weight: 500;

    display: flex;
    align-items: center;
    justify-content: center;
    gap: 9px;

    &:hover {
      background-color: $violet-primary-color-hover;
    }
    &:active {
      background-color: $violet-primary-color-active;
    }
    &:disabled {
      background-color: $violet-primary-color-disabled;
      cursor: no-drop;
    }

    &.zl-secondary {
      background-color: $gray-primary-color;
      &:hover {
        background-color: $gray-primary-color-hover;
      }
      &:active {
        background-color: $gray-primary-color-active;
      }
    }

    &.zl-outline {
      color: $violet-secondary-color;
      background-color: transparent;
      border: 1px solid $gray-third-color;
      &:hover {
        background-color: $violet-primary-color-hover;
        color: $white;
      }
      &:active {
        background-color: $violet-primary-color-active;
        color: $white;
      }
    }
  }
}
</style>
