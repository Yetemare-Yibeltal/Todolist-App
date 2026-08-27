import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Types } from "mongoose";
import { env } from "../config/env";
import { User, IUser } from "../models/User";
import { logger } from "../utils/logger";
import { ApiError } from "../utils/apiError";
import { redisClient, redisGet } from "../config/redis";
import { performance } from "perf_hooks";

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      userId?: string;
      token?: string;
      isAuthenticated?: boolean;
      authType?: "jwt" | "api_key" | "session";
      apiKey?: string;
      sessionId?: string;
    }
  }
}

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  type: "access" | "refresh";
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
}

interface AuthOptions {
  required?: boolean;
  roles?: string[];
  permissions?: string[];
  allowApiKey?: boolean;
  allowSession?: boolean;
  checkBlacklist?: boolean;
  validateUser?: boolean;
  cacheEnabled?: boolean;
  cacheTTL?: number;
}

class AuthMiddleware {
  private static instance: AuthMiddleware;
  private blacklistPrefix = "blacklist:token:";
  private sessionPrefix = "session:";
  private apiKeyPrefix = "apikey:";

  private constructor() {}

  public static getInstance(): AuthMiddleware {
    if (!AuthMiddleware.instance) {
      AuthMiddleware.instance = new AuthMiddleware();
    }
    return AuthMiddleware.instance;
  }

  private async getUserFromCache(userId: string): Promise<IUser | null> {
    const cacheKey = `auth:user:${userId}`;
    const cached = await redisGet(cacheKey);
    return cached as IUser | null;
  }

  private async cacheUser(user: IUser, ttl: number = 300): Promise<void> {
    const cacheKey = `auth:user:${user._id}`;
    await redisClient.setEx(cacheKey, ttl, JSON.stringify(user));
  }

  private async isTokenBlacklisted(token: string): Promise<boolean> {
    const key = `${this.blacklistPrefix}${token}`;
    const exists = await redisClient.exists(key);
    return exists === 1;
  }

  private async blacklistToken(
    token: string,
    expiresIn: number,
  ): Promise<void> {
    const key = `${this.blacklistPrefix}${token}`;
    await redisClient.setEx(key, expiresIn, "true");
  }

