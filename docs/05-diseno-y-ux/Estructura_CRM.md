> **Corregido 2026-07-24:** este documento tenía un diccionario de campos de la tabla `clientes`
> duplicado (y desincronizado) del que ya vive en
> [`Modelo_Base_Datos_ERD.md`](../02-arquitectura-y-db/Modelo_Base_Datos_ERD.md). Se removió para no
> mantener dos copias — ver ese documento, o `schema.ts`, para los campos exactos. Este documento se
> queda solo con el flujo operativo, que es contenido que no está en ningún otro lado.

## <a id="_njhhfnn5e3re"></a>__⚙️ Cómo Funciona Profesionalmente en la Práctica__

El éxito de este CRM radica en que nadie tiene que sentarse a llenar un formulario en Excel\. La plataforma hace el trabajo pesado en segundo plano:

- __Creación Silenciosa:__ La primera vez que un cliente nuevo escribe al WhatsApp del local pidiendo una cita, el sistema captura su número\. Al elegir su hora en el enlace, se le pide únicamente su nombre, creando su perfil en el CRM en 5 segundos\.
- __Actualización Automática de Métricas:__ Al momento que el barbero finaliza la transacción en efectivo o Yappy, el backend actualiza de inmediato el historial de asistencias y el total gastado de ese cliente específico\.
- __Experiencia Premium en la Silla:__ Cuando el cliente llega a su cita, el barbero revisa su Web App Progresiva \(PWA\), toca el perfil del cliente y lee al instante sus notas de preferencia\. Así puede comenzar el servicio directamente sabiendo qué estilo busca el cliente\.
- __Gestión de Walk\-ins \(Clientes sin cita\):__ Para mantener la filosofía de "cero fricción", el barbero puede cobrarle a los clientes de paso con un botón rápido de "Consumidor Final"\. Si el barbero desea fidelizar a esa persona, simplemente le pide su número de WhatsApp al cobrarle, creando su perfil de manera silenciosa para el futuro\.

