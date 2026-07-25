import { TenantsService } from './tenants.service';
export declare class TenantsController {
    private readonly tenantsService;
    constructor(tenantsService: TenantsService);
    findPublicBySlug(slug: string): Promise<any>;
}
