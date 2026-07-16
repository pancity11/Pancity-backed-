import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, AdminGuard)
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('stats')
  stats() {
    return this.dashboardService.stats();
  }

  @Get('revenue-series')
  revenueSeries(@Query('days') days = '14') {
    return this.dashboardService.revenueSeries(+days);
  }

  @Get('network-sales')
  networkSales() {
    return this.dashboardService.networkSales();
  }
}
