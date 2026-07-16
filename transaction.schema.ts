import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TransactionDocument = Transaction & Document;

@Schema({ timestamps: true })
export class Transaction {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  user: Types.ObjectId;

  @Prop({
    enum: ['airtime', 'data', 'cable', 'electricity', 'exam-pin', 'airtime2cash'],
    required: true,
  })
  type: string;

  // Network/provider name, e.g. "MTN", "DSTV", "IKEDC"
  @Prop({ required: true })
  network: string;

  // Phone number / smartcard number / meter number — whichever applies
  @Prop({ required: true })
  target: string;

  @Prop({ default: null })
  planName: string;

  @Prop({ required: true })
  amount: number;

  @Prop({
    enum: ['success', 'pending', 'failed', 'processing', 'approved', 'paid', 'rejected'],
    default: 'pending',
  })
  status: string;

  @Prop({ required: true, unique: true })
  reference: string;

  @Prop({ enum: ['wallet', 'card', 'bank-transfer', 'ussd'], default: 'wallet' })
  channel: string;

  @Prop({ default: null })
  failureReason: string;

  // Airtime2Cash payout destination — filled in when type === 'airtime2cash'.
  @Prop({ default: null })
  payoutBankName: string;

  @Prop({ default: null })
  payoutAccountNumber: string;

  // Audit trail of status changes for the Airtime2Cash admin review queue.
  @Prop({
    type: [
      {
        status: String,
        note: String,
        adminName: String,
        date: { type: Date, default: Date.now },
      },
    ],
    default: [],
  })
  history: { status: string; note: string; adminName: string; date: Date }[];
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
