import mongoose, {
  ConnectOptions,
  Connection,
  Mongoose,
  Model,
  Document,
} from "mongoose";
import { env, getMongoURI, isDevelopment, isTest } from "./env";
import { logger } from "../utils/logger";
import { performance } from "perf_hooks";
import { EventEmitter } from "events";

interface DatabaseMetrics {
  connections: number;
  queries: number;
  queryTime: number;
  errors: number;
  lastQueryTime: Date | null;
  activeConnections: number;
  connectionAttempts: number;
  connectionFailures: number;
}

class DatabaseConnection extends EventEmitter {
  private static instance: DatabaseConnection;
  private connection: Connection | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private metrics: DatabaseMetrics = {
    connections: 0,
    queries: 0,
    queryTime: 0,
    errors: 0,
    lastQueryTime: null,
    activeConnections: 0,
    connectionAttempts: 0,
    connectionFailures: 0,
  };
  private queryStats: Map<string, { count: number; totalTime: number }> =
    new Map();
  private connectionPool: Set<mongoose.Connection> = new Set();

  private constructor() {
    super();
    this.setupMongooseEvents();
  }

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  private setupMongooseEvents(): void {
    mongoose.connection.on("connected", () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.metrics.connections++;
      logger.info("✅ MongoDB connected successfully");
      this.emit("connected");
    });

    mongoose.connection.on("error", (error: Error) => {
      this.metrics.errors++;
      logger.error("MongoDB connection error:", { error: error.message });
      this.emit("error", error);
    });

    mongoose.connection.on("disconnected", () => {
      this.isConnected = false;
      logger.warn("MongoDB disconnected");
      this.emit("disconnected");
      this.attemptReconnection();
    });

    mongoose.connection.on("reconnected", () => {
      this.isConnected = true;
      logger.info("MongoDB reconnected");
      this.emit("reconnected");
    });

    mongoose.connection.on("close", () => {
      this.isConnected = false;
      logger.warn("MongoDB connection closed");
      this.emit("closed");
    });

    mongoose.connection.on("open", () => {
      logger.info("MongoDB connection opened");
      this.emit("open");
    });

    mongoose.connection.on("fullsetup", () => {
      logger.info("MongoDB replica set full setup");
      this.emit("fullsetup");
    });

    mongoose.connection.on("all", () => {
      logger.info("MongoDB all connections ready");
      this.emit("all");
    });

