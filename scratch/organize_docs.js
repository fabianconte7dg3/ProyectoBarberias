const fs = require('fs');
const path = require('path');

const docsDir = path.join(__dirname, '../docs');

// Definir carpetas a crear
const folders = [
  '01-vision-y-plan',
  '02-arquitectura-y-db',
  '03-integraciones',
  '04-hitos-y-changelogs',
  '05-diseno-y-ux',
  '06-referencias-tecnicas',
  'archives',
];

folders.forEach(f => {
  const dirPath = path.join(docsDir, f);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`📁 Creada carpeta: ${f}`);
  }
});

// Mapa de origen -> destino (relativos a docs/)
const moveMap = [
  // 01-vision-y-plan
  { from: 'IdeasSaas/Vision_Multi_Industria.md', to: '01-vision-y-plan/Vision_Multi_Industria.md' },
  { from: 'IdeasSaas/Roadmap_Backend.md', to: '01-vision-y-plan/Roadmap_Backend.md' },
  { from: 'IdeasSaas/Roadmap_Frontend.md', to: '01-vision-y-plan/Roadmap_Frontend.md' },
  { from: 'IdeasSaas/📋 Checklist Completa de Desarrollo SaaS (Actualizada).md', to: '01-vision-y-plan/Checklist_Desarrollo_SaaS.md' },
  { from: 'IdeasSaas/Fase3/✅ Estrategia de Precios.md', to: '01-vision-y-plan/Estrategia_Precios.md' },
  { from: 'IdeasSaas/Fase1/SaaS para Barberías y Salones en Panamá.md', to: '01-vision-y-plan/SaaS_Barberias_Panama.md' },
  { from: 'IdeasSaas/Fase1/Idea 1_ SaaS para Barberías y Salones de Belleza.md', to: '01-vision-y-plan/Idea_SaaS_Barberias.md' },

  // 02-arquitectura-y-db
  { from: 'IdeasSaas/Fase2/✅ Diseño del Esquema de Datos (ERD) - Diccionario de Tablas Principales.md', to: '02-arquitectura-y-db/Modelo_Base_Datos_ERD.md' },
  { from: 'IdeasSaas/Fase2/Modelo de base de datos.md', to: '02-arquitectura-y-db/Modelo_Base_Datos_General.md' },
  { from: 'IdeasSaas/Fase2/Motor de Base de Datos.md', to: '02-arquitectura-y-db/Motor_Base_Datos.md' },
  { from: 'IdeasSaas/Fase2/Consideraciones de seguridad.md', to: '02-arquitectura-y-db/Consideraciones_Seguridad.md' },
  { from: 'IdeasSaas/Fase1/Manejo de errores.md', to: '02-arquitectura-y-db/Manejo_de_Errores.md' },
  { from: 'IdeasSaas/Fase2/✅ Infraestructura de Servidores_ Modelo Híbrido (Local y Nube VPS).md', to: '02-arquitectura-y-db/Infraestructura_Hibrida.md' },
  { from: 'IdeasSaas/Fase2/stack web.md', to: '02-arquitectura-y-db/Stack_Web.md' },
  { from: 'IdeasSaas/Fase2/Escalabilidad y Crecimiento.md', to: '02-arquitectura-y-db/Escalabilidad_y_Crecimiento.md' },

  // 03-integraciones
  { from: 'IdeasSaas/Fase2/Integración Yappy API.md', to: '03-integraciones/Integracion_Yappy_API.md' },
  { from: 'IdeasSaas/Fase2/WhatsApp - Evolution API.md', to: '03-integraciones/WhatsApp_Evolution_API.md' },

  // 04-hitos-y-changelogs
  { from: 'RESUMEN_HITOS_Y_FLUJOS.md', to: '04-hitos-y-changelogs/RESUMEN_HITOS_Y_FLUJOS.md' },
  { from: 'CHANGELOG_Frontend_Hito2.md', to: '04-hitos-y-changelogs/CHANGELOG_Frontend_Hito2.md' },
  { from: 'CHANGELOG_Hito5.md', to: '04-hitos-y-changelogs/CHANGELOG_Hito5.md' },
  { from: 'WALKTHROUGH_PRODUCTOS_BARBEROS_Y_DASHBOARDS.md', to: '04-hitos-y-changelogs/WALKTHROUGH_PRODUCTOS_BARBEROS_Y_DASHBOARDS.md' },

  // 05-diseno-y-ux
  { from: 'IdeasSaas/Fase1/Perfil Operativo Flujo.md', to: '05-diseno-y-ux/Perfil_Operativo_Flujo.md' },
  { from: 'IdeasSaas/Fase1/Estructura del CRM.md', to: '05-diseno-y-ux/Estructura_CRM.md' },
  { from: 'IdeasSaas/Fase3/Wireframes_UI.md', to: '05-diseno-y-ux/Wireframes_UI.md' },
  { from: 'IdeasSaas/Fase3/🔲 Wireframes_ Las 9 Pantallas Clave a diseñar en Figma.md', to: '05-diseno-y-ux/Pantallas_Figma.md' },

  // 06-referencias-tecnicas
  { from: 'caludeinfo/README-arquitectura-datos.md', to: '06-referencias-tecnicas/README_Arquitectura_Datos.md' },
  { from: 'caludeinfo/0001_rls_policies.sql', to: '06-referencias-tecnicas/0001_rls_policies.sql' },
  { from: 'caludeinfo/schema.ts', to: '06-referencias-tecnicas/schema.ts' },
  { from: 'caludeinfo/citas.service.ts', to: '06-referencias-tecnicas/citas.service.ts' },
  { from: 'caludeinfo/database.module.ts', to: '06-referencias-tecnicas/database.module.ts' },
  { from: 'caludeinfo/drizzle.config.ts', to: '06-referencias-tecnicas/drizzle.config.ts' },
  { from: 'caludeinfo/tenant.interceptor.ts', to: '06-referencias-tecnicas/tenant.interceptor.ts' },

  // archives
  { from: 'IdeasSaas-20260718T025709Z-1-001.zip', to: 'archives/IdeasSaas-20260718T025709Z-1-001.zip' },
];

moveMap.forEach(item => {
  const src = path.join(docsDir, item.from);
  const dest = path.join(docsDir, item.to);
  if (fs.existsSync(src)) {
    fs.renameSync(src, dest);
    console.log(`✅ Movido: ${item.from} -> ${item.to}`);
  } else {
    console.warn(`⚠️ No encontrado: ${item.from}`);
  }
});

// Eliminar carpetas obsoletas si quedaron vacías
const removeDirs = [
  'IdeasSaas/Fase1',
  'IdeasSaas/Fase2',
  'IdeasSaas/Fase3',
  'IdeasSaas',
  'caludeinfo',
];

removeDirs.forEach(d => {
  const dirPath = path.join(docsDir, d);
  if (fs.existsSync(dirPath)) {
    try {
      fs.rmSync(dirPath, { recursive: true, force: true });
      console.log(`🗑️ Eliminada carpeta obsoleta: ${d}`);
    } catch (err) {
      console.error(`Error eliminando ${d}:`, err.message);
    }
  }
});

console.log('\n🎉 ¡Organización de documentación completada!');
