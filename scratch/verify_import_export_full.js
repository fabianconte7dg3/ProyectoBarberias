const ExcelJS = require('exceljs');

function sanitizarCeldaExport(valor) {
  if (valor === null || valor === undefined) return '';
  const str = String(valor);
  if (str.length === 0) return '';
  const primerCaracter = str.charAt(0);
  if (
    primerCaracter === '=' ||
    primerCaracter === '+' ||
    primerCaracter === '-' ||
    primerCaracter === '@' ||
    primerCaracter === '\t' ||
    primerCaracter === '\r'
  ) {
    return `'${str}`;
  }
  return str;
}

async function verifyAll() {
  console.log('====================================================');
  console.log('VERIFICACIÓN DEL MÓDULO DE IMPORTACIÓN Y EXPORTACIÓN');
  console.log('====================================================\n');

  // TEST 1: Proteccion Anti-Formula Injection (OWASP)
  console.log('[TEST 1] Sanitización de celda anti-inyección OWASP');
  const peligrosos = ['=cmd|\'/c calc\'!A1', '+1+2', '-100', '@HYPERLINK(...)', '\tTAB', '\rCR'];
  for (const p of peligrosos) {
    const sanitizado = sanitizarCeldaExport(p);
    if (!sanitizado.startsWith("'")) {
      throw new Error(`TEST 1 FALLIDO: Cadena "${p}" no fue sanitizada con apóstrofe. Resultado: "${sanitizado}"`);
    }
  }
  console.log('  ✔ Correcto: Todas las celdas con prefijo peligroso fueron neutralizadas con apóstrofe (\')\n');

  // TEST 2: Generación de Excel .xlsx y lectura de celda sanitizada
  console.log('[TEST 2] Generación y lectura de archivo Excel .xlsx sanitizado');
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Reporte Nomina');
  ws.columns = [
    { header: 'Barbero', key: 'barbero', width: 25 },
    { header: 'Notas', key: 'notas', width: 30 }
  ];
  ws.addRow({ barbero: 'Carlos Admin', notas: sanitizarCeldaExport('=cmd|\'/c calc\'!A1') });

  const excelBuffer = await wb.xlsx.writeBuffer();
  const wbRead = new ExcelJS.Workbook();
  await wbRead.xlsx.load(excelBuffer);
  const readVal = wbRead.worksheets[0].getRow(2).getCell(2).value;

  if (String(readVal) !== "'=cmd|'/c calc'!A1") {
    throw new Error(`TEST 2 FALLIDO: La celda en el archivo Excel no contiene el apóstrofe. Valor: ${readVal}`);
  }
  console.log('  ✔ Correcto: El archivo .xlsx generado contiene el texto literal neutralizado: "' + readVal + '"\n');

  console.log('====================================================');
  console.log('✅ TODAS LAS PRUEBAS DE VERIFICACIÓN PASARON CON ÉXITO');
  console.log('====================================================');
}

verifyAll().catch(err => {
  console.error('❌ ERROR EN LA VERIFICACIÓN:', err);
  process.exit(1);
});
