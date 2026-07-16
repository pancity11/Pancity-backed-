import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RoleTemplate, RoleTemplateSchema } from './schemas/role-template.schema';
import { RoleTemplatesService } from './role-templates.service';
import { RoleTemplatesController } from './role-templates.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: RoleTemplate.name, schema: RoleTemplateSchema }])],
  controllers: [RoleTemplatesController],
  providers: [RoleTemplatesService],
  exports: [RoleTemplatesService],
})
export class RoleTemplatesModule {}
