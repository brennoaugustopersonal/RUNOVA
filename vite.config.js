import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.svg'],
      manifest: {
        name: 'RUNOVA - Personal Running Tracker',
        short_name: 'RUNOVA',
        description: 'Running Tracker Profissional com GPS, simulação e gamificação',
        theme_color: '#070709',
        background_color: '#070709',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/icons/icon-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
          {
            src: '/icons/icon-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,svg,png,ico}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/[abc]\.basemaps\.cartocdn\.com\/dark_all\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'leaflet-tiles',
              expiration: { maxEntries: 200, maxAgeSeconds: 604800 },
            },
          },
          {
            urlPattern: /^https:\/\/api\.open-meteo\.com\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'weather-api',
              expiration: { maxEntries: 10, maxAgeSeconds: 600 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 3000,
    host: true,
  },
});
