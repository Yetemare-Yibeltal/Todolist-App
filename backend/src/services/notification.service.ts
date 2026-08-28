import { Types } from "mongoose";
import { logger } from "../utils/logger";
import { ApiError } from "../utils/apiError";
import { emailService } from "./email.service";
import { redisClient, redisGet, redisSet, redisDel } from "../config/redis";
import { env } from "../config/env";
import { EventEmitter } from "events";
import { performance } from "perf_hooks";

interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  readAt?: Date;
  delivered: boolean;
  deliveredAt?: Date;
  createdAt: Date;
  priority: "low" | "medium" | "high" | "critical";
  expiresAt?: Date;
  actions?: Array<{
    label: string;
    url: string;
    method?: "GET" | "POST" | "PUT" | "DELETE";
  }>;
  metadata?: Record<string, any>;
}

type NotificationType =
  | "task_assigned"
  | "task_completed"
  | "task_overdue"
  | "task_deleted"
  | "task_updated"
  | "task_commented"
  | "task_mentioned"
  | "task_watched"
  | "team_invite"
  | "team_joined"
  | "team_left"
  | "team_updated"
  | "comment_added"
  | "comment_replied"
  | "mentioned"
  | "system_alert"
  | "security_alert"
  | "reminder"
  | "weekly_summary"
  | "monthly_report"
  | "achievement";

interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  inApp: boolean;
  types: Record<NotificationType, boolean>;
}

interface PushToken {
  token: string;
  device: string;
  platform: "ios" | "android" | "web";
  createdAt: Date;
  lastUsed: Date;
}

class NotificationService extends EventEmitter {
  private static instance: NotificationService;
  private cachePrefix = "notification:";
  private userPrefsPrefix = "notification:prefs:";
  private pushTokensPrefix = "notification:push:";
  private notificationCounter = 0;
  private maxNotificationsPerUser = 1000;
  private retentionDays = 30;

  private constructor() {
    super();
    this.setupEventHandlers();
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private setupEventHandlers(): void {
    process.on("SIGTERM", async () => {
      await this.shutdown();
    });
    process.on("SIGINT", async () => {
      await this.shutdown();
    });
  }

  private generateId(): string {
    return `notif_${Date.now()}_${++this.notificationCounter}`;
  }

  private getCacheKey(userId: string): string {
    return `${this.cachePrefix}${userId}`;
  }

  private getUserPrefsKey(userId: string): string {
    return `${this.userPrefsPrefix}${userId}`;
  }

  private getPushTokensKey(userId: string): string {
    return `${this.pushTokensPrefix}${userId}`;
  }

  private async getDefaultPreferences(): Promise<NotificationPreferences> {
    return {
      email: true,
      push: true,
      sms: false,
      inApp: true,
      types: {
        task_assigned: true,
        task_completed: true,
        task_overdue: true,
        task_deleted: false,
        task_updated: true,
        task_commented: true,
        task_mentioned: true,
        task_watched: false,
        team_invite: true,
        team_joined: true,
        team_left: false,
        team_updated: true,
        comment_added: true,
        comment_replied: true,
        mentioned: true,
        system_alert: true,
        security_alert: true,
        reminder: true,
        weekly_summary: true,
        monthly_report: true,
        achievement: true,
      },
    };
  }

  public async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    data?: Record<string, any>,
    priority: "low" | "medium" | "high" | "critical" = "medium",
  ): Promise<Notification> {
    const startTime = performance.now();

    try {
      const notification: Notification = {
        id: this.generateId(),
        userId,
        type,
        title,
        message,
        data,
        read: false,
        delivered: false,
        createdAt: new Date(),
        priority,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      const key = this.getCacheKey(userId);
      const existing = ((await redisGet(key)) as Notification[]) || [];

      existing.push(notification);

      if (existing.length > this.maxNotificationsPerUser) {
        const sorted = existing.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        const trimmed = sorted.slice(0, this.maxNotificationsPerUser);
        await redisSet(key, trimmed, {
          ttl: this.retentionDays * 24 * 60 * 60,
        });
      } else {
        await redisSet(key, existing, {
          ttl: this.retentionDays * 24 * 60 * 60,
        });
      }

      const duration = (performance.now() - startTime) / 1000;
      logger.debug(`Notification created in ${duration.toFixed(2)}s`, {
        userId,
        type,
        title,
      });

      this.emit("notificationCreated", { notification });

      await this.deliverNotification(notification);

      return notification;
    } catch (error: any) {
      logger.error("Create notification error:", {
        error: error.message,
        userId,
      });
      throw new ApiError(500, "Failed to create notification");
    }
  }

  public async getNotifications(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      read?: boolean;
      type?: NotificationType;
      startDate?: Date;
      endDate?: Date;
      priority?: "low" | "medium" | "high" | "critical";
    } = {},
  ): Promise<{ notifications: Notification[]; total: number; unread: number }> {
    try {
      const key = this.getCacheKey(userId);
      const all = ((await redisGet(key)) as Notification[]) || [];

      let filtered = all;

      if (options.read !== undefined) {
        filtered = filtered.filter((n) => n.read === options.read);
      }

      if (options.type) {
        filtered = filtered.filter((n) => n.type === options.type);
      }

      if (options.startDate) {
        filtered = filtered.filter(
          (n) => new Date(n.createdAt) >= options.startDate!,
        );
      }

      if (options.endDate) {
        filtered = filtered.filter(
          (n) => new Date(n.createdAt) <= options.endDate!,
        );
      }

      if (options.priority) {
        filtered = filtered.filter((n) => n.priority === options.priority);
      }

      const sorted = filtered.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      const unread = all.filter((n) => !n.read).length;
      const total = sorted.length;

      const limit = Math.min(options.limit || 20, 100);
      const offset = options.offset || 0;
      const notifications = sorted.slice(offset, offset + limit);

      return {
        notifications,
        total,
        unread,
      };
    } catch (error: any) {
      logger.error("Get notifications error:", {
        error: error.message,
        userId,
      });
      return { notifications: [], total: 0, unread: 0 };
    }
  }

