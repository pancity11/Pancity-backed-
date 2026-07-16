import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  ReferralSettings,
  ReferralSettingsDocument,
} from './schemas/referral-settings.schema';
import {
  ReferralRecord,
  ReferralRecordDocument,
} from './schemas/referral-record.schema';
import { WalletService } from '../wallet/wallet.service';
import { Transaction, TransactionDocument } from '../transactions/schemas/transaction.schema';

@Injectable()
export class ReferralsService {
  constructor(
    @InjectModel(ReferralSettings.name)
    private settingsModel: Model<ReferralSettingsDocument>,
    @InjectModel(ReferralRecord.name)
    private recordModel: Model<ReferralRecordDocument>,
    @InjectModel(Transaction.name)
    private txModel: Model<TransactionDocument>,
    private walletService: WalletService,
  ) {}

  // There's only ever one settings document — created on first read if
  // it doesn't exist yet, so the admin always has something to edit.
  async getSettings() {
    let settings = await this.settingsModel.findOne();
    if (!settings) settings = await this.settingsModel.create({});
    return settings;
  }

  async updateSettings(data: Partial<ReferralSettings>) {
    let settings = await this.settingsModel.findOne();
    if (!settings) settings = await this.settingsModel.create(data);
    else Object.assign(settings, data), await settings.save();
    return settings;
  }

  // Called from AuthService.signup when a new user signs up with someone
  // else's referral code.
  async createRecord(referrerId: string, refereeId: string) {
    return this.recordModel.create({ referrer: referrerId, referee: refereeId });
  }

  async listRecords(page = 1, limit = 30, status?: string) {
    const filter: any = {};
    if (status) filter.status = status;
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.recordModel
        .find(filter)
        .populate('referrer', 'name email referralCode')
        .populate('referee', 'name email createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.recordModel.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  }

  // Aggregated per-referrer stats: how many people they referred, and
  // how many of those have been rewarded so far.
  async referrerStats() {
    return this.recordModel.aggregate([
      {
        $group: {
          _id: '$referrer',
          totalReferred: { $sum: 1 },
          totalQualified: { $sum: { $cond: [{ $ne: ['$status', 'pending'] }, 1, 0] } },
          totalRewarded: { $sum: { $cond: [{ $eq: ['$status', 'rewarded'] }, 1, 0] } },
          totalPaidOut: { $sum: '$rewardAmount' },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          referrerId: '$_id',
          name: '$user.name',
          email: '$user.email',
          referralCode: '$user.referralCode',
          totalReferred: 1,
          totalQualified: 1,
          totalRewarded: 1,
          totalPaidOut: 1,
          _id: 0,
        },
      },
      { $sort: { totalReferred: -1 } },
    ]);
  }

  // Admin marks a referral as having met the qualifying action (e.g. the
  // referee made their first funding/transaction).
  async markQualified(id: string) {
    const record = await this.recordModel.findByIdAndUpdate(
      id,
      { status: 'qualified' },
      { new: true },
    );
    if (!record) throw new NotFoundException('Referral record not found');
    return record;
  }

  // Admin approves payout — credits the referrer's wallet for real and
  // marks the record rewarded.
  async markRewarded(id: string) {
    const record = await this.recordModel.findById(id);
    if (!record) throw new NotFoundException('Referral record not found');
    if (record.status === 'rewarded') return record;

    const settings = await this.getSettings();
    await this.walletService.credit(
      record.referrer.toString(),
      settings.referrerBonus,
      'referral-bonus',
      `REF-${record._id}`,
      'Referral reward',
    );
    record.status = 'rewarded';
    record.rewardAmount = settings.referrerBonus;
    await record.save();
    return record;
  }

  // Ongoing commission: for each active referral, sums the referee's
  // successful transaction volume within the commission window
  // (createdAt -> createdAt + commissionDurationDays), computes what
  // commission that's worth, and returns how much is still outstanding
  // after subtracting whatever's already been paid.
  async getCommissionEarnings() {
    const settings = await this.getSettings();
    if (!settings.enabled || settings.commissionRate <= 0) return [];

    const records = await this.recordModel
      .find({ status: { $ne: 'pending' } })
      .populate('referrer', 'name email referralCode')
      .populate('referee', 'name email');

    const results = [];
    for (const record of records) {
      const windowEnd = new Date(
        (record as any).createdAt.getTime() + settings.commissionDurationDays * 24 * 60 * 60 * 1000,
      );
      const volumeAgg = await this.txModel.aggregate([
        {
          $match: {
            user: record.referee,
            status: 'success',
            createdAt: { $gte: (record as any).createdAt, $lte: windowEnd },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]);
      const volume = volumeAgg[0]?.total || 0;
      const commissionEarned = Math.round((volume * settings.commissionRate) / 100);
      const outstanding = Math.max(0, commissionEarned - record.commissionPaid);
      if (volume > 0) {
        results.push({
          recordId: record._id,
          referrerId: (record.referrer as any)?._id,
          referrerName: (record.referrer as any)?.name || 'Unknown',
          refereeName: (record.referee as any)?.name || 'Unknown',
          transactionVolume: volume,
          commissionEarned,
          commissionPaid: record.commissionPaid,
          outstanding,
          windowEnd,
        });
      }
    }
    return results;
  }

  // Admin pays out the outstanding commission for one referral record —
  // credits the referrer's wallet for real and records how much has been
  // paid so it isn't double-paid next time this is computed.
  async payCommission(recordId: string) {
    const record = await this.recordModel.findById(recordId);
    if (!record) throw new NotFoundException('Referral record not found');
    const settings = await this.getSettings();
    const windowEnd = new Date(
      (record as any).createdAt.getTime() + settings.commissionDurationDays * 24 * 60 * 60 * 1000,
    );
    const volumeAgg = await this.txModel.aggregate([
      {
        $match: {
          user: record.referee,
          status: 'success',
          createdAt: { $gte: (record as any).createdAt, $lte: windowEnd },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const volume = volumeAgg[0]?.total || 0;
    const commissionEarned = Math.round((volume * settings.commissionRate) / 100);
    const outstanding = Math.max(0, commissionEarned - record.commissionPaid);
    if (outstanding <= 0) {
      return { success: false, message: 'Nothing outstanding to pay' };
    }
    await this.walletService.credit(
      record.referrer.toString(),
      outstanding,
      'referral-commission',
      `REF-COMM-${record._id}-${Date.now()}`,
      'Referral commission payout',
    );
    record.commissionPaid += outstanding;
    await record.save();
    return { success: true, paid: outstanding };
  }
}
