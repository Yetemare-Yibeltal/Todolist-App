import { z } from 'zod';

// Task Status Enum
export const TaskStatusSchema = z.enum([
  'todo',
  'in_progress',
  'in_review',
  'done',
  'archived',
  'deleted',
]);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

// Task Priority Enum
export const TaskPrioritySchema = z.enum([
  'low',
  'medium',
  'high',
  'urgent',
  'critical',
]);
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;

// Task View Enum
export const TaskViewSchema = z.enum(['list', 'board', 'calendar', 'timeline']);
export type TaskView = z.infer<typeof TaskViewSchema>;

// Recurring Frequency Enum
export const RecurringFrequencySchema = z.enum([
  'daily',
  'weekly',
  'monthly',
  'yearly',
  'custom',
]);
export type RecurringFrequency = z.infer<typeof RecurringFrequencySchema>;

// Reminder Type Enum
export const ReminderTypeSchema = z.enum(['email', 'push', 'sms']);
export type ReminderType = z.infer<typeof ReminderTypeSchema>;

// Checklist Item Schema
export const ChecklistItemSchema = z.object({
  id: z.string().optional(),
  text: z.string().min(1, 'Checklist item text is required'),
  completed: z.boolean().default(false),
  completedAt: z.date().optional(),
  completedBy: z.string().optional(),
});
export type ChecklistItem = z.infer<typeof ChecklistItemSchema>;

// Attachment Schema
export const AttachmentSchema = z.object({
  id: z.string().optional(),
  url: z.string().url('Invalid attachment URL'),
  name: z.string().min(1, 'Attachment name is required'),
  type: z.string().min(1, 'Attachment type is required'),
  size: z.number().positive('File size must be positive'),
  uploadedBy: z.string().optional(),
  uploadedAt: z.date().optional(),
  publicId: z.string().optional(),
});
export type Attachment = z.infer<typeof AttachmentSchema>;

// Reminder Schema
export const ReminderSchema = z.object({
  id: z.string().optional(),
  time: z.date(),
  type: ReminderTypeSchema,
  sent: z.boolean().default(false),
  sentAt: z.date().optional(),
});
export type Reminder = z.infer<typeof ReminderSchema>;

// Recurring Rule Schema
export const RecurringRuleSchema = z.object({
  frequency: RecurringFrequencySchema,
  interval: z.number().min(1).max(365).default(1),
  daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
  daysOfMonth: z.array(z.number().min(1).max(31)).optional(),
  monthOfYear: z.number().min(1).max(12).optional(),
  customRule: z.string().optional(),
  endDate: z.date().optional(),
  occurrences: z.number().positive().optional(),
  currentOccurrence: z.number().default(0),
  originalTaskId: z.string().optional(),
});
export type RecurringRule = z.infer<typeof RecurringRuleSchema>;

// Time Tracking Session Schema
export const TimeSessionSchema = z.object({
  start: z.date(),
  end: z.date().optional(),
  duration: z.number().optional(),
});
export type TimeSession = z.infer<typeof TimeSessionSchema>;

// Time Tracking Schema
export const TimeTrackingSchema = z.object({
  startedAt: z.date().optional(),
  pausedAt: z.date().optional(),
  totalSeconds: z.number().default(0),
  sessions: z.array(TimeSessionSchema).default([]),
  lastStart: z.date().optional(),
  isRunning: z.boolean().default(false),
});
export type TimeTracking = z.infer<typeof TimeTrackingSchema>;

