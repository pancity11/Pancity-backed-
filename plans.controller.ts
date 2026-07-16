import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { PlansService } from './plans.service';

@Controller('plans')
export class PlansController {
  constructor(private plansService: PlansService) {}

  // Public/user-facing: browse available plans, e.g. GET /plans?category=data&provider=MTN
  @Get()
  list(@Query('category') category?: string, @Query('provider') provider?: string) {
    return this.plansService.list(category, provider, true);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin')
  listAll(@Query('category') category?: string, @Query('provider') provider?: string) {
    return this.plansService.list(category, provider, false);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post()
  create(@Body() body: any) {
    return this.plansService.create(body);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.plansService.update(id, body);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.plansService.remove(id);
  }
}
