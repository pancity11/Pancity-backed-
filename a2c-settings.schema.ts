import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type A2cSettingsDocument = A2cSettings & Document;

@Schema({ timestamps: true })
export class A2cSettings {
  @Prop({ default: true })
  serviceEnabled: boolean;
}

export const A2cSettingsSchema = SchemaFactory.createForClass(A2cSettings);
