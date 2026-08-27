import mongoose, { Schema, Document, Model, Query, Types } from 'mongoose';
import { redisClient, redisSet, redisGet, redisDel } from '../config/redis';
import { logger } from '../utils/logger';
import { auditLogger } from '../utils/logger';
import { env } from '../config/env';

export interface ITask extends Document {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'in_review' | 'done' | 'archived' | 'deleted';
  priority: 'low' | 'medium' | 'high' | 'urgent' | 'critical';
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
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
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
    type: 'email' | 'push' | 'sms';
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
    source?: 'web' | 'mobile' | 'api' | 'email' | 'slack';
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

const TaskSchema = new Schema<ITask, ITaskModel>({
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true,
    minlength: [1, 'Title must be at least 1 character'],
    maxlength: [255, 'Title cannot exceed 255 characters'],
    index: true,
  },
  description: {
    type: String,
    trim: true,
    maxlength: [10000, 'Description cannot exceed 10000 characters'],
  },
  status: {
    type: String,
    enum: ['todo', 'in_progress', 'in_review', 'done', 'archived', 'deleted'],
    default: 'todo',
    index: true,
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent', 'critical'],
    default: 'medium',
    index: true,
  },
  assignee: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  creator: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  team: {
    type: Schema.Types.ObjectId,
    ref: 'Team',
    index: true,
  },
  project: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    index: true,
  },
  parentTask: {
    type: Schema.Types.ObjectId,
    ref: 'Task',
    index: true,
  },
  subtasks: [{
    type: Schema.Types.ObjectId,
    ref: 'Task',
  }],
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
  labels: [{
    type: String,
    trim: true,
  }],
  attachments: [{
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
      ref: 'User',
      required: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    publicId: String,
  }],
  comments: [{
    type: Schema.Types.ObjectId,
    ref: 'Comment',
  }],
  watchers: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
  tags: [{
    type: String,
    trim: true,
  }],
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
      enum: ['daily', 'weekly', 'monthly', 'yearly', 'custom'],
    },
    interval: {
      type: Number,
      default: 1,
      min: 1,
    },
    daysOfWeek: [{
      type: Number,
      min: 0,
      max: 6,
    }],
    daysOfMonth: [{
      type: Number,
      min: 1,
      max: 31,
    }],
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
      ref: 'Task',
    },
  },
  reminders: [{
    time: {
      type: Date,
      required: true,
    },
    type: {
      type: String,
      enum: ['email', 'push', 'sms'],
      required: true,
    },
    sent: {
      type: Boolean,
      default: false,
    },
    sentAt: Date,
  }],
  checklist: [{
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
      ref: 'User',
    },
  }],
  timeTracking: {
    startedAt: Date,
    pausedAt: Date,
    totalSeconds: {
      type: Number,
      default: 0,
    },
    sessions: [{
      start: {
        type: Date,
        required: true,
      },
      end: Date,
      duration: Number,
    }],
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
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    ipAddress: String,
    userAgent: String,
    source: {
      type: String,
      enum: ['web', 'mobile', 'api', 'email', 'slack'],
      default: 'web',
    },
    priorityScore: Number,
    urgencyScore: Number,
    complexityScore: Number,
  },
  dependencies: [{
    type: Schema.Types.ObjectId,
    ref: 'Task',
  }],
  blockedBy: [{
    type: Schema.Types.ObjectId,
    ref: 'Task',
  }],
  blocks: [{
    type: Schema.Types.ObjectId,
    ref: 'Task',
  }],
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
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

TaskSchema.virtual('isOverdue').get(function(this: ITask) {
  if (!this.dueDate || this.status === 'done' || this.status === 'archived') {
    return false;
  }
  return this.dueDate < new Date();
});

TaskSchema.virtual('isCompleted').get(function(this: ITask) {
  return this.status === 'done';
});

TaskSchema.virtual('timeSpent').get(function(this: ITask) {
  return this.timeTracking.totalSeconds;
});

TaskSchema.virtual('subtaskCount').get(function(this: ITask) {
  return this.subtasks.length;
});

TaskSchema.virtual('completedSubtasks').get(function(this: ITask) {
  return this.subtasks.filter(id => {
    const subtask = this.model('Task').findById(id);
    return subtask && subtask.status === 'done';
  }).length;
});

TaskSchema.pre('save', async function(this: ITask, next) {
  const task = this;
  
  if (task.isModified('status')) {
    if (task.status === 'done' && !task.completedAt) {
      task.completedAt = new Date();
    }
    
    if (task.status === 'in_progress' && !task.startDate) {
      task.startDate = new Date();
    }
    
    if (task.status === 'done' && task.assignee) {
      const Task = this.model('Task');
      const subtasks = await Task.find({ parentTask: task._id });
      
      for (const subtask of subtasks) {
        if (subtask.status !== 'done') {
          subtask.status = 'done';
          subtask.completedAt = new Date();
          await subtask.save();
        }
      }
    }
  }
  
  if (task.isModified('dueDate') || task.isModified('status')) {
    task.metadata.priorityScore = task.calculatePriority();
  }
  
  next();
});

TaskSchema.pre('findOneAndUpdate', function(this: any, next) {
  this.set({ 'metadata.updatedAt': new Date() });
  next();
});

TaskSchema.post('save', function(this: ITask, doc: ITask) {
  auditLogger.dataAccess(
    doc.creator.toString(),
    'Task',
    'create',
    { taskId: doc._id, title: doc.title }
  );
  
  if (doc.assignee) {
    const notificationService = require('../services/notification.service');
    notificationService.notifyTaskAssigned(doc);
  }
});

TaskSchema.post('remove', function(this: ITask, doc: ITask) {
  auditLogger.dataAccess(
    doc.creator.toString(),
    'Task',
    'delete',
    { taskId: doc._id, title: doc.title }
  );
});

TaskSchema.methods.isOverdue = function(this: ITask): boolean {
  if (!this.dueDate || this.status === 'done' || this.status === 'archived') {
    return false;
  }
  return this.dueDate < new Date();
};

TaskSchema.methods.isCompleted = function(this: ITask): boolean {
  return this.status === 'done';
};

TaskSchema.methods.isBlocked = async function(this: ITask): Promise<boolean> {
  if (this.blockedBy.length === 0) return false;
  
  const tasks = await this.model('Task').find({
    _id: { $in: this.blockedBy },
    status: { $ne: 'done' }
  });
  
  return tasks.length > 0;
};

TaskSchema.methods.getProgress = function(this: ITask): number {
  if (this.status === 'done') return 100;
  if (this.status === 'archived') return 100;
  if (this.status === 'todo') return 0;
  if (this.status === 'in_review') return 75;
  if (this.status === 'in_progress') return 50;
  return 0;
};

TaskSchema.methods.updateCompletionPercentage = async function(this: ITask): Promise<void> {
  let percentage = 0;
  
  if (this.checklist.length > 0) {
    const completed = this.checklist.filter(item => item.completed).length;
    percentage = (completed / this.checklist.length) * 100;
  }
  
  if (this.subtasks.length > 0) {
    const Task = this.model('Task');
    const subtasks = await Task.find({ parentTask: this._id });
    const completedSubtasks = subtasks.filter(t => t.status === 'done');
    const subtaskPercentage = (completedSubtasks.length / this.subtasks.length) * 100;
    
    if (this.checklist.length > 0) {
      percentage = (percentage + subtaskPercentage) /