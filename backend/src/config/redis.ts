import {
  createClient,
  RedisClientType,
  RedisModules,
  RedisFunctions,
  RedisScripts,
} from "redis";
import { env } from "./env";
import { logger } from "../utils/logger";
import { EventEmitter } from "events";
import { performance } from "perf_hooks";

interface RedisMetrics {
  operations: number;
  errors: number;
  hits: number;
  misses: number;
  totalTime: number;
  connected: boolean;
  lastError: string | null;
  activeConnections: number;
  totalRetries: number;
  failedRetries: number;
}

class RedisConnection extends EventEmitter {
  private static instance: RedisConnection;
  private client: RedisClientType<any, any, any> | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private metrics: RedisMetrics = {
    operations: 0,
    errors: 0,
    hits: 0,
    misses: 0,
    totalTime: 0,
    connected: false,
    lastError: null,
    activeConnections: 0,
    totalRetries: 0,
    failedRetries: 0,
  };
  private operationTimings: Map<string, { count: number; totalTime: number }> =
    new Map();
  private keyStats: Map<
    string,
    { hits: number; misses: number; lastAccess: number }
  > = new Map();
  private pubClient: RedisClientType<any, any, any> | null = null;
  private subClient: RedisClientType<any, any, any> | null = null;

  private constructor() {
    super();
    this.setupEventHandlers();
  }

  public static getInstance(): RedisConnection {
    if (!RedisConnection.instance) {
      RedisConnection.instance = new RedisConnection();
    }
    return RedisConnection.instance;
  }

  private setupEventHandlers(): void {
    process.on("SIGINT", async () => {
      await this.disconnect();
      process.exit(0);
    });
  }

  private getRedisConfig() {
    return {
      url: env.REDIS_URL || `redis://${env.REDIS_HOST}:${env.REDIS_PORT}`,
      password: env.REDIS_PASSWORD,
      database: env.REDIS_DB,
      socket: {
        connectTimeout: env.REDIS_CONNECT_TIMEOUT,
        keepAlive: 30000,
        timeout: 30000,
        tls: env.REDIS_TLS_ENABLED
          ? {
              rejectUnauthorized: env.REDIS_TLS_REJECT_UNAUTHORIZED,
              ca: env.REDIS_TLS_CA,
              cert: env.REDIS_TLS_CERT,
              key: env.REDIS_TLS_KEY,
            }
          : undefined,
        reconnectStrategy: (retries: number) => {
          this.metrics.totalRetries++;
          const delay = Math.min(
            this.reconnectDelay * Math.pow(2, retries),
            30000,
          );
          logger.info(
            `Redis reconnection attempt ${retries + 1} in ${delay}ms`,
          );
          this.emit("reconnecting", { retries, delay });
          return delay;
        },
      },
      pingInterval: 10000,
      retryUnfulfilledCommands: true,
      enableAutoPipelining: true,
      enableReadyCheck: true,
      autoResubscribe: true,
      autoResendUnfulfilledCommands: true,
    };
  }

  public async connect(): Promise<RedisClientType<any, any, any>> {
    try {
      const config = this.getRedisConfig();

      this.client = createClient(config) as RedisClientType<any, any, any>;

      this.client.on("error", (error: Error) => {
        this.metrics.errors++;
        this.metrics.lastError = error.message;
        this.isConnected = false;
        logger.error("Redis client error:", { error: error.message });
        this.emit("error", error);
      });

      this.client.on("connect", () => {
        logger.info("Redis client connecting...");
        this.emit("connecting");
      });

      this.client.on("ready", () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.metrics.connected = true;
        logger.info("✅ Redis client ready");
        this.emit("ready");
      });

      this.client.on("end", () => {
        this.isConnected = false;
        this.metrics.connected = false;
        logger.warn("Redis client connection ended");
        this.emit("end");
      });

      this.client.on("reconnecting", () => {
        this.reconnectAttempts++;
        this.metrics.totalRetries++;
        logger.info(
          `Redis client reconnecting (${this.reconnectAttempts} attempts)`,
        );
        this.emit("reconnecting");
      });

      this.client.on("close", () => {
        this.isConnected = false;
        this.metrics.connected = false;
        logger.warn("Redis client connection closed");
        this.emit("close");
      });

      await this.client.connect();

      if (env.WS_ENABLED) {
        this.pubClient = this.client.duplicate();
        this.subClient = this.client.duplicate();

        await Promise.all([this.pubClient.connect(), this.subClient.connect()]);

        logger.info("✅ Redis pub/sub clients initialized");
      }

      return this.client;
    } catch (error: any) {
      this.metrics.failedRetries++;
      logger.error("Failed to connect to Redis:", { error: error.message });
      this.emit("connectFailed", error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      if (this.pubClient) {
        await this.pubClient.quit();
        this.pubClient = null;
      }
      if (this.subClient) {
        await this.subClient.quit();
        this.subClient = null;
      }
      if (this.client) {
        await this.client.quit();
        this.client = null;
      }
      this.isConnected = false;
      this.metrics.connected = false;
      logger.info("Redis disconnected successfully");
      this.emit("disconnected");
    } catch (error: any) {
      logger.error("Error disconnecting Redis:", { error: error.message });
      throw error;
    }
  }

