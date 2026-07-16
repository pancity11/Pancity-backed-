import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type LedgerDocument = Ledger & Document;

@Schema({ timestamps: true })
export class Ledger {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  user: Types.ObjectId;

  @Prop({ enum: ['credit', 'debit'], required: true })
  direction: string;

  // e.g. 'funding', 'purchase', 'refund', 'admin-credit', 'referral-bonus'
  @Prop({ required: true })
  source: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  balanceAfter: number;

  @Prop({ default: null })
  reference: string;

  @Prop({ enum: ['success', 'pending', 'failed'], default: 'success' })
  status: string;

  @Prop({ default: null })
  note: string;
}

export const LedgerSchema = SchemaFactory.createForClass(Ledger);