// Task Metadata Schema
export const TaskMetadataSchema = z.object({
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string(),
  updatedBy: z.string(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  source: z.enum(['web', 'mobile', 'api', 'email', 'slack']).optional(),
  priorityScore: z.number().optional(),
  urgencyScore: z.number().optional(),
  complexityScore: z.number().optional(),
});
export type TaskMetadata = z.infer<typeof TaskMetadataSchema>;

// Main Task Schema
export const TaskSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'Title is required').max(255, 'Title cannot exceed 255 characters'),
  description: z.string().max(10000, 'Description cannot exceed 10000 characters').optional(),
  status: TaskStatusSchema.default('todo'),
  priority: TaskPrioritySchema.default('medium'),
  assignee: z.string().optional(),
  creator: z.string(),
  team: z.string().optional(),
  project: z.string().optional(),
  parentTask: z.string().optional(),
  subtasks: z.array(z.string()).default([]),
  dueDate: z.date().optional(),
  startDate: z.date().optional(),
  completedAt: z.date().optional(),
  estimatedHours: z.number().min(0).max(1000).optional(),
  actualHours: z.number().min(0).max(10000).optional(),
  labels: z.array(z.string().max(50)).max(50).default([]),
  tags: z.array(z.string().max(30)).max(50).default([]),
  attachments: z.array(AttachmentSchema).default([]),
  comments: z.array(z.string()).default([]),
  watchers: z.array(z.string()).default([]),
  order: z.number().int().min(0).default(0),
  isRecurring: z.boolean().default(false),
  recurringRule: RecurringRuleSchema.optional(),
  reminders: z.array(ReminderSchema).default([]),
  checklist: z.array(ChecklistItemSchema).default([]),
  timeTracking: TimeTrackingSchema.default({ totalSeconds: 0, sessions: [], isRunning: false }),
  metadata: TaskMetadataSchema.optional(),
  dependencies: z.array(z.string()).default([]),
  blockedBy: z.array(z.string()).default([]),
  blocks: z.array(z.string()).default([]),
  viewCount: z.number().int().min(0).default(0),
  completionPercentage: z.number().min(0).max(100).default(0),
  lastActivityAt: z.date().default(() => new Date()),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});
export type Task = z.infer<typeof TaskSchema>;

// Create Task Request Schema
export const CreateTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title cannot exceed 255 characters'),
  description: z.string().max(10000, 'Description cannot exceed 10000 characters').optional(),
  status: TaskStatusSchema.default('todo'),
  priority: TaskPrioritySchema.default('medium'),
  assignee: z.string().optional(),
  team: z.string().optional(),
  project: z.string().optional(),
  parentTask: z.string().optional(),
  dueDate: z.date().optional(),
  startDate: z.date().optional(),
  estimatedHours: z.number().min(0).max(1000).optional(),
  labels: z.array(z.string().max(50)).max(50).optional(),
  tags: z.array(z.string().max(30)).max(50).optional(),
  isRecurring: z.boolean().default(false),
  recurringRule: RecurringRuleSchema.omit({
    currentOccurrence: true,
    originalTaskId: true,
  }).optional(),
  checklist: z.array(ChecklistItemSchema.omit({ id: true, completedAt: true, completedBy: true })).optional(),
  attachments: z.array(AttachmentSchema.omit({ id: true, uploadedBy: true, uploadedAt: true })).optional(),
  order: z.number().int().min(0).optional(),
});
export type CreateTask = z.infer<typeof CreateTaskSchema>;

// Update Task Request Schema
export const UpdateTaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(10000).optional().nullable(),
  status: TaskStatusSchema.optional(),
  priority: TaskPrioritySchema.optional(),
  assignee: z.string().optional().nullable(),
  team: z.string().optional().nullable(),
  project: z.string().optional().nullable(),
  parentTask: z.string().optional().nullable(),
  dueDate: z.date().optional().nullable(),
  startDate: z.date().optional().nullable(),
  completedAt: z.date().optional(),
  estimatedHours: z.number().min(0).max(1000).optional().nullable(),
  actualHours: z.number().min(0).max(10000).optional().nullable(),
  labels: z.array(z.string().max(50)).max(50).optional(),
  tags: z.array(z.string().max(30)).max(50).optional(),
  isRecurring: z.boolean().optional(),
  recurringRule: RecurringRuleSchema.partial().optional(),
  checklist: z.array(ChecklistItemSchema).optional(),
  order: z.number().int().min(0).optional(),
  completionPercentage: z.number().min(0).max(100).optional(),
});
export type UpdateTask = z.infer<typeof UpdateTaskSchema>;

// Task Filters Schema
export const TaskFiltersSchema = z.object({
  status: z.array(TaskStatusSchema).optional(),
  priority: z.array(TaskPrioritySchema).optional(),
  assignee: z.string().optional(),
  creator: z.string().optional(),
  team: z.string().optional(),
  project: z.string().optional(),
  labels: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  search: z.string().max(255).optional(),
  dueDateFrom: z.date().optional(),
  dueDateTo: z.date().optional(),
  createdFrom: z.date().optional(),
  createdTo: z.date().optional(),
  completed: z.boolean().optional(),
  overdue: z.boolean().optional(),
  parentTask: z.string().optional(),
  isRecurring: z.boolean().optional(),
  hasSubtasks: z.boolean().optional(),
  hasAttachments: z.boolean().optional(),
  hasComments: z.boolean().optional(),
});
export type TaskFilters = z.infer<typeof TaskFiltersSchema>;

