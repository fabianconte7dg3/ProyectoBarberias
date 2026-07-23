### <a id="_t5ffr311yxsy"></a>__1\. El cliente paga por Yappy, el dinero entra al banco, pero cierra la web antes de validar el monto__

- __El Problema:__ El cliente escanea el QR en la silla, realiza la transferencia con éxito en su App de Banco General, pero por apuro o distracción cierra el navegador web de la barbería antes de que el barbero valide manualmente el monto adeudado en la PWA\. El barbero no sabe si el dinero ingresó\.
- __La Solución Profesional:__ Implementaremos un __Módulo de Conciliación de Emergencia \(Botón de Auditoría\)__ en el panel del barbero\. Si esto ocurre, el barbero presiona *"Verificar Yappy"* y el sistema consulta vía API \(o mediante un lector de notificaciones push de banco integrado en el backend\) las últimas transacciones recibidas en los últimos 5 minutos que coincidan exactamente con el monto adeudado\. Si hay coincidencia, la cita se auto\-aprueba y libera la agenda\.

### <a id="_xxp7r8jxuhuj"></a>__2\. Dos clientes intentan agendar exactamente la misma hora al mismo tiempo__

- __El Problema:__ El sábado a las 10:00 AM es la hora más buscada\. Dos clientes abren el enlace de WhatsApp al mismo tiempo, ven el espacio libre con el barbero "Carlos" y hacen clic en "Confirmar" con milisegundos de diferencia\.
- __La Solución Profesional \(Bloqueo Optimista / Registro de Bloqueo Temporal\):__ Cuando un cliente selecciona una hora en la interfaz web, el sistema aplica un *Lock* \(bloqueo temporal\) en la base de datos PostgreSQL durante __3 minutos__\. Durante ese tiempo, la hora se muestra como "reservada en proceso" para cualquier otro usuario\. Si el cliente completa el registro, el espacio se asegura definitivamente; si expiran los 3 minutos sin confirmación, el sistema libera el bloque automáticamente\.

### <a id="_mgmsdz9256g8"></a>__3\. El barbero no marca su almuerzo y el sistema le agenda una cita en su hora de descanso__

- __El Problema:__ El barbero tiene programado su almuerzo de 12:00 PM a 1:00 PM , pero hay mucho movimiento en el local y olvida presionar el botón de "Pausa/Almuerzo" en su PWA\. Un cliente aprovecha y reserva en línea para la 12:15 PM\.
- __La Solución Profesional:__ El sistema contará con __Reglas de Negocio Estrictas por Defecto__\. Aunque el barbero no active la pausa manualmente, el software bloqueará de manera automatizada su bloque horario configurado de descanso diario\. El botón de "Pausa" en la PWA servirá únicamente para adelantar, retrasar o extender dinámicamente ese almuerzo, pero nunca para dejar al barbero sin su hora de descanso base preconfigurada por el administrador\.

### <a id="_9eg4dxdxrzli"></a>__4\. El cliente llega tarde a su cita y choca con el siguiente cliente agendado__

- __El Problema:__ "Juan" tiene cita a las 2:00 PM \(duración de 30 min\), pero llega al local a las 2:20 PM\. El siguiente cliente, "Pedro", tiene su cita puntual a las 2:30 PM\. Si el barbero atiende a Juan, arruina el tiempo de Pedro\.
- __La Solución Profesional \(Ventana de Tolerancia Automatizada\):__ El sistema define una regla de tolerancia estricta \(ejemplo: __10 o 15 minutos máximo__\)\. A las 2:15 PM, si el barbero no ha presionado "Iniciar Servicio" en su PWA, el backend marca automáticamente la cita de Juan como *"Ausente por tardanza"*, le suma un strike en el CRM y le envía un WhatsApp automático: *"Tu cita expiró por límite de tiempo, por favor reagenda aquí"*\. Así la silla queda libre para atender puntualmente a Pedro a las 2:30 PM o recibir un cliente de la calle\.

### <a id="_lzkh694vfgw4"></a>__5\. El bot de WhatsApp \(Evolution API\) se desconecta o pierde sesión__

