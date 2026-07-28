# 💡 Ideas Futuras: Expansión Multi-Industria y Barbero Independiente (Solo-preneur)

Este documento registra los análisis de factibilidad técnica, arquitectura y estrategia de negocio para ejes de crecimiento futuro del SaaS:
1. **Adaptación para Barberos Independientes / Freelancers (Solo-preneurs)**.
2. **Expansión a Nuevas Verticales de Mercado (Veterinarias, Clínicas, Salones de Belleza, Spas, etc.)**.
3. **Motor de Formularios Dinámicos y Exportación Inteligente** (idea sin desarrollar, ver sección 3).

---

## 🎯 1. Sistema para Barbero Independiente (Solo-preneur)

### Concepto y Visión
Un **Barbero Independiente** opera sin equipo ni personal a su cargo. Necesita una solución rápida, limpia y económica que elimine la fricción de gestionar múltiples agendas o liquidación de comisiones.

### Análisis Técnico: "Tenant de 1 Solo Miembro"
La arquitectura Multi-tenant basada en PostgreSQL RLS y Next.js dinámico soporta este caso de uso sin alterar la base de datos ni escribir un backend paralelo.

### Estado de Implementación: 🚀 COMPLETADO & EN PRODUCCIÓN

- **Plan Individual ($6.00 USD/mes):** Registrado en la base de datos PostgreSQL, enum `plan_suscripcion` ('independiente') y en los selectores del SuperAdmin con límite estricto de 1 barbero activo.
- **Reserva Pública Express (`/[tenantSlug]/reservar`):** Detección automática de 1 barbero activo ➔ Muestra la card personalizada `BarberProfileCard` ("Tu Especialista de Hoy") y auto-selecciona al barbero sin selector redundante.
- **Auto-Resolución de `barberoId` en Backend:** Manejo resiliente en `POST /citas/publica` donde `barberoId` es opcional en DTO y se auto-asigna al único barbero activo si no viene especificado en la reserva pública.
- **Agenda Admin Adaptativa:** Saludo personalizado *"¡Buen día, [Nombre]! 👋"*, ocultamiento dinámico de toggles de equipo cuando se detecta 1 solo barbero y vista limpia por defecto de *Lista de Turnos*.
- **Modal Mi Desempeño:** Adaptado para mostrar `"100% Ingresos Directos"` y `"Ganancia Total"` sin tarjetas de comisiones de empleados ni filas vacías en $0.00.
- **Reversión Dinámica:** Si el negocio contrata un 2do barbero, la interfaz revierte de forma transparente al *Modo Equipo* con selector multi-barbero.

---

## 🏥 2. Expansión Multi-Industria (Motor Agnóstico de Citas)

### Concepto y Visión
Aunque el producto MVP se denominó **Proyecto Barberías**, el backend (NestJS/Drizzle) y la base de datos fueron diseñados como un **Motor Genérico de Reservas por Bloques de Tiempo**.

Un `Barbero` en la base de datos es un `Recurso Humano`, un `Corte Clásico` es un `Servicio` con `duracionMinutos` y `precioBase`, y la matriz de disponibilidad es una matemática agnóstica a la industria.

### Análisis de Adaptación por Vertical

| Vertical / Industria | Recurso ("Barbero") | Servicio ("Corte") | Particularidad a Adaptar | Esfuerzo |
| :--- | :--- | :--- | :--- | :--- |
| **Salones de Belleza / Spas** | Estilista / Manicurista / Masajista | Tinte, Manicura, Masaje | Selección de múltiples servicios en combo. | 🟢 Muy Bajo (1 día) |
| **Veterinarias & Pet Grooming** | Groomer / Veterinario | Baño, Corte, Consulta | Campo adicional en cliente: `nombre_mascota` / `raza`. | 🟢 Bajo (1-2 días) |
| **Clinicas & Consultorios Médicos** | Doctor / Especialista | Consulta General, Diagnóstico | Ficha médica simplificada o notas de evolución por cita. | 🟡 Medio (3-4 días) |
| **Talleres Mecánicos** | Mecánico / Elevador | Cambio de Aceite, Revisión 30k km | Asignación de bahía o elevador físico. | 🟡 Medio (3-4 días) |
| **Alquiler de Espacios (Pádel/Ensayo)**| Cancha / Sala | Alquiler 1 Hora, Clase | El recurso es un espacio físico, no una persona. | 🟢 Bajo (2 días) |