// Task Sort Options Schema
export const TaskSortOptionsSchema = z.object({
  field: z.enum([
    'createdAt',
    'updatedAt',
    'title',
    'priority',
    'dueDate',
    'status',
    'completionPercentage',
  ]).default('createdAt'),
  direction: z.enum(['asc', 'desc']).default('desc'),
});
export type TaskSortOptions = z.infer<typeof TaskSortOptionsSchema>;

// Pagination Options Schema
export const PaginationOptionsSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  total: z.number().int().min(0).optional(),
  totalPages: z.number().int().min(0).optional(),
});
export type PaginationOptions = z.infer<typeof PaginationOptionsSchema>;

// Task Stats Schema
export const TaskStatsSchema = z.object({
  total: z.number().default(0),
  todo: z.number().default(0),
  inProgress: z.number().default(0),
  inReview: z.number().default(0),
  done: z.number().default(0),
  archived: z.number().default(0),
  overdue: z.number().default(0),
  completionRate: z.number().default(0),
  averageCompletionTime: z.number().default(0),
  totalTimeSpent: z.number().default(0),
  byPriority: z.object({
    low: z.number().default(0),
    medium: z.number().default(0),
    high: z.number().default(0),
    urgent: z.number().default(0),
    critical: z.number().default(0),
  }),
  byStatus: z.object({
    todo: z.number().default(0),
    inProgress: z.number().default(0),
    inReview: z.number().default(0),
    done: z.number().default(0),
    archived: z.number().default(0),
  }),
  productivity: z.object({
    tasksPerDay: z.number().default(0),
    completionRate: z.number().default(0),
    averageTimeToComplete: z.number().default(0),
    totalTasksCreated: z.number().default(0),
    totalTasksCompleted: z.number().default(0),
  }).optional(),
  trends: z.object({
    daily: z.array(z.object({
      date: z.date(),
      tasksCreated: z.number(),
      tasksCompleted: z.number(),
    })),
    weekly: z.array(z.object({
      week: z.number(),
      tasksCreated: z.number(),
      tasksCompleted: z.number(),
    })),
    monthly: z.array(z.object({
      month: z.number(),
      tasksCreated: z.number(),
      tasksCompleted: z.number(),
    })),
  }).optional(),
});
export type TaskStats = z.infer<typeof TaskStatsSchema>;

// Task Distribution Schema
export const TaskDistributionSchema = z.object({
  byStatus: z.array(z.object({
    status: TaskStatusSchema,
    count: z.number(),
    percentage: z.number(),
  })),
  byPriority: z.array(z.object({
    priority: TaskPrioritySchema,
    count: z.number(),
    percentage: z.number(),
  })),
  byAssignee: z.array(z.object({
    userId: z.string(),
    userName: z.string(),
    count: z.number(),
    percentage: z.number(),
  })),
  byTeam: z.array(z.object({
    teamId: z.string(),
    teamName: z.string(),
    count: z.number(),
    percentage: z.number(),
  })),
  byLabel: z.array(z.object({
    label: z.string(),
    count: z.number(),
    percentage: z.number(),
  })),
});
export type TaskDistribution = z.infer<typeof TaskDistributionSchema>;

// Task Analytics Schema
export const TaskAnalyticsSchema = z.object({
  period: z.object({
    start: z.date(),
    end: z.date(),
  }),
  summary: z.object({
    totalTasks: z.number(),
    completedTasks: z.number(),
    inProgressTasks: z.number(),
    overdueTasks: z.number(),
    completionRate: z.number(),
    averageCompletionTime: z.number(),
    totalTimeSpent: z.number(),
    productivityScore: z.number(),
  }),
  trends: z.object({
    created: z.array(z.object({
      date: z.date(),
      count: z.number(),
    })),
    completed: z.array(z.object({
      date: z.date(),
      count: z.number(),
    })),
    overdue: z.array(z.object({
      date: z.date(),
      count: z.number(),
    })),
  }),
  topPerformers: z.array(z.object({
    userId: z.string(),
    userName: z.string(),
    tasksCompleted: z.number(),
    averageTime: z.number(),
    completionRate: z.number(),
  })),
  insights: z.array(z.object({
    type: z.enum(['trend', 'anomaly', 'recommendation']),
    title: z.string(),
    description: z.string(),
    data: z.any().optional(),
    action: z.string().optional(),
  })),
});
export type TaskAnalytics = z.infer<typeof TaskAnalyticsSchema>;

