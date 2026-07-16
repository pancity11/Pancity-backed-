import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async findByEmail(email: string) {
    return this.userModel.findOne({ email: email.toLowerCase() });
  }

  async findByEmailOrPhone(identifier: string) {
    return this.userModel.findOne({
      $or: [{ email: identifier.toLowerCase() }, { phone: identifier }],
    });
  }

  async findById(id: string) {
    const user = await this.userModel.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(data: Partial<User>) {
    return this.userModel.create(data);
  }

  async updateSelf(id: string, data: Partial<User>) {
    const user = await this.userModel.findByIdAndUpdate(id, data, {
      new: true,
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  // Admin: paginated list with optional search / status / kyc / accountType filters.
  async list(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    kycStatus?: string;
    accountType?: string;
  }) {
    const { page = 1, limit = 20, search, status, kycStatus, accountType } =
      params;
    const match: FilterQuery<UserDocument> = {};
    if (status) match.status = status;
    if (kycStatus) match.kycStatus = kycStatus;
    if (accountType) match.accountType = accountType;
    if (search) {
      match.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }
    const skip = (page - 1) * limit;

    // $lookup pulls in the wallet balance so the admin table can show it
    // without a second round trip. passwordHash/pinHash are converted to
    // booleans (hasPasswordSet/hasPinSet) and the raw hashes are dropped —
    // admins can see account state, never the actual secret values.
    const pipeline: any[] = [
      { $match: match },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: 'wallets',
          localField: '_id',
          foreignField: 'user',
          as: 'wallet',
        },
      },
      {
        $addFields: {
          walletBalance: { $ifNull: [{ $first: '$wallet.balance' }, 0] },
          hasPasswordSet: { $gt: [{ $strLenCP: { $ifNull: ['$passwordHash', ''] } }, 0] },
          hasPinSet: { $gt: [{ $strLenCP: { $ifNull: ['$pinHash', ''] } }, 0] },
        },
      },
      { $project: { passwordHash: 0, pinHash: 0, wallet: 0, __v: 0 } },
    ];

    const [items, total] = await Promise.all([
      this.userModel.aggregate(pipeline),
      this.userModel.countDocuments(match),
    ]);
    return { items, total, page, limit };
  }

  async setStatus(id: string, status: 'active' | 'suspended') {
    const user = await this.userModel.findByIdAndUpdate(
      id,
      { status },
      { new: true },
    );
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async setKyc(id: string, kycStatus: 'verified' | 'pending' | 'unverified') {
    const user = await this.userModel.findByIdAndUpdate(
      id,
      { kycStatus },
      { new: true },
    );
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  // Admin-facing single-user view. Never returns passwordHash or pinHash —
  // only whether each has been set, so admins can see account state without
  // ever being able to read (or recover) the actual secret values.
  async adminGetProfile(id: string) {
    const results = await this.userModel.aggregate([
      { $match: { _id: new Types.ObjectId(id) } },
      {
        $lookup: {
          from: 'wallets',
          localField: '_id',
          foreignField: 'user',
          as: 'wallet',
        },
      },
      {
        $addFields: {
          walletBalance: { $ifNull: [{ $first: '$wallet.balance' }, 0] },
          hasPasswordSet: { $gt: [{ $strLenCP: { $ifNull: ['$passwordHash', ''] } }, 0] },
          hasPinSet: { $gt: [{ $strLenCP: { $ifNull: ['$pinHash', ''] } }, 0] },
        },
      },
      { $project: { passwordHash: 0, pinHash: 0, wallet: 0, __v: 0 } },
    ]);
    const user = results[0];
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  // Admin action: force-set a brand new password for a user (e.g. user lost
  // access and contacted support). This never reveals the OLD password —
  // passwords are one-way hashed and cannot be recovered by anyone,
  // including admins. The admin should relay the new password to the user
  // through a verified channel.
  async adminResetPassword(id: string, newPassword: string) {
    if (!newPassword || newPassword.length < 6) {
      throw new BadRequestException('New password must be at least 6 characters');
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    const user = await this.userModel.findByIdAndUpdate(
      id,
      { passwordHash },
      { new: true },
    );
    if (!user) throw new NotFoundException('User not found');
    return { success: true };
  }

  // Admin action: force-set a brand new transaction PIN for a user. Same
  // reasoning as above — old PIN is never exposed or recoverable.
  async adminResetPin(id: string, newPin: string) {
    if (!newPin || newPin.length < 4 || newPin.length > 5) {
      throw new BadRequestException('New PIN must be 4-5 digits');
    }
    const pinHash = await bcrypt.hash(newPin, 10);
    const user = await this.userModel.findByIdAndUpdate(
      id,
      { pinHash },
      { new: true },
    );
    if (!user) throw new NotFoundException('User not found');
    return { success: true };
  }

  async countAll() {
    return this.userModel.countDocuments();
  }

  async countActive() {
    return this.userModel.countDocuments({ status: 'active' });
  }
}
