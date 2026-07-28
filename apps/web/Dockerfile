# syntax=docker/dockerfile:1
FROM node:20-alpine AS builder
WORKDIR /app

# NEXT_PUBLIC_* se inlinea en el bundle del navegador en tiempo de build,
# no se puede pasar como env var del contenedor corriendo en runtime.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ARG NEXT_PUBLIC_ROOT_HOST
ENV NEXT_PUBLIC_ROOT_HOST=${NEXT_PUBLIC_ROOT_HOST}

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Docker setea HOSTNAME=<id_contenedor> en cada contenedor por defecto, y el
# server.js standalone de Next.js hace bind literal a ese valor si esta
# seteado -- termina escuchando en la IP interna del contenedor en la red de
# Docker en vez de en todas las interfaces, y ni siquiera `wget
# http://localhost:3000` (el healthcheck de abajo) puede conectarse.
# Encontrado desplegando de verdad por primera vez (ver Plan_Fase4_Infraestructura.md).
ENV HOSTNAME="0.0.0.0"

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