  public async markAsRead(
    userId: string,
    notificationId: string,
  ): Promise<boolean> {
    try {
      const key = this.getCacheKey(userId);
      const all = ((await redisGet(key)) as Notification[]) || [];

      const index = all.findIndex((n) => n.id === notificationId);
      if (index === -1) {
        return false;
      }

      all[index].read = true;
      all[index].readAt = new Date();

      await redisSet(key, all, { ttl: this.retentionDays * 24 * 60 * 60 });

      this.emit("notificationRead", { userId, notificationId });

      return true;
    } catch (error: any) {
      logger.error("Mark as read error:", {
        error: error.message,
        userId,
        notificationId,
      });
      return false;
    }
  }

  public async markAllAsRead(userId: string): Promise<number> {
    try {
      const key = this.getCacheKey(userId);
      const all = ((await redisGet(key)) as Notification[]) || [];

      let count = 0;
      for (const notification of all) {
        if (!notification.read) {
          notification.read = true;
          notification.readAt = new Date();
          count++;
        }
      }

      if (count > 0) {
        await redisSet(key, all, { ttl: this.retentionDays * 24 * 60 * 60 });
      }

      this.emit("allNotificationsRead", { userId, count });

      return count;
    } catch (error: any) {
      logger.error("Mark all as read error:", { error: error.message, userId });
      return 0;
    }
  }

  public async deleteNotification(
    userId: string,
    notificationId: string,
  ): Promise<boolean> {
    try {
      const key = this.getCacheKey(userId);
      const all = ((await redisGet(key)) as Notification[]) || [];

      const filtered = all.filter((n) => n.id !== notificationId);

      if (filtered.length === all.length) {
        return false;
      }

      await redisSet(key, filtered, { ttl: this.retentionDays * 24 * 60 * 60 });

      this.emit("notificationDeleted", { userId, notificationId });

      return true;
    } catch (error: any) {
      logger.error("Delete notification error:", {
        error: error.message,
        userId,
        notificationId,
      });
      return false;
    }
  }

