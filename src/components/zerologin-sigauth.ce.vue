<template>
  <div class="zerologin">
    <h1 class="zl-title">Login with Sigauth</h1>

    <div class="zl-qr-wrapper" @click="clickToConnect()">
      <img src="" class="zl-qr" ref="qrImage" />
    </div>

    <div class="zl-scan-text">
      Scan, click or copy this code to login using a compatible app.
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
      <a
        href="https://github.com/Dolu89/sigauth-specs"
        target="_blank"
        class="zl-button zl-outline zl-last"
      >
        Learn more about Sigauth
      </a>
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
// @ts-ignore
import SimplePeer from "simple-peer/simplepeer.min.js";

const emit = defineEmits<{
  (e: "success", { pubkey, jwt }: { pubkey: string; jwt: string }): void;
  (e: "error", value: string): void;
}>();

let props = withDefaults(defineProps<{ url: string; publicId: string }>(), {
  url: "",
});

const sigauth = ref("");
const textCopy = ref(`Copy`);
const qrImage = ref();
const logo = ref();

function copy() {
  textCopy.value = "Copied";
  navigator.clipboard.writeText(sigauth.value);
  setTimeout(() => {
    textCopy.value = "Copy";
  }, 3000);
}

async function clickToConnect() {
  window.open(`${sigauth.value}`, "_self");
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

async function loadQR(
  logoPromise: Promise<string>,
  authRequest: { challengeId: string; challenge: string }
) {
  const logo = await logoPromise;
  const qr = await new AwesomeQR({
    text: authRequest.challenge,
    size: 280,
    logoImage: logo,
    whiteMargin: false,
    margin: 0,
  }).draw();

  qrImage.value.src = qr;
}

async function loadSigauth() {
  let peer: SimplePeer;

  const wsUrl = props.url
    .replace("http://", "ws://")
    .replace("https://", "wss://");

  const authRequest: { challengeId: string; challenge: string } = await ky
    .get(`${props.url}/api/v2/sigauth?id=${props.publicId}`)
    .json();

  sigauth.value = authRequest.challenge;

  const logoPromise = getBase64FromImageUrl(logo.value.src);
  await loadQR(logoPromise, authRequest);

  const ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    ws.send(
      JSON.stringify({ action: "join", challengeId: authRequest.challengeId })
    );
  };

  ws.onerror = (err) => {
    console.log("ws error", err);
  };

  ws.onmessage = (event: { data: string }) => {
    if (event.data.startsWith("remote-peer")) {
      peer = new SimplePeer({
        initiator: true,
        trickle: false,
        config: { iceServers: [] },
      });

      peer.on("connect", () => {
        // wait for 'connect' event before using the data channel
        console.log("connected");
        ws.close();
      });

      peer.on("error", (error: Error) => {
        console.error("error", error);
        emit("error", `${error.name}: ${error.message}`);
        peer.destroy();
        ws.close();
        loadSigauth();
      });

      peer.on("data", async (data: Uint8Array) => {
        try {
          const result: { jwt: string; pubkey: string } = await ky
            .get(data.toString(), {
              headers: {
                "Content-Type": "application/json",
              },
              credentials: "include",
            })
            .json();
          peer.send("success");
          emit("success", result);
        } catch (error) {
          console.error("error", error);
          emit("error", `${error}`);
          peer.destroy();
          ws.close();
          loadSigauth();
        }
      });

      peer.on("signal", async (data: { type: string; sdp: unknown }) => {
        console.log("on signal", JSON.stringify(data));
        if (data.type === "offer") {
          ws.send(
            JSON.stringify({
              action: "offer",
              challengeId: authRequest.challengeId,
              offer: JSON.stringify(data),
            })
          );
        }
      });
    } else if (event.data.startsWith("answer:")) {
      console.log("got answer", event.data);
      const answer = JSON.parse(event.data.replace("answer:", ""));
      peer.signal(answer);
    } else if (event.data.startsWith("icecandidate:")) {
      console.log("got icecandidate", event.data);
      const icecandidate = JSON.parse(event.data.replace("icecandidate:", ""));
      peer.signal(icecandidate);
    }
  };
}

onMounted(async () => {
  await loadSigauth();
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
