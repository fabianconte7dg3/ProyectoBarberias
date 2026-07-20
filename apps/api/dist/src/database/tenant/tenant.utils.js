"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runInTenantScope = runInTenantScope;
const drizzle_orm_1 = require("drizzle-orm");
const tenant_context_1 = require("./tenant-context");
async function runInTenantScope(globalDb, tenantId, callback) {
    return globalDb.transaction(async (tx) => {
        await tx.execute(drizzle_orm_1.sql.raw(`SET LOCAL ROLE app_user`));
        await tx.execute(drizzle_orm_1.sql.raw(`SET LOCAL app.current_tenant_id = '${tenantId}'`));
        return tenant_context_1.TenantContext.run({ tenantId, db: tx }, () => callback(tx));
    });
}
//# sourceMappingURL=tenant.utils.js.map