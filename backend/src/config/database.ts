import { PrismaClient } from "@prisma/client";
import { config } from "./env";
import logger from "../utils/logger";

class Database {
  private static instance: Database;
  private prisma: PrismaClient;

  private constructor() {
    this.prisma = new PrismaClient({
      log: config.isDevelopment ? ["query", "error", "warn"] : ["error"],
      datasources: {
        db: {
          url: config.DATABASE_URL,
        },
      },
    });
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public getClient(): PrismaClient {
    return this.prisma;
  }

  public async connect(): Promise<void> {
    try {
      await this.prisma.$connect();
      logger.info("✅ Database connected successfully");
    } catch (error) {
      logger.error("❌ Database connection failed:", error);
      process.exit(1);
    }
  }

  public async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
    logger.info("Database disconnected");
  }

  public async testConnection(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      logger.error("Database test connection failed:", error);
      return false;
    }
  }

  public async healthCheck(): Promise<{
    status: "ok" | "error";
    latency?: number;
    error?: string;
  }> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const latency = Date.now() - start;
      return { status: "ok", latency };
    } catch (error: any) {
      return { status: "error", error: error.message };
    }
  }
}

export const database = Database.getInstance();
export const prisma = database.getClient();
export default database;
