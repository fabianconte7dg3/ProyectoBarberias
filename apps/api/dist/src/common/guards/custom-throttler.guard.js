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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomThrottlerGuard = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const database_constants_1 = require("../../database/tenant/database.constants");
const schema = __importStar(require("../../database/schema"));
let CustomThrottlerGuard = class CustomThrottlerGuard extends throttler_1.ThrottlerGuard {
    db;
    async throwThrottlingException(context) {
        const req = context.switchToHttp().getRequest();
        const url = req.url || '';
        const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
        if (url.includes('/super-admin')) {
            try {
                await this.db.insert(schema.alertasSeguridad).values({
                    tipo: 'rate_limit_superadmin',
                    nivel: 'warning',
                    mensaje: `Límite de tasa excedido en Consola SuperAdmin (${url}) desde IP: ${ip}`,
                    metadatos: { url, ip, timestamp: new Date().toISOString() },
                });
            }
            catch (err) {
                console.error('Error guardando alerta de rate limit:', err);
            }
        }
        throw new throttler_1.ThrottlerException('Demasiadas peticiones. Por favor, intenta más tarde.');
    }
};
exports.CustomThrottlerGuard = CustomThrottlerGuard;
__decorate([
    (0, common_1.Inject)(database_constants_1.DRIZZLE_POOL_DB),
    __metadata("design:type", Function)
], CustomThrottlerGuard.prototype, "db", void 0);
exports.CustomThrottlerGuard = CustomThrottlerGuard = __decorate([
    (0, common_1.Injectable)()
], CustomThrottlerGuard);
//# sourceMappingURL=custom-throttler.guard.js.map