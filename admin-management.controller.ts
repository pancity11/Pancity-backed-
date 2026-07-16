import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { SecurityLogsService } from '../security-logs/security-logs.service';
import { AdminManagementService } from './admin-management.service';

@Controller('admin-management')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminManagementController {
  constructor(
    private adminManagementService: AdminManagementService,
    private logsService: SecurityLogsService,
  ) {}

  @Get()
  list() {
    return this.adminManagementService.list();
  }

  @Post()
  async create(@Req() req: any, @Body() body: any) {
    const created = await this.adminManagementService.create(body);
    const actor = await this.adminManagementService.findById(req.user.sub).catch(() => null);
    await this.logsService.recordActivity({
      adminId: req.user.sub,
      adminName: actor?.name || actor?.username || 'Admin',
      action: `Created admin ${body.username}`,
      module: 'Admins',
    });
    return created;
  }

  @Patch(':id/role')
  updateRole(@Param('id') id: string, @Body() body: { role: string }) {
    return this.adminManagementService.updateRole(id, body.role);
  }

  @Patch(':id/permissions')
  updatePermissions(@Param('id') id: string, @Body() body: { permissions: Record<string, boolean> }) {
    return this.adminManagementService.updatePermissions(id, body.permissions);
  }

  @Patch(':id/status')
  setStatus(@Param('id') id: string, @Body() body: { status: 'active' | 'suspended' }) {
    return this.adminManagementService.setStatus(id, body.status);
  }

  @Patch(':id/2fa-reset')
  resetTwoFA(@Param('id') id: string) {
    return this.adminManagementService.resetTwoFA(id);
  }

  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string) {
    const result = await this.adminManagementService.remove(id);
    const actor = await this.adminManagementService.findById(req.user.sub).catch(() => null);
    await this.logsService.recordActivity({
      adminId: req.user.sub,
      adminName: actor?.name || actor?.username || 'Admin',
      action: `Removed admin ${id}`,
      module: 'Admins',
    });
    return result;
  }
}