  public getClient(): RedisClientType<any, any, any> {
    if (!this.client || !this.isConnected) {
      throw new Error("Redis client is not connected");
    }
    return this.client;
  }

  public getPubClient(): RedisClientType<any, any, any> {
    if (!this.pubClient || !this.isConnected) {
      throw new Error("Redis pub client is not connected");
    }
    return this.pubClient;
  }

  public getSubClient(): RedisClientType<any, any, any> {
    if (!this.subClient || !this.isConnected) {
      throw new Error("Redis sub client is not connected");
    }
    return this.subClient;
  }

  public isReady(): boolean {
    return this.isConnected && this.client !== null;
  }

  public getMetrics(): RedisMetrics {
    return { ...this.metrics };
  }

  public resetMetrics(): void {
    this.metrics = {
      operations: 0,
      errors: 0,
      hits: 0,
      misses: 0,
      totalTime: 0,
      connected: this.isConnected,
      lastError: null,
      activeConnections: 0,
      totalRetries: 0,
      failedRetries: 0,
    };
    this.operationTimings.clear();
    this.keyStats.clear();
  }

  public async set(
    key: string,
    value: any,
    options?: {
      ttl?: number;
      nx?: boolean;
      xx?: boolean;
    },
  ): Promise<boolean> {
    const start = performance.now();
    this.metrics.operations++;

    try {
      const client = this.getClient();
      const serialized =
        typeof value === "string" ? value : JSON.stringify(value);

      let result;
      if (options?.ttl) {
        if (options.nx) {
          result = await client.set(key, serialized, {
            EX: options.ttl,
            NX: true,
          });
        } else if (options.xx) {
          result = await client.set(key, serialized, {
            EX: options.ttl,
            XX: true,
          });
        } else {
          result = await client.setEx(key, options.ttl, serialized);
        }
      } else {
        if (options?.nx) {
          result = await client.setNX(key, serialized);
        } else if (options?.xx) {
          result = await client.setXX(key, serialized);
        } else {
          result = await client.set(key, serialized);
        }
      }

      this.recordOperation("set", start);
      return result === "OK" || result === true;
    } catch (error: any) {
      this.metrics.errors++;
      logger.error("Redis set error:", { key, error: error.message });
      throw error;
    }
  }

  public async get<T = any>(key: string): Promise<T | null> {
    const start = performance.now();
    this.metrics.operations++;

    try {
      const client = this.getClient();
      const result = await client.get(key);

      const keyStat = this.keyStats.get(key) || {
        hits: 0,
        misses: 0,
        lastAccess: 0,
      };
      keyStat.lastAccess = Date.now();

      if (result) {
        this.metrics.hits++;
        keyStat.hits++;
        this.keyStats.set(key, keyStat);
        this.recordOperation("get", start);
        return JSON.parse(result) as T;
      } else {
        this.metrics.misses++;
        keyStat.misses++;
        this.keyStats.set(key, keyStat);
        this.recordOperation("get", start);
        return null;
      }
    } catch (error: any) {
      this.metrics.errors++;
      logger.error("Redis get error:", { key, error: error.message });
      throw error;
    }
  }

  public async del(key: string | string[]): Promise<number> {
    const start = performance.now();
    this.metrics.operations++;

    try {
      const client = this.getClient();
      const result = await client.del(key);
      this.recordOperation("del", start);
      return result;
    } catch (error: any) {
      this.metrics.errors++;
      logger.error("Redis del error:", { key, error: error.message });
      throw error;
    }
  }

  public async exists(key: string | string[]): Promise<number> {
    const start = performance.now();
    this.metrics.operations++;

    try {
      const client = this.getClient();
      const result = await client.exists(key);
      this.recordOperation("exists", start);
      return result;
    } catch (error: any) {
      this.metrics.errors++;
      logger.error("Redis exists error:", { key, error: error.message });
      throw error;
    }
  }

  public async expire(key: string, seconds: number): Promise<boolean> {
    const start = performance.now();
    this.metrics.operations++;

    try {
      const client = this.getClient();
      const result = await client.expire(key, seconds);
      this.recordOperation("expire", start);
      return result === 1;
    } catch (error: any) {
      this.metrics.errors++;
      logger.error("Redis expire error:", { key, error: error.message });
      throw error;
    }
  }

