import bcrypt from "bcryptjs";
import { config } from "../config/env";
import logger from "./logger";

/**
 * Hash a password
 */
export const hashPassword = async (password: string): Promise<string> => {
  try {
    const salt = await bcrypt.genSalt(config.BCRYPT_SALT_ROUNDS);
    return await bcrypt.hash(password, salt);
  } catch (error) {
    logger.error("Password hashing failed:", error);
    throw new Error("Failed to hash password");
  }
};

/**
 * Compare password with hash
 */
export const comparePassword = async (
  password: string,
  hash: string,
): Promise<boolean> => {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    logger.error("Password comparison failed:", error);
    return false;
  }
};

/**
 * Validate password strength
 */
export const validatePasswordStrength = (
  password: string,
): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push("Password must contain at least one special character");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Generate random password
 */
export const generateRandomPassword = (length: number = 12): string => {
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";
  let password = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }

  return password;
};

/**
 * Check if password needs rehashing
 */
export const needsRehash = async (hash: string): Promise<boolean> => {
  try {
    // Check if the hash was created with current salt rounds
    const saltRounds = await bcrypt.getRounds(hash);
    return saltRounds !== config.BCRYPT_SALT_ROUNDS;
  } catch (error) {
    return true;
  }
};

export default {
  hashPassword,
  comparePassword,
  validatePasswordStrength,
  generateRandomPassword,
  needsRehash,
};
