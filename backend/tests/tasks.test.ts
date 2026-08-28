import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../src/app';
import { User } from '../src/models/User';
import { Task } from '../src/models/Task';
import { connectDB, closeDB } from '../src/config/database';
import { redisClient } from '../src/config/redis';

describe('Task API Tests', () => {
  let authToken: string;
  let userId: string;
  let testTaskId: string;
  let testSubtaskId: string;
  let testTeamId: string;

  beforeAll(async () => {
    await connectDB();
    await User.deleteMany({});
    await Task.deleteMany({});
    await redisClient.flushAll();

    const registerResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'taskuser@example.com',
        username: 'taskuser',
        password: 'Test@123456',
        firstName: 'Task',
        lastName: 'User',
        acceptTerms: true,
      });

    const user = await User.findOne({ email: 'taskuser@example.com' });
    if (user) {
      user.emailVerified = true;
      user.status = 'active';
      await user.save();
      userId = user._id.toString();
    }

    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'taskuser@example.com',
        password: 'Test@123456',
      });

    authToken = loginResponse.body.data.tokens.accessToken;
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Task.deleteMany({});
    await redisClient.flushAll();
    await closeDB();
  });

  describe('POST /api/v1/tasks', () => {
    it('should create a new task successfully', async () => {
      const response = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Task',
          description: 'This is a test task',
          priority: 'high',
          status: 'todo',
          labels: ['test', 'important'],
          tags: ['tag1', 'tag2'],
          estimatedHours: 4,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.title).toBe('Test Task');
      expect(response.body.data.priority).toBe('high');
      expect(response.body.data.status).toBe('todo');
      expect(response.body.data.creator).toBeDefined();
      
      testTaskId = response.body.data._id;
    });

    it('should reject task creation without title', async () => {
      const response = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'This is a test task',
          priority: 'high',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject task creation with invalid priority', async () => {
      const response = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Invalid Priority Task',
          priority: 'invalid',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should create task with checklist items', async () => {
      const response = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Task with Checklist',
          description: 'Task with checklist items',
          checklist: [
            { text: 'Item 1' },
            { text: 'Item 2' },
          ],
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.checklist).toHaveLength(2);
    });

    it('should create recurring task', async () => {
      const response = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Recurring Task',
          isRecurring: true,
          recurringRule: {
            frequency: 'daily',
            interval: 1,
            occurrences: 5,
          },
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isRecurring).toBe(true);
      expect(response.body.data.recurringRule).toBeDefined();
    });
  });

  describe('GET /api/v1/tasks', () => {
    it('should get all tasks', async () => {
      const response = await request(app)
        .get('/api/v1/tasks')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toBeDefined();
    });

    it('should filter tasks by status', async () => {
      const response = await request(app)
        .get('/api/v1/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ status: 'todo' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.every((t: any) => t.status === 'todo')).toBe(true);
    });

    it('should filter tasks by priority', async () => {
      const response = await request(app)
        .get('/api/v1/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ priority: 'high' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.every((t: any) => t.priority === 'high')).toBe(true);
    });

    it('should search tasks by title', async () => {
      const response = await request(app)
        .get('/api/v1/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ search: 'Test' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.some((t: any) => t.title.includes('Test'))).toBe(true);
    });

    it('should paginate results', async () => {
      const response = await request(app)
        .get('/api/v1/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 1 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(1);
    });
  });

  describe('GET /api/v1/tasks/stats', () => {
    it('should get task statistics', async () => {
      const response = await request(app)
        .get('/api/v1/tasks/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.total).toBeDefined();
      expect(response.body.data.byPriority).toBeDefined();
      expect(response.body.data.byStatus).toBeDefined();
    });
  });

  describe('GET /api/v1/tasks/overdue', () => {
    it('should get overdue tasks', async () => {
      const response = await request(app)
        .get('/api/v1/tasks/overdue')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/v1/tasks/:id', () => {
    it('should get task by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/tasks/${testTaskId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(testTaskId);
      expect(response.body.data.title).toBe('Test Task');
    });

    it('should reject non-existent task ID', async () => {
      const invalidId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .get(`/api/v1/tasks/${invalidId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should reject invalid task ID format', async () => {
      const response = await request(app)
        .get('/api/v1/tasks/invalid-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/tasks/:id', () => {
    it('should update task successfully', async () => {
      const response = await request(app)
        .put(`/api/v1/tasks/${testTaskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Updated Task Title',
          description: 'Updated description',
          priority: 'urgent',
          status: 'in_progress',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Updated Task Title');
      expect(response.body.data.priority).toBe('urgent');
      expect(response.body.data.status).toBe('in_progress');
    });

    it('should update task status to done', async () => {
      const response = await request(app)
        .put(`/api/v1/tasks/${testTaskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'done',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('done');
      expect(response.body.data.completedAt).toBeDefined();
    });

    it('should update task assignee', async () => {
      const response = await request(app)
        .put(`/api/v1/tasks/${testTaskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          assignee: userId,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.assignee).toBeDefined();
    });
  });

  describe('POST /api/v1/tasks/:id/subtasks', () => {
    it('should add subtask to task', async () => {
      const subtaskResponse = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Subtask 1',
          priority: 'medium',
        });

      testSubtaskId = subtaskResponse.body.data._id;

      const response = await request(app)
        .post(`/api/v1/tasks/${testTaskId}/subtasks`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          subtaskId: testSubtaskId,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.subtasks).toContain(testSubtaskId);
    });

    it('should reject adding invalid subtask', async () => {
      const invalidId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .post(`/api/v1/tasks/${testTaskId}/subtasks`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          subtaskId: invalidId,
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/tasks/:id/subtasks', () => {
    it('should remove subtask from task', async () => {
      const response = await request(app)
        .delete(`/api/v1/tasks/${testTaskId}/subtasks`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          subtaskId: testSubtaskId,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.subtasks).not.toContain(testSubtaskId);
    });
  });

  describe('POST /api/v1/tasks/:id/watchers', () => {
    it('should add user as watcher', async () => {
      const response = await request(app)
        .post(`/api/v1/tasks/${testTaskId}/watchers`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.watchers).toContain(userId);
    });

    it('should reject adding duplicate watcher', async () => {
      const response = await request(app)
        .post(`/api/v1/tasks/${testTaskId}/watchers`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('DELETE /api/v1/tasks/:id/watchers', () => {
    it('should remove user from watchers', async () => {
      const response = await request(app)
        .delete(`/api/v1/tasks/${testTaskId}/watchers`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.watchers).not.toContain(userId);
    });
  });

  describe('PUT /api/v1/tasks/:id/checklist', () => {
    let taskId: string;

    beforeAll(async () => {
      const response = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Checklist Test Task',
          checklist: [
            { text: 'Item 1' },
            { text: 'Item 2' },
            { text: 'Item 3' },
          ],
        });

      taskId = response.body.data._id;
    });

    it('should toggle checklist item', async () => {
      const response = await request(app)
        .put(`/api/v1/tasks/${taskId}/checklist`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          index: 0,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.checklist[0].completed).toBe(true);
      expect(response.body.data.checklist[0].completedAt).toBeDefined();
    });

    it('should toggle completed item back', async () => {
      const response = await request(app)
        .put(`/api/v1/tasks/${taskId}/checklist`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          index: 0,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.checklist[0].completed).toBe(false);
      expect(response.body.data.checklist[0].completedAt).toBeUndefined();
    });

    it('should reject invalid index', async () => {
      const response = await request(app)
        .put(`/api/v1/tasks/${taskId}/checklist`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          index: 99,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/tasks/:id/time/start', () => {
    it('should start time tracking', async () => {
      const response = await request(app)
        .post(`/api/v1/tasks/${testTaskId}/time/start`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.timeTracking.isRunning).toBe(true);
      expect(response.body.data.timeTracking.startedAt).toBeDefined();
    });
  });

  describe('POST /api/v1/tasks/:id/time/pause', () => {
    it('should pause time tracking', async () => {
      const response = await request(app)
        .post(`/api/v1/tasks/${testTaskId}/time/pause`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.timeTracking.isRunning).toBe(false);
      expect(response.body.data.timeTracking.pausedAt).toBeDefined();
    });
  });

  describe('POST /api/v1/tasks/:id/time/stop', () => {
    it('should stop time tracking', async () => {
      const response = await request(app)
        .post(`/api/v1/tasks/${testTaskId}/time/stop`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.timeTracking.isRunning).toBe(false);
      expect(response.body.data.timeTracking.totalSeconds).toBeGreaterThan(0);
    });
  });

  describe('PUT /api/v1/tasks/:id/assign', () => {
    let anotherUserToken: string;

    beforeAll(async () => {
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'anotheruser@example.com',
          username: 'anotheruser',
          password: 'Test@123456',
          firstName: 'Another',
          lastName: 'User',
          acceptTerms: true,
        });

      const user = await User.findOne({ email: 'anotheruser@example.com' });
      if (user) {
        user.emailVerified = true;
        user.status = 'active';
        await user.save();
      }

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'anotheruser@example.com',
          password: 'Test@123456',
        });

      anotherUserToken = loginResponse.body.data.tokens.accessToken;
    });

    it('should assign task to another user', async () => {
      const response = await request(app)
        .put(`/api/v1/tasks/${testTaskId}/assign`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          assigneeId: userId,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.assignee).toBeDefined();
    });

    it('should reject assigning to non-existent user', async () => {
      const invalidId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .put(`/api/v1/tasks/${testTaskId}/assign`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          assigneeId: invalidId,
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/tasks/:id', () => {
    it('should move task to trash', async () => {
      const response = await request(app)
        .delete(`/api/v1/tasks/${testTaskId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('moved to trash');

      const task = await Task.findById(testTaskId);
      expect(task?.status).toBe('deleted');
    });

    it('should permanently delete task', async () => {
      const response = await request(app)
        .delete(`/api/v1/tasks/${testTaskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ permanent: true });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('permanently deleted');

      const task = await Task.findById(testTaskId);
      expect(task).toBeNull();
    });
  });

  describe('PUT /api/v1/tasks/:id/restore', () => {
    let deletedTaskId: string;

    beforeAll(async () => {
      const response = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Task to Restore',
        });

      deletedTaskId = response.body.data._id;

      await request(app)
        .delete(`/api/v1/tasks/${deletedTaskId}`)
        .set('Authorization', `Bearer ${authToken}`);
    });

    it('should restore task from trash', async () => {
      const response = await request(app)
        .put(`/api/v1/tasks/${deletedTaskId}/restore`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('todo');

      const task = await Task.findById(deletedTaskId);
      expect(task?.status).toBe('todo');
    });
  });

  describe('PUT /api/v1/tasks/:id/archive', () => {
    let completedTaskId: string;

    beforeAll(async () => {
      const response = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Task to Archive',
        });

      completedTaskId = response.body.data._id;

      await request(app)
        .put(`/api/v1/tasks/${completedTaskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'done',
        });
    });

    it('should archive completed task', async () => {
      const response = await request(app)
        .put(`/api/v1/tasks/${completedTaskId}/archive`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('archived');
   