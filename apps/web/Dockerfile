# syntax=docker/dockerfile:1
FROM node:20-alpine AS builder
WORKDIR /app

# NEXT_PUBLIC_* se inlinea en el bundle del navegador en tiempo de build,
# no se puede pasar como env var del contenedor corriendo en runtime.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