- __El Problema:__ La API de WhatsApp que compramos \(Evolution API/Baileys\) pierde la conexión debido a una actualización de Meta o porque el celular vinculado en el local se quedó sin batería\. El sistema no puede enviar los enlaces de reserva ni los recordatorios anti\-ausencias\.
- __La Solución Profesional \(Soporte Multi\-canal de Alerta e ITIL\):__ Aplicando el framework __ITIL de Gestión de Incidentes__, el sistema monitoreará el estado del token de WhatsApp cada 60 segundos \(Heartbeat Check\)\. Si detecta una desconexión, envía inmediatamente una *Notificación Push* de alta prioridad y un correo al dueño del local: *"Atención: WhatsApp desconectado\. Siga los pasos en pantalla para re\-vincular el código QR"*\. Paralelo a esto, las confirmaciones críticas de citas se redirigen temporalmente a un proveedor secundario de SMS tradicional para no congelar el negocio\.

### <a id="_sugigz7m75kj"></a>__6\. Disputas financieras: Un barbero borra o edita una cita pasada para cobrarla por fuera__

- __El Problema:__ Un barbero atiende un walk\-in \(cliente de la calle\) por un servicio de $20\.00\. Al terminar, cobra los $20\.00 en efectivo , pero altera el registro en el sistema poniendo que solo hizo un corte de $10\.00 para quedarse con la diferencia y engañar al dueño en la división de comisiones\.
- __La Solución Profesional \(Tablas Inmutables y Logs de Auditoría\):__ Las transacciones financieras y cierres de citas se guardarán en tablas de PostgreSQL con permisos de __Solo Lectura e Inserción \(Append\-Only Logs\)__\. Ningún usuario \(ni el barbero ni el administrador\) podrá usar la función DELETE o UPDATE sobre una transacción ya confirmada\. Si se requiere hacer una corrección, el sistema obliga a generar una transacción de nota de crédito o ajuste que deje rastro de auditoría con la hora, el ID del usuario y el motivo del cambio\.

### <a id="_3une2povsih6"></a>__7\. El cliente no tiene saldo en Yappy ni efectivo y promete pagar por transferencia de noche__

- __El Problema:__ El cliente termina su servicio, pero al momento del checkout multimétodo , se da cuenta de que no tiene efectivo y la plataforma Yappy de Banco General está caída en todo el país\. Le pide al barbero que le deje ir y que le transferirá por ACH más tarde\.
- __La Solución Profesional \(Estado de Cuenta "Pendiente de Liquidación"\):__ El barbero tendrá un tercer botón de emergencia en la PWA llamado __"Registrar como Deuda / Cuenta por Cobrar"__\. Esto cierra la cita actual para liberar la agenda , calcula la comisión del barbero pero la retiene en estado *"Congelada"*, y marca el perfil del cliente en el CRM con una alerta roja de saldo pendiente\. El bot de WhatsApp le enviará automáticamente un recordatorio de cobro cada 12 horas con los datos bancarios del local hasta que el administrador confirme la recepción del dinero y liquide la deuda en el panel\.

### <a id="_v9dldxegmet4"></a>__8\. El cliente borra su historial de WhatsApp y pierde el enlace para reprogramar__

- __El Problema:__ El cliente necesita mover su cita porque se le presentó un inconveniente, pero borró el chat de WhatsApp donde estaba el mensaje de confirmación y el botón de *"¿No puedes asistir? Reprograma aquí"*\.
- __La Solución Profesional \(Palabras Clave en el Bot\):__ El bot de WhatsApp estará programado con procesamiento de palabras clave mediante flujos de decisiones dinámicos\. Si el cliente escribe comandos naturales como: *"citas"*, *"mi cita"*, *"cancelar"* o *"reprogramar"*, el sistema detecta su número celular, busca en la base de datos si tiene alguna cita activa para las próximas horas y le reenvía de inmediato el enlace de gestión de esa cita específica sin que tenga que buscar el mensaje viejo\.

### <a id="_na31iafoehsr"></a>__9\. El local se queda sin internet en mitad de la jornada laboral__

- __El Problema:__ El internet de la barbería \(Tigo/\+Móvil\) falla por completo un sábado por la tarde\. Los celulares de los barberos pierden conexión al servidor central y no pueden ver la agenda ni registrar los cobros de los walk\-ins que van llegando\.
- __La Solución Profesional \(PWA con Capacidades Offline y Service Workers\):__ Al diseñar la interfaz del barbero como una __Web App Progresiva \(PWA\)__ real, utilizaremos *Service Workers* y almacenamiento local en el navegador \(*IndexedDB*\)\. Si el internet se corta, la aplicación sigue funcionando: muestra la agenda que ya se había descargado en la mañana y permite seguir guardando los cobros en efectivo en una cola interna local\. En cuanto el celular recupere señal o datos móviles, la PWA sincronizará de forma transparente todo lo acumulado con la base de datos en la nube \(PostgreSQL\)\.

