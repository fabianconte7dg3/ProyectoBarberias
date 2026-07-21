import { ProductosService } from './productos.service';
import { CreateProductoDto, UpdateProductoDto } from './dto/producto.dto';
export declare class ProductosController {
    private readonly productosService;
    constructor(productosService: ProductosService);
    create(dto: CreateProductoDto): Promise<any>;
    findAll(req: any): Promise<any>;
    findOne(id: string, req: any): Promise<any>;
    update(id: string, dto: UpdateProductoDto): Promise<any>;
}
