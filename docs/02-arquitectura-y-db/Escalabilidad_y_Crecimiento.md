# 📈 Escalabilidad y Crecimiento — Hoja de Ruta

> **Creado:** 2026-07-17  
> **Principio guía:** No sobreingenieres ahora. Cada capa de infraestructura se agrega cuando los ingresos la justifican.

---

## 1. Mapa de Escalabilidad por Fases

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FASE PILOTO: 0 – 50 barberías
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Infraestructura:
  1 VPS Hetzner CX22 (~€6/mes)
  1 PostgreSQL (mismo VPS)
  1 NestJS (mismo VPS)
  1 Redis (mismo VPS)
  1 Evolution API (mismo VPS)
  Cloudflare (CDN gratuito para el frontend)

Costo operativo: ~€10–15/mes
Ingresos esperados: $500–$1,750/mes
Margen: Altísimo

Cambios arquitectónicos: Ninguno
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FASE CRECIMIENTO: 50 – 300 barberías
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Infraestructura:
  1 VPS Hetzner CX32 (más RAM/CPU, ~€16/mes)
  1 PostgreSQL con Read Replica (~€10/mes)
  PgBouncer (Connection Pooling)
  Redis dedicado (mismo VPS o instancia pequeña)
  Evolution API con gestión multi-instancia
  Cloudflare Pages (frontend)

Costo operativo: ~€40–60/mes
Ingresos esperados: $3,000–$15,000/mes
Margen: Excelente

Cambios arquitectónicos:
  + Read replica para queries de reportes pesados
  + PgBouncer para manejar conexiones concurrentes
  + Estrategia de enrutamiento Evolution API
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FASE ESCALA: 300 – 2,000 barberías
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Infraestructura:
  Hetzner Load Balancer (~€6/mes)
  2–3 instancias NestJS (horizontal scaling)
  PostgreSQL dedicado con replicación
  Redis Cluster o Valkey
  Servidor dedicado Evolution API
  Migración a Meta Cloud API oficial (WhatsApp)
  Cloudflare Workers para rate limiting perimetral

Costo operativo: ~€150–250/mes
Ingresos esperados: $15,000–$150,000/mes
Margen: Muy saludable

Cambios arquitectónicos:
  + Load Balancer con Health Checks
  + Socket.io Redis Adapter (WebSockets multi-servidor)
  + Particionamiento tabla `transacciones` por mes
  + Migración WhatsApp a Meta Cloud API
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FASE REGIONAL: Centroamérica y más
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Infraestructura:
  Multi-región (Hetzner EU + US)
  Microservicios (WhatsApp, Facturación, Pagos)
  API Gateway centralizado (Kong o AWS API Gateway)
  Integraciones de facturación por país (AFIP, SAT, etc.)
  Multi-currency (aunque USD es el estándar en Panamá)

Requiere:
  Re-arquitectura de integraciones de pago por país
  Nuevas integraciones de facturación local
  Estrategia de compliance legal por país
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 2. Redis + BullMQ — El Componente Crítico Faltante

Redis es **obligatorio desde el día 1** por tres razones distintas:

### A. Cola de Trabajos (BullMQ)

Todos los procesos pesados o diferidos deben correr fuera del ciclo de petición-respuesta del servidor:

| Job | Trigger | Prioridad |
|-----|---------|-----------|
| `send-reminder-whatsapp` | Cron: 24h antes de cada cita | Alta |
| `emit-dgi-invoice` | Después de confirmar pago | Alta |
| `retry-dgi-invoice` | Si GuruSoft/Alegra falla | Alta |
| `send-debt-reminder` | Cada 12h para citas en estado 'deuda' | Media |
| `auto-close-expired-citas` | Cron: cada 15 min | Media |
| `send-emergency-cancel` | Admin presiona botón de emergencia | Urgente |
| `generate-daily-report` | Cron: cierre de día por tenant | Baja |

Sin BullMQ, todos estos procesos corren en el hilo principal de NestJS → el servidor se ahoga en horario pico.

### B. WebSockets a Escala (Socket.io Redis Adapter)

La agenda del barbero se actualiza en tiempo real cuando un cliente reserva. Esto usa WebSockets. El problema:

