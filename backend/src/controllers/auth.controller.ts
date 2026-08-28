import { Request, Response, NextFunction } from "express";
import { authService } from "../services/auth.service";
import { logger } from "../utils/logger";
import { auditLogger } from "../utils/logger";
import { ApiError } from "../utils/apiError";
import { env } from "../config/env";
import { validationService } from "../services/validation.service";
import { performance } from "perf_hooks";
import { Types } from "mongoose";

interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
}

interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

interface ResetPasswordRequest {
  token: string;
  password: string;
}

interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  username?: string;
  preferences?: any;
}

class AuthController {
  private static instance: AuthController;

  private constructor() {}

  public static getInstance(): AuthController {
    if (!AuthController.instance) {
      AuthController.instance = new AuthController();
    }
    return AuthController.instance;
  }

  public async register(req: Request, res: Response, next: NextFunction) {
    const startTime = performance.now();

    try {
      const {
        email,
        username,
        password,
        firstName,
        lastName,
      }: RegisterRequest = req.body;

      await validationService.validateRegistration({
        email,
        username,
        password,
        firstName,
        lastName,
      });

      const ipAddress =
        req.ip || (req.headers["x-forwarded-for"] as string) || undefined;
      const userAgent = req.headers["user-agent"];

      const result = await authService.register(
        email,
        username,
        password,
        firstName,
        lastName,
        ipAddress,
        userAgent,
      );

      const duration = (performance.now() - startTime) / 1000;

      res.status(201).json({
        success: true,
        message:
          "User registered successfully. Please check your email for verification.",
        data: {
          user: result.user,
          tokens: result.tokens,
        },
        meta: {
          duration: `${duration.toFixed(2)}s`,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  public async login(req: Request, res: Response, next: NextFunction) {
    const startTime = performance.now();

    try {
      const { email, password, rememberMe }: LoginRequest = req.body;

      const ipAddress =
        req.ip || (req.headers["x-forwarded-for"] as string) || undefined;
      const userAgent = req.headers["user-agent"];

      const result = await authService.login(
        email,
        password,
        ipAddress,
        userAgent,
      );

      const cookieMaxAge = rememberMe
        ? 30 * 24 * 60 * 60 * 1000
        : 7 * 24 * 60 * 60 * 1000;

      res.cookie("accessToken", result.tokens.accessToken, {
        httpOnly: true,
        secure: env.COOKIE_SECURE,
        sameSite: env.COOKIE_SAME_SITE as any,
        maxAge: result.tokens.accessTokenExpires,
        domain: env.COOKIE_DOMAIN,
      });

      res.cookie("refreshToken", result.tokens.refreshToken, {
        httpOnly: true,
        secure: env.COOKIE_SECURE,
        sameSite: env.COOKIE_SAME_SITE as any,
        maxAge: cookieMaxAge,
        domain: env.COOKIE_DOMAIN,
      });

      const duration = (performance.now() - startTime) / 1000;

      res.status(200).json({
        success: true,
        message: "Login successful",
        data: {
          user: result.user,
          tokens: result.tokens,
        },
        meta: {
          duration: `${duration.toFixed(2)}s`,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  public async refreshToken(req: Request, res: Response, next: NextFunction) {
    const startTime = performance.now();

    try {
      const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;

      if (!refreshToken) {
        throw new ApiError(400, "Refresh token is required");
      }

      const result = await authService.refreshToken(refreshToken);

      res.cookie("accessToken", result.accessToken, {
        httpOnly: true,
        secure: env.COOKIE_SECURE,
        sameSite: env.COOKIE_SAME_SITE as any,
        maxAge: 15 * 60 * 1000,
        domain: env.COOKIE_DOMAIN,
      });

      res.cookie("refreshToken", result.refreshToken, {
        httpOnly: true,
        secure: env.COOKIE_SECURE,
        sameSite: env.COOKIE_SAME_SITE as any,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        domain: env.COOKIE_DOMAIN,
      });

      const duration = (performance.now() - startTime) / 1000;

      res.status(200).json({
        success: true,
        message: "Token refreshed successfully",
        data: result,
        meta: {
          duration: `${duration.toFixed(2)}s`,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  public async logout(req: Request, res: Response, next: NextFunction) {
    const startTime = performance.now();

    try {
      const userId = req.userId;
      const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;

      if (!userId) {
        throw new ApiError(401, "User not authenticated");
      }

      if (refreshToken) {
        await authService.logout(userId, refreshToken);
      }

      res.clearCookie("accessToken");
      res.clearCookie("refreshToken");

      const duration = (performance.now() - startTime) / 1000;

      res.status(200).json({
        success: true,
        message: "Logged out successfully",
        meta: {
          duration: `${duration.toFixed(2)}s`,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  public async logoutAll(req: Request, res: Response, next: NextFunction) {
    const startTime = performance.now();

    try {
      const userId = req.userId;

      if (!userId) {
        throw new ApiError(401, "User not authenticated");
      }

      await authService.logoutAll(userId);

      res.clearCookie("accessToken");
      res.clearCookie("refreshToken");

      const duration = (performance.now() - startTime) / 1000;

      res.status(200).json({
        success: true,
        message: "Logged out from all devices successfully",
        meta: {
          duration: `${duration.toFixed(2)}s`,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  public async verifyEmail(req: Request, res: Response, next: NextFunction) {
    const startTime = performance.now();

    try {
      const { token } = req.query;

      if (!token || typeof token !== "string") {
        throw new ApiError(400, "Verification token is required");
      }

      await authService.verifyEmail(token);

      const duration = (performance.now() - startTime) / 1000;

      res.status(200).json({
        success: true,
        message: "Email verified successfully",
        meta: {
          duration: `${duration.toFixed(2)}s`,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  public async resendVerification(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    const startTime = performance.now();

    try {
      const { email } = req.body;

      if (!email) {
        throw new ApiError(400, "Email is required");
      }

      await authService.resendVerificationEmail(email);

      const duration = (performance.now() - startTime) / 1000;

      res.status(200).json({
        success: true,
        message: "Verification email sent successfully",
        meta: {
          duration: `${duration.toFixed(2)}s`,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  public async forgotPassword(req: Request, res: Response, next: NextFunction) {
    const startTime = performance.now();

    try {
      const { email } = req.body;

      if (!email) {
        throw new ApiError(400, "Email is required");
      }

      const ipAddress =
        req.ip || (req.headers["x-forwarded-for"] as string) || undefined;

      await authService.forgotPassword(email, ipAddress);

      const duration = (performance.now() - startTime) / 1000;

      res.status(200).json({
        success: true,
        message: "Password reset instructions sent to your email",
        meta: {
          duration: `${duration.toFixed(2)}s`,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  public async resetPassword(req: Request, res: Response, next: NextFunction) {
    const startTime = performance.now();

    try {
      const { token, password }: ResetPasswordRequest = req.body;

      if (!token || !password) {
        throw new ApiError(400, "Token and password are required");
      }

      const ipAddress =
        req.ip || (req.headers["x-forwarded-for"] as string) || undefined;

      await authService.resetPassword(token, password, ipAddress);

      const duration = (performance.now() - startTime) / 1000;

      res.status(200).json({
        success: true,
        message: "Password reset successfully",
        meta: {
          duration: `${duration.toFixed(2)}s`,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  public async changePassword(req: Request, res: Response, next: NextFunction) {
    const startTime = performance.now();

    try {
      const userId = req.userId;
      const { currentPassword, newPassword }: ChangePasswordRequest = req.body;

      if (!userId) {
        throw new ApiError(401, "User not authenticated");
      }

      if (!currentPassword || !newPassword) {
        throw new ApiError(
          400,
          "Current password and new password are required",
        );
      }

      const ipAddress =
        req.ip || (req.headers["x-forwarded-for"] as string) || undefined;

      await authService.changePassword(
        userId,
        currentPassword,
        newPassword,
        ipAddress,
      );

      const duration = (performance.now() - startTime) / 1000;

      res.status(200).json({
        success: true,
        message: "Password changed successfully",
        meta: {
          duration: `${duration.toFixed(2)}s`,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  public async getCurrentUser(req: Request, res: Response, next: NextFunction) {
    const startTime = performance.now();

    try {
      const userId = req.userId;

      if (!userId) {
        throw new ApiError(401, "User not authenticated");
      }

      const user = await authService.getCurrentUser(userId);

      if (!user) {
        throw new ApiError(404, "User not found");
      }

      const duration = (performance.now() - startTime) / 1000;

      res.status(200).json({
        success: true,
        data: user,
        meta: {
          duration: `${duration.toFixed(2)}s`,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  public async updateProfile(req: Request, res: Response, next: NextFunction) {
    const startTime = performance.now();

    try {
      const userId = req.userId;
      const data: UpdateProfileRequest = req.body;

      if (!userId) {
        throw new ApiError(401, "User not authenticated");
      }

      const ipAddress =
        req.ip || (req.headers["x-forwarded-for"] as string) || undefined;

      const user = await authService.updateUserProfile(userId, data, ipAddress);

      const duration = (performance.now() - startTime) / 1000;

      res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        data: user,
        meta: {
          duration: `${duration.toFixed(2)}s`,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  public async deleteAccount(req: Request, res: Response, next: NextFunction) {
    const startTime = performance.now();

    try {
      const userId = req.userId;
      const { password } = req.body;

      if (!userId) {
        throw new ApiError(401, "User not authenticated");
      }

      if (!password) {
        throw new ApiError(400, "Password is required to delete account");
      }

      const ipAddress =
        req.ip || (req.headers["x-forwarded-for"] as string) || undefined;

      await authService.deleteAccount(userId, password, ipAddress);

      res.clearCookie("accessToken");
      res.clearCookie("refreshToken");

      const duration = (performance.now() - startTime) / 1000;

      res.status(200).json({
        success: true,
        message: "Account deleted successfully",
        meta: {
          duration: `${duration.toFixed(2)}s`,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  public async getUserSessions(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    const startTime = performance.now();

    try {
      const userId = req.userId;

      if (!userId) {
        throw new ApiError(401, "User not authenticated");
      }

      const sessions = await authService.getLoginHistory(userId);

      const duration = (performance.now() - startTime) / 1000;

      res.status(200).json({
        success: true,
        data: sessions,
        meta: {
          duration: `${duration.toFixed(2)}s`,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  public async validateToken(req: Request, res: Response, next: NextFunction) {
    const startTime = performance.now();

    try {
      const { token } = req.body;

      if (!token) {
        throw new ApiError(400, "Token is required");
      }

      const valid = await authService.validateToken(token);

      const duration = (performance.now() - startTime) / 1000;

      res.status(200).json({
        success: true,
        data: {
          valid: !!valid,
          payload: valid || null,
        },
        meta: {
          duration: `${duration.toFixed(2)}s`,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  public async getLoginHistory(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    const startTime = performance.now();

    try {
      const userId = req.userId;

      if (!userId) {
        throw new ApiError(401, "User not authenticated");
      }

      const history = await authService.getLoginHistory(userId);

      const duration = (performance.now() - startTime) / 1000;

      res.status(200).json({
        success: true,
        data: history,
        meta: {
          duration: `${duration.toFixed(2)}s`,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      next(error);
    }
  }
}

export const authController = AuthController.getInstance();
export default authController;
