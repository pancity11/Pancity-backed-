import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { TransactionsService } from './transactions.service';
import { PurchaseDto } from './dto/purchase.dto';

@Controller('transactions')
export class TransactionsController {
  constructor(private txService: TransactionsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('purchase')
  purchase(@Req() req: any, @Body() dto: PurchaseDto) {
    return this.txService.purchase(req.user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  findMine(
    @Req() req: any,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('type') type?: string,
    @Query('status') status?: string,
  ) {
    return this.txService.findMine(req.user.sub, +page, +limit, type, status);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get()
  listAll(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('network') network?: string,
    @Query('search') search?: string,
    @Query('userId') userId?: string,
  ) {
    return this.txService.listAll({
      page: +page,
      limit: +limit,
      type,
      status,
      network,
      search,
      userId,
    });
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.txService.findOne(id);
  }

  // Airtime2Cash review workflow: pending -> processing -> approved -> paid,
  // or -> rejected at any point. Each call appends to the transaction's
  // audit history.
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch(':id/a2c-status')
  advanceA2c(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { status: string; note?: string; adminName?: string },
  ) {
    return this.txService.advanceA2cStatus(
      id,
      body.status,
      body.note || '',
      body.adminName || 'Admin',
    );
  }
}
