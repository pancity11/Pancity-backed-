import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ActivityLogDocument = ActivityLog & Document;

@Schema({ timestamps: true })
export class ActivityLog {
  @Prop({ type: Types.ObjectId, ref: 'Admin', required: true })
  admin: Types.ObjectId;

  @Prop({ required: true })
  adminName: string;

  // e.g. "Funded wallet", "Suspended user"
  @Prop({ required: true })
  action: string;

  // e.g. "Wallet", "Users", "Transactions"
  @Prop({ required: true })
  module: string;

  @Prop({ default: null })
  details: string;
}

export const ActivityLogSchema = SchemaFactory.createForClass(ActivityLog);
