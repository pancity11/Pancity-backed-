import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { SecurityLogsService } from './security-logs.service';

@Controller('security-logs')
@UseGuards(JwtAuthGuard, AdminGuard)
export class SecurityLogsController {
  constructor(private logsService: SecurityLogsService) {}

  @Get('logins')
  logins(
    @Query('page') page = '1',
    @Query('limit') limit = '30',
    @Query('status') status?: string,
  ) {
    return this.logsService.listLogins(+page, +limit, status);
  }

  @Get('activity')
  activity(
    @Query('page') page = '1',
    @Query('limit') limit = '30',
    @Query('module') module?: string,
  ) {
    return this.logsService.listActivity(+page, +limit, module);
  }
}
