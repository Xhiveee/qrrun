#!/bin/sh
set -e

DOMAIN="${DOMAIN:-localhost}"
ENABLE_TLS="${ENABLE_TLS:-false}"
TLS_CERT="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"

# Выбираем шаблон: TLS только если включён и сертификат уже существует.
if [ "$ENABLE_TLS" = "true" ] && [ -f "$TLS_CERT" ]; then
  TEMPLATE="tls.conf.template"
else
  TEMPLATE="http.conf.template"
fi

mkdir -p /etc/nginx/conf.d
sed "s|__DOMAIN__|$DOMAIN|g" "/etc/nginx/templates/$TEMPLATE" > /etc/nginx/conf.d/app.conf

# Фоновый reload для автопродления сертификата.
while :; do
  sleep 6h
  nginx -s reload 2>/dev/null || true
done &

exec nginx -g 'daemon off;'
