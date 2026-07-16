import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true })
export class Notification {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  // e.g. ["push", "sms", "email", "inapp"]
  @Prop({ type: [String], default: [] })
  channels: string[];

  // e.g. "All Users", "Active Users", "KYC Pending", ...
  @Prop({ required: true })
  audience: string;

  @Prop({ default: 0 })
  recipients: number;

  @Prop({ default: 0 })
  deliveredCount: number;

  @Prop({ default: 0 })
  failedCount: number;

  @Prop({ enum: ['scheduled', 'delivered', 'partial', 'failed'], default: 'scheduled' })
  status: string;

  // null = send immediately; a future date = scheduled
  @Prop({ default: null })
  scheduledFor: Date;

  @Prop({ default: null })
  sentAt: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
