import { CreateProductoDto, UpdateProductoDto } from './dto/producto.dto';
export declare class ProductosService {
    create(dto: CreateProductoDto): Promise<any>;
    findAll(userRole?: string): Promise<any>;
    findOne(id: string, userRole?: string): Promise<any>;
    update(id: string, dto: UpdateProductoDto): Promise<any>;
    descontarStockAtomico(productoId: string, cantidad: number, txClient?: any): Promise<any>;
}
