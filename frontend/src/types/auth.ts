// User Related Types
export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  fullName: string;
  avatar?: string;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  lastLogin?: Date;
  lastLoginIP?: string;
  loginCount: number;
  preferences: UserPreferences;
  teams: Team[];
  invitedTeams: Team[];
  recentTasks: Task[];
  favoriteTasks: Task[];
  starredTeams: Team[];
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    createdBy?: string;
    updatedBy?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
    taskReminders: boolean;
    teamInvites: boolean;
    taskUpdates: boolean;
    comments: boolean;
  };
  taskView: 'list' | 'board' | 'calendar' | 'timeline';
  sortOrder: 'createdAt' | 'updatedAt' | 'title' | 'priority' | 'dueDate';
  sortDirection: 'asc' | 'desc';
  itemsPerPage: number;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  startOfWeek: 'monday' | 'sunday' | 'saturday';
}

// Team Related Types
export interface Team {
  id: string;
  name: string;
  slug: string;
  description?: string;
  avatar?: string;
  owner: string;
  members: TeamMember[];
  tasks: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamMember {
  userId: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joinedAt: Date;
}

// Project Related Types
export interface Project {
  id: string;
  name: string;
  slug: string;
  description?: string;
  owner: string;
  team?: Team;
  tasks: string[];
  status: 'active' | 'archived' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

// Task Related Types
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
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    updatedBy: string;
    priorityScore?: number;
    urgencyScore?: number;
    complexityScore?: number;
  };
  completionPercentage: number;
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done' | 'archived' | 'deleted';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent' | 'critical';

// Attachment Types
export interface Attachment {
  id: string;
  url: string;
  name: string;
  type: string;
  size: number;
  uploadedBy: User;
  uploadedAt: Date;
  publicId?: string;
}

// Comment Types
export interface Comment {
  id: string;
  content: string;
  author: User;
  taskId: string;
  parentComment?: Comment;
  replies: Comment[];
  mentions: User[];
  createdAt: Date;
  updatedAt: Date;
}

// Recurring Rule Types
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

// Reminder Types
export interface Reminder {
  id: string;
  time: Date;
  type: 'email' | 'push' | 'sms';
  sent: boolean;
  sentAt?: Date;
}

// Checklist Types
export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  completedAt?: Date;
  completedBy?: User;
}

// Time Tracking Types
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

// Authentication Types
export interface AuthResponse {
  user: User;
  tokens: {
    accessToken: string;
    refreshToken: string;
    accessTokenExpires: number;
    refreshTokenExpires: number;
  };
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterCredentials {
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  acceptTerms: boolean;
}

export interface ResetPasswordData {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  username?: string;
  preferences?: Partial<UserPreferences>;
}

export interface DeleteAccountData {
  password: string;
  confirmDelete: boolean;
}

// Two Factor Authentication Types
export interface TwoFactorData {
  code: string;
}

export interface EnableTwoFactorData {
  password: string;
  code?: string;
}

export interface DisableTwoFactorData {
  password: string;
  code: string;
}

// OAuth Types
export interface OAuthData {
  provider: 'google' | 'github' | 'facebook' | 'twitter';
  code: string;
  redirectUri?: string;
}

export interface SocialLoginData {
  provider: 'google' | 'github' | 'facebook' | 'twitter';
  accessToken: string;
  refreshToken?: string;
  profile: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
  };
}

// Session Types
export interface Session {
  id: string;
  userId: string;
  userAgent?: string;
  ipAddress?: string;
  createdAt: Date;
  expiresAt: Date;
  lastActivity: Date;
}

// API Key Types
export interface ApiKey {
  id: string;
  name: string;
  key: string;
  userId: string;
  createdAt: Date;
  expiresAt?: Date;
  lastUsed?: Date;
  permissions: string[];
}

// Audit Log Types
export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  resource: string;
  data?: any;
  ipAddress?: string;
  userAgent?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  createdAt: Date;
}

