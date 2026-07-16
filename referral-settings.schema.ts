import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ReferralSettingsDocument = ReferralSettings & Document;

@Schema({ timestamps: true })
export class ReferralSettings {
  @Prop({ default: true })
  enabled: boolean;

  @Prop({ enum: ['fixed', 'percentage'], default: 'fixed' })
  bonusType: string;

  @Prop({ default: 100 })
  signupBonus: number;

  @Prop({ default: 200 })
  referrerBonus: number;

  @Prop({ default: 2.5 })
  commissionRate: number;

  @Prop({ default: 90 })
  commissionDurationDays: number;

  @Prop({ enum: ['signup', 'first_funding', 'first_transaction'], default: 'first_funding' })
  qualifyingAction: string;

  @Prop({ default: 500 })
  minPayout: number;
}

export const ReferralSettingsSchema = SchemaFactory.createForClass(ReferralSettings);
