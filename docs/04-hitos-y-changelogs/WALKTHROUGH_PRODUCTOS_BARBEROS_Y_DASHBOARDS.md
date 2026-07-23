# 🚀 Documentación Técnica de Avances — BarberOS

Documentación integral de las nuevas características de analítica ejecutiva, gráficos interactivos con Recharts, gestión de vacaciones/ausencias del staff, comisiones duplas, inventario retail, auditoría técnica inmutable y el Centro Seguro de Importación/Exportación de Datos.

---

## 🛠️ Módulos e Implementaciones Completadas

### 1. 📈 Gráficos Financieros & Analíticos Avanzados con Recharts (`/admin/dashboard`)
Se instaló `recharts` en el frontend y se implementaron **6 Gráficos Interactivos de Alto Impacto**:

#### A. Pestaña "Finanzas & Recaudación":
- **Evolución de Recaudación Diaria (AreaChart)**: Muestra la curva continua de ingresos día a día en el período seleccionado, permitiendo identificar picos de demanda.
- **Distribución de Métodos de Pago (Donut/Pie Chart)**: Muestra la proporción porcentual de facturación ingresada en **Efectivo**, **Yappy** y **Tarjeta/Mixto**.

#### B. Pestaña "Servicios & Productos":
- **Rotación de Inventario: Ventas vs Stock Restante (BarChart Comparativo)**: Compara visualmente las unidades vendidas en el período contra las unidades físicas disponibles en estantería para cada producto.
- **Distribución de Ingresos Retail (Donut/Pie Chart)**: Muestra el porcentaje de dinero facturado aportado por cada producto de mostrador (*Ceras, Aceites, Shampoo*).

#### C. Pestaña "Rendimiento de Staff":
- **Producción por Barbero: Servicios vs Retail (BarChart Apilado)**: Desglosa visualmente el dinero generado por cada barbero entre servicios de corte/barba y ventas de productos retail.
- **Citas Atendidas por Barbero (BarChart de Volumen)**: Compara la cantidad total de clientes atendidos por cada integrante del equipo.

---

### 2. 📇 Módulo Dedicado de Gestión de Barberos & Staff (`/admin/barberos`)
- **Gestión Integral de Staff**: Vista tipo tarjeta con avatares, roles (`barbero` o `recepcion`), correo y estado de acceso (`Activo (Con PIN)` vs `Pendiente de PIN`).
- **Edición en Vivo de Comisiones**:
  - `% Servicios` (Cortes y tratamientos).
  - `% Productos Retail` (Ventas de mostrador de productos).
- **Acceso Directo a Horarios & Vacaciones**: Botón ⏰ **[Horarios & Vacaciones]** en la tarjeta para ajustar turnos semanales o bloquear días por ausencias/licencias.
- **Modal de Invitación (`InviteBarberoModal.tsx`)**: Formulario para crear invitaciones vía `POST /usuarios/invite` con botón **"Copiar Enlace de Activación"** para que el barbero cree su PIN seguro de 4 dígitos.

---

### 3. 🌴 Historial de Ausencias, Vacaciones y Licencias del Staff (`/admin/configuracion`)
- **Backend Endpoint**: `GET /horarios/bloqueos-historial` (protegido por `@Roles('admin', 'recepcion')`).
- **Vista de Trazabilidad**: Muestra una tabla histórica en la pantalla de Configuración con todas las vacaciones, permisos personales o emergencias otorgados al personal.
- **Estados Automáticos**:
  - `[PROGRAMADO]`: Permisos con fecha de inicio futura.
  - `[EN CURSO]`: Permisos activos en la fecha actual.
  - `[PASADO]`: Permisos concluidos históricamente.

---

### 4. 📦 Venta de Productos Retail & Control de Inventario Atómico
- **Tabla `productos` & `detalles_transaccion`**: Catálogo de productos con `stockActual`, `stockMinimo`, `precioVenta` y `costoCompra`.
- **Descuento Atómico de Stock**: SQL `UPDATE productos SET stock_actual = stock_actual - $cantidad WHERE id = $id AND stock_actual >= $cantidad`.
- **Idempotencia en Transacciones**: Columna `idempotencyKey` UNIQUE en `transacciones` para evitar cobros o descuentos de stock duplicados en re-intentos de red.
- **Venta de Mostrador & Cobro Mixto**: Soporte para cobros de citas con productos adicionales y ventas directas sin cita vía `POST /transacciones/mostrador`.

---

### 5. 📜 Auditoría Inmutable de Seguridad Legible (`GET /audit`)
- Endpoint `GET /audit` expuesto para administradores.
- Muestra una tabla con el registro cronológico de acciones (`cambio_comision`, `kill_switch`, `cierre_caja`, etc.), incluyendo el usuario que la ejecutó, IP de origen y el estado del registro antes y después (`payloadAntes` vs `payloadDespues`).

---

### 6. 📁 Centro Seguro de Importación & Exportación de Datos (`/admin/datos`)
- **Protección Anti-OWASP CSV Injection**: Escapa automáticamente cualquier celda de texto que comience con `=`, `+`, `-`, `@`, `\t` o `\r` anteponiendo una comilla (`'`), evitando inyecciones de código al abrir reportes en Microsoft Excel o Google Sheets.
- **Cumplimiento Ley 81 de Protección de Datos (`clientes.aceptaMarketing`)**:
  - Nueva columna en DB `acepta_marketing: boolean` (default `false`).
  - La exportación de datos con fines comerciales/marketing filtra estrictamente a los clientes con `aceptaMarketing === true`.
- **Importador Masivo con Regla de Merge**:
  - Permite subir archivos CSV/Excel de Clientes y Productos.
  - Si un cliente ya existe por número de WhatsApp, se actualizan únicamente sus datos de contacto sin sobreescribir ni alterar sus métricas históricas del sistema (`totalAsistencias`, `totalGastado`, `ausenciasStrikes`).
  - Límite de seguridad de 5,000 filas por archivo y reporte granular de filas creadas, actualizadas o rechazadas.
- **Exportación de Nómina con Comisión Congelada**:
  - Lee las comisiones históricas congeladas en `detallesTransaccion.comisionAplicada`, garantizando que un cambio en el % de comisión hoy no altere retroactivamente los pagos de meses pasados.
- **Plantillas Descargables**: Botones para descargar plantillas CSV oficiales de muestra para Clientes y Productos.
