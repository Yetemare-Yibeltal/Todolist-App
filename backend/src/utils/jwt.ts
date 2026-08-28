import jwt from "jsonwebtoken";
import crypto from "crypto";
import { env } from "../config/env";
import { logger } from "./logger";
import { ApiError } from "./apiError";
import { redisClient, redisGet, redisSet, redisDel } from "../config/redis";

interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  type: "access" | "refresh" | "verification" | "reset";
  deviceId?: string;
  sessionId?: string;
}

interface TokenOptions {
  expiresIn?: string | number;
  issuer?: string;
  audience?: string;
  algorithm?: jwt.Algorithm;
}

interface TokenResponse {
  token: string;
  expires: Date;
  decoded: any;
}

class JwtService {
  private static instance: JwtService;
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessExpiry: string;
  private readonly refreshExpiry: string;
  private readonly issuer: string;
  private readonly audience: string;
  private readonly algorithm: jwt.Algorithm;
  private readonly blacklistPrefix = "jwt:blacklist:";
  private readonly tokenCachePrefix = "jwt:token:";

  private constructor() {
    this.accessSecret = env.JWT_SECRET;
    this.refreshSecret = env.JWT_REFRESH_SECRET;
    this.accessExpiry = env.JWT_ACCESS_EXPIRES_IN;
    this.refreshExpiry = env.JWT_REFRESH_EXPIRES_IN;
    this.issuer = env.JWT_ISSUER;
    this.audience = env.JWT_AUDIENCE;
    this.algorithm = env.JWT_ALGORITHM as jwt.Algorithm;
  }

  public static getInstance(): JwtService {
    if (!JwtService.instance) {
      JwtService.instance = new JwtService();
    }
    return JwtService.instance;
  }

  public generateAccessToken(
    payload: Omit<JwtPayload, "type">,
    options?: TokenOptions,
  ): TokenResponse {
    const tokenPayload: JwtPayload = {
      ...payload,
      type: "access",
    };

    const token = jwt.sign(tokenPayload, this.accessSecret, {
      expiresIn: options?.expiresIn || this.accessExpiry,
      issuer: options?.issuer || this.issuer,
      audience: options?.audience || this.audience,
      algorithm: options?.algorithm || this.algorithm,
    });

    const decoded = jwt.decode(token);
    const expires = new Date((decoded as any).exp * 1000);

    return { token, expires, decoded };
  }

  public generateRefreshToken(
    payload: Omit<JwtPayload, "type">,
    options?: TokenOptions,
  ): TokenResponse {
    const tokenPayload: JwtPayload = {
      ...payload,
      type: "refresh",
    };

    const token = jwt.sign(tokenPayload, this.refreshSecret, {
      expiresIn: options?.expiresIn || this.refreshExpiry,
      issuer: options?.issuer || this.issuer,
      audience: options?.audience || this.audience,
      algorithm: options?.algorithm || this.algorithm,
    });

    const decoded = jwt.decode(token);
    const expires = new Date((decoded as any).exp * 1000);

    return { token, expires, decoded };
  }

  public generateVerificationToken(
    email: string,
    userId: string,
  ): TokenResponse {
    const tokenPayload: JwtPayload = {
      userId,
      email,
      role: "user",
      type: "verification",
    };

    const token = jwt.sign(tokenPayload, this.accessSecret, {
      expiresIn: "24h",
      issuer: this.issuer,
      audience: this.audience,
      algorithm: this.algorithm,
    });

    const decoded = jwt.decode(token);
    const expires = new Date((decoded as any).exp * 1000);

    return { token, expires, decoded };
  }

  public generateResetToken(email: string, userId: string): TokenResponse {
    const tokenPayload: JwtPayload = {
      userId,
      email,
      role: "user",
      type: "reset",
    };

    const token = jwt.sign(tokenPayload, this.accessSecret, {
      expiresIn: "1h",
      issuer: this.issuer,
      audience: this.audience,
      algorithm: this.algorithm,
    });

    const decoded = jwt.decode(token);
    const expires = new Date((decoded as any).exp * 1000);

    return { token, expires, decoded };
  }

