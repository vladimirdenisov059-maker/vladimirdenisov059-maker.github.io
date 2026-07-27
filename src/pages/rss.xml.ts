import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { articles } from '@/data/articles';
import { site } from '@/config/site';

export const GET: APIRoute = (context) => rss({
  title: site.name,
  description: site.description,
  site: context.site ?? 'https://example.com',
  items: articles.filter((article) => !article.draft).map((article) => ({
    title: article.title,
    description: article.excerpt,
    link: `/articles/${article.slug}/`,
    ...(article.publishedAt ? { pubDate: new Date(article.publishedAt) } : {}),
  })),
});
