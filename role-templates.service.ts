import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RoleTemplate, RoleTemplateDocument } from './schemas/role-template.schema';

export const ALL_PERMISSION_KEYS = [
  'users.view', 'users.manage',
  'wallet.view', 'wallet.manage', 'txns.approve',
  'providers.manage', 'broadcasts.send',
  'reports.view', 'settings.manage', 'admins.manage',
];

const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  'Super Admin': ALL_PERMISSION_KEYS,
  'Finance Admin': ['wallet.view', 'wallet.manage', 'txns.approve', 'reports.view'],
  'Support Admin': ['users.view', 'users.manage', 'wallet.view', 'broadcasts.send'],
  'Content Admin': ['providers.manage', 'broadcasts.send', 'reports.view'],
  Auditor: ['users.view', 'wallet.view', 'reports.view'],
};

@Injectable()
export class RoleTemplatesService implements OnModuleInit {
  constructor(
    @InjectModel(RoleTemplate.name) private templateModel: Model<RoleTemplateDocument>,
  ) {}

  // Seeds one template document per role on first boot, so the admin always
  // has something real to edit instead of a hardcoded frontend constant.
  async onModuleInit() {
    const count = await this.templateModel.countDocuments();
    if (count > 0) return;
    for (const role of Object.keys(DEFAULT_ROLE_PERMISSIONS)) {
      const permissions = Object.fromEntries(
        ALL_PERMISSION_KEYS.map((k) => [k, DEFAULT_ROLE_PERMISSIONS[role].includes(k)]),
      );
      await this.templateModel.create({ role, permissions });
    }
  }

  async list() {
    return this.templateModel.find().sort({ role: 1 });
  }

  async getPermissionsForRole(role: string): Promise<Record<string, boolean>> {
    const template = await this.templateModel.findOne({ role });
    if (template) return template.permissions;
    // Fallback for a role with no template yet (e.g. right after a fresh
    // install before onModuleInit finishes) — deny everything by default.
    return Object.fromEntries(ALL_PERMISSION_KEYS.map((k) => [k, false]));
  }

  async update(role: string, permissions: Record<string, boolean>) {
    const template = await this.templateModel.findOneAndUpdate(
      { role },
      { permissions },
      { new: true, upsert: true },
    );
    return template;
  }
}
