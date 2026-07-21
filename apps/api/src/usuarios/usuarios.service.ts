import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DRIZZLE_POOL_DB } from '../database/tenant/database.constants';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { eq, and, sql } from 'drizzle-orm';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { InviteStaffDto } from './dto/invite-staff.dto';
import { ActivateStaffDto } from './dto/activate-staff.dto';
import { TenantContext } from '../database/tenant/tenant-context';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class UsuariosService {
  constructor(
    @Inject(DRIZZLE_POOL_DB) private readonly db: NodePgDatabase<typeof schema>,
    private readonly auditService: AuditService,
  ) {}

  async inviteStaff(dto: InviteStaffDto, tenantId: string) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48); // 48 horas de vigencia

    const txDb = TenantContext.getDb();
    const [nuevoUsuario] = await txDb.insert(schema.usuarios).values({
      tenantId,
      nombreCompleto: dto.nombreCompleto,
      rol: dto.rol,
      porcentajeComision: dto.porcentajeComision ? dto.porcentajeComision.toString() : null,
      tokenActivacion: token,
      tokenExpiraEn: expiresAt,
      activo: false, // Inactivo hasta que establezca el PIN
    }).returning({ id: schema.usuarios.id, token: schema.usuarios.tokenActivacion });

    return {
      message: 'Invitación generada con éxito.',
      activationToken: nuevoUsuario.token,
    };
  }

  async toggleKillSwitch(tenantId: string, adminId: string, activo: boolean, ipOrigen?: string, userAgent?: string) {
    // El tenantId del admin que ejecuta esto ya está forzado por el interceptor RLS.
    // Solo permitimos modificar el propio tenant.
    const txDb = TenantContext.getDb();
    
    // Obtenemos el estado anterior
    const [barberiaActual] = await txDb.select({ killSwitchActivo: schema.barberias.killSwitchActivo })
      .from(schema.barberias)
      .where(eq(schema.barberias.id, tenantId));

    if (!barberiaActual) {
      throw new NotFoundException('Barbería no encontrada.');
    }

    if (barberiaActual.killSwitchActivo === activo) {
      return { message: `El Kill Switch ya se encuentra ${activo ? 'activado' : 'desactivado'}.` };
    }

    await txDb.update(schema.barberias)
      .set({ killSwitchActivo: activo })
      .where(eq(schema.barberias.id, tenantId));

    await this.auditService.logAction({
      tenantId,
      usuarioId: adminId,
      tablaAfectada: 'barberias',
      registroId: tenantId,
      accion: 'kill_switch',
      payloadAntes: { killSwitchActivo: barberiaActual.killSwitchActivo },
      payloadDespues: { killSwitchActivo: activo },
      ipOrigen,
      userAgent
    });

    return {
      message: `El Kill Switch ha sido ${activo ? 'ACTIVADO. Todas las mutaciones están bloqueadas.' : 'DESACTIVADO. Sistema operando normalmente.'}`,
      killSwitchActivo: activo
    };
  }

  async activateStaff(dto: ActivateStaffDto) {
    // Buscar globalmente por token (no requiere tenantId en el request, por eso puede ser Public)
    const result = await this.db.execute(sql`SELECT id, tenant_id as "tenantId", token_expira_en as "tokenExpiraEn" FROM auth_get_user_by_token(${dto.token})`);
    const usuario = result.rows[0] as any;

    if (!usuario) {
      throw new NotFoundException('Token inválido o no encontrado.');
    }

    if (usuario.tokenExpiraEn && usuario.tokenExpiraEn < new Date()) {
      throw new BadRequestException('El token ha expirado.');
    }

    const hashedPin = await bcrypt.hash(dto.pin, 10);

    // Como esta ruta es public, necesitamos asegurar el tenant_id si vamos a hacer un update usando el interceptor?
    // En este caso, haremos el update directamente, pero debemos asegurar que el RLS lo permita,
    // o hacer el update abriendo una transacción con el tenantId del usuario encontrado.
    await this.db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${usuario.tenantId}, true)`);
      
      await tx.update(schema.usuarios)
        .set({
          pinAcceso: hashedPin,
          tokenActivacion: null,
          tokenExpiraEn: null,
          activo: true, // Activar la cuenta
        })
        .where(eq(schema.usuarios.id, usuario.id));
    });

    return { message: 'Cuenta activada exitosamente. Ya puedes iniciar sesión con tu PIN.' };
  }

  async findAll() {
    const db = TenantContext.getDb();
    // Esta consulta no tiene 'where tenantId = ...'
    // El RLS a nivel de base de datos filtrará automáticamente solo los usuarios del tenant actual!
    return db.query.usuarios.findMany();
  }

  async findOne(id: string) {
    const db = TenantContext.getDb();
    const usuario = await db.query.usuarios.findFirst({
      where: eq(schema.usuarios.id, id),
    });

    if (!usuario) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado.`);
    }
    
    return usuario;
  }
}
