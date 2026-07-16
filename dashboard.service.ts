import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Transaction, TransactionDocument } from '../transactions/schemas/transaction.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Wallet, WalletDocument } from '../wallet/schemas/wallet.schema';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Transaction.name) private txModel: Model<TransactionDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Wallet.name) private walletModel: Model<WalletDocument>,
  ) {}

  async stats() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      activeUsers,
      newUsersToday,
      totalTx,
      successfulTx,
      pendingTx,
      failedTx,
      todayRevenueAgg,
      monthRevenueAgg,
      totalRevenueAgg,
      walletTotalAgg,
    ] = await Promise.all([
      this.userModel.countDocuments(),
      this.userModel.countDocuments({ status: 'active' }),
      this.userModel.countDocuments({ createdAt: { $gte: startOfToday } }),
      this.txModel.countDocuments(),
      this.txModel.countDocuments({ status: 'success' }),
      this.txModel.countDocuments({ status: 'pending' }),
      this.txModel.countDocuments({ status: 'failed' }),
      this.txModel.aggregate([
        { $match: { status: 'success', createdAt: { $gte: startOfToday } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      this.txModel.aggregate([
        { $match: { status: 'success', createdAt: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      this.txModel.aggregate([
        { $match: { status: 'success' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      this.walletModel.aggregate([
        { $group: { _id: null, total: { $sum: '$balance' } } },
      ]),
    ]);

    return {
      totalUsers,
      activeUsers,
      newUsersToday,
      totalTransactions: totalTx,
      successfulTransactions: successfulTx,
      pendingTransactions: pendingTx,
      failedTransactions: failedTx,
      todayRevenue: todayRevenueAgg[0]?.total || 0,
      monthlyRevenue: monthRevenueAgg[0]?.total || 0,
      totalRevenue: totalRevenueAgg[0]?.total || 0,
      walletBalance: walletTotalAgg[0]?.total || 0,
    };
  }

  // Daily revenue for the last N days — feeds the Recharts AreaChart that
  // used to read from the hardcoded `revenueSeries` mock array.
  async revenueSeries(days = 14) {
    const since = new Date();
    since.setDate(since.getDate() - (days - 1));
    since.setHours(0, 0, 0, 0);

    const rows = await this.txModel.aggregate([
      { $match: { status: 'success', createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Fill in any missing days with zero so the chart doesn't have gaps.
    const map = new Map(rows.map((r) => [r._id, r]));
    const result = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      const found = map.get(key);
      result.push({
        date: key,
        revenue: found?.revenue || 0,
        count: found?.count || 0,
      });
    }
    return result;
  }

  // Sales split by network — feeds the PieChart/BarChart that used to read
  // from the hardcoded `networkSales` mock array.
  async networkSales() {
    return this.txModel.aggregate([
      { $match: { status: 'success' } },
      {
        $group: {
          _id: '$network',
          revenue: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { revenue: -1 } },
      { $project: { network: '$_id', revenue: 1, count: 1, _id: 0 } },
    ]);
  }
}
