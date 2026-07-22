export interface ParsedRow {
    rowNumber: number;
    data: Record<string, any>;
}
export declare class ParserService {
    private readonly MAX_FILE_SIZE_BYTES;
    private readonly MAX_ROWS;
    parseFile(fileBuffer: Buffer, fileName: string): Promise<ParsedRow[]>;
    private normalizarClave;
}
