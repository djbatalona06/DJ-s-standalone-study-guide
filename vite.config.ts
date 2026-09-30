import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // A new version waits until every Lantern tab is closed, so an update
      // never reloads the page in the middle of a review.
      registerType: 'prompt',
      injectRegister: 'script',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Lantern',
        short_name: 'Lantern',
        description: 'Spaced-repetition study for CS50 and CompTIA A+, with a pixel hacker to level up.',
        theme_color: '#0a100c',
        background_color: '#0a100c',
        display: 'standalone',
        start_url: '.',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
      workbox: {
        // The app shell is precached; diagram art is not (TRD §6). It is
        // cached the first time a diagram opens, then works offline.
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        globIgnores: ['**/diagram-*.js'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => /\/assets\/diagram-[^/]+\.js$/.test(url.pathname),
            handler: 'CacheFirst',
            options: { cacheName: 'lantern-diagrams', expiration: { maxEntries: 40 } },
          },
        ],
      },
    }),
  ],
  base: process.env.APP_BASE ?? '/',
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
});