### <a id="_f87z9riny2vd"></a>__10\. Cumplimiento Legal: El cliente exige su factura con RUC/Cédula y Nombre, no como Consumidor Final__

- __El Problema:__ Aunque el flujo ágil emite facturas automáticas como "Consumidor Final" para agilizar la salida, un cliente de paso o corporativo exige que su factura electrónica de la DGI salga detallada con su nombre, cédula o RUC para deducir gastos de impuestos\.
- __La Solución Profesional:__ Al momento de presionar "Cobrar" en la PWA, antes de confirmar el pago en efectivo o Yappy, el sistema mostrará un botón opcional: *"¿Desea datos de facturación?"*\. Si se activa, despliega dos campos rápidos: Cédula/RUC y Nombre Comercial\. La API \(GuruSoft/Alegra\) recibirá estos parámetros reemplazando los de Consumidor Final por defecto, emitiendo el documento legal de forma asíncrona y perfecta ante la DGI en segundos\.

### <a id="_v4ypjggxywdd"></a>__👤 Categoría 1: Errores y "Torpezas" del Cliente__

__1\. El cliente responde al bot de WhatsApp con notas de voz o stickers en lugar de usar el enlace\.__

- __El Problema:__ El cliente ignora el enlace de reservas y manda un audio de 2 minutos diciendo "oye, sepárame a las 3"\.
- __La Solución Profesional:__ El bot detecta el tipo de archivo \(audio/sticker/imagen\) y responde con un *Fallback* automático: *"Soy un asistente virtual y no puedo escuchar audios o ver imágenes 🤖\. Por favor, toca las letras azules de este enlace para separar tu silla en 5 segundos: \[Enlace\]"*\.

__2\. El cliente escribe un nombre falso, ofensivo o emojis largos al registrarse\.__

- __El Problema:__ Un bromista se registra como "Batman 🦇🦇🦇" o usa lenguaje inapropiado\.
- __La Solución Profesional \(Sanitización de Datos\):__ El backend utiliza expresiones regulares \(Regex\) para bloquear caracteres especiales excesivos y pasa el texto por un filtro de palabras altisonantes\. Si lo detecta, limpia el nombre o bloquea la reserva silenciosamente\.

__3\. El cliente agenda 5 citas seguidas "por si acaso" o para molestar\.__

- __El Problema:__ Un usuario acapara la agenda bloqueando 5 horarios el mismo sábado\.
- __La Solución Profesional \(Rate Limiting\):__ Regla de negocio en la base de datos: Un número de teléfono solo puede tener __1 cita activa a la vez__ en el futuro\. Hasta que no asista a su cita de las 2:00 PM o la cancele, el sistema le impide generar una nueva reserva\.

__4\. El cliente llega al local el día equivocado \(Ej\. agendó para el viernes, pero llega el jueves\)\.__

- __El Problema:__ El cliente hace un escándalo en la barbería diciendo que el sistema "se equivocó"\.
- __La Solución Profesional:__ El barbero tiene un buscador rápido en su PWA por número de teléfono\. Al ponerlo, muestra el registro exacto inmutable\. Además, el bot de WhatsApp siempre envía la fecha en __negrita__ y envía el recordatorio 24 horas antes, dejando evidencia innegable en el chat del cliente\.

__5\. El cliente muestra una captura de pantalla \(Screenshot\) de un pago de Yappy viejo o falso\.__

- __El Problema:__ El barbero no se fija bien en la fecha de la pantalla verde y aprueba el pago\.
- __La Solución Profesional \(Conciliación Automática\):__ Al presionar "Verificar Yappy", el backend se conecta con un lector de notificaciones push del celular del dueño\. El sistema busca una coincidencia exacta de monto y hora en el banco\. Si el sistema no detecta el ingreso real en el banco, el botón de "Aprobar" no se habilita por más que el cliente muestre una imagen\.

__6\. El cliente intenta pagar una parte en Efectivo y otra por Yappy\.__

