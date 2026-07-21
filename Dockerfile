# App 100% estático (ES modules, sem build) servido por nginx, atrás do Traefik do VPS.
FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY index.html /usr/share/nginx/html/
COPY css/ /usr/share/nginx/html/css/
COPY js/ /usr/share/nginx/html/js/
COPY exemplo/ /usr/share/nginx/html/exemplo/

EXPOSE 80
