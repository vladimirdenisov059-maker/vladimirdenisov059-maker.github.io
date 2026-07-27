# Экзотический сад Донбасса

Статический авторский сайт о многолетнем опыте выращивания растений в условиях Донбасса.

## Стек

Astro, TypeScript, локальные типизированные данные, CSS без UI-фреймворка, минимальный браузерный JavaScript.

## Запуск

```bash
npm install
npm run dev
```

Проверки: `npm run check`, `npm run lint`, `npm run build`. Production preview: `npm run preview`.

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

Папка `dist` после `npm run build` подходит для Cloudflare Pages, Netlify, GitHub Pages, Vercel Static или обычного недорогого хостинга. Для первой версии сервер и база данных не нужны.

## Перед публикацией

Добавить реальные фото и тексты, проверить все пометки из `content-needed.md`, утвердить юридические страницы, установить настоящий canonical URL и выполнить все проверки. Не подключать Метрику и формы до утверждения политики данных.