- __El Problema:__ El corte cuesta $15\.00, pero el cliente solo tiene $10\.00 en billetes y pide pasar $5\.00 por Yappy\. El barbero no sabe cómo registrarlo\.
- __La Solución Profesional \(Cobro Dividido\):__ La PWA incluye un botón de "Pago Mixto"\. Permite registrar $10\.00 en la caja de efectivo y generar un código QR de Yappy por los $5\.00 restantes\. La factura de la DGI suma ambos métodos\.

__7\. El cliente reenvía su enlace de reserva privado a un amigo\.__

- __El Problema:__ El amigo abre el enlace, cambia el nombre y altera la cita original del cliente 1\.
- __La Solución Profesional \(Tokens JWT vinculados\):__ El enlace de reserva contiene un token de un solo uso encriptado y amarrado a la sesión de WhatsApp de ese número específico\. Si alguien intenta usarlo de nuevo, el enlace expira y dice "Este enlace ya fue utilizado o es inválido"\.

__8\. El cliente "Walk\-in" \(de paso\) se niega a dar su WhatsApp o nombre\.__

- __El Problema:__ El barbero quiere registrar la venta, pero el cliente dice "no te voy a dar mi número, solo cóbrame"\.
- __La Solución Profesional \(Cliente Anónimo\):__ El sistema tiene un botón de "Cliente Rápido / Anónimo"\. Genera un identificador basura \(UUID temporal\) solo para cumplir con el cuadre de caja y enviar la venta a la DGI como Consumidor Final\.

__9\. El cliente cancela y reprograma su cita 10 veces en una hora buscando la mejor hora\.__

- __El Problema:__ Satura la base de datos y vuelve loco el calendario del barbero\.
- __La Solución Profesional:__ Bloqueo anti\-spam\. A la tercera reprogramación en menos de 24 horas, el sistema bloquea temporalmente al cliente y le envía un mensaje: *"Has alcanzado el límite de cambios\. Por favor, contáctanos directamente para agendar"*\.

__10\. El cliente paga por Yappy, se le apaga el celular y no puede mostrar la confirmación\.__

- __El Problema:__ Transacción a ciegas\.
- __La Solución Profesional:__ El módulo de conciliación \(punto 5\) entra al rescate\. El barbero presiona "Refrescar" y el sistema detecta que el dinero ingresó a la cuenta del banco, aprobando la cita sin necesidad del celular del cliente\.

### <a id="_nj2ly2nmv3kv"></a>__✂️ Categoría 2: Errores y "Dedazos" del Barbero__

__11\. El barbero presiona el botón de "Cobrar Efectivo" pero digita $200\.00 en vez de $20\.00\.__

- __El Problema:__ Arruina el cálculo del cambio y desfasa el cierre de caja del día por un cero de más\.
- __La Solución Profesional \(Límites de Lógica\):__ Si el monto ingresado supera el 300% del valor del servicio, la PWA lanza una alerta gigante en rojo: *"⚠️ Estás ingresando $200\.00 por un corte de $15\.00\. ¿Estás seguro?"*\. Esto obliga a una confirmación consciente\.

__12\. El barbero toca el botón de "Finalizar Cita" dos veces muy rápido \(Double Click\)\.__

- __El Problema:__ Se duplica el ingreso en caja y se emiten dos facturas electrónicas a la DGI por accidente\.
- __La Solución Profesional \(Idempotencia\):__ El backend utiliza *Idempotency Keys*\. Si recibe dos peticiones de cobro para el mismo id\_cita en menos de 5 segundos, procesa la primera y descarta la segunda como un duplicado ignorado\.

__13\. El barbero marca a un cliente como "No asistió" pero el cliente estaba en el baño\.__

- __El Problema:__ Le suma un *strike* injusto al cliente y libera la silla por error\.
- __La Solución Profesional \(Ventana de Deshacer\):__ Se implementa un botón temporal de "Deshacer acción" que dura exactamente 5 minutos\. Si el cliente sale del baño, el barbero revierte el estado y procede al cobro normal\.

__14\. El barbero se queda sin batería en su celular y no puede ver su agenda\.__

- __El Problema:__ El flujo operativo se rompe totalmente\.
- __La Solución Profesional \(Modo Administrador Compartido\):__ El sistema permite que el dueño \(o desde la tableta central de la tienda\) active el "Modo Recepción"\. Desde allí se puede ver y gestionar la columna de citas del barbero sin batería, cobrando en su nombre\.

__15\. El barbero atiende un cliente pero olvida cobrarlo en la aplicación al final del día\.__

