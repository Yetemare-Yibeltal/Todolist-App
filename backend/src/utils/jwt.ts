import jwt from "jsonwebtoken";
import { config } from "../config/env";
import logger from "./logger";

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Generate access and refresh tokens
 */
export const generateTokens = (payload: TokenPayload): TokenResponse => {
  try {
    const accessToken = jwt.sign(payload, config.JWT_SECRET, {
      expiresIn: config.JWT_ACCESS_EXPIRATION,
    });

    const refreshToken = jwt.sign(payload, config.JWT_SECRET, {
      expiresIn: config.JWT_REFRESH_EXPIRATION,
    });

    const expiresIn = parseExpirationTime(config.JWT_ACCESS_EXPIRATION);

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  } catch (error) {
    logger.error("Token generation failed:", error);
    throw new Error("Failed to generate tokens");
  }
};

/**
 * Verify JWT token
 */
export const verifyToken = (token: string): TokenPayload | null => {
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    return decoded as TokenPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.debug("Token expired");
    } else if (error instanceof jwt.JsonWebTokenError) {
      logger.debug("Invalid token");
    } else {
      logger.error("Token verification error:", error);
    }
    return null;
  }
};

/**
 * Decode token without verification
 */
export const decodeToken = (token: string): TokenPayload | null => {
  try {
    const decoded = jwt.decode(token);
    return decoded as TokenPayload;
  } catch (error) {
    logger.error("Token decode error:", error);
    return null;
  }
};

/**
 * Refresh access token
 */
export const refreshAccessToken = (refreshToken: string): string | null => {
  try {
    const payload = verifyToken(refreshToken);
    if (!payload) {
      return null;
    }

    const newAccessToken = jwt.sign(payload, config.JWT_SECRET, {
      expiresIn: config.JWT_ACCESS_EXPIRATION,
    });

    return newAccessToken;
  } catch (error) {
    logger.error("Token refresh failed:", error);
    return null;
  }
};

/**
 * Parse expiration time to seconds
 */
export const parseExpirationTime = (expiration: string): number => {
  const unit = expiration.slice(-1);
  const value = parseInt(expiration.slice(0, -1), 10);

  switch (unit) {
    case "s":
      return value;
    case "m":
      return value * 60;
    case "h":
      return value * 3600;
    case "d":
      return value * 86400;
    default:
      return parseInt(expiration, 10);
  }
};

/**
 * Check if token is expired
 */
export const isTokenExpired = (token: string): boolean => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || typeof decoded === "string") {
      return true;
    }

    const exp = (decoded as any).exp;
    if (!exp) {
      return true;
    }

    return Date.now() >= exp * 1000;
  } catch (error) {
    return true;
  }
};

/**
 * Get remaining time for token
 */
export const getTokenRemainingTime = (token: string): number => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || typeof decoded === "string") {
      return 0;
    }

    const exp = (decoded as any).exp;
    if (!exp) {
      return 0;
    }

    const remaining = exp * 1000 - Date.now();
    return Math.max(0, remaining);
  } catch (error) {
    return 0;
  }
};

export default {
  generateTokens,
  verifyToken,
  decodeToken,
  refreshAccessToken,
  isTokenExpired,
  getTokenRemainingTime,
};
