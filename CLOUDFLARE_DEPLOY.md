# Cloudflare API, автоматически обновляемый из GitHub

Основной сайт остаётся на GitHub Pages: `https://vladimirdenisov059-maker.github.io/`.
Cloudflare Pages получает тот же GitHub-репозиторий, но публикует только папку `cloudflare-api-public` и функцию `/api/generate-post`. Ключ ProxyAPI хранится только как зашифрованный секрет Cloudflare.

Схема: GitHub Pages → `gardens-of-donbas-api.pages.dev/api/generate-post` → ProxyAPI/Gemini.
После каждого push в `main` GitHub Pages обновляет сайт, а Cloudflare Pages автоматически обновляет API.

## Регистрация Cloudflare

1. Откройте `https://dash.cloudflare.com/sign-up`.
2. Введите свою электронную почту и придумайте отдельный надёжный пароль.
3. Нажмите **Create account**.
4. Откройте письмо Cloudflare и подтвердите адрес электронной почты.
5. Войдите в `https://dash.cloudflare.com/`.

Пароль, код из письма и данные двухфакторной защиты вводит только владелец аккаунта.

## Подключение GitHub

1. В Cloudflare откройте **Workers & Pages**.
2. Нажмите **Create application → Pages → Connect to Git**.
3. Выберите GitHub и нажмите **Install & Authorize**.
4. Разрешите доступ только к репозиторию `vladimirdenisov059-maker.github.io`.
5. Выберите этот репозиторий и нажмите **Begin setup**.
6. Укажите:
   - Project name: `gardens-of-donbas-api`
   - Production branch: `main`
   - Framework preset: `None`
   - Build command: оставить пустым
   - Build output directory: `cloudflare-api-public`
   - Root directory: оставить пустой
7. Нажмите **Save and Deploy**.

## Секрет API

1. Откройте проект `gardens-of-donbas-api`.
2. Перейдите в **Settings → Variables and Secrets**.
3. Добавьте секрет `PROXYAPI_KEY`, включите шифрование и вставьте ключ ProxyAPI.
4. Добавьте обычную переменную `ALLOWED_ORIGINS` со значением `https://vladimirdenisov059-maker.github.io`.
5. Откройте **Deployments** и повторите последнее развёртывание.

## Локальная проверка

`npm run preview:cloudflare` запускает отдельный API на `http://127.0.0.1:8788`.
`npm run dev -- --host 127.0.0.1 --port 4322` запускает сайт.
Локальный `.env.local` направляет сайт на локальный API. Секрет находится в исключённом из Git файле `.dev.vars`.

Секрет нельзя добавлять в GitHub, `.env.example`, исходный код или переменную с префиксом `PUBLIC_`.