import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // PWA instalable: manifest + service worker (Workbox) con el shell
    // precacheado. La API NO se cachea (precios viejos servidos como frescos
    // sería mentirle al usuario): sin red, la app abre y muestra sus estados
    // de error/reintento normales.
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'PULSO — Exchange non-custodial',
        short_name: 'PULSO',
        description:
          'Exchange non-custodial de demostración: precios en vivo, staking on-chain en Sepolia y bots de paper trading.',
        lang: 'es',
        start_url: '/',
        display: 'standalone',
        background_color: '#0a0118',
        theme_color: '#0a0118',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Solo el shell estático va al precache; /api/** queda network-only
        // (default de Workbox para lo no listado) y el stream SSE ni se toca.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Los chunks lazy grandes (wagmi/charts) superan el default de 2MB.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: 'index.html',
      },
    }),
  ],
})
