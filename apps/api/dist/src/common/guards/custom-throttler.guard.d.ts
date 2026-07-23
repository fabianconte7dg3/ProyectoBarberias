import { ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
export declare class CustomThrottlerGuard extends ThrottlerGuard {
    private readonly db;
    protected throwThrottlingException(context: ExecutionContext): Promise<void>;
}
