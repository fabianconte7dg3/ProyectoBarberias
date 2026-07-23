# Visión Futura: Motor de Reservas Multi-Industria (Agnóstico)

## La Reflexión
Durante el desarrollo del **Hito 2 del Frontend** (MVP del Portal de Reservas), se hizo evidente que las decisiones arquitectónicas tomadas (sistema Multi-Tenant, Next.js dinámico, Base de datos normalizada) abren la puerta para que el software sirva a múltiples nichos de mercado sin alterar el código base.

Aunque el MVP y el "Go-To-Market" inicial están enfocados al 100% en **Barberías**, la estructura subyacente es un **Motor genérico de reservas por bloques de tiempo**.

## ¿Por qué la arquitectura actual lo permite?

1. **Rutas Dinámicas (`/[tenantSlug]`)**: 
   - El enlace de reserva no depende del tipo de negocio. `/barberia-carlos` funciona exactamente igual de bien para `/veterinaria-peludos` o `/clinica-dental-sonrisas`.
   
2. **Abstracción de Entidades (Base de Datos)**:
   - Para el motor, un `Barbero` es simplemente un `Empleado` o `Recurso`.
   - Un `Corte Clásico` es un `Servicio` genérico que tiene `duracionMinutos` y `precioBase`.
   - La lógica de solapamiento de horarios (TimeSlotGrid) calcula la disponibilidad sumando duraciones. Es una matemática pura que no sabe si está calculando el tiempo de un masaje o de un corte de pelo.

3. **Inyección Dinámica de Theming**:
   - Mediante el `layout.tsx` a nivel de tenant, cada negocio inyecta sus propias variables de diseño (colores primarios, modo oscuro/claro). El mismo código HTML de la Pantalla de Reservas puede lucir oscuro/dorado para una barbería premium, o blanco/celeste para una clínica médica.

## Posibles Mercados Futuros de Expansión
Una vez consolidado el mercado de barberías, el mismo producto (como SaaS B2B o "Marca Blanca") puede pivotar instantáneamente a:

- **Salones de Belleza, Spas y Uñas:** (Servicio: Masaje, Especialista: Masajista/Manicurista).
- **Veterinarias:** (Servicio: Baño y Corte / Consulta, Especialista: Groomer / Veterinario).
- **Consultorios Médicos / Psicología:** (Servicio: Consulta General, Especialista: Doctor / Especialista).
- **Talleres Mecánicos:** (Servicio: Revisión 30,000 km, Especialista: Mecánico en turno).
- **Espacios Físicos (Canchas de Pádel / Salas de Ensayo):** (Servicio: Alquiler de 1 hora, Recurso: Cancha 1).

## Único Trabajo Requerido para Pivotar
El sistema es agnóstico en el backend. El único límite actual es *semántico* en la interfaz gráfica. 
Para adaptar el producto a otra industria, bastaría con:
1. Agregar una columna `terminologia_empleado` (ej. "Doctor", "Groomer", "Cancha") y `terminologia_servicio` en la tabla `Tenants`.
2. Reemplazar las palabras estáticas en el frontend web (`<p>Selecciona tu Barbero</p>`) por variables dinámicas leídas del contexto del tenant (`<p>Selecciona tu {tenant.terminologia_empleado}</p>`).
