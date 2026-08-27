import { Types } from "mongoose";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { env } from "../config/env";
import { User, IUser } from "../models/User";
import { logger, auditLogger } from "../utils/logger";
import { redisClient, redisSet, redisGet, redisDel } from "../config/redis";
import { emailService } from "./email.service";
import { ApiError } from "../utils/apiError";
import { performance } from "perf_hooks";
import { v4 as uuidv4 } from "uuid";

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  type: "access" | "refresh" | "verification" | "reset";
}

interface AuthResponse {
  user: IUser;
  tokens: {
    accessToken: string;
    refreshToken: string;
    accessTokenExpires: number;
    refreshTokenExpires: number;
  };
}

interface VerificationToken {
  token: string;
  expires: Date;
}

interface ResetPasswordToken {
  token: string;
  expires: Date;
}

class AuthService {
  private static instance: AuthService;
  private refreshTokenExpiry = 7 * 24 * 60 * 60 * 1000;
  private accessTokenExpiry = 15 * 60 * 1000;
  private verificationTokenExpiry = 24 * 60 * 60 * 1000;
  private resetTokenExpiry = 1 * 60 * 60 * 1000;

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private generateTokens(user: IUser): {
    accessToken: string;
    refreshToken: string;
  } {
    const accessPayload: TokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      type: "access",
    };

