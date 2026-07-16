import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PlanDocument = Plan & Document;

@Schema({ timestamps: true })
export class Plan {
  @Prop({
    enum: ['airtime', 'data', 'cable', 'electricity', 'exam-pin'],
    required: true,
  })
  category: string;

  // e.g. "MTN", "Airtel", "Glo", "9mobile", "DSTV", "GOTV", "IKEDC"...
  @Prop({ required: true })
  provider: string;

  // Human-readable plan name, e.g. "1GB - 30 Days"
  @Prop({ required: true })
  name: string;

  // What the customer pays
  @Prop({ required: true })
  price: number;

  // What it costs Pancity (for margin reporting) — optional
  @Prop({ default: null })
  costPrice: number;

  // Optional machine code some providers need (e.g. data plan code)
  @Prop({ default: null })
  code: string;

  @Prop({ default: true })
  active: boolean;
}

export const PlanSchema = SchemaFactory.createForClass(Plan);
