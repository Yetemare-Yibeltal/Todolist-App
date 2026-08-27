import dotenv from "dotenv";
import { z } from "zod";
import { join } from "path";
import { existsSync } from "fs";

dotenv.config({ path: join(__dirname, "../../.env") });

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "staging", "production", "test"])
    .default("development"),
  PORT: z.string().transform(Number).default("5000"),
  API_VERSION: z.string().default("v1"),
  API_PREFIX: z.string().default("/api"),
  HOST: z.string().default("0.0.0.0"),
  SHUTDOWN_TIMEOUT: z.string().transform(Number).default("10000"),

  MONGODB_URI: z.string().url(),
  MONGODB_URI_PROD: z.string().url().optional(),
  MONGODB_URI_TEST: z.string().url().optional(),
  MONGODB_OPTIONS_RETRY_WRITES: z
    .string()
    .transform((v) => v === "true")
    .default("true"),
  MONGODB_OPTIONS_W: z.string().default("1"),
  MONGODB_OPTIONS_JOURNAL: z
    .string()
    .transform((v) => v === "true")
    .default("true"),
  MONGODB_OPTIONS_READ_PREFERENCE: z.string().default("primaryPreferred"),
  MONGODB_OPTIONS_MAX_POOL_SIZE: z.string().transform(Number).default("10"),
  MONGODB_OPTIONS_MIN_POOL_SIZE: z.string().transform(Number).default("2"),
  MONGODB_OPTIONS_MAX_IDLE_TIME_MS: z
    .string()
    .transform(Number)
    .default("300000"),
  MONGODB_OPTIONS_CONNECT_TIMEOUT_MS: z
    .string()
    .transform(Number)
    .default("30000"),
  MONGODB_OPTIONS_SOCKET_TIMEOUT_MS: z
    .string()
    .transform(Number)
    .default("45000"),
  MONGODB_OPTIONS_SERVER_SELECTION_TIMEOUT_MS: z
    .string()
    .transform(Number)
    .default("30000"),
  MONGODB_OPTIONS_HEARTBEAT_FREQUENCY_MS: z
    .string()
    .transform(Number)
    .default("10000"),
  MONGODB_OPTIONS_APP_NAME: z.string().default("TodoListAPI"),

  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z.string().transform(Number).default("6379"),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.string().transform(Number).default("0"),
  REDIS_URL: z.string().url().optional(),
  REDIS_EXPIRE_TIME: z.string().transform(Number).default("3600"),
  REDIS_CONNECT_TIMEOUT: z.string().transform(Number).default("10000"),
  REDIS_MAX_RETRIES: z.string().transform(Number).default("3"),
  REDIS_RETRY_DELAY: z.string().transform(Number).default("1000"),

  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  JWT_ISSUER: z.string().default("todolist-api"),
  JWT_AUDIENCE: z.string().default("todolist-app"),
  JWT_ALGORITHM: z.enum(["HS256", "HS384", "HS512"]).default("HS256"),

  EMAIL_HOST: z.string().optional(),
  EMAIL_PORT: z.string().transform(Number).optional(),
  EMAIL_SECURE: z
    .string()
    .transform((v) => v === "true")
    .default("false"),
  EMAIL_USER: z.string().email().optional(),
  EMAIL_PASS: z.string().optional(),
  EMAIL_FROM: z.string().email().default("noreply@todolist.com"),
  EMAIL_VERIFICATION_SUBJECT: z.string().default("Verify Your Email"),
  EMAIL_VERIFICATION_TEMPLATE: z.string().default("email-verification"),
  EMAIL_RESET_SUBJECT: z.string().default("Reset Your Password"),
  EMAIL_RESET_TEMPLATE: z.string().default("password-reset"),
  EMAIL_WELCOME_SUBJECT: z.string().default("Welcome to TodoList"),
  EMAIL_WELCOME_TEMPLATE: z.string().default("welcome"),
  EMAIL_INVITE_SUBJECT: z.string().default("You're Invited"),
  EMAIL_INVITE_TEMPLATE: z.string().default("invite"),

  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().default("us-east-1"),
  AWS_S3_BUCKET: z.string().optional(),
  AWS_S3_UPLOAD_FOLDER: z.string().default("uploads"),
  AWS_S3_TEMP_FOLDER: z.string().default("temp"),
  AWS_S3_MAX_FILE_SIZE: z.string().transform(Number).default("5242880"),
  AWS_S3_ALLOWED_TYPES: z
    .string()
    .default("image/jpeg,image/png,image/gif,image/webp"),
  AWS_S3_CDN_URL: z.string().url().optional(),

  RATE_LIMIT_WINDOW: z.string().transform(Number).default("15"),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default("100"),
  RATE_LIMIT_STRICT_WINDOW: z.string().transform(Number).default("60"),
  RATE_LIMIT_STRICT_MAX: z.string().transform(Number).default("50"),
  RATE_LIMIT_AUTH_WINDOW: z.string().transform(Number).default("60"),
  RATE_LIMIT_AUTH_MAX: z.string().transform(Number).default("5"),
  RATE_LIMIT_API_WINDOW: z.string().transform(Number).default("60"),
  RATE_LIMIT_API_MAX: z.string().transform(Number).default("1000"),

  BCRYPT_ROUNDS: z.string().transform(Number).default("12"),
  CSRF_ENABLED: z
    .string()
    .transform((v) => v === "true")
    .default("false"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  CORS_ALLOWED_ORIGINS: z
    .string()
    .default("http://localhost:3000,https://yourdomain.com"),
  CORS_ALLOWED_METHODS: z.string().default("GET,POST,PUT,DELETE,PATCH"),
  CORS_ALLOWED_HEADERS: z
    .string()
    .default("Content-Type,Authorization,X-Requested-With"),
  HELMET_ENABLED: z
    .string()
    .transform((v) => v === "true")
    .default("true"),
  HELMET_HSTS_MAX_AGE: z.string().transform(Number).default("31536000"),
  HELMET_HSTS_INCLUDE_SUBDOMAINS: z
    .string()
    .transform((v) => v === "true")
    .default("true"),
  HELMET_HSTS_PRELOAD: z
    .string()
    .transform((v) => v === "true")
    .default("true"),

  SESSION_SECRET: z
    .string()
    .min(32)
    .default("your-session-secret-change-in-production"),
  SESSION_MAX_AGE: z.string().transform(Number).default("604800000"),
  SESSION_SECURE: z
    .string()
    .transform((v) => v === "true")
    .default("false"),
  SESSION_HTTP_ONLY: z
    .string()
    .transform((v) => v === "true")
    .default("true"),
  SESSION_SAME_SITE: z.enum(["strict", "lax", "none"]).default("lax"),
  SESSION_RESAVE: z
    .string()
    .transform((v) => v === "true")
    .default("false"),
  SESSION_SAVE_UNINITIALIZED: z
    .string()
    .transform((v) => v === "true")
    .default("false"),

  COOKIE_SECURE: z
    .string()
    .transform((v) => v === "true")
    .default("false"),
  COOKIE_HTTP_ONLY: z
    .string()
    .transform((v) => v === "true")
    .default("true"),
  COOKIE_SAME_SITE: z.enum(["strict", "lax", "none"]).default("lax"),
  COOKIE_MAX_AGE: z.string().transform(Number).default("604800000"),
  COOKIE_DOMAIN: z.string().default("localhost"),

  UPLOAD_MAX_FILE_SIZE: z.string().transform(Number).default("5242880"),
  UPLOAD_MAX_FILES: z.string().transform(Number).default("5"),
  UPLOAD_ALLOWED_TYPES: z
    .string()
    .default("image/jpeg,image/png,image/gif,image/webp,application/pdf"),
  UPLOAD_DESTINATION: z.string().default("./uploads"),
  UPLOAD_TEMP_DIR: z.string().default("./temp"),
  UPLOAD_FILE_NAME_LENGTH: z.string().transform(Number).default("16"),

  SWAGGER_ENABLED: z
    .string()
    .transform((v) => v === "true")
    .default("true"),
  SWAGGER_TITLE: z.string().default("TodoList API"),
  SWAGGER_DESCRIPTION: z.string().default("Enterprise-grade TodoList API"),
  SWAGGER_VERSION: z.string().default("1.0.0"),
  SWAGGER_BASE_PATH: z.string().default("/api/v1"),

  LOG_LEVEL: z
    .enum(["error", "warn", "info", "debug", "trace"])
    .default("debug"),
  LOG_FILE_PATH: z.string().default("./logs"),
  LOG_MAX_SIZE: z.string().transform(Number).default("10485760"),
  LOG_MAX_FILES: z.string().transform(Number).default("5"),
  LOG_FORMAT: z.enum(["json", "pretty"]).default("json"),
  LOG_RETENTION_DAYS: z.string().transform(Number).default("30"),
  LOG_COMPRESS: z
    .string()
    .transform((v) => v === "true")
    .default("true"),

  SENTRY_DSN: z.string().url().optional(),
  SENTRY_ENVIRONMENT: z.string().default("development"),
  SENTRY_TRACES_SAMPLE_RATE: z.string().transform(Number).default("0.1"),
  NEW_RELIC_APP_NAME: z.string().optional(),
  NEW_RELIC_LICENSE_KEY: z.string().optional(),

  WS_ENABLED: z
    .string()
    .transform((v) => v === "true")
    .default("true"),
  WS_PATH: z.string().default("/socket.io"),
  WS_CORS_ORIGIN: z.string().default("http://localhost:3000"),
  WS_MAX_HTTP_BUFFER_SIZE: z.string().transform(Number).default("1e6"),
  WS_PING_INTERVAL: z.string().transform(Number).default("25000"),
  WS_PING_TIMEOUT: z.string().transform(Number).default("5000"),

  CACHE_TTL: z.string().transform(Number).default("3600"),
  CACHE_CHECK_PERIOD: z.string().transform(Number).default("600"),
  CACHE_MAX_SIZE: z.string().transform(Number).default("1000"),
  CACHE_PREFIX: z.string().default("todolist:"),
  CACHE_ENABLED: z
    .string()
    .transform((v) => v === "true")
    .default("true"),

  PUSH_NOTIFICATION_ENABLED: z
    .string()
    .transform((v) => v === "true")
    .default("false"),
  PUSH_NOTIFICATION_KEY: z.string().optional(),
  SMS_ENABLED: z
    .string()
    .transform((v) => v === "true")
    .default("false"),
  SMS_ACCOUNT_SID: z.string().optional(),
  SMS_AUTH_TOKEN: z.string().optional(),
  SMS_FROM_NUMBER: z.string().optional(),

  QUEUE_ENABLED: z
    .string()
    .transform((v) => v === "true")
    .default("true"),
  QUEUE_REDIS_HOST: z.string().default("localhost"),
  QUEUE_REDIS_PORT: z.string().transform(Number).default("6379"),
  QUEUE_REDIS_PASSWORD: z.string().optional(),
  QUEUE_CONCURRENCY: z.string().transform(Number).default("5"),
  QUEUE_RETRY_ATTEMPTS: z.string().transform(Number).default("3"),
  QUEUE_RETRY_DELAY: z.string().transform(Number).default("5000"),
  QUEUE_STALLED_INTERVAL: z.string().transform(Number).default("30000"),
  QUEUE_MAX_STALLED_COUNT: z.string().transform(Number).default("3"),

  BACKUP_ENABLED: z
    .string()
    .transform((v) => v === "true")
    .default("true"),
  BACKUP_PATH: z.string().default("./backups"),
  BACKUP_RETENTION_DAYS: z.string().transform(Number).default("7"),
  BACKUP_SCHEDULE: z.string().default("0 0 * * *"),

  FEATURE_TEAM_COLLABORATION: z
    .string()
    .transform((v) => v === "true")
    .default("true"),
  FEATURE_ATTACHMENTS: z
    .string()
    .transform((v) => v === "true")
    .default("true"),
  FEATURE_COMMENTS: z
    .string()
    .transform((v) => v === "true")
    .default("true"),
  FEATURE_SUBTASKS: z
    .string()
    .transform((v) => v === "true")
    .default("true"),
  FEATURE_LABELS: z
    .string()
    .transform((v) => v === "true")
    .default("true"),
  FEATURE_PRIORITY: z
    .string()
    .transform((v) => v === "true")
    .default("true"),
  FEATURE_DUE_DATE: z
    .string()
    .transform((v) => v === "true")
    .default("true"),
  FEATURE_REMINDERS: z
    .string()
    .transform((v) => v === "true")
    .default("true"),
  FEATURE_RECURRING: z
    .string()
    .transform((v) => v === "true")
    .default("true"),
  FEATURE_TEMPLATES: z
    .string()
    .transform((v) => v === "true")
    .default("true"),
  FEATURE_ARCHIVE: z
    .string()
    .transform((v) => v === "true")
    .default("true"),
  FEATURE_TRASH: z
    .string()
    .transform((v) => v === "true")
    .default("true"),
  FEATURE_STATS: z
    .string()
    .transform((v) => v === "true")
    .default("true"),
  FEATURE_REPORTS: z
    .string()
    .transform((v) => v === "true")
    .default("true"),
  FEATURE_EXPORT: z
    .string()
    .transform((v) => v === "true")
    .default("true"),
  FEATURE_IMPORT: z
    .string()
    .transform((v) => v === "true")
    .default("true"),
  FEATURE_SEARCH: z
    .string()
    .transform((v) => v === "true")
    .default("true"),
  FEATURE_FILTERS: z
    .string()
    .transform((v) => v === "true")
    .default("true"),
  FEATURE_SORTS: z
    .string()
    .transform((v) => v === "true")
    .default("true"),
  FEATURE_PAGINATION: z
    .string()
    .transform((v) => v === "true")
    .default("true"),
  FEATURE_RATE_LIMITING: z
    .string()
    .transform((v) => v === "true")
    .default("true"),
  FEATURE_REQUEST_LOGGING: z
    .string()
    .transform((v) => v === "true")
    .default("true"),
  FEATURE_ERROR_LOGGING: z
    .string()
    .transform((v) => v === "true")
    .default("true"),
  FEATURE_PERFORMANCE_LOGGING: z
    .string()
    .transform((v) => v === "true")
    .default("true"),

  I18N_ENABLED: z
    .string()
    .transform((v) => v === "true")
    .default("true"),
  I18N_DEFAULT_LOCALE: z.string().default("en"),
  I18N_FALLBACK_LOCALE: z.string().default("en"),
  I18N_LOCALES: z.string().default("en,es,fr,de,zh,ja"),

  TIMEZONE: z.string().default("UTC"),
  DATE_FORMAT: z.string().default("YYYY-MM-DD"),
  DATETIME_FORMAT: z.string().default("YYYY-MM-DD HH:mm:ss"),

  DEV_TOOLS_ENABLED: z
    .string()
    .transform((v) => v === "true")
    .default("true"),
  DEV_SEED_DATABASE: z
    .string()
    .transform((v) => v === "true")
    .default("false"),
  DEV_CLEAR_CACHE_ON_START: z
    .string()
    .transform((v) => v === "true")
    .default("false"),
  DEV_LOG_SQL: z
    .string()
    .transform((v) => v === "true")
    .default("false"),
  DEV_AUTO_MIGRATE: z
    .string()
    .transform((v) => v === "true")
    .default("false"),

  DOCKER_CONTAINER_NAME: z.string().default("todolist-backend"),
  DOCKER_IMAGE_NAME: z.string().default("todolist-backend"),
  DOCKER_TAG: z.string().default("latest"),
});

