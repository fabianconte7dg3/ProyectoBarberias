# 🚀 Roadmap del Frontend: BarberOS

Este documento establece la estrategia y el orden de desarrollo para las interfaces gráficas del SaaS BarberOS (Construido como PWA usando React.js + Next.js).

## Punto de Partida Estratégico

El desarrollo del frontend se divide en dos grandes aplicaciones web. A continuación se presentan las ventajas y desventajas de comenzar por cada una, para definir el orden óptimo de construcción.

### El Stack Tecnológico y sus Limitaciones Conscientes

1. **Next.js (App Router) + React.js:** Renderizado rápido y enrutamiento estructurado. Presupuestamos curva de aprendizaje en Client vs Server Components.
2. **PWA (Progressive Web App):** Estrategia maestra para "Cero Fricción". 
   - *Trade-off (iOS):* Notificaciones push solo funcionan desde iOS 16.4+ y si la app se añade a inicio. Safari puede limpiar sesiones tras ~7 días de inactividad (requiriendo re-logins).
   - *Fallback:* Usaremos notificaciones vía WhatsApp (ya integrado) como respaldo primario.
3. **Tailwind CSS + Theming Multi-Tenant:** Capa de theming dinámico construida inyectando variables CSS (custom properties) desde la DB para pintar la app según el tenant, sin reescribir hojas de estilo.
4. **TypeScript (End-to-End Real):** Uso de `@nestjs/swagger` y `openapi-typescript` para compartir DTOs reales entre NestJS y Next.js.
5. **shadcn/ui + Lucide Icons:** Componentes base que son de nuestra propiedad (se copian al código fuente, no npm).
6. **TanStack Query (React Query):** Fundamental desde el Día 1 para manejo de estado de servidor (cache, refetch, invalidación de citas).
7. **Zod:** Para validación compartida entre frontend (formularios) y backend (DTOs).
8. **Testing:** Vitest + Testing Library para flujos críticos (agendar, cancelar, login).

### Opción 1: Empezar por el Portal de Reservas (App del Cliente)
Es la página donde la persona entra desde su celular a elegir el corte, el barbero y la hora.

**🟢 Ventajas:**
* **El "Efecto WOW" rápido:** Es la cara pública del producto y el principal argumento de venta. Ver esto funcionando primero da mucha motivación porque "ya se ve real".
* **Desarrollo más rápido:** Es un flujo muy corto (3 pantallas). Rápidamente tendremos algo tangible que se puede mostrar en el celular a posibles inversores o barberos de prueba.
* **Valida el flujo principal:** Garantiza que la experiencia hiper-rápida ("Cero Fricción") sea perfecta desde el día 1.

**🔴 Desventajas:**
* **Datos manuales:** Al no existir todavía el panel para que el dueño agregue a sus barberos o configure sus horarios, se tendrá que inyectar "datos falsos o de prueba" directamente en la base de datos para que el portal tenga qué mostrar durante el desarrollo.

### Opción 2: Empezar por el Dashboard Administrativo (App de los Barberos)
Es el panel donde la recepción o el dueño configuran el local, ven la agenda y hacen el cierre de caja.

**🟢 Ventajas:**
* **Orden lógico y Fundacional:** Es el camino natural. Primero construyes la herramienta para que el dueño cree su local, añada a sus barberos y fije sus precios. Luego, esos datos reales alimentan el Portal de Reservas.
* **Operación completa:** Valida la lógica de negocio pesada (el cierre ciego de caja, los cálculos de comisiones) desde el principio.

**🔴 Desventajas:**
* **Tarda más en ser "mostrable":** Es un panel interno lleno de tablas, gráficos y formularios de configuración. No es tan "comercial" para mostrar en las primeras etapas.
* **Flujo incompleto:** Se podrá configurar el local, pero habrá que simular las reservas entrantes hasta que se construya el portal del cliente.

### 🏆 Recomendación Estratégica Adoptada
**Se prioriza comenzar por el Portal de Reservas (Opción 1).** Construir primero lo que enamora al usuario final garantiza que el núcleo comercial (la conversión de clientes vía WhatsApp) sea un éxito. El panel administrativo se construirá inmediatamente después.

---

## Hitos de Desarrollo del Frontend

### Hito 1: Inicialización del Monorepo / Proyecto Frontend
- Crear la estructura de la PWA con Next.js.
- Configurar TailwindCSS para el manejo rápido y dinámico de estilos.
- Configurar el sistema de paleta de colores multi-tenant (Marca Blanca) heredable desde base de datos/configuración.
- Establecer la tipografía (Inter o Roboto).

### Hito 2: MVP del Portal de Reservas (Cliente)
Enfocado 100% en conversión rápida desde el móvil.
- **Pantalla 1:** Selección de Servicio y Barbero (Lista limpia y visual).
- **Pantalla 2:** Calendario Inteligente (Muestra horas reales consultando la API de NestJS).
- **Pantalla 3:** Formulario Express y Confirmación (Nombre y WhatsApp).

### Hito 3: Panel Administrativo y Operativo (Barberos y Dueño)
La consola de control de la barbería.
- **Pantalla 1:** Login seguro (Teclado numérico gigante / PIN).
- **Pantalla 2:** Agenda Diaria / Línea de tiempo y botones rápidos ("Pausar", "Walk-in").
- **Pantalla 3:** Checkout (Cobro) integrando botones de Yappy y Efectivo.

### Hito 4: Backoffice y Cierres (Dueño / Recepción)
- **Pantalla 1:** Dashboard de Métricas (Ingresos, Ausencias, Gráficos por Barbero).
- **Pantalla 2:** Cierre Ciego de Caja (Formulario de arqueo ciego).
- **Pantalla 3:** Configuración del Local (Gestión de barberos, comisiones y reglas de negocio).

### Hito Extra (Post-Lanzamiento): Consola "Super Admin" (Propietario del SaaS)
- Para arrancar ágilmente, la administración de los tenants se manejará inicialmente a través de una conexión directa a la base de datos o herramientas No-Code (ej. Retool). 
- En una fase posterior, se construirá un panel nativo que consuma la API central para gestionar suspensiones (`suspendido_pago`), Kill-Switches y métricas de MRR.
