import { Controller, Post, Body, UseGuards, Req, Get } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { InviteStaffDto } from './dto/invite-staff.dto';
import { ActivateStaffDto } from './dto/activate-staff.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Public } from '../common/decorators/public.decorator';

@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Roles('admin') // Solo administradores pueden invitar
  @Post('invite')
  inviteStaff(@Body() dto: InviteStaffDto, @Req() req: any) {
    return this.usuariosService.inviteStaff(dto, req.user.tenantId);
  }

  @Public()
  @Post('activar')
  activateStaff(@Body() dto: ActivateStaffDto) {
    return this.usuariosService.activateStaff(dto);
  }

  @Roles('admin', 'barbero', 'recepcion')
  @Get()
  findAll() {
    return this.usuariosService.findAll();
  }
}