    const refreshPayload: TokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      type: "refresh",
    };

    const accessToken = jwt.sign(accessPayload, env.JWT_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN,
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
      algorithm: env.JWT_ALGORITHM,
    });

    const refreshToken = jwt.sign(refreshPayload, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN,
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
      algorithm: env.JWT_ALGORITHM,
    });

    return { accessToken, refreshToken };
  }

  private async storeRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const key = `refresh_token:${userId}`;
    const tokenData = {
      token: refreshToken,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.refreshTokenExpiry),
    };

    await redisSet(key, tokenData, { ttl: this.refreshTokenExpiry / 1000 });

    const tokensKey = `refresh_tokens:${userId}`;
    await redisClient.sAdd(tokensKey, refreshToken);
    await redisClient.expire(tokensKey, this.refreshTokenExpiry / 1000);
  }

  private async revokeRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const key = `refresh_token:${userId}`;
    const stored = await redisGet(key);

    if (stored && (stored as any).token === refreshToken) {
      await redisDel(key);
    }

    const tokensKey = `refresh_tokens:${userId}`;
    await redisClient.sRem(tokensKey, refreshToken);
  }

  private async revokeAllRefreshTokens(userId: string): Promise<void> {
    const key = `refresh_token:${userId}`;
    await redisDel(key);

    const tokensKey = `refresh_tokens:${userId}`;
    await redisDel(tokensKey);
  }

  private generateVerificationToken(): VerificationToken {
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + this.verificationTokenExpiry);
    return { token, expires };
  }

  private generateResetToken(): ResetPasswordToken {
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + this.resetTokenExpiry);
    return { token, expires };
  }

  public async register(
    email: string,
    username: string,
    password: string,
    firstName: string,
    lastName: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponse> {
    const startTime = performance.now();

    try {
      const existingEmail = await User.findByEmail(email);
      if (existingEmail) {
        throw new ApiError(409, "Email already registered");
      }

      const existingUsername = await User.findByUsername(username);
      if (existingUsername) {
        throw new ApiError(409, "Username already taken");
      }

      const verification = this.generateVerificationToken();

      const user = new User({
        email,
        username,
        password,
        firstName,
        lastName,
        verificationToken: verification.token,
        verificationTokenExpires: verification.expires,
        status: "pending_verification",
        "metadata.ipAddress": ipAddress,
        "metadata.userAgent": userAgent,
      });

      await user.save();

      const verificationLink = `${env.FRONTEND_URL}/verify-email?token=${verification.token}`;
      await emailService.sendVerificationEmail(
        user.email,
        user.getFullName(),
        verificationLink,
      );

      const tokens = this.generateTokens(user);
      await this.storeRefreshToken(user._id.toString(), tokens.refreshToken);

      const duration = (performance.now() - startTime) / 1000;
      logger.info(`User registered successfully in ${duration.toFixed(2)}s`, {
        userId: user._id,
        email: user.email,
      });

      auditLogger.register(user._id.toString(), user.email, ipAddress);

      return {
        user,
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          accessTokenExpires: this.accessTokenExpiry,
          refreshTokenExpires: this.refreshTokenExpiry,
        },
      };
    } catch (error: any) {
      logger.error("Registration error:", { error: error.message });
      throw error;
    }
  }

  public async login(
    email: string,
    password: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResponse> {
    const startTime = performance.now();

    try {
      const user = await User.findByEmail(email);

      if (!user) {
        throw new ApiError(401, "Invalid credentials");
      }

      if (user.isLocked()) {
        throw new ApiError(403, "Account is locked. Please try again later.");
      }

      if (user.status === "banned") {
        throw new ApiError(403, "Account has been banned");
      }

      if (user.status === "suspended") {
        throw new ApiError(403, "Account is suspended");
      }

      const isPasswordValid = await user.comparePassword(password);

      if (!isPasswordValid) {
        await user.recordFailedAttempt();
        throw new ApiError(401, "Invalid credentials");
      }

      if (user.status === "pending_verification") {
        throw new ApiError(403, "Please verify your email address first");
      }

      if (user.status === "inactive") {
        user.status = "active";
      }

      await user.incrementLoginCount();
      await user.resetFailedAttempts();

      user.lastLogin = new Date();
      user.lastLoginIP = ipAddress;
      user.metadata.userAgent = userAgent;
      await user.save();

      const tokens = this.generateTokens(user);
      await this.storeRefreshToken(user._id.toString(), tokens.refreshToken);

      const duration = (performance.now() - startTime) / 1000;
      logger.info(`User logged in successfully in ${duration.toFixed(2)}s`, {
        userId: user._id,
        email: user.email,
      });

      auditLogger.login(user._id.toString(), true, ipAddress, userAgent);

      return {
        user,
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          accessTokenExpires: this.accessTokenExpiry,
          refreshTokenExpires: this.refreshTokenExpiry,
        },
      };
    } catch (error: any) {
      logger.error("Login error:", { error: error.message, email });

      if (error.statusCode !== 403 && error.statusCode !== 401) {
        const user = await User.findByEmail(email);
        if (user) {
          await user.recordFailedAttempt();
          auditLogger.login(user._id.toString(), false, ipAddress, userAgent);
        }
      }

      throw error;
    }
  }

  public async refreshToken(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const startTime = performance.now();

    try {
      const decoded = jwt.verify(
        refreshToken,
        env.JWT_REFRESH_SECRET,
      ) as TokenPayload;

      if (decoded.type !== "refresh") {
        throw new ApiError(401, "Invalid token type");
      }

      const key = `refresh_token:${decoded.userId}`;
      const stored = await redisGet(key);

      if (!stored || (stored as any).token !== refreshToken) {
        throw new ApiError(401, "Invalid refresh token");
      }

      const user = await User.findById(decoded.userId);
      if (!user) {
        throw new ApiError(401, "User not found");
      }

      if (user.status !== "active") {
        throw new ApiError(403, "Account is not active");
      }

      await this.revokeRefreshToken(decoded.userId, refreshToken);

      const newTokens = this.generateTokens(user);
      await this.storeRefreshToken(user._id.toString(), newTokens.refreshToken);

      const duration = (performance.now() - startTime) / 1000;
      logger.info(`Token refreshed in ${duration.toFixed(2)}s`, {
        userId: user._id,
        email: user.email,
      });

      return newTokens;
    } catch (error: any) {
      logger.error("Refresh token error:", { error: error.message });
      throw new ApiError(401, "Invalid refresh token");
    }
  }

  public async logout(userId: string, refreshToken: string): Promise<void> {
    try {
      await this.revokeRefreshToken(userId, refreshToken);
      logger.info("User logged out successfully", { userId });
    } catch (error: any) {
      logger.error("Logout error:", { error: error.message, userId });
      throw error;
    }
  }

  public async logoutAll(userId: string): Promise<void> {
    try {
      await this.revokeAllRefreshTokens(userId);
      logger.info("All sessions revoked", { userId });
    } catch (error: any) {
      logger.error("Logout all error:", { error: error.message, userId });
      throw error;
    }
  }

  public async verifyEmail(token: string): Promise<void> {
    const startTime = performance.now();

    try {
      const user = await User.findOne({
        verificationToken: token,
        verificationTokenExpires: { $gt: new Date() },
      });

      if (!user) {
        throw new ApiError(400, "Invalid or expired verification token");
      }

      user.emailVerified = true;
      user.status = "active";
      user.verificationToken = undefined;
      user.verificationTokenExpires = undefined;
      await user.save();

      const duration = (performance.now() - startTime) / 1000;
      logger.info(`Email verified in ${duration.toFixed(2)}s`, {
        userId: user._id,
        email: user.email,
      });
    } catch (error: any) {
      logger.error("Email verification error:", { error: error.message });
      throw error;
    }
  }

  public async resendVerificationEmail(email: string): Promise<void> {
    try {
      const user = await User.findByEmail(email);

      if (!user) {
        throw new ApiError(404, "User not found");
      }

      if (user.emailVerified) {
        throw new ApiError(400, "Email already verified");
      }

      const verification = this.generateVerificationToken();
      user.verificationToken = verification.token;
      user.verificationTokenExpires = verification.expires;
      await user.save();

      const verificationLink = `${env.FRONTEND_URL}/verify-email?token=${verification.token}`;
      await emailService.sendVerificationEmail(
        user.email,
        user.getFullName(),
        verificationLink,
      );

      logger.info("Verification email resent", {
        userId: user._id,
        email: user.email,
      });
    } catch (error: any) {
      logger.error("Resend verification error:", { error: error.message });
      throw error;
    }
  }

  public async forgotPassword(
    email: string,
    ipAddress?: string,
  ): Promise<void> {
    const startTime = performance.now();

    try {
      const user = await User.findByEmail(email);

      if (!user) {
        throw new ApiError(404, "User not found");
      }

      const reset = this.generateResetToken();
      user.resetPasswordToken = reset.token;
      user.resetPasswordExpires = reset.expires;
      await user.save();

      const resetLink = `${env.FRONTEND_URL}/reset-password?token=${reset.token}`;
      await emailService.sendPasswordResetEmail(
        user.email,
        user.getFullName(),
        resetLink,
      );

      const duration = (performance.now() - startTime) / 1000;
      logger.info(`Password reset requested in ${duration.toFixed(2)}s`, {
        userId: user._id,
        email: user.email,
      });

      auditLogger.passwordReset(user._id.toString(), true, ipAddress);
    } catch (error: any) {
      logger.error("Forgot password error:", { error: error.message });
      throw error;
    }
  }

  public async resetPassword(
    token: string,
    newPassword: string,
    ipAddress?: string,
  ): Promise<void> {
    const startTime = performance.now();

    try {
      const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: new Date() },
      });

      if (!user) {
        throw new ApiError(400, "Invalid or expired reset token");
      }

      user.password = newPassword;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      await this.revokeAllRefreshTokens(user._id.toString());

      const duration = (performance.now() - startTime) / 1000;
      logger.info(`Password reset successfully in ${duration.toFixed(2)}s`, {
        userId: user._id,
        email: user.email,
      });

      auditLogger.passwordReset(user._id.toString(), true, ipAddress);
    } catch (error: any) {
      logger.error("Reset password error:", { error: error.message });
      throw error;
    }
  }

  public async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    ipAddress?: string,
  ): Promise<void> {
    const startTime = performance.now();

    try {
      const user = await User.findById(userId).select("+password");

      if (!user) {
        throw new ApiError(404, "User not found");
      }

      const isPasswordValid = await user.comparePassword(currentPassword);

      if (!isPasswordValid) {
        throw new ApiError(401, "Current password is incorrect");
      }

      user.password = newPassword;
      await user.save();

      await this.revokeAllRefreshTokens(userId);

      const duration = (performance.now() - startTime) / 1000;
      logger.info(`Password changed in ${duration.toFixed(2)}s`, {
        userId: user._id,
        email: user.email,
      });

      auditLogger.security(userId, "password_changed", "info", { ipAddress });
    } catch (error: any) {
      logger.error("Change password error:", { error: error.message });
      throw error;
    }
  }

  public async getCurrentUser(userId: string): Promise<IUser | null> {
    try {
      const cacheKey = `user:${userId}`;
      const cached = await redisGet(cacheKey);

      if (cached) {
        return cached as IUser;
      }

      const user = await User.findById(userId)
        .populate("teams")
        .populate("invitedTeams")
        .populate("recentTasks")
        .populate("favoriteTasks");

      if (user) {
        await redisSet(cacheKey, user, { ttl: 300 });
      }

      return user;
    } catch (error: any) {
      logger.error("Get current user error:", { error: error.message, userId });
      throw error;
    }
  }

  public async updateUserProfile(
    userId: string,
    data: {
      firstName?: string;
      lastName?: string;
      username?: string;
      preferences?: any;
    },
    ipAddress?: string,
  ): Promise<IUser> {
    try {
      const user = await User.findById(userId);

      if (!user) {
        throw new ApiError(404, "User not found");
      }

      if (data.username && data.username !== user.username) {
        const existing = await User.findByUsername(data.username);
        if (existing) {
          throw new ApiError(409, "Username already taken");
        }
        user.username = data.username;
      }

      if (data.firstName) user.firstName = data.firstName;
      if (data.lastName) user.lastName = data.lastName;

      if (data.preferences) {
        user.preferences = {
          ...user.preferences,
          ...data.preferences,
        };
      }

      user.metadata.updatedBy = new Types.ObjectId(userId);
      user.metadata.ipAddress = ipAddress;
      await user.save();

      await redisDel(`user:${userId}`);

      logger.info("User profile updated", { userId, email: user.email });

      return user;
    } catch (error: any) {
      logger.error("Update profile error:", { error: error.message, userId });
      throw error;
    }
  }

  public async validateToken(token: string): Promise<TokenPayload | null> {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET, {
        issuer: env.JWT_ISSUER,
        audience: env.JWT_AUDIENCE,
      }) as TokenPayload;

      if (decoded.type !== "access") {
        return null;
      }

      const user = await User.findById(decoded.userId);

      if (!user || user.status !== "active") {
        return null;
      }

      return decoded;
    } catch (error: any) {
      logger.error("Token validation error:", { error: error.message });
      return null;
    }
  }

  public async deleteAccount(
    userId: string,
    password: string,
    ipAddress?: string,
  ): Promise<void> {
    try {
      const user = await User.findById(userId).select("+password");

      if (!user) {
        throw new ApiError(404, "User not found");
      }

      const isPasswordValid = await user.comparePassword(password);

      if (!isPasswordValid) {
        throw new ApiError(401, "Password is incorrect");
      }

      await this.revokeAllRefreshTokens(userId);
      await user.deleteOne();

      logger.info("Account deleted", { userId, email: user.email });
      auditLogger.security(userId, "account_deleted", "high", { ipAddress });
    } catch (error: any) {
      logger.error("Delete account error:", { error: error.message, userId });
      throw error;
    }
  }

  public async getLoginHistory(userId: string): Promise<any[]> {
    try {
      const user = await User.findById(userId);

      if (!user) {
        throw new ApiError(404, "User not found");
      }

      const key = `login_history:${userId}`;
      const history = await redisGet(key);

      return history || [];
    } catch (error: any) {
      logger.error("Get login history error:", {
        error: error.message,
        userId,
      });
      return [];
    }
  }
}

export const authService = AuthService.getInstance();
export default authService;