export type EnvConfig = z.infer<typeof envSchema>;

function validateEnv(): EnvConfig {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("❌ Invalid environment variables:");
    result.error.errors.forEach((err) => {
      console.error(`  - ${err.path.join(".")}: ${err.message}`);
    });
    process.exit(1);
  }

  return result.data;
}

export const env = validateEnv();

export const isDevelopment = env.NODE_ENV === "development";
export const isStaging = env.NODE_ENV === "staging";
export const isProduction = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";

export const getMongoURI = (): string => {
  if (isTest && env.MONGODB_URI_TEST) return env.MONGODB_URI_TEST;
  if (isProduction && env.MONGODB_URI_PROD) return env.MONGODB_URI_PROD;
  return env.MONGODB_URI;
};

export const getCorsOrigins = (): string[] => {
  return env.CORS_ALLOWED_ORIGINS.split(",").map((origin) => origin.trim());
};

export const getAllowedFileTypes = (): string[] => {
  return env.UPLOAD_ALLOWED_TYPES.split(",").map((type) => type.trim());
};

export const getLocales = (): string[] => {
  return env.I18N_LOCALES.split(",").map((locale) => locale.trim());
};

export const getFeatureFlags = (): Record<string, boolean> => {
  return {
    teamCollaboration: env.FEATURE_TEAM_COLLABORATION,
    attachments: env.FEATURE_ATTACHMENTS,
    comments: env.FEATURE_COMMENTS,
    subtasks: env.FEATURE_SUBTASKS,
    labels: env.FEATURE_LABELS,
    priority: env.FEATURE_PRIORITY,
    dueDate: env.FEATURE_DUE_DATE,
    reminders: env.FEATURE_REMINDERS,
    recurring: env.FEATURE_RECURRING,
    templates: env.FEATURE_TEMPLATES,
    archive: env.FEATURE_ARCHIVE,
    trash: env.FEATURE_TRASH,
    stats: env.FEATURE_STATS,
    reports: env.FEATURE_REPORTS,
    export: env.FEATURE_EXPORT,
    import: env.FEATURE_IMPORT,
    search: env.FEATURE_SEARCH,
    filters: env.FEATURE_FILTERS,
    sorts: env.FEATURE_SORTS,
    pagination: env.FEATURE_PAGINATION,
    rateLimiting: env.FEATURE_RATE_LIMITING,
    requestLogging: env.FEATURE_REQUEST_LOGGING,
    errorLogging: env.FEATURE_ERROR_LOGGING,
    performanceLogging: env.FEATURE_PERFORMANCE_LOGGING,
  };
};

export default env;
