import { z } from "zod";
import * as dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.string().default("5000").transform(Number),
  API_VERSION: z.string().default("v1"),

  // Database
  DATABASE_URL: z.string().url(),

  // JWT
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_ACCESS_EXPIRATION: z.string().default("15m"),
  JWT_REFRESH_EXPIRATION: z.string().default("7d"),

  // Security
  BCRYPT_SALT_ROUNDS: z.string().default("12").transform(Number),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  RATE_LIMIT_WINDOW_MS: z.string().default("900000").transform(Number),
  RATE_LIMIT_MAX_REQUESTS: z.string().default("100").transform(Number),

  // Logging
  LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),
  LOG_FORMAT: z
    .enum(["combined", "common", "dev", "short", "tiny"])
    .default("combined"),
});

const env = envSchema.safeParse(process.env);

if (!env.success) {
  console.error("❌ Invalid environment variables:", env.error.format());
  process.exit(1);
}

export const config = {
  ...env.data,
  isProduction: env.data.NODE_ENV === "production",
  isDevelopment: env.data.NODE_ENV === "development",
  isTest: env.data.NODE_ENV === "test",
};

export default config;
