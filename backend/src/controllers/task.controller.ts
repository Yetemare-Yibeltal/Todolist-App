import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import { taskService } from "../services/task.service";
import { logger } from "../utils/logger";
import { ApiError } from "../utils/apiError";
import { validationService } from "../services/validation.service";
import { performance } from "perf_hooks";

interface CreateTaskRequest {
  title: string;
  description?: string;
  status?: "todo" | "in_progress" | "in_review" | "done" | "archived";
  priority?: "low" | "medium" | "high" | "urgent" | "critical";
  assignee?: string;
  team?: string;
  project?: string;
  parentTask?: string;
  dueDate?: string;
  startDate?: string;
  estimatedHours?: number;
  labels?: string[];
  tags?: string[];
  isRecurring?: boolean;
  recurringRule?: any;
  checklist?: any[];
  attachments?: any[];
}

interface UpdateTaskRequest {
  title?: string;
  description?: string;
  status?: "todo" | "in_progress" | "in_review" | "done" | "archived";
  priority?: "low" | "medium" | "high" | "urgent" | "critical";
  assignee?: string;
  team?: string;
  project?: string;
  parentTask?: string;
  dueDate?: string;
  startDate?: string;
  estimatedHours?: number;
  actualHours?: number;
  labels?: string[];
  tags?: string[];
  isRecurring?: boolean;
  recurringRule?: any;
  checklist?: any[];
  order?: number;
}

class TaskController {
  private static instance: TaskController;

  private constructor() {}

  public static getInstance(): TaskController {
    if (!TaskController.instance) {
      TaskController.instance = new TaskController();
    }
    return TaskController.instance;
  }

