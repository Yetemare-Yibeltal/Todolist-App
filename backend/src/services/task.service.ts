import { Types, FilterQuery, UpdateQuery } from "mongoose";
import { Task, ITask } from "../models/Task";
import { User } from "../models/User";
import { logger } from "../utils/logger";
import { ApiError } from "../utils/apiError";
import { redisClient, redisGet, redisSet, redisDel } from "../config/redis";
import { emailService } from "./email.service";
import { notificationService } from "./notification.service";
import { performance } from "perf_hooks";
import { EventEmitter } from "events";

interface TaskFilters {
  status?: string[];
  priority?: string[];
  assignee?: string;
  creator?: string;
  team?: string;
  project?: string;
  labels?: string[];
  tags?: string[];
  search?: string;
  dueDateFrom?: Date;
  dueDateTo?: Date;
  createdFrom?: Date;
  createdTo?: Date;
  completed?: boolean;
  overdue?: boolean;
  parentTask?: string;
  isRecurring?: boolean;
  hasSubtasks?: boolean;
  hasAttachments?: boolean;
  hasComments?: boolean;
}

interface TaskSortOptions {
  field:
    | "createdAt"
    | "updatedAt"
    | "title"
    | "priority"
    | "dueDate"
    | "status"
    | "completionPercentage";
  direction: "asc" | "desc";
}

interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

interface BulkOperation {
  taskIds: string[];
  updates: any;
}

interface TaskStats {
  total: number;
  todo: number;
  inProgress: number;
  inReview: number;
  done: number;
  archived: number;
  overdue: number;
  completionRate: number;
  averageCompletionTime: number;
  totalTimeSpent: number;
  byPriority: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
    critical: number;
  };
  byStatus: {
    todo: number;
    inProgress: number;
    inReview: number;
    done: number;
    archived: number;
  };
}

class TaskService extends EventEmitter {
  private static instance: TaskService;
  private cachePrefix = "task:";
  private listCachePrefix = "tasks:list:";
  private statsCachePrefix = "tasks:stats:";

  private constructor() {
    super();
  }

  public static getInstance(): TaskService {
    if (!TaskService.instance) {
      TaskService.instance = new TaskService();
    }
    return TaskService.instance;
  }

  private generateCacheKey(id: string): string {
    return `${this.cachePrefix}${id}`;
  }

  private generateListCacheKey(
    userId: string,
    filters: TaskFilters,
    options: PaginationOptions,
  ): string {
    const filterString = JSON.stringify(filters);
    const optionsString = JSON.stringify(options);
    return `${this.listCachePrefix}${userId}:${Buffer.from(filterString).toString("base64")}:${Buffer.from(optionsString).toString("base64")}`;
  }

  private generateStatsCacheKey(userId: string): string {
    return `${this.statsCachePrefix}${userId}`;
  }

  private async invalidateCache(taskId: string, userId: string): Promise<void> {
    await redisDel(this.generateCacheKey(taskId));

    const pattern = `${this.listCachePrefix}${userId}:*`;
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }

