import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LoginLog, LoginLogSchema } from './schemas/login-log.schema';
import { ActivityLog, ActivityLogSchema } from './schemas/activity-log.schema';
import { SecurityLogsService } from './security-logs.service';
import { SecurityLogsController } from './security-logs.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LoginLog.name, schema: LoginLogSchema },
      { name: ActivityLog.name, schema: ActivityLogSchema },
    ]),
  ],
  controllers: [SecurityLogsController],
  providers: [SecurityLogsService],
  exports: [SecurityLogsService],
})
export class SecurityLogsModule {}
