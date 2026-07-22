import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Req,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from '../common/decorators/roles.decorator';
import { ImportacionesService } from './importaciones.service';
import type { Response, Request } from 'express';

@Controller()
export class ImportacionesController {
  constructor(private readonly importacionesService: ImportacionesService) {}

  @Roles('admin')
  @Post('importaciones/:tipo')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    })
  )
  async importar(
    @Param('tipo') tipo: 'clientes' | 'productos' | 'servicios',
    @UploadedFile() file: any,
    @Req() req: Request
  ) {
    if (!file) {
      throw new BadRequestException('Debes subir un archivo CSV o Excel (.xlsx).');
    }

    if (!['clientes', 'productos', 'servicios'].includes(tipo)) {
      throw new BadRequestException('Tipo de importación inválido. Opciones: clientes, productos, servicios');
    }

    const usuarioId = (req as any).user.userId;

    return this.importacionesService.crearTrabajoImportacion(
      file.buffer,
      file.originalname,
      tipo,
      usuarioId
    );
  }

  @Roles('admin')
  @Get('importaciones/:trabajoId')
  async obtenerTrabajo(@Param('trabajoId') trabajoId: string) {
    return this.importacionesService.obtenerTrabajo(trabajoId);
  }

  @Roles('admin')
  @Get('exportaciones/financiero')
  async exportarFinanciero(
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
    @Res() res: Response
  ) {
    const fileBuffer = await this.importacionesService.exportarFinanciero(desde, hasta);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=reporte_financiero_${Date.now()}.xlsx`);
    res.status(HttpStatus.OK).send(fileBuffer);
  }

  @Roles('admin')
  @Get('exportaciones/nomina')
  async exportarNomina(
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
    @Res() res: Response
  ) {
    const fileBuffer = await this.importacionesService.exportarNomina(desde, hasta);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=reporte_nomina_${Date.now()}.xlsx`);
    res.status(HttpStatus.OK).send(fileBuffer);
  }

  @Roles('admin')
  @Get('exportaciones/clientes-marketing')
  async exportarClientesMarketing(@Res() res: Response) {
    const fileBuffer = await this.importacionesService.exportarClientesMarketing();
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=clientes_marketing_ley81_${Date.now()}.xlsx`);
    res.status(HttpStatus.OK).send(fileBuffer);
  }
}
