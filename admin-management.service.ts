import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { Admin, AdminDocument } from '../admins/schemas/admin.schema';
import { RoleTemplatesService } from '../role-templates/role-templates.service';

@Injectable()
export class AdminManagementService {
  constructor(
    @InjectModel(Admin.name) private adminModel: Model<AdminDocument>,
    private roleTemplatesService: RoleTemplatesService,
  ) {}

  async list() {
    return this.adminModel.find().select('-passwordHash').sort({ createdAt: -1 });
  }

  async create(data: {
    username: string;
    password: string;
    name?: string;
    email?: string;
    role: string;
  }) {
    const existing = await this.adminModel.findOne({ username: data.username });
    if (existing) throw new BadRequestException('Username already taken');
    const passwordHash = await bcrypt.hash(data.password, 10);
    const permissions = await this.roleTemplatesService.getPermissionsForRole(data.role);
    return this.adminModel.create({
      username: data.username,
      passwordHash,
      name: data.name || data.username,
      email: data.email || null,
      role: data.role,
      permissions,
    });
  }

  async updateRole(id: string, role: string) {
    const permissions = await this.roleTemplatesService.getPermissionsForRole(role);
    const admin = await this.adminModel.findByIdAndUpdate(
      id,
      { role, permissions },
      { new: true },
    ).select('-passwordHash');
    if (!admin) throw new NotFoundException('Admin not found');
    return admin;
  }

  async updatePermissions(id: string, permissions: Record<string, boolean>) {
    const admin = await this.adminModel.findByIdAndUpdate(
      id,
      { permissions },
      { new: true },
    ).select('-passwordHash');
    if (!admin) throw new NotFoundException('Admin not found');
    return admin;
  }

  async setStatus(id: string, status: 'active' | 'suspended') {
    const admin = await this.adminModel.findByIdAndUpdate(
      id,
      { status },
      { new: true },
    ).select('-passwordHash');
    if (!admin) throw new NotFoundException('Admin not found');
    return admin;
  }

  // Support action: reset an admin's 2FA enrollment (e.g. they lost their
  // authenticator device) so they're prompted to re-enroll at next login.
  async resetTwoFA(id: string) {
    const admin = await this.adminModel.findByIdAndUpdate(
      id,
      { twoFAEnabled: false, twoFAMethod: null },
      { new: true },
    ).select('-passwordHash');
    if (!admin) throw new NotFoundException('Admin not found');
    return admin;
  }

  async remove(id: string) {
    const admin = await this.adminModel.findByIdAndDelete(id);
    if (!admin) throw new NotFoundException('Admin not found');
    return { success: true };
  }

  async findById(id: string) {
    const admin = await this.adminModel.findById(id);
    if (!admin) throw new NotFoundException('Admin not found');
    return admin;
  }
}
