import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://maranatha-le-juste-prix.com/',
  output: 'static',
  build: {
    inlineStylesheets: 'auto',
  },
  compressHTML: true,
});
