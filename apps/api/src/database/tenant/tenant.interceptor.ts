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
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  constructor(
    @Inject(DRIZZLE_POOL_DB) private readonly db: NodePgDatabase<typeof schema>,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const tenantId: string | undefined = request.user?.tenantId;

    if (!tenantId) {
      throw new UnauthorizedException('No se pudo resolver el tenant activo para esta request.');
    }

    return from(
      new Promise((resolve, reject) => {
        this.db
          .transaction(async (tx) => {
            await tx.execute(sql.raw(`SET LOCAL ROLE app_user`));
            await tx.execute(sql.raw(`SET LOCAL app.current_tenant_id = '${tenantId}'`));

            const result = await TenantContext.run({ tenantId, db: tx }, () =>
              firstValueFromObservable(next.handle()),
            );

            return result;
          })
          .then(resolve)
          .catch((err) => {
            console.error("Interceptor caught error:", err, "Code:", err?.code);
            reject(err);
          });
      }),
    ).pipe(switchMap((result) => from(Promise.resolve(result))));
  }
}

function firstValueFromObservable<T>(obs: Observable<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    obs.subscribe({ next: resolve, error: reject });
  });
}
