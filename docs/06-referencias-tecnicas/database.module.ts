import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { DRIZZLE_POOL_DB } from './tenant/database.constants';

/**
 * IMPORTANTE: el rol de Postgres usado en DATABASE_URL debe ser un rol de
 * aplicación normal (NOBYPASSRLS), nunca el superusuario/owner de las
 * tablas. Un rol con BYPASSRLS ignora TODAS las políticas RLS sin importar
 * FORCE ROW LEVEL SECURITY. Ver el comentario al final de
 * 0001_rls_policies.sql para crear ese rol.
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: DRIZZLE_POOL_DB,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const pool = new Pool({
          connectionString: config.get<string>('DATABASE_URL'),
          // Si usas PgBouncer en modo transaction pooling, mantener el pool
          // de la app pequeño y dejar que PgBouncer maneje la concurrencia real.
          max: config.get<number>('DB_POOL_MAX', 10),
        });
        return drizzle(pool, { schema });
      },
    },
  ],
  exports: [DRIZZLE_POOL_DB],
})
export class DatabaseModule {}
