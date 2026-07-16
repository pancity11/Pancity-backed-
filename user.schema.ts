import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true, unique: true, trim: true })
  phone: string;

  @Prop({ required: true })
  passwordHash: string;

  // Hash of the 4-5 digit transaction PIN used to authorize purchases.
  @Prop({ default: null })
  pinHash: string;

  @Prop({ default: false })
  biometricEnabled: boolean;

  @Prop({ enum: ['user', 'reseller', 'api'], default: 'user' })
  accountType: string;

  // Only populated when accountType === 'api'
  @Prop({ default: null })
  apiKey: string;

  @Prop({ enum: ['verified', 'pending', 'unverified'], default: 'unverified' })
  kycStatus: string;

  @Prop({ enum: ['active', 'suspended'], default: 'active' })
  status: string;

  @Prop({ default: null })
  referralCode: string;

  @Prop({ default: null })
  referredBy: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