- __El Problema:__ La cita queda "En curso" eternamente y el barbero no recibe su comisión de ese corte\.
- __La Solución Profesional \(Auto\-Cierre a Medianoche\):__ Un proceso automático \(Cron Job\) corre a las 11:59 PM\. Cualquier cita que se haya quedado en el limbo se marca como "Revisión Manual Requerida" y alerta al dueño, bloqueando el pago de comisiones de ese barbero hasta que justifique qué pasó con ese cliente\.

__16\. Un barbero renuncia o es despedido y se lleva su celular con la sesión abierta\.__

- __El Problema:__ Puede ver la base de datos de clientes, alterar agendas o sabotear el sistema desde su casa\.
- __La Solución Profesional \(Kill Switch\):__ El administrador tiene un botón de "Revocar Acceso" en su panel\. Al hacer clic, los *tokens* de seguridad del barbero se destruyen en milisegundos, cerrando la sesión de la PWA en cualquier dispositivo remotamente\.

__17\. El barbero incluye la propina \(Tip\) dentro del costo del servicio\.__

- __El Problema:__ Al cobrar un servicio de $15 \+ $5 de propina, factura $20 a la DGI, haciendo que el dueño pague impuestos sobre una propina que es del barbero\.
- __La Solución Profesional \(Caja Desacoplada\):__ En la pantalla de cobro hay un campo específico de "Propina \(Opcional\)"\. El sistema dirige ese dinero 100% al saldo del barbero, pero lo *excluye* de la integración con GuruSoft/Alegra, facturando a la DGI únicamente los $15 del servicio\.

__18\. El barbero intenta entrar a la cuenta de otro compañero para robarle clientes\.__

- __El Problema:__ Uso de contraseñas compartidas o débiles \("1234"\)\.
- __La Solución Profesional \(WebAuthn / Biometría\):__ La PWA no usará contraseñas\. El barbero inicia sesión utilizando el FaceID o la huella dactilar de su propio celular vinculado, haciendo imposible que otro compañero entre a su perfil\.

__19\. El barbero bloquea "30 minutos" por un Walk\-in, pero el cliente pide tinte y demora 2 horas\.__

- __El Problema:__ Las citas online que entraron para después de esos 30 minutos colisionan con el cliente sentado\.
- __La Solución Profesional \(Extensión Dinámica de Turno\):__ La PWA permite al barbero tocar el bloque actual y presionar "\+30 min"\. El sistema empuja automáticamente todas las citas siguientes, enviando un WhatsApp automático a los próximos clientes: *"Tu barbero está demorado unos minutos, tu nueva hora estimada es X:XX PM"*\.

__20\. El barbero cierra su día, pero olvidó sacar el efectivo físico de la caja registradora\.__

- __El Problema:__ El arqueo del dueño al día siguiente no cuadra\.
- __La Solución Profesional:__ El proceso de "Cierre de Turno" en la PWA bloquea la pantalla hasta que el barbero digite exactamente cuánto dinero físico está dejando en la gaveta, creando un registro de "Traspaso de Responsabilidad"\.

### <a id="_aheq6zerl811"></a>__⚙️ Categoría 3: Errores Administrativos, Financieros y del Sistema__

__21\. El dueño configura mal el número de Yappy del negocio en el sistema\.__

- __El Problema:__ El dinero de los cobros empieza a irse a la cuenta de un desconocido\.
- __La Solución Profesional:__ Validación obligatoria \(Micro\-ping o Regex estricto\)\. Antes de activar el método Yappy, el sistema fuerza al dueño a escanear un QR de prueba de $0\.01 y validarlo para asegurar que el enlace de cobro de Banco General pertenece a su empresa\.

__22\. El PAC de la DGI rechaza la factura porque el RUC o Cédula del cliente está mal escrito\.__

- __El Problema:__ El cliente puso "123\-hola\-456" como su RUC\. La API de facturación truena y la app se congela\.
- __La Solución Profesional \(Validación Asíncrona \+ Fallback\):__ La interfaz bloquea letras en campos de cédula/RUC\. Si por alguna razón la DGI lo rechaza internamente, el sistema emite automáticamente una factura de contingencia como "Consumidor Final" para no trabar el sistema, y levanta un *Ticket* al administrador\.

__23\. Se va la luz en todo Penonomé a las 4:00 PM y el local debe cerrar, pero hay 10 citas agendadas\.__

