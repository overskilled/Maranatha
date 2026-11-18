import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

export default defineConfig({
  site: 'https://maranatha-le-juste-prix.com/',

  // Pages are static by default; the shop, the checkout and the whole
  // back office opt into server rendering with `export const prerender = false`.
  output: 'static',
  adapter: node({ mode: 'standalone' }),

  build: {
    inlineStylesheets: 'auto',
  },
  compressHTML: true,

  vite: {
    // Native modules must stay outside the bundle.
    ssr: { external: ['better-sqlite3', 'sharp'] },
    optimizeDeps: { exclude: ['better-sqlite3', 'sharp'] },
  },
});
