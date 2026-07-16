import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@Req() req: any) {
    return this.usersService.findById(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateMe(@Req() req: any, @Body() body: any) {
    const { name, email } = body;
    return this.usersService.updateSelf(req.user.sub, { name, email });
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get()
  list(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('kycStatus') kycStatus?: string,
    @Query('accountType') accountType?: string,
  ) {
    return this.usersService.list({
      page: +page,
      limit: +limit,
      search,
      status,
      kycStatus,
      accountType,
    });
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.usersService.adminGetProfile(id);
  }

  // Admin can force-reset a user's password/PIN when they lose access.
  // Neither endpoint ever returns or accepts the OLD value — passwords and
  // PINs are one-way hashed and are never readable by anyone, admins
  // included. Relay the new value to the user through a verified channel.
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch(':id/reset-password')
  resetPassword(@Param('id') id: string, @Body() body: { newPassword: string }) {
    return this.usersService.adminResetPassword(id, body.newPassword);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch(':id/reset-pin')
  resetPin(@Param('id') id: string, @Body() body: { newPin: string }) {
    return this.usersService.adminResetPin(id, body.newPin);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch(':id/status')
  setStatus(@Param('id') id: string, @Body() body: { status: 'active' | 'suspended' }) {
    return this.usersService.setStatus(id, body.status);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch(':id/kyc')
  setKyc(
    @Param('id') id: string,
    @Body() body: { kycStatus: 'verified' | 'pending' | 'unverified' },
  ) {
    return this.usersService.setKyc(id, body.kycStatus);
  }
}
