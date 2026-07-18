"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantContext = void 0;
const async_hooks_1 = require("async_hooks");
const asyncLocalStorage = new async_hooks_1.AsyncLocalStorage();
class TenantContext {
    static run(context, callback) {
        return asyncLocalStorage.run(context, callback);
    }
    static getTenantId() {
        const store = asyncLocalStorage.getStore();
        if (!store?.tenantId) {
            throw new Error('Tenant ID no encontrado en el contexto actual');
        }
        return store.tenantId;
    }
    static getDb() {
        const store = asyncLocalStorage.getStore();
        if (!store?.db) {
            throw new Error('Transacción DB no encontrada en el contexto actual');
        }
        return store.db;
    }
}
exports.TenantContext = TenantContext;
//# sourceMappingURL=tenant-context.js.map