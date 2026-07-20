import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { TenantContext } from '../database/tenant/tenant-context';
import { citas, transacciones, usuarios, servicios } from '../database/schema';
import { eq } from 'drizzle-orm';
import { CobrarCitaDto } from './dto/cobrar-cita.dto';
import { YappyService } from '../yappy/yappy.service';
import { DgiService } from '../dgi/dgi.service';
import { nanoid } from 'nanoid';

@Injectable()
export class TransaccionesService {
  constructor(
    private readonly yappyService: YappyService,
    private readonly dgiService: DgiService,
  ) {}

  async cobrarCita(citaId: string, dto: CobrarCitaDto) {
    const db = TenantContext.getDb();
    const tenantId = TenantContext.getTenantId();

    // 1. Obtener la cita con sus relaciones
    const cita = await db.query.citas.findFirst({
      where: eq(citas.id, citaId),
      with: {
        barbero: true,
        servicio: true,
      },
    });

    if (!cita) {
      throw new NotFoundException('Cita no encontrada');
    }

    if (cita.estado !== 'programada' && cita.estado !== 'en_curso') {
      throw new ConflictException(`No se puede cobrar una cita en estado: ${cita.estado}`);
    }

    // 2. Calcular montos
    const totalFacturado = Number(cita.servicio.precioBase);
    const porcentajeComision = Number(cita.barbero.porcentajeComision || 0);
    const comisionBarbero = (totalFacturado * porcentajeComision) / 100;

    // 3. Crear transacción y actualizar cita (Atómico, ya estamos dentro de una tx gracias al interceptor, 
    // pero para asegurar atomicidad si lo llamamos desde otro lado, podríamos usar db.transaction. 
    // Sin embargo, el tenant context asume que db ya es una tx si viene del interceptor.
    // Drizzle permite hacer sub-transacciones).
    
    // Asumimos que `db` ya es una transacción o la base de datos principal. 
    // Si viene del TenantInterceptor, ES una transacción.
    
    const yappyOrderId = dto.metodoPago === 'yappy' ? nanoid(12) : null;

    const [nuevaTransaccion] = await db.insert(transacciones).values({
      tenantId,
      citaId: cita.id,
      metodoPago: dto.metodoPago,
      totalFacturado: totalFacturado.toString(),
      montoEfectivoIngresado: dto.montoEfectivoIngresado ? dto.montoEfectivoIngresado.toString() : null,
      comisionBarbero: comisionBarbero.toString(),
      propinaBarbero: dto.propinaBarbero ? dto.propinaBarbero.toString() : '0',
      rucCliente: dto.rucCliente,
      nombreFiscalCliente: dto.nombreFiscalCliente,
      yappyOrderId,
    }).returning();

    // Si es yappy, iniciamos el pago. La cita no se marca completada hasta que se procese el IPN?
    // Depende del negocio. Si es manual el pago ya se verificó visualmente. 
    // Por simplicidad, si es yappy, delegamos al servicio y si es manual se aprueba, 
    // pero para comercial devolvemos los datos para el frontend.
    let yappyData = null;
    if (dto.metodoPago === 'yappy') {
      yappyData = await this.yappyService.initiatePayment(tenantId, yappyOrderId!, totalFacturado);
    }

    // Solo marcamos como completada si NO es comercial, o si lo permitimos asumiendo éxito
    // Normalmente, si yappyData.modo === 'comercial', esperamos al IPN para completarla.
    if (dto.metodoPago !== 'yappy' || (yappyData && yappyData.modo === 'manual')) {
      await db.update(citas)
        .set({ estado: 'completada' })
        .where(eq(citas.id, cita.id));
        
      // Emitir factura a DGI asincronamente
      this.dgiService.emitirFacturaAsync(
        tenantId,
        nuevaTransaccion.id,
        nuevaTransaccion.totalFacturado,
        dto.rucCliente,
        dto.nombreFiscalCliente
      ).catch(err => console.error('Error al emitir factura a DGI:', err));
    }

    return { transaccion: nuevaTransaccion, yappyData };
  }

  async findAll(page: number = 1, limit: number = 20) {
    const db = TenantContext.getDb();
    const offset = (page - 1) * limit;

    const data = await db.query.transacciones.findMany({
      limit,
      offset,
      orderBy: (transacciones, { desc }) => [desc(transacciones.createdAt)],
      with: {
        cita: {
          with: {
            cliente: true,
            barbero: true,
            servicio: true,
          }
        }
      }
    });

    return { data, page, limit };
  }
}

