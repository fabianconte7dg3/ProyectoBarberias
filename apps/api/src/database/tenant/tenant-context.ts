import { AsyncLocalStorage } from 'async_hooks';

export interface ITenantContext {
  tenantId: string;
  db: any; // Instancia de la transacción de Drizzle
}

const asyncLocalStorage = new AsyncLocalStorage<ITenantContext>();

export class TenantContext {
  static run<T>(context: ITenantContext, callback: () => Promise<T> | T): Promise<T> | T {
    return asyncLocalStorage.run(context, callback) as Promise<T> | T;
  }

  static getTenantId(): string {
    const store = asyncLocalStorage.getStore();
    if (!store?.tenantId) {
      throw new Error('Tenant ID no encontrado en el contexto actual');
    }
    return store.tenantId;
  }

  static getDb(): any {
    const store = asyncLocalStorage.getStore();
    if (!store?.db) {
      throw new Error('Transacción DB no encontrada en el contexto actual');
    }
    return store.db;
  }
}
