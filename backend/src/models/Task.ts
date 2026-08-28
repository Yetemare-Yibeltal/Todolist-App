import mongoose, { Schema, Document, Model, Query, Types } from "mongoose";
import { redisClient, redisSet, redisGet, redisDel } from "../config/redis";
import { logger } from "../utils/logger";
import { auditLogger } from "../utils/logger";
import { env } from "../config/env";

export interface ITask extends Document {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  status:
    "todo" | "in_progress" | "in_review" | "done" | "archived" | "deleted";
  priority: "low" | "medium" | "high" | "urgent" | "critical";
  assignee?: Types.ObjectId;
  creator: Types.ObjectId;
  team?: Types.ObjectId;
  project?: Types.ObjectId;
  parentTask?: Types.ObjectId;
  subtasks: Types.ObjectId[];
  dueDate?: Date;
  startDate?: Date;
  completedAt?: Date;
  estimatedHours?: number;
  actualHours?: number;
  labels: string[];
  attachments: {
    url: string;
    name: string;
    type: string;
    size: number;
    uploadedBy: Types.ObjectId;
    uploadedAt: Date;
    publicId?: string;
  }[];
  comments: Types.ObjectId[];
  watchers: Types.ObjectId[];
  tags: string[];
  order: number;
  isRecurring: boolean;
  recurringRule?: {
    frequency: "daily" | "weekly" | "monthly" | "yearly" | "custom";
    interval: number;
    daysOfWeek?: number[];
    daysOfMonth?: number[];
    monthOfYear?: number;
    customRule?: string;
    endDate?: Date;
    occurrences?: number;
    currentOccurrence: number;
    originalTaskId?: Types.ObjectId;
  };
  reminders: {
    time: Date;
    type: "email" | "push" | "sms";
    sent: boolean;
    sentAt?: Date;
  }[];
  checklist: {
    text: string;
    completed: boolean;
    completedAt?: Date;
    completedBy?: Types.ObjectId;
  }[];
  timeTracking: {
    startedAt?: Date;
    pausedAt?: Date;
    totalSeconds: number;
    sessions: {
      start: Date;
      end?: Date;
      duration: number;
    }[];
    lastStart?: Date;
    isRunning: boolean;
  };
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    createdBy: Types.ObjectId;
    updatedBy: Types.ObjectId;
    ipAddress?: string;
    userAgent?: string;
    source?: "web" | "mobile" | "api" | "email" | "slack";
    priorityScore?: number;
    urgencyScore?: number;
    complexityScore?: number;
  };
  dependencies: Types.ObjectId[];
  blockedBy: Types.ObjectId[];
  blocks: Types.ObjectId[];
  viewCount: number;
  completionPercentage: number;
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;

  isOverdue(): boolean;
  isCompleted(): boolean;
  isBlocked(): Promise<boolean>;
  getProgress(): number;
  updateCompletionPercentage(): Promise<void>;
  calculatePriority(): number;
  assignToUser(userId: Types.ObjectId): Promise<void>;
  addSubtask(subtaskId: Types.ObjectId): Promise<void>;
  removeSubtask(subtaskId: Types.ObjectId): Promise<void>;
  addReminder(reminder: any): Promise<void>;
  removeReminder(reminderId: string): Promise<void>;
  toggleChecklistItem(index: number, userId: Types.ObjectId): Promise<void>;
  addAttachment(attachment: any): Promise<void>;
  removeAttachment(attachmentId: string): Promise<void>;
  addWatcher(userId: Types.ObjectId): Promise<void>;
  removeWatcher(userId: Types.ObjectId): Promise<void>;
  addComment(commentId: Types.ObjectId): Promise<void>;
  removeComment(commentId: Types.ObjectId): Promise<void>;
  addDependency(taskId: Types.ObjectId): Promise<void>;
  removeDependency(taskId: Types.ObjectId): Promise<void>;
  startTimeTracking(): Promise<void>;
  pauseTimeTracking(): Promise<void>;
  resumeTimeTracking(): Promise<void>;
  stopTimeTracking(): Promise<void>;
  getTotalTimeSpent(): number;
  toJSON(): any;
}

