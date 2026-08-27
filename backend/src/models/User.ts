import mongoose, { Schema, Document, Model, Query } from "mongoose";
import bcrypt from "bcryptjs";
import { env } from "../config/env";
import { logger } from "../utils/logger";
import { auditLogger } from "../utils/logger";
import { redisClient, redisSet, redisGet, redisDel } from "../config/redis";

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
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
  teams: mongoose.Types.ObjectId[];
  invitedTeams: mongoose.Types.ObjectId[];
  recentTasks: mongoose.Types.ObjectId[];
  favoriteTasks: mongoose.Types.ObjectId[];
  starredTeams: mongoose.Types.ObjectId[];
  dismissedWarnings: string[];
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    createdBy?: mongoose.Types.ObjectId;
    updatedBy?: mongoose.Types.ObjectId;
    ipAddress?: string;
    userAgent?: string;
    deviceId?: string;
    sessionId?: string;
  };
  comparePassword(candidatePassword: string): Promise<boolean>;
  getFullName(): string;
  isAdmin(): boolean;
  isSuperAdmin(): boolean;
  isActive(): boolean;
  canModify(userId: string): boolean;
  incrementLoginCount(): Promise<void>;
  recordFailedAttempt(): Promise<void>;
  resetFailedAttempts(): Promise<void>;
  isLocked(): boolean;
  toJSON(): any;
}

interface IUserModel extends Model<IUser> {
  findByEmail(email: string): Promise<IUser | null>;
  findByUsername(username: string): Promise<IUser | null>;
  findActive(): Query<IUser[], IUser>;
  findAdmins(): Query<IUser[], IUser>;
  findByIdPopulated(id: string): Promise<IUser | null>;
  search(query: string, options?: any): Promise<IUser[]>;
  getStatistics(): Promise<any>;
  deleteInactive(): Promise<number>;
  bulkUpdate(ids: string[], data: any): Promise<any>;
}

const UserSchema = new Schema<IUser, IUserModel>(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
      maxlength: [100, "Email cannot exceed 100 characters"],
    },
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [30, "Username cannot exceed 30 characters"],
      match: [
        /^[a-zA-Z0-9_-]+$/,
        "Username can only contain letters, numbers, underscores and hyphens",
      ],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      maxlength: [100, "Password cannot exceed 100 characters"],
      select: false,
    },
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      maxlength: [50, "First name cannot exceed 50 characters"],
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      maxlength: [50, "Last name cannot exceed 50 characters"],
    },
    avatar: {
      type: String,
      trim: true,
      maxlength: [500, "Avatar URL cannot exceed 500 characters"],
    },
    role: {
      type: String,
      enum: ["user", "admin", "moderator", "super_admin"],
      default: "user",
      index: true,
    },
    status: {
      type: String,
      enum: [
        "active",
        "inactive",
        "suspended",
        "banned",
        "pending_verification",
      ],
      default: "pending_verification",
      index: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    verificationToken: {
      type: String,
      select: false,
    },
    verificationTokenExpires: {
      type: Date,
      select: false,
    },
    resetPasswordToken: {
      type: String,
      select: false,
    },
    resetPasswordExpires: {
      type: Date,
      select: false,
    },
    lastLogin: {
      type: Date,
    },
    lastLoginIP: {
      type: String,
    },
    loginCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    lockedUntil: {
      type: Date,
    },
    preferences: {
      theme: {
        type: String,
        enum: ["light", "dark", "system"],
        default: "system",
      },
      language: {
        type: String,
        default: "en",
      },
      notifications: {
        email: {
          type: Boolean,
          default: true,
        },
        push: {
          type: Boolean,
          default: true,
        },
        sms: {
          type: Boolean,
          default: false,
        },
        taskReminders: {
          type: Boolean,
          default: true,
        },
        teamInvites: {
          type: Boolean,
          default: true,
        },
        taskUpdates: {
          type: Boolean,
          default: true,
        },
        comments: {
          type: Boolean,
          default: true,
        },
      },
      taskView: {
        type: String,
        enum: ["list", "board", "calendar", "timeline"],
        default: "list",
      },
      sortOrder: {
        type: String,
        enum: ["createdAt", "updatedAt", "title", "priority", "dueDate"],
        default: "createdAt",
      },
      sortDirection: {
        type: String,
        enum: ["asc", "desc"],
        default: "desc",
      },
      itemsPerPage: {
        type: Number,
        default: 20,
        min: 5,
        max: 100,
      },
      timezone: {
        type: String,
        default: "UTC",
      },
      dateFormat: {
        type: String,
        default: "YYYY-MM-DD",
      },
      timeFormat: {
        type: String,
        default: "HH:mm",
      },
      startOfWeek: {
        type: String,
        enum: ["monday", "sunday", "saturday"],
        default: "monday",
      },
    },
    teams: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Team",
      },
    ],
    invitedTeams: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Team",
      },
    ],
    recentTasks: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Task",
      },
    ],
    favoriteTasks: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Task",
      },
    ],
    starredTeams: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Team",
      },
    ],
    dismissedWarnings: {
      type: [String],
      default: [],
    },
    metadata: {
      createdAt: {
        type: Date,
        default: Date.now,
      },
      updatedAt: {
        type: Date,
        default: Date.now,
      },
      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      ipAddress: String,
      userAgent: String,
      deviceId: String,
      sessionId: String,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

UserSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

UserSchema.virtual("isLocked").get(function () {
  return this.lockedUntil && this.lockedUntil > new Date();
});

UserSchema.virtual("isVerified").get(function () {
  return this.emailVerified;
});

UserSchema.virtual("canLogin").get(function () {
  return this.status === "active" && !this.isLocked;
});

UserSchema.pre("save", async function (this: IUser, next) {
  const user = this;

  if (!user.isModified("password")) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(env.BCRYPT_ROUNDS);
    user.password = await bcrypt.hash(user.password, salt);
    next();
  } catch (error: any) {
    logger.error("Error hashing password:", { error: error.message });
    next(error);
  }
});

