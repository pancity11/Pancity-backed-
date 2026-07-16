import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RoleTemplateDocument = RoleTemplate & Document;

@Schema({ timestamps: true })
export class RoleTemplate {
  @Prop({ required: true, unique: true })
  role: string;

  @Prop({ type: Object, default: {} })
  permissions: Record<string, boolean>;
}

export const RoleTemplateSchema = SchemaFactory.createForClass(RoleTemplate);
