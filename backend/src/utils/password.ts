import bcrypt from "bcryptjs";
import crypto from "crypto";
import { env } from "../config/env";
import { logger } from "./logger";
import { ApiError } from "./apiError";
import { redisClient, redisGet, redisSet, redisDel } from "../config/redis";

interface PasswordStrength {
  score: number;
  isStrong: boolean;
  feedback: string[];
  suggestions: string[];
  crackTime: string;
}

interface PasswordPolicy {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecial: boolean;
  maxConsecutive: number;
  minUnique: number;
  commonPasswords: Set<string>;
}

class PasswordService {
  private static instance: PasswordService;
  private readonly saltRounds: number;
  private readonly passwordPolicy: PasswordPolicy;
  private readonly bruteForcePrefix = "password:bruteforce:";
  private readonly resetPrefix = "password:reset:";

  private constructor() {
    this.saltRounds = env.BCRYPT_ROUNDS;
    this.passwordPolicy = {
      minLength: 8,
      maxLength: 100,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecial: true,
      maxConsecutive: 3,
      minUnique: 3,
      commonPasswords: this.loadCommonPasswords(),
    };
  }

  public static getInstance(): PasswordService {
    if (!PasswordService.instance) {
      PasswordService.instance = new PasswordService();
    }
    return PasswordService.instance;
  }

  private loadCommonPasswords(): Set<string> {
    const common = [
      "password",
      "123456",
      "password123",
      "qwerty",
      "abc123",
      "admin",
      "letmein",
      "welcome",
      "monkey",
      "dragon",
      "master",
      "hello",
      "freedom",
      "whatever",
      "qwertyuiop",
    ];
    return new Set(common);
  }

  public async hashPassword(password: string): Promise<string> {
    try {
      this.validatePassword(password);
      const salt = await bcrypt.genSalt(this.saltRounds);
      const hashed = await bcrypt.hash(password, salt);
      return hashed;
    } catch (error: any) {
      logger.error("Password hashing error:", { error: error.message });
      throw new ApiError(500, "Failed to hash password");
    }
  }

