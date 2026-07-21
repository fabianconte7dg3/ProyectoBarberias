import { WhatsappService } from './whatsapp.service';
export declare class WhatsappController {
    private readonly whatsappService;
    private readonly logger;
    constructor(whatsappService: WhatsappService);
    handleEvolutionWebhook(tenantId: string, payload: any): Promise<{
        status: string;
    }>;
}
