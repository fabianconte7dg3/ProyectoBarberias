"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeCsvCell = sanitizeCsvCell;
exports.parseCsvContent = parseCsvContent;
function sanitizeCsvCell(val) {
    if (val === null || val === undefined) {
        return '""';
    }
    let str = String(val).trim();
    if (/^[=+\-@\t\r]/.test(str)) {
        str = `'${str}`;
    }
    if (str.includes('"')) {
        str = str.replace(/"/g, '""');
    }
    if (/[",\n\r]/.test(str) || str.startsWith("'")) {
        return `"${str}"`;
    }
    return str;
}
function parseCsvContent(csvString) {
    const lines = [];
    let currentRow = [];
    let currentCell = '';
    let insideQuotes = false;
    for (let i = 0; i < csvString.length; i++) {
        const char = csvString[i];
        const nextChar = csvString[i + 1];
        if (char === '"') {
            if (insideQuotes && nextChar === '"') {
                currentCell += '"';
                i++;
            }
            else {
                insideQuotes = !insideQuotes;
            }
        }
        else if (char === ',' && !insideQuotes) {
            currentRow.push(currentCell.trim());
            currentCell = '';
        }
        else if ((char === '\n' || char === '\r') && !insideQuotes) {
            if (char === '\r' && nextChar === '\n') {
                i++;
            }
            currentRow.push(currentCell.trim());
            if (currentRow.some(c => c.length > 0)) {
                lines.push(currentRow);
            }
            currentRow = [];
            currentCell = '';
        }
        else {
            currentCell += char;
        }
    }
    if (currentCell.length > 0 || currentRow.length > 0) {
        currentRow.push(currentCell.trim());
        if (currentRow.some(c => c.length > 0)) {
            lines.push(currentRow);
        }
    }
    if (lines.length < 2) {
        return [];
    }
    const headers = lines[0].map(h => h.toLowerCase().replace(/[^a-z0-9_]/g, ''));
    const result = [];
    for (let r = 1; r < lines.length; r++) {
        const row = lines[r];
        const item = {};
        for (let c = 0; c < headers.length; c++) {
            item[headers[c]] = row[c] !== undefined ? row[c] : '';
        }
        result.push(item);
    }
    return result;
}
//# sourceMappingURL=datos.utils.js.map