UserSchema.pre("updateOne", function (this: any, next) {
  this.set({ "metadata.updatedAt": new Date() });
  next();
});

UserSchema.pre("findOneAndUpdate", function (this: any, next) {
  this.set({ "metadata.updatedAt": new Date() });
  next();
});

UserSchema.post("save", function (this: IUser, doc: IUser) {
  auditLogger.register(doc._id.toString(), doc.email, doc.metadata?.ipAddress);
});

UserSchema.post("remove", function (this: IUser, doc: IUser) {
  auditLogger.dataAccess(doc._id.toString(), "User", "delete", {
    email: doc.email,
    username: doc.username,
  });
});

UserSchema.methods.comparePassword = async function (
  this: IUser,
  candidatePassword: string,
): Promise<boolean> {
  try {
    const isMatch = await bcrypt.compare(candidatePassword, this.password);
    return isMatch;
  } catch (error: any) {
    logger.error("Error comparing passwords:", { error: error.message });
    return false;
  }
};

UserSchema.methods.getFullName = function (this: IUser): string {
  return `${this.firstName} ${this.lastName}`;
};

UserSchema.methods.isAdmin = function (this: IUser): boolean {
  return this.role === "admin" || this.role === "super_admin";
};

UserSchema.methods.isSuperAdmin = function (this: IUser): boolean {
  return this.role === "super_admin";
};

UserSchema.methods.isActive = function (this: IUser): boolean {
  return this.status === "active";
};

UserSchema.methods.canModify = function (this: IUser, userId: string): boolean {
  return this._id.toString() === userId || this.isAdmin();
};

UserSchema.methods.incrementLoginCount = async function (
  this: IUser,
): Promise<void> {
  this.loginCount += 1;
  this.lastLogin = new Date();
  await this.save();
};

UserSchema.methods.recordFailedAttempt = async function (
  this: IUser,
): Promise<void> {
  this.failedLoginAttempts += 1;

  if (this.failedLoginAttempts >= 5) {
    const lockDuration = Math.min(
      15 * 60 * 1000,
      Math.pow(2, this.failedLoginAttempts - 5) * 60 * 1000,
    );
    this.lockedUntil = new Date(Date.now() + lockDuration);
  }

  await this.save();
};

UserSchema.methods.resetFailedAttempts = async function (
  this: IUser,
): Promise<void> {
  this.failedLoginAttempts = 0;
  this.lockedUntil = undefined;
  await this.save();
};

UserSchema.methods.isLocked = function (this: IUser): boolean {
  return !!(this.lockedUntil && this.lockedUntil > new Date());
};

UserSchema.methods.toJSON = function (this: IUser): any {
  const obj = this.toObject();
  delete obj.password;
  delete obj.verificationToken;
  delete obj.verificationTokenExpires;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpires;
  return obj;
};

UserSchema.statics.findByEmail = async function (
  email: string,
): Promise<IUser | null> {
  const cacheKey = `user:email:${email}`;
  const cached = await redisGet(cacheKey);

  if (cached) {
    return cached as IUser;
  }

  const user = await this.findOne({ email }).select("+password");

  if (user) {
    await redisSet(cacheKey, user, { ttl: 300 });
  }

  return user;
};