  public async ttl(key: string): Promise<number> {
    const start = performance.now();
    this.metrics.operations++;

    try {
      const client = this.getClient();
      const result = await client.ttl(key);
      this.recordOperation("ttl", start);
      return result;
    } catch (error: any) {
      this.metrics.errors++;
      logger.error("Redis ttl error:", { key, error: error.message });
      throw error;
    }
  }

  public async hset(key: string, field: string, value: any): Promise<number> {
    const start = performance.now();
    this.metrics.operations++;

    try {
      const client = this.getClient();
      const result = await client.hSet(key, field, JSON.stringify(value));
      this.recordOperation("hset", start);
      return result;
    } catch (error: any) {
      this.metrics.errors++;
      logger.error("Redis hset error:", { key, field, error: error.message });
      throw error;
    }
  }

  public async hget<T = any>(key: string, field: string): Promise<T | null> {
    const start = performance.now();
    this.metrics.operations++;

    try {
      const client = this.getClient();
      const result = await client.hGet(key, field);
      this.recordOperation("hget", start);
      return result ? (JSON.parse(result) as T) : null;
    } catch (error: any) {
      this.metrics.errors++;
      logger.error("Redis hget error:", { key, field, error: error.message });
      throw error;
    }
  }

  public async hdel(key: string, field: string): Promise<number> {
    const start = performance.now();
    this.metrics.operations++;

    try {
      const client = this.getClient();
      const result = await client.hDel(key, field);
      this.recordOperation("hdel", start);
      return result;
    } catch (error: any) {
      this.metrics.errors++;
      logger.error("Redis hdel error:", { key, field, error: error.message });
      throw error;
    }
  }

  public async hgetall<T = any>(key: string): Promise<Record<string, T>> {
    const start = performance.now();
    this.metrics.operations++;

    try {
      const client = this.getClient();
      const result = await client.hGetAll(key);
      this.recordOperation("hgetall", start);

      const parsed: Record<string, T> = {};
      for (const [field, value] of Object.entries(result)) {
        try {
          parsed[field] = JSON.parse(value) as T;
        } catch {
          parsed[field] = value as any;
        }
      }
      return parsed;
    } catch (error: any) {
      this.metrics.errors++;
      logger.error("Redis hgetall error:", { key, error: error.message });
      throw error;
    }
  }

  public async sadd(key: string, ...members: string[]): Promise<number> {
    const start = performance.now();
    this.metrics.operations++;

    try {
      const client = this.getClient();
      const result = await client.sAdd(key, members);
      this.recordOperation("sadd", start);
      return result;
    } catch (error: any) {
      this.metrics.errors++;
      logger.error("Redis sadd error:", { key, error: error.message });
      throw error;
    }
  }

  public async srem(key: string, ...members: string[]): Promise<number> {
    const start = performance.now();
    this.metrics.operations++;

    try {
      const client = this.getClient();
      const result = await client.sRem(key, members);
      this.recordOperation("srem", start);
      return result;
    } catch (error: any) {
      this.metrics.errors++;
      logger.error("Redis srem error:", { key, error: error.message });
      throw error;
    }
  }

  public async smembers(key: string): Promise<string[]> {
    const start = performance.now();
    this.metrics.operations++;

    try {
      const client = this.getClient();
      const result = await client.sMembers(key);
      this.recordOperation("smembers", start);
      return result;
    } catch (error: any) {
      this.metrics.errors++;
      logger.error("Redis smembers error:", { key, error: error.message });
      throw error;
    }
  }

  public async sismember(key: string, member: string): Promise<boolean> {
    const start = performance.now();
    this.metrics.operations++;

    try {
      const client = this.getClient();
      const result = await client.sIsMember(key, member);
      this.recordOperation("sismember", start);
      return result === 1;
    } catch (error: any) {
      this.metrics.errors++;
      logger.error("Redis sismember error:", {
        key,
        member,
        error: error.message,
      });
      throw error;
    }
  }

  public async publish(channel: string, message: any): Promise<number> {
    const start = performance.now();
    this.metrics.operations++;

    try {
      const client = this.getPubClient();
      const serialized =
        typeof message === "string" ? message : JSON.stringify(message);
      const result = await client.publish(channel, serialized);
      this.recordOperation("publish", start);
      return result;
    } catch (error: any) {
      this.metrics.errors++;
      logger.error("Redis publish error:", { channel, error: error.message });
      throw error;
    }
  }

