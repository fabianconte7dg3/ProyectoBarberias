"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParserService = void 0;
const common_1 = require("@nestjs/common");
const ExcelJS = __importStar(require("exceljs"));
const stream_1 = require("stream");
let ParserService = class ParserService {
    MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
    MAX_ROWS = 5000;
    async parseFile(fileBuffer, fileName) {
        if (fileBuffer.length > this.MAX_FILE_SIZE_BYTES) {
            throw new common_1.BadRequestException('El archivo excede el tamaño máximo permitido de 10MB.');
        }
        const extension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
        const workbook = new ExcelJS.Workbook();
        try {
            if (extension === '.csv') {
                const stream = stream_1.Readable.from(fileBuffer);
                await workbook.csv.read(stream);
            }
            else if (extension === '.xlsx' || extension === '.xls') {
                await workbook.xlsx.load(fileBuffer);
            }
            else {
                throw new common_1.BadRequestException('Formato de archivo no soportado. Formatos válidos: .csv, .xlsx');
            }
        }
        catch (err) {
            if (err instanceof common_1.BadRequestException)
                throw err;
            throw new common_1.BadRequestException('No se pudo procesar la estructura del archivo. Verifica que no esté corrupto.');
        }
        const worksheet = workbook.worksheets[0];
        if (!worksheet || worksheet.rowCount <= 1) {
            throw new common_1.BadRequestException('El archivo está vacío o no contiene filas de datos.');
        }
        const headerRow = worksheet.getRow(1);
        const headers = [];
        headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            const headerVal = String(cell.value || '').trim();
            headers[colNumber] = headerVal;
        });
        const results = [];
        let dataRowCount = 0;
        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
            if (rowNumber === 1)
                return;
            dataRowCount++;
            if (dataRowCount > this.MAX_ROWS) {
                throw new common_1.BadRequestException(`El archivo excede el límite máximo de ${this.MAX_ROWS} filas.`);
            }
            const rowData = {};
            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                const rawHeader = headers[colNumber];
                if (!rawHeader)
                    return;
                const cleanKey = this.normalizarClave(rawHeader);
                if (cleanKey === 'tenantid' ||
                    cleanKey === 'tenant_id' ||
                    cleanKey === 'tenant') {
                    return;
                }
                let val = cell.value;
                if (cell.type === ExcelJS.ValueType.Formula && cell.result !== undefined) {
                    val = cell.result;
                }
                else if (typeof val === 'object' && val !== null && 'text' in val) {
                    val = val.text;
                }
                rowData[cleanKey] = val !== null && val !== undefined ? String(val).trim() : undefined;
            });
            if (Object.values(rowData).some((v) => v !== undefined && v !== '')) {
                results.push({
                    rowNumber,
                    data: rowData,
                });
            }
        });
        if (results.length === 0) {
            throw new common_1.BadRequestException('El archivo no contiene filas válidas para procesar.');
        }
        return results;
    }
    normalizarClave(key) {
        return key
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]/g, '');
    }
};
exports.ParserService = ParserService;
exports.ParserService = ParserService = __decorate([
    (0, common_1.Injectable)()
], ParserService);
//# sourceMappingURL=parser.service.js.map