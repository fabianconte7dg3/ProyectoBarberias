# ✅ WhatsApp — Evolution API (Decisión Oficial)

> **Decisión tomada:** 2026-07-17  
> **Estado:** ✅ Confirmado para MVP  
> **Estrategia:** Evolution API (MVP) → Meta Cloud API (producción a escala)

---

## 1. Decisión y Justificación

Para el MVP y la fase piloto del SaaS, se utilizará **Evolution API** como motor de automatización de WhatsApp. Esta decisión se basa en:

- **Costo cero** de operación (se autoaloja en el mismo VPS de Hetzner).
- **Compatible con Node.js/NestJS** mediante webhooks y API REST.
- **Ampliamente utilizado** en SaaS de Latinoamérica para flujos similares (bots de reservas, recordatorios automáticos).
- **Riesgo manejable** en la fase piloto si se siguen las reglas de uso seguro.
- Permite validar el producto y generar ingresos antes de incurrir en costos de la API oficial de Meta.

---

## 2. Comparativa de Opciones

| Criterio | Evolution API | Meta Cloud API (Oficial) | Baileys directo |
|----------|--------------|--------------------------|----------------|
| Costo | ✅ Gratis | ⚠️ Pago por conversación | ✅ Gratis |
| Riesgo de ban | ⚠️ Bajo si se usa correctamente | ✅ Sin riesgo | 🔴 Alto |
| Soporte Node.js | ✅ Sí | ✅ Sí | ✅ Sí |
| Velocidad de integración | ✅ Rápido | ⚠️ Requiere aprobación Meta | ✅ Rápido |
| Recomendado para MVP | ✅ Sí | ❌ No (costo y burocracia) | ❌ No |
| Recomendado a escala | ⚠️ Con estrategia | ✅ Sí | ❌ No |

---

## 3. Reglas de Uso Seguro (Obligatorias)

Para minimizar el riesgo de que Meta bloquee el número de WhatsApp vinculado:

- ✅ **Solo mensajes esperados**: Confirmaciones, recordatorios de citas ya agendadas, notificaciones de pago. Nunca publicidad no solicitada.
- ✅ **1 número de WhatsApp por barbería (tenant)**: Cada local conecta su propio número de negocio, no un número compartido del SaaS.
- ✅ **El cliente siempre escribe primero**: El flujo comienza cuando el cliente contacta al local. El bot responde dentro de la ventana de 24h.
- ✅ **Mensajes con contexto claro**: El bot se identifica como asistente virtual del local, no como persona real.
- ❌ **Prohibido**: Envíos masivos de promociones, mensajes a números que nunca interactuaron con el negocio.

---

## 4. Arquitectura de Integración

### Despliegue en Infraestructura

```
Hetzner VPS
├── NestJS Backend (puerto 3000)
├── PostgreSQL (puerto 5432)
├── Redis (puerto 6379)
└── Evolution API (puerto 8080)
    ├── Instancia: Barbería A (+507-XXXX-XXXX)
    ├── Instancia: Barbería B (+507-XXXX-XXXX)
    └── Instancia: Barbería N...
```

Evolution API corre en el mismo VPS, cada barbería conecta su número como una instancia independiente.

### Módulo NestJS: `WhatsappModule`

```
WhatsappModule/
├── whatsapp.service.ts       → Enviar mensajes, crear instancias por tenant
├── whatsapp.webhook.ts       → Recibir mensajes entrantes de clientes
├── whatsapp.bot.service.ts   → Lógica del bot (respuestas automáticas, flujos)
└── whatsapp.queue.ts         → Cola BullMQ para recordatorios programados
```

### Flujos automatizados implementados

| Flujo | Trigger | Mensaje |
|-------|---------|---------|
| **Confirmación de reserva** | Cliente completa el agendamiento | "¡Tu cita está confirmada! Te esperamos el [fecha] a las [hora] con [barbero]." |
| **Recordatorio 24h antes** | Cron Job vía BullMQ | "Hola [nombre], te recordamos tu cita mañana a las [hora]. ¿No puedes asistir? Reprograma aquí: [link]" |
| **Notificación de pago** | Barbero confirma cobro | "Tu pago de $[monto] fue registrado. ¡Gracias por visitarnos!" |
| **Enlace de reserva** | Cliente escribe "cita", "reserva" o similar | Bot detecta palabra clave → envía link personalizado del local |
| **Alerta de walk-in tarde** | Cliente llega fuera de ventana de tolerancia | "Tu cita expiró por el límite de tiempo. Puedes reagendar aquí: [link]" |
| **Recordatorio de deuda** | Estado cuenta = 'deuda' | Envío automático cada 12h hasta liquidar |
| **Cierre de emergencia** | Admin presiona botón de emergencia | Mensaje masivo a todos los clientes del día cancelando citas |

### Webhook entrante (cliente escribe al local)

```
Cliente escribe a WhatsApp del local
        ↓
Evolution API detecta mensaje entrante
        ↓
Envía Webhook → POST /whatsapp/webhook (NestJS)
        ↓
WhatsappBotService analiza el mensaje:
  ├── ¿Contiene "cita", "reserva", "hora"? → Envía link de agendamiento
  ├── ¿Contiene "cancelar", "reprogramar"? → Envía link de gestión de cita activa
  ├── ¿Es audio/sticker/imagen?            → Fallback: "Soy un asistente virtual, toca el enlace..."
  └── ¿No reconoce?                        → Menú de opciones del local
```

---

## 5. Estrategia de Migración a Meta Cloud API (Futuro)

Cuando el SaaS supere los **300–500 clientes activos** o cuando los ingresos lo justifiquen, se migrará a la API oficial de Meta:

- Los webhooks y la lógica del bot permanecen **idénticos** (mismo código en `WhatsappModule`).
- Solo cambia el proveedor en `whatsapp.service.ts` (de Evolution API a Meta Cloud API).
- Las plantillas de mensajes deben pre-aprobarse en Meta Business Manager.
- El costo por conversación de negocio se absorbe fácilmente con los ingresos del plan Premium.

> La arquitectura modular de NestJS permite esta migración sin reescribir el producto.

---

## 6. Próximos Pasos

- [ ] Instalar Evolution API en el VPS de Hetzner junto con Docker.
- [ ] Crear el `WhatsappModule` en NestJS con sus 4 componentes.
- [ ] Configurar BullMQ + Redis para la cola de recordatorios.
- [ ] Conectar el número de WhatsApp de la barbería piloto #1.
- [ ] Probar los 6 flujos automatizados antes del lanzamiento piloto.
