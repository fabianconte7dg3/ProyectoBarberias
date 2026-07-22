import { Injectable, BadRequestException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { Readable } from 'stream';

export interface ParsedRow {
  rowNumber: number;
  data: Record<string, any>;
}

@Injectable()
export class ParserService {
  private readonly MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
  private readonly MAX_ROWS = 5000;

  async parseFile(fileBuffer: Buffer, fileName: string): Promise<ParsedRow[]> {
    if (fileBuffer.length > this.MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException('El archivo excede el tamaño máximo permitido de 10MB.');
    }

    const extension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
    const workbook = new ExcelJS.Workbook();

    try {
      if (extension === '.csv') {
        const stream = Readable.from(fileBuffer);
        await workbook.csv.read(stream);
      } else if (extension === '.xlsx' || extension === '.xls') {
        await workbook.xlsx.load(fileBuffer as any);
      } else {
        throw new BadRequestException('Formato de archivo no soportado. Formatos válidos: .csv, .xlsx');
      }
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException('No se pudo procesar la estructura del archivo. Verifica que no esté corrupto.');
    }

    const worksheet = workbook.worksheets[0];
    if (!worksheet || worksheet.rowCount <= 1) {
      throw new BadRequestException('El archivo está vacío o no contiene filas de datos.');
    }

    // 1. Mapear Encabezados de la Fila 1
    const headerRow = worksheet.getRow(1);
    const headers: string[] = [];

    headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const headerVal = String(cell.value || '').trim();
      headers[colNumber] = headerVal;
    });

    const results: ParsedRow[] = [];
    let dataRowCount = 0;

    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return; // Ignorar encabezado

      dataRowCount++;
      if (dataRowCount > this.MAX_ROWS) {
        throw new BadRequestException(`El archivo excede el límite máximo de ${this.MAX_ROWS} filas.`);
      }

      const rowData: Record<string, any> = {};

      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const rawHeader = headers[colNumber];
        if (!rawHeader) return;

        // Normalizar clave de encabezado
        const cleanKey = this.normalizarClave(rawHeader);

        // REGLA DE SEGURIDAD CRÍTICA: Desestimar explícitamente tenantId proveniente del archivo
        if (
          cleanKey === 'tenantid' ||
          cleanKey === 'tenant_id' ||
          cleanKey === 'tenant'
        ) {
          return;
        }

        // Obtener valor plano de la celda
        let val = cell.value;
        if (cell.type === ExcelJS.ValueType.Formula && cell.result !== undefined) {
          val = cell.result;
        } else if (typeof val === 'object' && val !== null && 'text' in val) {
          val = (val as any).text;
        }

        rowData[cleanKey] = val !== null && val !== undefined ? String(val).trim() : undefined;
      });

      // Solo agregar si la fila tiene al menos algún dato
      if (Object.values(rowData).some((v) => v !== undefined && v !== '')) {
        results.push({
          rowNumber,
          data: rowData,
        });
      }
    });

    if (results.length === 0) {
      throw new BadRequestException('El archivo no contiene filas válidas para procesar.');
    }

    return results;
  }

  private normalizarClave(key: string): string {
    return key
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
  }
}
