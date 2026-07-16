import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard, AdminGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Post()
  create(@Body() body: any) {
    return this.notificationsService.create(body);
  }

  @Get('history')
  history(@Query('page') page = '1', @Query('limit') limit = '20') {
    return this.notificationsService.history(+page, +limit);
  }

  @Get('scheduled')
  scheduled() {
    return this.notificationsService.scheduled();
  }

  @Delete('scheduled/:id')
  cancel(@Param('id') id: string) {
    return this.notificationsService.cancelScheduled(id);
  }
}