interface ITaskModel extends Model<ITask> {
  findByStatus(status: string): Query<ITask[], ITask>;
  findByAssignee(userId: Types.ObjectId): Query<ITask[], ITask>;
  findByCreator(userId: Types.ObjectId): Query<ITask[], ITask>;
  findByTeam(teamId: Types.ObjectId): Query<ITask[], ITask>;
  findByLabels(labels: string[]): Query<ITask[], ITask>;
  findOverdue(): Query<ITask[], ITask>;
  findCompleted(): Query<ITask[], ITask>;
  findInProgress(): Query<ITask[], ITask>;
  findUpcoming(): Query<ITask[], ITask>;
  search(query: string, options?: any): Promise<ITask[]>;
  getStats(userId: Types.ObjectId): Promise<any>;
  getTeamStats(teamId: Types.ObjectId): Promise<any>;
  bulkUpdate(ids: string[], data: any): Promise<any>;
  archiveOldTasks(days: number): Promise<number>;
  getTasksByPriority(teamId: Types.ObjectId): Promise<any>;
  getTaskDistribution(userId: Types.ObjectId): Promise<any>;
  getAverageCompletionTime(userId: Types.ObjectId): Promise<any>;
}

const TaskSchema = new Schema<ITask, ITaskModel>(
  {
    title: {
      type: String,
      required: [true, "Task title is required"],
      trim: true,
      minlength: [1, "Title must be at least 1 character"],
      maxlength: [255, "Title cannot exceed 255 characters"],
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [10000, "Description cannot exceed 10000 characters"],
    },
    status: {
      type: String,
      enum: ["todo", "in_progress", "in_review", "done", "archived", "deleted"],
      default: "todo",
      index: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent", "critical"],
      default: "medium",
      index: true,
    },
    assignee: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    creator: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    team: {
      type: Schema.Types.ObjectId,
      ref: "Team",
      index: true,
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      index: true,
    },
    parentTask: {
      type: Schema.Types.ObjectId,
      ref: "Task",
      index: true,
    },
    subtasks: [
      {
        type: Schema.Types.ObjectId,
        ref: "Task",
      },
    ],
    dueDate: {
      type: Date,
      index: true,
    },
    startDate: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    estimatedHours: {
      type: Number,
      min: 0,
      max: 1000,
    },
    actualHours: {
      type: Number,
      min: 0,
      max: 10000,
    },
    labels: [
      {
        type: String,
        trim: true,
      },
    ],
    attachments: [
      {
        url: {
          type: String,
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        type: {
          type: String,
          required: true,
        },
        size: {
          type: Number,
          required: true,
        },
        uploadedBy: {
          type: Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
        publicId: String,
      },
    ],
    comments: [
      {
        type: Schema.Types.ObjectId,
        ref: "Comment",
      },
    ],
    watchers: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    order: {
      type: Number,
      default: 0,
    },
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurringRule: {
      frequency: {
        type: String,
        enum: ["daily", "weekly", "monthly", "yearly", "custom"],
      },
      interval: {
        type: Number,
        default: 1,
        min: 1,
      },
      daysOfWeek: [
        {
          type: Number,
          min: 0,
          max: 6,
        },
      ],
      daysOfMonth: [
        {
          type: Number,
          min: 1,
          max: 31,
        },
      ],
      monthOfYear: {
        type: Number,
        min: 1,
        max: 12,
      },
      customRule: String,
      endDate: Date,
      occurrences: Number,
      currentOccurrence: {
        type: Number,
        default: 0,
      },
      originalTaskId: {
        type: Schema.Types.ObjectId,
        ref: "Task",
      },
    },
    reminders: [
      {
        time: {
          type: Date,
          required: true,
        },
        type: {
          type: String,
          enum: ["email", "push", "sms"],
          required: true,
        },
        sent: {
          type: Boolean,
          default: false,
        },
        sentAt: Date,
      },
    ],
    checklist: [
      {
        text: {
          type: String,
          required: true,
        },
        completed: {
          type: Boolean,
          default: false,
        },
        completedAt: Date,
        completedBy: {
          type: Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],
    timeTracking: {
      startedAt: Date,
      pausedAt: Date,
      totalSeconds: {
        type: Number,
        default: 0,
      },
      sessions: [
        {
          start: {
            type: Date,
            required: true,
          },
          end: Date,
          duration: Number,
        },
      ],
      lastStart: Date,
      isRunning: {
        type: Boolean,
        default: false,
      },
    },
    metadata: {
      createdAt: {
        type: Date,
        default: Date.now,
      },
      updatedAt: {
        type: Date,
        default: Date.now,
      },
      createdBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      updatedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      ipAddress: String,
      userAgent: String,
      source: {
        type: String,
        enum: ["web", "mobile", "api", "email", "slack"],
        default: "web",
      },
      priorityScore: Number,
      urgencyScore: Number,
      complexityScore: Number,
    },
    dependencies: [
      {
        type: Schema.Types.ObjectId,
        ref: "Task",
      },
    ],
    blockedBy: [
      {
        type: Schema.Types.ObjectId,
        ref: "Task",
      },
    ],
    blocks: [
      {
        type: Schema.Types.ObjectId,
        ref: "Task",
      },
    ],
    viewCount: {
      type: Number,
      default: 0,
    },
    completionPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    lastActivityAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

TaskSchema.virtual("isOverdue").get(function (this: ITask) {
  if (!this.dueDate || this.status === "done" || this.status === "archived") {
    return false;
  }
  return this.dueDate < new Date();
});

TaskSchema.virtual("isCompleted").get(function (this: ITask) {
  return this.status === "done";
});

TaskSchema.virtual("timeSpent").get(function (this: ITask) {
  return this.timeTracking.totalSeconds;
});

TaskSchema.virtual("subtaskCount").get(function (this: ITask) {
  return this.subtasks.length;
});

TaskSchema.virtual("completedSubtasks").get(function (this: ITask) {
  return this.subtasks.filter((id) => {
    const subtask = this.model("Task").findById(id);
    return subtask && subtask.status === "done";
  }).length;
});

TaskSchema.pre("save", async function (this: ITask, next) {
  const task = this;

  if (task.isModified("status")) {
    if (task.status === "done" && !task.completedAt) {
      task.completedAt = new Date();
    }

    if (task.status === "in_progress" && !task.startDate) {
      task.startDate = new Date();
    }

    if (task.status === "done" && task.assignee) {
      const Task = this.model("Task");
      const subtasks = await Task.find({ parentTask: task._id });

      for (const subtask of subtasks) {
        if (subtask.status !== "done") {
          subtask.status = "done";
          subtask.completedAt = new Date();
          await subtask.save();
        }
      }
    }
  }

  if (task.isModified("dueDate") || task.isModified("status")) {
    task.metadata.priorityScore = task.calculatePriority();
  }

  next();
});

TaskSchema.pre("findOneAndUpdate", function (this: any, next) {
  this.set({ "metadata.updatedAt": new Date() });
  next();
});

TaskSchema.post("save", function (this: ITask, doc: ITask) {
  auditLogger.dataAccess(doc.creator.toString(), "Task", "create", {
    taskId: doc._id,
    title: doc.title,
  });

  if (doc.assignee) {
    const notificationService = require("../services/notification.service");
    notificationService.notifyTaskAssigned(doc);
  }
});

TaskSchema.post("remove", function (this: ITask, doc: ITask) {
  auditLogger.dataAccess(doc.creator.toString(), "Task", "delete", {
    taskId: doc._id,
    title: doc.title,
  });
});

TaskSchema.methods.isOverdue = function (this: ITask): boolean {
  if (!this.dueDate || this.status === "done" || this.status === "archived") {
    return false;
  }
  return this.dueDate < new Date();
};

TaskSchema.methods.isCompleted = function (this: ITask): boolean {
  return this.status === "done";
};

TaskSchema.methods.isBlocked = async function (this: ITask): Promise<boolean> {
  if (this.blockedBy.length === 0) return false;

  const tasks = await this.model("Task").find({
    _id: { $in: this.blockedBy },
    status: { $ne: "done" },
  });

  return tasks.length > 0;
};

TaskSchema.methods.getProgress = function (this: ITask): number {
  if (this.status === "done") return 100;
  if (this.status === "archived") return 100;
  if (this.status === "todo") return 0;
  if (this.status === "in_review") return 75;
  if (this.status === "in_progress") return 50;
  return 0;
};

TaskSchema.methods.updateCompletionPercentage = async function (
  this: ITask,
): Promise<void> {
  let percentage = 0;

  if (this.checklist.length > 0) {
    const completed = this.checklist.filter((item) => item.completed).length;
    percentage = (completed / this.checklist.length) * 100;
  }

  if (this.subtasks.length > 0) {
    const Task = this.model("Task");
    const subtasks = await Task.find({ parentTask: this._id });
    const completedSubtasks = subtasks.filter((t) => t.status === "done");
    const subtaskPercentage =
      (completedSubtasks.length / this.subtasks.length) * 100;

    if (this.checklist.length > 0) {
      percentage = (percentage + subtaskPercentage) / 2;
    } else {
      percentage = subtaskPercentage;
    }
  }

  if (this.status === "done") {
    percentage = 100;
  } else if (this.status === "todo") {
    percentage = Math.min(percentage, 10);
  } else if (this.status === "in_progress") {
    percentage = Math.min(Math.max(percentage, 20), 80);
  } else if (this.status === "in_review") {
    percentage = Math.min(Math.max(percentage, 75), 95);
  }

  this.completionPercentage = Math.round(percentage);
  await this.save();
};

TaskSchema.methods.calculatePriority = function (this: ITask): number {
  let score = 0;

  const priorityMap = {
    critical: 100,
    urgent: 80,
    high: 60,
    medium: 40,
    low: 20,
  };

  score += priorityMap[this.priority] || 0;

  if (this.isOverdue()) {
    score += 30;
  }

  if (this.dueDate) {
    const daysUntilDue = Math.ceil(
      (this.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    if (daysUntilDue <= 1) score += 20;
    else if (daysUntilDue <= 3) score += 10;
    else if (daysUntilDue <= 7) score += 5;
  }

  const blockers = this.blockedBy.length;
  if (blockers > 0) score += blockers * 5;

  const dependencies = this.dependencies.length;
  if (dependencies > 0) score += dependencies * 3;

  return score;
};

TaskSchema.methods.assignToUser = async function (
  this: ITask,
  userId: Types.ObjectId,
): Promise<void> {
  this.assignee = userId;
  await this.save();
};

TaskSchema.methods.addSubtask = async function (
  this: ITask,
  subtaskId: Types.ObjectId,
): Promise<void> {
  if (!this.subtasks.includes(subtaskId)) {
    this.subtasks.push(subtaskId);
    await this.save();
  }
};

TaskSchema.methods.removeSubtask = async function (
  this: ITask,
  subtaskId: Types.ObjectId,
): Promise<void> {
  this.subtasks = this.subtasks.filter((id) => !id.equals(subtaskId));
  await this.save();
};

TaskSchema.methods.addReminder = async function (
  this: ITask,
  reminder: any,
): Promise<void> {
  this.reminders.push(reminder);
  await this.save();
};

TaskSchema.methods.removeReminder = async function (
  this: ITask,
  reminderId: string,
): Promise<void> {
  this.reminders = this.reminders.filter(
    (r) => r._id.toString() !== reminderId,
  );
  await this.save();
};

TaskSchema.methods.toggleChecklistItem = async function (
  this: ITask,
  index: number,
  userId: Types.ObjectId,
): Promise<void> {
  if (index >= 0 && index < this.checklist.length) {
    const item = this.checklist[index];
    item.completed = !item.completed;
    if (item.completed) {
      item.completedAt = new Date();
      item.completedBy = userId;
    } else {
      item.completedAt = undefined;
      item.completedBy = undefined;
    }
    await this.save();
    await this.updateCompletionPercentage();
  }
};

TaskSchema.methods.addAttachment = async function (
  this: ITask,
  attachment: any,
): Promise<void> {
  this.attachments.push(attachment);
  await this.save();
};

TaskSchema.methods.removeAttachment = async function (
  this: ITask,
  attachmentId: string,
): Promise<void> {
  this.attachments = this.attachments.filter(
    (a) => a._id.toString() !== attachmentId,
  );
  await this.save();
};

TaskSchema.methods.addWatcher = async function (
  this: ITask,
  userId: Types.ObjectId,
): Promise<void> {
  if (!this.watchers.includes(userId)) {
    this.watchers.push(userId);
    await this.save();
  }
};

TaskSchema.methods.removeWatcher = async function (
  this: ITask,
  userId: Types.ObjectId,
): Promise<void> {
  this.watchers = this.watchers.filter((id) => !id.equals(userId));
  await this.save();
};

TaskSchema.methods.addComment = async function (
  this: ITask,
  commentId: Types.ObjectId,
): Promise<void> {
  this.comments.push(commentId);
  await this.save();
};

TaskSchema.methods.removeComment = async function (
  this: ITask,
  commentId: Types.ObjectId,
): Promise<void> {
  this.comments = this.comments.filter((id) => !id.equals(commentId));
  await this.save();
};

TaskSchema.methods.addDependency = async function (
  this: ITask,
  taskId: Types.ObjectId,
): Promise<void> {
  if (!this.dependencies.includes(taskId)) {
    this.dependencies.push(taskId);
    await this.save();
  }
};

TaskSchema.methods.removeDependency = async function (
  this: ITask,
  taskId: Types.ObjectId,
): Promise<void> {
  this.dependencies = this.dependencies.filter((id) => !id.equals(taskId));
  await this.save();
};

TaskSchema.methods.startTimeTracking = async function (
  this: ITask,
): Promise<void> {
  if (!this.timeTracking.isRunning) {
    this.timeTracking.startedAt = new Date();
    this.timeTracking.lastStart = new Date();
    this.timeTracking.isRunning = true;
    this.timeTracking.sessions.push({
      start: new Date(),
    });
    await this.save();
  }
};

TaskSchema.methods.pauseTimeTracking = async function (
  this: ITask,
): Promise<void> {
  if (this.timeTracking.isRunning) {
    this.timeTracking.pausedAt = new Date();
    this.timeTracking.isRunning = false;

    const lastSession =
      this.timeTracking.sessions[this.timeTracking.sessions.length - 1];
    if (lastSession && !lastSession.end) {
      lastSession.end = new Date();
      lastSession.duration = Math.floor(
        (lastSession.end.getTime() - lastSession.start.getTime()) / 1000,
      );
      this.timeTracking.totalSeconds += lastSession.duration;
    }

    await this.save();
  }
};

TaskSchema.methods.resumeTimeTracking = async function (
  this: ITask,
): Promise<void> {
  if (!this.timeTracking.isRunning) {
    this.timeTracking.isRunning = true;
    this.timeTracking.lastStart = new Date();
    this.timeTracking.sessions.push({
      start: new Date(),
    });
    await this.save();
  }
};

TaskSchema.methods.stopTimeTracking = async function (
  this: ITask,
): Promise<void> {
  if (this.timeTracking.isRunning) {
    await this.pauseTimeTracking();
  }
};

TaskSchema.methods.getTotalTimeSpent = function (this: ITask): number {
  return this.timeTracking.totalSeconds;
};

TaskSchema.methods.toJSON = function (this: ITask): any {
  const obj = this.toObject();
  delete obj.metadata.ipAddress;
  delete obj.metadata.userAgent;
  return obj;
};

TaskSchema.statics.findByStatus = function (
  status: string,
): Query<ITask[], ITask> {
  return this.find({ status });
};

TaskSchema.statics.findByAssignee = function (
  userId: Types.ObjectId,
): Query<ITask[], ITask> {
  return this.find({ assignee: userId, status: { $ne: "deleted" } });
};

TaskSchema.statics.findByCreator = function (
  userId: Types.ObjectId,
): Query<ITask[], ITask> {
  return this.find({ creator: userId, status: { $ne: "deleted" } });
};

TaskSchema.statics.findByTeam = function (
  teamId: Types.ObjectId,
): Query<ITask[], ITask> {
  return this.find({ team: teamId, status: { $ne: "deleted" } });
};

TaskSchema.statics.findByLabels = function (
  labels: string[],
): Query<ITask[], ITask> {
  return this.find({ labels: { $in: labels }, status: { $ne: "deleted" } });
};

TaskSchema.statics.findOverdue = function (): Query<ITask[], ITask> {
  return this.find({
    dueDate: { $lt: new Date() },
    status: { $nin: ["done", "archived", "deleted"] },
  });
};

TaskSchema.statics.findCompleted = function (): Query<ITask[], ITask> {
  return this.find({ status: "done" });
};

TaskSchema.statics.findInProgress = function (): Query<ITask[], ITask> {
  return this.find({ status: "in_progress" });
};

TaskSchema.statics.findUpcoming = function (): Query<ITask[], ITask> {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);

  return this.find({
    dueDate: { $gte: tomorrow, $lte: nextWeek },
    status: { $nin: ["done", "archived", "deleted"] },
  });
};

TaskSchema.statics.search = async function (
  query: string,
  options: any = {},
): Promise<ITask[]> {
  const searchRegex = new RegExp(query, "i");
  const { limit = 20, skip = 0, userId } = options;

  const filter: any = {
    $or: [
      { title: searchRegex },
      { description: searchRegex },
      { tags: { $in: [searchRegex] } },
      { labels: { $in: [searchRegex] } },
    ],
    status: { $ne: "deleted" },
  };

  if (userId) {
    filter.$or = [...filter.$or, { assignee: userId }, { creator: userId }];
  }

  return this.find(filter)
    .limit(limit)
    .skip(skip)
    .sort({ priority: -1, dueDate: 1 });
};

TaskSchema.statics.getStats = async function (
  userId: Types.ObjectId,
): Promise<any> {
  const stats = await this.aggregate([
    {
      $match: {
        $or: [{ assignee: userId }, { creator: userId }],
        status: { $ne: "deleted" },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        todo: {
          $sum: { $cond: [{ $eq: ["$status", "todo"] }, 1, 0] },
        },
        inProgress: {
          $sum: { $cond: [{ $eq: ["$status", "in_progress"] }, 1, 0] },
        },
        inReview: {
          $sum: { $cond: [{ $eq: ["$status", "in_review"] }, 1, 0] },
        },
        done: {
          $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] },
        },
        archived: {
          $sum: { $cond: [{ $eq: ["$status", "archived"] }, 1, 0] },
        },
        overdue: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $lt: ["$dueDate", new Date()] },
                  { $ne: ["$status", "done"] },
                  { $ne: ["$status", "archived"] },
                ],
              },
              1,
              0,
            ],
          },
        },
        avgCompletionTime: {
          $avg: {
            $divide: [
              { $subtract: ["$completedAt", "$createdAt"] },
              1000 * 60 * 60 * 24,
            ],
          },
        },
        totalTimeSpent: { $sum: "$timeTracking.totalSeconds" },
        highPriority: {
          $sum: {
            $cond: [
              { $in: ["$priority", ["high", "urgent", "critical"]] },
              1,
              0,
            ],
          },
        },
        mediumPriority: {
          $sum: {
            $cond: [{ $eq: ["$priority", "medium"] }, 1, 0],
          },
        },
        lowPriority: {
          $sum: {
            $cond: [{ $eq: ["$priority", "low"] }, 1, 0],
          },
        },
      },
    },
  ]);

  return (
    stats[0] || {
      total: 0,
      todo: 0,
      inProgress: 0,
      inReview: 0,
      done: 0,
      archived: 0,
      overdue: 0,
      avgCompletionTime: 0,
      totalTimeSpent: 0,
      highPriority: 0,
      mediumPriority: 0,
      lowPriority: 0,
    }
  );
};

