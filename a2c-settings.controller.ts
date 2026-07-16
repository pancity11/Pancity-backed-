import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { A2cSettingsService } from './a2c-settings.service';

@Controller('a2c-settings')
export class A2cSettingsController {
  constructor(private a2cSettingsService: A2cSettingsService) {}

  // Public/user-facing: the app needs current rates to show the user their
  // estimated payout before they submit a request.
  @Get('rates')
  listRates() {
    return this.a2cSettingsService.listRates();
  }

  @Get()
  getSettings() {
    return this.a2cSettingsService.getSettings();
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch('rates/:network')
  updateRate(@Param('network') network: string, @Body() body: { rate: number }) {
    return this.a2cSettingsService.updateRate(network, Number(body.rate));
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch('service-enabled')
  setEnabled(@Body() body: { enabled: boolean }) {
    return this.a2cSettingsService.setServiceEnabled(!!body.enabled);
  }
}