  public async subscribe(
    channel: string,
    callback: (message: any) => void,
  ): Promise<void> {
    try {
      const client = this.getSubClient();

      await client.subscribe(channel, (message) => {
        try {
          const parsed = JSON.parse(message);
          callback(parsed);
        } catch {
          callback(message);
        }
      });

      logger.info(`Subscribed to Redis channel: ${channel}`);
    } catch (error: any) {
      this.metrics.errors++;
      logger.error("Redis subscribe error:", { channel, error: error.message });
      throw error;
    }
  }

  public async unsubscribe(channel: string): Promise<void> {
    try {
      const client = this.getSubClient();
      await client.unsubscribe(channel);
      logger.info(`Unsubscribed from Redis channel: ${channel}`);
    } catch (error: any) {
      this.metrics.errors++;
      logger.error("Redis unsubscribe error:", {
        channel,
        error: error.message,
      });
      throw error;
    }
  }

  private recordOperation(operation: string, start: number): void {
    const duration = performance.now() - start;
    this.metrics.totalTime += duration;

    const stat = this.operationTimings.get(operation) || {
      count: 0,
      totalTime: 0,
    };
    stat.count++;
    stat.totalTime += duration;
    this.operationTimings.set(operation, stat);

    if (duration > 100) {
      logger.warn("Slow Redis operation:", {
        operation,
        duration: `${duration.toFixed(2)}ms`,
      });
    }
  }

  public getOperationStats(): Record<
    string,
    { count: number; averageTime: number }
  > {
    const stats: Record<string, { count: number; averageTime: number }> = {};
    for (const [op, data] of this.operationTimings) {
      stats[op] = {
        count: data.count,
        averageTime: data.totalTime / data.count,
      };
    }
    return stats;
  }

  public async flushAll(): Promise<void> {
    try {
      const client = this.getClient();
      await client.flushAll();
      logger.info("Redis cache flushed");
    } catch (error: any) {
      this.metrics.errors++;
      logger.error("Redis flush error:", { error: error.message });
      throw error;
    }
  }

  public async keys(pattern: string): Promise<string[]> {
    try {
      const client = this.getClient();
      return await client.keys(pattern);
    } catch (error: any) {
      this.metrics.errors++;
      logger.error("Redis keys error:", { pattern, error: error.message });
      throw error;
    }
  }

  public async scan(
    cursor: number,
    options?: { match?: string; count?: number },
  ): Promise<{ cursor: number; keys: string[] }> {
    try {
      const client = this.getClient();
      const result = await client.scan(cursor, options);
      return {
        cursor: result.cursor,
        keys: result.keys,
      };
    } catch (error: any) {
      this.metrics.errors++;
      logger.error("Redis scan error:", {
        cursor,
        options,
        error: error.message,
      });
      throw error;
    }
  }
}

const redisInstance = RedisConnection.getInstance();

export const redisClient = redisInstance.getClient.bind(redisInstance);
export const pubClient = redisInstance.getPubClient.bind(redisInstance);
export const subClient = redisInstance.getSubClient.bind(redisInstance);
export const connectRedis = () => redisInstance.connect();
export const disconnectRedis = () => redisInstance.disconnect();
export const isRedisReady = () => redisInstance.isReady();
export const getRedisMetrics = () => redisInstance.getMetrics();
export const getRedisOperationStats = () => redisInstance.getOperationStats();
export const flushRedis = () => redisInstance.flushAll();
export const redisSet = redisInstance.set.bind(redisInstance);
export const redisGet = redisInstance.get.bind(redisInstance);
export const redisDel = redisInstance.del.bind(redisInstance);
export const redisExists = redisInstance.exists.bind(redisInstance);
export const redisExpire = redisInstance.expire.bind(redisInstance);
export const redisTTL = redisInstance.ttl.bind(redisInstance);
export const redisHSet = redisInstance.hset.bind(redisInstance);
export const redisHGet = redisInstance.hget.bind(redisInstance);
export const redisHDel = redisInstance.hdel.bind(redisInstance);
export const redisHGetAll = redisInstance.hgetall.bind(redisInstance);
export const redisSAdd = redisInstance.sadd.bind(redisInstance);
export const redisSRem = redisInstance.srem.bind(redisInstance);
export const redisSMembers = redisInstance.smembers.bind(redisInstance);
export const redisSIsMember = redisInstance.sismember.bind(redisInstance);
export const redisPublish = redisInstance.publish.bind(redisInstance);
export const redisSubscribe = redisInstance.subscribe.bind(redisInstance);
export const redisUnsubscribe = redisInstance.unsubscribe.bind(redisInstance);
export const redisKeys = redisInstance.keys.bind(redisInstance);
export const redisScan = redisInstance.scan.bind(redisInstance);

export default redisInstance;
