import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification, NotificationDocument } from './schemas/notification.schema';
import { User, UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class NotificationsService implements OnModuleInit {
  constructor(
    @InjectModel(Notification.name) private notifModel: Model<NotificationDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  // Lightweight in-process scheduler (no extra package needed): every
  // minute, checks for scheduled notifications whose time has arrived and
  // marks them delivered with a real recipient count.
  onModuleInit() {
    setInterval(() => this.deliverDueScheduled().catch(() => {}), 60 * 1000);
  }

  private async deliverDueScheduled() {
    const due = await this.notifModel.find({
      scheduledFor: { $ne: null, $lte: new Date() },
      status: 'scheduled',
    });
    for (const notif of due) {
      const recipients = await this.audienceCount(notif.audience);
      notif.recipients = recipients;
      notif.deliveredCount = recipients;
      notif.status = 'delivered';
      notif.sentAt = new Date();
      notif.scheduledFor = null;
      await notif.save();
    }
  }

  // Mirrors the frontend's audienceCount() so recipient counts are real,
  // not guessed — pulled straight from the Users collection.
  private async audienceCount(audience: string): Promise<number> {
    switch (audience) {
      case 'Active Users':
        return this.userModel.countDocuments({ status: 'active' });
      case 'Suspended Users':
        return this.userModel.countDocuments({ status: 'suspended' });
      case 'KYC Verified':
        return this.userModel.countDocuments({ kycStatus: 'verified' });
      case 'KYC Pending':
        return this.userModel.countDocuments({ kycStatus: 'pending' });
      case 'Reseller Users':
        return this.userModel.countDocuments({ accountType: 'reseller' });
      case 'API Users':
        return this.userModel.countDocuments({ accountType: 'api' });
      default:
        return this.userModel.countDocuments();
    }
  }

  // Creates and — unless scheduledFor is set — immediately "sends" a
  // broadcast. Actually dispatching push/SMS/email is a real third-party
  // integration (FCM, Termii, SendGrid, etc.) that isn't wired up yet, so
  // sending here means: compute real recipient counts and mark delivered.
  // Swap the delivery step for a real provider call when ready.
  async create(data: {
    title: string;
    message: string;
    channels: string[];
    audience: string;
    scheduledFor?: string | null;
  }) {
    const recipients = await this.audienceCount(data.audience);
    const isScheduled = !!data.scheduledFor && new Date(data.scheduledFor) > new Date();

    return this.notifModel.create({
      title: data.title,
      message: data.message,
      channels: data.channels,
      audience: data.audience,
      recipients,
      deliveredCount: isScheduled ? 0 : recipients,
      failedCount: 0,
      status: isScheduled ? 'scheduled' : 'delivered',
      scheduledFor: isScheduled ? new Date(data.scheduledFor) : null,
      sentAt: isScheduled ? null : new Date(),
    });
  }

  async history(page = 1, limit = 20) {
    const filter = { scheduledFor: null };
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.notifModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      this.notifModel.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  }

  async scheduled() {
    return this.notifModel
      .find({ scheduledFor: { $ne: null } })
      .sort({ scheduledFor: 1 });
  }

  async cancelScheduled(id: string) {
    const notif = await this.notifModel.findOneAndDelete({
      _id: id,
      scheduledFor: { $ne: null },
    });
    if (!notif) throw new NotFoundException('Scheduled notification not found');
    return { success: true };
  }
}