- __El Problema:__ Llamar a 10 personas una por una en medio de un apagón es caótico\.
- __La Solución Profesional \(Botón de Cierre de Emergencia\):__ El dueño entra al sistema desde sus datos móviles, presiona "Cerrar Local por Emergencia"\. El sistema cancela todo el resto del día, bloquea la agenda web y lanza un WhatsApp masivo automático pidiendo disculpas e invitando a reagendar\.

__24\. WhatsApp suspende o bloquea el número del local por "Spam"\.__

- __El Problema:__ Meta detecta demasiados envíos automáticos y bannea el número del negocio\.
- __La Solución Profesional \(Official Cloud API & Templates\):__ En lugar de usar métodos "piratas" para enviar mensajes masivos, utilizaremos la API Oficial de Meta y pre\-aprobaremos plantillas \(Templates\) de confirmación\. Esto asegura un 100% de cumplimiento con las políticas de Meta, eliminando el riesgo de baneo\.

__25\. El servidor principal de Hetzner/DigitalOcean se cae físicamente\.__

- __El Problema:__ Error 502 Bad Gateway\. Nadie puede reservar ni cobrar en todo Panamá\.
- __La Solución Profesional \(Alta Disponibilidad Multi\-Zona\):__ Se implementa un *Load Balancer* \(Balanceador de carga\)\. Si el Servidor A \(ej\. en Virginia\) deja de responder, el tráfico se enruta en milisegundos al Servidor B \(ej\. en Nueva York\) que tiene una réplica en vivo de la base de datos de PostgreSQL\.

__26\. El dueño decide cambiar la comisión del barbero del 50% al 60% a mitad de mes\.__

- __El Problema:__ ¿El cambio aplica a los cortes que el barbero ya hizo en los 15 días pasados, descuadrando la contabilidad?
- __La Solución Profesional \(Versionado de Contratos\):__ Los cortes pasados ya fueron calculados y son inmutables\. El sistema aplica el nuevo modelo 60/40 *únicamente* a las transacciones generadas a partir del segundo exacto en que se guardó el cambio en la configuración\.

__27\. La base de datos se corrompe por un error de actualización o un ataque\.__

- __El Problema:__ Se pierden las citas, el historial del CRM y el registro de dinero\.
- __La Solución Profesional \(Point\-in\-Time Recovery \- PITR\):__ La base de datos PostgreSQL estará configurada con recuperación en el tiempo\. Si algo catastrófico ocurre a las 3:15 PM, podemos restaurar la base de datos exactamente al estado en el que estaba a las 3:14 PM, perdiendo máximo 60 segundos de información\.

__28\. Un cliente pide "Borrar todos mis datos" acogiéndose a la Ley 81\.__

- __El Problema:__ Si borramos su registro de la base de datos, las facturas y los ingresos financieros del mes descuadran porque faltarán transacciones\.
- __La Solución Profesional \(Anonimización de Datos \- Soft Delete\):__ El sistema no ejecuta un comando DELETE\. Ejecuta un comando de ofuscación: cambia su nombre a "Usuario Borrado", elimina su número celular y notas, pero mantiene intacto el ID financiero de las transacciones para que la contabilidad del negocio siga cuadrando\.

__29\. Un atacante intenta extraer la base de clientes de todos los locales alterando la URL\.__

- __El Problema:__ Vulnerabilidad de referencias directas a objetos \(IDOR\)\. Alguien cambia el ID en la web de local=1 a local=2 y ve las citas del competidor\.
- __La Solución Profesional \(Row Level Security \- RLS\):__ Como está en nuestra arquitectura, la seguridad está a nivel de motor de base de datos, no solo en la web\. PostgreSQL denegará la consulta directamente porque el token criptográfico del usuario no pertenece al Local 2\.

__30\. El dueño hace un cierre de caja ciego, pero declara que hay $100 y el sistema dice que debería haber $120\.__

- __El Problema:__ Hay un faltante de $20, pero el administrador solo lo anota y lo olvida, perdiendo dinero a largo plazo\.
- __La Solución Profesional \(Alarma de Faltante y Registro de Deuda\):__ El sistema registra el arqueo como "Faltante en Caja"\. No permite que el turno cierre limpiamente; genera un registro en rojo de \-$20\.00 en el panel contable del dueño, obligándolo a auditar los cobros de los barberos en efectivo de ese día para encontrar quién se equivocó o quién tomó el dinero\.

