### <a id="_tz83fyr51c9f"></a>__🌐 Seguridad en la Opción 2: Web App Progresiva \- PWA \(Nuestra Elección\)__

- __La Realidad:__ Al ser una aplicación web, tendrá una dirección \(ejemplo: app\.tusaas\.com\)\. Sí, cualquiera en el mundo puede teclear esa dirección, __PERO__ se toparán con un "muro de acero" criptográfico\.
- __Ventaja Real:__ Tenemos control total e inmediato\. Si detectamos un ataque o queremos parchar algo, lo hacemos en nuestro servidor e instantáneamente todos los usuarios del país están protegidos, sin intermediarios\.

### <a id="_dbnvj0tiy2nx"></a>__🛡️ El "Muro de Acero": Cómo garantizamos que SOLO entren tus clientes__

Para que la PWA sea una fortaleza impenetrable, implementaremos estas __4 capas de seguridad profesional__:

#### <a id="_5d41zmepah6d"></a>__1\. Para los Dueños y Barberos: Registro Cerrado \(Invite\-Only\)__

- __El Problema:__ Alguien entra a la web e intenta crear una cuenta falsa de barbería\.
- __La Solución:__ __No existirá un botón público de "Registrarse" o "Crear Cuenta" para los negocios\.__ La única forma de que una barbería tenga acceso a la plataforma es que nuestro equipo comercial le cree su perfil \(el tenant\_id\) internamente\. El barbero recibe un enlace de activación privado por correo o WhatsApp\. Si un extraño entra a la web, solo verá una pantalla de Login sin opción de registrarse\.

#### <a id="_c7v8wgouq85p"></a>__2\. Para los Barberos: Autenticación sin Contraseñas \(WebAuthn / Biometría\)__

- __El Problema:__ Los barberos usan contraseñas débiles como "123456" o se la prestan a un amigo\.
- __La Solución:__ Las PWA modernas tienen acceso al hardware de seguridad del teléfono\. Implementaremos *WebAuthn*\. Cuando el barbero vaya a abrir su turno, la PWA no le pedirá contraseña, le pedirá su __FaceID o Huella Dactilar__\. Es imposible que alguien entre a su cuenta sin su rostro o su dedo, incluso si descubren la URL del sistema\.

#### <a id="_osk782taxyle"></a>__3\. Para los Clientes Finales: Enlaces Tokenizados \(Cero Spam\)__

- __El Problema:__ Un bromista entra a la web de reservas de la barbería y agenda 20 citas falsas con el nombre "Batman"\.
- __La Solución:__ La web de reservas no es de acceso libre\. El cliente __obligatoriamente__ debe iniciar el contacto por el WhatsApp del local\. El Bot genera un enlace único que contiene un *Token JWT Criptográfico* amarrado exclusivamente a ese número de celular y que expira en 10 minutos\.
- Si alguien comparte ese enlace en Facebook o intenta alterar la URL, el servidor detecta que el token es inválido, muestra un error 403 \(Acceso Denegado\) y bloquea la IP\. __Nadie puede agendar si no es dueño del número de WhatsApp\.__

#### <a id="_dir8fppbbivx"></a>__4\. Protección Perimetral del Servidor \(Cloudflare & API Gateway\)__

- __El Problema:__ Ataques de bots desde otros países intentando adivinar contraseñas o tumbar el servidor \(DDoS\)\.
- __La Solución:__ Todo el tráfico de nuestra PWA pasará primero por __Cloudflare__\. Aplicaremos reglas de *Geofencing* \(Cercado Geográfico\)\. Si alguien intenta abrir la PWA desde Rusia, China o un servidor anónimo \(VPN\), Cloudflare lo bloquea instantáneamente antes de que siquiera toque nuestra base de datos en Hetzner\.

### <a id="_iyl01epno3lg"></a>__Conclusión de Seguridad__

La __PWA \(Opción 2\)__ no solo es la más rentable y fácil de usar, sino que, aplicando Biometría, Registro Cerrado y Enlaces Tokenizados, podemos hacerla a prueba de balas\. Es matemáticamente imposible que alguien manipule la información financiera de los locales si aplicamos estas 4 reglas\.

