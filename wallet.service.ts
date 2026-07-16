import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Wallet, WalletDocument } from './schemas/wallet.schema';
import { Ledger, LedgerDocument } from './schemas/ledger.schema';

@Injectable()
export class WalletService {
  constructor(
    @InjectModel(Wallet.name) private walletModel: Model<WalletDocument>,
    @InjectModel(Ledger.name) private ledgerModel: Model<LedgerDocument>,
  ) {}

  async createForUser(userId: Types.ObjectId | string) {
    return this.walletModel.create({ user: userId, balance: 0 });
  }

  async getBalance(userId: string) {
    const wallet = await this.walletModel.findOne({ user: userId });
    if (!wallet) throw new NotFoundException('Wallet not found');
    return wallet;
  }

  // Adds money to a wallet (used by funding callback and admin manual credit).
  async credit(
    userId: string,
    amount: number,
    source: string,
    reference?: string,
    note?: string,
  ) {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');
    const wallet = await this.walletModel.findOneAndUpdate(
      { user: userId },
      { $inc: { balance: amount } },
      { new: true },
    );
    if (!wallet) throw new NotFoundException('Wallet not found');
    await this.ledgerModel.create({
      user: userId,
      direction: 'credit',
      source,
      amount,
      balanceAfter: wallet.balance,
      reference: reference || null,
      status: 'success',
      note: note || null,
    });
    return wallet;
  }

  // Removes money from a wallet, e.g. to pay for a transaction. Throws if
  // there isn't enough balance so the caller can reject the purchase.
  async debit(
    userId: string,
    amount: number,
    source: string,
    reference?: string,
    note?: string,
  ) {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');
    const wallet = await this.walletModel.findOne({ user: userId });
    if (!wallet) throw new NotFoundException('Wallet not found');
    if (wallet.balance < amount) {
      throw new BadRequestException('Insufficient wallet balance');
    }
    wallet.balance -= amount;
    await wallet.save();
    await this.ledgerModel.create({
      user: userId,
      direction: 'debit',
      source,
      amount,
      balanceAfter: wallet.balance,
      reference: reference || null,
      status: 'success',
      note: note || null,
    });
    return wallet;
  }

  async getLedger(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.ledgerModel
        .find({ user: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.ledgerModel.countDocuments({ user: userId }),
    ]);
    return { items, total, page, limit };
  }

  async getAllLedger(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.ledgerModel
        .find()
        .populate('user', 'name email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.ledgerModel.countDocuments(),
    ]);
    return { items, total, page, limit };
  }

  // Admin action: remove money from a user's wallet (e.g. correcting a
  // manual credit error, or clawing back a disputed transaction).
  async adminDebit(userId: string, amount: number, note?: string) {
    return this.debit(userId, amount, 'admin-debit', `ADMIN-DR-${Date.now()}`, note);
  }

  // Starts a real Paystack payment: asks Paystack for a checkout URL the
  // frontend redirects the user to. Requires PAYSTACK_SECRET_KEY in .env —
  // get a free test key from your Paystack dashboard (dashboard.paystack.com).
  async initializePaystackFunding(userId: string, email: string, amount: number) {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      throw new BadRequestException(
        'PAYSTACK_SECRET_KEY is not configured — add it to .env to enable real wallet funding',
      );
    }
    const res = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: Math.round(amount * 100), // Paystack expects kobo
        metadata: { userId },
      }),
    });
    const data = await res.json();
    if (!data.status) {
      throw new BadRequestException(data.message || 'Could not start payment');
    }
    return { authorizationUrl: data.data.authorization_url, reference: data.data.reference };
  }

  // Verifies the webhook actually came from Paystack (HMAC of the raw body
  // using your secret key) before trusting it — never credit a wallet from
  // an unverified webhook call.
  verifyPaystackSignature(rawBody: Buffer, signature: string): boolean {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) return false;
    const crypto = require('crypto');
    const hash = crypto.createHmac('sha512', secretKey).update(rawBody).digest('hex');
    return hash === signature;
  }
}