### Abstracción Semántica en Frontend
Para soportar múltiples verticales sin duplicar código, basta con implementar la **Terminología Dinámica por Tenant**:

1. **Tabla `tenants` (Base de datos):**
   - `terminologia_empleado`: string (ej: `"Barbero"`, `"Doctor"`, `"Groomer"`, `"Cancha"`).
   - `terminologia_servicio`: string (ej: `"Servicio"`, `"Consulta"`, `"Tratamiento"`, `"Alquiler"`).

2. **Frontend UI:**
   Reemplazar textos fijos como `"Selecciona tu Barbero"` por `` `Selecciona tu ${tenant.terminologia_empleado}` ``.

---

## 📄 3. Motor de Formularios Dinámicos y Exportación Inteligente

> **Estado: idea sin desarrollar, sin fecha ni compromiso.** Propuesta por el usuario el 2026-07-27 como
> spec externa (no generada por el equipo). Registrada acá porque `docs/plan.md` es solo para trabajo
> comprometido con checkboxes accionables — esto todavía no lo es.

### Concepto

Un constructor visual de formularios (campos configurables: texto, número, fecha, select, checkbox,
archivo, firma) que los usuarios finales llenan vía link público, con versionado (congelar la versión
vieja si se edita un formulario con respuestas ya guardadas), validación estricta en backend, y un motor
de exportación que fusiona las respuestas con una plantilla para generar documentos finales (contratos,
recibos, reportes) en PDF, con vista de impresión optimizada (oculta la UI de navegación al imprimir).

### Encaje con la arquitectura actual

Más compatible de lo que parece a primera vista — varias piezas ya existen:
- **BullMQ ya está en el stack** (`apps/api`, Redis) — el requisito de "colas de procesamiento en segundo
  plano" no exige infraestructura nueva.
- **Branding por tenant ya existe** (`colorPrimario`, `logoUrl` en `barberias`) — cubre buena parte del
  requisito de "identidad de marca en documentos".
- **Aislamiento estricto por RLS** ya es el patrón central de todo el proyecto.
- Ya existe un primitivo real y directamente relacionado: `barberias.configCamposPersonalizados` (campos
  dinámicos por industria, hoy solo para `pacientes` en veterinaria/clínica médica) y
  `clientes.datos_adicionales` (jsonb) — **pero ambos con cero wiring de UI/API real**, según nota vigente
  en `CLAUDE.md`. Un motor de formularios genérico podría ser, en parte, la forma de finalmente darle uso
  a esos dos campos en vez de construir un sistema paralelo desde cero.

### Por qué no es una tarea chica

Lo que la spec original no menciona explícitamente pero implica: cuotas de almacenamiento/generación por
tenant (no existe ningún mecanismo de límites por tenant hoy), internacionalización (la app es 100%
español hoy, sin ninguna capa de i18n), y un motor de generación de PDF con plantillas editables — cada
uno de esos tres es, por sí solo, un esfuerzo comparable a una fase completa ya cerrada de este proyecto
(ej. Fase 2 multi-industria completa). No es una extensión incremental de una página existente.

### Pregunta abierta para cuando se retome

¿Es esto una feature de Volumetrix (ej. consentimientos/contratos para veterinaria o clínica médica,
resolviendo el gap real de `configCamposPersonalizados`/`datos_adicionales`), o es una idea de producto
separada? La respuesta cambia si esto merece su propio tenant/tier o si es un módulo más del SaaS actual.

---

## 📌 Resumen Ejecutivo
Ambas ideas confirman que la inversión en arquitectura (Multi-tenant, PostgreSQL RLS, Next.js App Router y Drizzle ORM) le otorgan al sistema una **alta flexibilidad y escalabilidad estratégica** con un esfuerzo de adaptación mínimo.