  public async deleteAllNotifications(userId: string): Promise<number> {
    try {
      const key = this.getCacheKey(userId);
      const all = ((await redisGet(key)) as Notification[]) || [];

      const count = all.length;

      if (count > 0) {
        await redisDel(key);
      }

      this.emit("allNotificationsDeleted", { userId, count });

      return count;
    } catch (error: any) {
      logger.error("Delete all notifications error:", {
        error: error.message,
        userId,
      });
      return 0;
    }
  }

  public async getUnreadCount(userId: string): Promise<number> {
    try {
      const key = this.getCacheKey(userId);
      const all = ((await redisGet(key)) as Notification[]) || [];

      return all.filter((n) => !n.read).length;
    } catch (error: any) {
      logger.error("Get unread count error:", { error: error.message, userId });
      return 0;
    }
  }

  private async deliverNotification(notification: Notification): Promise<void> {
    try {
      const prefs = await this.getUserPreferences(notification.userId);

      if (prefs.inApp) {
        await this.deliverInApp(notification);
      }

      if (prefs.email && prefs.types[notification.type]) {
        await this.deliverEmail(notification);
      }

      if (prefs.push && prefs.types[notification.type]) {
        await this.deliverPush(notification);
      }

      notification.delivered = true;
      notification.deliveredAt = new Date();

      const key = this.getCacheKey(notification.userId);
      const all = ((await redisGet(key)) as Notification[]) || [];
      const index = all.findIndex((n) => n.id === notification.id);
      if (index !== -1) {
        all[index] = notification;
        await redisSet(key, all, { ttl: this.retentionDays * 24 * 60 * 60 });
      }

      this.emit("notificationDelivered", { notification });
    } catch (error: any) {
      logger.error("Deliver notification error:", {
        error: error.message,
        userId: notification.userId,
        type: notification.type,
      });
    }
  }

  private async deliverInApp(notification: Notification): Promise<void> {
    // In-app delivery is handled by the cache already
    // WebSocket notifications would be sent here
    this.emit("inAppNotification", notification);
  }

  private async deliverEmail(notification: Notification): Promise<void> {
    try {
      // This would fetch user email from database
      // For now, we'll just log it
      logger.info("Email notification would be sent:", {
        userId: notification.userId,
        type: notification.type,
        title: notification.title,
      });

      // Actual email sending would be handled by emailService
      // await emailService.sendNotificationEmail(user.email, notification);
    } catch (error: any) {
      logger.error("Deliver email error:", { error: error.message });
    }
  }

  private async deliverPush(notification: Notification): Promise<void> {
    try {
      const tokens = await this.getPushTokens(notification.userId);

      if (tokens.length === 0) {
        return;
      }

      // Push notification delivery would be handled here
      // using Firebase Cloud Messaging or similar
      logger.info("Push notification would be sent:", {
        userId: notification.userId,
        type: notification.type,
        tokens: tokens.length,
      });
    } catch (error: any) {
      logger.error("Deliver push error:", { error: error.message });
    }
  }

  public async getUserPreferences(
    userId: string,
  ): Promise<NotificationPreferences> {
    try {
      const key = this.getUserPrefsKey(userId);
      const prefs = await redisGet(key);

      if (prefs) {
        return prefs as NotificationPreferences;
      }

      const defaults = await this.getDefaultPreferences();
      await redisSet(key, defaults, { ttl: 30 * 24 * 60 * 60 });
      return defaults;
    } catch (error: any) {
      logger.error("Get user preferences error:", {
        error: error.message,
        userId,
      });
      return await this.getDefaultPreferences();
    }
  }

  public async updateUserPreferences(
    userId: string,
    updates: Partial<NotificationPreferences>,
  ): Promise<NotificationPreferences> {
    try {
      const current = await this.getUserPreferences(userId);
      const updated = { ...current, ...updates };

      const key = this.getUserPrefsKey(userId);
      await redisSet(key, updated, { ttl: 30 * 24 * 60 * 60 });

      this.emit("preferencesUpdated", { userId, updates });

      return updated;
    } catch (error: any) {
      logger.error("Update preferences error:", {
        error: error.message,
        userId,
      });
      throw new ApiError(500, "Failed to update preferences");
    }
  }

