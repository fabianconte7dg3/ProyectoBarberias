## <a id="_xf3siyq8l0d8"></a>__🗄️ Estructura de la Base de Datos \(Tabla: Clientes\)__

Esta estructura está diseñada para alimentar tanto la operación del barbero como los reportes financieros del dueño, cumpliendo con la Ley 81 de Protección de Datos de Panamá\.

__Campo \(Database Field\)__

__Tipo de Dato__

__Descripción y Uso Operativo__

id\_cliente

UUID

Identificador único y encriptado generado automáticamente por el sistema\.

telefono\_whatsapp

String

Número celular\. Es la "llave" principal del usuario ya que la reserva nace en WhatsApp\.

nombre\_completo

String

El nombre que el cliente proporciona en su primera interacción con el bot\.

barbero\_frecuente

Relación \(FK\)

El sistema calcula automáticamente con qué barbero se atiende más veces y lo sugiere por defecto\.

notas\_preferencia

Texto Libre

Información cualitativa escrita por el barbero \(ej\. "Corte Fade, usa cera mate, no le gusta charlar mucho"\)\.

total\_asistencias

Entero

Contador automático que suma \+1 cada vez que el barbero presiona "Cobrar" y confirma el pago\.

ausencias\_strikes

Entero

Suma \+1 si el cliente no se presenta\. Permite al sistema bloquear o aplicar reglas a clientes problemáticos\.

total\_gastado

Decimal

Acumulado del dinero que el cliente ha dejado en el local\. Permite al dueño saber quiénes son sus clientes VIP\.

email\_facturacion

String

Correo del cliente \(opcional\) para recibir la factura electrónica de la DGI tras el cobro ágil\.

## <a id="_njhhfnn5e3re"></a>__⚙️ Cómo Funciona Profesionalmente en la Práctica__

El éxito de este CRM radica en que nadie tiene que sentarse a llenar un formulario en Excel\. La plataforma hace el trabajo pesado en segundo plano:

- __Creación Silenciosa:__ La primera vez que un cliente nuevo escribe al WhatsApp del local pidiendo una cita, el sistema captura su número\. Al elegir su hora en el enlace, se le pide únicamente su nombre, creando su perfil en el CRM en 5 segundos\.
- __Actualización Automática de Métricas:__ Al momento que el barbero finaliza la transacción en efectivo o Yappy, el backend actualiza de inmediato el historial de asistencias y el total gastado de ese cliente específico\.
- __Experiencia Premium en la Silla:__ Cuando el cliente llega a su cita, el barbero revisa su Web App Progresiva \(PWA\), toca el perfil del cliente y lee al instante sus notas de preferencia\. Así puede comenzar el servicio directamente sabiendo qué estilo busca el cliente\.
- __Gestión de Walk\-ins \(Clientes sin cita\):__ Para mantener la filosofía de "cero fricción", el barbero puede cobrarle a los clientes de paso con un botón rápido de "Consumidor Final"\. Si el barbero desea fidelizar a esa persona, simplemente le pide su número de WhatsApp al cobrarle, creando su perfil de manera silenciosa para el futuro\.

