# Экзотический сад Донбасса

Статический авторский сайт о многолетнем опыте выращивания растений в условиях Донбасса.

## Стек

Astro, TypeScript, локальные типизированные данные, CSS без UI-фреймворка, минимальный браузерный JavaScript.

## Запуск

```bash
npm install
npm run dev
```

Проверки: `npm run check`, `npm run lint`, `npm run build`. Production preview: `npm run preview`. Для проверки Cloudflare Pages Function: `npm run preview:cloudflare`.

## Структура

- `src/pages` — маршруты;
- `src/components` — интерфейсные компоненты;
- `src/data` — типы и демонстрационные данные;
- `src/config/site.ts` — название, описание и социальные ссылки;
- `src/styles/global.css` — дизайн-токены и общие стили;
- `public/images` — авторские фотографии.

## Добавление контента

Новое растение добавляется в `src/data/plants.ts`, статья — в `src/data/articles.ts`, эксперимент — в `src/data/experiments.ts`. Значения должны соответствовать интерфейсам из `src/data/types.ts`. Неизвестные сведения нельзя заполнять предположениями.

Для замены фотографии положите оптимизированный файл в `public/images` и укажите публичный путь вида `/images/plants/kivi-stratona/cvetenie-2026.webp` в поле `images` или `coverImage`. Правила имён находятся в `public/images/README.md`.

Название сайта и профиль автора меняются централизованно в `src/config/site.ts`. Перед публикацией замените `site` в `astro.config.mjs`, `PUBLIC_SITE_URL` и URL sitemap в `public/robots.txt`.

## Размещение

Основной сайт публикуется на GitHub Pages. Только API генератора размещается отдельно в Cloudflare Pages, где зашифрованно хранится `PROXYAPI_KEY`. Пошаговая настройка описана в `CLOUDFLARE_DEPLOY.md`.

Папка `dist` после `npm run build` публикуется GitHub Actions. Cloudflare получает только содержимое `cloudflare-api-public` и функцию из `functions/api/generate-post.ts`.

## Перед публикацией

Добавить реальные фото и тексты, проверить все пометки из `content-needed.md`, утвердить юридические страницы, установить настоящий canonical URL и выполнить все проверки. Не подключать Метрику и формы до утверждения политики данных.