  private validateToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET, {
        issuer: env.JWT_ISSUER,
        audience: env.JWT_AUDIENCE,
      }) as TokenPayload;

      if (decoded.type !== "access") {
        return null;
      }

      return decoded;
    } catch (error: any) {
      if (error.name === "TokenExpiredError") {
        throw new ApiError(401, "Token has expired");
      }
      if (error.name === "JsonWebTokenError") {
        throw new ApiError(401, "Invalid token");
      }
      return null;
    }
  }

  private async validateUser(userId: string): Promise<IUser | null> {
    try {
      const cachedUser = await this.getUserFromCache(userId);
      if (cachedUser) {
        return cachedUser;
      }

      const user = await User.findById(userId)
        .select(
          "-password -verificationToken -verificationTokenExpires -resetPasswordToken -resetPasswordExpires",
        )
        .populate("teams", "name slug")
        .populate("invitedTeams", "name slug");

      if (!user) {
        return null;
      }

      if (user.status !== "active") {
        return null;
      }

      await this.cacheUser(user);
      return user;
    } catch (error: any) {
      logger.error("Error validating user:", { error: error.message, userId });
      return null;
    }
  }

  private async checkPermissions(
    user: IUser,
    options: AuthOptions,
  ): Promise<boolean> {
    if (options.roles && options.roles.length > 0) {
      const hasRole = options.roles.some((role) => {
        if (role === "admin" && user.isAdmin()) return true;
        if (role === "super_admin" && user.isSuperAdmin()) return true;
        return user.role === role;
      });

      if (!hasRole) {
        return false;
      }
    }

    if (options.permissions && options.permissions.length > 0) {
      const hasPermission = options.permissions.every((permission) => {
        if (permission === "manage_users" && user.isAdmin()) return true;
        if (permission === "manage_teams" && user.isAdmin()) return true;
        if (permission === "manage_tasks" && user.role !== "user") return true;
        if (permission === "view_analytics" && user.role !== "user")
          return true;
        if (permission === "manage_settings" && user.isSuperAdmin())
          return true;
        return false;
      });

      if (!hasPermission) {
        return false;
      }
    }

    return true;
  }

  private async validateApiKey(apiKey: string): Promise<IUser | null> {
    try {
      const key = `${this.apiKeyPrefix}${apiKey}`;
      const data = await redisGet(key);

      if (!data) {
        return null;
      }

      const { userId } = data as { userId: string };
      return await this.validateUser(userId);
    } catch (error: any) {
      logger.error("API key validation error:", { error: error.message });
      return null;
    }
  }

  private async validateSession(sessionId: string): Promise<IUser | null> {
    try {
      const key = `${this.sessionPrefix}${sessionId}`;
      const data = await redisGet(key);

      if (!data) {
        return null;
      }

      const { userId, expires } = data as { userId: string; expires: number };

      if (expires < Date.now()) {
        await redisClient.del(key);
        return null;
      }

      return await this.validateUser(userId);
    } catch (error: any) {
      logger.error("Session validation error:", { error: error.message });
      return null;
    }
  }

  public authenticate(options: AuthOptions = { required: true }) {
    return async (req: Request, res: Response, next: NextFunction) => {
      const startTime = performance.now();

      try {
        const authHeader = req.headers.authorization;
        const apiKeyHeader = req.headers["x-api-key"] as string;
        const sessionHeader = req.headers["x-session-id"] as string;
        const token = req.query.token as string;

        let user: IUser | null = null;
        let authType: "jwt" | "api_key" | "session" = "jwt";
        let tokenValue: string | null = null;

        if (authHeader && authHeader.startsWith("Bearer ")) {
          tokenValue = authHeader.substring(7);
          authType = "jwt";
        } else if (token) {
          tokenValue = token;
          authType = "jwt";
        } else if (apiKeyHeader && options.allowApiKey) {
          tokenValue = apiKeyHeader;
          authType = "api_key";
        } else if (sessionHeader && options.allowSession) {
          tokenValue = sessionHeader;
          authType = "session";
        }

        if (!tokenValue && options.required) {
          throw new ApiError(401, "Authentication required");
        }

        if (tokenValue) {
          req.token = tokenValue;
          req.authType = authType;

          if (authType === "jwt") {
            const payload = this.validateToken(tokenValue);

            if (!payload) {
              throw new ApiError(401, "Invalid token");
            }

            if (options.checkBlacklist !== false) {
              const isBlacklisted = await this.isTokenBlacklisted(tokenValue);
              if (isBlacklisted) {
                throw new ApiError(401, "Token has been revoked");
              }
            }

            user = await this.validateUser(payload.userId);

            if (!user) {
              throw new ApiError(401, "User not found or inactive");
            }

            req.userId = payload.userId;
          } else if (authType === "api_key") {
            user = await this.validateApiKey(tokenValue);

            if (!user) {
              throw new ApiError(401, "Invalid API key");
            }

            req.apiKey = tokenValue;
          } else if (authType === "session") {
            user = await this.validateSession(tokenValue);

            if (!user) {
              throw new ApiError(401, "Invalid or expired session");
            }

            req.sessionId = tokenValue;
          }

          if (user) {
            req.user = user;
            req.userId = user._id.toString();
            req.isAuthenticated = true;

            if (options.roles || options.permissions) {
              const hasPermissions = await this.checkPermissions(user, options);
              if (!hasPermissions) {
                throw new ApiError(403, "Insufficient permissions");
              }
            }
          }
        }

        if (!user && options.required) {
          throw new ApiError(401, "Authentication required");
        }

        const duration = (performance.now() - startTime) / 1000;
        if (duration > 1) {
          logger.warn("Slow authentication:", {
            duration: `${duration.toFixed(2)}s`,
            path: req.path,
            method: req.method,
            userId: req.userId,
          });
        }

        next();
      } catch (error: any) {
        if (error instanceof ApiError) {
          next(error);
        } else {
          logger.error("Authentication error:", {
            error: error.message,
            stack: error.stack,
            path: req.path,
            method: req.method,
          });
          next(new ApiError(401, "Authentication failed"));
        }
      }
    };
  }

  public requireAuth(options: AuthOptions = {}) {
    return this.authenticate({ ...options, required: true });
  }

  public optionalAuth(options: AuthOptions = {}) {
    return this.authenticate({ ...options, required: false });
  }

  public requireRoles(roles: string[], options: AuthOptions = {}) {
    return this.authenticate({
      ...options,
      required: true,
      roles,
    });
  }

  public requirePermissions(permissions: string[], options: AuthOptions = {}) {
    return this.authenticate({
      ...options,
      required: true,
      permissions,
    });
  }

  public requireAdmin(options: AuthOptions = {}) {
    return this.authenticate({
      ...options,
      required: true,
      roles: ["admin", "super_admin"],
    });
  }

  public requireSuperAdmin(options: AuthOptions = {}) {
    return this.authenticate({
      ...options,
      required: true,
      roles: ["super_admin"],
    });
  }

  public async revokeToken(token: string): Promise<void> {
    try {
      const decoded = jwt.decode(token) as TokenPayload;
      if (decoded && decoded.exp) {
        const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
        if (expiresIn > 0) {
          await this.blacklistToken(token, expiresIn);
          logger.info("Token revoked:", { userId: decoded.userId });
        }
      }
    } catch (error: any) {
      logger.error("Error revoking token:", { error: error.message });
      throw error;
    }
  }

  public async revokeUserTokens(userId: string): Promise<void> {
    try {
      const key = `auth:tokens:${userId}`;
      const tokens = await redisGet(key);

      if (tokens && Array.isArray(tokens)) {
        for (const token of tokens) {
          await this.revokeToken(token);
        }
      }

      await redisClient.del(key);
      await redisClient.del(`auth:user:${userId}`);

      logger.info("All user tokens revoked:", { userId });
    } catch (error: any) {
      logger.error("Error revoking user tokens:", {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  public async trackToken(userId: string, token: string): Promise<void> {
    try {
      const key = `auth:tokens:${userId}`;
      await redisClient.sAdd(key, token);

      const decoded = jwt.decode(token) as TokenPayload;
      if (decoded && decoded.exp) {
        const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
        if (expiresIn > 0) {
          await redisClient.expire(key, expiresIn);
        }
      }
    } catch (error: any) {
      logger.error("Error tracking token:", { error: error.message, userId });
    }
  }

  public async createApiKey(
    userId: string,
    name: string,
    expiresIn?: number,
  ): Promise<string> {
    try {
      const apiKey = `ak_${crypto.randomBytes(32).toString("hex")}`;
      const key = `${this.apiKeyPrefix}${apiKey}`;

      const data = {
        userId,
        name,
        createdAt: Date.now(),
        expiresAt: expiresIn ? Date.now() + expiresIn : null,
      };

      const ttl = expiresIn ? Math.floor(expiresIn / 1000) : 31536000;
      await redisClient.setEx(key, ttl, JSON.stringify(data));

      logger.info("API key created:", { userId, name });
      return apiKey;
    } catch (error: any) {
      logger.error("Error creating API key:", { error: error.message, userId });
      throw error;
    }
  }

  public async revokeApiKey(apiKey: string): Promise<void> {
    try {
      const key = `${this.apiKeyPrefix}${apiKey}`;
      await redisClient.del(key);
      logger.info("API key revoked:", { apiKey });
    } catch (error: any) {
      logger.error("Error revoking API key:", { error: error.message });
      throw error;
    }
  }

  public async createSession(
    userId: string,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<string> {
    try {
      const sessionId = `sess_${crypto.randomBytes(32).toString("hex")}`;
      const key = `${this.sessionPrefix}${sessionId}`;

      const data = {
        userId,
        userAgent,
        ipAddress,
        createdAt: Date.now(),
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      };

      await redisClient.setEx(key, 7 * 24 * 60 * 60, JSON.stringify(data));

      await redisClient.sAdd(`user:sessions:${userId}`, sessionId);

      logger.info("Session created:", { userId, sessionId });
      return sessionId;
    } catch (error: any) {
      logger.error("Error creating session:", { error: error.message, userId });
      throw error;
    }
  }

  public async revokeSession(sessionId: string): Promise<void> {
    try {
      const key = `${this.sessionPrefix}${sessionId}`;
      const data = await redisGet(key);

      if (data) {
        const { userId } = data as { userId: string };
        await redisClient.del(key);
        await redisClient.sRem(`user:sessions:${userId}`, sessionId);
        logger.info("Session revoked:", { sessionId });
      }
    } catch (error: any) {
      logger.error("Error revoking session:", { error: error.message });
      throw error;
    }
  }

  public async revokeAllSessions(userId: string): Promise<void> {
    try {
      const key = `user:sessions:${userId}`;
      const sessions = await redisClient.sMembers(key);

      for (const sessionId of sessions) {
        await this.revokeSession(sessionId);
      }

      await redisClient.del(key);
      logger.info("All sessions revoked:", { userId });
    } catch (error: any) {
      logger.error("Error revoking all sessions:", {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  public async getUserSessions(userId: string): Promise<any[]> {
    try {
      const key = `user:sessions:${userId}`;
      const sessions = await redisClient.sMembers(key);

      const sessionData = [];
      for (const sessionId of sessions) {
        const data = await redisGet(`${this.sessionPrefix}${sessionId}`);
        if (data) {
          sessionData.push({
            id: sessionId,
            ...(data as any),
          });
        }
      }

      return sessionData;
    } catch (error: any) {
      logger.error("Error getting user sessions:", {
        error: error.message,
        userId,
      });
      return [];
    }
  }
}

export const authMiddleware = AuthMiddleware.getInstance();
export default authMiddleware;
