import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LoginLog, LoginLogDocument } from './schemas/login-log.schema';
import { ActivityLog, ActivityLogDocument } from './schemas/activity-log.schema';

@Injectable()
export class SecurityLogsService {
  constructor(
    @InjectModel(LoginLog.name) private loginLogModel: Model<LoginLogDocument>,
    @InjectModel(ActivityLog.name) private activityLogModel: Model<ActivityLogDocument>,
  ) {}

  async recordLogin(data: {
    adminId?: any;
    adminName: string;
    ip?: string;
    device?: string;
    location?: string;
    status: 'success' | 'failed';
    reason?: string;
  }) {
    return this.loginLogModel.create({
      admin: data.adminId || null,
      adminName: data.adminName,
      ip: data.ip || null,
      device: data.device || null,
      location: data.location || null,
      status: data.status,
      reason: data.reason || null,
    });
  }

  async recordActivity(data: {
    adminId: any;
    adminName: string;
    action: string;
    module: string;
    details?: string;
  }) {
    return this.activityLogModel.create({
      admin: data.adminId,
      adminName: data.adminName,
      action: data.action,
      module: data.module,
      details: data.details || null,
    });
  }

  async listLogins(page = 1, limit = 30, status?: string) {
    const filter: any = {};
    if (status) filter.status = status;
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.loginLogModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      this.loginLogModel.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  }

  async listActivity(page = 1, limit = 30, module?: string) {
    const filter: any = {};
    if (module) filter.module = module;
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.activityLogModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      this.activityLogModel.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  }
}
