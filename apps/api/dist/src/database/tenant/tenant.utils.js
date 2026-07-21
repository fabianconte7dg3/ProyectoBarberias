"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runInTenantScope = runInTenantScope;
const drizzle_orm_1 = require("drizzle-orm");
const tenant_context_1 = require("./tenant-context");
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function runInTenantScope(db, tenantId, callback) {
    if (!tenantId || !UUID_REGEX.test(tenantId)) {
        throw new Error('UUID de tenant inválido para RLS.');
    }
    return db.transaction(async (tx) => {
        await tx.execute((0, drizzle_orm_1.sql) `SET LOCAL ROLE app_user`);
        await tx.execute((0, drizzle_orm_1.sql) `SELECT set_config('app.current_tenant_id', ${tenantId}, true)`);
        return tenant_context_1.TenantContext.run({ tenantId, db: tx }, () => callback(tx));
    });
}
//# sourceMappingURL=tenant.utils.js.map