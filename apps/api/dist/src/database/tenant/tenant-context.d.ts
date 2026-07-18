export interface ITenantContext {
    tenantId: string;
    db: any;
}
export declare class TenantContext {
    static run<T>(context: ITenantContext, callback: () => Promise<T> | T): Promise<T> | T;
    static getTenantId(): string;
    static getDb(): any;
}
