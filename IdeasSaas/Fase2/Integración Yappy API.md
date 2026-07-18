# ✅ Integración Yappy — API Oficial de Banco General

> **Validado el:** 2026-07-17  
> **Fuente oficial:** [yappy.com.pa/comercial/desarrolladores](https://www.yappy.com.pa/comercial/desarrolladores/)  
> **Estado:** ✅ API pública disponible — Riesgo técnico ELIMINADO

---

## 1. Confirmación de Viabilidad

Yappy (Banco General) **sí cuenta con una API oficial para desarrolladores**, denominada **Botón de Pago Yappy**. Esto confirma que la integración de pagos con Yappy en nuestro SaaS es técnicamente viable y no depende de métodos no oficiales ni de terceros no autorizados.

> **Impacto en el proyecto:** El diferenciador competitivo #1 del MVP (cobro anti-ausencias con Yappy) queda validado técnicamente.

---

## 2. Opciones de Integración Disponibles

### Opción A: Integración por API con Desarrollo Propio ⭐ (Nuestra elección)

La nueva integración del **Botón de Pago Yappy** permite cobrar a través de **APIs REST** con desarrollo propio.

- **Lenguajes soportados oficialmente:**
  - ✅ **Node.js** ← Compatible con nuestro stack (NestJS)
  - PHP
  - .NET

- **Flujo general:**
  1. El backend (NestJS) hace una llamada a la API de Yappy con el monto de la cita.
  2. Yappy devuelve un enlace o QR de pago.
  3. El cliente escanea o toca el enlace → se abre Banco General → paga.
  4. Yappy notifica al backend via **webhook** que el pago fue confirmado.
  5. El backend actualiza la cita a `completada` y emite la factura DGI.

- **Documentación técnica oficial:** Disponible en el portal de desarrolladores de Yappy.

### Opción B: Integración via Tilopay (Sin código)

Para plataformas como Shopify, Wix, WooCommerce, Magento y Vtex. **No aplica para nuestro caso** (SaaS con backend propio), pero es útil si en el futuro se construyen integraciones con e-commerce de clientes.

---

## 3. Versión Legacy — Advertencia Importante

> ⚠️ **La versión antigua del Botón de Pago Yappy está siendo descontinuada** y "pronto dejará de funcionar".

**Acción requerida:** Usar exclusivamente la **nueva integración** documentada en el portal. Nunca implementar la versión legacy.

---

## 4. Contacto Oficial para Desarrolladores

Para solicitar credenciales de acceso (sandbox/producción), consultas técnicas o soporte durante la integración:

- **Email:** botondepagoyappy@bgeneral.com
- **Recurso:** Webinars y tutoriales disponibles en el portal de Yappy.

**Acción inmediata recomendada:** Escribir a este correo solicitando:
1. Acceso al entorno de **Sandbox** (pruebas).
2. Credenciales de API (API Key / Client ID).
3. Documentación del webhook de confirmación de pago.

---

## 5. Impacto en la Arquitectura del SaaS

### Flujo técnico actualizado (Backend — NestJS)

```
[Barbero presiona "Cobrar con Yappy" en PWA]
        ↓
[NestJS llama a Yappy API → POST /payment]
        ↓
[Yappy responde con: URL de pago / QR]
        ↓
[PWA muestra QR al cliente en la silla]
        ↓
[Cliente abre Banco General → paga]
        ↓
[Yappy envía Webhook al backend → POST /yappy/webhook]
        ↓
[NestJS valida la firma del webhook]
        ↓
[Backend actualiza cita a "completada" en PostgreSQL]
[Calcula comisión del barbero]
[Llama a GuruSoft/Alegra → emite factura DGI]
[Agenda se libera en tiempo real via WebSocket]
```

### Módulo NestJS a crear: `YappyModule`

Responsabilidades:
- `YappyService`: Llamadas a la API de Yappy (crear pago, consultar estado).
- `YappyWebhookController`: Recibir y validar las notificaciones de pago entrantes.
- `YappyConciliationService`: Módulo de auditoría (caso de error #1 documentado).

### Tabla de base de datos actualizada

En la tabla `transacciones`, el campo `metodo_pago = 'yappy'` registrará adicionalmente:

| Campo nuevo | Tipo | Descripción |
|------------|------|-------------|
| `yappy_transaction_id` | String | ID único devuelto por la API de Yappy para trazabilidad |
| `yappy_webhook_received_at` | Timestamptz | Fecha/hora en que se recibió la confirmación oficial |
| `yappy_webhook_payload` | JSONB | Payload raw del webhook (para auditoría y conciliación) |

---

## 6. Consideraciones de Seguridad para el Webhook

Para evitar que actores maliciosos envíen webhooks falsos simulando pagos confirmados:

- **Verificar la firma criptográfica** del webhook (header de autenticación que provee Yappy).
- **Validar el monto recibido** en el webhook contra el monto esperado en la cita.
- **Registrar la IP de origen** del webhook y comparar contra rangos autorizados de Banco General.
- **Idempotency Keys**: Si el webhook llega duplicado, no procesar el cobro dos veces (ya documentado como caso de error #12).

---

## 7. Próximos Pasos

- [ ] Escribir a `botondepagoyappy@bgeneral.com` solicitando acceso al sandbox.
- [ ] Leer la documentación técnica oficial de la nueva API.
- [ ] Diseñar el `YappyModule` en NestJS con sus tres servicios.
- [ ] Agregar los campos `yappy_*` a la migración de la tabla `transacciones`.
- [ ] Probar el flujo completo de pago en sandbox antes del MVP.
- [ ] Documentar el proceso de validación del webhook.
