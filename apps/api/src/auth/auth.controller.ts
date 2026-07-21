import { Controller, Post, Body, UseGuards, Get, Param, Res, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterBarberiaDto } from './dto/register-barberia.dto';
import { LoginAdminDto } from './dto/login-admin.dto';
import { LoginStaffDto } from './dto/login-staff.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { Response, Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('barberias')
  registerBarberia(@Body() dto: RegisterBarberiaDto) {
    return this.authService.registerBarberia(dto);
  }

  @Public()
  @Post('login/admin')
  async loginAdmin(
    @Body() dto: LoginAdminDto,
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.authService.loginAdmin(dto);

    res.cookie('jwt', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 12 * 60 * 60 * 1000, // 12 horas
    });

    return {
      message: 'Login exitoso',
      usuario: result.usuario
    };
  }

  @Public()
  @Get('staff/:slug')
  getStaffForLogin(@Param('slug') slug: string) {
    return this.authService.getStaffForLogin(slug);
  }

  @Public()
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('jwt', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    return { message: 'Logout exitoso' };
  }

  @Public()
  @Post('login/staff')
  async loginStaff(
    @Body() dto: LoginStaffDto,
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.authService.loginStaff(dto);
    
    // Setear JWT en Cookie httpOnly con 12h de expiración
    res.cookie('jwt', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 12 * 60 * 60 * 1000, // 12 horas
    });

    return {
      message: 'Login exitoso',
      usuario: result.usuario
    };
  }

  // Requiere token válido (via cookie o header) y cualquier rol de staff para responder
  @Roles('admin', 'recepcion', 'barbero')
  @Get('me')
  getMe(@Req() req: Request) {
    // req.user lo inyecta JwtStrategy si el token es válido
    return req.user;
  }
}
