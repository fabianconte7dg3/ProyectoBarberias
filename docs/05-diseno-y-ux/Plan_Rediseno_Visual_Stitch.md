> **🔶 Priorizado (2026-07-26), ejecución no iniciada.** Este documento registra un sistema de diseño y
> PRD nuevos que el usuario compartió (vía MCP `stitch` de Google + un export estático local), **no
> implementados todavía en código**. No reemplaza a [`Pantallas_Figma.md`](./Pantallas_Figma.md) (que
> documenta las 9 pantallas del MVP ya construidas) — lo complementa como la siguiente iteración visual/de
> producto. El desglose ejecutable de tareas vive en
> [`docs/plan.md` Fase 6](../plan.md#fase-6--rediseño-visual-volumetrix-google-stitch--impersonation-y-mi-silla-pendiente);
> este documento es el análisis de fondo que sustenta esas decisiones (ver §6 para el resumen de qué se
> decidió y por qué).

## 1. Fuente de este material

- **MCP `stitch`**: conectado el 2026-07-26 (`claude mcp add stitch --transport http ...` →
  `https://stitch.googleapis.com/mcp`, scope local). Es Google Stitch, la herramienta de generación de UI
  con IA — ahí vive el proyecto de diseño completo de Volumetrix. Sus tools no estaban cargadas en la
  sesión donde se escribió este doc; para volver a explorarlo interactivamente hay que invocarlas desde
  una sesión donde el MCP esté activo.
- **Export estático local**:
  `/home/fabianc/Documentos/volumetris desing/stitch_volumetrix_multi_industry_saas_platform/` — **fuera
  del repositorio** (no es un subdirectorio de `ProyectoBarberias/`, no está versionado en git). Contiene
  24 pantallas, cada una como `<nombre>/code.html` (HTML+Tailwind autocontenido) + `<nombre>/screen.png`
  (captura), más 2 archivos `DESIGN.md` (sistemas de diseño, ver §2) y 5 logos (`logo_full_dark.png`,
  `logo_full_light.png`, `logo_short*.png`).
- **PRD/Design Brief**: texto pegado por el usuario en el chat el 2026-07-26 ("Volumetrix: Multi-Industry
  SaaS Platform PRD & Design Brief"), resumido en §3.

Si se quiere conservar este material a largo plazo, hay que copiarlo explícitamente dentro del repo (por
ejemplo `docs/05-diseno-y-ux/stitch-export/`) — hoy vive en una ruta de usuario que no viaja con el repo.

## 2. Dos sistemas de diseño (no uno)

El export trae **dos** `DESIGN.md` distintos, para dos audiencias distintas — esto es una decisión de
diseño real, no una duplicación accidental:

| | **Volumetrix Design System** | **Volumetrix Executive System** |
|---|---|---|
| Para | Booking público + admin de tenant | Super Admin (operador de la plataforma) |
| Paleta primaria | Hyper-Pink `#b0004a` / Cyan-Teal `#006876` sobre fondo claro `#f3faff` | Deep Navy `#091426`/`#1e293b` + Pink `#b7004d` sobre fondo neutro `#fbf8fa` |
| Personalidad | Profesional, moderno, cercano (comercio de servicios) | Autoritativo, analítico, alta densidad de datos |
| Tipografía | Inter, escala hasta `display-lg` 48px | Inter, escala hasta `display` 36px, `tabular-nums` para métricas |
| Grid | Fluid (admin) / Fixed 1200px (booking) | 12 columnas, sidebar 260px/64px colapsado |

Ambos comparten: tipografía Inter exclusiva, radio de esquina 4px (estándar) / 8px (contenedores grandes),
grid base de 4px, dark mode con navy `#0f172a`/`#121212` en vez de negro puro, y **CSS variables
`--tenant-primary`/`--tenant-secondary`** para white-labeling por tenant.

### Frente al estado actual del código

`apps/web/src/app/globals.css` hoy define un theme **shadcn neutral** (grises `oklch`, sin rosa/navy de
marca como tokens) más una única CSS var `--primary` que `[tenantSlug]/layout.tsx` sobreescribe con
`colorPrimario` del tenant (ver `CLAUDE.md` §"Frontend: server-resolved tenant data"). No existe hoy una
paleta de marca Volumetrix fija ni la separación Design System (tenant) / Executive System (Super Admin)
— ambas superficies comparten el mismo theme neutro. Glassmorphism (`backdrop-blur`) ya se usa en varios
modales de admin (`CobrarCitaModal`, `AdminHeader`, `InviteEmpleadoModal`, etc.) y en los logins de
Super Admin — hay solapamiento parcial de lenguaje visual, no es un punto de partida en cero.

## 3. Resumen del PRD compartido

Arquitectura: Super Admin (global) → Tenant Owner/Admin → Staff (PIN de 4 dígitos) → Clientes públicos.
Módulos unificados: Booking/Agenda, POS/Financiero, Inventario, Perfiles de cliente con historial técnico.

Puntos del PRD que son **features de negocio nuevas**, no solo skin visual — ver §5 para el detalle de
cada una:
- **Multi-Branch Support**: selector de sucursal en el login unificado.
- **Super Admin → Support & Impersonation**: "Login as Tenant" para soporte técnico.
- **Landing page** con visuales Three.js/WebGL de alta gama.
- Login "Premium v2.0" con transiciones multi-estado y glassmorphism.

## 4. Inventario de las 24 pantallas exportadas → mapeo a rutas reales

| Pantalla (export Stitch) | Ruta/componente real hoy | Estado |
|---|---|---|
| `login_unificado_premium_v2.0` | `[tenantSlug]/admin/login` | Existe, visual distinto, sin selector de sucursal |
| `login_unificado_acceso_staff_y_admin` | `[tenantSlug]/admin/login` (variante) | Existe, visual distinto |
| `super_admin_login` | `super-admin/login` | Existe, visual distinto |
| `super_admin_dashboard_global` | `super-admin/page.tsx` | Existe, visual distinto |
| `super_admin_listado_de_tenants` | `super-admin/tenants` | Existe, visual distinto |
| `super_admin_detalle_del_tenant` | `super-admin/tenants/[id]` | Existe, visual distinto |
| `dashboard_de_administrador_m_tricas_hoy` | `admin/dashboard` | Existe, visual distinto |
| `dashboard_del_barbero_mi_silla` | — | **No existe.** Hoy el staff no-admin usa la misma agenda que el admin (con permisos), no una vista diaria dedicada. Lo más cercano es `MiDesempenoModal` (un modal de métricas personales, no una pantalla) |
| `agenda_vista_de_calendario_veterinaria` | `admin/agenda` | Existe, variante visual por industria no aplicada |
| `caja_pos_cobro_con_yappy` | `admin/caja` + `CobrarCitaModal` | Existe, visual distinto |
| `cat_logo_de_servicios_y_portafolio` | dentro de `admin/configuracion` | Existe como sección, no pantalla dedicada |
| `configuraci_n_del_negocio_personalizaci_n_del_tenant` | `admin/configuracion` | Existe, visual distinto |
| `finanzas_y_reportes_panel_de_control_financiero` | `admin/datos` | Existe (otro nombre de ruta), visual distinto |
| `gesti_n_de_empleados_y_comisiones` | `admin/empleados` | Existe, visual distinto |
| `gesti_n_de_inventario_cat_logo_y_stock` | `admin/productos` | Existe (otro nombre de ruta), visual distinto |
| `gesti_n_de_sucursales_vista_multi_sede` | — | **No existe.** No hay tabla `sucursales` ni ningún concepto de sede en `schema.ts` — ver §5 |
| `historial_cl_nico_t_cnico_del_cliente` | `pacientes`/`notas_clinicas` (backend) + `admin/clientes` (UI parcial) | Backend completo (Fase 2.1), UI como modal dentro del perfil de cliente, no pantalla dedicada de historial |
| `perfil_del_cliente_admin` | dentro de `admin/clientes` | Existe como modal, no pantalla dedicada |
| `perfil_de_usuario_administraci_n_de_cuenta` | — | **No existe.** Hoy solo el admin edita datos de un empleado (`admin/empleados`); no hay autogestión de la propia cuenta |
| `booking_p_blico_reserva_de_citas` | `[tenantSlug]/reservar` | Existe, visual distinto |
| `booking_p_blico_selecci_n_de_profesional` | `reservar` (paso del wizard) | Existe, visual distinto |
| `booking_p_blico_selecci_n_de_fecha_y_hora` | `reservar` (paso del wizard, `TimeSlotGrid`) | Existe, visual distinto |
| `booking_p_blico_formulario_de_cliente_veterinaria` | `reservar/confirmar` | Existe genérico (campos por industria vía `notas`), no un formulario dedicado veterinaria |
| `three.js` | — | **No existe.** `apps/web/src/app/page.tsx` sigue siendo el boilerplate de `create-next-app` (logo de Next.js, texto "To get started, edit the page.tsx file") — no hay landing page real todavía |

## 5. Features de negocio nuevas detectadas (requieren diseño de esquema, no solo UI)

1. **Multi-sucursal (branches).** El PRD menciona selector de sucursal en el login y una pantalla
   dedicada de gestión. Hoy `barberias` (el tenant) es la unidad más granular — no existe el concepto de
   "sede" dentro de un tenant. Implementarlo real (no solo la pantalla) implica: tabla `sucursales` nueva,
   FK opcional en `usuarios`/`citas`/`horarios` a una sucursal, decidir si el booking público filtra por
   sede o el tenant sigue siendo la unidad de reserva. Esto es un cambio de modelo de datos, no un ajuste
   de CSS — necesita su propio plan (mismo criterio que Fase 2.1-2.4 de multi-industria).
2. **Impersonation de Super Admin ("Login as Tenant").** Hoy no existe ningún mecanismo para que
   Super Admin opere dentro de un tenant. Implementarlo con seguridad real requiere: un JWT de
   impersonación con expiración corta, un registro en el log de auditoría existente
   (`audit_logs`/kill-switch ya documentado en `Consideraciones_Seguridad.md`) cada vez que se usa, y un
   banner visible en toda la UI mientras la sesión está impersonando (para que nunca sea invisible que
   alguien externo está operando la cuenta). No es solo un botón — es una superficie de riesgo de
   seguridad que merece su propio plan de diseño antes de tocar código.
3. **Vista "Mi Silla" para staff no-admin.** Requiere decidir si es una ruta nueva
   (`admin/mi-silla` o similar) con permisos restringidos, o un modo distinto de la agenda existente según
   `rol`.
4. **Perfil de usuario / autogestión de cuenta.** Requiere un endpoint nuevo (`GET/PATCH /usuarios/me` o
   similar) — hoy `usuarios` solo se edita desde el módulo de empleados por un admin.
5. **Landing page con Three.js/WebGL.** Puramente frontend (sin cambios de esquema/backend), pero es
   contenido nuevo de cero — hoy `/` es el placeholder de `create-next-app`.

## 6. Decisiones tomadas con el usuario (2026-07-26)

Este es un rediseño visual completo (24 pantallas, 2 sistemas de diseño) más 4 features de negocio
nuevas. Se resolvieron las 4 preguntas abiertas vía `AskUserQuestion`:

1. **Secuencia: visual primero.** Se repintan las pantallas ya construidas con el nuevo sistema de
   diseño antes de construir features de negocio que requieran esquema nuevo (sucursales, perfil de
   cuenta propia quedan diferidas — ver `docs/plan.md` Fase 5).
2. **Features de negocio a construir ahora: impersonation de Super Admin + vista "Mi Silla".** De las 4
   detectadas en §5, estas dos SÍ entran en esta iniciativa (no requieren esquema nuevo tan grande como
   sucursales, y encajan naturalmente en las superficies que de todas formas se van a repintar). Sucursales
   y perfil de cuenta propia quedan en el backlog de Fase 5.
3. **Alcance visual: reemplazo total del theme.** Los tokens neutros de shadcn en `globals.css` se
   reemplazan por los dos sistemas de Stitch (Design System para `[tenantSlug]/**`, Executive System para
   `super-admin/**`), no una capa encima ni una adopción parcial.
4. **Punto de partida: sin prioridad de superficie fija.** El orden de ejecución lo define la práctica
   técnica, no una superficie de negocio — ver la secuencia en `docs/plan.md` Fase 6 (fundamento de
   tokens → Super Admin, donde se agrega impersonation → panel de tenant, donde se agrega Mi Silla →
   portal público + landing).

## 7. Siguiente paso

El desglose ejecutable (checkboxes por pantalla/sub-fase) vive en
[`docs/plan.md` Fase 6](../plan.md#fase-6--rediseño-visual-volumetrix-google-stitch--impersonation-y-mi-silla-pendiente).
Sigue el flujo normal del proyecto: commits atómicos por sub-fase, `tsc --noEmit` tras cada bloque, smoke
test en navegador antes de cerrar cada pantalla — mismo patrón usado en todas las fases anteriores.
