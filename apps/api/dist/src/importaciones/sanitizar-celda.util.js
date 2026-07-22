"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizarCeldaExport = sanitizarCeldaExport;
function sanitizarCeldaExport(valor) {
    if (valor === null || valor === undefined) {
        return '';
    }
    const str = String(valor);
    if (str.length === 0)
        return '';
    const primerCaracter = str.charAt(0);
    if (primerCaracter === '=' ||
        primerCaracter === '+' ||
        primerCaracter === '-' ||
        primerCaracter === '@' ||
        primerCaracter === '\t' ||
        primerCaracter === '\r') {
        return `'${str}`;
    }
    return str;
}
//# sourceMappingURL=sanitizar-celda.util.js.map