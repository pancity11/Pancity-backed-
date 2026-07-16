import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Admin, AdminDocument } from '../admins/schemas/admin.schema';
import { WalletService } from '../wallet/wallet.service';
import { SecurityLogsService } from '../security-logs/security-logs.service';
import { ReferralsService } from '../referrals/referrals.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { AdminLoginDto } from './dto/admin-login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Admin.name) private adminModel: Model<AdminDocument>,
    private walletService: WalletService,
    private jwtService: JwtService,
    private securityLogsService: SecurityLogsService,
    private referralsService: ReferralsService,
  ) {}

  private signToken(payload: Record<string, any>) {
    return this.jwtService.sign(payload);
  }

  async signup(dto: SignupDto) {
    const existing = await this.userModel.findOne({
      $or: [{ email: dto.email.toLowerCase() }, { phone: dto.phone }],
    });
    if (existing) {
      throw new BadRequestException('Email or phone already registered');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Every user gets their own shareable referral code.
    const referralCode = `PCT${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    let referredBy: string | null = null;
    let referrer: UserDocument | null = null;
    if (dto.referral) {
      referrer = await this.userModel.findOne({ referralCode: dto.referral.toUpperCase() });
      if (referrer) referredBy = referrer.referralCode;
    }

    const user = await this.userModel.create({
      name: dto.name,
      email: dto.email.toLowerCase(),
      phone: dto.phone,
      passwordHash,
      referralCode,
      referredBy,
    });
    await this.walletService.createForUser(user._id);

    if (referrer) {
      await this.referralsService.createRecord(referrer._id.toString(), user._id.toString());
      const settings = await this.referralsService.getSettings();
      if (settings.enabled && settings.signupBonus > 0) {
        await this.walletService.credit(
          user._id.toString(),
          settings.signupBonus,
          'referral-bonus',
          `SIGNUP-BONUS-${user._id}`,
          'Welcome bonus for signing up with a referral code',
        );
      }
    }

    const token = this.signToken({ sub: user._id, role: 'user' });
    return { token, user: this.sanitizeUser(user) };
  }

  async login(dto: LoginDto) {
    const user = await this.userModel.findOne({
      $or: [{ email: dto.identifier.toLowerCase() }, { phone: dto.identifier }],
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    if (user.status === 'suspended') {
      throw new UnauthorizedException('This account has been suspended');
    }

    const token = this.signToken({ sub: user._id, role: 'user' });
    return { token, user: this.sanitizeUser(user) };
  }

  async adminLogin(dto: AdminLoginDto, meta?: { ip?: string; device?: string }) {
    const admin = await this.adminModel.findOne({ username: dto.username });
    if (!admin || admin.status === 'suspended') {
      await this.securityLogsService.recordLogin({
        adminId: admin?._id || null,
        adminName: admin?.name || dto.username,
        ip: meta?.ip,
        device: meta?.device,
        status: 'failed',
        reason: !admin ? 'Unknown username' : 'Account suspended',
      });
      throw new UnauthorizedException('Invalid admin credentials');
    }
    const valid = await bcrypt.compare(dto.password, admin.passwordHash);
    if (!valid) {
      await this.securityLogsService.recordLogin({
        adminId: admin._id,
        adminName: admin.name || admin.username,
        ip: meta?.ip,
        device: meta?.device,
        status: 'failed',
        reason: 'Incorrect password',
      });
      throw new UnauthorizedException('Invalid admin credentials');
    }

    admin.lastActive = new Date();
    await admin.save();
    await this.securityLogsService.recordLogin({
      adminId: admin._id,
      adminName: admin.name || admin.username,
      ip: meta?.ip,
      device: meta?.device,
      status: 'success',
    });

    const token = this.signToken({
      sub: admin._id,
      role: 'admin',
      adminRole: admin.role,
    });
    return {
      token,
      admin: { id: admin._id, username: admin.username, role: admin.role },
    };
  }

  async setPin(userId: string, pin: string) {
    const pinHash = await bcrypt.hash(pin, 10);
    await this.userModel.findByIdAndUpdate(userId, { pinHash });
    return { success: true };
  }

  async verifyPin(userId: string, pin: string) {
    const user = await this.userModel.findById(userId);
    if (!user || !user.pinHash) {
      throw new BadRequestException('No transaction PIN has been set yet');
    }
    const valid = await bcrypt.compare(pin, user.pinHash);
    if (!valid) throw new UnauthorizedException('Incorrect PIN');

    // A short-lived token (5 min) that a fingerprint/biometric-unlocked
    // purchase can present INSTEAD of the PIN — mirrors how real apps treat
    // "device recently unlocked" as equivalent to re-entering the PIN,
    // without ever skipping server-side verification entirely.
    const quickAuthToken = this.jwtService.sign(
      { sub: userId, role: 'user', quickAuth: true },
      { expiresIn: '5m' },
    );
    return { success: true, quickAuthToken };
  }

  private sanitizeUser(user: UserDocument) {
    const obj = user.toObject();
    delete obj.passwordHash;
    delete obj.pinHash;
    return obj;
  }
}
