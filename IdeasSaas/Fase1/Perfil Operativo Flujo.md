Aquí tienes el desglose detallado de las funcionalidades por perfil, seguido del flujo operativo actualizado\.

## <a id="_utinomh17dcz"></a>__📱 1\. Funcionalidades del Barbero \(Web App Progresiva\)__

La interfaz del barbero será una PWA táctil, rápida y oscura, diseñada para operarse con el teléfono en la mano\.

- __Gestor de Estados \(Botón de Pausa/Almuerzo\):__ Un botón tipo "Play/Pause"\. Si la barbería está vacía y el barbero quiere adelantar su hora de almuerzo, presiona "Pausar Turno" \(ej\. 45 min\)\. El sistema bloquea automáticamente ese espacio en la web para que ningún cliente reserve en ese lapso\.
- __Checkout Multimétodo:__ Al terminar el corte, el barbero tiene dos grandes botones: __Cobrar con Yappy__ o __Cobrar en Efectivo__\. Si elige Yappy, se genera el QR o enlace; si elige efectivo, el sistema registra el ingreso directo a la caja\.
- __Bloqueo Rápido \(Walk\-ins\):__ Pantalla táctil para bloquear turnos al instante si entra un cliente de la calle\.
- __Historial del Cliente \(Recomendación\):__ Antes de que el cliente se siente, el barbero puede ver una pequeña nota \(ej\. "Corte Fade, usa cera mate, no le gusta charlar mucho"\)\. Esto eleva la calidad del servicio\.
- __Calculadora de Comisiones en Vivo:__ Un panel donde el barbero ve exactamente cuánto ha generado en el día y cuál es su corte neto, calculado bajo el modelo 50/50 o 60/40\.

## <a id="_8kci1n828on0"></a>__💵 Flujo de Cobro: Validación Exacta__

Al terminar el corte, el barbero presiona "Cobrar" y la pantalla le muestra las dos opciones principales de pago\.

### <a id="_gsqto63y0jx6"></a>__Opción A: Pago en Efectivo__

El objetivo es eliminar el cálculo mental rápido y forzar un registro exacto para el cuadre físico\.

- __Pantalla de Cobro:__ El sistema muestra el total del servicio \(ej\. $15\.00\)\.
- __Ingreso del Billete:__ Aparece un teclado numérico táctil donde el barbero digita con cuánto le pagó el cliente \(ej\. $20\.00\)\.
- __Cálculo de Vuelto:__ La pantalla muestra en números grandes "Entregar Cambio: $5\.00"\.
- __Confirmación:__ El barbero presiona "Completado"\. El sistema registra el ingreso directo a la caja y suma el dinero a la cuenta de "Efectivo en Caja"\.

### <a id="_4xue3q6yrjr6"></a>__Opción B: Pago con Yappy \(Doble Verificación\)__

Aunque la plataforma genera el QR o enlace que abre automáticamente la aplicación de Banco General, añadiremos un paso extra de seguridad operativa\.

- __Generación del QR:__ El barbero selecciona Yappy y la pantalla muestra el código QR\.
- __Revisión Visual:__ El cliente escanea, paga y le muestra la pantalla verde de confirmación de Banco General al barbero\.
- __Validación Manual:__ Antes de cerrar la cita, el sistema le exige al barbero digitar el monto exacto que vio en el celular del cliente\.
- __Cruce de Datos:__ Si el barbero digita "$15\.00" y coincide con el total adeudado, el botón de "Confirmar Pago" se enciende en verde y finaliza el proceso\.

## <a id="_c5o4e4h9fn0b"></a>__⚙️ Impacto en el Backend \(Lo que pasa tras bambalinas\)__

Inmediatamente después de que el barbero confirma el pago exacto \(ya sea en efectivo o por Yappy\), ocurre la magia en el backend del SaaS:

1. __Distribución de Ganancias:__ El sistema calcula automáticamente el corte neto del barbero basado en el modelo del local \(50/50 o 60/40\)\.
2. __Facturación Fiscal:__ La plataforma se conecta mediante APIs a un PAC local \(como GuruSoft o Alegra\) y emite la factura electrónica exigida por la DGI\.
3. __Liberación de Agenda:__ El calendario se actualiza en tiempo real, dejando al barbero disponible para su siguiente cliente o habilitando el espacio para walk\-ins\.

