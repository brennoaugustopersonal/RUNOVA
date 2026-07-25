import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const ONE_YEAR = 60 * 60 * 24 * 365;

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icons/*.svg', 'favicon.svg'],
      manifest: {
        id: '/',
        name: 'RUNOVA — Personal Running Tracker',
        short_name: 'RUNOVA',
        description:
          'Tracker de corrida com GPS, simulador, clima, zonas de FC e gamificação. Dados 100% locais.',
        lang: 'pt-BR',
        dir: 'ltr',
        theme_color: '#070709',
        background_color: '#070709',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'portrait',
        start_url: '/?source=pwa',
        scope: '/',
        categories: ['health', 'sports', 'fitness'],
        shortcuts: [
          {
            name: 'Iniciar corrida',
            short_name: 'Correr',
            url: '/?source=pwa-shortcut#/',
            description: 'Abre direto na tela inicial para configurar uma nova corrida',
          },
          {
            name: 'Histórico',
            short_name: 'Histórico',
            url: '/?source=pwa-shortcut#/history',
          },
        ],
        icons: [
          { src: '/icons/icon-192.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any' },
          { src: '/icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any' },
          {
            src: '/icons/icon-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,svg,png,ico,json}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Tiles do OSM: cache agressivo permite ver a rota mesmo offline.
            urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'osm-tiles',
              expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 14 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/api\.open-meteo\.com\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'weather-api',
              expiration: { maxEntries: 30, maxAgeSeconds: 600 },
              networkTimeoutSeconds: 5,
            },
          },
          {
            urlPattern: /^https:\/\/air-quality-api\.open-meteo\.com\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'air-quality-api',
              expiration: { maxEntries: 20, maxAgeSeconds: 1800 },
              networkTimeoutSeconds: 5,
            },
          },
          {
            urlPattern: /^https:\/\/nominatim\.openstreetmap\.org\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'geocoding',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 },
              networkTimeoutSeconds: 5,
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: ONE_YEAR },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    sourcemap: false,
    // Avisa cedo se um chunk crescer demais para redes móveis.
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          leaflet: ['leaflet'],
          icons: ['lucide-react'],
        },
      },
    },
  },
  esbuild: {
    // Remove ruído de depuração do bundle de produção (mantém console.error).
    pure: ['console.log', 'console.debug', 'console.info'],
  },
  server: {
    port: 3000,
    host: true,
  },
  preview: {
    port: Number(process.env.PORT) || 4173,
    host: true,
    // Necessário quando o serviço roda via `vite preview` atrás de um domínio
    // gerenciado (Render, Railway, etc.) — sem isso o Vite recusa o Host
    // header com "Blocked request. This host is not allowed."
    allowedHosts: true,
  },
});
