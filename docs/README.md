# 📚 Documentación Técnica del Proyecto Barberías (SaaS Multitenant)

¡Bienvenido a la documentación oficial del sistema **BarberOS / Proyecto Barberías**!

Esta documentación está organizada de forma modular en categorías claras para facilitar su navegación, mantenimiento y referencia técnica.

---

## 📂 Estructura de la Documentación

```
docs/
├── 01-vision-y-plan/           # Planificación de producto, roadmap, checklist y modelos de negocio
├── 02-arquitectura-y-db/       # Arquitectura técnica, diseño ERD, aislamiento RLS y stack
├── 03-integraciones/           # Documentación de APIs e integraciones de terceros (Yappy, WhatsApp)
├── 04-hitos-y-changelogs/      # Historial de desarrollo, resúmenes de entregables y walkthroughs
├── 05-diseno-y-ux/             # Wireframes, estructuras CRM y flujos operativos
├── 06-referencias-tecnicas/    # Ejemplos y esquemas técnicos de referencia
└── archives/                   # Archivos históricos y respaldos comprimidos
```

---

## 🗺️ Índice de Contenidos

### 📍 [01. Visión y Planificación](./01-vision-y-plan/)
- [Checklist de Desarrollo SaaS](./01-vision-y-plan/Checklist_Desarrollo_SaaS.md) — Plan maestro de módulos e hitos.
- [Roadmap Backend](./01-vision-y-plan/Roadmap_Backend.md) — Roadmap de arquitectura backend.
- [Roadmap Frontend](./01-vision-y-plan/Roadmap_Frontend.md) — Roadmap de desarrollo frontend.
- [Visión Multi-Industria](./01-vision-y-plan/Vision_Multi_Industria.md) — Estrategia de expansión.
- [Ideas Futuras: Expansión & Barbero Solo-preneur](./01-vision-y-plan/IDEAS_FUTURAS_EXPANSION_Y_SOLO_PRENEUR.md) — Adaptación a barbero independiente y nuevas verticales.
- [Estrategia de Precios](./01-vision-y-plan/Estrategia_Precios.md) — Planes (Básico vs Premium).
- [SaaS Barberías Panamá](./01-vision-y-plan/SaaS_Barberias_Panama.md) — Especificaciones para el mercado local.

### 📍 [02. Arquitectura & Base de Datos](./02-arquitectura-y-db/)
- [Modelo ERD & Diccionario de Tablas](./02-arquitectura-y-db/Modelo_Base_Datos_ERD.md) — Especificación relacional completa.
- [Modelo de Base de Datos General](./02-arquitectura-y-db/Modelo_Base_Datos_General.md) — Descripción del esquema.
- [Motor de Base de Datos](./02-arquitectura-y-db/Motor_Base_Datos.md) — Configuración de PostgreSQL y Drizzle ORM.
- [Consideraciones de Seguridad & RLS](./02-arquitectura-y-db/Consideraciones_Seguridad.md) — Aislamiento multi-tenant.
- [Manejo de Errores](./02-arquitectura-y-db/Manejo_de_Errores.md) — Estándar de excepciones HTTP.
- [Infraestructura Híbrida](./02-arquitectura-y-db/Infraestructura_Hibrida.md) — Despliegue en VPS y contenedores.
- [Stack Web](./02-arquitectura-y-db/Stack_Web.md) — Tecnologías clave (NestJS, Next.js, BullMQ, Tailwind).
- [Escalabilidad y Crecimiento](./02-arquitectura-y-db/Escalabilidad_y_Crecimiento.md) — Estrategia de escalado.

### 📍 [03. Integraciones Externas](./03-integraciones/)
- [Integración Yappy API](./03-integraciones/Integracion_Yappy_API.md) — Cobros digitales y webhooks HMAC.
- [WhatsApp (Evolution API)](./03-integraciones/WhatsApp_Evolution_API.md) — Mensajería asíncrona y recordatorios.

### 📍 [04. Hitos Completados & Changelogs](./04-hitos-y-changelogs/)
- [Resumen de Hitos y Flujos completos](./04-hitos-y-changelogs/RESUMEN_HITOS_Y_FLUJOS.md) — Resumen actualizado de Hitos 1 a 9.
- [CHANGELOG Frontend Hito 2](./04-hitos-y-changelogs/CHANGELOG_Frontend_Hito2.md) — Log de interfaz inicial.
- [CHANGELOG Hito 5](./04-hitos-y-changelogs/CHANGELOG_Hito5.md) — Log del módulo financiero y Yappy.
- [Walkthrough de Productos & Dashboards](./04-hitos-y-changelogs/WALKTHROUGH_PRODUCTOS_BARBEROS_Y_DASHBOARDS.md) — Guía visual.

### 📍 [05. Diseño & UX](./05-diseno-y-ux/)
- [Perfil Operativo & Flujo](./05-diseno-y-ux/Perfil_Operativo_Flujo.md) — Experiencia del barbero en tablet/terminal.
- [Estructura del CRM](./05-diseno-y-ux/Estructura_CRM.md) — Organización de clientes y VIPs.
- [Wireframes UI](./05-diseno-y-ux/Wireframes_UI.md) — Diseños de pantallas.
- [Pantallas Figma](./05-diseno-y-ux/Pantallas_Figma.md) — Especificación de componentes de diseño.

### 📍 [06. Referencias Técnicas](./06-referencias-tecnicas/)
- [README Arquitectura de Datos](./06-referencias-tecnicas/README_Arquitectura_Datos.md) — Guía de parches de migración RLS.
- [Políticas SQL RLS (0001_rls_policies.sql)](./06-referencias-tecnicas/0001_rls_policies.sql) — Referencia del script de políticas.

---

*Última actualización: Julio 2026 — Proyecto Barberías SaaS*
