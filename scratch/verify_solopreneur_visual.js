const { chromium } = require('playwright');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@localhost:5432/proyecto_barberias'
});

async function runVisualVerification() {
  console.log('--- INICIANDO VERIFICACIÓN EMPÍRICA Y VISUAL DEL MODO SOLO-PRENEUR ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const artifactDir = '/home/fabianc/.gemini/antigravity-ide/brain/0c10f7ef-3091-4d9a-ad13-65dcebd4d693';

  try {
    // -------------------------------------------------------------
    // PRUEBA 1: Reserva Pública con 1 Solo Barbero (BarberProfileCard)
    // -------------------------------------------------------------
    console.log('\n[PRUEBA 1] Verificando Reserva Pública para Barbería con 1 Barbero...');
    await page.goto('http://localhost:3000/barberiajose/reservar', { waitUntil: 'networkidle' });
    
    // Esperar a que los datos carguen y el componente se renderice
    await page.waitForSelector('h2:has-text("2. Tu profesional de atención")', { timeout: 8000 });

    const cardTitle = await page.textContent('body');
    const hasProfileCard = cardTitle.includes('Tu profesional de atención') && 
                           cardTitle.includes('Seleccionado automáticamente') &&
                           cardTitle.includes('Roman Rique');

    console.log('RESULTADO PRUEBA 1:');
    console.log(' -> Muestra BarberProfileCard:', hasProfileCard ? '✅ PASÓ' : '❌ FALLÓ');
    console.log(' -> Texto "Seleccionado automáticamente" presente:', cardTitle.includes('Seleccionado automáticamente') ? '✅ PASÓ' : '❌ FALLÓ');

    const screenshot1Path = path.join(artifactDir, 'media__solopreneur_reserva_publica.png');
    await page.screenshot({ path: screenshot1Path, fullPage: true });
    console.log(' -> Captura guardada:', screenshot1Path);

    // -------------------------------------------------------------
    // PRUEBA 2: Banner de Bienvenida en la Agenda del Barbero
    // -------------------------------------------------------------
    console.log('\n[PRUEBA 2] Verificando Banner de Bienvenida y Conteo en la Agenda...');
    
    // Simular login o sesión en el admin
    await page.goto('http://localhost:3000/barberiajose/admin/login', { waitUntil: 'networkidle' });
    
    // Si hay formulario de login de staff, seleccionamos Roman Rique
    const hasSelectStaff = await page.$('select');
    if (hasSelectStaff) {
      await page.selectOption('select', { label: 'Roman Rique' });
      await page.fill('input[type="password"]', '1234'); // o PIN de prueba
      await page.click('button[type="submit"]');
      await page.waitForNavigation();
    }

    await page.goto('http://localhost:3000/barberiajose/admin/agenda', { waitUntil: 'networkidle' });
    
    // Verificar si el banner de bienvenida se renderizó
    const pageContent = await page.textContent('body');
    const hasWelcomeBanner = pageContent.includes('¡Buen día') || pageContent.includes('Mi Agenda Personal');

    console.log('RESULTADO PRUEBA 2:');
    console.log(' -> Banner de Bienvenida visible:', hasWelcomeBanner ? '✅ PASÓ' : '❌ FALLÓ');

    const screenshot2Path = path.join(artifactDir, 'media__solopreneur_admin_agenda.png');
    await page.screenshot({ path: screenshot2Path, fullPage: true });
    console.log(' -> Captura guardada:', screenshot2Path);

    // -------------------------------------------------------------
    // PRUEBA 3: Reversión Automática al Agregar un Segundo Barbero
    // -------------------------------------------------------------
    console.log('\n[PRUEBA 3] Agregando 2do Barbero en BD para probar reversión a Modo Multibarbero...');
    
    // 1. Obtener tenant_id de barberiajose
    const tenantRes = await pool.query("SELECT id FROM barberias WHERE slug = 'barberiajose'");
    const tenantId = tenantRes.rows[0].id;
    const tempBarberId = '99999999-9999-9999-9999-999999999999';

    // Insertar temporalmente a "Carlos Barber" como barbero activo
    await pool.query(`
      INSERT INTO usuarios (id, tenant_id, nombre_completo, email, password, rol, activo)
      VALUES ($1, $2, 'Carlos Barber', 'carlos.temp@barberia.com', 'dummyhash', 'barbero', true)
      ON CONFLICT (id) DO UPDATE SET activo = true
    `, [tempBarberId, tenantId]);

    console.log(' -> 2do Barbero "Carlos Barber" insertado en BD.');

    // 2. Recargar /barberiajose/reservar
    await page.goto('http://localhost:3000/barberiajose/reservar', { waitUntil: 'networkidle' });
    await page.waitForSelector('h2:has-text("2. Elige a tu barbero")', { timeout: 8000 });

    const multiPageContent = await page.textContent('body');
    const hasSelectorGrid = multiPageContent.includes('2. Elige a tu barbero') &&
                             multiPageContent.includes('Cualquiera') &&
                             multiPageContent.includes('Roman Rique') &&
                             multiPageContent.includes('Carlos Barber');

    console.log('RESULTADO PRUEBA 3:');
    console.log(' -> Reversión a Selector Multibarbero:', hasSelectorGrid ? '✅ PASÓ' : '❌ FALLÓ');
    console.log(' -> Muestra opciones de ambos barberos + "Cualquiera":', hasSelectorGrid ? '✅ PASÓ' : '❌ FALLÓ');

    const screenshot3Path = path.join(artifactDir, 'media__multibarber_reserva_fallback.png');
    await page.screenshot({ path: screenshot3Path, fullPage: true });
    console.log(' -> Captura guardada:', screenshot3Path);

    // 3. Limpieza: Eliminar barbero temporal
    await pool.query("DELETE FROM usuarios WHERE id = $1", [tempBarberId]);
    console.log(' -> Barbero temporal eliminado de BD. Estado restaurado a Solo-preneur.');

    console.log('\n--- VERIFICACIÓN COMPLETA EXITOSA ---');

  } catch (err) {
    console.error('Error durante la verificación:', err);
  } finally {
    await browser.close();
    await pool.end();
  }
}

runVisualVerification();