// Bulk Update Request Schema
export const BulkUpdateSchema = z.object({
  taskIds: z.array(z.string()).min(1, 'At least one task ID is required'),
  updates: z.object({
    status: TaskStatusSchema.optional(),
    priority: TaskPrioritySchema.optional(),
    assignee: z.string().optional().nullable(),
    dueDate: z.date().optional().nullable(),
    labels: z.array(z.string().max(50)).max(50).optional(),
    tags: z.array(z.string().max(30)).max(50).optional(),
  }),
});
export type BulkUpdate = z.infer<typeof BulkUpdateSchema>;

// Task Search Request Schema
export const TaskSearchSchema = z.object({
  query: z.string().min(1, 'Search query is required').max(500, 'Search query cannot exceed 500 characters'),
  filters: TaskFiltersSchema.partial().optional(),
  sort: TaskSortOptionsSchema.optional(),
  pagination: PaginationOptionsSchema.optional(),
});
export type TaskSearch = z.infer<typeof TaskSearchSchema>;

// Task Export Request Schema
export const TaskExportSchema = z.object({
  format: z.enum(['json', 'csv', 'pdf', 'xlsx']).default('json'),
  filters: TaskFiltersSchema.partial().optional(),
  fields: z.array(z.string()).optional(),
  dateRange: z.object({
    start: z.date(),
    end: z.date(),
  }).optional(),
});
export type TaskExport = z.infer<typeof TaskExportSchema>;

// Task Import Request Schema
export const TaskImportSchema = z.object({
  format: z.enum(['json', 'csv', 'xlsx']).default('json'),
  data: z.any(),
  options: z.object({
    overwrite: z.boolean().default(false),
    skipDuplicates: z.boolean().default(true),
    assignee: z.string().optional(),
    team: z.string().optional(),
  }).optional(),
});
export type TaskImport = z.infer<typeof TaskImportSchema>;

// Task Share Request Schema
export const TaskShareSchema = z.object({
  userIds: z.array(z.string()).min(1, 'At least one user ID is required'),
  permissions: z.enum(['view', 'edit', 'admin']).default('view'),
  expiresAt: z.date().optional(),
});
export type TaskShare = z.infer<typeof TaskShareSchema>;

// Task Comment Request Schema
export const TaskCommentSchema = z.object({
  content: z.string().min(1, 'Comment is required').max(5000, 'Comment cannot exceed 5000 characters'),
  parentCommentId: z.string().optional(),
  mentions: z.array(z.string()).max(50, 'Cannot mention more than 50 users').optional(),
});
export type TaskComment = z.infer<typeof TaskCommentSchema>;

// Task Reminder Request Schema
export const TaskReminderSchema = z.object({
  time: z.date(),
  type: ReminderTypeSchema,
});
export type TaskReminder = z.infer<typeof TaskReminderSchema>;

// Task Dependency Request Schema
export const TaskDependencySchema = z.object({
  taskId: z.string().min(1, 'Task ID is required'),
  type: z.enum(['blocking', 'blocked']),
});
export type TaskDependency = z.infer<typeof TaskDependencySchema>;

// Task Move Request Schema
export const TaskMoveSchema = z.object({
  targetId: z.string().optional(),
  position: z.number().int().min(0).optional(),
  newStatus: TaskStatusSchema.optional(),
  newPriority: TaskPrioritySchema.optional(),
});
export type TaskMove = z.infer<typeof TaskMoveSchema>;

// Task Template Schema
export const TaskTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(100, 'Template name cannot exceed 100 characters'),
  description: z.string().optional(),
  data: CreateTaskSchema,
  isPublic: z.boolean().default(false),
  teamId: z.string().optional(),
});
export type TaskTemplate = z.infer<typeof TaskTemplateSchema>;

// Validation helper functions
export const validateTask = (data: unknown): Task => {
  return TaskSchema.parse(data);
};

export const validateCreateTask = (data: unknown): CreateTask => {
  return CreateTaskSchema.parse(data);
};

export const validateUpdateTask = (data: unknown): UpdateTask => {
  return UpdateTaskSchema.parse(data);
};

export const validateTaskFilters = (data: unknown): TaskFilters => {
  return TaskFiltersSchema.parse(data);
};

export const validateTaskSortOptions = (data: unknown): TaskSortOptions => {
  return TaskSortOptionsSchema.parse(data);
};

export const validatePaginationOptions = (data: unknown): PaginationOptions => {
  return PaginationOptionsSchema.parse(data);
};

