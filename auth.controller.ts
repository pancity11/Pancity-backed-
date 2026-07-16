import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { AdminLoginDto } from './dto/admin-login.dto';
import { SetPinDto } from './dto/set-pin.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('user/signup')
  signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  @Post('user/login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('admin/login')
  adminLogin(@Req() req: any, @Body() dto: AdminLoginDto) {
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
    const device = req.headers['user-agent'];
    return this.authService.adminLogin(dto, { ip, device });
  }

  @UseGuards(JwtAuthGuard)
  @Post('user/pin')
  setPin(@Req() req: any, @Body() dto: SetPinDto) {
    return this.authService.setPin(req.user.sub, dto.pin);
  }

  @UseGuards(JwtAuthGuard)
  @Post('user/pin/verify')
  verifyPin(@Req() req: any, @Body() dto: SetPinDto) {
    return this.authService.verifyPin(req.user.sub, dto.pin);
  }
}
