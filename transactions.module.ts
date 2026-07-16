import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { Transaction, TransactionSchema } from './schemas/transaction.schema';
import { UsersModule } from '../users/users.module';
import { WalletModule } from '../wallet/wallet.module';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
    ]),
    UsersModule,
    WalletModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'change-this-to-a-long-random-secret',
    }),
  ],
  controllers: [TransactionsController],
  providers: [TransactionsService],
  exports: [MongooseModule],
})
export class TransactionsModule {}
