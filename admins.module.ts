import { Module, OnModuleInit } from '@nestjs/common';
import { MongooseModule, InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { Admin, AdminDocument, AdminSchema } from './schemas/admin.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Admin.name, schema: AdminSchema }]),
  ],
  exports: [MongooseModule],
})
export class AdminsModule implements OnModuleInit {
  constructor(
    @InjectModel(Admin.name) private adminModel: Model<AdminDocument>,
  ) {}

  // Creates the very first admin account automatically, so there is always
  // at least one way to log in to the dashboard on a fresh database.
  async onModuleInit() {
    const count = await this.adminModel.countDocuments();
    if (count === 0) {
      const username = process.env.DEFAULT_ADMIN_USERNAME || 'admin';
      const password = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';
      const passwordHash = await bcrypt.hash(password, 10);
      await this.adminModel.create({
        username,
        passwordHash,
        role: 'Super Admin',
      });
      // eslint-disable-next-line no-console
      console.log(
        `Seeded default admin -> username: ${username} / password: ${password} (change this immediately)`,
      );
    }
  }
}
