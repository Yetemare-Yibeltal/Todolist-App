import { User, Team, Project, Attachment, Comment } from './auth';

export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done' | 'archived' | 'deleted';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent' | 'critical';
export type TaskView = 'list' | 'board' | 'calendar' | 'timeline';
export type TaskSortField = 'createdAt' | 'updatedAt' | 'title' | 'priority' | 'dueDate' | 'status' | 'completionPercentage';
export type TaskFilterOperator = 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'between';
export type TaskAggregation = 'count' | 'sum' | 'avg' | 'min' | 'max';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee?: User;
  creator: User;
  team?: Team;
  project?: Project;
  parentTask?: Task;
  subtasks: Task[];
  dueDate?: Date;
  startDate?: Date;
  completedAt?: Date;
  estimatedHours?: number;
  actualHours?: number;
  labels: string[];
  attachments: Attachment[];
  comments: Comment[];
  watchers: User[];
  tags: string[];
  order: number;
  isRecurring: boolean;
  recurringRule?: RecurringRule;
  reminders: Reminder[];
  checklist: ChecklistItem[];
  timeTracking: TimeTracking;
  dependencies: Task[];
  blockedBy: Task[];
  blocks: Task[];
  viewCount: number;
  completionPercentage: number;
  lastActivityAt: Date;
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    updatedBy: string;
    ipAddress?: string;
    userAgent?: string;
    source?: 'web' | 'mobile' | 'api' | 'email' | 'slack';
    priorityScore?: number;
    urgencyScore?: number;
    complexityScore?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface RecurringRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  interval: number;
  daysOfWeek?: number[];
  daysOfMonth?: number[];
  monthOfYear?: number;
  customRule?: string;
  endDate?: Date;
  occurrences?: number;
  currentOccurrence: number;
  originalTaskId?: string;
}

export interface Reminder {
  id: string;
  time: Date;
  type: 'email' | 'push' | 'sms';
  sent: boolean;
  sentAt?: Date;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  completedAt?: Date;
  completedBy?: User;
}

export interface TimeTracking {
  startedAt?: Date;
  pausedAt?: Date;
  totalSeconds: number;
  sessions: TimeSession[];
  lastStart?: Date;
  isRunning: boolean;
}

export interface TimeSession {
  start: Date;
  end?: Date;
  duration: number;
}

export interface TaskFilter {
  field: string;
  operator: TaskFilterOperator;
  value: any;
}

export interface TaskFilters {
  status?: TaskStatus[];
  priority?: TaskPriority[];
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
  filters?: TaskFilter[];
}

export interface TaskSortOptions {
  field: TaskSortField;
  direction: 'asc' | 'desc';
}

export interface PaginationOptions {
  page: number;
  limit: number;
  total?: number;
  totalPages?: number;
}

export interface TaskStats {
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
  productivity: {
    tasksPerDay: number;
    completionRate: number;
    averageTimeToComplete: number;
    totalTasksCreated: number;
    totalTasksCompleted: number;
  };
  trends: {
    daily: Array<{ date: Date; tasksCreated: number; tasksCompleted: number }>;
    weekly: Array<{ week: number; tasksCreated: number; tasksCompleted: number }>;
    monthly: Array<{ month: number; tasksCreated: number; tasksCompleted: number }>;
  };
}

export interface TaskDistribution {
  byStatus: Array<{ status: TaskStatus; count: number; percentage: number }>;
  byPriority: Array<{ priority: TaskPriority; count: number; percentage: number }>;
  byAssignee: Array<{ userId: string; userName: string; count: number; percentage: number }>;
  byTeam: Array<{ teamId: string; teamName: string; count: number; percentage: number }>;
  byLabel: Array<{ label: string; count: number; percentage: number }>;
}

