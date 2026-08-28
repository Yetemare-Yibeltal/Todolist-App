import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { toast } from 'react-hot-toast';
import Cookies from 'js-cookie';
import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger';
import { env } from './env';

interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Array<{ field: string; message: string }>;
  meta?: {
    duration: string;
    timestamp: string;
    pagination?: {
      total: number;
      page: number;
      totalPages: number;
      limit: number;
    };
  };
}

interface QueueItem {
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
  config: AxiosRequestConfig;
}

class ApiClient {
  private static instance: ApiClient;
  private client: AxiosInstance;
  private refreshTokenPromise: Promise<string> | null = null;
  private isRefreshing = false;
  private queue: QueueItem[] = [];
  private maxRetries = 3;
  private retryDelay = 1000;
  private offlineQueue: QueueItem[] = [];
  private isOnline = true;

  private constructor() {
    this.client = axios.create({
      baseURL: env.apiUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Client-ID': uuidv4(),
        'X-App-Version': process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      },
    });

    this.setupInterceptors();
    this.setupNetworkHandlers();
    this.setupRetryLogic();
  }

  public static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  private setupInterceptors(): void {
    this.client.interceptors.request.use(
      this.handleRequest,
      this.handleRequestError
    );

    this.client.interceptors.response.use(
      this.handleResponse,
      this.handleResponseError
    );
  }

  private handleRequest = (config: AxiosRequestConfig): AxiosRequestConfig => {
    const token = this.getAccessToken();
    
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      };
    }

    const refreshToken = Cookies.get('refreshToken');
    if (refreshToken) {
      config.headers = {
        ...config.headers,
        'X-Refresh-Token': refreshToken,
      };
    }

    config.headers = {
      ...config.headers,
      'X-Request-ID': uuidv4(),
      'X-Request-Time': Date.now().toString(),
    };

    return config;
  };

  private handleRequestError = (error: any): Promise<any> => {
    logger.error('Request error:', error);
    return Promise.reject(error);
  };

  private handleResponse = (response: AxiosResponse): AxiosResponse => {
    if (response.config.method !== 'get') {
      toast.success('Operation completed successfully');
    }
    return response;
  };

  private handleResponseError = async (error: AxiosError): Promise<any> => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
    
    if (error.response) {
      const status = error.response.status;
      
      if (status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        return this.handleTokenRefresh(originalRequest);
      }
      
      if (status === 429) {
        const retryAfter = error.response.headers['retry-after'] || 60;
        toast.error(`Too many requests. Please wait ${retryAfter} seconds.`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        return this.client.request(originalRequest);
      }
      
      if (status === 403) {
        toast.error('You do not have permission to perform this action');
      } else if (status === 404) {
        toast.error('Resource not found');
      } else if (status >= 500) {
        toast.error('Server error. Please try again later.');
      } else if (status === 400 && error.response.data) {
        const data = error.response.data as any;
        if (data.errors && Array.isArray(data.errors)) {
          data.errors.forEach((err: any) => {
            toast.error(err.message || 'Validation error');
          });
        } else {
          toast.error(data.message || 'Bad request');
        }
      }
    } else if (error.request) {
      toast.error('Network error. Please check your connection.');
      this.handleOfflineRequest(originalRequest);
    } else {
      toast.error('An unexpected error occurred');
    }

    return Promise.reject(error);
  };

  private handleTokenRefresh = async (originalRequest: AxiosRequestConfig & { _retry?: boolean }): Promise<any> => {
    try {
      if (this.isRefreshing) {
        return new Promise((resolve, reject) => {
          this.queue.push({ resolve, reject, config: originalRequest });
        });
      }

      this.isRefreshing = true;
      this.refreshTokenPromise = this.performTokenRefresh();

      const newToken = await this.refreshTokenPromise;
      this.setAccessToken(newToken);

      this.isRefreshing = false;
      this.processQueue(null, newToken);

      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
      }

      return this.client.request(originalRequest);
    } catch (error) {
      this.isRefreshing = false;
      this.processQueue(error);
      
      toast.error('Session expired. Please login again.');
      this.logout();
      
      throw error;
    }
  };

  private performTokenRefresh = async (): Promise<string> => {
    try {
      const refreshToken = Cookies.get('refreshToken');
      
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await this.client.post('/auth/refresh', {
        refreshToken,
      });

      const { accessToken, refreshToken: newRefreshToken } = response.data.data;
      
      if (newRefreshToken) {
        Cookies.set('refreshToken', newRefreshToken, {
          secure: true,
          sameSite: 'lax',
          expires: 7,
        });
      }

      return accessToken;
    } catch (error) {
      throw new Error('Failed to refresh token');
    }
  };

  private processQueue = (error: any | null, token: string | null = null): void => {
    this.queue.forEach(promise => {
      if (error) {
        promise.reject(error);
      } else if (token) {
        if (promise.config.headers) {
          promise.config.headers.Authorization = `Bearer ${token}`;
        }
        this.client.request(promise.config)
          .then(promise.resolve)
          .catch(promise.reject);
      }
    });
    this.queue = [];
  };

  private setupNetworkHandlers(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }
  }

  private handleOnline = (): void => {
    this.isOnline = true;
    toast.success('Connection restored');
    this.processOfflineQueue();
  };

  private handleOffline = (): void => {
    this.isOnline = false;
    toast.error('You are offline. Changes will be synced when you reconnect.');
  };

  private handleOfflineRequest = (config: AxiosRequestConfig): void => {
    if (config.method?.toLowerCase() !== 'get') {
      this.offlineQueue.push({
        resolve: () => {},
        reject: () => {},
        config,
      });
      
      toast.info('Request saved for offline sync');
    }
  };

  private processOfflineQueue = async (): Promise<void> => {
    while (this.offlineQueue.length > 0) {
      const item = this.offlineQueue.shift();
      if (item) {
        try {
          await this.client.request(item.config);
        } catch (error) {
          this.offlineQueue.push(item);
          break;
        }
      }
    }
  };

  private setupRetryLogic(): void {
    this.client.defaults.retry = this.maxRetries;
    this.client.defaults.retryDelay = (retryCount: number) => {
      return this.retryDelay * Math.pow(2, retryCount);
    };
  }

  private getAccessToken(): string | null {
    return Cookies.get('accessToken') || null;
  }

  private setAccessToken(token: string): void {
    Cookies.set('accessToken', token, {
      secure: true,
      sameSite: 'lax',
      expires: 1 / 24,
    });
  }

  private logout(): void {
    Cookies.remove('accessToken');
    Cookies.remove('refreshToken');
    window.location.href = '/login';
  }

  public async get<T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await this.client.get<ApiResponse<T>>(url, config);
    return response.data;
  }

  public async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await this.client.post<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  public async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await this.client.put<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  public async patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await