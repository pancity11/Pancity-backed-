import { Module } from '@nestjs/common';
import { TransactionsModule } from '../transactions/transactions.module';
import { UsersModule } from '../users/users.module';
import { WalletModule } from '../wallet/wallet.module';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [TransactionsModule, UsersModule, WalletModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
