import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Plan, PlanDocument } from './schemas/plan.schema';

@Injectable()
export class PlansService {
  constructor(@InjectModel(Plan.name) private planModel: Model<PlanDocument>) {}

  async list(category?: string, provider?: string, activeOnly = true) {
    const filter: any = {};
    if (category) filter.category = category;
    if (provider) filter.provider = provider;
    if (activeOnly) filter.active = true;
    return this.planModel.find(filter).sort({ provider: 1, price: 1 });
  }

  async create(data: Partial<Plan>) {
    return this.planModel.create(data);
  }

  async update(id: string, data: Partial<Plan>) {
    const plan = await this.planModel.findByIdAndUpdate(id, data, {
      new: true,
    });
    if (!plan) throw new NotFoundException('Plan not found');
    return plan;
  }

  async remove(id: string) {
    const plan = await this.planModel.findByIdAndDelete(id);
    if (!plan) throw new NotFoundException('Plan not found');
    return { success: true };
  }

  async findById(id: string) {
    const plan = await this.planModel.findById(id);
    if (!plan) throw new NotFoundException('Plan not found');
    return plan;
  }
}
