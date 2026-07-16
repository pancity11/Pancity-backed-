import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReferralSettings, ReferralSettingsSchema } from './schemas/referral-settings.schema';
import { ReferralRecord, ReferralRecordSchema } from './schemas/referral-record.schema';
import { WalletModule } from '../wallet/wallet.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { ReferralsService } from './referrals.service';
import { ReferralsController } from './referrals.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ReferralSettings.name, schema: ReferralSettingsSchema },
      { name: ReferralRecord.name, schema: ReferralRecordSchema },
    ]),
    WalletModule,
    TransactionsModule,
  ],
  controllers: [ReferralsController],
  providers: [ReferralsService],
  exports: [ReferralsService, MongooseModule],
})
export class ReferralsModule {}
