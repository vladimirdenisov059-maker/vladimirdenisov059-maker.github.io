import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://vladimirdenisov059-maker.github.io',
  integrations: [sitemap()],
  build: { format: 'directory' },
  prefetch: { prefetchAll: true },
});
