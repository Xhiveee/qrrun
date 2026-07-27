# AGENTS

Заметки для агентов и разработчиков, работающих с этим репозиторием.

## Стек и структура

Turborepo + Bun workspaces.

- `apps/api` — Elysia на Bun, `bun:sqlite`, JWT, WebSocket `/ws`, генерация QR в SVG.
  Запускается напрямую из TypeScript, сборка не нужна.
- `apps/web` — React 19 + Vite + Tailwind CSS 4 (плагин `@tailwindcss/vite`, конфиг в
  `src/index.css` через `@theme`, отдельного `tailwind.config` нет).
- `packages/shared` — общие типы, потребляется как исходники (`main: src/index.ts`).

В продакшне Bun отдаёт и API, и собранный SPA (`WEB_DIST`), сверху nginx.

## Команды

```bash
bun install
bun run dev        # api :3000 + web :5173
bun run typecheck  # tsc --noEmit во всех пакетах — основная проверка
bun run build      # vite build для apps/web
bun run start      # прод-режим одним процессом
```

Тестового раннера нет. Перед коммитом обязательно `bun run typecheck` и `bun run build`.

Быстрый смоук API (нужен запущенный `bun run start`):

```bash
curl -s localhost:3000/healthz
curl -s localhost:3000/api/event
```

## Соглашения

- Язык интерфейса и комментариев — русский; идентификаторы — английские.
- Графика только SVG и цвет, растровых изображений нет нигде, включая печатную раскладку.
- Анимации — только CSS/Tailwind (`--animate-*` в `@theme`) и SMIL внутри SVG.
  Анимационных библиотек в проекте нет и добавлять их не нужно.
- Строки конфигов и скриптов хранятся с LF (см. `.gitattributes`) — `install.sh`
  выполняется в Linux, CRLF его сломает.

## Деплой

`install.sh` — единая точка входа: ставит Docker, пишет `.env` (обязательно `DOMAIN`),
собирает образ `qrush-nginx` из `deploy/nginx/Dockerfile`. Конфиг nginx
(`/etc/nginx/conf.d/app.conf`) генерируется уже внутри контейнера entrypoint'ом
на основе `DOMAIN`/`ENABLE_TLS`.

`PUBLIC_URL` попадает внутрь QR-кодов — менять его после печати нельзя.