    await redisDel(this.generateStatsCacheKey(userId));
  }

  private buildFilterQuery(
    filters: TaskFilters,
    userId?: string,
  ): FilterQuery<ITask> {
    const query: FilterQuery<ITask> = {};

    if (filters.status && filters.status.length > 0) {
      query.status = { $in: filters.status };
    }

    if (filters.priority && filters.priority.length > 0) {
      query.priority = { $in: filters.priority };
    }

    if (filters.assignee) {
      query.assignee = new Types.ObjectId(filters.assignee);
    }

    if (filters.creator) {
      query.creator = new Types.ObjectId(filters.creator);
    }

    if (filters.team) {
      query.team = new Types.ObjectId(filters.team);
    }

    if (filters.project) {
      query.project = new Types.ObjectId(filters.project);
    }

    if (filters.labels && filters.labels.length > 0) {
      query.labels = { $in: filters.labels };
    }

    if (filters.tags && filters.tags.length > 0) {
      query.tags = { $in: filters.tags };
    }

    if (filters.dueDateFrom || filters.dueDateTo) {
      query.dueDate = {};
      if (filters.dueDateFrom) {
        query.dueDate.$gte = filters.dueDateFrom;
      }
      if (filters.dueDateTo) {
        query.dueDate.$lte = filters.dueDateTo;
      }
    }

    if (filters.createdFrom || filters.createdTo) {
      query.createdAt = {};
      if (filters.createdFrom) {
        query.createdAt.$gte = filters.createdFrom;
      }
      if (filters.createdTo) {
        query.createdAt.$lte = filters.createdTo;
      }
    }

    if (filters.completed !== undefined) {
      query.status = filters.completed ? "done" : { $ne: "done" };
    }

    if (filters.overdue) {
      query.dueDate = { $lt: new Date() };
      query.status = { $nin: ["done", "archived", "deleted"] };
    }

    if (filters.parentTask) {
      query.parentTask = new Types.ObjectId(filters.parentTask);
    }

    if (filters.isRecurring !== undefined) {
      query.isRecurring = filters.isRecurring;
    }

    if (filters.hasSubtasks !== undefined) {
      query.subtasks = filters.hasSubtasks
        ? { $exists: true, $ne: [] }
        : { $size: 0 };
    }

    if (filters.hasAttachments !== undefined) {
      query.attachments = filters.hasAttachments
        ? { $exists: true, $ne: [] }
        : { $size: 0 };
    }

    if (filters.hasComments !== undefined) {
      query.comments = filters.hasComments
        ? { $exists: true, $ne: [] }
        : { $size: 0 };
    }

    if (filters.search) {
      query.$or = [
        { title: { $regex: filters.search, $options: "i" } },
        { description: { $regex: filters.search, $options: "i" } },
        { tags: { $in: [new RegExp(filters.search, "i")] } },
        { labels: { $in: [new RegExp(filters.search, "i")] } },
      ];
    }

    query.status = { $ne: "deleted" };

    return query;
  }

  public async createTask(
    taskData: Partial<ITask>,
    userId: string,
  ): Promise<ITask> {
    const startTime = performance.now();

    try {
      const task = new Task({
        ...taskData,
        creator: new Types.ObjectId(userId),
        "metadata.createdBy": new Types.ObjectId(userId),
        "metadata.updatedBy": new Types.ObjectId(userId),
        "metadata.createdAt": new Date(),
        "metadata.updatedAt": new Date(),
      });

      if (taskData.assignee) {
        const assignee = await User.findById(taskData.assignee);
        if (!assignee) {
          throw new ApiError(404, "Assignee user not found");
        }
      }

      if (taskData.team) {
        const team = await User.findById(taskData.team);
        if (!team) {
          throw new ApiError(404, "Team not found");
        }
      }

      await task.save();

      if (taskData.assignee) {
        await notificationService.notifyTaskAssigned(task);
      }

      await this.invalidateCache(task._id.toString(), userId);

      const duration = (performance.now() - startTime) / 1000;
      logger.info(`Task created in ${duration.toFixed(2)}s`, {
        taskId: task._id,
        userId,
        title: task.title,
      });

      this.emit("taskCreated", { task, userId });

      return task;
    } catch (error: any) {
      logger.error("Error creating task:", { error: error.message, userId });
      throw error;
    }
  }

  public async getTaskById(taskId: string, userId: string): Promise<ITask> {
    const startTime = performance.now();

    try {
      const cacheKey = this.generateCacheKey(taskId);
      const cached = await redisGet(cacheKey);

      if (cached) {
        const duration = (performance.now() - startTime) / 1000;
        logger.debug(`Task retrieved from cache in ${duration.toFixed(2)}s`, {
          taskId,
          userId,
        });
        return cached as ITask;
      }

      const task = await Task.findById(taskId)
        .populate("assignee", "firstName lastName email avatar")
        .populate("creator", "firstName lastName email avatar")
        .populate("team", "name slug")
        .populate("project", "name slug")
        .populate("parentTask", "title status")
        .populate("subtasks", "title status priority assignee")
        .populate("watchers", "firstName lastName email")
        .populate("comments");

      if (!task) {
        throw new ApiError(404, "Task not found");
      }

      if (task.status === "deleted") {
        throw new ApiError(404, "Task not found");
      }

      const canView =
        task.creator._id.toString() === userId ||
        task.assignee?._id.toString() === userId ||
        task.watchers.some((w) => w._id.toString() === userId);

      if (!canView) {
        throw new ApiError(403, "You do not have permission to view this task");
      }

      task.viewCount += 1;
      await task.save();

      await redisSet(cacheKey, task, { ttl: 300 });

      const duration = (performance.now() - startTime) / 1000;
      logger.debug(`Task retrieved in ${duration.toFixed(2)}s`, {
        taskId,
        userId,
      });

      return task;
    } catch (error: any) {
      logger.error("Error getting task:", {
        error: error.message,
        taskId,
        userId,
      });
      throw error;
    }
  }

  public async getTasks(
    userId: string,
    filters: TaskFilters,
    options: PaginationOptions,
  ): Promise<{
    tasks: ITask[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const startTime = performance.now();

    try {
      const cacheKey = this.generateListCacheKey(userId, filters, options);
      const cached = await redisGet(cacheKey);

      if (cached) {
        const duration = (performance.now() - startTime) / 1000;
        logger.debug(
          `Tasks list retrieved from cache in ${duration.toFixed(2)}s`,
          {
            userId,
          },
        );
        return cached as {
          tasks: ITask[];
          total: number;
          page: number;
          totalPages: number;
        };
      }

      const query = this.buildFilterQuery(filters, userId);

      const page = Math.max(1, options.page || 1);
      const limit = Math.min(100, options.limit || 20);
      const skip = (page - 1) * limit;

      const sortOptions: any = {};
      const sortField = options.sortBy || "createdAt";
      const sortOrder = options.sortOrder || "desc";
      sortOptions[sortField] = sortOrder === "asc" ? 1 : -1;

      const [tasks, total] = await Promise.all([
        Task.find(query)
          .populate("assignee", "firstName lastName email avatar")
          .populate("creator", "firstName lastName email avatar")
          .populate("team", "name slug")
          .populate("project", "name slug")
          .populate("parentTask", "title status")
          .sort(sortOptions)
          .limit(limit)
          .skip(skip),
        Task.countDocuments(query),
      ]);

      const totalPages = Math.ceil(total / limit);

      const result = {
        tasks,
        total,
        page,
        totalPages,
      };

      await redisSet(cacheKey, result, { ttl: 60 });

      const duration = (performance.now() - startTime) / 1000;
      logger.debug(`Tasks list retrieved in ${duration.toFixed(2)}s`, {
        userId,
        total,
        page,
      });

      return result;
    } catch (error: any) {
      logger.error("Error getting tasks:", { error: error.message, userId });
      throw error;
    }
  }

  public async updateTask(
    taskId: string,
    updateData: UpdateQuery<ITask>,
    userId: string,
  ): Promise<ITask> {
    const startTime = performance.now();

    try {
      const task = await Task.findById(taskId);

      if (!task || task.status === "deleted") {
        throw new ApiError(404, "Task not found");
      }

      const canEdit =
        task.creator._id.toString() === userId ||
        task.assignee?._id.toString() === userId ||
        task.watchers.some((w) => w._id.toString() === userId);

      if (!canEdit) {
        throw new ApiError(403, "You do not have permission to edit this task");
      }

      const oldStatus = task.status;
      const oldAssignee = task.assignee;

      Object.assign(task, updateData);
      task.metadata.updatedBy = new Types.ObjectId(userId);
      task.metadata.updatedAt = new Date();

      if (updateData.status && updateData.status !== oldStatus) {
        if (updateData.status === "done") {
          task.completedAt = new Date();
          await this.handleTaskCompletion(task);
        }
      }

      await task.save();

      if (updateData.assignee && updateData.assignee !== oldAssignee) {
        await notificationService.notifyTaskAssigned(task);
      }

      await this.invalidateCache(taskId, userId);

      const duration = (performance.now() - startTime) / 1000;
      logger.info(`Task updated in ${duration.toFixed(2)}s`, {
        taskId,
        userId,
        changes: Object.keys(updateData),
      });

      this.emit("taskUpdated", { task, userId, oldStatus, oldAssignee });

      return task;
    } catch (error: any) {
      logger.error("Error updating task:", {
        error: error.message,
        taskId,
        userId,
      });
      throw error;
    }
  }

  private async handleTaskCompletion(task: ITask): Promise<void> {
    try {
      const subtasks = await Task.find({ parentTask: task._id });

      for (const subtask of subtasks) {
        if (subtask.status !== "done") {
          subtask.status = "done";
          subtask.completedAt = new Date();
          await subtask.save();
        }
      }

      if (task.isRecurring && task.recurringRule) {
        await this.createRecurringTask(task);
      }

      await notificationService.notifyTaskCompleted(task);
    } catch (error: any) {
      logger.error("Error handling task completion:", {
        error: error.message,
        taskId: task._id,
      });
    }
  }

  private async createRecurringTask(task: ITask): Promise<void> {
    try {
      const { recurringRule } = task;

      if (!recurringRule) return;

      if (
        recurringRule.occurrences &&
        recurringRule.currentOccurrence >= recurringRule.occurrences
      ) {
        return;
      }

      if (recurringRule.endDate && new Date() > recurringRule.endDate) {
        return;
      }

      const newTask = new Task({
        title: task.title,
        description: task.description,
        priority: task.priority,
        assignee: task.assignee,
        creator: task.creator,
        team: task.team,
        project: task.project,
        labels: task.labels,
        tags: task.tags,
        order: task.order,
        isRecurring: true,
        recurringRule: {
          ...recurringRule,
          currentOccurrence: recurringRule.currentOccurrence + 1,
          originalTaskId: task._id,
        },
        "metadata.createdBy": task.creator,
        "metadata.updatedBy": task.creator,
        "metadata.createdAt": new Date(),
        "metadata.updatedAt": new Date(),
      });

      await newTask.save();

      logger.info("Recurring task created:", {
        originalTaskId: task._id,
        newTaskId: newTask._id,
        occurrence: recurringRule.currentOccurrence + 1,
      });
    } catch (error: any) {
      logger.error("Error creating recurring task:", {
        error: error.message,
        taskId: task._id,
      });
    }
  }

  public async deleteTask(
    taskId: string,
    userId: string,
    permanent: boolean = false,
  ): Promise<void> {
    const startTime = performance.now();

    try {
      const task = await Task.findById(taskId);

      if (!task || task.status === "deleted") {
        throw new ApiError(404, "Task not found");
      }

      const canDelete = task.creator._id.toString() === userId;

      if (!canDelete) {
        throw new ApiError(403, "Only the creator can delete this task");
      }

      if (permanent) {
        await task.deleteOne();
        logger.info("Task permanently deleted:", { taskId, userId });
      } else {
        task.status = "deleted";
        await task.save();
        logger.info("Task moved to trash:", { taskId, userId });
      }

      await this.invalidateCache(taskId, userId);

      const duration = (performance.now() - startTime) / 1000;
      logger.info(`Task deleted in ${duration.toFixed(2)}s`, {
        taskId,
        userId,
        permanent,
      });

      this.emit("taskDeleted", { task, userId, permanent });
    } catch (error: any) {
      logger.error("Error deleting task:", {
        error: error.message,
        taskId,
        userId,
      });
      throw error;
    }
  }

  public async restoreTask(taskId: string, userId: string): Promise<ITask> {
    const startTime = performance.now();

    try {
      const task = await Task.findById(taskId);

      if (!task) {
        throw new ApiError(404, "Task not found");
      }

      if (task.status !== "deleted") {
        throw new ApiError(400, "Task is not in trash");
      }

      const canRestore = task.creator._id.toString() === userId;

      if (!canRestore) {
        throw new ApiError(403, "Only the creator can restore this task");
      }

      task.status = "todo";
      await task.save();

      await this.invalidateCache(taskId, userId);

      const duration = (performance.now() - startTime) / 1000;
      logger.info(`Task restored in ${duration.toFixed(2)}s`, {
        taskId,
        userId,
      });

      this.emit("taskRestored", { task, userId });

      return task;
    } catch (error: any) {
      logger.error("Error restoring task:", {
        error: error.message,
        taskId,
        userId,
      });
      throw error;
    }
  }

  public async archiveTask(taskId: string, userId: string): Promise<ITask> {
    const startTime = performance.now();

    try {
      const task = await Task.findById(taskId);

      if (!task || task.status === "deleted") {
        throw new ApiError(404, "Task not found");
      }

      if (task.status !== "done") {
        throw new ApiError(400, "Only completed tasks can be archived");
      }

      const canArchive =
        task.creator._id.toString() === userId ||
        task.assignee?._id.toString() === userId;

      if (!canArchive) {
        throw new ApiError(
          403,
          "You do not have permission to archive this task",
        );
      }

      task.status = "archived";
      await task.save();

      await this.invalidateCache(taskId, userId);

      const duration = (performance.now() - startTime) / 1000;
      logger.info(`Task archived in ${duration.toFixed(2)}s`, {
        taskId,
        userId,
      });

      this.emit("taskArchived", { task, userId });

      return task;
    } catch (error: any) {
      logger.error("Error archiving task:", {
        error: error.message,
        taskId,
        userId,
      });
      throw error;
    }
  }

  public async assignTask(
    taskId: string,
    assigneeId: string,
    userId: string,
  ): Promise<ITask> {
    const startTime = performance.now();

    try {
      const task = await Task.findById(taskId);

      if (!task || task.status === "deleted") {
        throw new ApiError(404, "Task not found");
      }

      const canAssign =
        task.creator._id.toString() === userId ||
        (task.assignee && task.assignee._id.toString() === userId);

      if (!canAssign) {
        throw new ApiError(
          403,
          "You do not have permission to assign this task",
        );
      }

      const assignee = await User.findById(assigneeId);
      if (!assignee) {
        throw new ApiError(404, "User not found");
      }

      task.assignee = new Types.ObjectId(assigneeId);
      await task.save();

      await this.invalidateCache(taskId, userId);
      await notificationService.notifyTaskAssigned(task);

      const duration = (performance.now() - startTime) / 1000;
      logger.info(`Task assigned in ${duration.toFixed(2)}s`, {
        taskId,
        assigneeId,
        userId,
      });

      this.emit("taskAssigned", { task, assignee, userId });

      return task;
    } catch (error: any) {
      logger.error("Error assigning task:", {
        error: error.message,
        taskId,
        assigneeId,
        userId,
      });
      throw error;
    }
  }

  public async addSubtask(
    taskId: string,
    subtaskId: string,
    userId: string,
  ): Promise<ITask> {
    const startTime = performance.now();

    try {
      const task = await Task.findById(taskId);
      if (!task || task.status === "deleted") {
        throw new ApiError(404, "Task not found");
      }

      const subtask = await Task.findById(subtaskId);
      if (!subtask || subtask.status === "deleted") {
        throw new ApiError(404, "Subtask not found");
      }

      const canModify =
        task.creator._id.toString() === userId ||
        task.assignee?._id.toString() === userId;

      if (!canModify) {
        throw new ApiError(
          403,
          "You do not have permission to modify this task",
        );
      }

      await task.addSubtask(new Types.ObjectId(subtaskId));
      subtask.parentTask = new Types.ObjectId(taskId);
      await subtask.save();

      await this.invalidateCache(taskId, userId);
      await this.invalidateCache(subtaskId, userId);

      const duration = (performance.now() - startTime) / 1000;
      logger.info(`Subtask added in ${duration.toFixed(2)}s`, {
        taskId,
        subtaskId,
        userId,
      });

      return task;
    } catch (error: any) {
      logger.error("Error adding subtask:", {
        error: error.message,
        taskId,
        subtaskId,
        userId,
      });
      throw error;
    }
  }

  public async removeSubtask(
    taskId: string,
    subtaskId: string,
    userId: string,
  ): Promise<ITask> {
    const startTime = performance.now();

    try {
      const task = await Task.findById(taskId);
      if (!task || task.status === "deleted") {
        throw new ApiError(404, "Task not found");
      }

      const subtask = await Task.findById(subtaskId);
      if (!subtask) {
        throw new ApiError(404, "Subtask not found");
      }

      const canModify =
        task.creator._id.toString() === userId ||
        task.assignee?._id.toString() === userId;

      if (!canModify) {
        throw new ApiError(
          403,
          "You do not have permission to modify this task",
        );
      }

      await task.removeSubtask(new Types.ObjectId(subtaskId));
      subtask.parentTask = undefined;
      await subtask.save();

      await this.invalidateCache(taskId, userId);
      await this.invalidateCache(subtaskId, userId);

      const duration = (performance.now() - startTime) / 1000;
      logger.info(`Subtask removed in ${duration.toFixed(2)}s`, {
        taskId,
        subtaskId,
        userId,
      });

      return task;
    } catch (error: any) {
      logger.error("Error removing subtask:", {
        error: error.message,
        taskId,
        subtaskId,
        userId,
      });
      throw error;
    }
  }

  public async addComment(
    taskId: string,
    commentId: string,
    userId: string,
  ): Promise<ITask> {
    const startTime = performance.now();

    try {
      const task = await Task.findById(taskId);
      if (!task || task.status === "deleted") {
        throw new ApiError(404, "Task not found");
      }

      await task.addComment(new Types.ObjectId(commentId));
      task.lastActivityAt = new Date();
      await task.save();

      await this.invalidateCache(taskId, userId);

      const duration = (performance.now() - startTime) / 1000;
      logger.info(`Comment added in ${duration.toFixed(2)}s`, {
        taskId,
        commentId,
        userId,
      });

      return task;
    } catch (error: any) {
      logger.error("Error adding comment:", {
        error: error.message,
        taskId,
        commentId,
        userId,
      });
      throw error;
    }
  }

  public async removeComment(
    taskId: string,
    commentId: string,
    userId: string,
  ): Promise<ITask> {
    const startTime = performance.now();

    try {
      const task = await Task.findById(taskId);
      if (!task || task.status === "deleted") {
        throw new ApiError(404, "Task not found");
      }

      await task.removeComment(new Types.ObjectId(commentId));
      await task.save();

      await this.invalidateCache(taskId, userId);

      const duration = (performance.now() - startTime) / 1000;
      logger.info(`Comment removed in ${duration.toFixed(2)}s`, {
        taskId,
        commentId,
        userId,
      });

      return task;
    } catch (error: any) {
      logger.error("Error removing comment:", {
        error: error.message,
        taskId,
        commentId,
        userId,
      });
      throw error;
    }
  }

  public async addWatcher(taskId: string, userId: string): Promise<ITask> {
    const startTime = performance.now();

    try {
      const task = await Task.findById(taskId);
      if (!task || task.status === "deleted") {
        throw new ApiError(404, "Task not found");
      }

      await task.addWatcher(new Types.ObjectId(userId));
      await task.save();

      await this.invalidateCache(taskId, userId);

      const duration = (performance.now() - startTime) / 1000;
      logger.info(`Watcher added in ${duration.toFixed(2)}s`, {
        taskId,
        userId,
      });

      return task;
    } catch (error: any) {
      logger.error("Error adding watcher:", {
        error: error.message,
        taskId,
        userId,
      });
      throw error;
    }
  }

  public async removeWatcher(taskId: string, userId: string): Promise<ITask> {
    const startTime = performance.now();

    try {
      const task = await Task.findById(taskId);
      if (!task || task.status === "deleted") {
        throw new ApiError(404, "Task not found");
      }

      await task.removeWatcher(new Types.ObjectId(userId));
      await task.save();

      await this.invalidateCache(taskId, userId);

      const duration = (performance.now() - startTime) / 1000;
      logger.info(`Watcher removed in ${duration.toFixed(2)}s`, {
        taskId,
        userId,
      });

      return task;
    } catch (error: any) {
      logger.error("Error removing watcher:", {
        error: error.message,
        taskId,
        userId,
      });
      throw error;
    }
  }

  public async toggleChecklistItem(
    taskId: string,
    index: number,
    userId: string,
  ): Promise<ITask> {
    const startTime = performance.now();

    try {
      const task = await Task.findById(taskId);
      if (!task || task.status === "deleted") {
        throw new ApiError(404, "Task not found");
      }

      await task.toggleChecklistItem(index, new Types.ObjectId(userId));
      await task.save();

      await this.invalidateCache(taskId, userId);

      const duration = (performance.now() - startTime) / 1000;
      logger.info(`Checklist item toggled in ${duration.toFixed(2)}s`, {
        taskId,
        index,
        userId,
      });

      return task;
    } catch (error: any) {
      logger.error("Error toggling checklist item:", {
        error: error.message,
        taskId,
        index,
        userId,
      });
      throw error;
    }
  }

  public async addAttachment(
    taskId: string,
    attachmentData: any,
    userId: string,
  ): Promise<ITask> {
    const startTime = performance.now();

    try {
      const task = await Task.findById(taskId);
      if (!task || task.status === "deleted") {
        throw new ApiError(404, "Task not found");
      }

      await task.addAttachment({
        ...attachmentData,
        uploadedBy: new Types.ObjectId(userId),
        uploadedAt: new Date(),
      });
      await task.save();

      await this.invalidateCache(taskId, userId);

      const duration = (performance.now() - startTime) / 1000;
      logger.info(`Attachment added in ${duration.toFixed(2)}s`, {
        taskId,
        userId,
      });

      return task;
    } catch (error: any) {
      logger.error("Error adding attachment:", {
        error: error.message,
        taskId,
        userId,
      });
      throw error;
    }
  }

  public async removeAttachment(
    taskId: string,
    attachmentId: string,
    userId: string,
  ): Promise<ITask> {
    const startTime = performance.now();

    try {
      const task = await Task.findById(taskId);
      if (!task || task.status === "deleted") {
        throw new ApiError(404, "Task not found");
      }

      await task.removeAttachment(attachmentId);
      await task.save();

      await this.invalidateCache(taskId, userId);

      const duration = (performance.now() - startTime) / 1000;
      logger.info(`Attachment removed in ${duration.toFixed(2)}s`, {
        taskId,
        attachmentId,
        userId,
      });

      return task;
    } catch (error: any) {
      logger.error("Error removing attachment:", {
        error: error.message,
        taskId,
        attachmentId,
        userId,
      });
      throw error;
    }
  }

  public async startTimeTracking(
    taskId: string,
    userId: string,
  ): Promise<ITask> {
    const startTime = performance.now();

    try {
      const task = await Task.findById(taskId);
      if (!task || task.status === "deleted") {
        throw new ApiError(404, "Task not found");
      }

      await task.startTimeTracking();
      await task.save();

      await this.invalidateCache(taskId, userId);

      const duration = (performance.now() - startTime) / 1000;
      logger.info(`Time tracking started in ${duration.toFixed(2)}s`, {
        taskId,
        userId,
      });

      return task;
    } catch (error: any) {
      logger.error("Error starting time tracking:", {
        error: error.message,
        taskId,
        userId,
      });
      throw error;
    }
  }

  public async pauseTimeTracking(
    taskId: string,
    userId: string,
  ): Promise<ITask> {
    const startTime = performance.now();

    try {
      const task = await Task.findById(taskId);
      if (!task || task.status === "deleted") {
        throw new ApiError(404, "Task not found");
      }

      await task.pauseTimeTracking();
      await task.save();

      await this.invalidateCache(taskId, userId);

      const duration = (performance.now() - startTime) / 1000;
      logger.info(`Time tracking paused in ${duration.toFixed(2)}s`, {
        taskId,
        userId,
      });

      return task;
    } catch (error: any) {
      logger.error("Error pausing time tracking:", {
        error: error.message,
        taskId,
        userId,
      });
      throw error;
    }
  }

  public async stopTimeTracking(
    taskId: string,
    userId: string,
  ): Promise<ITask> {
    const startTime = performance.now();

    try {
      const task = await Task.findById(taskId);
      if (!task || task.status === "deleted") {
        throw new ApiError(404, "Task not found");
      }

      await task.stopTimeTracking();
      await task.save();

      await this.invalidateCache(taskId, userId);

      const duration = (performance.now() - startTime) / 1000;
      logger.info(`Time tracking stopped in ${duration.toFixed(2)}s`, {
        taskId,
        userId,
        totalTime: task.timeTracking.totalSeconds,
      });

      return task;
    } catch (error: any) {
      logger.error("Error stopping time tracking:", {
        error: error.message,
        taskId,
        userId,
      });
      throw error;
    }
  }

  public async getTaskStats(userId: string): Promise<TaskStats> {
    const startTime = performance.now();

    try {
      const cacheKey = this.generateStatsCacheKey(userId);
      const cached = await redisGet(cacheKey);

      if (cached) {
        const duration = (performance.now() - startTime) / 1000;
        logger.debug(
          `Task stats retrieved from cache in ${duration.toFixed(2)}s`,
          {
            userId,
          },
        );
        return cached as TaskStats;
      }

      const stats = await Task.getStats(new Types.ObjectId(userId));

      const result: TaskStats = {
        total: stats.total || 0,
        todo: stats.todo || 0,
        inProgress: stats.inProgress || 0,
        inReview: stats.inReview || 0,
        done: stats.done || 0,
        archived: stats.archived || 0,
        overdue: stats.overdue || 0,
        completionRate: stats.total > 0 ? (stats.done / stats.total) * 100 : 0,
        averageCompletionTime: stats.avgCompletionTime || 0,
        totalTimeSpent: stats.totalTimeSpent || 0,
        byPriority: {
          low: stats.lowPriority || 0,
          medium: stats.mediumPriority || 0,
          high: stats.highPriority || 0,
          urgent: stats.urgentPriority || 0,
          critical: stats.criticalPriority || 0,
        },
        byStatus: {
          todo: stats.todo || 0,
          inProgress: stats.inProgress || 0,
          inReview: stats.inReview || 0,
          done: stats.done || 0,
          archived: stats.archived || 0,
        },
      };

      await redisSet(cacheKey, result, { ttl: 300 });

      const duration = (performance.now() - startTime) / 1000;
      logger.debug(`Task stats retrieved in ${duration.toFixed(2)}s`, {
        userId,
        total: result.total,
      });

      return result;
    } catch (error: any) {
      logger.error("Error getting task stats:", {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  public async bulkUpdateTasks(
    operations: BulkOperation,
    userId: string,
  ): Promise<void> {
    const startTime = performance.now();

    try {
      const tasks = await Task.find({
        _id: { $in: operations.taskIds },
        status: { $ne: "deleted" },
      });

      const allowedTasks = tasks.filter(
        (task) =>
          task.creator._id.toString() === userId ||
          task.assignee?._id.toString() === userId,
      );

      if (allowedTasks.length === 0) {
        throw new ApiError(
          403,
          "You do not have permission to modify these tasks",
        );
      }

      const taskIds = allowedTasks.map((task) => task._id.toString());

      await Task.bulkUpdate(taskIds, operations.updates);

      for (const taskId of taskIds) {
        await this.invalidateCache(taskId, userId);
      }

      const duration = (performance.now() - startTime) / 1000;
      logger.info(`Bulk update completed in ${duration.toFixed(2)}s`, {
        taskCount: taskIds.length,
        userId,
      });
    } catch (error: any) {
      logger.error("Error in bulk update:", { error: error.message, userId });
      throw error;
    }
  }

  public async getOverdueTasks(
    userId: string,
    limit: number = 20,
  ): Promise<ITask[]> {
    try {
      const tasks = await Task.findOverdue()
        .limit(limit)
        .populate("assignee", "firstName lastName email avatar")
        .populate("creator", "firstName lastName email avatar");

      return tasks;
    } catch (error: any) {
      logger.error("Error getting overdue tasks:", {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  public async getTasksByPriority(userId: string): Promise<any> {
    try {
      const tasks = await Task.getTasksByPriority(new Types.ObjectId(userId));
      return tasks;
    } catch (error: any) {
      logger.error("Error getting tasks by priority:", {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  public async getTaskDistribution(userId: string): Promise<any> {
    try {
      const distribution = await Task.getTaskDistribution(
        new Types.ObjectId(userId),
      );
      return distribution;
    } catch (error: any) {
      logger.error("Error getting task distribution:", {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  public async getAverageCompletionTime(userId: string): Promise<any> {
    try {
      const result = await Task.getAverageCompletionTime(
        new Types.ObjectId(userId),
      );
      return result;
    } catch (error: any) {
      logger.error("Error getting average completion time:", {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  public async archiveOldTasks(days: number): Promise<number> {
    try {
      const count = await Task.archiveOldTasks(days);
      logger.info(`Archived ${count} old tasks`);
      return count;
    } catch (error: any) {
      logger.error("Error archiving old tasks:", { error: error.message });
      throw error;
    }
  }

  public async cleanupDeletedTasks(): Promise<number> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await Task.deleteMany({
        status: "deleted",
        updatedAt: { $lt: thirtyDaysAgo },
      });

      logger.info(
        `Permanently deleted ${result.deletedCount} tasks from trash`,
      );
      return result.deletedCount || 0;
    } catch (error: any) {
      logger.error("Error cleaning up deleted tasks:", {
        error: error.message,
      });
      throw error;
    }
  }
}

export const taskService = TaskService.getInstance();
export default taskService;