// Device Types
export interface Device {
  id: string;
  userId: string;
  deviceName: string;
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'other';
  pushToken?: string;
  lastUsed: Date;
  createdAt: Date;
  verified: boolean;
}

// Magic Link Types
export interface MagicLinkData {
  email: string;
}

export interface VerifyMagicLinkData {
  token: string;
}

export interface SetPasswordData {
  token: string;
  password: string;
  confirmPassword: string;
}

// Admin Types
export interface ImpersonateData {
  userId: string;
  reason: string;
}

export interface UserBanData {
  userId: string;
  reason: string;
  duration?: number;
}

export interface UserUnbanData {
  userId: string;
  reason: string;
}

export interface UserRoleData {
  userId: string;
  role: 'user' | 'admin' | 'moderator' | 'super_admin';
  reason: string;
}

export interface AdminResetPasswordData {
  userId: string;
  newPassword: string;
}

// Verification Types
export interface VerifyEmailData {
  token: string;
}

export interface ResendVerificationData {
  email: string;
}

export interface ForgotPasswordData {
  email: string;
}

// Response Types
export interface TokenValidationResponse {
  valid: boolean;
  payload?: any;
}

export interface LoginHistoryResponse {
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  success: boolean;
}

export interface SessionResponse {
  sessions: Session[];
  currentSessionId: string;
}

// User Statistics Types
export interface UserStats {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  completionRate: number;
  averageCompletionTime: number;
  totalTimeSpent: number;
  tasksByPriority: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
    critical: number;
  };
  tasksByStatus: {
    todo: number;
    inProgress: number;
    inReview: number;
    done: number;
    archived: number;
  };
}

export interface UserActivity {
  date: Date;
  tasksCreated: number;
  tasksCompleted: number;
  comments: number;
  timeSpent: number;
}

// Achievement Types
export interface UserAchievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: Date;
  progress: number;
  target: number;
}

// Notification Types
export interface UserNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  readAt?: Date;
  createdAt: Date;
  data?: any;
}

// User Settings Types
export interface UserSettings {
  account: {
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  security: {
    twoFactorEnabled: boolean;
    lastPasswordChange: Date;
    sessions: Session[];
    devices: Device[];
    apiKeys: ApiKey[];
  };
  preferences: UserPreferences;
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
    taskReminders: boolean;
    teamInvites: boolean;
    taskUpdates: boolean;
    comments: boolean;
    marketing: boolean;
    securityAlerts: boolean;
  };
  privacy: {
    profileVisibility: 'public' | 'private' | 'team';
    emailVisibility: boolean;
    activityVisibility: boolean;
    allowSearch: boolean;
  };
  integrations: {
    google?: {
      connected: boolean;
      email?: string;
    };
    github?: {
      connected: boolean;
      username?: string;
    };
    slack?: {
      connected: boolean;
      workspace?: string;
    };
    calendar?: {
      connected: boolean;
      provider?: 'google' | 'outlook' | 'apple';
    };
  };
}

// Auth State Types
export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  token: string | null;
  refreshToken: string | null;
  sessionExpiry: number | null;
  error: string | null;
}

export interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  refreshToken: () => Promise<string>;
  changePassword: (data: ChangePasswordData) => Promise<void>;
  resetPassword: (data: ResetPasswordData) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<User>;
  deleteAccount: (password: string) => Promise<void>;
  getToken: () => string | null;
  isTokenValid: () => boolean;
  clearError: () => void;
  setError: (error: string) => void;
}

// Action Types
export type AuthAction =
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_AUTHENTICATED'; payload: boolean }
  | { type: 'SET_TOKEN'; payload: { token: string; refreshToken: string; expires: number } }
  | { type: 'CLEAR_TOKEN' }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'UPDATE_USER'; payload: Partial<User> };

// Constants
export const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  SUPER_ADMIN: 'super_admin',
} as const;

export const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  BANNED: 'banned',
  PENDING_VERIFICATION: 'pending_verification',
} as const;

export const USER_THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
} as const;

