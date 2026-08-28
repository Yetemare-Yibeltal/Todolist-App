import nodemailer from "nodemailer";
import { createTransport, Transporter, SendMailOptions } from "nodemailer";
import { env } from "../config/env";
import { logger } from "../utils/logger";
import { ApiError } from "../utils/apiError";
import { redisClient, redisGet, redisSet, redisDel } from "../config/redis";
import { performance } from "perf_hooks";
import { EventEmitter } from "events";
import { join } from "path";
import { readFileSync } from "fs";
import Handlebars from "handlebars";

interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  template?: string;
  templateData?: Record<string, any>;
  attachments?: Array<{
    filename: string;
    content?: string | Buffer;
    path?: string;
    contentType?: string;
  }>;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  priority?: "high" | "normal" | "low";
  headers?: Record<string, string>;
}

interface EmailTemplate {
  name: string;
  subject: string;
  html: string;
  text?: string;
}

interface EmailStats {
  sent: number;
  failed: number;
  total: number;
  lastSentAt: Date | null;
  lastError: string | null;
  avgDeliveryTime: number;
}

class EmailService extends EventEmitter {
  private static instance: EmailService;
  private transporter: Transporter | null = null;
  private isConnected = false;
  private templates: Map<string, EmailTemplate> = new Map();
  private stats: EmailStats = {
    sent: 0,
    failed: 0,
    total: 0,
    lastSentAt: null,
    lastError: null,
    avgDeliveryTime: 0,
  };
  private queue: EmailOptions[] = [];
  private isProcessing = false;
  private maxRetries = 3;
  private retryDelay = 1000;
  private cachePrefix = "email:template:";

