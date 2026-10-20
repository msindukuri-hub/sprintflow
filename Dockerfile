# ============================================================
# SprintFlow — Docker build
# Multi-stage: Node builds the Vite app, nginx serves it.
#
# The Supabase credentials are baked in at BUILD time (Vite
# inlines VITE_* vars into the JS bundle), so pass them as
# build args — see the README "Docker" section.
# ============================================================

# ---------- Stage 1: build ----------
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies first (layer cache)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build.
# BASE_PATH=/ → the app is served from the container root.
# VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are optional:
# without them the app runs in "setup" (preview) mode.
ARG VITE_SUPABASE_URL=
ARG VITE_SUPABASE_ANON_KEY=
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

COPY . .
RUN BASE_PATH=/ npm run build

# ---------- Stage 2: serve ----------
FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]