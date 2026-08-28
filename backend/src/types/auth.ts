import { Types } from "mongoose";

export interface IUser {
  _id: Types.ObjectId;
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  role: "user" | "admin" | "moderator" | "super_admin";
  status:
    | "active"
    | "inactive"
    | "suspended"
    | "banned"
    | "pending_verification";
  emailVerified: boolean;
  verificationToken?: string;
  verificationTokenExpires?: Date;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  lastLogin?: Date;
  lastLoginIP?: string;
  loginCount: number;
  failedLoginAttempts: number;
  lockedUntil?: Date;
  preferences: {
    theme: "light" | "dark" | "system";
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
    taskView: "list" | "board" | "calendar" | "timeline";
    sortOrder: "createdAt" | "updatedAt" | "title" | "priority" | "dueDate";
    sortDirection: "asc" | "desc";
    itemsPerPage: number;
    timezone: string;
    dateFormat: string;
    timeFormat: string;
    startOfWeek: "monday" | "sunday" | "saturday";
  };
  teams: Types.ObjectId[];
  invitedTeams: Types.ObjectId[];
  recentTasks: Types.ObjectId[];
  favoriteTasks: Types.ObjectId[];
  starredTeams: Types.ObjectId[];
  dismissedWarnings: string[];
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    createdBy?: Types.ObjectId;
    updatedBy?: Types.ObjectId;
    ipAddress?: string;
    userAgent?: string;
    deviceId?: string;
    sessionId?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserRegistration {
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  acceptTerms: boolean;
}

export interface IUserLogin {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface IUserUpdate {
  firstName?: string;
  lastName?: string;
  username?: string;
  preferences?: Partial<IUser["preferences"]>;
}

export interface IUserPreferences {
  theme: "light" | "dark" | "system";
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
  taskView: "list" | "board" | "calendar" | "timeline";
  sortOrder: "createdAt" | "updatedAt" | "title" | "priority" | "dueDate";
  sortDirection: "asc" | "desc";
  itemsPerPage: number;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  startOfWeek: "monday" | "sunday" | "saturday";
}

export interface IChangePassword {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

export interface IResetPassword {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface IForgotPassword {
  email: string;
}

export interface IVerifyEmail {
  token: string;
}

export interface IResendVerification {
  email: string;
}

export interface IRefreshToken {
  refreshToken: string;
}

export interface ILogout {
  refreshToken?: string;
}

export interface ITokenPayload {
  userId: string;
  email: string;
  role: string;
  type: "access" | "refresh" | "verification" | "reset";
  deviceId?: string;
  sessionId?: string;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
}

export interface ITokenResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpires: number;
  refreshTokenExpires: number;
}

export interface IAuthResponse {
  user: IUser;
  tokens: ITokenResponse;
}

export interface ISession {
  id: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
  deviceId?: string;
  deviceName?: string;
  isActive: boolean;
}

export interface IDevice {
  id: string;
  userId: string;
  deviceName: string;
  deviceType: "mobile" | "tablet" | "desktop" | "other";
  platform?: "ios" | "android" | "web" | "desktop";
  pushToken?: string;
  createdAt: Date;
  lastUsed: Date;
  isVerified: boolean;
}

export interface IApiKey {
  id: string;
  userId: string;
  name: string;
  key: string;
  permissions: string[];
  expiresAt?: Date;
  createdAt: Date;
  lastUsed?: Date;
  isActive: boolean;
}

export interface ITwoFactor {
  enabled: boolean;
  secret?: string;
  backupCodes?: string[];
  verifiedAt?: Date;
}

export interface ILoginHistory {
  id: string;
  userId: string;
  timestamp: Date;
  ipAddress: string;
  userAgent?: string;
  location?: {
    city?: string;
    country?: string;
    region?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  deviceId?: string;
  success: boolean;
  failureReason?: string;
  sessionId?: string;
}

export interface IOAuthProvider {
  provider: "google" | "github" | "facebook" | "twitter";
  providerId: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  profile: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
    displayName?: string;
  };
}

export interface IUserRole {
  userId: string;
  role: "user" | "admin" | "moderator" | "super_admin";
  grantedBy: string;
  grantedAt: Date;
  reason?: string;
  expiresAt?: Date;
}

export interface IUserBan {
  userId: string;
  reason: string;
  bannedBy: string;
  bannedAt: Date;
  expiresAt?: Date;
  isActive: boolean;
  appealStatus?: "pending" | "approved" | "rejected";
  appealReason?: string;
}

export interface IUserSuspension {
  userId: string;
  reason: string;
  suspendedBy: string;
  suspendedAt: Date;
  expiresAt: Date;
  isActive: boolean;
}

export interface IPermission {
  name: string;
  description: string;
  resource: string;
  action: "create" | "read" | "update" | "delete" | "manage";
  conditions?: Record<string, any>;
}

export interface IUserPermissions {
  userId: string;
  permissions: IPermission[];
  inheritedFrom?: {
    roles: string[];
    teams: string[];
  };
  updatedAt: Date;
}

export interface IInvitation {
  id: string;
  email: string;
  token: string;
  inviterId: string;
  teamId?: string;
  projectId?: string;
  role?: string;
  permissions?: string[];
  expiresAt: Date;
  createdAt: Date;
  acceptedAt?: Date;
  status: "pending" | "accepted" | "expired" | "cancelled";
  message?: string;
}

export interface IMagicLink {
  token: string;
  email: string;
  userId?: string;
  expiresAt: Date;
  createdAt: Date;
  usedAt?: Date;
  isUsed: boolean;
  redirectUrl?: string;
}

export interface IAuditLog {
  id: string;
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent?: string;
  timestamp: Date;
  severity: "low" | "medium" | "high" | "critical";
  success: boolean;
  error?: string;
  sessionId?: string;
}

export interface IAuthEvent {
  type:
    | "login"
    | "logout"
    | "register"
    | "password_reset"
    | "email_verify"
    | "session_create"
    | "session_destroy";
  userId: string;
  timestamp: Date;
  ipAddress: string;
  userAgent?: string;
  success: boolean;
  error?: string;
  data: Record<string, any>;
}

export interface IAuthMetrics {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  loginsToday: number;
  failedLoginsToday: number;
  averageLoginTime: number;
  userGrowthRate: number;
  activeSessions: number;
  byRole: Record<string, number>;
  byStatus: Record<string, number>;
  byProvider: Record<string, number>;
}

export interface IAccountDeletion {
  userId: string;
  requestedAt: Date;
  scheduledAt: Date;
  completedAt?: Date;
  reason?: string;
  status: "pending" | "processing" | "completed" | "cancelled";
  dataRetentionDays: number;
  confirmed: boolean;
}

export interface IPasswordPolicy {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecial: boolean;
  maxConsecutive: number;
  minUnique: number;
  commonPasswords: Set<string>;
  expiredDays: number;
  preventReuse: number;
}

export interface IPasswordStrength {
  score: number;
  isStrong: boolean;
  feedback: string[];
  suggestions: string[];
  crackTime: string;
}

export interface IAuthConfig {
  jwt: {
    secret: string;
    refreshSecret: string;
    accessExpiresIn: string;
    refreshExpiresIn: string;
    issuer: string;
    audience: string;
    algorithm: string;
  };
  session: {
    maxAge: number;
    secure: boolean;
    httpOnly: boolean;
    sameSite: "strict" | "lax" | "none";
  };
  rateLimiting: {
    auth: {
      windowMs: number;
      max: number;
    };
    api: {
      windowMs: number;
      max: number;
    };
  };
  passwordPolicy: IPasswordPolicy;
  twoFactor: {
    enabled: boolean;
    issuer: string;
    digits: number;
    period: number;
    backupCodes: number;
  };
  verification: {
    email: {
      expiresIn: number;
      resendDelay: number;
      maxAttempts: number;
    };
    phone: {
      expiresIn: number;
      resendDelay: number;
      maxAttempts: number;
    };
  };
  oauth: {
    providers: {
      [key: string]: {
        clientId: string;
        clientSecret: string;
        redirectUri: string;
        scope: string[];
      };
    };
  };
}

export interface IRefreshTokenStore {
  token: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
  deviceId?: string;
  ipAddress?: string;
  userAgent?: string;
  isRevoked: boolean;
}

export interface IDeviceFingerprint {
  userAgent: string;
  ipAddress: string;
  platform: string;
  browser: string;
  os: string;
  device: string;
  screenResolution?: string;
  language?: string;
  timezone?: string;
  hardwareConcurrency?: number;
  deviceMemory?: number;
}

export interface IWebhook {
  id: string;
  userId: string;
  url: string;
  secret: string;
  events: string[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastTriggered?: Date;
  failureCount: number;
}

export interface IWebhookEvent {
  id: string;
  event: string;
  payload: Record<string, any>;
  timestamp: Date;
  webhookId: string;
  userId: string;
  attemptCount: number;
  status: "pending" | "success" | "failed";
  response?: {
    statusCode: number;
    body?: string;
  };
  error?: string;
}
