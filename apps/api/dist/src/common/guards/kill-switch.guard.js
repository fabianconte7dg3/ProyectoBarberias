"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KillSwitchGuard = void 0;
const common_1 = require("@nestjs/common");
const database_constants_1 = require("../../database/tenant/database.constants");
const schema = __importStar(require("../../database/schema"));
const drizzle_orm_1 = require("drizzle-orm");
const tenant_utils_1 = require("../../database/tenant/tenant.utils");
const tenant_context_1 = require("../../database/tenant/tenant-context");
let KillSwitchGuard = class KillSwitchGuard {
    db;
    constructor(db) {
        this.db = db;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const method = request.method;
        if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
            return true;
        }
        if (request.user?.rol === 'admin') {
            return true;
        }
        const route = request.route?.path;
        if (route && route.includes('/configuracion/kill-switch')) {
            return true;
        }
        const tenantId = request.user?.tenantId || request.params?.tenantId;
        console.log(`[KillSwitchGuard] Method: ${method}, tenantId: ${tenantId}`);
        if (!tenantId) {
            console.log(`[KillSwitchGuard] No tenantId, passing`);
            return true;
        }
        const [barberia] = await (0, tenant_utils_1.runInTenantScope)(this.db, tenantId, async () => {
            const txDb = tenant_context_1.TenantContext.getDb();
            const currentTenantRes = await txDb.execute((0, drizzle_orm_1.sql) `SELECT current_setting('app.current_tenant_id', true) as ct`);
            console.log(`[KillSwitchGuard] Inside runInTenantScope, app.current_tenant_id = ${currentTenantRes.rows[0].ct}`);
            return await txDb.select({ killSwitchActivo: schema.barberias.killSwitchActivo })
                .from(schema.barberias)
                .where((0, drizzle_orm_1.eq)(schema.barberias.id, tenantId))
                .limit(1);
        });
        console.log(`[KillSwitchGuard] barberia killSwitchActivo: ${barberia?.killSwitchActivo}`);
        if (barberia?.killSwitchActivo) {
            console.log(`[KillSwitchGuard] Bloqueando request`);
            throw new common_1.ServiceUnavailableException('Las operaciones para esta sucursal se encuentran temporalmente suspendidas por emergencia o falta de pago.');
        }
        return true;
    }
};
exports.KillSwitchGuard = KillSwitchGuard;
exports.KillSwitchGuard = KillSwitchGuard = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(database_constants_1.DRIZZLE_POOL_DB)),
    __metadata("design:paramtypes", [Function])
], KillSwitchGuard);
//# sourceMappingURL=kill-switch.guard.js.map