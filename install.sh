#!/usr/bin/env bash
# =============================================================================
#  QRUSH — установка одной командой
#
#    curl -fsSL https://raw.githubusercontent.com/Xhiveee/qrrun/main/install.sh | bash
#
#  Неинтерактивно:
#    curl -fsSL .../install.sh | REPO=https://github.com/u/r.git \
#      DOMAIN=event.example.com LETSENCRYPT_EMAIL=me@example.com \
#      ADMIN_PASSWORD='secret' ENABLE_TLS=true bash
# =============================================================================
set -Eeuo pipefail

BOLD=$'\e[1m'; DIM=$'\e[2m'; RED=$'\e[31m'; GREEN=$'\e[32m'; YELLOW=$'\e[33m'; RESET=$'\e[0m'

log()  { printf '%s▸%s %s\n' "$BOLD" "$RESET" "$*"; }
ok()   { printf '%s✓%s %s\n' "$GREEN" "$RESET" "$*"; }
warn() { printf '%s!%s %s\n' "$YELLOW" "$RESET" "$*"; }
die()  { printf '%s✗%s %s\n' "$RED" "$RESET" "$*" >&2; exit 1; }

REPO="${REPO:-https://github.com/Xhiveee/qrrun.git}"
BRANCH="${BRANCH:-main}"
TARGET_DIR="${TARGET_DIR:-$HOME/qrush}"
DOMAIN="${DOMAIN:-}"
LETSENCRYPT_EMAIL="${LETSENCRYPT_EMAIL:-}"
ADMIN_USERNAME="${ADMIN_USERNAME:-admin}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"
ENABLE_TLS="${ENABLE_TLS:-}"
FORCE_FREE_PORTS="${FORCE_FREE_PORTS:-}"

SUDO=''
if [ "$(id -u)" -ne 0 ]; then
  command -v sudo >/dev/null 2>&1 && SUDO='sudo' || die 'Нужны права root или установленный sudo'
fi

ask() { # ask <переменная> <вопрос> <значение по умолчанию>
  local __var=$1 __prompt=$2 __default=${3:-} __answer=''
  [ -n "${!__var}" ] && return 0
  # Даём вводить значения даже при curl ... | bash, если есть настоящий терминал.
  if [ -t 1 ] && [ -e /dev/tty ]; then
    printf '%s%s%s%s ' "$BOLD" "$__prompt" "$RESET" "${__default:+[$__default]}" > /dev/tty
    read -r __answer </dev/tty
    printf -v "$__var" '%s' "${__answer:-$__default}"
  else
    [ -n "$__default" ] || die "Переменная $__var не задана, а терминал недоступен"
    printf -v "$__var" '%s' "$__default"
  fi
}

random_secret() { head -c 48 /dev/urandom | base64 | tr -d '\n=+/' | cut -c1-48; }

# ----------------------------------------------------------------- 1. Docker
install_docker() {
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    ok "Docker найден: $(docker --version)"; return 0
  fi
  log 'Устанавливаю Docker…'
  curl -fsSL https://get.docker.com | $SUDO sh
  $SUDO systemctl enable --now docker 2>/dev/null || true
  docker compose version >/dev/null 2>&1 || die 'Docker Compose v2 недоступен'
  ok 'Docker установлен'
}

# -------------------------------------------------------------- 2. Исходники
fetch_sources() {
  if [ -f docker-compose.yml ] && [ -f Dockerfile ] && [ -d apps/api ]; then
    TARGET_DIR="$(pwd)"; ok "Использую текущий каталог: $TARGET_DIR"; return 0
  fi
  [ -n "$REPO" ] || ask REPO 'URL git-репозитория QRUSH:'
  [ -n "$REPO" ] || die 'REPO не задан'
  command -v git >/dev/null 2>&1 || { $SUDO apt-get update -qq && $SUDO apt-get install -y -qq git; }

  if [ -d "$TARGET_DIR/.git" ]; then
    log "Обновляю $TARGET_DIR…"; git -C "$TARGET_DIR" fetch --depth 1 origin "$BRANCH"
    git -C "$TARGET_DIR" reset --hard "origin/$BRANCH"
  else
    log "Клонирую $REPO → $TARGET_DIR…"
    git clone --depth 1 --branch "$BRANCH" "$REPO" "$TARGET_DIR"
  fi
  cd "$TARGET_DIR"
  ok "Исходники в $TARGET_DIR"
}