export interface TaskAnalytics {
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    overdueTasks: number;
    completionRate: number;
    averageCompletionTime: number;
    totalTimeSpent: number;
    productivityScore: number;
  };
  trends: {
    created: Array<{ date: Date; count: number }>;
    completed: Array<{ date: Date; count: number }>;
    overdue: Array<{ date: Date; count: number }>;
  };
  topPerformers: Array<{
    userId: string;
    userName: string;
    tasksCompleted: number;
    averageTime: number;
    completionRate: number;
  }>;
  insights: Array<{
    type: 'trend' | 'anomaly' | 'recommendation';
    title: string;
    description: string;
    data?: any;
    action?: string;
  }>;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
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
  recurringRule?: Omit<RecurringRule, 'currentOccurrence' | 'originalTaskId'>;
  checklist?: Omit<ChecklistItem, 'id' | 'completedAt' | 'completedBy'>[];
  attachments?: Omit<Attachment, 'id' | 'uploadedBy' | 'uploadedAt'>[];
  order?: number;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee?: string;
  team?: string;
  project?: string;
  parentTask?: string;
  dueDate?: string;
  startDate?: string;
  completedAt?: string;
  estimatedHours?: number;
  actualHours?: number;
  labels?: string[];
  tags?: string[];
  isRecurring?: boolean;
  recurringRule?: Partial<RecurringRule>;
  checklist?: ChecklistItem[];
  order?: number;
}

export interface BulkUpdateRequest {
  taskIds: string[];
  updates: Partial<UpdateTaskRequest>;
}

export interface TaskSearchRequest {
  query: string;
  filters?: TaskFilters;
  sort?: TaskSortOptions;
  pagination?: PaginationOptions;
}

export interface TaskSearchResponse {
  tasks: Task[];
  total: number;
  page: number;
  totalPages: number;
  highlightedFields?: string[];
}

