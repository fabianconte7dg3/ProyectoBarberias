# Matriz de Permisos, Roles y Estados de Bloqueo

Este documento especifica la matriz de control de acceso (RBAC), estados de suscripción y mecanismos de bloqueo (*kill-switches*) de la plataforma BarberOS.

---

## 1. Métodos de Pago y Cumplimiento Regulatorio

| Método de Pago | Tipo de Procesamiento | Cumplimiento PCI-DSS | Descripción |
|---|---|---|---|
| **Efectivo** | Registro manual en caja | N/A | El cliente paga en efectivo. Registrado por el barbero/recepción. |
| **Yappy (Manual)** | Verificación manual por cliente | N/A | El cliente transfiere por Yappy y muestra el comprobante. |
| **Yappy (Comercial IPN)** | Integración API Banco General | N/A | Webhook cifrado con AES-256-CBC. Sin datos de tarjeta. |
| **Tarjeta** | Registro manual POS | **Inofensivo (No aplica)** | Registro de cobro efectuado en el datáfono físico del local. **BarberOS NUNCA solicita, procesa ni almacena números de tarjeta (PAN/CVV)**. |

---

## 2. Diferenciación de Bloqueos (*Kill-Switches*)

Para evitar confusiones entre desarrolladores, la plataforma distingue dos niveles de bloqueo con severidad y alcances completamente diferentes:

| Campo / Mecanismo | Denominación en Código | Quién lo Controla | Login del Dueño | Login del Staff | Reserva Pública Web | Registro Audit Log |
|---|---|---|---|---|---|---|
| **Pausa de Auto-Servicio** | `killSwitchActivo` (`operacion_pausada`) | Admin de Barbería (Dueño) | **PERMITIDO** | **PERMITIDO** | 🛑 **PAUSADO** (Muestra banner de pausa) | Sí (`kill_switch`) |
| **Bloqueo por Plataforma** | `bloqueadoPorPlataforma` | SuperAdmin SaaS | 🛑 **BLOQUEADO** | 🛑 **BLOQUEADO** | 🛑 **BLOQUEADO** | Sí (`kill_switch_plataforma`) |
| **Estado de Suscripción** | `estado` (`suspendido_pago`) | Sistema / SuperAdmin | **Restringido** (Solo pantalla de pago) | 🛑 **BLOQUEADO** | 🛑 **BLOQUEADO** | Sí (`cambiar_estado_tenant`) |

---

## 3. Matriz de Permisos por Rol (RBAC)

| Módulo / Acción | `superadmin` | `admin` (Dueño) | `recepcion` | `barbero` |
|---|:---:|:---:|:---:|:---:|
| **Consola SuperAdmin (`/super-admin`)** | ✅ Total | ❌ Sin acceso | ❌ Sin acceso | ❌ Sin acceso |
| **Onboarding / Gestión de Tenants** | ✅ Crear/Editar | ❌ Sin acceso | ❌ Sin acceso | ❌ Sin acceso |
| **Ver Agenda Operativa** | N/A | ✅ Todo el equipo | ✅ Todo el equipo | ✅ Todo / Solo sus citas |
| **Crear / Agendar Cita (Walk-in)** | N/A | ✅ | ✅ | ✅ |
| **Cobrar Citas & Venta POS** | N/A | ✅ | ✅ | ✅ |
| **Arqueo de Caja Chica** | N/A | ✅ | ✅ | ❌ Sin acceso |
| **Gestión de Barberos & Comisiones** | N/A | ✅ | ❌ Sin acceso | ❌ Sin acceso |
| **Importación / Exportación (CSV)** | N/A | ✅ | ❌ Sin acceso | ❌ Sin acceso |
| **Ver Reportes de Métricas & LTV** | N/A | ✅ Total | ❌ Sin acceso | 🔒 Solo "Mi Desempeño" |
| **Pausar Operación (Auto-Servicio)** | N/A | ✅ | ❌ Sin acceso | ❌ Sin acceso |

---

## 4. Unicidad de Correos y Autenticación

- **`usuarios.email`**: Posee un `UNIQUE` constraint a nivel **global de toda la tabla**. Esto garantiza que la función `auth_get_user_by_email` resuelva de forma unívoca a un solo usuario sin colisiones entre diferentes barberías.
- **`plataforma_admins.email`**: Vive en una tabla independiente fuera de la arquitectura Multi-tenant, protegida obligatoriamente por 2FA (TOTP cifrado).