UserSchema.statics.findByUsername = async function (
  username: string,
): Promise<IUser | null> {
  const cacheKey = `user:username:${username}`;
  const cached = await redisGet(cacheKey);

  if (cached) {
    return cached as IUser;
  }

  const user = await this.findOne({ username });

  if (user) {
    await redisSet(cacheKey, user, { ttl: 300 });
  }

  return user;
};

UserSchema.statics.findActive = function (): Query<IUser[], IUser> {
  return this.find({ status: "active" });
};

UserSchema.statics.findAdmins = function (): Query<IUser[], IUser> {
  return this.find({ role: { $in: ["admin", "super_admin"] } });
};

UserSchema.statics.findByIdPopulated = async function (
  id: string,
): Promise<IUser | null> {
  return this.findById(id)
    .populate("teams")
    .populate("invitedTeams")
    .populate("recentTasks")
    .populate("favoriteTasks")
    .populate("starredTeams");
};

UserSchema.statics.search = async function (
  query: string,
  options: any = {},
): Promise<IUser[]> {
  const searchRegex = new RegExp(query, "i");
  const { limit = 20, skip = 0 } = options;

  return this.find({
    $or: [
      { email: searchRegex },
      { username: searchRegex },
      { firstName: searchRegex },
      { lastName: searchRegex },
    ],
    status: { $ne: "banned" },
  })
    .limit(limit)
    .skip(skip)
    .sort({ createdAt: -1 });
};

UserSchema.statics.getStatistics = async function (): Promise<any> {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        active: {
          $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
        },
        inactive: {
          $sum: { $cond: [{ $eq: ["$status", "inactive"] }, 1, 0] },
        },
        suspended: {
          $sum: { $cond: [{ $eq: ["$status", "suspended"] }, 1, 0] },
        },
        banned: {
          $sum: { $cond: [{ $eq: ["$status", "banned"] }, 1, 0] },
        },
        pendingVerification: {
          $sum: { $cond: [{ $eq: ["$status", "pending_verification"] }, 1, 0] },
        },
        admins: {
          $sum: { $cond: [{ $eq: ["$role", "admin"] }, 1, 0] },
        },
        superAdmins: {
          $sum: { $cond: [{ $eq: ["$role", "super_admin"] }, 1, 0] },
        },
        moderators: {
          $sum: { $cond: [{ $eq: ["$role", "moderator"] }, 1, 0] },
        },
        emailVerified: {
          $sum: { $cond: ["$emailVerified", 1, 0] },
        },
        avgLoginCount: { $avg: "$loginCount" },
        totalLoginCount: { $sum: "$loginCount" },
      },
    },
    {
      $project: {
        _id: 0,
        total: 1,
        active: 1,
        inactive: 1,
        suspended: 1,
        banned: 1,
        pendingVerification: 1,
        admins: 1,
        superAdmins: 1,
        moderators: 1,
        emailVerified: 1,
        avgLoginCount: 1,
        totalLoginCount: 1,
        statusBreakdown: {
          active: "$active",
          inactive: "$inactive",
          suspended: "$suspended",
          banned: "$banned",
          pendingVerification: "$pendingVerification",
        },
        roleBreakdown: {
          admin: "$admins",
          superAdmin: "$superAdmins",
          moderator: "$moderators",
          user: {
            $subtract: [
              "$total",
              { $add: ["$admins", "$superAdmins", "$moderators"] },
            ],
          },
        },
      },
    },
  ]);

  return (
    stats[0] || {
      total: 0,
      active: 0,
      inactive: 0,
      suspended: 0,
      banned: 0,
      pendingVerification: 0,
      admins: 0,
      superAdmins: 0,
      moderators: 0,
      emailVerified: 0,
      avgLoginCount: 0,
      totalLoginCount: 0,
      statusBreakdown: {},
      roleBreakdown: {},
    }
  );
};

UserSchema.statics.deleteInactive = async function (): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 365);

  const result = await this.deleteMany({
    status: "inactive",
    lastLogin: { $lt: cutoffDate },
    loginCount: 0,
  });

  return result.deletedCount || 0;
};

UserSchema.statics.bulkUpdate = async function (
  ids: string[],
  data: any,
): Promise<any> {
  const result = await this.updateMany(
    { _id: { $in: ids } },
    { $set: data },
    { multi: true },
  );

  for (const id of ids) {
    await redisDel(`user:${id}`);
  }

  return result;
};

export const User = mongoose.model<IUser, IUserModel>("User", UserSchema);
export default User;