# ---------------------------------------------------------------- 3. Конфиг
write_env() {
  ask DOMAIN 'Домен сайта (или IP для HTTP):' ''
  [ -n "$DOMAIN" ] || die 'DOMAIN (домен или IP) обязателен'

  # HTTPS выпускаем только для настоящего домена: не для localhost и не для IP.
  if [ -z "$ENABLE_TLS" ]; then
    if [[ "$DOMAIN" == *.* && ! "$DOMAIN" =~ ^[0-9]{1,3}(\.[0-9]{1,3}){3}$ ]]; then
      ENABLE_TLS=true
    else
      ENABLE_TLS=false
    fi
  fi

  if [ "$ENABLE_TLS" = true ]; then
    ask LETSENCRYPT_EMAIL 'Email для Let'"'"'s Encrypt:'
    [ -n "$LETSENCRYPT_EMAIL" ] || die 'Email обязателен для выпуска сертификата'
  fi

  ask ADMIN_PASSWORD 'Пароль администратора:' "$(random_secret | cut -c1-16)"

  local scheme='http'; [ "$ENABLE_TLS" = true ] && scheme='https'

  if [ -f .env ]; then
    cp .env ".env.backup.$(date +%s)"
    warn 'Существующий .env сохранён в .env.backup.*'
  fi

  cat > .env <<EOF
# Сгенерировано install.sh $(date -Iseconds)
PUBLIC_URL=$scheme://$DOMAIN
DOMAIN=$DOMAIN
LETSENCRYPT_EMAIL=${LETSENCRYPT_EMAIL:-}
ENABLE_TLS=$ENABLE_TLS

PORT=3000
DATABASE_PATH=/data/qrush.sqlite
JWT_SECRET=$(random_secret)

ADMIN_USERNAME=$ADMIN_USERNAME
ADMIN_PASSWORD=$ADMIN_PASSWORD
EOF
  chmod 600 .env
  ok "Конфигурация записана в .env (PUBLIC_URL=$scheme://$DOMAIN)"
}

compose() { $SUDO docker compose "$@"; }

# ------------------------------------------------------- 4. Предпроверка
preflight_ports() {
  log 'Проверяю свободны ли порты 80/443…'
  # Старые контейнеры этого проекта могут удерживать порты.
  compose down --remove-orphans >/dev/null 2>&1 || true

  local busy=''
  busy=$(ss -tlnp 2>/dev/null | grep -E ':(80|443)\s' || true)
  [ -n "$busy" ] || return 0

  warn 'Порты 80/443 уже заняты другим процессом:'
  printf '%s\n' "$busy"

  if [ -t 0 ]; then
    local answer=''
    read -r -p "$(printf '%sОстановить nginx/apache2 на хосте? [y/N]:%s ' "$BOLD" "$RESET")" answer </dev/tty
    if [ "$answer" = 'y' ] || [ "$answer" = 'Y' ]; then
      $SUDO systemctl stop nginx apache2 >/dev/null 2>&1 || true
      busy=$(ss -tlnp 2>/dev/null | grep -E ':(80|443)\s' || true)
      [ -z "$busy" ] && return 0
    fi
  elif [ "$FORCE_FREE_PORTS" = 'true' ]; then
    warn 'FORCE_FREE_PORTS=true — останавливаю nginx/apache2 на хосте…'
    $SUDO systemctl stop nginx apache2 >/dev/null 2>&1 || true
    busy=$(ss -tlnp 2>/dev/null | grep -E ':(80|443)\s' || true)
    [ -z "$busy" ] && return 0
  fi

  die 'Освободи порты 80/443 и запусти скрипт снова (например: systemctl stop nginx apache2, или используй FORCE_FREE_PORTS=true)'
}

# -------------------------------------------------------------- 5. Запуск
boot() {
  preflight_ports
  log 'Собираю образ (первый раз это займёт пару минут)…'
  compose build app
  # nginx пересобираем без кеша, чтобы точно подхватить свежие шаблоны и entrypoint.
  compose build --no-cache nginx
  log 'Запускаю контейнеры…'
  compose up -d --force-recreate app nginx
  ok 'Контейнеры запущены'
}

issue_certificate() {
  [ "$ENABLE_TLS" = true ] || return 0
  log "Выпускаю сертификат Let's Encrypt для $DOMAIN…"
  sleep 3
  if compose --profile tls run --rm --entrypoint certbot certbot \
      certonly --webroot -w /var/www/certbot \
      -d "$DOMAIN" --email "$LETSENCRYPT_EMAIL" \
      --agree-tos --no-eff-email --non-interactive --keep-until-expiring; then
    compose --profile tls up -d
    compose restart nginx
    ok 'HTTPS включён, автопродление настроено'
  else
    warn 'Не удалось выпустить сертификат — сайт работает по HTTP.'
    warn "Проверь, что домен $DOMAIN указывает на этот сервер, и запусти: bash install.sh"
    ENABLE_TLS=false
  fi
}

summary() {
  local scheme='http'; [ "$ENABLE_TLS" = true ] && scheme='https'
  printf '\n%s──────────────────────────────────────────────%s\n' "$DIM" "$RESET"
  ok "QRUSH запущен: ${BOLD}$scheme://$DOMAIN${RESET}"
  printf '  админка   %s\n' "$scheme://$DOMAIN/admin"
  printf '  логин     %s\n' "$ADMIN_USERNAME"
  printf '  пароль    %s\n' "$ADMIN_PASSWORD"
  printf '\n  логи      %s\n' 'docker compose logs -f app'
  printf '  рестарт   %s\n' 'docker compose restart'
  printf '  обновить  %s\n' 'git pull && docker compose up -d --build'
  printf '%s──────────────────────────────────────────────%s\n\n' "$DIM" "$RESET"
}

main() {
  printf '\n%sQRUSH%s · развёртывание\n\n' "$BOLD" "$RESET"
  install_docker
  fetch_sources
  write_env
  boot
  issue_certificate
  summary
}

main "$@"
