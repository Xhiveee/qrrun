# QRUSH

Соревнование по поиску QR-кодов на площадке ивента. Админ печатает коды и развешивает их
по локации, участники находят их, сканируют телефоном и в реальном времени соревнуются
в таблице лидеров.

**Стек:** Turborepo · Bun · Elysia · TypeScript · React 19 · Tailwind CSS 4 · SQLite (bun:sqlite)
Графика — только чистый SVG и цвет, никаких растровых изображений.

---

## Как это работает

1. Админ в панели `/admin` задаёт название, длительность и количество QR-кодов.
2. Кнопка **Печать QR** открывает `/admin/print` — готовую раскладку на A4 (inline-SVG, ч/б).
3. Коды распечатываются и развешиваются по локации. На каждом листе — QR и текстовый код.
4. Участник регистрируется, наводит камеру телефона на код (или вводит код руками).
   QR ведёт на `https://<домен>/s/<TOKEN>` — скан засчитывается автоматически.
5. Повторный скан того же кода очков не даёт. 1 уникальный код = 1 очко.
6. Таблица лидеров обновляется у всех мгновенно через WebSocket.

---

## Деплой одной командой

```bash
curl -fsSL https://raw.githubusercontent.com/Xhiveee/qrrun/main/install.sh | bash
```

Скрипт установит Docker, склонирует репозиторий, **спросит домен или IP**, email
для Let's Encrypt и пароль админа. Сгенерирует `.env` с `JWT_SECRET`, соберёт
свежий образ nginx со своей конфигурацией, поднимет `docker compose` и выпустит
сертификат с автопродлением.

Неинтерактивный вариант (замени `event.example.com` на свой домен или IP):

```bash
curl -fsSL https://raw.githubusercontent.com/Xhiveee/qrrun/main/install.sh | \
  DOMAIN=event.example.com \
  LETSENCRYPT_EMAIL=me@example.com \
  ADMIN_PASSWORD='супер-пароль' bash
```

> Для HTTPS домен должен уже указывать A-записью на этот сервер.
> Для IP-адреса или `localhost` сертификат не выпускается — сайт работает по HTTP.

### Обслуживание

```bash
docker compose logs -f app        # логи
docker compose restart            # перезапуск
git pull && docker compose up -d --build   # обновление
docker compose down               # остановка (данные в volume qrush-data сохраняются)
```

База лежит в docker-volume `qrush_qrush-data` (`/data/qrush.sqlite`).

---

## Локальная разработка

```bash
bun install
bun run dev          # api :3000 + web :5173 (Vite проксирует /api и /ws)
```

Переменные для дева не обязательны — есть безопасные значения по умолчанию
(`JWT_SECRET=dev-…`, админ `admin` / `admin`). Для прод-сборки скопируй `.env.example` в `.env`.

```bash
bun run typecheck    # tsc по всем пакетам
bun run build        # сборка фронтенда
bun run start        # прод-режим: Bun отдаёт и API, и собранный SPA
```

> Камера в браузере работает только по HTTPS или на `localhost`. Для теста с телефона
> в локальной сети используйте туннель (например, `cloudflared`) или ручной ввод кода.

---

## Структура

```
apps/
  api/     Elysia + bun:sqlite: авторизация, сканы, WebSocket, админ-API, генерация SVG QR
  web/     React + Vite + Tailwind: лендинг, сканер, лидерборд, админка, печать
packages/
  shared/  общие типы и хелперы (EventState, LeaderboardRow, нормализация токенов)
deploy/
  nginx/   шаблоны конфигов (HTTP-бутстрап и TLS) + map для WebSocket-upgrade
Dockerfile, docker-compose.yml, install.sh
```

### Переменные окружения

| Переменная          | Назначение                                                   |
| ------------------- | ------------------------------------------------------------ |
| `PUBLIC_URL`        | Адрес, который зашивается в QR-коды. **Меняется до печати!**   |
| `PORT`              | Порт Bun-сервера (по умолчанию 3000)                          |
| `DATABASE_PATH`     | Путь к файлу SQLite                                           |
| `JWT_SECRET`        | Секрет подписи токенов, ≥24 символов в проде                  |
| `ADMIN_USERNAME`    | Логин админа, создаётся при первом запуске                    |
| `ADMIN_PASSWORD`    | Пароль админа                                                 |
| `DOMAIN`            | Домен для nginx / Let's Encrypt                               |
| `LETSENCRYPT_EMAIL` | Email для уведомлений Let's Encrypt                           |
| `ENABLE_TLS`        | `true` — выпускать сертификат и включать HTTPS-конфиг nginx   |

---

## API

| Метод   | Путь                        | Описание                                          |
| ------- | --------------------------- | ------------------------------------------------- |
| `POST`  | `/api/auth/register`        | регистрация (ник + пароль) → JWT                  |
| `POST`  | `/api/auth/login`           | вход → JWT                                        |
| `GET`   | `/api/me`                   | профиль, очки, место, свои сканы                  |
| `GET`   | `/api/event`                | состояние ивента и таймер                         |
| `GET`   | `/api/leaderboard`          | таблица лидеров                                   |
| `POST`  | `/api/scan`                 | засчитать код (принимает токен или URL)           |
| `WS`    | `/ws`                       | пуш состояния и лидерборда                        |
| `POST`  | `/api/admin/event/:command` | `start` `pause` `resume` `stop` `reset` `restart` |
| `PATCH` | `/api/admin/settings`       | название, подзаголовок, длительность, число кодов |
| `GET`   | `/api/admin/qr/print`       | коды вместе с готовыми SVG для печати             |

Админские маршруты требуют `Authorization: Bearer <JWT>` пользователя с флагом админа.
