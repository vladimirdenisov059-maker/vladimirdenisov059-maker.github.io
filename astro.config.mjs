import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || 'https://vladimirdenisov059-maker.github.io',
  integrations: [sitemap({ filter: (page) => !new URL(page).pathname.startsWith('/studio-vd') })],
  build: { format: 'directory' },
  prefetch: { prefetchAll: true },
});
