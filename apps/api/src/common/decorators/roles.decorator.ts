import { SetMetadata } from '@nestjs/common';
import { rolUsuarioEnum } from '../../database/schema';

// Convertimos el tuple a un tipo para TypeScript
export type Rol = (typeof rolUsuarioEnum.enumValues)[number];

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Rol[]) => SetMetadata(ROLES_KEY, roles);