  public async registerPushToken(
    userId: string,
    token: string,
    device: string,
    platform: "ios" | "android" | "web",
  ): Promise<void> {
    try {
      const key = this.getPushTokensKey(userId);
      const tokens = ((await redisGet(key)) as PushToken[]) || [];

      const existing = tokens.find((t) => t.token === token);
      if (existing) {
        existing.lastUsed = new Date();
      } else {
        tokens.push({
          token,
          device,
          platform,
          createdAt: new Date(),
          lastUsed: new Date(),
        });
      }

      await redisSet(key, tokens, { ttl: 30 * 24 * 60 * 60 });

      this.emit("pushTokenRegistered", { userId, device });
    } catch (error: any) {
      logger.error("Register push token error:", {
        error: error.message,
        userId,
      });
    }
  }

  public async unregisterPushToken(
    userId: string,
    token: string,
  ): Promise<void> {
    try {
      const key = this.getPushTokensKey(userId);
      const tokens = ((await redisGet(key)) as PushToken[]) || [];

      const filtered = tokens.filter((t) => t.token !== token);

      if (filtered.length === 0) {
        await redisDel(key);
      } else {
        await redisSet(key, filtered, { ttl: 30 * 24 * 60 * 60 });
      }

      this.emit("pushTokenUnregistered", { userId });
    } catch (error: any) {
      logger.error("Unregister push token error:", {
        error: error.message,
        userId,
      });
    }
  }

  public async getPushTokens(userId: string): Promise<PushToken[]> {
    try {
      const key = this.getPushTokensKey(userId);
      const tokens = ((await redisGet(key)) as PushToken[]) || [];
      return tokens;
    } catch (error: any) {
      logger.error("Get push tokens error:", { error: error.message, userId });
      return [];
    }
  }

  public async notifyTaskAssigned(task: any): Promise<void> {
    if (!task.assignee) return;

    await this.createNotification(
      task.assignee.toString(),
      "task_assigned",
      "Task Assigned",
      `You have been assigned to "${task.title}"`,
      {
        taskId: task._id.toString(),
        taskTitle: task.title,
        assigneeId: task.assignee.toString(),
        creatorId: task.creator.toString(),
      },
      "high",
    );
  }

  public async notifyTaskCompleted(task: any): Promise<void> {
    if (!task.assignee) return;

    await this.createNotification(
      task.assignee.toString(),
      "task_completed",
      "Task Completed",
      `Task "${task.title}" has been completed`,
      {
        taskId: task._id.toString(),
        taskTitle: task.title,
        completedBy: task.assignee.toString(),
      },
      "medium",
    );
  }

