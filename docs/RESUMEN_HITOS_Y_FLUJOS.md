# Resumen de Hitos de Desarrollo Backend y Flujos de Negocio (SaaS Barberías)

Este documento resume el progreso técnico y los flujos de negocio implementados en el backend del Proyecto Barberías (SaaS Multitenant). Se describe cómo interactúan las distintas capas y la lógica que rige los procesos clave de las barberías.

## Resumen de Hitos Completados

### Hito 1: Setup Multitenant y Autenticación con JWT
* **Infraestructura:** NestJS, PostgreSQL (Drizzle ORM), Docker.
* **Logro Principal:** Arquitectura "Single Database, Multi-Schema" (lógica) utilizando **Row-Level Security (RLS)**. Se garantiza el aislamiento de datos por `tenantId` directamente en la base de datos PostgreSQL.
* **Seguridad:** Autenticación de administradores, recepcionistas y barberos con tokens JWT asimétricos.
* **Interceptor:** Implementación de `TenantInterceptor` que extrae el tenant del JWT e inyecta el rol local (`app_user`) y el id en las variables de sesión de Postgres antes de cada transacción.

### Hito 2: Gestión Core (Catálogo y Roles)
* **Logro Principal:** CRUD protegido por roles de Barberos y Servicios.
* **Lógica:** Solo `admin` puede crear/editar/eliminar. Los recepcionistas tienen permisos delegados según se configure (lectura asegurada para todo el staff).
* **Validaciones:** Control estricto del tenantId a través del interceptor RLS (nadie puede ver o editar barberos/servicios de otra sucursal, incluso omitiendo la verificación manual de `tenantId` en código).

### Hito 3: Gestión de Clientes y VIPs
* **Logro Principal:** Base de datos de clientes compartida *dentro* del tenant. 
* **Lógica Avanzada:** Implementación de cálculo dinámico de ausencias (`no-shows`).
* **Estado de Cliente:** Los clientes se marcan como inactivos o bloqueados si superan los límites de faltas. Se preparó la lógica para perfiles `VIP` basados en métricas de asistencia.

### Hito 4: Agendamiento (Core del Negocio)
* **Logro Principal:** Lógica central para creación de citas previniendo solapamientos.
* **Concurrencia:** Protección mediante "Bloqueo Optimista". Las citas se manejan en transacciones que evitan el *double-booking* incluso ante peticiones simultáneas (doble clic del usuario).
* **Idempotencia:** Las solicitudes repetidas con la misma llave de idempotencia devuelven el resultado cacheado o recuperado para evitar citas duplicadas.
* **Auto-Almuerzo Dinámico:** Al iniciar la jornada con retraso, los bloques de descanso reservados se desplazan automáticamente para no pisar turnos.

### Hito 5: Finanzas, Transacciones y Caja
* **Logro Principal:** Cierre del ciclo de la cita y control de ingresos.
* **Flujo Transaccional:** Al completar una cita, se registra una transacción en PostgreSQL garantizando ACID. Se deducen comisiones del barbero.
* **Yappy y DGI:** Integración simulada de Yappy vía Webhooks con `runInTenantScope` (aislando el webhook asíncrono para mantener el RLS). Emisión de factura DGI simulada mediante colas/asincronismo.
* **Arqueo de Caja:** Comparación del `efectivoEsperado` (sumatoria de pagos en efectivo) vs `efectivoDeclarado` por el recepcionista, generando estados `cuadrado`, `sobrante` o `faltante`.

### Hito 6: Mensajería Asíncrona (WhatsApp con BullMQ)
* **Logro Principal:** Arquitectura de colas robustas usando BullMQ sobre Redis.
* **Flujos:** Confirmaciones automáticas, recordatorios y alertas enviadas de forma desacoplada para no bloquear la respuesta HTTP.
* **Webhooks (Evolution API):** Recepción de confirmaciones/cancelaciones por parte del cliente. Actualización del estado de la cita en BD en respuesta al mensaje de WhatsApp del cliente.

### Hito 7: Auditoría de Seguridad y Botón de Pánico
* **Logro Principal:** Módulo transversal de trazabilidad e intervenciones críticas.
* **Audit Logs:** Registro inmutable de acciones sensibles (cierre de caja con descuadre, reseteo de contraseñas, etc.).
* **Kill Switch:** Posibilidad de desactivar (`killSwitchActivo = true`) instantáneamente todas las mutaciones para una barbería. Un `Guard` a nivel global (posterior a la inyección del tenant) bloquea cualquier petición diferente a `GET` retornando un HTTP 503, aislando el tenant afectado.

---

## Flujos Principales de Negocio

### 1. Flujo de Nueva Cita y Agendamiento
1. **Validación:** Se verifica si el barbero está disponible y si la franja horaria no choca con otra cita u horario de almuerzo.
2. **Double-Booking Prevention:** Se inserta el registro usando `SERIALIZABLE` isolation o bloqueos `SELECT ... FOR UPDATE` para garantizar atomicidad.
3. **Notificación:** Se encola un job en BullMQ para enviar un WhatsApp de confirmación ("Tu cita con [Barbero] ha sido agendada").

### 2. Flujo de Finalización y Cobro (Cita completada)
1. **Recepción de Fondos:** Se indica método de pago (Efectivo, Tarjeta, Yappy).
2. **Cierre de Cita:** El estado de la cita pasa a `completada`.
3. **Contabilidad:** Se registra el pago en `transacciones_caja`. Se calcula y separa la comisión del barbero.
4. **Facturación (DGI):** De forma asíncrona, se invoca al servicio externo simulado de DGI para el ticket electrónico.

### 3. Flujo de Webhook Yappy / WhatsApp
1. **Recepción Asíncrona:** El proveedor (Banco o Meta/Evolution) hace un POST al webhook.
2. **Validación Criptográfica:** Se verifica la firma del request.
3. **Restauración del Contexto:** Al no haber un JWT (no es un usuario de la app), se utiliza `runInTenantScope` con el ID del tenant asociado a ese comercio para restaurar el RLS de Postgres de forma segura.
4. **Ejecución Lógica:** Se procesa el pago aprobado o se cancela la cita si el mensaje de WhatsApp contenía "No asistiré".

### 4. Flujo de Cierre de Caja
1. **Cálculo Esperado:** El sistema consulta todas las `transacciones_caja` del día en efectivo para ese tenant.
2. **Declaración:** El usuario declara cuánto efectivo real hay en caja.
3. **Validación de Cuadre:** Si hay diferencia, se registra como "sobrante" o "faltante".
4. **Auditoría:** Se dispara un evento a `AuditService` guardando una copia exacta del estado previo y posterior si hay descuadre.

### 5. Flujo "Kill Switch" (Emergencia)
1. **Activación:** Admin principal de la cuenta presiona "Botón de Pánico".
2. **Bloqueo:** En la base de datos, `barberias.killSwitchActivo` pasa a `true`.
3. **Intercepción Global:** `KillSwitchGuard` detecta el estado en caché/DB.
4. **Rechazo Activo:** Toda operación de escritura (POST, PUT, PATCH, DELETE) hacia ese tenant devuelve HTTP 503. Lecturas siguen permitidas (GET) para revisión histórica.
