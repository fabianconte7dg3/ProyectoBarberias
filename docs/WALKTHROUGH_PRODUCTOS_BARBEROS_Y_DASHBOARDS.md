# 🚀 Documentación Técnica de Avances — BarberOS

Documentación integral de las nuevas características de analítica ejecutiva, gestión de vacaciones/ausencias del staff, comisiones duplas, inventario retail y auditoría técnica inmutable.

---

## 🛠️ Módulos e Implementaciones Completadas

### 1. 📇 Módulo Dedicado de Gestión de Barberos & Staff (`/admin/barberos`)
- **Gestión Integral de Staff**: Vista tipo tarjeta con avatares, roles (`barbero` o `recepcion`), correo y estado de acceso (`Activo (Con PIN)` vs `Pendiente de PIN`).
- **Edición en Vivo de Comisiones**:
  - `% Servicios` (Cortes y tratamientos).
  - `% Productos Retail` (Ventas de mostrador de productos).
- **Acceso Directo a Horarios & Vacaciones**: Botón ⏰ **[Horarios & Vacaciones]** en la tarjeta para ajustar turnos semanales o bloquear días por ausencias/licencias.
- **Modal de Invitación (`InviteBarberoModal.tsx`)**: Formulario para crear invitaciones vía `POST /usuarios/invite` con botón **"Copiar Enlace de Activación"** para que el barbero cree su PIN seguro de 4 dígitos.

### 2. 📈 Gráficos Financieros Interactivos con Recharts (`/admin/dashboard`)
Se instaló `recharts` en el frontend y se agregaron dos gráficos interactivos de alto impacto visual en el **Resumen Financiero**:
- **Evolución de Recaudación Diaria (AreaChart)**: Muestra la curva continua de ingresos día a día en el período seleccionado, permitiendo identificar picos de demanda.
- **Distribución de Métodos de Pago (Donut/Pie Chart)**: Muestra la proporción porcentual de facturación ingresada en **Efectivo**, **Yappy** y **Tarjeta/Mixto**.

### 3. 🗂️ Sub-Dashboards Modulares por Pestañas
Para evitar recargar la pantalla en una sola lista larga, la interfaz de analítica (`/admin/dashboard`) se estructuró en **4 Pestañas Navegables**:
1. 📊 **Finanzas & Recaudación**: Ingresos totales, gráficos de área y donut, ticket promedio.
2. ✂️ **Servicios & Productos**: Ranking de servicios más solicitados + ranking de productos retail más vendidos.
3. 🏆 **Rendimiento de Staff**: Tabla de cálculo neto de comisiones por barbero (Servicios y Productos) y propinas.
4. ⚠️ **Riesgo CRM & Inventario**: Control de clientes con ausencias/strikes y alertas de inventario bajo.

### 4. 🌴 Historial de Ausencias, Vacaciones y Licencias del Staff (`/admin/configuracion`)
- **Backend Endpoint**: `GET /horarios/bloqueos-historial` (protegido por `@Roles('admin', 'recepcion')`).
- **Vista de Trazabilidad**: Muestra una tabla histórica en la pantalla de Configuración con todas las vacaciones, permisos personales o emergencias otorgados al personal.
- **Estados Automáticos**:
  - `[PROGRAMADO]`: Permisos con fecha de inicio futura.
  - `[EN CURSO]`: Permisos activos en la fecha actual.
  - `[PASADO]`: Permisos concluidos históricamente.

### 5. 📦 Venta de Productos Retail & Control de Inventario Atómico
- **Tabla `productos` & `detalles_transaccion`**: Catálogo de productos con `stockActual`, `stockMinimo`, `precioVenta` y `costoCompra`.
- **Descuento Atómico de Stock**: SQL `UPDATE productos SET stock_actual = stock_actual - $cantidad WHERE id = $id AND stock_actual >= $cantidad`.
- **Idempotencia en Transacciones**: Columna `idempotencyKey` UNIQUE en `transacciones` para evitar cobros o descuentos de stock duplicados en re-intentos de red.
- **Venta de Mostrador & Cobro Mixto**: Soporte para cobros de citas con productos adicionales y ventas directas sin cita vía `POST /transacciones/mostrador`.

### 6. 📜 Auditoría Inmutable de Seguridad Legible (`GET /audit`)
- Endpoint `GET /audit` expuesto para administradores.
- Muestra una tabla con el registro cronológico de acciones (`cambio_comision`, `kill_switch`, `cierre_caja`, etc.), incluyendo el usuario que la ejecutó, IP de origen y el estado del registro antes y después (`payloadAntes` vs `payloadDespues`).

---

## 🧪 Verificación y Estado del Repositorio

- **NestJS API (`apps/api`)**: Compilado y ejecutándose (0 advertencias/errores).
- **Next.js Web App (`apps/web`)**: Compilado y verificado con `next build` (0 errores).
- **Control de Versiones**: Todos los cambios pusheados a la rama principal de GitHub (`master`).
