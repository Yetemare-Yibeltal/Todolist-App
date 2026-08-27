import { z } from "zod";

// Enums
export const TaskStatus = z.enum([
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "ON_HOLD",
  "REVIEW",
  "ARCHIVED",
]);
export const TaskPriority = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);

// Base schemas
export const taskIdSchema = z.string().uuid("Invalid task ID");
export const userIdSchema = z.string().uuid("Invalid user ID");

// Task schemas
export const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(255, "Title is too long"),
  description: z.string().max(5000, "Description is too long").optional(),
  status: TaskStatus.default("PENDING"),
  priority: TaskPriority.default("MEDIUM"),
  dueDate: z.string().datetime().optional().nullable(),
  tags: z.array(z.string().max(50)).max(20, "Too many tags").default([]),
  attachments: z
    .array(z.record(z.any()))
    .max(10, "Too many attachments")
    .default([]),
  parentId: taskIdSchema.nullable().optional(),
  order: z.number().int().default(0),
  isArchived: z.boolean().default(false),
});

export const updateTaskSchema = createTaskSchema.partial().extend({
  completedAt: z.string().datetime().nullable().optional(),
});

export const taskFiltersSchema = z.object({
  status: TaskStatus.optional(),
  priority: TaskPriority.optional(),
  search: z.string().max(100).optional(),
  tags: z.array(z.string()).optional(),
  dueDateFrom: z.string().datetime().optional(),
  dueDateTo: z.string().datetime().optional(),
  isArchived: z.boolean().optional(),
  userId: userIdSchema.optional(),
  parentId: taskIdSchema.nullable().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sortBy: z
    .enum(["createdAt", "updatedAt", "dueDate", "priority", "status"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const bulkUpdateSchema = z.object({
  taskIds: z.array(taskIdSchema).min(1, "At least one task is required"),
  updates: updateTaskSchema,
});

// Comment schemas
export const createCommentSchema = z.object({
  content: z
    .string()
    .min(1, "Comment is required")
    .max(10000, "Comment is too long"),
  parentId: z.string().uuid().nullable().optional(),
});

export const updateCommentSchema = z.object({
  content: z
    .string()
    .min(1, "Comment is required")
    .max(10000, "Comment is too long"),
});

// Label schemas
export const createLabelSchema = z.object({
  name: z
    .string()
    .min(1, "Label name is required")
    .max(50, "Label name is too long"),
  color: z.string().regex(/^#[0-9a-f]{6}$/i, "Invalid color format"),
  description: z.string().max(500, "Description is too long").optional(),
});

export const updateLabelSchema = createLabelSchema.partial();

// Reminder schemas
export const createReminderSchema = z.object({
  reminderAt: z.string().datetime("Invalid date format"),
  message: z
    .string()
    .min(1, "Reminder message is required")
    .max(500, "Message is too long"),
});

// Types
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type TaskFilters = z.infer<typeof taskFiltersSchema>;
export type BulkUpdateInput = z.infer<typeof bulkUpdateSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
export type CreateLabelInput = z.infer<typeof createLabelSchema>;
export type UpdateLabelInput = z.infer<typeof updateLabelSchema>;
export type CreateReminderInput = z.infer<typeof createReminderSchema>;

export default {
  createTaskSchema,
  updateTaskSchema,
  taskFiltersSchema,
  bulkUpdateSchema,
  createCommentSchema,
  updateCommentSchema,
  createLabelSchema,
  updateLabelSchema,
  createReminderSchema,
};
