import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { RoleTemplatesService } from './role-templates.service';

@Controller('role-templates')
@UseGuards(JwtAuthGuard, AdminGuard)
export class RoleTemplatesController {
  constructor(private roleTemplatesService: RoleTemplatesService) {}

  @Get()
  list() {
    return this.roleTemplatesService.list();
  }

  @Patch(':role')
  update(@Param('role') role: string, @Body() body: { permissions: Record<string, boolean> }) {
    return this.roleTemplatesService.update(role, body.permissions);
  }
}
