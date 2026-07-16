import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import {
  Transaction,
  TransactionDocument,
} from './schemas/transaction.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { WalletService } from '../wallet/wallet.service';
import { PurchaseDto } from './dto/purchase.dto';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectModel(Transaction.name)
    private txModel: Model<TransactionDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private walletService: WalletService,
    private jwtService: JwtService,
  ) {}

  // Core purchase flow used by every service tile in the app (airtime, data,
  // cable, electricity, exam pin, airtime2cash). Verifies the transaction
  // PIN (or a quickAuthToken from a recent biometric unlock), debits the
  // wallet, records the transaction, and — on failure — logs a failed
  // transaction instead of throwing silently, so it shows up in history
  // exactly like a real VTU provider would report it.
  async purchase(userId: string, dto: PurchaseDto) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    if (dto.quickAuthToken) {
      try {
        const payload = this.jwtService.verify(dto.quickAuthToken);
        if (payload.sub !== userId || !payload.quickAuth) {
          throw new Error('mismatch');
        }
      } catch {
        throw new UnauthorizedException('Your quick-auth session expired — please enter your PIN');
      }
    } else {
      if (!user.pinHash) {
        throw new BadRequestException('Set a transaction PIN first');
      }
      if (!dto.pin) throw new BadRequestException('PIN is required');
      const pinValid = await bcrypt.compare(dto.pin, user.pinHash);
      if (!pinValid) throw new UnauthorizedException('Incorrect transaction PIN');
    }

    const reference = `PCT-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const isA2c = dto.type === 'airtime2cash';

    // Airtime2Cash converts the user's airtime (not wallet balance) into a
    // cash payout an admin reviews and pays out manually — so it never
    // touches the wallet. Every other service debits the wallet directly.
    if (!isA2c) {
      try {
        await this.walletService.debit(
          userId,
          dto.amount,
          'purchase',
          reference,
          `${dto.type} - ${dto.network}`,
        );
      } catch (err) {
        // Insufficient balance etc — record as a failed transaction for history.
        const failed = await this.txModel.create({
          user: userId,
          type: dto.type,
          network: dto.network,
          target: dto.target,
          planName: dto.planName || null,
          amount: dto.amount,
          status: 'failed',
          reference,
          channel: 'wallet',
          failureReason: err.message,
        });
        return failed;
      }
    }

    // NOTE: this is where a real integration would call the actual VTU/data
    // provider's API (e.g. buy airtime from their reseller endpoint) and only
    // mark the transaction 'success' once that provider confirms it. For now
    // it's marked successful immediately after the wallet debit. Airtime2Cash
    // requests go to 'pending' instead, for an admin to review and pay out.
    const tx = await this.txModel.create({
      user: userId,
      type: dto.type,
      network: dto.network,
      target: dto.target,
      planName: dto.planName || null,
      amount: dto.amount,
      status: isA2c ? 'pending' : 'success',
      reference,
      channel: 'wallet',
      payoutBankName: dto.payoutBankName || null,
      payoutAccountNumber: dto.payoutAccountNumber || null,
      history: [{ status: isA2c ? 'pending' : 'success', note: 'Request submitted by user', adminName: 'System', date: new Date() }],
    });

    // Refresh the 5-minute quick-auth window whenever a real PIN was used,
    // so the next purchase (e.g. via fingerprint) within that window doesn't
    // need the PIN typed again.
    const result = tx.toObject();
    if (dto.pin) {
      result.quickAuthToken = this.jwtService.sign(
        { sub: userId, role: 'user', quickAuth: true },
        { expiresIn: '5m' },
      );
    }
    return result;
  }

  // Admin advances an Airtime2Cash request through its review workflow
  // (pending -> processing -> approved -> paid, or -> rejected). Each step
  // is appended to the transaction's history for a full audit trail.
  async advanceA2cStatus(id: string, status: string, note: string, adminName: string) {
    const tx = await this.txModel.findById(id);
    if (!tx) throw new NotFoundException('Transaction not found');
    tx.status = status;
    tx.history.push({ status, note, adminName, date: new Date() });
    await tx.save();
    return tx;
  }

  async findMine(userId: string, page = 1, limit = 20, type?: string, status?: string) {
    const filter: any = { user: userId };
    if (type) filter.type = type;
    if (status) filter.status = status;
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.txModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      this.txModel.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  }

  async findOne(id: string) {
    const tx = await this.txModel.findById(id).populate('user', 'name email phone');
    if (!tx) throw new NotFoundException('Transaction not found');
    return tx;
  }

  // Admin: paginated list across all users, with filters + search by reference/target.
  async listAll(params: {
    page?: number;
    limit?: number;
    type?: string;
    status?: string;
    network?: string;
    search?: string;
    userId?: string;
  }) {
    const { page = 1, limit = 20, type, status, network, search, userId } = params;
    const filter: any = {};
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (network) filter.network = network;
    if (userId) filter.user = userId;
    if (search) {
      filter.$or = [
        { reference: { $regex: search, $options: 'i' } },
        { target: { $regex: search, $options: 'i' } },
      ];
    }
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.txModel
        .find(filter)
        .populate('user', 'name email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.txModel.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  }
}