export interface TaskExportRequest {
  format: 'json' | 'csv' | 'pdf' | 'xlsx';
  filters?: TaskFilters;
  fields?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface TaskImportRequest {
  format: 'json' | 'csv' | 'xlsx';
  data: any;
  options?: {
    overwrite?: boolean;
    skipDuplicates?: boolean;
    assignee?: string;
    team?: string;
  };
}

export interface TaskShareRequest {
  userIds: string[];
  permissions: 'view' | 'edit' | 'admin';
  expiresAt?: Date;
}

export interface TaskDependencyRequest {
  taskId: string;
  type: 'blocking' | 'blocked';
}

export interface TaskMoveRequest {
  targetId?: string;
  position?: number;
  newStatus?: TaskStatus;
  newPriority?: TaskPriority;
}

export interface TaskTemplate {
  id: string;
  name: string;
  description?: string;
  data: CreateTaskRequest;
  isPublic: boolean;
  teamId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskCommentRequest {
  content: string;
  parentCommentId?: string;
  mentions?: string[];
}

export interface TaskAttachmentRequest {
  file: File | Blob;
  name: string;
  type: string;
  size: number;
}

export interface TaskReminderRequest {
  time: Date;
  type: 'email' | 'push' | 'sms';
}

export interface TaskState {
  tasks: Task[];
  selectedTasks: string[];
  currentTask: Task | null;
  viewMode: TaskView;
  filters: TaskFilters;
  sort: TaskSortOptions;
  pagination: PaginationOptions;
  searchQuery: string;
  isLoading: boolean;
  error: string | null;
  stats: TaskStats | null;
  distribution: TaskDistribution | null;
  analytics: TaskAnalytics | null;
}

export interface TaskAction {
  type: string;
  payload?: any;
}

export type TaskActionType =
  | 'SET_TASKS'
  | 'ADD_TASK'
  | 'UPDATE_TASK'
  | 'DELETE_TASK'
  | 'SELECT_TASK'
  | 'DESELECT_TASK'
  | 'SELECT_ALL_TASKS'
  | 'DESELECT_ALL_TASKS'
  | 'CLEAR_SELECTION'
  | 'SET_CURRENT_TASK'
  | 'CLEAR_CURRENT_TASK'
  | 'SET_VIEW_MODE'
  | 'SET_FILTERS'
  | 'SET_SORT'
  | 'SET_PAGINATION'
  | 'SET_SEARCH_QUERY'
  | 'SET_LOADING'
  | 'SET_ERROR'
  | 'CLEAR_ERROR'
  | 'SET_STATS'
  | 'SET_DISTRIBUTION'
  | 'SET_ANALYTICS'
  | 'UPDATE_TASK_STATUS'
  | 'UPDATE_TASK_PRIORITY'
  | 'ADD_SUBTASK'
  | 'REMOVE_SUBTASK'
  | 'TOGGLE_CHECKLIST'
  | 'START_TIME_TRACKING'
  | 'PAUSE_TIME_TRACKING'
  | 'STOP_TIME_TRACKING'
  | 'ADD_COMMENT'
  | 'REMOVE_COMMENT'
  | 'ADD_ATTACHMENT'
  | 'REMOVE_ATTACHMENT'
  | 'ADD_REMINDER'
  | 'REMOVE_REMINDER'
  | 'ADD_WATCHER'
  | 'REMOVE_WATCHER'
  | 'BULK_UPDATE';

export interface TaskContextType extends TaskState {
  createTask: (task: Partial<Task>) => Promise<Task>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<Task>;
  deleteTask: (id: string, permanent?: boolean) => Promise<void>;
  restoreTask: (id: string) => Promise<Task>;
  archiveTask: (id: string) => Promise<Task>;
  assignTask: (id: string, assigneeId: string) => Promise<Task>;
  addSubtask: (taskId: string, subtaskId: string) => Promise<Task>;
  removeSubtask: (taskId: string, subtaskId: string) => Promise<Task>;
  addComment: (taskId: string, comment: TaskCommentRequest) => Promise<Task>;
  removeComment: (taskId: string, commentId: string) => Promise<Task>;
  addAttachment: (taskId: string, file: File) => Promise<Task>;
  removeAttachment: (taskId: string, attachmentId: string) => Promise<Task>;
  toggleChecklistItem: (taskId: string, index: number) => Promise<Task>;
  startTimeTracking: (taskId: string) => Promise<Task>;
  pauseTimeTracking: (taskId: string) => Promise<Task>;
  stopTimeTracking: (taskId: string) => Promise<Task>;
  addWatcher: (taskId: string) => Promise<Task>;
  removeWatcher: (taskId: string) => Promise<Task>;
  addReminder: (taskId: string, reminder: TaskReminderRequest) => Promise<Task>;
  removeReminder: (taskId: string, reminderId: string) => Promise<Task>;
  bulkUpdate: (taskIds: string[], updates: Partial<Task>) => Promise<void>;
  searchTasks: (query: string) => Promise<Task[]>;
  exportTasks: (request: TaskExportRequest) => Promise<Blob>;
  importTasks: (request: TaskImportRequest) => Promise<Task[]>;
  getStats: () => Promise<TaskStats>;
  getDistribution: () => Promise<TaskDistribution>;
  getAnalytics: (startDate: Date, endDate: Date) => Promise<TaskAnalytics>;
  setFilters: (filters: TaskFilters) => void;
  setSort: (sort: TaskSortOptions) => void;
  setPagination: (pagination: PaginationOptions) => void;
  setSearchQuery: (query: string) => void;
  setViewMode: (mode: TaskView) => void;
  selectTask: (id: string) => void;
  deselectTask: (id: string) => void;
  selectAllTasks: () => void;
  deselectAllTasks: () => void;
  clearSelection: () => void;
  clearError: () => void;
  refresh: () => void;
}

export const TASK_STATUSES: Record<TaskStatus, { label: string; color: string; icon: string }> = {
  todo: {
    label: 'To Do',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    icon: 'circle',
  },
  in_progress: {
    label: 'In Progress',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    icon: 'clock',
  },
  in_review: {
    label: 'In Review',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    icon: 'eye',
  },
  done: {
    label: 'Done',
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    icon: 'check',
  },
  archived: {
    label: 'Archived',
    color: 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
    icon: 'archive',
  },
  deleted: {
    label: 'Deleted',
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    icon: 'trash',
  },
};

export const TASK_PRIORITIES: Record<TaskPriority, { label: string; color: string; order: number }> = {
  low: {
    label: 'Low',
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    order: 1,
  },
  medium: {
    label: 'Medium',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    order: 2,
  },
  high: {
    label: 'High',
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    order: 3,
  },
  urgent: {
    label: 'Urgent',
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    order: 4,
  },
  critical: {
    label: 'Critical',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    order: 5,
  },
};

export const TASK_SORT_FIELDS: Record<TaskSortField, { label: string; defaultDirection: 'asc' | 'desc' }> = {
  createdAt: {
    label: 'Created Date',
    defaultDirection: 'desc',
  },
  updatedAt: {
    label: 'Updated Date',
    defaultDirection: 'desc',
  },
  title: {
    label: 'Title',
    defaultDirection: 'asc',
  },
  priority: {
    label: 'Priority',
    defaultDirection: 'desc',
  },
  dueDate: {
    label: 'Due Date',
    defaultDirection: 'asc',
  },
  status: {
    label: 'Status',
    defaultDirection: 'asc',
  },
  completionPercentage: {
    label: 'Completion',
    defaultDirection: 'desc',
  },
};

export const TASK_FILTER_OPERATORS: Record<TaskFilterOperator, { label: string; type: string }> = {
  equals: {
    label: 'Equals',
    type: 'text',
  },
  contains: {
    label: 'Contains',
    type: 'text',
  },
  startsWith: {
    label: 'Starts With',
    type: 'text',
  },
  endsWith: {
    label: 'Ends With',
    type: 'text',
  },
  gt: {
    label: 'Greater Than',
    type: 'number',
  },
  gte: {
    label: 'Greater Than or Equal',
    type: 'number',
  },
  lt: {
    label: 'Less Than',
    type: 'number',
  },
  lte: {
    label: 'Less Than or Equal',
    type: 'number',
  },
  in: {
    label: 'In',
    type: 'array',
  },
  nin: {
    label: 'Not In',
    type: 'array',
  },
  between: {
    label: 'Between',
    type: 'range',
  },
};

export const TASK_RECURRING_FREQUENCIES = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
  CUSTOM: 'custom',
} as const;

export const TASK_REMINDER_TYPES = {
  EMAIL: 'email',
  PUSH: 'push',
  SMS: 'sms',
} as const;

export const TASK_VIEW_MODES = {
  LIST: 'list',
  BOARD: 'board',
  CALENDAR: 'calendar',
  TIMELINE: 'timeline',
} as const;

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

export const TASK_STATUS_ORDER = ['todo', 'in_progress', 'in_review', 'done', 'archived', 'deleted'];
export const TASK_PRIORITY_ORDER = ['critical', 'urgent', 'high', 'medium', 'low'];

export function isValidTaskStatus(status: string): status is TaskStatus {
  return TASK_STATUSES.hasOwnProperty(status);
}

export function isValidTaskPriority(priority: string): priority is TaskPriority {
  return TASK_PRIORITIES.hasOwnProperty(priority);
}

export function getTaskStatusLabel(status: TaskStatus): string {
  return TASK_STATUSES[status]?.label || status;
}

export function getTaskPriorityLabel(priority: TaskPriority): string {
  return TASK_PRIORITIES[priority]?.label || priority;
}

export function getTaskStatusColor(status: TaskStatus): string {
  return TASK_STATUSES[status]?.color || '';
}

export function getTaskPriorityColor(priority: TaskPriority): string {
  return TASK_PRIORITIES[priority]?.color || '';
}

export function getTaskStatusIcon(status: TaskStatus): string {
  return TASK_STATUSES[status]?.icon || 'circle';
}

export function getTaskPriorityOrder(priority: TaskPriority): number {
  return TASK_PRIORITIES[priority]?.order || 0;
}

export function getTaskSortFieldLabel(field: TaskSortField): string {
  return TASK_SORT_FIELDS[field]?.label || field;
}

export function getTaskSortDefaultDirection(field: TaskSortField): 'asc' | 'desc' {
  return TASK_SORT_FIELDS[field]?.defaultDirection || 'desc';
}