export const validateBulkUpdate = (data: unknown): BulkUpdate => {
  return BulkUpdateSchema.parse(data);
};

export const validateTaskSearch = (data: unknown): TaskSearch => {
  return TaskSearchSchema.parse(data);
};

export const validateTaskExport = (data: unknown): TaskExport => {
  return TaskExportSchema.parse(data);
};

export const validateTaskImport = (data: unknown): TaskImport => {
  return TaskImportSchema.parse(data);
};

export const validateTaskShare = (data: unknown): TaskShare => {
  return TaskShareSchema.parse(data);
};

export const validateTaskComment = (data: unknown): TaskComment => {
  return TaskCommentSchema.parse(data);
};

export const validateTaskReminder = (data: unknown): TaskReminder => {
  return TaskReminderSchema.parse(data);
};

export const validateTaskDependency = (data: unknown): TaskDependency => {
  return TaskDependencySchema.parse(data);
};

export const validateTaskMove = (data: unknown): TaskMove => {
  return TaskMoveSchema.parse(data);
};

export const validateTaskTemplate = (data: unknown): TaskTemplate => {
  return TaskTemplateSchema.parse(data);
};

// Type guard functions
export const isTaskStatus = (value: string): value is TaskStatus => {
  return TaskStatusSchema.safeParse(value).success;
};

export const isTaskPriority = (value: string): value is TaskPriority => {
  return TaskPrioritySchema.safeParse(value).success;
};

export const isTaskView = (value: string): value is TaskView => {
  return TaskViewSchema.safeParse(value).success;
};

export const isRecurringFrequency = (value: string): value is RecurringFrequency => {
  return RecurringFrequencySchema.safeParse(value).success;
};

export const isReminderType = (value: string): value is ReminderType => {
  return ReminderTypeSchema.safeParse(value).success;
};

// Utility functions
export const getStatusLabel = (status: TaskStatus): string => {
  const labels: Record<TaskStatus, string> = {
    todo: 'To Do',
    in_progress: 'In Progress',
    in_review: 'In Review',
    done: 'Done',
    archived: 'Archived',
    deleted: 'Deleted',
  };
  return labels[status] || status;
};

export const getPriorityLabel = (priority: TaskPriority): string => {
  const labels: Record<TaskPriority, string> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    urgent: 'Urgent',
    critical: 'Critical',
  };
  return labels[priority] || priority;
};

export const getStatusColor = (status: TaskStatus): string => {
  const colors: Record<TaskStatus, string> = {
    todo: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    in_review: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    done: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    archived: 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
    deleted: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };
  return colors[status] || colors.todo;
};

export const getPriorityColor = (priority: TaskPriority): string => {
  const colors: Record<TaskPriority, string> = {
    low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    urgent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    critical: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  };
  return colors[priority] || colors.medium;
};

export const getStatusIcon = (status: TaskStatus): string => {
  const icons: Record<TaskStatus, string> = {
    todo: 'circle',
    in_progress: 'clock',
    in_review: 'eye',
    done: 'check',
    archived: 'archive',
    deleted: 'trash',
  };
  return icons[status] || 'circle';
};

export const getPriorityIcon = (priority: TaskPriority): string => {
  const icons: Record<TaskPriority, string> = {
    low: 'flag',
    medium: 'flag',
    high: 'flag',
    urgent: 'alert-circle',
    critical: 'alert-triangle',
  };
  return icons[priority] || 'flag';
};

export const TASK_STATUS_ORDER: TaskStatus[] = [
  'todo',
  'in_progress',
  'in_review',
  'done',
  'archived',
  'deleted',
];

export const TASK_PRIORITY_ORDER: TaskPriority[] = [
  'critical',
  'urgent',
  'high',
  'medium',
  'low',
];

export const TASK_VIEW_MODES: TaskView[] = ['list', 'board', 'calendar', 'timeline'];

export const TASK_RECURRING_FREQUENCIES: RecurringFrequency[] = [
  'daily',
  'weekly',
  'monthly',
  'yearly',
  'custom',
];

export const TASK_REMINDER_TYPES: ReminderType[] = ['email', 'push', 'sms'];

export const TASK_DEFAULT_FILTERS: TaskFilters = {
  status: ['todo', 'in_progress', 'in_review'],
};

export const TASK_DEFAULT_SORT: TaskSortOptions = {
  field: 'createdAt',
  direction: 'desc',
};

export const TASK_DEFAULT_PAGINATION: PaginationOptions = {
  page: 1,
  limit: 20,
};