TaskSchema.statics.getTeamStats = async function (
  teamId: Types.ObjectId,
): Promise<any> {
  return this.aggregate([
    {
      $match: {
        team: teamId,
        status: { $ne: "deleted" },
      },
    },
    {
      $group: {
        _id: "$assignee",
        total: { $sum: 1 },
        completed: {
          $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] },
        },
        inProgress: {
          $sum: { $cond: [{ $eq: ["$status", "in_progress"] }, 1, 0] },
        },
        overdue: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $lt: ["$dueDate", new Date()] },
                  { $ne: ["$status", "done"] },
                ],
              },
              1,
              0,
            ],
          },
        },
        totalTimeSpent: { $sum: "$timeTracking.totalSeconds" },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "user",
      },
    },
    {
      $project: {
        _id: 1,
        total: 1,
        completed: 1,
        inProgress: 1,
        overdue: 1,
        totalTimeSpent: 1,
        completionRate: {
          $cond: [
            { $eq: ["$total", 0] },
            0,
            { $multiply: [{ $divide: ["$completed", "$total"] }, 100] },
          ],
        },
        user: { $arrayElemAt: ["$user", 0] },
      },
    },
    {
      $sort: { completionRate: -1 },
    },
  ]);
};

TaskSchema.statics.bulkUpdate = async function (
  ids: string[],
  data: any,
): Promise<any> {
  const result = await this.updateMany(
    { _id: { $in: ids } },
    { $set: data },
    { multi: true },
  );

  for (const id of ids) {
    await redisDel(`task:${id}`);
  }

  return result;
};

