FROM nginx:1.28-alpine

ARG NGINX_CONFIG=local.conf

COPY docker/nginx/${NGINX_CONFIG} /etc/nginx/nginx.conf
COPY web /usr/share/nginx/html
