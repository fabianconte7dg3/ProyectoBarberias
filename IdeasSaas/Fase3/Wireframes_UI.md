# Wireframes y Diseño UI (Fase 3)

Este documento contiene los mockups visuales de las 9 pantallas principales de la aplicación BarberOS, diseñados con un enfoque *mobile-first*, tema oscuro (premium) y acentos en color ámbar/dorado.

## Flujo del Barbero

Estas son las pantallas que el barbero utilizará en su día a día.

````carousel
![1. Login del Barbero (PIN / FaceID)](/home/fabianc/.gemini/antigravity-cli/brain/a9603467-8705-4d9e-9a2f-693eee81f026/wireframe_1_login_barbero_1784346243964.jpg)
<!-- slide -->
![2. Agenda Diaria](/home/fabianc/.gemini/antigravity-cli/brain/a9603467-8705-4d9e-9a2f-693eee81f026/wireframe_2_agenda_barbero_1784346249142.jpg)
<!-- slide -->
![3. Checkout y Cobro](/home/fabianc/.gemini/antigravity-cli/brain/a9603467-8705-4d9e-9a2f-693eee81f026/wireframe_3_checkout_barbero_1784346255397.jpg)
````

## Flujo del Cliente (Reserva Web)

Pantallas de la PWA/Web que verá el cliente al entrar al enlace de WhatsApp o Instagram de la barbería.

````carousel
![4. Selección de Servicio y Barbero](/home/fabianc/.gemini/antigravity-cli/brain/a9603467-8705-4d9e-9a2f-693eee81f026/wireframe_4_seleccion_cliente_1784346363277.jpg)
<!-- slide -->
![5. Calendario Inteligente](/home/fabianc/.gemini/antigravity-cli/brain/a9603467-8705-4d9e-9a2f-693eee81f026/wireframe_5_calendario_cliente_1784346368969.jpg)
<!-- slide -->
![6. Confirmación de Reserva](/home/fabianc/.gemini/antigravity-cli/brain/a9603467-8705-4d9e-9a2f-693eee81f026/wireframe_6_confirmacion_cliente_1784346373571.jpg)
````

## Flujo del Administrador / Dueño

Pantallas exclusivas para el dueño del local para control de métricas y configuraciones.

````carousel
![7. Dashboard y Resumen Diario](/home/fabianc/.gemini/antigravity-cli/brain/a9603467-8705-4d9e-9a2f-693eee81f026/wireframe_7_dashboard_admin_1784346393564.jpg)
<!-- slide -->
![8. Cierre Ciego de Caja](/home/fabianc/.gemini/antigravity-cli/brain/a9603467-8705-4d9e-9a2f-693eee81f026/wireframe_8_cierre_caja_1784346400562.jpg)
<!-- slide -->
![9. Configuración del Local](/home/fabianc/.gemini/antigravity-cli/brain/a9603467-8705-4d9e-9a2f-693eee81f026/wireframe_9_configuracion_1784346406321.jpg)
````

## Notas de Diseño (Para el desarrollo en Next.js)

1. **Paleta de Colores:** Fondo `#0D0D0D`, Superficies `#1A1A1A`, Acento primario Ámbar/Dorado, Textos Blancos/Gris claro. Estados: Verde (Éxito/Cobrado/Yappy), Rojo (Cancelado/Deuda), Azul (En curso).
2. **Tipografía:** Moderna, sin serifas (ej. Inter o Roboto). Pesos gruesos para precios y nombres.
3. **Botones:** Grandes, con bordes redondeados (Radius 12px a 16px), fáciles de tocar con una mano ("Thumb zone").
4. **Interacciones:** Scroll horizontal para selección (días, servicios). Layouts limpios sin "Lorem Ipsum".
