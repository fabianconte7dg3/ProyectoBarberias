import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    
    let token: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (request.cookies && (request.cookies.super_jwt || request.cookies.jwt)) {
      token = request.cookies.super_jwt || request.cookies.jwt;
    }

    if (!token) {
      throw new UnauthorizedException('Token de SuperAdmin requerido.');
    }

    try {
      const secret = this.configService.get<string>('JWT_SECRET', 'super_secret_dev_key_change_in_prod');
      const payload = this.jwtService.verify(token, { secret });

      if (payload.type === 'mfa_pending' || payload.rol !== 'superadmin') {
        throw new UnauthorizedException('Token de autenticación incompleto (2FA pendiente) o sin privilegios de SuperAdmin.');
      }

      request.user = payload;
      return true;
    } catch (err) {
      throw new UnauthorizedException('Token de SuperAdmin inválido o expirado.');
    }
  }
}
