### <a id="_czesqe983bb3"></a>__1\. Concepto Arquitectónico El sistema utilizará un modelo Multi\-tenant \(Multi\-inquilino\) con base de datos compartida\. Bajo este esquema, todas las barberías \(inquilinos\) operan sobre la misma infraestructura de servidores y comparten una única base de datos física\. La separación de los datos es puramente lógica: cada tabla del sistema cuenta con una columna obligatoria e invisible para el usuario llamada tenant\_id, la cual etiqueta y aísla a qué barbería le pertenece cada registro \(ej\. tenant\_id = 1 para Barbería A, tenant\_id = 2 para Barbería B\)\.__

### <a id="_czesqe983bb3"></a>__2\. Ventajas Competitivas para el Negocio__

### <a id="_czesqe983bb3"></a>__Eficiencia de Costos: Al no requerir bases de datos individuales, se reducen drásticamente los costos de infraestructura\. Esto es vital para mantener la rentabilidad de los planes económicos propuestos para las barberías \(desde $19\.00 a $35\.00 USD mensuales\) utilizando servidores VPS económicos de alto rendimiento como Hetzner o DigitalOcean\.__

### <a id="_czesqe983bb3"></a>__Mantenimiento Ágil y Centralizado: Desplegar una nueva actualización, corregir un error o añadir una funcionalidad requiere modificar la base de datos una sola vez, y todas las barberías obtienen la mejora al instante\.__

### <a id="_czesqe983bb3"></a>__Onboarding Inmediato: Cuando un nuevo cliente se registra en la plataforma, el sistema simplemente le genera un tenant\_id en milisegundos, permitiéndole usar el SaaS al instante sin tener que esperar el aprovisionamiento de nuevos servidores\.__

### <a id="_czesqe983bb3"></a>__3\. Desventajas y su Mitigación Profesional El modelo de base de datos compartida presenta dos retos principales que nuestra arquitectura resuelve desde el diseño base:__

### <a id="_czesqe983bb3"></a>__Riesgo 1: Fuga de Datos \(Privacidad\)\. Existe el riesgo de que, por un error de programación al omitir el filtro tenant\_id, una barbería pueda acceder a los clientes o finanzas de la competencia\.__

### <a id="_czesqe983bb3"></a>__Mitigación Técnica: Para cumplir con la Ley 81 de Protección de Datos de Panamá y anular el error humano en el código de la aplicación, implementaremos Row Level Security \(RLS\) en PostgreSQL\. Esta tecnología asegura que el motor de la base de datos intercepte cada consulta y la amarre forzosamente al ID del inquilino, rechazando entregar cualquier información que no pertenezca al usuario activo, incluso si el backend lo solicita\.__

### <a id="_czesqe983bb3"></a>__Riesgo 2: El "Vecino Ruidoso" \(Noisy Neighbor\)\. Una barbería con un volumen masivo de citas podría saturar los recursos y ralentizar el sistema para el resto de los inquilinos\.__

### <a id="_czesqe983bb3"></a>__Mitigación Técnica: La implementación de un "Connection Pooling" \(como PgBouncer\) y métricas de limitación de tasa \(Rate Limiting\) en el API Gateway asegurarán que los recursos se distribuyan equitativamente, manteniendo la velocidad de respuesta para todos los locales\.__

### <a id="_9brndp4g67za"></a>__Conclusión de la Arquitectura: El modelo Multi\-tenant con PostgreSQL \+ RLS es la opción definitiva para el MVP\. Brinda la seguridad hermética de tener bases de datos separadas, pero manteniendo los costos operativos bajos y la velocidad de escalamiento de un sistema compartido\.__

### <a id="_czesqe983bb3"></a>__  
¿Qué es el modelo Multi\-tenant con Base de Datos Compartida?__

Significa que todas las barberías \(inquilinos o tenants\) utilizarán la misma infraestructura, la misma aplicación y la misma base de datos física\. La separación de la información es puramente lógica: cada registro en las tablas lleva una etiqueta oculta, como por ejemplo tenant\_id = 1 \(Barbería A\) o tenant\_id = 2 \(Barbería B\)\.

### <a id="_you6pbeoops1"></a>__Las 3 Opciones Arquitectónicas \(Pros y Contras\)__

Para entender por qué lo elegimos, debemos compararlo con sus alternativas:

#### <a id="_ninj0aqxykzi"></a>__Opción 1: Multi\-tenant con Base de Datos Compartida \(Nuestro Elegido\)__

- __Concepto__: Todos comparten el mismo servidor web y la misma base de datos\.
- __Ventajas__: Reduce muchísimo los costos de infraestructura\. Además, el mantenimiento es ágil: si agregamos una nueva función, actualizamos la base de datos una sola vez y todas las barberías lo obtienen al instante\.
- __Desventajas__: Existe una complejidad de seguridad, ya que si un programador olvida poner el filtro tenant\_id, una barbería podría ver los datos de otra \(fuga de datos\)\. También existe el riesgo del "Vecino Ruidoso", donde una barbería que sature el sistema podría poner lento el servicio para las demás\.

#### <a id="_x33wdl8xsbew"></a>__Opción 2: Base de Datos por Inquilino \(Database per Tenant\)__

- __Concepto__: Todos usan la misma aplicación web, pero cada barbería tiene su propia base de datos separada en el mismo servidor\.
- __Ventajas__: Brinda un aislamiento fuerte, haciendo imposible que los datos se mezclen por un error de código, y permite respaldos individuales\.
- __Desventajas__: Es una pesadilla de escalabilidad; si tienes 500 barberías y quieres añadir una nueva columna, el sistema tendrá que correr la actualización 500 veces\.

#### <a id="_vvhqvlatr40s"></a>__Opción 3: Single\-tenant \(Silo Aislado\)__

- __Concepto__: Cada barbería tiene su propio servidor web y su propia base de datos completa\.
- __Ventajas__: Ofrece rendimiento y seguridad absolutos, junto con una personalización total\.
- __Desventajas__: Los costos de servidores y mantenimiento son prohibitivos, lo que hace imposible ofrecer el servicio a bajo costo\.

### <a id="_1tsrtwd9jwem"></a>__¿Por qué la Opción 1 es la MEJOR para este proyecto?__

Como tu arquitecto de software, la decisión se justifica en el modelo de negocio y las leyes panameñas:

1. __Economía de Escala \(Rentabilidad\)__: La estrategia de precios propone planes económicos \(desde $19\.00 a $35\.00 USD mensuales\)\. Cobrando esto, no podemos darnos el lujo de gastar en servidores individuales\. La arquitectura Multi\-tenant permite alojar a cientos de barberías utilizando VPS económicos de alto rendimiento como Hetzner o DigitalOcean\.
2. __Resolución del Problema de Seguridad \(Ley 81\)__: El gran reto es garantizar que los datos no se mezclen y cumplir con la Ley 81 de Protección de Datos de Panamá\. Para evitar los errores humanos en el código, la solución técnica es implementar Row Level Security \(RLS\) en PostgreSQL\. Esto hace que, a nivel del motor de la base de datos, cada consulta esté amarrada forzosamente al ID del inquilino, rechazando entregar información que no pertenezca a la barbería activa\.
3. __Agilidad para sumar clientes \(Onboarding\)__: Cuando un nuevo dueño se registra, el sistema le crea un tenant\_id en milisegundos\. Si usáramos la Opción 2, tendríamos que esperar a que los servidores aprovisionen una base de datos nueva en cada registro\.

