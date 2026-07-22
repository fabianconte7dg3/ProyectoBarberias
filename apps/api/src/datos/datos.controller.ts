import { Controller, Post, Get, Body, Query, Res, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { DatosService } from './datos.service';
import type { Response } from 'express';

@Controller('datos')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class DatosController {
  constructor(private readonly datosService: DatosService) {}

  @Post('importar/clientes')
  @UseInterceptors(FileInterceptor('file'))
  async importarClientes(@UploadedFile() file: any, @Body('rawCsv') rawCsv?: string) {
    let content = rawCsv;
    if (file && file.buffer) {
      content = file.buffer.toString('utf-8');
    }
    if (!content) {
      throw new BadRequestException('Por favor adjunta un archivo CSV o proporciona el contenido en texto.');
    }
    return this.datosService.importarClientes(content);
  }

  @Post('importar/productos')
  @UseInterceptors(FileInterceptor('file'))
  async importarProductos(@UploadedFile() file: any, @Body('rawCsv') rawCsv?: string) {
    let content = rawCsv;
    if (file && file.buffer) {
      content = file.buffer.toString('utf-8');
    }
    if (!content) {
      throw new BadRequestException('Por favor adjunta un archivo CSV o proporciona el contenido en texto.');
    }
    return this.datosService.importarProductos(content);
  }

  @Get('exportar/transacciones')
  async exportarTransacciones(
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
    @Res() res: Response
  ) {
    const csvContent = await this.datosService.exportarTransaccionesCsv(desde, hasta);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="transacciones_${Date.now()}.csv"`);
    res.status(200).send(csvContent);
  }

  @Get('exportar/clientes-marketing')
  async exportarClientesMarketing(@Res() res: Response) {
    const csvContent = await this.datosService.exportarClientesMarketingCsv();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="clientes_marketing_ley81_${Date.now()}.csv"`);
    res.status(200).send(csvContent);
  }

  @Get('exportar/nomina')
  async exportarNomina(
    @Query('desde') desde: string,
    @Query('hasta') hasta: string,
    @Res() res: Response
  ) {
    const csvContent = await this.datosService.exportarNominaCsv(desde, hasta);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="reporte_nomina_${Date.now()}.csv"`);
    res.status(200).send(csvContent);
  }

  @Get('plantilla')
  async descargarPlantilla(
    @Query('tipo') tipo: 'clientes' | 'productos',
    @Res() res: Response
  ) {
    if (tipo !== 'clientes' && tipo !== 'productos') {
      throw new BadRequestException('Tipo de plantilla no válido. Usa "clientes" o "productos".');
    }
    const csvContent = this.datosService.obtenerPlantillaCsv(tipo);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="plantilla_${tipo}.csv"`);
    res.status(200).send(csvContent);
  }
}
