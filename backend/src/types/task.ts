import { Types } from "mongoose";

export interface ITask {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  status:
    | "todo"
    | "in_progress"
    | "in_review"
    | "done"
    | "archived"
    | "deleted";
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
    metadata?: Record<string, any>;
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
    lastGenerated?: Date;
  };
  reminders: {
    _id?: Types.ObjectId;
    time: Date;
    type: "email" | "push" | "sms";
    sent: boolean;
    sentAt?: Date;
    deliveryStatus?: "pending" | "sent" | "failed";
    errorMessage?: string;
    retryCount: number;
  }[];
  checklist: {
    _id?: Types.ObjectId;
    text: string;
    completed: boolean;
    completedAt?: Date;
    completedBy?: Types.ObjectId;
    order: number;
  }[];
  timeTracking: {
    startedAt?: Date;
    pausedAt?: Date;
    totalSeconds: number;
    sessions: {
      start: Date;
      end?: Date;
      duration: number;
      notes?: string;
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
    timeEstimateAccuracy?: number;
  };
  dependencies: Types.ObjectId[];
  blockedBy: Types.ObjectId[];
  blocks: Types.ObjectId[];
  viewCount: number;
  completionPercentage: number;
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreateTask {
  title: string;
  description?: string;
  status?: "todo" | "in_progress" | "in_review" | "done" | "archived";
  priority?: "low" | "medium" | "high" | "urgent" | "critical";
  assignee?: string;
  team?: string;
  project?: string;
  parentTask?: string;
  dueDate?: Date;
  startDate?: Date;
  estimatedHours?: number;
  labels?: string[];
  tags?: string[];
  isRecurring?: boolean;
  recurringRule?: ITask["recurringRule"];
  checklist?: { text: string; completed?: boolean }[];
  attachments?: {
    url: string;
    name: string;
    type: string;
    size: number;
  }[];
}

export interface IUpdateTask {
  title?: string;
  description?: string;
  status?: "todo" | "in_progress" | "in_review" | "done" | "archived";
  priority?: "low" | "medium" | "high" | "urgent" | "critical";
  assignee?: string | null;
  team?: string | null;
  project?: string | null;
  parentTask?: string | null;
  dueDate?: Date | null;
  startDate?: Date | null;
  completedAt?: Date;
  estimatedHours?: number;
  actualHours?: number;
  labels?: string[];
  tags?: string[];
  isRecurring?: boolean;
  recurringRule?: ITask["recurringRule"] | null;
  checklist?: ITask["checklist"];
  order?: number;
}

export interface ITaskFilter {
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
  page?: number;
  limit?: number;
  sortBy?:
    | "createdAt"
    | "updatedAt"
    | "title"
    | "priority"
    | "dueDate"
    | "status"
    | "completionPercentage";
  sortOrder?: "asc" | "desc";
}

export interface ITaskSort {
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

export interface ITaskPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ITaskResponse {
  tasks: ITask[];
  pagination: ITaskPagination;
  filters: ITaskFilter;
}

export interface ITaskStats {
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
  byAssignee: {
    assigneeId: string;
    assigneeName: string;
    total: number;
    completed: number;
    completionRate: number;
    overdue: number;
  }[];
  byTeam: {
    teamId: string;
    teamName: string;
    total: number;
    completed: number;
    completionRate: number;
    overdue: number;
  }[];
  timeline: {
    date: Date;
    created: number;
    completed: number;
    active: number;
  }[];
}

export interface ITaskComment {
  _id: Types.ObjectId;
  taskId: Types.ObjectId;
  userId: Types.ObjectId;
  content: string;
  parentCommentId?: Types.ObjectId;
  replies: Types.ObjectId[];
  mentions: Types.ObjectId[];
  attachments: {
    url: string;
    name: string;
    type: string;
    size: number;
  }[];
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    ipAddress?: string;
    userAgent?: string;
    edited: boolean;
    editedAt?: Date;
    source?: "web" | "mobile" | "api";
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreateComment {
  content: string;
  parentCommentId?: string;
  mentions?: string[];
  attachments?: {
    url: string;
    name: string;
    type: string;
    size: number;
  }[];
}

export interface ITaskReminder {
  _id: Types.ObjectId;
  taskId: Types.ObjectId;
  userId: Types.ObjectId;
  time: Date;
  type: "email" | "push" | "sms" | "in_app";
  message: string;
  sent: boolean;
  sentAt?: Date;
  status: "pending" | "sent" | "failed" | "cancelled";
  retryCount: number;
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    createdBy: Types.ObjectId;
    updatedBy: Types.ObjectId;
  };
}

export interface ITaskAttachment {
  _id: Types.ObjectId;
  taskId: Types.ObjectId;
  url: string;
  name: string;
  type: string;
  size: number;
  uploadedBy: Types.ObjectId;
  uploadedAt: Date;
  publicId?: string;
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
    format?: string;
    encryption?: string;
    checksum?: string;
  };
  downloadCount: number;
  lastDownloaded?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
}

export interface ITaskDependency {
  _id: Types.ObjectId;
  taskId: Types.ObjectId;
  dependsOn: Types.ObjectId;
  type: "blocking" | "blocked" | "related";
  createdAt: Date;
  createdBy: Types.ObjectId;
  metadata?: Record<string, any>;
}

export interface ITaskTemplate {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  data: Partial<ITask>;
  isPublic: boolean;
  teamId?: Types.ObjectId;
  userId: Types.ObjectId;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITaskExport {
  format: "json" | "csv" | "pdf" | "xlsx";
  filters: ITaskFilter;
  fields: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  includeMetadata: boolean;
  includeSubtasks: boolean;
  includeComments: boolean;
  includeAttachments: boolean;
  includeTimeTracking: boolean;
}

export interface ITaskImport {
  format: "json" | "csv" | "xlsx";
  data: any;
  options: {
    overwrite: boolean;
    skipDuplicates: boolean;
    assignee?: string;
    team?: string;
    project?: string;
    status?: string;
    priority?: string;
  };
}

export interface ITaskBulkOperation {
  taskIds: string[];
  updates: Partial<IUpdateTask>;
  operation: "update" | "delete" | "archive" | "assign" | "changeStatus";
  options?: {
    notifyAssignees: boolean;
    notifyWatchers: boolean;
    sendEmail: boolean;
  };
}

export interface ITaskMove {
  targetId?: string;
  position: number;
  newStatus?: "todo" | "in_progress" | "in_review" | "done" | "archived";
  newPriority?: "low" | "medium" | "high" | "urgent" | "critical";
}

export interface ITaskShare {
  userIds: string[];
  permissions: "view" | "edit" | "admin";
  expiresAt?: Date;
  message?: string;
}

export interface ITaskSearch {
  query: string;
  filters?: Partial<ITaskFilter>;
  page?: number;
  limit?: number;
  searchFields?: ("title" | "description" | "labels" | "tags" | "comments")[];
  fuzzy?: boolean;
  highlightMatches?: boolean;
}

export interface ITaskAnalytics {
  startDate: Date;
  endDate: Date;
  groupBy:
    | "status"
    | "priority"
    | "assignee"
    | "team"
    | "day"
    | "week"
    | "month";
  metrics: (
    | "count"
    | "completionRate"
    | "averageTime"
    | "totalTime"
    | "overdue"
    | "velocity"
  )[];
  filters?: Partial<ITaskFilter>;
}

export interface ITaskSuggestion {
  id: string;
  title: string;
  description?: string;
  priority: string;
  status: string;
  assignee?: string;
  dueDate?: Date;
  confidence: number;
  reason: string;
}

export interface ITaskActivity {
  _id: Types.ObjectId;
  taskId: Types.ObjectId;
  userId: Types.ObjectId;
  action:
    | "created"
    | "updated"
    | "deleted"
    | "restored"
    | "archived"
    | "assigned"
    | "unassigned"
    | "status_changed"
    | "priority_changed"
    | "due_date_changed"
    | "commented"
    | "checklist_toggled"
    | "attachment_added"
    | "attachment_removed"
    | "watcher_added"
    | "watcher_removed"
    | "subtask_added"
    | "subtask_removed"
    | "time_tracking_started"
    | "time_tracking_paused"
    | "time_tracking_stopped";
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  metadata: {
    ipAddress?: string;
    userAgent?: string;
    source?: string;
    timestamp: Date;
  };
  createdAt: Date;
}

export interface ITaskCollaborator {
  userId: Types.ObjectId;
  role: "owner" | "assignee" | "watcher" | "contributor";
  permissions: string[];
  invitedAt: Date;
  acceptedAt?: Date;
  status: "pending" | "active" | "inactive";
}

export interface ITaskTag {
  _id: Types.ObjectId;
  name: string;
  color: string;
  description?: string;
  teamId?: Types.ObjectId;
  userId: Types.ObjectId;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITaskLabel {
  _id: Types.ObjectId;
  name: string;
  color: string;
  description?: string;
  teamId?: Types.ObjectId;
  userId: Types.ObjectId;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITaskWatcher {
  userId: Types.ObjectId;
  taskId: Types.ObjectId;
  createdAt: Date;
  addedBy: Types.ObjectId;
  preferences: {
    notifyOnUpdate: boolean;
    notifyOnComment: boolean;
    notifyOnStatusChange: boolean;
    notifyOnAssignment: boolean;
    notifyOnDueDate: boolean;
  };
}

export interface ITaskTimeline {
  id: string;
  taskId: string;
  userId: string;
  action: string;
  timestamp: Date;
  details: Record<string, any>;
  metadata?: Record<string, any>;
}
