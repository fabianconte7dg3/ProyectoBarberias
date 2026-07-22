/**
  Sanitización anti-inyección de fórmulas (OWASP CSV/Formula Injection Mitigation)
  Previene la ejecución de comandos o hipervínculos maliciosos al abrir archivos .csv / .xlsx en Microsoft Excel o Google Sheets.
 */

export function sanitizarCeldaExport(valor: any): string {
  if (valor === null || valor === undefined) {
    return '';
  }

  const str = String(valor);
  if (str.length === 0) return '';

  const primerCaracter = str.charAt(0);
  
  // OWASP: Si empieza con '=', '+', '-', '@', TAB (\t) o CR (\r), anteponer apóstrofe (')
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
