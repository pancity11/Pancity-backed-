import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type LoginLogDocument = LoginLog & Document;

@Schema({ timestamps: true })
export class LoginLog {
  @Prop({ type: Types.ObjectId, ref: 'Admin', default: null })
  admin: Types.ObjectId | null;

  @Prop({ required: true })
  adminName: string;

  @Prop({ default: null })
  ip: string;

  @Prop({ default: null })
  device: string;

  @Prop({ default: null })
  location: string;

  @Prop({ enum: ['success', 'failed'], required: true })
  status: string;

  @Prop({ default: null })
  reason: string;
}

export const LoginLogSchema = SchemaFactory.createForClass(LoginLog);
