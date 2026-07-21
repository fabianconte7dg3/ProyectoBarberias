"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const config_1 = require("@nestjs/config");
const throttler_1 = require("@nestjs/throttler");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const database_module_1 = require("./database/database.module");
const tenant_interceptor_1 = require("./database/tenant/tenant.interceptor");
const auth_module_1 = require("./auth/auth.module");
const usuarios_module_1 = require("./usuarios/usuarios.module");
const servicios_module_1 = require("./servicios/servicios.module");
const productos_module_1 = require("./productos/productos.module");
const clientes_module_1 = require("./clientes/clientes.module");
const horarios_module_1 = require("./horarios/horarios.module");
const jwt_auth_guard_1 = require("./common/guards/jwt-auth.guard");
const roles_guard_1 = require("./common/guards/roles.guard");
const citas_module_1 = require("./citas/citas.module");
const transacciones_module_1 = require("./transacciones/transacciones.module");
const yappy_module_1 = require("./yappy/yappy.module");
const dgi_module_1 = require("./dgi/dgi.module");
const caja_module_1 = require("./caja/caja.module");
const reportes_module_1 = require("./reportes/reportes.module");
const bullmq_1 = require("@nestjs/bullmq");
const queue_module_1 = require("./queue/queue.module");
const audit_module_1 = require("./audit/audit.module");
const kill_switch_guard_1 = require("./common/guards/kill-switch.guard");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            throttler_1.ThrottlerModule.forRoot([{
                    ttl: 60000,
                    limit: 10,
                }]),
            bullmq_1.BullModule.forRootAsync({
                imports: [config_1.ConfigModule],
                useFactory: async (configService) => ({
                    connection: {
                        host: configService.get('REDIS_HOST', 'localhost'),
                        port: configService.get('REDIS_PORT', 6379),
                    },
                }),
                inject: [config_1.ConfigService],
            }),
            database_module_1.DatabaseModule,
            audit_module_1.AuditModule,
            auth_module_1.AuthModule,
            usuarios_module_1.UsuariosModule,
            servicios_module_1.ServiciosModule,
            productos_module_1.ProductosModule,
            clientes_module_1.ClientesModule,
            horarios_module_1.HorariosModule,
            citas_module_1.CitasModule,
            transacciones_module_1.TransaccionesModule,
            yappy_module_1.YappyModule,
            dgi_module_1.DgiModule,
            caja_module_1.CajaModule,
            reportes_module_1.ReportesModule,
            queue_module_1.QueueModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [
            app_service_1.AppService,
            {
                provide: core_1.APP_INTERCEPTOR,
                useClass: tenant_interceptor_1.TenantInterceptor,
            },
            {
                provide: core_1.APP_GUARD,
                useClass: jwt_auth_guard_1.JwtAuthGuard,
            },
            {
                provide: core_1.APP_GUARD,
                useClass: kill_switch_guard_1.KillSwitchGuard,
            },
            {
                provide: core_1.APP_GUARD,
                useClass: roles_guard_1.RolesGuard,
            },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map