TaskSchema.statics.archiveOldTasks = async function (
  days: number,
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const result = await this.updateMany(
    {
      status: "done",
      completedAt: { $lt: cutoffDate },
    },
    {
      $set: { status: "archived" },
    },
  );

  return result.modifiedCount || 0;
};

TaskSchema.statics.getTasksByPriority = async function (
  teamId: Types.ObjectId,
): Promise<any> {
  return this.aggregate([
    {
      $match: {
        team: teamId,
        status: { $in: ["todo", "in_progress", "in_review"] },
      },
    },
    {
      $group: {
        _id: "$priority",
        count: { $sum: 1 },
        tasks: { $push: "$$ROOT" },
      },
    },
    {
      $sort: {
        _id: 1,
      },
    },
  ]);
};

TaskSchema.statics.getTaskDistribution = async function (
  userId: Types.ObjectId,
): Promise<any> {
  return this.aggregate([
    {
      $match: {
        $or: [{ assignee: userId }, { creator: userId }],
        status: { $ne: "deleted" },
      },
    },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);
};

TaskSchema.statics.getAverageCompletionTime = async function (
  userId: Types.ObjectId,
): Promise<any> {
  const result = await this.aggregate([
    {
      $match: {
        assignee: userId,
        status: "done",
        completedAt: { $exists: true },
        createdAt: { $exists: true },
      },
    },
    {
      $project: {
        completionTime: {
          $divide: [
            { $subtract: ["$completedAt", "$createdAt"] },
            1000 * 60 * 60,
          ],
        },
        priority: 1,
        createdAt: 1,
      },
    },
    {
      $group: {
        _id: "$priority",
        averageHours: { $avg: "$completionTime" },
        count: { $sum: 1 },
        minHours: { $min: "$completionTime" },
        maxHours: { $max: "$completionTime" },
      },
    },
    {
      $sort: { averageHours: 1 },
    },
  ]);

  return result;
};

export const Task = mongoose.model<ITask, ITaskModel>("Task", TaskSchema);
export default Task;
