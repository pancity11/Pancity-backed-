import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ReferralRecordDocument = ReferralRecord & Document;

@Schema({ timestamps: true })
export class ReferralRecord {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  referrer: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  referee: Types.ObjectId;

  @Prop({ enum: ['pending', 'qualified', 'rewarded'], default: 'pending' })
  status: string;

  @Prop({ default: 0 })
  rewardAmount: number;

  // How much ongoing commission (on the referee's transaction volume) has
  // already been paid out to the referrer so far.
  @Prop({ default: 0 })
  commissionPaid: number;
}

export const ReferralRecordSchema = SchemaFactory.createForClass(ReferralRecord);
