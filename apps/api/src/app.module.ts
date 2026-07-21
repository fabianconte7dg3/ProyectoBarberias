import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { TenantInterceptor } from './database/tenant/tenant.interceptor';
import { AuthModule } from './auth/auth.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { ServiciosModule } from './servicios/servicios.module';
import { ClientesModule } from './clientes/clientes.module';
import { HorariosModule } from './horarios/horarios.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { CitasModule } from './citas/citas.module';
import { TransaccionesModule } from './transacciones/transacciones.module';
import { YappyModule } from './yappy/yappy.module';
import { DgiModule } from './dgi/dgi.module';
import { CajaModule } from './caja/caja.module';
import { ReportesModule } from './reportes/reportes.module';

import { BullModule } from '@nestjs/bullmq';
import { QueueModule } from './queue/queue.module';
import { AuditModule } from './audit/audit.module';
import { KillSwitchGuard } from './common/guards/kill-switch.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 10,
    }]),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
        },
      }),
      inject: [ConfigService],
    }),
    DatabaseModule,
    AuditModule,
    AuthModule,
    UsuariosModule,
    ServiciosModule,
    ClientesModule,
    HorariosModule,
    CitasModule,
    TransaccionesModule,
    YappyModule,
    DgiModule,
    CajaModule,
    ReportesModule,
    QueueModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: KillSwitchGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantInterceptor,
    },
  ],
})
export class AppModule {}
