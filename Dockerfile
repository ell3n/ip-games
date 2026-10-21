# Taller de CIDR: pàgina estàtica servida amb nginx
FROM nginx:1.27-alpine

# Treiem la pàgina de benvinguda per defecte i hi posem la nostra
RUN rm -rf /usr/share/nginx/html/*
COPY index.html styles.css app.js /usr/share/nginx/html/

EXPOSE 80

# nginx:alpine ja arrenca nginx en primer pla; no cal CMD
