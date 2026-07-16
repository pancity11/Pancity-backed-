import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { AuthModule } from './auth/auth.module';
import { AdminsModule } from './admins/admins.module';
import { UsersModule } from './users/users.module';
import { WalletModule } from './wallet/wallet.module';
import { TransactionsModule } from './transactions/transactions.module';
import { PlansModule } from './plans/plans.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { SecurityLogsModule } from './security-logs/security-logs.module';
import { AdminManagementModule } from './admin-management/admin-management.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReferralsModule } from './referrals/referrals.module';
import { RoleTemplatesModule } from './role-templates/role-templates.module';
import { A2cSettingsModule } from './a2c-settings/a2c-settings.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pancity',
    ),
    AdminsModule,
    AuthModule,
    UsersModule,
    WalletModule,
    TransactionsModule,
    PlansModule,
    DashboardModule,
    SecurityLogsModule,
    AdminManagementModule,
    NotificationsModule,
    ReferralsModule,
    RoleTemplatesModule,
    A2cSettingsModule,
  ],
})
export class AppModule {}