  public async createTask(req: Request, res: Response, next: NextFunction) {
    const startTime = performance.now();

    try {
      const userId = req.userId;
      const taskData: CreateTaskRequest = req.body;

      if (!userId) {
        throw new ApiError(401, "User not authenticated");
      }

      const validatedData =
        await validationService.validateTaskCreation(taskData);

      const task = await taskService.createTask(validatedData, userId);

      const duration = (performance.now() - startTime) / 1000;

      res.status(201).json({
        success: true,
        message: "Task created successfully",
        data: task,
        meta: {
          duration: `${duration.toFixed(2)}s`,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  public async getTask(req: Request, res: Response, next: NextFunction) {
    const startTime = performance.now();

    try {
      const { id } = req.params;
      const userId = req.userId;

      if (!userId) {
        throw new ApiError(401, "User not authenticated");
      }

      if (!id) {
        throw new ApiError(400, "Task ID is required");
      }

      const task = await taskService.getTaskById(id, userId);

      const duration = (performance.now() - startTime) / 1000;

      res.status(200).json({
        success: true,
        data: task,
        meta: {
          duration: `${duration.toFixed(2)}s`,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  public async getTasks(req: Request, res: Response, next: NextFunction) {
    const startTime = performance.now();

    try {
      const userId = req.userId;

      if (!userId) {
        throw new ApiError(401, "User not authenticated");
      }

      const {
        status,
        priority,
        assignee,
        creator,
        team,
        project,
        labels,
        tags,
        search,
        dueDateFrom,
        dueDateTo,
        createdFrom,
        createdTo,
        completed,
        overdue,
        parentTask,
        isRecurring,
        hasSubtasks,
        hasAttachments,
        hasComments,
        page = 1,
        limit = 20,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.query;

      const filters = {
        status: status ? (status as string).split(",") : undefined,
        priority: priority ? (priority as string).split(",") : undefined,
        assignee: (assignee as string) || undefined,
        creator: (creator as string) || undefined,
        team: (team as string) || undefined,
        project: (project as string) || undefined,
        labels: labels ? (labels as string).split(",") : undefined,
        tags: tags ? (tags as string).split(",") : undefined,
        search: (search as string) || undefined,
        dueDateFrom: dueDateFrom ? new Date(dueDateFrom as string) : undefined,
        dueDateTo: dueDateTo ? new Date(dueDateTo as string) : undefined,
        createdFrom: createdFrom ? new Date(createdFrom as string) : undefined,
        createdTo: createdTo ? new Date(createdTo as string) : undefined,
        completed:
          completed === "true"
            ? true
            : completed === "false"
              ? false
              : undefined,
        overdue: overdue === "true" ? true : undefined,
        parentTask: (parentTask as string) || undefined,
        isRecurring:
          isRecurring === "true"
            ? true
            : isRecurring === "false"
              ? false
              : undefined,
        hasSubtasks:
          hasSubtasks === "true"
            ? true
            : hasSubtasks === "false"
              ? false
              : undefined,
        hasAttachments:
          hasAttachments === "true"
            ? true
            : hasAttachments === "false"
              ? false
              : undefined,
        hasComments:
          hasComments === "true"
            ? true
            : hasComments === "false"
              ? false
              : undefined,
      };

      const options = {
        page: parseInt(page as string, 10),
        limit: Math.min(100, parseInt(limit as string, 10)),
        sortBy: sortBy as string,
        sortOrder: sortOrder as "asc" | "desc",
      };

      const result = await taskService.getTasks(userId, filters, options);

      const duration = (performance.now() - startTime) / 1000;

      res.status(200).json({
        success: true,
        data: result.tasks,
        pagination: {
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
          limit: options.limit,
        },
        meta: {
          duration: `${duration.toFixed(2)}s`,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  public async updateTask(req: Request, res: Response, next: NextFunction) {
    const startTime = performance.now();

    try {
      const { id } = req.params;
      const userId = req.userId;
      const updateData: UpdateTaskRequest = req.body;

      if (!userId) {
        throw new ApiError(401, "User not authenticated");
      }

      if (!id) {
        throw new ApiError(400, "Task ID is required");
      }

      const validatedData =
        await validationService.validateTaskUpdate(updateData);

      const task = await taskService.updateTask(id, validatedData, userId);

      const duration = (performance.now() - startTime) / 1000;

      res.status(200).json({
        success: true,
        message: "Task updated successfully",
        data: task,
        meta: {
          duration: `${duration.toFixed(2)}s`,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  public async deleteTask(req: Request, res: Response, next: NextFunction) {
    const startTime = performance.now();

    try {
      const { id } = req.params;
      const userId = req.userId;
      const { permanent = false } = req.query;

      if (!userId) {
        throw new ApiError(401, "User not authenticated");
      }

      if (!id) {
        throw new ApiError(400, "Task ID is required");
      }

      await taskService.deleteTask(id, userId, permanent === "true");

      const duration = (performance.now() - startTime) / 1000;

      res.status(200).json({
        success: true,
        message:
          permanent === "true"
            ? "Task permanently deleted"
            : "Task moved to trash",
        meta: {
          duration: `${duration.toFixed(2)}s`,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  public async restoreTask(req: Request, res: Response, next: NextFunction) {
    const startTime = performance.now();

    try {
      const { id } = req.params;
      const userId = req.userId;

      if (!userId) {
        throw new ApiError(401, "User not authenticated");
      }

      if (!id) {
        throw new ApiError(400, "Task ID is required");
      }

      const task = await taskService.restoreTask(id, userId);

      const duration = (performance.now() - startTime) / 1000;

      res.status(200).json({
        success: true,
        message: "Task restored successfully",
        data: task,
        meta: {
          duration: `${duration.toFixed(2)}s`,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  public async archiveTask(req: Request, res: Response, next: NextFunction) {
    const startTime = performance.now();

    try {
      const { id } = req.params;
      const userId = req.userId;

      if (!userId) {
        throw new ApiError(401, "User not authenticated");
      }

      if (!id) {
        throw new ApiError(400, "Task ID is required");
      }

      const task = await taskService.archiveTask(id, userId);

      const duration = (performance.now() - startTime) / 1000;

      res.status(200).json({
        success: true,
        message: "Task archived successfully",
        data: task,
        meta: {
          duration: `${duration.toFixed(2)}s`,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  public async assignTask(req: Request, res: Response, next: NextFunction) {
    const startTime = performance.now();

    try {
      const { id } = req.params;
      const { assigneeId } = req.body;
      const userId = req.userId;

      if (!userId) {
        throw new ApiError(401, "User not authenticated");
      }

      if (!id) {
        throw new ApiError(400, "Task ID is required");
      }

      if (!assigneeId) {
        throw new ApiError(400, "Assignee ID is required");
      }

      const task = await taskService.assignTask(id, assigneeId, userId);

      const duration = (performance.now() - startTime) / 1000;

      res.status(200).json({
        success: true,
        message: "Task assigned successfully",
        data: task,
        meta: {
          duration: `${duration.toFixed(2)}s`,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  public async addSubtask(req: Request, res: Response, next: NextFunction) {
    const startTime = performance.now();

    try {
      const { id } = req.params;
      const { subtaskId } = req.body;
      const userId = req.userId;

      if (!userId) {
        throw new ApiError(401, "User not authenticated");
      }

      if (!id || !subtaskId) {
        throw new ApiError(400, "Task ID and subtask ID are required");
      }

      const task = await taskService.addSubtask(id, subtaskId, userId);

      const duration = (performance.now() - startTime) / 1000;

      res.status(200).json({
        success: true,
        message: "Subtask added successfully",
        data: task,
        meta: {
          duration: `${duration.toFixed(2)}s`,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  public async removeSubtask(req: Request, res: Response, next: NextFunction) {
    const startTime = performance.now();

    try {
      const { id } = req.params;
      const { subtaskId } = req.body;
      const userId = req.userId;

      if (!userId) {
        throw new ApiError(401, "User not authenticated");
      }

      if (!id || !subtaskId) {
        throw new ApiError(400, "Task ID and subtask ID are required");
      }

      const task = await taskService.removeSubtask(id, subtaskId, userId);

      const duration = (performance.now() - startTime) / 1000;

      res.status(200).json({
        success: true,
        message: "Subtask removed successfully",
        data: task,
        meta: {
          duration: `${duration.toFixed(2)}s`,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  public async addWatcher(req: Request, res: Response, next: NextFunction) {
    const startTime = performance.now();

    try {
      const { id } = req.params;
      const userId = req.userId;

      if (!userId) {
        throw new ApiError(401, "User not authenticated");
      }

      if (!id) {
        throw new ApiError(400, "Task ID is required");
      }

      const task = await taskService.addWatcher(id, userId);

      const duration = (performance.now() - startTime) / 1000;

      res.status(200).json({
        success: true,
        message: "Added as watcher",
        data: task,
        meta: {
          duration: `${duration.toFixed(2)}s`,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  public async removeWatcher(req: Request, res: Response, next: NextFunction) {
    const startTime = performance.now();

    try {
      const { id } = req.params;
      const userId = req.userId;

      if (!userId) {
        throw new ApiError(401, "User not authenticated");
      }

      if (!id) {
        throw new ApiError(400, "Task ID is required");
      }

      const task = await taskService.removeWatcher(id, userId);

      const duration = (performance.now() - startTime) / 1000;

      res.status(200).json({
        success: true,
        message: "Removed from watchers",
        data: task,
        meta: {
          duration: `${duration.toFixed(2)}s`,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  public async toggleChecklistItem(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    const startTime = performance.now();

    try {
      const { id } = req.params;
      const { index } = req.body;
      const userId = req.userId;

      if (!userId) {
        throw new ApiError(401, "User not authenticated");
      }

      if (!id || index === undefined) {
        throw new ApiError(400, "Task ID and checklist index are required");
      }

      const task = await taskService.toggleChecklistItem(id, index, userId);

      const duration = (performance.now() - startTime) / 1000;

      res.status(200).json({
        success: true,
        message: "Checklist item toggled",
        data: task,
        meta: {
          duration: `${duration.toFixed(2)}s`,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  public async startTimeTracking(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    const startTime = performance.now();

    try {
      const { id } = req.params;
      const userId = req.userId;

      if (!userId) {
        throw new ApiError(401, "User not authenticated");
      }

      if (!id) {
        throw new ApiError(400, "Task ID is required");
      }

      const task = await taskService.startTimeTracking(id, userId);

      const duration = (performance.now() - startTime) / 1000;

      res.status(200).json({
        success: true,
        message: "Time tracking started",
        data: task,
        meta: {
          duration: `${duration.toFixed(2)}s`,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  public async pauseTimeTracking(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    const startTime = performance.now();

    try {
      const { id } = req.params;
      const userId = req.userId;

      if (!userId) {
        throw new ApiError(401, "User not authenticated");
      }

      if (!id) {
        throw new ApiError(400, "Task ID is required");
      }

      const task = await taskService.pauseTimeTracking(id, userId);

      const duration = (performance.now() - startTime) / 1000;

      res.status(200).json({
        success: true,
        message: "Time tracking paused",
        data: task,
        meta: {
          duration: `${duration.toFixed(2)}s`,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  public async stopTimeTracking(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    const startTime = performance.now();

    try {
      const { id } = req.params;
      const userId = req.userId;

      if (!userId) {
        throw new ApiError(401, "User not authenticated");
      }

      if (!id) {
        throw new ApiError(400, "Task ID is required");
      }

      const task = await taskService.stopTimeTracking(id, userId);

      const duration = (performance.now() - startTime) / 1000;

      res.status(200).json({
        success: true,
        message: "Time tracking stopped",
        data: task,
        meta: {
          duration: `${duration.toFixed(2)}s`,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  public async getTaskStats(req: Request, res: Response, next: NextFunction) {
    const startTime = performance.now();

    try {
      const userId = req.userId;

      if (!userId) {
        throw new ApiError(401, "User not authenticated");
      }

      const stats = await taskService.getTaskStats(userId);

      const duration = (performance.now() - startTime) / 1000;

      res.status(200).json({
        success: true,
        data: stats,
        meta: {
          duration: `${duration.toFixed(2)}s`,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  public async getOverdueTasks(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    const startTime = performance.now();

    try {
      const userId = req.userId;
      const { limit = 20 } = req.query;

      if (!userId) {
        throw new ApiError(401, "User not authenticated");
      }

      const tasks = await taskService.getOverdueTasks(
        userId,
        parseInt(limit as string, 10),
      );

      const duration = (performance.now() - startTime) / 1000;

      res.status(200).json({
        success: true,
        data: tasks,
        meta: {
          duration: `${duration.toFixed(2)}s`,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  public async getTaskDistribution(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    const startTime = performance.now();

    try {
      const userId = req.userId;

      if (!userId) {
        throw new ApiError(401, "User not authenticated");
      }

      const distribution = await taskService.getTaskDistribution(userId);

      const duration = (performance.now() - startTime) / 1000;

      res.status(200).json({
        success: true,
        data: distribution,
        meta: {
          duration: `${duration.toFixed(2)}s`,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  public async getAverageCompletionTime(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    const startTime = performance.now();

    try {
      const userId = req.userId;

      if (!userId) {
        throw new ApiError(401, "User not authenticated");
      }

      const result = await taskService.getAverageCompletionTime(userId);

      const duration = (performance.now() - startTime) / 1000;

      res.status(200).json({
        success: true,
        data: result,
        meta: {
          duration: `${duration.toFixed(2)}s`,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  public async bulkUpdateTasks(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    const startTime = performance.now();

    try {
      const userId = req.userId;
      const { taskIds, updates } = req.body;

      if (!userId) {
        throw new ApiError(401, "User not authenticated");
      }

      if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
        throw new ApiError(400, "Task IDs array is required");
      }

      if (!updates || typeof updates !== "object") {
        throw new ApiError(400, "Updates object is required");
      }

      await taskService.bulkUpdateTasks({ taskIds, updates }, userId);

      const duration = (performance.now() - startTime) / 1000;

      res.status(200).json({
        success: true,
        message: "Bulk update completed successfully",
        data: {
          updatedCount: taskIds.length,
        },
        meta: {
          duration: `${duration.toFixed(2)}s`,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      next(error);
    }
  }
}

export const taskController = TaskController.getInstance();
export default taskController;