__Nota Estratégica:__ Este flujo protege los ingresos del dueño y le da transparencia total al barbero, cumpliendo la meta de crear el sistema operativo central de las barberías en Panamá\.

## <a id="_gvvds1nre0x1"></a>__👤 2\. Funcionalidades del Cliente \(Cero Fricción\)__

El cliente no necesita descargar nada, todo sucede en su entorno natural\.

- __Reserva por WhatsApp:__ El sistema \(Bot\) responde al instante saludando y envía un enlace único de la barbería\.
- __Calendario Visual Inteligente:__ El cliente selecciona su hora en una interfaz móvil web\. Los espacios mostrados ya filtran los almuerzos de los barberos y calculan el tiempo de los servicios\.
- __Escudo Anti\-Ausencias:__ El sistema envía recordatorios automáticos al cliente 24 horas antes sin costo por mensaje usando Evolution API\.
- __Reprogramación Autónoma \(Recomendación\):__ En el mismo mensaje de recordatorio, se incluye un botón: *"¿No puedes asistir? Reprograma aquí"*\. Esto permite al cliente mover su cita sin que el dueño tenga que chatear, liberando el espacio al instante\.

## <a id="_slzxvytie5cm"></a>__📊 3\. Funcionalidades del Administrador \(Control Total\)__

El panel web del dueño le permite soltar el negocio y dejar que el sistema trabaje por él\.

- __Configuración de Reglas:__ El dueño configura los días laborables, los horarios y la hora de almuerzo predeterminada de cada barbero\.
- __Cierre Fiscal Automático \(DGI\):__ Conexión con un PAC \(como GuruSoft o Alegra API\) para emitir la factura electrónica\.
- __Cierre de Caja Ciego \(Recomendación\):__ Al final del día, el sistema sabe exactamente cuánto efectivo debe haber en caja\. El administrador \(o recepcionista\) debe ingresar cuánto efectivo cuenta físicamente *antes* de que el sistema le diga cuánto debería haber\. Esto previene robos de efectivo\.
- __Reportes de Rendimiento:__ Analítica que muestra qué barbero atrae más clientes recurrentes y qué servicios \(ej\. Corte vs\. Barba\) dejan más margen\.

## <a id="_1n5ks98yc5s9"></a>__🔄 El Nuevo Flujo Operativo Detallado__

Veamos cómo interactúan estas nuevas funcionalidades en un día normal:

1. __9:00 AM \- Inicio de Turno:__ El barbero "Carlos" llega al local, abre la PWA en su celular y ve que tiene 3 citas programadas para la mañana\.
2. __10:30 AM \- Reserva Autónoma:__ Un cliente escribe por WhatsApp\. El bot envía el enlace\. El cliente reserva para la 1:00 PM\. El sistema bloquea el espacio y envía la confirmación\.
3. __12:15 PM \- Pausa Dinámica:__ A Carlos se le canceló un cliente y decide adelantar su almuerzo\. Presiona el botón __"Almorzar \(45 min\)"__ en su celular\. El sistema bloquea la agenda online hasta la 1:00 PM\.
4. __1:00 PM \- Llegada y Servicio:__ Llega el cliente de las 1:00 PM\. Carlos revisa su PWA, lee la nota *"Corte Fade bajito"* y comienza el servicio sin tener que preguntar\.
5. __1:45 PM \- Checkout Multimétodo:__ Termina el corte\. Carlos presiona __"Cobrar"__\. Le pregunta al cliente cómo pagará\. El cliente dice "Efectivo"\. Carlos toca el botón de Efectivo, guarda el billete en la caja registradora y despide al cliente\.
6. __1:46 PM \- Magia en el Backend:__ Al marcarse como pagado, el sistema calcula automáticamente que Carlos ganó el 50% de ese corte , suma el dinero a la cuenta de "Efectivo en Caja" y se conecta con la API de GuruSoft para emitir la factura a la DGI\.
7. __7:00 PM \- Cierre del Día:__ El dueño abre su panel, revisa el "Cierre Ciego" para cuadrar los billetes físicos con lo que reporta el software, y paga las comisiones exactas a Carlos con un solo Yappy\.