  public async comparePassword(
    password: string,
    hashedPassword: string,
  ): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hashedPassword);
    } catch (error: any) {
      logger.error("Password comparison error:", { error: error.message });
      return false;
    }
  }

  public validatePassword(password: string): void {
    const policy = this.passwordPolicy;
    const errors: string[] = [];

    if (password.length < policy.minLength) {
      errors.push(`Password must be at least ${policy.minLength} characters`);
    }

    if (password.length > policy.maxLength) {
      errors.push(`Password must not exceed ${policy.maxLength} characters`);
    }

    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push("Password must contain at least one uppercase letter");
    }

    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push("Password must contain at least one lowercase letter");
    }

    if (policy.requireNumbers && !/[0-9]/.test(password)) {
      errors.push("Password must contain at least one number");
    }

    if (policy.requireSpecial && !/[^A-Za-z0-9]/.test(password)) {
      errors.push("Password must contain at least one special character");
    }

    if (policy.maxConsecutive > 0) {
      let consecutive = 0;
      let prevChar = "";
      for (const char of password) {
        if (char === prevChar) {
          consecutive++;
          if (consecutive >= policy.maxConsecutive) {
            errors.push(
              `Password cannot contain more than ${policy.maxConsecutive} consecutive characters`,
            );
            break;
          }
        } else {
          consecutive = 0;
          prevChar = char;
        }
      }
    }

    const uniqueChars = new Set(password);
    if (uniqueChars.size < policy.minUnique) {
      errors.push(
        `Password must contain at least ${policy.minUnique} unique characters`,
      );
    }

    if (policy.commonPasswords.has(password.toLowerCase())) {
      errors.push("Password is too common and easily guessable");
    }

    if (errors.length > 0) {
      throw new ApiError(
        400,
        "Password validation failed",
        errors.map((e) => ({ message: e })),
      );
    }
  }

  public assessPasswordStrength(password: string): PasswordStrength {
    let score = 0;
    const feedback: string[] = [];
    const suggestions: string[] = [];
    const policy = this.passwordPolicy;

    if (password.length >= 8) {
      score += 1;
      if (password.length >= 12) {
        score += 1;
        if (password.length >= 16) {
          score += 1;
        }
      }
    } else {
      feedback.push("Password is too short");
      suggestions.push(`Use at least ${policy.minLength} characters`);
    }

    if (/[A-Z]/.test(password)) {
      score += 1;
    } else {
      feedback.push("Add uppercase letters");
      suggestions.push("Include uppercase letters (A-Z)");
    }

    if (/[a-z]/.test(password)) {
      score += 1;
    } else {
      feedback.push("Add lowercase letters");
      suggestions.push("Include lowercase letters (a-z)");
    }

    if (/[0-9]/.test(password)) {
      score += 1;
    } else {
      feedback.push("Add numbers");
      suggestions.push("Include numbers (0-9)");
    }

    if (/[^A-Za-z0-9]/.test(password)) {
      score += 1;
    } else {
      feedback.push("Add special characters");
      suggestions.push("Include special characters (!@#$%^&*)");
    }

    const uniqueChars = new Set(password).size;
    if (uniqueChars >= 5) {
      score += 1;
    } else {
      feedback.push("Use more unique characters");
      suggestions.push("Include different types of characters");
    }

    let consecutive = 0;
    let prevChar = "";
    for (const char of password) {
      if (char === prevChar) {
        consecutive++;
        if (consecutive >= 3) {
          feedback.push("Avoid repeating characters");
          suggestions.push("Use more varied characters");
          break;
        }
      } else {
        consecutive = 0;
        prevChar = char;
      }
    }

    if (policy.commonPasswords.has(password.toLowerCase())) {
      score = Math.max(0, score - 2);
      feedback.push("Password is too common");
      suggestions.push("Use a less common password");
    }

    const crackTime = this.estimateCrackTime(password);
    const isStrong = score >= 5;

    return {
      score: Math.min(score, 7),
      isStrong,
      feedback,
      suggestions,
      crackTime,
    };
  }

  private estimateCrackTime(password: string): string {
    const charsetSize = this.calculateCharsetSize(password);
    const length = password.length;
    const combinations = Math.pow(charsetSize, length);

    const guessesPerSecond = 1e9;
    const seconds = combinations / guessesPerSecond;

    if (seconds < 60) {
      return "Less than a minute";
    } else if (seconds < 3600) {
      return `${Math.floor(seconds / 60)} minutes`;
    } else if (seconds < 86400) {
      return `${Math.floor(seconds / 3600)} hours`;
    } else if (seconds < 31536000) {
      return `${Math.floor(seconds / 86400)} days`;
    } else if (seconds < 3.1536e10) {
      return `${Math.floor(seconds / 31536000)} years`;
    } else {
      return "Centuries";
    }
  }

  private calculateCharsetSize(password: string): number {
    let size = 0;
    if (/[a-z]/.test(password)) size += 26;
    if (/[A-Z]/.test(password)) size += 26;
    if (/[0-9]/.test(password)) size += 10;
    if (/[^A-Za-z0-9]/.test(password)) size += 33;
    return size || 1;
  }

  public generateStrongPassword(length: number = 16): string {
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const numbers = "0123456789";
    const special = "!@#$%^&*()_+-=[]{}|;:,.<>?";

    let password = "";
    const allChars = uppercase + lowercase + numbers + special;

    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];

    for (let i = 4; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    password = password
      .split("")
      .sort(() => Math.random() - 0.5)
      .join("");

    return password;
  }

  public async trackFailedAttempt(
    userId: string,
    maxAttempts: number = 5,
    lockoutMinutes: number = 15,
  ): Promise<void> {
    try {
      const key = `${this.bruteForcePrefix}${userId}`;
      const attempts = ((await redisGet(key)) as number) || 0;

      if (attempts >= maxAttempts) {
        throw new ApiError(
          403,
          `Account locked for ${lockoutMinutes} minutes due to too many failed attempts`,
        );
      }

      await redisSet(key, attempts + 1, { ttl: lockoutMinutes * 60 });
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error("Track failed attempt error:", {
        error: error.message,
        userId,
      });
    }
  }

  public async resetFailedAttempts(userId: string): Promise<void> {
    try {
      const key = `${this.bruteForcePrefix}${userId}`;
      await redisDel(key);
    } catch (error: any) {
      logger.error("Reset failed attempts error:", {
        error: error.message,
        userId,
      });
    }
  }

  public async getFailedAttempts(userId: string): Promise<number> {
    try {
      const key = `${this.bruteForcePrefix}${userId}`;
      return ((await redisGet(key)) as number) || 0;
    } catch (error: any) {
      logger.error("Get failed attempts error:", {
        error: error.message,
        userId,
      });
      return 0;
    }
  }

  public async storeResetToken(
    userId: string,
    token: string,
    expirySeconds: number = 3600,
  ): Promise<void> {
    try {
      const key = `${this.resetPrefix}${token}`;
      await redisSet(key, userId, { ttl: expirySeconds });
    } catch (error: any) {
      logger.error("Store reset token error:", {
        error: error.message,
        userId,
      });
      throw new ApiError(500, "Failed to store reset token");
    }
  }

  public async verifyResetToken(token: string): Promise<string | null> {
    try {
      const key = `${this.resetPrefix}${token}`;
      const userId = await redisGet(key);
      return (userId as string) || null;
    } catch (error: any) {
      logger.error("Verify reset token error:", { error: error.message });
      return null;
    }
  }

  public async invalidateResetToken(token: string): Promise<void> {
    try {
      const key = `${this.resetPrefix}${token}`;
      await redisDel(key);
    } catch (error: any) {
      logger.error("Invalidate reset token error:", { error: error.message });
    }
  }

  public generateResetToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  public generateVerificationToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  public isWeakPassword(password: string): boolean {
    const strength = this.assessPasswordStrength(password);
    return !strength.isStrong;
  }

  public async updatePasswordPolicy(
    policy: Partial<PasswordPolicy>,
  ): Promise<void> {
    Object.assign(this.passwordPolicy, policy);
    logger.info("Password policy updated:", policy);
  }

  public getPasswordPolicy(): PasswordPolicy {
    return { ...this.passwordPolicy };
  }

  public async hashWithArgon2(password: string): Promise<string> {
    try {
      const salt = crypto.randomBytes(16);
      const iterations = 100000;
      const keyLength = 32;
      const hash = crypto.pbkdf2Sync(
        password,
        salt,
        iterations,
        keyLength,
        "sha256",
      );
      return `argon2:${salt.toString("hex")}:${hash.toString("hex")}:${iterations}`;
    } catch (error: any) {
      logger.error("Argon2 hash error:", { error: error.message });
      throw new ApiError(500, "Failed to hash password");
    }
  }

  public async verifyArgon2(
    password: string,
    hashed: string,
  ): Promise<boolean> {
    try {
      const parts = hashed.split(":");
      if (parts.length !== 4 || parts[0] !== "argon2") {
        return false;
      }

      const salt = Buffer.from(parts[1], "hex");
      const expectedHash = Buffer.from(parts[2], "hex");
      const iterations = parseInt(parts[3], 10);

      const hash = crypto.pbkdf2Sync(
        password,
        salt,
        iterations,
        expectedHash.length,
        "sha256",
      );

      return crypto.timingSafeEqual(hash, expectedHash);
    } catch (error: any) {
      logger.error("Argon2 verify error:", { error: error.message });
      return false;
    }
  }
}

export const passwordService = PasswordService.getInstance();
export default passwordService;
