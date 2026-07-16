import { Module } from '@nestjs/common';
import { AdminsModule } from '../admins/admins.module';
import { SecurityLogsModule } from '../security-logs/security-logs.module';
import { RoleTemplatesModule } from '../role-templates/role-templates.module';
import { AdminManagementService } from './admin-management.service';
import { AdminManagementController } from './admin-management.controller';

@Module({
  imports: [AdminsModule, SecurityLogsModule, RoleTemplatesModule],
  controllers: [AdminManagementController],
  providers: [AdminManagementService],
})
export class AdminManagementModule {}
