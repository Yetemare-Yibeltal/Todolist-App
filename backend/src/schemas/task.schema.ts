import { z } from "zod";

const taskStatusSchema = z.enum([
  "todo",
  "in_progress",
  "in_review",
  "done",
  "archived",
  "deleted",
]);
const taskPrioritySchema = z.enum([
  "low",
  "medium",
  "high",
  "urgent",
  "critical",
]);

export const createTaskSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(255, "Title cannot exceed 255 characters")
    .transform((val) => val.trim()),
  description: z
    .string()
    .max(10000, "Description cannot exceed 10000 characters")
    .optional()
    .transform((val) => val?.trim()),
  status: taskStatusSchema.default("todo"),
  priority: taskPrioritySchema.default("medium"),
  assignee: z.string().optional(),
  team: z.string().optional(),
  project: z.string().optional(),
  parentTask: z.string().optional(),
  dueDate: z.string().datetime({ offset: true }).optional(),
  startDate: z.string().datetime({ offset: true }).optional(),
  estimatedHours: z.number().min(0).max(1000).optional(),
  labels: z
    .array(z.string().max(50))
    .max(50, "Cannot have more than 50 labels")
    .optional(),
  tags: z
    .array(z.string().max(30))
    .max(50, "Cannot have more than 50 tags")
    .optional(),
  isRecurring: z.boolean().default(false),
  recurringRule: z
    .object({
      frequency: z.enum(["daily", "weekly", "monthly", "yearly", "custom"]),
      interval: z.number().min(1).max(365).default(1),
      daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
      daysOfMonth: z.array(z.number().min(1).max(31)).optional(),
      monthOfYear: z.number().min(1).max(12).optional(),
      customRule: z.string().optional(),
      endDate: z.string().datetime({ offset: true }).optional(),
      occurrences: z.number().positive().optional(),
    })
    .optional(),
  checklist: z
    .array(
      z.object({
        text: z.string().min(1, "Checklist item text is required"),
        completed: z.boolean().default(false),
      }),
    )
    .max(100, "Cannot have more than 100 checklist items")
    .optional(),
  attachments: z
    .array(
      z.object({
        url: z.string().url("Invalid attachment URL"),
        name: z.string().min(1, "Attachment name is required"),
        type: z.string().min(1, "Attachment type is required"),
        size: z.number().positive("File size must be positive"),
      }),
    )
    .max(20, "Cannot have more than 20 attachments")
    .optional(),
  order: z.number().int().min(0).optional(),
});

export const updateTaskSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(255, "Title cannot exceed 255 characters")
    .optional()
    .transform((val) => val?.trim()),
  description: z
    .string()
    .max(10000, "Description cannot exceed 10000 characters")
    .optional()
    .transform((val) => val?.trim()),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  assignee: z.string().optional(),
  team: z.string().optional(),
  project: z.string().optional(),
  parentTask: z.string().optional(),
  dueDate: z.string().datetime({ offset: true }).optional().nullable(),
  startDate: z.string().datetime({ offset: true }).optional().nullable(),
  completedAt: z.string().datetime({ offset: true }).optional(),
  estimatedHours: z.number().min(0).max(1000).optional(),
  actualHours: z.number().min(0).max(10000).optional(),
  labels: z
    .array(z.string().max(50))
    .max(50, "Cannot have more than 50 labels")
    .optional(),
  tags: z
    .array(z.string().max(30))
    .max(50, "Cannot have more than 50 tags")
    .optional(),
  isRecurring: z.boolean().optional(),
  recurringRule: z
    .object({
      frequency: z.enum(["daily", "weekly", "monthly", "yearly", "custom"]),
      interval: z.number().min(1).max(365),
      daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
      daysOfMonth: z.array(z.number().min(1).max(31)).optional(),
      monthOfYear: z.number().min(1).max(12).optional(),
      customRule: z.string().optional(),
      endDate: z.string().datetime({ offset: true }).optional(),
      occurrences: z.number().positive().optional(),
    })
    .optional(),
  checklist: z
    .array(
      z.object({
        text: z.string().min(1, "Checklist item text is required"),
        completed: z.boolean().default(false),
        completedAt: z.string().datetime({ offset: true }).optional(),
        completedBy: z.string().optional(),
      }),
    )
    .max(100, "Cannot have more than 100 checklist items")
    .optional(),
  order: z.number().int().min(0).optional(),
});

export const assignTaskSchema = z.object({
  assigneeId: z.string().min(1, "Assignee ID is required"),
});

export const subtaskSchema = z.object({
  subtaskId: z.string().min(1, "Subtask ID is required"),
});

export const checklistItemSchema = z.object({
  index: z.number().int().min(0, "Index must be a positive integer"),
});

export const bulkUpdateSchema = z.object({
  taskIds: z
    .array(z.string().min(1, "Task ID is required"))
    .min(1, "At least one task ID is required"),
  updates: z.object({
    status: taskStatusSchema.optional(),
    priority: taskPrioritySchema.optional(),
    assignee: z.string().optional().nullable(),
    dueDate: z.string().datetime({ offset: true }).optional().nullable(),
    labels: z.array(z.string().max(50)).max(50).optional(),
    tags: z.array(z.string().max(30)).max(50).optional(),
  }),
});

