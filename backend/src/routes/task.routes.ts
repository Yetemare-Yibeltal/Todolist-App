import { Router } from "express";
import { taskController } from "../controllers/task.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { validate } from "../middleware/validation.middleware";
import { rateLimiter } from "../middleware/rateLimiter.middleware";
import {
  createTaskSchema,
  updateTaskSchema,
  assignTaskSchema,
  subtaskSchema,
  checklistItemSchema,
  bulkUpdateSchema,
} from "../schemas/task.schema";

const router = Router();

/**
 * @swagger
 * /api/v1/tasks:
 *   post:
 *     summary: Create a new task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [todo, in_progress, in_review, done, archived]
 *                 default: todo
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, urgent, critical]
 *                 default: medium
 *               assignee:
 *                 type: string
 *               team:
 *                 type: string
 *               project:
 *                 type: string
 *               parentTask:
 *                 type: string
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               estimatedHours:
 *                 type: number
 *                 minimum: 0
 *               labels:
 *                 type: array
 *                 items:
 *                   type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               isRecurring:
 *                 type: boolean
 *               recurringRule:
 *                 type: object
 *               checklist:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     text:
 *                       type: string
 *                     completed:
 *                       type: boolean
 *     responses:
 *       201:
 *         description: Task created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Insufficient permissions
 */
router.post(
  "/",
  authMiddleware.requireAuth(),
  rateLimiter.apiLimiter,
  validate(createTaskSchema),
  taskController.createTask,
);

/**
 * @swagger
 * /api/v1/tasks:
 *   get:
 *     summary: Get tasks with filters
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Comma-separated status values
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *         description: Comma-separated priority values
 *       - in: query
 *         name: assignee
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt, title, priority, dueDate, status, completionPercentage]
 *           default: createdAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Tasks retrieved successfully
 *       401:
 *         description: Not authenticated
 */
router.get("/", authMiddleware.requireAuth(), taskController.getTasks);

/**
 * @swagger
 * /api/v1/tasks/stats:
 *   get:
 *     summary: Get task statistics
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *       401:
 *         description: Not authenticated
 */
router.get("/stats", authMiddleware.requireAuth(), taskController.getTaskStats);

/**
 * @swagger
 * /api/v1/tasks/overdue:
 *   get:
 *     summary: Get overdue tasks
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Overdue tasks retrieved successfully
 *       401:
 *         description: Not authenticated
 */
router.get(
  "/overdue",
  authMiddleware.requireAuth(),
  taskController.getOverdueTasks,
);

/**
 * @swagger
 * /api/v1/tasks/distribution:
 *   get:
 *     summary: Get task distribution by status
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Distribution retrieved successfully
 *       401:
 *         description: Not authenticated
 */
router.get(
  "/distribution",
  authMiddleware.requireAuth(),
  taskController.getTaskDistribution,
);

/**
 * @swagger
 * /api/v1/tasks/average-completion:
 *   get:
 *     summary: Get average completion time by priority
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Average completion time retrieved successfully
 *       401:
 *         description: Not authenticated
 */
router.get(
  "/average-completion",
  authMiddleware.requireAuth(),
  taskController.getAverageCompletionTime,
);

/**
 * @swagger
 * /api/v1/tasks/bulk:
 *   put:
 *     summary: Bulk update tasks
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - taskIds
 *               - updates
 *             properties:
 *               taskIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               updates:
 *                 type: object
 *                 properties:
 *                   status:
 *                     type: string
 *                     enum: [todo, in_progress, in_review, done, archived]
 *                   priority:
 *                     type: string
 *                     enum: [low, medium, high, urgent, critical]
 *                   assignee:
 *                     type: string
 *                   labels:
 *                     type: array
 *                     items:
 *                       type: string
 *     responses:
 *       200:
 *         description: Bulk update completed successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Insufficient permissions
 */
router.put(
  "/bulk",
  authMiddleware.requireAuth(),
  validate(bulkUpdateSchema),
  taskController.bulkUpdateTasks,
);

/**
 * @swagger
 * /api/v1/tasks/{id}:
 *   get:
 *     summary: Get task by ID
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Task retrieved successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Task not found
 */
router.get("/:id", authMiddleware.requireAuth(), taskController.getTask);

