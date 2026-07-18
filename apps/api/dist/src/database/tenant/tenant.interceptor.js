"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantInterceptor = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
const drizzle_orm_1 = require("drizzle-orm");
const common_2 = require("@nestjs/common");
const database_constants_1 = require("./database.constants");
const tenant_context_1 = require("./tenant-context");
const core_1 = require("@nestjs/core");
const public_decorator_1 = require("../../common/decorators/public.decorator");
let TenantInterceptor = class TenantInterceptor {
    db;
    reflector;
    constructor(db, reflector) {
        this.db = db;
        this.reflector = reflector;
    }
    intercept(context, next) {
        const isPublic = this.reflector.getAllAndOverride(public_decorator_1.IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) {
            return next.handle();
        }
        const request = context.switchToHttp().getRequest();
        const tenantId = request.user?.tenantId;
        if (!tenantId) {
            throw new common_1.UnauthorizedException('No se pudo resolver el tenant activo para esta request.');
        }
        return (0, rxjs_1.from)(new Promise((resolve, reject) => {
            this.db
                .transaction(async (tx) => {
                await tx.execute(drizzle_orm_1.sql.raw(`SET LOCAL ROLE app_user`));
                await tx.execute(drizzle_orm_1.sql.raw(`SET LOCAL app.current_tenant_id = '${tenantId}'`));
                const result = await tenant_context_1.TenantContext.run({ tenantId, db: tx }, () => firstValueFromObservable(next.handle()));
                resolve(result);
            })
                .catch(reject);
        })).pipe((0, rxjs_1.switchMap)((result) => (0, rxjs_1.from)(Promise.resolve(result))));
    }
};
exports.TenantInterceptor = TenantInterceptor;
exports.TenantInterceptor = TenantInterceptor = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_2.Inject)(database_constants_1.DRIZZLE_POOL_DB)),
    __metadata("design:paramtypes", [Function, core_1.Reflector])
], TenantInterceptor);
function firstValueFromObservable(obs) {
    return new Promise((resolve, reject) => {
        obs.subscribe({ next: resolve, error: reject });
    });
}
//# sourceMappingURL=tenant.interceptor.js.map