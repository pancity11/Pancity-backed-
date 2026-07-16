import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { ReferralsService } from './referrals.service';

@Controller('referrals')
@UseGuards(JwtAuthGuard, AdminGuard)
export class ReferralsController {
  constructor(private referralsService: ReferralsService) {}

  @Get('settings')
  getSettings() {
    return this.referralsService.getSettings();
  }

  @Patch('settings')
  updateSettings(@Body() body: any) {
    return this.referralsService.updateSettings(body);
  }

  @Get('records')
  listRecords(
    @Query('page') page = '1',
    @Query('limit') limit = '30',
    @Query('status') status?: string,
  ) {
    return this.referralsService.listRecords(+page, +limit, status);
  }

  @Get('stats')
  stats() {
    return this.referralsService.referrerStats();
  }

  @Patch(':id/qualify')
  qualify(@Param('id') id: string) {
    return this.referralsService.markQualified(id);
  }

  @Patch(':id/reward')
  reward(@Param('id') id: string) {
    return this.referralsService.markRewarded(id);
  }

  @Get('commissions')
  commissions() {
    return this.referralsService.getCommissionEarnings();
  }

  @Patch(':id/pay-commission')
  payCommission(@Param('id') id: string) {
    return this.referralsService.payCommission(id);
  }
}