export const taskFiltersSchema = z.object({
  status: z.string().optional(),
  priority: z.string().optional(),
  assignee: z.string().optional(),
  creator: z.string().optional(),
  team: z.string().optional(),
  project: z.string().optional(),
  labels: z.string().optional(),
  tags: z.string().optional(),
  search: z.string().max(255).optional(),
  dueDateFrom: z.string().datetime({ offset: true }).optional(),
  dueDateTo: z.string().datetime({ offset: true }).optional(),
  createdFrom: z.string().datetime({ offset: true }).optional(),
  createdTo: z.string().datetime({ offset: true }).optional(),
  completed: z.boolean().optional(),
  overdue: z.boolean().optional(),
  parentTask: z.string().optional(),
  isRecurring: z.boolean().optional(),
  hasSubtasks: z.boolean().optional(),
  hasAttachments: z.boolean().optional(),
  hasComments: z.boolean().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sortBy: z
    .enum([
      "createdAt",
      "updatedAt",
      "title",
      "priority",
      "dueDate",
      "status",
      "completionPercentage",
    ])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const taskTimeTrackingSchema = z.object({
  taskId: z.string().min(1, "Task ID is required"),
  duration: z.number().positive().optional(),
  notes: z.string().max(500).optional(),
});

export const taskCommentSchema = z.object({
  content: z
    .string()
    .min(1, "Comment is required")
    .max(5000, "Comment cannot exceed 5000 characters"),
  parentCommentId: z.string().optional(),
  mentions: z
    .array(z.string())
    .max(50, "Cannot mention more than 50 users")
    .optional(),
});

export const taskAttachmentSchema = z.object({
  file: z.any(),
  name: z.string().min(1, "File name is required"),
  type: z.string().min(1, "File type is required"),
  size: z.number().positive("File size must be positive"),
});

export const taskReminderSchema = z.object({
  time: z.string().datetime({ offset: true }),
  type: z.enum(["email", "push", "sms"]),
});

export const taskDependencySchema = z.object({
  taskId: z.string().min(1, "Task ID is required"),
  type: z.enum(["blocking", "blocked"]),
});

export const taskTemplateSchema = z.object({
  name: z
    .string()
    .min(1, "Template name is required")
    .max(100, "Template name cannot exceed 100 characters"),
  description: z.string().optional(),
  data: z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    priority: taskPrioritySchema.default("medium"),
    labels: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    checklist: z.array(z.string()).optional(),
    estimatedHours: z.number().min(0).optional(),
    dueDate: z.string().datetime({ offset: true }).optional(),
  }),
  isPublic: z.boolean().default(false),
  teamId: z.string().optional(),
});

export const taskExportSchema = z.object({
  format: z.enum(["json", "csv", "pdf", "xlsx"]).default("json"),
  filters: taskFiltersSchema.partial(),
  fields: z.array(z.string()).optional(),
  dateRange: z
    .object({
      start: z.string().datetime({ offset: true }),
      end: z.string().datetime({ offset: true }),
    })
    .optional(),
});

export const taskImportSchema = z.object({
  format: z.enum(["json", "csv", "xlsx"]),
  data: z.any(),
  options: z
    .object({
      overwrite: z.boolean().default(false),
      skipDuplicates: z.boolean().default(true),
      assignee: z.string().optional(),
      team: z.string().optional(),
    })
    .optional(),
});

export const taskSearchSchema = z.object({
  query: z
    .string()
    .min(1, "Search query is required")
    .max(500, "Search query cannot exceed 500 characters"),
  filters: taskFiltersSchema.partial(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export const taskMoveSchema = z.object({
  targetId: z.string().optional(),
  position: z.number().int().min(0).optional(),
  newStatus: taskStatusSchema.optional(),
  newPriority: taskPrioritySchema.optional(),
});

export const taskShareSchema = z.object({
  userIds: z.array(z.string()).min(1, "At least one user ID is required"),
  permissions: z.enum(["view", "edit", "admin"]).default("view"),
  expiresAt: z.string().datetime({ offset: true }).optional(),
});

export const taskAnalyticsSchema = z.object({
  startDate: z.string().datetime({ offset: true }),
  endDate: z.string().datetime({ offset: true }),
  groupBy: z
    .enum(["status", "priority", "assignee", "team", "day", "week", "month"])
    .default("status"),
  metrics: z
    .array(z.enum(["count", "completionRate", "averageTime", "totalTime"]))
    .default(["count"]),
});

export const taskSchemas = {
  create: createTaskSchema,
  update: updateTaskSchema,
  assign: assignTaskSchema,
  subtask: subtaskSchema,
  checklistItem: checklistItemSchema,
  bulkUpdate: bulkUpdateSchema,
  filters: taskFiltersSchema,
  timeTracking: taskTimeTrackingSchema,
  comment: taskCommentSchema,
  attachment: taskAttachmentSchema,
  reminder: taskReminderSchema,
  dependency: taskDependencySchema,
  template: taskTemplateSchema,
  export: taskExportSchema,
  import: taskImportSchema,
  search: taskSearchSchema,
  move: taskMoveSchema,
  share: taskShareSchema,
  analytics: taskAnalyticsSchema,
};

export default taskSchemas;
