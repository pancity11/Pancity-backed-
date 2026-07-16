import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { AdminsModule } from '../admins/admins.module';
import { WalletModule } from '../wallet/wallet.module';
import { SecurityLogsModule } from '../security-logs/security-logs.module';
import { ReferralsModule } from '../referrals/referrals.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    UsersModule,
    AdminsModule,
    WalletModule,
    SecurityLogsModule,
    ReferralsModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'change-this-to-a-long-random-secret',
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