  public async notifyTaskOverdue(task: any): Promise<void> {
    if (!task.assignee) return;

    await this.createNotification(
      task.assignee.toString(),
      "task_overdue",
      "Task Overdue",
      `Task "${task.title}" is overdue`,
      {
        taskId: task._id.toString(),
        taskTitle: task.title,
        dueDate: task.dueDate,
        daysOverdue: Math.ceil(
          (Date.now() - new Date(task.dueDate).getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      },
      "high",
    );
  }

  public async notifyTaskUpdated(task: any, updatedBy: string): Promise<void> {
    if (!task.watchers || task.watchers.length === 0) return;

    for (const watcherId of task.watchers) {
      if (watcherId.toString() === updatedBy) continue;

      await this.createNotification(
        watcherId.toString(),
        "task_updated",
        "Task Updated",
        `Task "${task.title}" has been updated`,
        {
          taskId: task._id.toString(),
          taskTitle: task.title,
          updatedBy,
        },
        "medium",
      );
    }
  }

  public async notifyTaskCommented(
    task: any,
    comment: any,
    commenterId: string,
  ): Promise<void> {
    if (!task.watchers || task.watchers.length === 0) return;

    for (const watcherId of task.watchers) {
      if (watcherId.toString() === commenterId) continue;

      await this.createNotification(
        watcherId.toString(),
        "task_commented",
        "New Comment",
        `New comment on "${task.title}" from ${commenterId}`,
        {
          taskId: task._id.toString(),
          taskTitle: task.title,
          commentId: comment._id.toString(),
          commenterId,
          comment: comment.content,
        },
        "medium",
      );
    }
  }

  public async notifyMentioned(
    userId: string,
    mentionedBy: string,
    context: string,
    taskId?: string,
  ): Promise<void> {
    await this.createNotification(
      userId,
      "mentioned",
      "You were mentioned",
      `You were mentioned in ${context}`,
      {
        mentionedBy,
        context,
        taskId,
        timestamp: new Date().toISOString(),
      },
      "medium",
    );
  }

  public async notifyTeamInvite(
    userId: string,
    teamName: string,
    invitedBy: string,
  ): Promise<void> {
    await this.createNotification(
      userId,
      "team_invite",
      "Team Invitation",
      `You have been invited to join "${teamName}"`,
      {
        teamName,
        invitedBy,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      "high",
    );
  }

  public async sendReminder(userId: string, task: any): Promise<void> {
    await this.createNotification(
      userId,
      "reminder",
      "Task Reminder",
      `Reminder: "${task.title}" is due soon`,
      {
        taskId: task._id.toString(),
        taskTitle: task.title,
        dueDate: task.dueDate,
        daysUntilDue: Math.ceil(
          (new Date(task.dueDate).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24),
        ),
      },
      "high",
    );
  }

  public async sendSecurityAlert(
    userId: string,
    message: string,
    data?: Record<string, any>,
  ): Promise<void> {
    await this.createNotification(
      userId,
      "security_alert",
      "Security Alert",
      message,
      data,
      "critical",
    );
  }

  public async sendSystemAlert(
    userId: string,
    message: string,
    data?: Record<string, any>,
  ): Promise<void> {
    await this.createNotification(
      userId,
      "system_alert",
      "System Alert",
      message,
      data,
      "high",
    );
  }

  public async sendWeeklySummary(
    userId: string,
    data: {
      tasksCompleted: number;
      tasksCreated: number;
      overdueTasks: number;
      pendingTasks: number;
    },
  ): Promise<void> {
    await this.createNotification(
      userId,
      "weekly_summary",
      "Weekly Summary",
      `You completed ${data.tasksCompleted} tasks this week`,
      data,
      "low",
    );
  }

  public async sendMonthlyReport(
    userId: string,
    data: {
      tasksCompleted: number;
      tasksCreated: number;
      avgCompletionTime: number;
      productivityScore: number;
    },
  ): Promise<void> {
    await this.createNotification(
      userId,
      "monthly_report",
      "Monthly Report",
      `Your productivity score this month: ${data.productivityScore}%`,
      data,
      "low",
    );
  }

  public async cleanupOldNotifications(): Promise<void> {
    try {
      const pattern = `${this.cachePrefix}*`;
      const keys = await redisClient.keys(pattern);

      let totalDeleted = 0;
      for (const key of keys) {
        const userId = key.replace(this.cachePrefix, "");
        const all = ((await redisGet(key)) as Notification[]) || [];

        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - this.retentionDays);

        const filtered = all.filter((n) => new Date(n.createdAt) >= cutoff);

        if (filtered.length !== all.length) {
          await redisSet(key, filtered, {
            ttl: this.retentionDays * 24 * 60 * 60,
          });
          totalDeleted += all.length - filtered.length;
        }
      }

      logger.info(`Cleaned up ${totalDeleted} old notifications`);
    } catch (error: any) {
      logger.error("Cleanup old notifications error:", {
        error: error.message,
      });
    }
  }

  public async shutdown(): Promise<void> {
    logger.info("Notification service shutting down");
    this.emit("shutdown");
  }
}

export const notificationService = NotificationService.getInstance();
export default notificationService;
