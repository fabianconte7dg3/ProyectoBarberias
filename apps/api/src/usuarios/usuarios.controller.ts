import { Controller, Post, Patch, Body, UseGuards, Req, Get, Param, Ip, Headers } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { InviteStaffDto } from './dto/invite-staff.dto';
import { ActivateStaffDto } from './dto/activate-staff.dto';
import { UpdateComisionDto } from './dto/update-comision.dto';
import { UpdateIdentidadDto } from './dto/update-identidad.dto';
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

  @Roles('admin')
  @Post('configuracion/kill-switch')
  toggleKillSwitch(
    @Req() req: any,
    @Body('activo') activo: boolean,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    return this.usuariosService.toggleKillSwitch(req.user.tenantId, req.user.userId, activo, ip, userAgent);
  }

  @Roles('admin')
  @Get('configuracion/identidad')
  obtenerIdentidad(@Req() req: any) {
    return this.usuariosService.obtenerIdentidad(req.user.tenantId);
  }

  @Roles('admin')
  @Patch('configuracion/identidad')
  actualizarIdentidad(
    @Body() dto: UpdateIdentidadDto,
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    return this.usuariosService.actualizarIdentidad(req.user.tenantId, req.user.userId, dto, ip, userAgent);
  }

  @Public()
  @Post('activar')
  activateStaff(@Body() dto: ActivateStaffDto) {
    return this.usuariosService.activateStaff(dto);
  }

  @Roles('admin')
  @Patch(':id/comision')
  updateComision(
    @Param('id') id: string,
    @Body() dto: UpdateComisionDto,
    @Req() req: any,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string
  ) {
    return this.usuariosService.updateComision(id, dto.porcentajeComision, dto.porcentajeComisionProducto, req.user.userId, ip, userAgent);
  }

  @Roles('admin', 'empleado', 'recepcion')
  @Get()
  findAll() {
    return this.usuariosService.findAll();
  }

  @Roles('admin', 'empleado', 'recepcion')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usuariosService.findOne(id);
  }
}
