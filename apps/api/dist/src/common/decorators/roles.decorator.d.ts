import { rolUsuarioEnum } from '../../database/schema';
export type Rol = (typeof rolUsuarioEnum.enumValues)[number];
export declare const ROLES_KEY = "roles";
export declare const Roles: (...roles: Rol[]) => import("@nestjs/common").CustomDecorator<string>;
