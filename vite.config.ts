import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { VitePluginFonts } from '@dolu/vite-plugin-fonts'

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, "src/main.ts"),
      name: '@zerologin/elements',
      fileName: (format) => `zerologin.${format}.js`,
    },
    rollupOptions: {
      external: ['~/src/assets/icons/logo.svg'],
    },
  },
  plugins: [
    vue({ customElement: true }),
    VitePluginFonts({
      google: {
        baseUrl: 'https://api.fonts.coollabs.io/css2',
        families: [{
          /**
           * Family name (required)
           */
          name: 'Inter',

          /**
           * Family styles
           */
          styles: 'wght@400;500;600;700',

          /**
           * enable non-blocking renderer
           *   <link rel="preload" href="xxx" as="style" onload="this.rel='stylesheet'">
           * default: true
           */
          defer: true,
        },],
      },
    }),
  ]
})