```
Sin Redis:
  Cliente reserva → WebSocket en Server A → 
  Barbero conectado a Server B → ❌ No se entera

Con Redis Adapter:
  Cliente reserva → WebSocket en Server A → 
  Redis publica evento → Server B recibe → 
  Barbero conectado a Server B → ✅ Ve la reserva al instante
```

### C. Rate Limiting Distribuido

Sin Redis, cada instancia del servidor lleva su propio contador. Con múltiples instancias, el límite de peticiones por tenant no funciona. Redis centraliza los contadores.

---

## 3. Evolution API a Escala — Estrategia de Enrutamiento

Cada barbería conecta su propio número de WhatsApp como una instancia de Evolution API. A medida que crece el número de clientes:

```
Fase Piloto (0–50 barberías):
  ┌─────────────────────────┐
  │  Evolution API Server 1  │
  │  Instancias: 1 – 50      │
  └─────────────────────────┘

Fase Crecimiento (50–300 barberías):
  ┌─────────────────────────┐    ┌─────────────────────────┐
  │  Evolution API Server 1  │    │  Evolution API Server 2  │
  │  Instancias: 1 – 150     │    │  Instancias: 151 – 300   │
  └─────────────────────────┘    └─────────────────────────┘
              ↑                              ↑
        ┌─────────────────────────────────────┐
        │   NestJS: WhatsappRouter Service    │
        │   tenant_id → servidor correcto     │
        │   (mapeado en Redis o PostgreSQL)   │
        └─────────────────────────────────────┘
```

El `WhatsappRouterService` en NestJS consulta en qué servidor Evolution API está registrada cada barbería y enruta los webhooks y envíos al servidor correcto.

---

## 4. Cuello de Botella por Analizar: Tabla `transacciones`

Con el tiempo, la tabla `transacciones` crecerá indefinidamente. Estrategia de particionamiento:

```sql
-- Cuando superes ~1 millón de registros, partir por mes:
CREATE TABLE transacciones_2025_01 PARTITION OF transacciones
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- PostgreSQL enruta automáticamente las queries
-- Los reportes históricos siguen funcionando sin cambios en el código
```

Esto mantiene las queries del dashboard del admin rápidas sin importar cuántos años de datos acumule el sistema.

---

## 5. Stack Completo Actualizado (Fase Piloto)

```
FRONTEND
  Next.js + PWA
  Cloudflare Pages (CDN gratuito)

BACKEND
  NestJS (Node.js)
  Módulos: Auth, Citas, Cobros, WhatsApp, Facturación, Reportes

BASE DE DATOS
  PostgreSQL + Row Level Security (RLS)
  PgBouncer (Connection Pooling)

CACHE & COLAS
  Redis
  BullMQ (Jobs: recordatorios, facturas, cron jobs)

INFRAESTRUCTURA
  Hetzner VPS (producción)
  Docker + Docker Compose
  Cloudflare Tunnel (desarrollo local)

INTEGRACIONES
  Yappy API (Pagos — Node.js oficial)
  Evolution API (WhatsApp — MVP)
  GuruSoft / Alegra (Facturación DGI)

SEGURIDAD
  Cloudflare (CDN + DDoS + Geofencing)
  JWT (autenticación stateless)
  WebAuthn / Biometría (barberos)
  Row Level Security (PostgreSQL)
```

---

## 6. Lo que NO hay que construir ahora

Para no sobreingenierir el MVP:

| Tecnología | Cuándo agregarla |
|-----------|-----------------|
| Kubernetes | +500 barberías |
| Microservicios | +1,000 barberías |
| Multi-región | Expansión regional |
| Message Broker (Kafka) | Necesidad de event sourcing real |
| Elasticsearch | Búsquedas complejas en reportes |
| GraphQL | Si el frontend lo demanda específicamente |

---

## 7. Métricas de Alerta (Señales para escalar)

Monitorear en Grafana/Uptime Robot:

| Métrica | Umbral de alerta | Acción |
|---------|-----------------|--------|
| CPU del VPS | > 70% sostenido | Upgrade de plan VPS |
| Conexiones PostgreSQL | > 80 simultáneas | Activar PgBouncer agresivo |
| Tiempo de respuesta API | > 500ms p95 | Revisar queries lentas |
| Cola BullMQ pendiente | > 1,000 jobs | Agregar worker adicional |
| RAM Evolution API | > 80% | Nuevo servidor Evolution API |
| Tiempo de entrega WhatsApp | > 30 seg | Revisar salud de instancias |
