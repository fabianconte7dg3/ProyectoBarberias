# 🚀 Roadmap del Backend: BarberOS

Este es el plan de acción estructurado para el desarrollo del backend. Seguir este orden garantiza que las dependencias lógicas estén resueltas antes de avanzar (ej. no podemos crear citas sin antes tener usuarios y base de datos).

## Hito 1: Cimientos e Infraestructura (En progreso)
El objetivo es tener la base de datos corriendo y el ORM listo para recibir consultas.

- `[x]` Inicializar el proyecto NestJS (`apps/api`).
- `[x]` Configurar Drizzle ORM y políticas RLS (Aislamiento Multi-tenant).
- `[x]` Crear el archivo `docker-compose.yml` en la carpeta `infrastructure` (PostgreSQL + Redis).
- `[x]` Levantar contenedores Docker locales y sincronizar el esquema (`db:push`).
- `[x]` Aplicar manualmente el archivo `0001_rls_policies.sql` en la base de datos local.

## Hito 2: Módulo de Autenticación y Gestión de Usuarios
Asegurar el acceso y crear los perfiles que operarán el sistema.

- `[x]` **AuthModule:** Implementar inicio de sesión (JWT inicial, con miras a WebAuthn después).
- `[x]` Crear endpoint para creación/registro de la Barbería (`barberias`).
- `[x]` Crear endpoints CRUD para `usuarios` (Administradores y Barberos) y configurar sus PIN de acceso.
- `[x]` **TenantInterceptor:** Conectar la validación del JWT para inyectar automáticamente el `tenantId` en cada request.

## Hito 3: Núcleo Operativo (Servicios, Clientes y Horarios)
Los datos maestros necesarios antes de poder agendar una sola cita.

- `[x]` **ServiciosModule:** Endpoints para definir los servicios de la barbería (Corte, Barba, etc.), duración y precio.
- `[x]` **HorariosModule:** Endpoints para que el barbero defina su horario laboral y hora de almuerzo (`horarios`).
- `[x]` **ClientesModule (CRM):** Endpoints para registrar y leer clientes por número de WhatsApp.

## Hito 4: Motor de Reservas y Agenda (El corazón del sistema)
La lógica pesada para agendar sin errores ni superposiciones.

- `[x]` **CitasModule:** Endpoint para crear citas (Validar `idempotencyKey` para evitar doble click).
- `[x]` Implementar Bloqueo Optimista (Reservar espacio temporal por 3 minutos).
- `[x]` Implementar lógica de validación para evitar solapamientos de turnos entre barberos.
- `[x]` Implementar auto-almuerzo dinámico (Desplazar horario de almuerzo si hay retrasos).
- `[x]` Endpoint para Cancelar/Reprogramar (Aplica los "strikes" automáticos al CRM del cliente).

## Hito 5: Motor Financiero e Integraciones (Yappy + DGI)
Cobros inmutables y cierres ciegos.

- `[x]` **TransaccionesModule:** Generación del registro en `transacciones` tras cada cita completada.
- `[x]` **YappyModule:** Generar URL de pago y exponer un Webhook seguro (validado con firmas criptográficas) para recibir la confirmación de pago.
- `[x]` **DgiModule:** Lógica asíncrona para enviar transacciones al PAC (Alegra/GuruSoft).
- `[x]` **CajaModule:** Lógica del Cierre Ciego de Caja (Comparar efectivo_declarado vs esperado) y registrar desviaciones.

## Hito 6: Asincronía y WhatsApp (BullMQ + Evolution API)
Liberar el hilo principal y enviar notificaciones.

- `[x]` **QueueModule:** Configurar workers de BullMQ y conectarlos a Redis.
- `[x]` **WhatsappModule:** Configurar la conexión con Evolution API y exponer webhook para mensajes entrantes (bot).
- `[x]` Crear *Jobs* programados: Enviar recordatorio 24 horas antes de la cita.
- `[x]` Crear *Jobs* programados: Cancelación automática si pasan 15 min de retraso.

## Hito 7: Auditoría y Seguridad Final
Blindar las finanzas y crear logs.

- `[ ]` Asegurar que todos los intentos de alteración financiera se graben en `audit_logs` usando el `accionAuditEnum`.
- `[ ]` Probar el "Kill Switch" temporal (para frenar operaciones en caso de emergencia).

---

> [!NOTE]
> **Siguiente Acción Sugerida:**
> Iniciar el **Hito 7**, que comprende la capa final de seguridad: Auditoría financiera inmutable (`audit_logs`) y el sistema de emergencia "Kill Switch". ¿Quieres que prepare el plan de implementación para este hito?
