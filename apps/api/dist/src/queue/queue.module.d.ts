import { OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
export declare class QueueModule implements OnModuleInit {
    private readonly canaryQueue;
    constructor(canaryQueue: Queue);
    onModuleInit(): Promise<void>;
}
