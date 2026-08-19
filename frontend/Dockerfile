# syntax=docker/dockerfile:1.7
# Web image: Vite build + nginx. Capacitor packages are optionalDependencies
# and omitted here. Same-origin API/WS via nginx — no VITE_BACKEND_URL bake.

FROM node:18.20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./

# Omit Capacitor optional pkgs, then install Alpine Rollup native binary
# (npm --omit=optional would also drop @rollup/rollup-linux-x64-musl).
RUN --mount=type=cache,target=/root/.npm \
    npm ci --legacy-peer-deps --omit=optional --no-audit --no-fund \
    && npm install --no-save --no-audit --no-fund @rollup/rollup-linux-x64-musl

COPY . .

# Same-origin (nginx proxies /api and /ws). Do not bake a backend URL.
ENV CI=false
RUN npm run build

FROM nginx:1.27-alpine

RUN apk add --no-cache curl && rm -rf /var/cache/apk/*

COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f -s http://localhost/ || exit 1

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