  private constructor() {
    super();
    this.loadTemplates();
    this.setupEventHandlers();
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  private setupEventHandlers(): void {
    process.on("SIGTERM", async () => {
      await this.shutdown();
    });
    process.on("SIGINT", async () => {
      await this.shutdown();
    });
  }

  private loadTemplates(): void {
    try {
      const templateDir = join(__dirname, "../../templates/email");

      const templates = [
        "welcome",
        "verify-email",
        "reset-password",
        "task-assigned",
        "task-completed",
        "task-overdue",
        "team-invite",
        "comment-notification",
        "mention-notification",
        "reminder",
        "weekly-summary",
        "monthly-report",
        "account-suspended",
        "account-deleted",
        "password-changed",
        "email-changed",
        "two-factor-enabled",
        "two-factor-disabled",
        "backup-codes",
        "device-login",
      ];

      for (const templateName of templates) {
        try {
          const htmlPath = join(templateDir, `${templateName}.html`);
          const textPath = join(templateDir, `${templateName}.txt`);
          const subjectPath = join(templateDir, `${templateName}.subject.txt`);

          const html = readFileSync(htmlPath, "utf-8");
          const text = readFileSync(textPath, "utf-8");
          const subject = readFileSync(subjectPath, "utf-8").trim();

          this.templates.set(templateName, {
            name: templateName,
            subject,
            html,
            text,
          });

          logger.debug(`Email template loaded: ${templateName}`);
        } catch (error: any) {
          logger.warn(`Template ${templateName} not found, using default`, {
            error: error.message,
          });
          this.templates.set(templateName, {
            name: templateName,
            subject: templateName.replace(/-/g, " "),
            html: `<p>Default template for ${templateName}</p>`,
            text: `Default template for ${templateName}`,
          });
        }
      }

      logger.info(`Loaded ${this.templates.size} email templates`);
    } catch (error: any) {
      logger.error("Failed to load email templates:", { error: error.message });
    }
  }

  public async initialize(): Promise<void> {
    try {
      if (!env.EMAIL_HOST || !env.EMAIL_USER || !env.EMAIL_PASS) {
        logger.warn(
          "Email configuration incomplete. Email service running in test mode.",
        );
        this.isConnected = true;
        return;
      }

      this.transporter = createTransport({
        host: env.EMAIL_HOST,
        port: env.EMAIL_PORT,
        secure: env.EMAIL_SECURE,
        auth: {
          user: env.EMAIL_USER,
          pass: env.EMAIL_PASS,
        },
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        rateLimit: 10,
        tls: {
          rejectUnauthorized: env.NODE_ENV === "production",
        },
        debug: env.NODE_ENV === "development",
        logger: env.NODE_ENV === "development",
        priority: "normal",
        headers: {
          "X-Priority": "3",
          "X-MSMail-Priority": "Normal",
        },
      });

      await this.transporter.verify();
      this.isConnected = true;
      logger.info("Email service initialized successfully");
    } catch (error: any) {
      logger.error("Email service initialization failed:", {
        error: error.message,
      });
      this.isConnected = true;
    }
  }

  private async getCachedTemplate(
    templateName: string,
  ): Promise<EmailTemplate | null> {
    try {
      const cacheKey = `${this.cachePrefix}${templateName}`;
      const cached = await redisGet(cacheKey);
      return cached as EmailTemplate | null;
    } catch (error: any) {
      logger.error("Cache template error:", { error: error.message });
      return null;
    }
  }

  private async cacheTemplate(
    templateName: string,
    template: EmailTemplate,
  ): Promise<void> {
    try {
      const cacheKey = `${this.cachePrefix}${templateName}`;
      await redisSet(cacheKey, template, { ttl: 3600 });
    } catch (error: any) {
      logger.error("Cache template error:", { error: error.message });
    }
  }

  private compileTemplate(
    template: EmailTemplate,
    data: Record<string, any> = {},
  ): { html: string; text: string } {
    try {
      const htmlTemplate = Handlebars.compile(template.html);
      const textTemplate = Handlebars.compile(template.text || "");

      const defaultData = {
        appName: env.APP_NAME || "TodoList",
        appUrl: env.FRONTEND_URL || "http://localhost:3000",
        supportEmail: env.SUPPORT_EMAIL || "support@todolist.com",
        year: new Date().getFullYear(),
        ...data,
      };

      const html = htmlTemplate(defaultData);
      const text = textTemplate(defaultData);

      return { html, text };
    } catch (error: any) {
      logger.error("Template compilation error:", { error: error.message });
      return {
        html: template.html,
        text: template.text || "",
      };
    }
  }

  private async sendWithRetry(
    options: SendMailOptions,
    retries: number = 0,
  ): Promise<any> {
    try {
      if (!this.transporter || !this.isConnected) {
        throw new Error("Email service not connected");
      }

      const result = await this.transporter.sendMail(options);
      return result;
    } catch (error: any) {
      if (retries < this.maxRetries) {
        const delay = this.retryDelay * Math.pow(2, retries);
        logger.warn(
          `Email send retry ${retries + 1}/${this.maxRetries} in ${delay}ms`,
          {
            error: error.message,
          },
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.sendWithRetry(options, retries + 1);
      }

      throw error;
    }
  }

  public async sendEmail(options: EmailOptions): Promise<any> {
    const startTime = performance.now();

    try {
      if (env.NODE_ENV === "test") {
        logger.debug("Test mode - email not sent:", {
          to: options.to,
          subject: options.subject,
        });
        return {
          messageId: "test-message-id",
          accepted: [options.to],
          rejected: [],
        };
      }

      if (options.template) {
        const template = this.templates.get(options.template);
        if (!template) {
          throw new ApiError(
            400,
            `Email template not found: ${options.template}`,
          );
        }

        const compiled = this.compileTemplate(template, options.templateData);
        options.html = compiled.html;
        options.text = compiled.text || compiled.html.replace(/<[^>]*>/g, "");
        options.subject = this.compileTemplate(
          { ...template, html: template.subject, text: "" },
          options.templateData,
        ).html;
      }

      const mailOptions: SendMailOptions = {
        from: options.replyTo || env.EMAIL_FROM || "noreply@todolist.com",
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments: options.attachments,
        cc: options.cc,
        bcc: options.bcc,
        replyTo: options.replyTo,
        priority: options.priority || "normal",
        headers: {
          "X-Priority": "3",
          "X-MSMail-Priority": "Normal",
          ...options.headers,
        },
      };

      const result = await this.sendWithRetry(mailOptions);

      const duration = (performance.now() - startTime) / 1000;
      this.stats.sent++;
      this.stats.total++;
      this.stats.lastSentAt = new Date();
      this.stats.avgDeliveryTime =
        (this.stats.avgDeliveryTime * (this.stats.sent - 1) + duration) /
        this.stats.sent;

      logger.info(`Email sent successfully in ${duration.toFixed(2)}s`, {
        to: options.to,
        subject: options.subject,
        messageId: result.messageId,
      });

      this.emit("sent", { options, result });

      return result;
    } catch (error: any) {
      this.stats.failed++;
      this.stats.total++;
      this.stats.lastError = error.message;

      logger.error("Email send failed:", {
        error: error.message,
        to: options.to,
        subject: options.subject,
        stack: error.stack,
      });

      this.emit("failed", { options, error });
      throw new ApiError(500, `Failed to send email: ${error.message}`);
    }
  }

  public async sendVerificationEmail(
    email: string,
    name: string,
    token: string,
  ): Promise<any> {
    const verificationLink = `${env.FRONTEND_URL}/verify-email?token=${token}`;

    return this.sendEmail({
      to: email,
      template: "verify-email",
      templateData: {
        name,
        verificationLink,
        token,
        expiresIn: "24 hours",
      },
      priority: "high",
    });
  }

  public async sendPasswordResetEmail(
    email: string,
    name: string,
    token: string,
  ): Promise<any> {
    const resetLink = `${env.FRONTEND_URL}/reset-password?token=${token}`;

    return this.sendEmail({
      to: email,
      template: "reset-password",
      templateData: {
        name,
        resetLink,
        token,
        expiresIn: "1 hour",
      },
      priority: "high",
    });
  }

  public async sendWelcomeEmail(email: string, name: string): Promise<any> {
    return this.sendEmail({
      to: email,
      template: "welcome",
      templateData: {
        name,
        loginUrl: `${env.FRONTEND_URL}/login`,
        docsUrl: `${env.FRONTEND_URL}/docs`,
      },
    });
  }

  public async sendTaskAssignedEmail(
    email: string,
    name: string,
    taskTitle: string,
    taskId: string,
    assignedBy: string,
  ): Promise<any> {
    const taskLink = `${env.FRONTEND_URL}/tasks/${taskId}`;

    return this.sendEmail({
      to: email,
      template: "task-assigned",
      templateData: {
        name,
        taskTitle,
        taskLink,
        assignedBy,
        taskId,
      },
    });
  }

  public async sendTaskCompletedEmail(
    email: string,
    name: string,
    taskTitle: string,
    taskId: string,
  ): Promise<any> {
    const taskLink = `${env.FRONTEND_URL}/tasks/${taskId}`;

    return this.sendEmail({
      to: email,
      template: "task-completed",
      templateData: {
        name,
        taskTitle,
        taskLink,
        taskId,
      },
    });
  }

  public async sendTaskOverdueEmail(
    email: string,
    name: string,
    taskTitle: string,
    taskId: string,
    dueDate: Date,
  ): Promise<any> {
    const taskLink = `${env.FRONTEND_URL}/tasks/${taskId}`;
    const daysOverdue = Math.ceil(
      (Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    return this.sendEmail({
      to: email,
      template: "task-overdue",
      templateData: {
        name,
        taskTitle,
        taskLink,
        taskId,
        dueDate: dueDate.toLocaleDateString(),
        daysOverdue,
      },
      priority: "high",
    });
  }

  public async sendTeamInviteEmail(
    email: string,
    name: string,
    teamName: string,
    inviteCode: string,
    invitedBy: string,
  ): Promise<any> {
    const inviteLink = `${env.FRONTEND_URL}/teams/join?code=${inviteCode}`;

    return this.sendEmail({
      to: email,
      template: "team-invite",
      templateData: {
        name,
        teamName,
        inviteLink,
        inviteCode,
        invitedBy,
      },
    });
  }

  public async sendCommentNotificationEmail(
    email: string,
    name: string,
    taskTitle: string,
    taskId: string,
    comment: string,
    commenter: string,
  ): Promise<any> {
    const taskLink = `${env.FRONTEND_URL}/tasks/${taskId}`;

    return this.sendEmail({
      to: email,
      template: "comment-notification",
      templateData: {
        name,
        taskTitle,
        taskLink,
        taskId,
        comment,
        commenter,
      },
    });
  }

  public async sendMentionNotificationEmail(
    email: string,
    name: string,
    taskTitle: string,
    taskId: string,
    mentionedBy: string,
    context: string,
  ): Promise<any> {
    const taskLink = `${env.FRONTEND_URL}/tasks/${taskId}`;

    return this.sendEmail({
      to: email,
      template: "mention-notification",
      templateData: {
        name,
        taskTitle,
        taskLink,
        taskId,
        mentionedBy,
        context,
      },
    });
  }

  public async sendReminderEmail(
    email: string,
    name: string,
    taskTitle: string,
    taskId: string,
    dueDate: Date,
  ): Promise<any> {
    const taskLink = `${env.FRONTEND_URL}/tasks/${taskId}`;

    return this.sendEmail({
      to: email,
      template: "reminder",
      templateData: {
        name,
        taskTitle,
        taskLink,
        taskId,
        dueDate: dueDate.toLocaleDateString(),
        daysUntil: Math.ceil(
          (dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
        ),
      },
    });
  }

  public async sendWeeklySummary(
    email: string,
    name: string,
    data: {
      tasksCompleted: number;
      tasksCreated: number;
      overdueTasks: number;
      pendingTasks: number;
      topPriorities: Array<{ title: string; priority: string }>;
    },
  ): Promise<any> {
    return this.sendEmail({
      to: email,
      template: "weekly-summary",
      templateData: {
        name,
        ...data,
        reportDate: new Date().toLocaleDateString(),
      },
    });
  }

  public async sendMonthlyReport(
    email: string,
    name: string,
    data: {
      tasksCompleted: number;
      tasksCreated: number;
      avgCompletionTime: number;
      productivityScore: number;
      topPerformers: Array<{ name: string; tasksCompleted: number }>;
      insights: string[];
    },
  ): Promise<any> {
    return this.sendEmail({
      to: email,
      template: "monthly-report",
      templateData: {
        name,
        ...data,
        reportMonth: new Date().toLocaleString("default", {
          month: "long",
          year: "numeric",
        }),
      },
    });
  }

  public async sendTwoFactorEnabledEmail(
    email: string,
    name: string,
  ): Promise<any> {
    return this.sendEmail({
      to: email,
      template: "two-factor-enabled",
      templateData: {
        name,
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
      },
      priority: "high",
    });
  }

  public async sendTwoFactorDisabledEmail(
    email: string,
    name: string,
  ): Promise<any> {
    return this.sendEmail({
      to: email,
      template: "two-factor-disabled",
      templateData: {
        name,
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
      },
      priority: "high",
    });
  }

  public async sendBackupCodesEmail(
    email: string,
    name: string,
    codes: string[],
  ): Promise<any> {
    return this.sendEmail({
      to: email,
      template: "backup-codes",
      templateData: {
        name,
        codes,
        date: new Date().toLocaleDateString(),
      },
      priority: "high",
    });
  }

  public async sendNewDeviceLoginEmail(
    email: string,
    name: string,
    deviceInfo: {
      deviceName: string;
      location: string;
      ip: string;
      browser: string;
      os: string;
    },
  ): Promise<any> {
    return this.sendEmail({
      to: email,
      template: "device-login",
      templateData: {
        name,
        ...deviceInfo,
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
      },
      priority: "high",
    });
  }

  public async sendBulkEmails(emails: EmailOptions[]): Promise<{
    successful: number;
    failed: number;
    results: Array<{ email: string; success: boolean; error?: string }>;
  }> {
    const results: Array<{ email: string; success: boolean; error?: string }> =
      [];
    let successful = 0;
    let failed = 0;

    const batchSize = 10;
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      const batchPromises = batch.map(async (emailOptions) => {
        try {
          const result = await this.sendEmail(emailOptions);
          successful++;
          results.push({
            email: Array.isArray(emailOptions.to)
              ? emailOptions.to[0]
              : emailOptions.to,
            success: true,
          });
          return result;
        } catch (error: any) {
          failed++;
          results.push({
            email: Array.isArray(emailOptions.to)
              ? emailOptions.to[0]
              : emailOptions.to,
            success: false,
            error: error.message,
          });
          return null;
        }
      });

      await Promise.all(batchPromises);

      if (i + batchSize < emails.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return {
      successful,
      failed,
      results,
    };
  }

  public async queueEmail(options: EmailOptions): Promise<void> {
    this.queue.push(options);
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const options = this.queue.shift();
      if (!options) continue;

      try {
        await this.sendEmail(options);
      } catch (error: any) {
        logger.error("Queue email failed:", { error: error.message });
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    this.isProcessing = false;
  }

  public getQueueLength(): number {
    return this.queue.length;
  }

  public clearQueue(): void {
    this.queue = [];
    logger.info("Email queue cleared");
  }

  public getStats(): EmailStats {
    return { ...this.stats };
  }

  public resetStats(): void {
    this.stats = {
      sent: 0,
      failed: 0,
      total: 0,
      lastSentAt: null,
      lastError: null,
      avgDeliveryTime: 0,
    };
  }

  public async shutdown(): Promise<void> {
    if (this.transporter) {
      await this.transporter.close();
      logger.info("Email service shut down");
    }
  }

  public isConnectedService(): boolean {
    return this.isConnected;
  }

  public async testConnection(): Promise<boolean> {
    try {
      if (!this.transporter) {
        return false;
      }
      await this.transporter.verify();
      this.isConnected = true;
      return true;
    } catch (error: any) {
      this.isConnected = false;
      logger.error("Email connection test failed:", { error: error.message });
      return false;
    }
  }
}

export const emailService = EmailService.getInstance();
export default emailService;
