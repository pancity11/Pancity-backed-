import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { WalletService } from './wallet.service';

@Controller('wallet')
export class WalletController {
  constructor(private walletService: WalletService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMyBalance(@Req() req: any) {
    return this.walletService.getBalance(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/ledger')
  getMyLedger(
    @Req() req: any,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.walletService.getLedger(req.user.sub, +page, +limit);
  }

  // NOTE: this is a placeholder for real payment-gateway funding (e.g.
  // Paystack/Flutterwave). In production, this endpoint should only ever be
  // called by that gateway's verified webhook, never directly from the
  // frontend. For now it credits the wallet immediately so the app is usable
  // end-to-end while a real gateway is integrated.
  @UseGuards(JwtAuthGuard)
  @Post('fund/demo-credit')
  demoFund(@Req() req: any, @Body() body: { amount: number }) {
    return this.walletService.credit(
      req.user.sub,
      Number(body.amount),
      'funding',
      `DEMO-${Date.now()}`,
      'Demo wallet funding — replace with Paystack/Flutterwave webhook',
    );
  }

  // Real funding, step 1: ask Paystack for a checkout link. Requires
  // PAYSTACK_SECRET_KEY in .env (get a free test key from your Paystack
  // dashboard). The frontend redirects the user to authorizationUrl.
  @UseGuards(JwtAuthGuard)
  @Post('fund/paystack/initialize')
  initializePaystack(@Req() req: any, @Body() body: { email: string; amount: number }) {
    return this.walletService.initializePaystackFunding(
      req.user.sub,
      body.email,
      Number(body.amount),
    );
  }

  // Real funding, step 2: Paystack calls this URL directly (not the
  // frontend) once payment succeeds. Configure this URL in your Paystack
  // dashboard under Settings -> API Keys & Webhooks, e.g.
  // https://<your-backend-sandbox-id>-3000.csb.app/api/wallet/webhook/paystack
  @Post('webhook/paystack')
  async paystackWebhook(@Req() req: any) {
    const signature = req.headers['x-paystack-signature'];
    const isValid = this.walletService.verifyPaystackSignature(req.rawBody, signature);
    if (!isValid) {
      return { received: false, reason: 'invalid signature' };
    }
    const event = req.body;
    if (event.event === 'charge.success') {
      const { userId } = event.data.metadata || {};
      const amount = event.data.amount / 100; // kobo -> naira
      if (userId) {
        await this.walletService.credit(
          userId,
          amount,
          'funding',
          event.data.reference,
          'Paystack wallet funding',
        );
      }
    }
    return { received: true };
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/ledger')
  getAllLedger(@Query('page') page = '1', @Query('limit') limit = '20') {
    return this.walletService.getAllLedger(+page, +limit);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('admin/credit')
  adminCredit(
    @Body() body: { userId: string; amount: number; note?: string },
  ) {
    return this.walletService.credit(
      body.userId,
      Number(body.amount),
      'admin-credit',
      `ADMIN-${Date.now()}`,
      body.note,
    );
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('admin/debit')
  adminDebit(@Body() body: { userId: string; amount: number; note?: string }) {
    return this.walletService.adminDebit(body.userId, Number(body.amount), body.note);
  }
}
