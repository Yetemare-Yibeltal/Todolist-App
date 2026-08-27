import { prisma } from "../config/database";
import { hashPassword, comparePassword } from "../utils/password";
import logger from "../utils/logger";
import { UserRole } from "@prisma/client";

export interface UserData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt?: Date;
  preferences?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
}

export interface UpdateUserInput {
  email?: string;
  firstName?: string;
  lastName?: string;
  password?: string;
  role?: UserRole;
  isActive?: boolean;
  emailVerified?: boolean;
  preferences?: any;
}

export class User {
  static async create(data: CreateUserInput): Promise<UserData> {
    try {
      const passwordHash = await hashPassword(data.password);

      const user = await prisma.user.create({
        data: {
          email: data.email,
          passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          role: data.role || UserRole.USER,
          preferences: {
            theme: "light",
            notifications: true,
            language: "en",
          },
        },
      });

      logger.info(`User created: ${user.id} (${user.email})`);
      return user;
    } catch (error: any) {
      if (error.code === "P2002") {
        throw new Error("User with this email already exists");
      }
      logger.error("User creation failed:", error);
      throw new Error("Failed to create user");
    }
  }

  static async findById(id: string): Promise<UserData | null> {
    try {
      return await prisma.user.findUnique({
        where: { id },
      });
    } catch (error) {
      logger.error("Error finding user by ID:", error);
      return null;
    }
  }

  static async findByEmail(email: string): Promise<UserData | null> {
    try {
      return await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });
    } catch (error) {
      logger.error("Error finding user by email:", error);
      return null;
    }
  }

  static async update(id: string, data: UpdateUserInput): Promise<UserData> {
    try {
      const updateData: any = {
        ...data,
        preferences: data.preferences
          ? JSON.parse(JSON.stringify(data.preferences))
          : undefined,
      };

      if (data.password) {
        updateData.passwordHash = await hashPassword(data.password);
        delete updateData.password;
      }

      const user = await prisma.user.update({
        where: { id },
        data: updateData,
      });

      logger.info(`User updated: ${user.id}`);
      return user;
    } catch (error: any) {
      if (error.code === "P2002") {
        throw new Error("Email already in use");
      }
      logger.error("User update failed:", error);
      throw new Error("Failed to update user");
    }
  }

  static async delete(id: string): Promise<void> {
    try {
      await prisma.user.delete({
        where: { id },
      });
      logger.info(`User deleted: ${id}`);
    } catch (error) {
      logger.error("User deletion failed:", error);
      throw new Error("Failed to delete user");
    }
  }

  static async verifyPassword(
    user: UserData,
    password: string,
  ): Promise<boolean> {
    return comparePassword(password, user.passwordHash);
  }

  static async updateLastLogin(id: string): Promise<void> {
    try {
      await prisma.user.update({
        where: { id },
        data: { lastLoginAt: new Date() },
      });
    } catch (error) {
      logger.error("Failed to update last login:", error);
    }
  }

  static async getProfile(id: string): Promise<Partial<UserData> | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          emailVerified: true,
          preferences: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      return user;
    } catch (error) {
      logger.error("Failed to get user profile:", error);
      return null;
    }
  }

  static async getStats(id: string): Promise<{
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
    tasksByStatus: Record<string, number>;
  }> {
    try {
      const tasks = await prisma.task.groupBy({
        by: ["status"],
        where: { userId: id },
        _count: { status: true },
      });

      const total = tasks.reduce((sum, t) => sum + t._count.status, 0);
      const completed =
        tasks.find((t) => t.status === "COMPLETED")?._count.status || 0;
      const pending = tasks
        .filter(
          (t) =>
            t.status !== "COMPLETED" &&
            t.status !== "CANCELLED" &&
            t.status !== "ARCHIVED",
        )
        .reduce((sum, t) => sum + t._count.status, 0);

      const tasksByStatus: Record<string, number> = {};
      tasks.forEach((t) => {
        tasksByStatus[t.status] = t._count.status;
      });

      return {
        totalTasks: total,
        completedTasks: completed,
        pendingTasks: pending,
        tasksByStatus,
      };
    } catch (error) {
      logger.error("Failed to get user stats:", error);
      return {
        totalTasks: 0,
        completedTasks: 0,
        pendingTasks: 0,
        tasksByStatus: {},
      };
    }
  }

  static async getAll(
    page: number = 1,
    limit: number = 20,
    filters?: {
      role?: UserRole;
      isActive?: boolean;
      search?: string;
    },
  ): Promise<{ users: UserData[]; total: number }> {
    try {
      const where: any = {};

      if (filters?.role) {
        where.role = filters.role;
      }

      if (filters?.isActive !== undefined) {
        where.isActive = filters.isActive;
      }

      if (filters?.search) {
        where.OR = [
          { email: { contains: filters.search, mode: "insensitive" } },
          { firstName: { contains: filters.search, mode: "insensitive" } },
          { lastName: { contains: filters.search, mode: "insensitive" } },
        ];
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: "desc" },
        }),
        prisma.user.count({ where }),
      ]);

      return { users, total };
    } catch (error) {
      logger.error("Failed to get users:", error);
      throw new Error("Failed to fetch users");
    }
  }
}
