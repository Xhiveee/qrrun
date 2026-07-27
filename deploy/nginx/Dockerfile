FROM nginx:1.29-alpine

# Убираем дефолтный сервер, чтобы не было конфликта на 80 порту.
RUN rm -f /etc/nginx/conf.d/default.conf

# Базовая конфигурация WebSocket-апгрейда и шаблоны серверного блока.
COPY conf.d/00-upgrade.conf /etc/nginx/conf.d/00-upgrade.conf
COPY templates /etc/nginx/templates

# Точка входа генерирует /etc/nginx/conf.d/app.conf из шаблона на основе DOMAIN и ENABLE_TLS.
COPY entrypoint.sh /docker-entrypoint-qrush.sh
RUN chmod +x /docker-entrypoint-qrush.sh

ENTRYPOINT ["/docker-entrypoint-qrush.sh"]
