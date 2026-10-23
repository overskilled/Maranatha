import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://maranatha-lejusteprix.cm',
  output: 'static',
  build: {
    inlineStylesheets: 'auto',
  },
  compressHTML: true,
});
