import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { TenantContext } from '../database/tenant/tenant-context';
import { citas, transacciones, usuarios, servicios } from '../database/schema';
import { eq } from 'drizzle-orm';
import { CobrarCitaDto } from './dto/cobrar-cita.dto';

@Injectable()
export class TransaccionesService {
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
    }).returning();

    await db.update(citas)
      .set({ estado: 'completada' })
      .where(eq(citas.id, cita.id));

    // TODO: Si el método de pago es Yappy, llamar al servicio de Yappy (YappyPort).
    // TODO: Llamar a DgiService (async) si aplica.

    return nuevaTransaccion;
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