/**
 * @swagger
 * /api/v1/tasks/{id}:
 *   put:
 *     summary: Update task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [todo, in_progress, in_review, done, archived]
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, urgent, critical]
 *               assignee:
 *                 type: string
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *               estimatedHours:
 *                 type: number
 *               labels:
 *                 type: array
 *                 items:
 *                   type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               order:
 *                 type: number
 *     responses:
 *       200:
 *         description: Task updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Task not found
 */
router.put(
  "/:id",
  authMiddleware.requireAuth(),
  validate(updateTaskSchema),
  taskController.updateTask,
);

/**
 * @swagger
 * /api/v1/tasks/{id}:
 *   delete:
 *     summary: Delete task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: permanent
 *         schema:
 *           type: boolean
 *           default: false
 *     responses:
 *       200:
 *         description: Task deleted successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Task not found
 */
router.delete("/:id", authMiddleware.requireAuth(), taskController.deleteTask);

/**
 * @swagger
 * /api/v1/tasks/{id}/restore:
 *   put:
 *     summary: Restore task from trash
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Task restored successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Task not found
 */
router.put(
  "/:id/restore",
  authMiddleware.requireAuth(),
  taskController.restoreTask,
);

/**
 * @swagger
 * /api/v1/tasks/{id}/archive:
 *   put:
 *     summary: Archive task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Task archived successfully
 *       400:
 *         description: Task is not completed
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Task not found
 */
router.put(
  "/:id/archive",
  authMiddleware.requireAuth(),
  taskController.archiveTask,
);

/**
 * @swagger
 * /api/v1/tasks/{id}/assign:
 *   put:
 *     summary: Assign task to user
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - assigneeId
 *             properties:
 *               assigneeId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Task assigned successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Task or user not found
 */
router.put(
  "/:id/assign",
  authMiddleware.requireAuth(),
  validate(assignTaskSchema),
  taskController.assignTask,
);

/**
 * @swagger
 * /api/v1/tasks/{id}/subtasks:
 *   post:
 *     summary: Add subtask to task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subtaskId
 *             properties:
 *               subtaskId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Subtask added successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Task not found
 */
router.post(
  "/:id/subtasks",
  authMiddleware.requireAuth(),
  validate(subtaskSchema),
  taskController.addSubtask,
);

/**
 * @swagger
 * /api/v1/tasks/{id}/subtasks:
 *   delete:
 *     summary: Remove subtask from task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subtaskId
 *             properties:
 *               subtaskId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Subtask removed successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Task not found
 */
router.delete(
  "/:id/subtasks",
  authMiddleware.requireAuth(),
  validate(subtaskSchema),
  taskController.removeSubtask,
);

/**
 * @swagger
 * /api/v1/tasks/{id}/watchers:
 *   post:
 *     summary: Add watcher to task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Watcher added successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Task not found
 */
router.post(
  "/:id/watchers",
  authMiddleware.requireAuth(),
  taskController.addWatcher,
);

/**
 * @swagger
 * /api/v1/tasks/{id}/watchers:
 *   delete:
 *     summary: Remove watcher from task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Watcher removed successfully
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Task not found
 */
router.delete(
  "/:id/watchers",
  authMiddleware.requireAuth(),
  taskController.removeWatcher,
);

/**
 * @swagger
 * /api/v1/tasks/{id}/checklist:
 *   put:
 *     summary: Toggle checklist item
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - index
 *             properties:
 *               index:
 *                 type: integer
 *                 minimum: 0
 *     responses:
 *       200:
 *         description: Checklist item toggled successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Task not found
 */
router.put(
  "/:id/checklist",
  authMiddleware.requireAuth(),
  validate(checklistItemSchema),
  taskController.toggleChecklistItem,
);

/**
 * @swagger
 * /api/v1/tasks/{id}/time/start:
 *   post:
 *     summary: Start time tracking
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Time tracking started
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Task not found
 */
router.post(
  "/:id/time/start",
  authMiddleware.requireAuth(),
  taskController.startTimeTracking,
);

/**
 * @swagger
 * /api/v1/tasks/{id}/time/pause:
 *   post:
 *     summary: Pause time tracking
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Time tracking paused
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Task not found
 */
router.post(
  "/:id/time/pause",
  authMiddleware.requireAuth(),
  taskController.pauseTimeTracking,
);

/**
 * @swagger
 * /api/v1/tasks/{id}/time/stop:
 *   post:
 *     summary: Stop time tracking
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Time tracking stopped
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Task not found
 */
router.post(
  "/:id/time/stop",
  authMiddleware.requireAuth(),
  taskController.stopTimeTracking,
);

export default router;
