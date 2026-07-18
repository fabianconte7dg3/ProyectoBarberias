import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  UnauthorizedException,
} from '@nestjs/common';
import { Observable, from, switchMap } from 'rxjs';
import { sql } from 'drizzle-orm';
import { Inject } from '@nestjs/common';
import { DRIZZLE_POOL_DB } from './database.constants';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../schema';
import { TenantContext } from './tenant-context';

/**
 * Aplica el patrón central de seguridad multi-tenant:
 *
 * 1. Extrae el tenant_id del request (JWT, header, etc. — ajustar a tu Auth real).
 * 2. Abre una transacción Postgres.
 * 3. Ejecuta SET LOCAL app.current_tenant_id dentro de ESA transacción
 *    (SET LOCAL vive solo hasta el COMMIT/ROLLBACK — no se filtra a otras
 *    requests aunque la conexión se recicle en el pool).
 * 4. Guarda esa transacción en AsyncLocalStorage para que todos los
 *    repositorios/servicios de la request la usen.
 *
 * Nota sobre PgBouncer: si usas "transaction pooling" (recomendado para
 * SaaS), esto funciona sin cambios porque SET LOCAL + COMMIT ocurren
 * dentro de la misma transacción lógica que PgBouncer no interrumpe.
 * Evita "session pooling" con SET (sin LOCAL) — ahí sí hay riesgo de fuga
 * de la variable de sesión entre tenants distintos.
 */
@Injectable()
export class TenantInterceptor implements NestInterceptor {
  constructor(
    @Inject(DRIZZLE_POOL_DB) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    // TODO: ajustar a tu mecanismo real de auth (JWT payload, sesión, etc.)
    const tenantId: string | undefined = request.user?.tenantId;

    if (!tenantId) {
      throw new UnauthorizedException('No se pudo resolver el tenant activo para esta request.');
    }

    return from(
      new Promise((resolve, reject) => {
        this.db
          .transaction(async (tx) => {
            await tx.execute(sql`SET LOCAL app.current_tenant_id = ${tenantId}`);

            // Ejecuta el resto del pipeline de NestJS (controller/service)
            // DENTRO de esta transacción y del AsyncLocalStorage.
            const result = await TenantContext.run({ tenantId, db: tx }, () =>
              firstValueFromObservable(next.handle()),
            );

            resolve(result);
            // La transacción hace commit automáticamente al terminar el callback
            // sin lanzar excepción; si algo lanza, se hace rollback.
          })
          .catch(reject);
      }),
    ).pipe(switchMap((result) => from(Promise.resolve(result))));
  }
}

// Helper mínimo para no traer rxjs `firstValueFrom` con sus edge cases de
// observables vacíos — los handlers de Nest siempre emiten un solo valor.
function firstValueFromObservable<T>(obs: Observable<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    obs.subscribe({ next: resolve, error: reject });
  });
}
