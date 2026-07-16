import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AdminDocument = Admin & Document;

@Schema({ timestamps: true })
export class Admin {
  @Prop({ required: true, unique: true, trim: true })
  username: string;

  @Prop({ default: null })
  name: string;

  @Prop({ default: null })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ default: 'Super Admin' })
  role: string;

  // Permission keys this admin has, e.g. { "users.view": true, "wallet.manage": true }.
  // Populated from DEFAULT_ROLE_PERMISSIONS on the frontend when a role is chosen,
  // then stored here so it can be customized per-admin if needed.
  @Prop({ type: Object, default: {} })
  permissions: Record<string, boolean>;

  @Prop({ default: false })
  twoFAEnabled: boolean;

  @Prop({ enum: ['Authenticator App', 'SMS', null], default: null })
  twoFAMethod: string;

  @Prop({ default: null })
  lastActive: Date;

  @Prop({ enum: ['active', 'suspended'], default: 'active' })
  status: string;

  @Prop({ default: true })
  active: boolean;
}

export const AdminSchema = SchemaFactory.createForClass(Admin);