    process.on("SIGINT", async () => {
      await this.closeConnection();
      process.exit(0);
    });
  }

  private async attemptReconnection(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error("Max reconnect attempts reached. Giving up.");
      this.emit("maxAttemptsReached");
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      30000,
    );

    logger.info(
      `Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms...`,
    );

    setTimeout(async () => {
      try {
        await this.connect();
      } catch (error: any) {
        logger.error("Reconnection attempt failed:", { error: error.message });
        this.attemptReconnection();
      }
    }, delay);
  }

  public async connect(): Promise<Mongoose> {
    this.metrics.connectionAttempts++;
    const startTime = performance.now();

    try {
      const uri = getMongoURI();

      const options: ConnectOptions = {
        retryWrites: env.MONGODB_OPTIONS_RETRY_WRITES,
        w: env.MONGODB_OPTIONS_W,
        journal: env.MONGODB_OPTIONS_JOURNAL,
        readPreference: env.MONGODB_OPTIONS_READ_PREFERENCE as any,
        maxPoolSize: env.MONGODB_OPTIONS_MAX_POOL_SIZE,
        minPoolSize: env.MONGODB_OPTIONS_MIN_POOL_SIZE,
        maxIdleTimeMS: env.MONGODB_OPTIONS_MAX_IDLE_TIME_MS,
        connectTimeoutMS: env.MONGODB_OPTIONS_CONNECT_TIMEOUT_MS,
        socketTimeoutMS: env.MONGODB_OPTIONS_SOCKET_TIMEOUT_MS,
        serverSelectionTimeoutMS:
          env.MONGODB_OPTIONS_SERVER_SELECTION_TIMEOUT_MS,
        heartbeatFrequencyMS: env.MONGODB_OPTIONS_HEARTBEAT_FREQUENCY_MS,
        appName: env.MONGODB_OPTIONS_APP_NAME,
        autoIndex: isDevelopment || isTest,
        autoCreate: isDevelopment || isTest,
        family: 4,
        compressors: ["snappy", "zlib"],
        retryReads: true,
        replicaSet: env.MONGODB_REPLICA_SET,
        authSource: env.MONGODB_AUTH_SOURCE,
        authMechanism: env.MONGODB_AUTH_MECHANISM as any,
        tls: env.MONGODB_TLS_ENABLED,
        tlsAllowInvalidCertificates: isDevelopment,
        tlsAllowInvalidHostnames: isDevelopment,
        tlsCAFile: env.MONGODB_TLS_CA_FILE,
        tlsCertificateKeyFile: env.MONGODB_TLS_CERT_FILE,
        tlsCertificateKeyFilePassword: env.MONGODB_TLS_CERT_PASSWORD,
        srv: env.MONGODB_SRV_ENABLED,
        srvServiceName: env.MONGODB_SRV_SERVICE_NAME,
        directConnection: env.MONGODB_DIRECT_CONNECTION,
        loadBalanced: env.MONGODB_LOAD_BALANCED,
        maxStalenessSeconds: env.MONGODB_MAX_STALENESS_SECONDS,
        enableUtf8Validation: true,
        waitQueueTimeoutMS: env.MONGODB_WAIT_QUEUE_TIMEOUT,
        serverApi: {
          version: "1",
          strict: true,
          deprecationErrors: true,
        },
      };

      const connection = await mongoose.connect(uri, options);
      this.connection = mongoose.connection;
      this.isConnected = true;
      this.metrics.activeConnections = (mongoose.connection as any).readyState;

      const duration = (performance.now() - startTime) / 1000;
      this.metrics.queryTime += duration;

      logger.info(`MongoDB connected successfully in ${duration.toFixed(2)}s`);

      return connection;
    } catch (error: any) {
      this.metrics.connectionFailures++;
      logger.error("MongoDB connection failed:", {
        error: error.message,
        code: error.code,
        codeName: error.codeName,
        stack: error.stack,
      });

      this.emit("connectionFailed", error);

      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        await this.attemptReconnection();
      }

      throw error;
    }
  }

  public async closeConnection(): Promise<void> {
    try {
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.close();
        this.isConnected = false;
        this.connection = null;
        logger.info("MongoDB connection closed successfully");
        this.emit("closed");
      }
    } catch (error: any) {
      logger.error("Error closing MongoDB connection:", {
        error: error.message,
      });
      throw error;
    }
  }

  public getConnection(): Connection | null {
    return this.connection;
  }

  public isConnectionReady(): boolean {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  public getMetrics(): DatabaseMetrics {
    return { ...this.metrics };
  }

  public resetMetrics(): void {
    this.metrics = {
      connections: 0,
      queries: 0,
      queryTime: 0,
      errors: 0,
      lastQueryTime: null,
      activeConnections: 0,
      connectionAttempts: 0,
      connectionFailures: 0,
    };
    this.queryStats.clear();
  }

  public getQueryStats(): Record<
    string,
    { count: number; averageTime: number }
  > {
    const stats: Record<string, { count: number; averageTime: number }> = {};
    for (const [key, value] of this.queryStats) {
      stats[key] = {
        count: value.count,
        averageTime: value.totalTime / value.count,
      };
    }
    return stats;
  }

  public async transaction<T>(
    callback: (session: any) => Promise<T>,
  ): Promise<T> {
    const session = await mongoose.startSession();
    let result: T;

    try {
      session.startTransaction();
      result = await callback(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  public async createConnectionPool(
    size: number = 5,
  ): Promise<mongoose.Connection[]> {
    const connections: mongoose.Connection[] = [];
    const baseUri = getMongoURI();

    for (let i = 0; i < size; i++) {
      try {
        const conn = await mongoose.createConnection(baseUri, {
          maxPoolSize: 1,
          minPoolSize: 1,
        });
        connections.push(conn);
        this.connectionPool.add(conn);
        this.metrics.connections++;
      } catch (error: any) {
        logger.error(`Failed to create connection pool member ${i}:`, {
          error: error.message,
        });
      }
    }

    logger.info(
      `Created database connection pool with ${connections.length} connections`,
    );
    return connections;
  }

  public async closeConnectionPool(): Promise<void> {
    const promises = Array.from(this.connectionPool).map((conn) =>
      conn.close().catch((error) => {
        logger.error("Error closing connection pool member:", {
          error: error.message,
        });
      }),
    );

    await Promise.all(promises);
    this.connectionPool.clear();
    this.metrics.connections = 0;
    logger.info("Database connection pool closed");
  }

  public async healthCheck(): Promise<{
    status: string;
    latency: number;
    error?: string;
  }> {
    const start = performance.now();

    try {
      if (!this.isConnectionReady()) {
        throw new Error("Database not connected");
      }

      const result = await mongoose.connection.db.admin().ping();
      const latency = (performance.now() - start) / 1000;

      return {
        status: "healthy",
        latency,
      };
    } catch (error: any) {
      return {
        status: "unhealthy",
        latency: (performance.now() - start) / 1000,
        error: error.message,
      };
    }
  }
}

const dbInstance = DatabaseConnection.getInstance();

export const connectDB = (): Promise<Mongoose> => dbInstance.connect();
export const closeDB = (): Promise<void> => dbInstance.closeConnection();
export const getDB = (): Connection | null => dbInstance.getConnection();
export const isDBReady = (): boolean => dbInstance.isConnectionReady();
export const getDBMetrics = (): DatabaseMetrics => dbInstance.getMetrics();
export const getQueryStats = () => dbInstance.getQueryStats();
export const dbTransaction = <T>(
  callback: (session: any) => Promise<T>,
): Promise<T> => dbInstance.transaction(callback);
export const healthCheckDB = () => dbInstance.healthCheck();

mongoose.set("debug", (collectionName, method, query, doc) => {
  const start = performance.now();

  (query as any).exec = (function (originalExec) {
    return function (...args: any[]) {
      return originalExec.apply(this, args).then((result: any) => {
        const duration = performance.now() - start;

        if (duration > 100) {
          logger.warn("Slow query detected:", {
            collection: collectionName,
            method,
            duration: `${duration.toFixed(2)}ms`,
            query: JSON.stringify(query),
            doc: doc ? JSON.stringify(doc) : undefined,
          });
        }

        const stats = dbInstance["queryStats"];
        const key = `${collectionName}.${method}`;
        if (!stats.has(key)) {
          stats.set(key, { count: 0, totalTime: 0 });
        }
        const stat = stats.get(key)!;
        stat.count++;
        stat.totalTime += duration;

        return result;
      });
    };
  })((query as any).exec);
});

mongoose.set("sanitizeFilter", true);
mongoose.set("sanitizeProjection", true);
mongoose.set("trustedConnection", true);

export default mongoose;
