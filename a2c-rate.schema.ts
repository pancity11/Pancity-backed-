import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type A2cRateDocument = A2cRate & Document;

@Schema({ timestamps: true })
export class A2cRate {
  @Prop({ required: true, unique: true })
  network: string;

  // Percentage of airtime value paid out as cash, e.g. 85 means ₦100
  // airtime converts to ₦85 cash.
  @Prop({ required: true, default: 80 })
  rate: number;

  @Prop({ default: true })
  active: boolean;
}

export const A2cRateSchema = SchemaFactory.createForClass(A2cRate);
