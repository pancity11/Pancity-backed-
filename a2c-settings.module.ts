import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { A2cRate, A2cRateSchema } from './schemas/a2c-rate.schema';
import { A2cSettings, A2cSettingsSchema } from './schemas/a2c-settings.schema';
import { A2cSettingsService } from './a2c-settings.service';
import { A2cSettingsController } from './a2c-settings.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: A2cRate.name, schema: A2cRateSchema },
      { name: A2cSettings.name, schema: A2cSettingsSchema },
    ]),
  ],
  controllers: [A2cSettingsController],
  providers: [A2cSettingsService],
  exports: [A2cSettingsService],
})
export class A2cSettingsModule {}