  public generateTokenPair(
    userId: string,
    email: string,
    role: string,
    deviceId?: string,
    sessionId?: string,
  ): {
    accessToken: TokenResponse;
    refreshToken: TokenResponse;
  } {
    const basePayload = { userId, email, role, deviceId, sessionId };

    const accessToken = this.generateAccessToken(basePayload);
    const refreshToken = this.generateRefreshToken(basePayload);

    return { accessToken, refreshToken };
  }

  public async verifyAccessToken(token: string): Promise<JwtPayload> {
    try {
      const decoded = jwt.verify(token, this.accessSecret, {
        issuer: this.issuer,
        audience: this.audience,
      }) as JwtPayload;

      if (decoded.type !== "access") {
        throw new ApiError(401, "Invalid token type");
      }

      const isBlacklisted = await this.isTokenBlacklisted(token);
      if (isBlacklisted) {
        throw new ApiError(401, "Token has been revoked");
      }

      return decoded;
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }
      if (error.name === "TokenExpiredError") {
        throw new ApiError(401, "Token has expired");
      }
      if (error.name === "JsonWebTokenError") {
        throw new ApiError(401, "Invalid token");
      }
      logger.error("Token verification error:", { error: error.message });
      throw new ApiError(401, "Token verification failed");
    }
  }

  public async verifyRefreshToken(token: string): Promise<JwtPayload> {
    try {
      const decoded = jwt.verify(token, this.refreshSecret, {
        issuer: this.issuer,
        audience: this.audience,
      }) as JwtPayload;

      if (decoded.type !== "refresh") {
        throw new ApiError(401, "Invalid token type");
      }

      return decoded;
    } catch (error: any) {
      if (error.name === "TokenExpiredError") {
        throw new ApiError(401, "Refresh token has expired");
      }
      if (error.name === "JsonWebTokenError") {
        throw new ApiError(401, "Invalid refresh token");
      }
      logger.error("Refresh token verification error:", {
        error: error.message,
      });
      throw new ApiError(401, "Refresh token verification failed");
    }
  }

  public verifyToken(
    token: string,
    type: "access" | "refresh" | "verification" | "reset",
  ): JwtPayload {
    try {
      const secret =
        type === "refresh" ? this.refreshSecret : this.accessSecret;
      const decoded = jwt.verify(token, secret, {
        issuer: this.issuer,
        audience: this.audience,
      }) as JwtPayload;

      if (decoded.type !== type) {
        throw new ApiError(401, `Invalid token type: expected ${type}`);
      }

      return decoded;
    } catch (error: any) {
      if (error.name === "TokenExpiredError") {
        throw new ApiError(401, "Token has expired");
      }
      if (error.name === "JsonWebTokenError") {
        throw new ApiError(401, "Invalid token");
      }
      throw new ApiError(401, "Token verification failed");
    }
  }

  public decodeToken(token: string): any {
    try {
      return jwt.decode(token);
    } catch (error: any) {
      logger.error("Token decode error:", { error: error.message });
      return null;
    }
  }

  public async blacklistToken(
    token: string,
    expiresIn?: number,
  ): Promise<void> {
    try {
      const decoded = jwt.decode(token) as any;
      if (!decoded || !decoded.exp) {
        throw new Error("Invalid token: cannot determine expiry");
      }

      const ttl = expiresIn || decoded.exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        const key = `${this.blacklistPrefix}${this.hashToken(token)}`;
        await redisSet(key, "true", { ttl });
        logger.info("Token blacklisted:", { token: token.substring(0, 20) });
      }
    } catch (error: any) {
      logger.error("Token blacklist error:", { error: error.message });
      throw new ApiError(500, "Failed to blacklist token");
    }
  }

  public async blacklistUserTokens(userId: string): Promise<void> {
    try {
      const key = `${this.tokenCachePrefix}${userId}`;
      const tokens = await redisGet(key);

      if (tokens && Array.isArray(tokens)) {
        for (const token of tokens) {
          await this.blacklistToken(token);
        }
        await redisDel(key);
      }

      logger.info("All user tokens blacklisted:", { userId });
    } catch (error: any) {
      logger.error("User tokens blacklist error:", { error: error.message });
      throw new ApiError(500, "Failed to blacklist user tokens");
    }
  }

  public async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      const key = `${this.blacklistPrefix}${this.hashToken(token)}`;
      const result = await redisGet(key);
      return !!result;
    } catch (error: any) {
      logger.error("Token blacklist check error:", { error: error.message });
      return false;
    }
  }

  public async cacheToken(userId: string, token: string): Promise<void> {
    try {
      const key = `${this.tokenCachePrefix}${userId}`;
      const tokens = ((await redisGet(key)) as string[]) || [];

      if (!tokens.includes(token)) {
        tokens.push(token);
        await redisSet(key, tokens, { ttl: 7 * 24 * 60 * 60 });
      }
    } catch (error: any) {
      logger.error("Token cache error:", { error: error.message });
    }
  }

  public async getCachedTokens(userId: string): Promise<string[]> {
    try {
      const key = `${this.tokenCachePrefix}${userId}`;
      const tokens = await redisGet(key);
      return (tokens as string[]) || [];
    } catch (error: any) {
      logger.error("Get cached tokens error:", { error: error.message });
      return [];
    }
  }

  public async clearCachedTokens(userId: string): Promise<void> {
    try {
      const key = `${this.tokenCachePrefix}${userId}`;
      await redisDel(key);
      logger.info("Cached tokens cleared:", { userId });
    } catch (error: any) {
      logger.error("Clear cached tokens error:", { error: error.message });
    }
  }

  public generateSecureToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  public generateOTP(length: number = 6): string {
    const digits = "0123456789";
    let otp = "";
    for (let i = 0; i < length; i++) {
      otp += digits[Math.floor(Math.random() * 10)];
    }
    return otp;
  }

  public generateApiKey(): string {
    const prefix = "ak_";
    const random = crypto.randomBytes(32).toString("hex");
    const timestamp = Date.now().toString(36);
    return `${prefix}${random}${timestamp}`;
  }

  public generateSessionId(): string {
    const prefix = "sess_";
    const random = crypto.randomBytes(24).toString("hex");
    return `${prefix}${random}`;
  }

  private hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  public async refreshAccessToken(
    refreshToken: string,
  ): Promise<TokenResponse> {
    try {
      const decoded = await this.verifyRefreshToken(refreshToken);

      const { userId, email, role, deviceId, sessionId } = decoded;

      await this.blacklistToken(refreshToken);

      const newAccessToken = this.generateAccessToken({
        userId,
        email,
        role,
        deviceId,
        sessionId,
      });

      await this.cacheToken(userId, newAccessToken.token);

      return newAccessToken;
    } catch (error: any) {
      logger.error("Refresh access token error:", { error: error.message });
      throw new ApiError(401, "Failed to refresh access token");
    }
  }

  public getTokenExpiry(token: string): Date | null {
    try {
      const decoded = jwt.decode(token) as any;
      if (decoded && decoded.exp) {
        return new Date(decoded.exp * 1000);
      }
      return null;
    } catch (error: any) {
      logger.error("Get token expiry error:", { error: error.message });
      return null;
    }
  }

  public isTokenExpired(token: string): boolean {
    const expiry = this.getTokenExpiry(token);
    if (!expiry) return true;
    return expiry < new Date();
  }

  public getTokenRemainingTime(token: string): number {
    const expiry = this.getTokenExpiry(token);
    if (!expiry) return 0;
    return Math.max(0, expiry.getTime() - Date.now());
  }

  public async cleanExpiredTokens(): Promise<void> {
    try {
      const pattern = `${this.tokenCachePrefix}*`;
      const keys = await redisClient.keys(pattern);

      for (const key of keys) {
        const userId = key.replace(this.tokenCachePrefix, "");
        const tokens = await this.getCachedTokens(userId);

        const validTokens = [];
        for (const token of tokens) {
          if (!this.isTokenExpired(token)) {
            validTokens.push(token);
          }
        }

        if (validTokens.length === 0) {
          await redisDel(key);
        } else {
          await redisSet(key, validTokens, { ttl: 7 * 24 * 60 * 60 });
        }
      }

      logger.info("Expired tokens cleaned up");
    } catch (error: any) {
      logger.error("Clean expired tokens error:", { error: error.message });
    }
  }
}

export const jwtService = JwtService.getInstance();
export default jwtService;
