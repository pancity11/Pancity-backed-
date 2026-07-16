import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { A2cRate, A2cRateDocument } from './schemas/a2c-rate.schema';
import { A2cSettings, A2cSettingsDocument } from './schemas/a2c-settings.schema';

const DEFAULT_NETWORKS_RATES: Record<string, number> = {
  MTN: 82,
  Airtel: 80,
  Glo: 78,
  '9mobile': 78,
};

@Injectable()
export class A2cSettingsService implements OnModuleInit {
  constructor(
    @InjectModel(A2cRate.name) private rateModel: Model<A2cRateDocument>,
    @InjectModel(A2cSettings.name) private settingsModel: Model<A2cSettingsDocument>,
  ) {}

  // Seeds one rate document per known network on first boot.
  async onModuleInit() {
    const count = await this.rateModel.countDocuments();
    if (count === 0) {
      for (const [network, rate] of Object.entries(DEFAULT_NETWORKS_RATES)) {
        await this.rateModel.create({ network, rate });
      }
    }
    const settingsCount = await this.settingsModel.countDocuments();
    if (settingsCount === 0) await this.settingsModel.create({});
  }

  async listRates() {
    return this.rateModel.find().sort({ network: 1 });
  }

  async updateRate(network: string, rate: number) {
    return this.rateModel.findOneAndUpdate(
      { network },
      { rate },
      { new: true, upsert: true },
    );
  }

  async getSettings() {
    let settings = await this.settingsModel.findOne();
    if (!settings) settings = await this.settingsModel.create({});
    return settings;
  }

  async setServiceEnabled(enabled: boolean) {
    let settings = await this.settingsModel.findOne();
    if (!settings) settings = await this.settingsModel.create({ serviceEnabled: enabled });
    else {
      settings.serviceEnabled = enabled;
      await settings.save();
    }
    return settings;
  }

  // Used by the purchase flow to compute the cash payout for a given
  // airtime amount + network.
  async getRateForNetwork(network: string): Promise<number> {
    const rate = await this.rateModel.findOne({ network });
    return rate?.rate ?? 80;
  }
}