export const TASK_VIEWS = {
  LIST: 'list',
  BOARD: 'board',
  CALENDAR: 'calendar',
  TIMELINE: 'timeline',
} as const;

export const NOTIFICATION_TYPES = {
  TASK_ASSIGNED: 'task_assigned',
  TASK_COMPLETED: 'task_completed',
  TASK_OVERDUE: 'task_overdue',
  TASK_DELETED: 'task_deleted',
  TASK_UPDATED: 'task_updated',
  TASK_COMMENTED: 'task_commented',
  TASK_MENTIONED: 'task_mentioned',
  TASK_WATCHED: 'task_watched',
  TEAM_INVITE: 'team_invite',
  TEAM_JOINED: 'team_joined',
  TEAM_LEFT: 'team_left',
  TEAM_UPDATED: 'team_updated',
  COMMENT_ADDED: 'comment_added',
  COMMENT_REPLIED: 'comment_replied',
  MENTIONED: 'mentioned',
  SYSTEM_ALERT: 'system_alert',
  SECURITY_ALERT: 'security_alert',
  REMINDER: 'reminder',
  WEEKLY_SUMMARY: 'weekly_summary',
  MONTHLY_REPORT: 'monthly_report',
  ACHIEVEMENT: 'achievement',
} as const;

// Type Aliases
export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];
export type UserStatus = typeof USER_STATUS[keyof typeof USER_STATUS];
export type UserTheme = typeof USER_THEMES[keyof typeof USER_THEMES];
export type TaskView = typeof TASK_VIEWS[keyof typeof TASK_VIEWS];
export type NotificationType = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES];

// Error Types
export interface AuthError {
  code: string;
  message: string;
  field?: string;
  details?: any;
}

export interface AuthValidationResult {
  valid: boolean;
  errors: AuthError[];
}

// Utility Functions
export function isUserRole(value: string): value is UserRole {
  return Object.values(USER_ROLES).includes(value as any);
}

export function isUserStatus(value: string): value is UserStatus {
  return Object.values(USER_STATUS).includes(value as any);
}

export function isUserTheme(value: string): value is UserTheme {
  return Object.values(USER_THEMES).includes(value as any);
}

export function isTaskView(value: string): value is TaskView {
  return Object.values(TASK_VIEWS).includes(value as any);
}

export function isNotificationType(value: string): value is NotificationType {
  return Object.values(NOTIFICATION_TYPES).includes(value as any);
}

export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    user: 'User',
    admin: 'Administrator',
    moderator: 'Moderator',
    super_admin: 'Super Admin',
  };
  return labels[role] || role;
}

export function getStatusLabel(status: UserStatus): string {
  const labels: Record<UserStatus, string> = {
    active: 'Active',
    inactive: 'Inactive',
    suspended: 'Suspended',
    banned: 'Banned',
    pending_verification: 'Pending Verification',
  };
  return labels[status] || status;
}

export function getThemeLabel(theme: UserTheme): string {
  const labels: Record<UserTheme, string> = {
    light: 'Light',
    dark: 'Dark',
    system: 'System',
  };
  return labels[theme] || theme;
}

export function getNotificationTypeLabel(type: NotificationType): string {
  const labels: Record<NotificationType, string> = {
    task_assigned: 'Task Assigned',
    task_completed: 'Task Completed',
    task_overdue: 'Task Overdue',
    task_deleted: 'Task Deleted',
    task_updated: 'Task Updated',
    task_commented: 'Task Commented',
    task_mentioned: 'Task Mentioned',
    task_watched: 'Task Watched',
    team_invite: 'Team Invite',
    team_joined: 'Team Joined',
    team_left: 'Team Left',
    team_updated: 'Team Updated',
    comment_added: 'Comment Added',
    comment_replied: 'Comment Replied',
    mentioned: 'Mentioned',
    system_alert: 'System Alert',
    security_alert: 'Security Alert',
    reminder: 'Reminder',
    weekly_summary: 'Weekly Summary',
    monthly_report: 'Monthly Report',
    achievement: 'Achievement',
  };
  return labels[type] || type;
}