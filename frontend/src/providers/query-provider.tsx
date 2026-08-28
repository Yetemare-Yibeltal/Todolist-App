'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  QueryClient,
  QueryClientProvider as TanstackQueryProvider,
  QueryCache,
  MutationCache,
  QueryClientConfig,
  DefaultOptions,
} from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { toast } from 'react-hot-toast';
import { logger } from '@/lib/logger';
import { env } from '@/lib/env';

interface QueryProviderProps {
  children: React.ReactNode;
}

class QueryErrorHandler {
  private static instance: QueryErrorHandler;
  private errorCounts: Map<string, number> = new Map();
  private errorTimeout: Map<string, NodeJS.Timeout> = new Map();
  private readonly MAX_ERRORS = 5;
  private readonly RESET_INTERVAL = 60000;

  private constructor() {}

  public static getInstance(): QueryErrorHandler {
    if (!QueryErrorHandler.instance) {
      QueryErrorHandler.instance = new QueryErrorHandler();
    }
    return QueryErrorHandler.instance;
  }

  public handleError(error: any, queryKey?: string[]): void {
    const key = queryKey?.join('-') || 'global';
    const count = this.errorCounts.get(key) || 0;
    this.errorCounts.set(key, count + 1);

    if (this.errorTimeout.has(key)) {
      clearTimeout(this.errorTimeout.get(key));
    }

    this.errorTimeout.set(
      key,
      setTimeout(() => {
        this.errorCounts.delete(key);
      }, this.RESET_INTERVAL)
    );

    if (this.errorCounts.get(key) && this.errorCounts.get(key)! > this.MAX_ERRORS) {
      logger.error('Too many errors for query:', { key, count: this.errorCounts.get(key) });
      this.errorCounts.delete(key);
    }

    if (error?.response?.status === 401) {
      // Handle unauthorized - will be caught by auth provider
      return;
    }

    if (error?.response?.status === 429) {
      toast.error('Too many requests. Please wait before trying again.');
      return;
    }

    if (error?.response?.status >= 500) {
      toast.error('Server error. Please try again later.');
      return;
    }

    if (error?.message) {
      toast.error(error.message);
    }
  }

  public clearErrors(): void {
    this.errorCounts.clear();
    for (const timeout of this.errorTimeout.values()) {
      clearTimeout(timeout);
    }
    this.errorTimeout.clear();
  }
}

const defaultOptions: DefaultOptions = {
  queries: {
    retry: 3,
    retryDelay: (attemptIndex: number) => Math.min(1000 * Math.pow(2, attemptIndex), 30000),
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: true,
    suspense: false,
    useErrorBoundary: false,
    enabled: true,
    networkMode: 'online',
    retryOnMount: true,
    refetchInterval: false,
    refetchIntervalInBackground: false,
    notifyOnChangeProps: 'tracked',
    structuralSharing: true,
  },
  mutations: {
    retry: 2,
    retryDelay: (attemptIndex: number) => Math.min(1000 * Math.pow(2, attemptIndex), 10000),
    useErrorBoundary: false,
    networkMode: 'online',
    onError: (error: any) => {
      logger.error('Mutation error:', error);
    },
  },
};

const queryCache = new QueryCache({
  onError: (error: any, query) => {
    const errorHandler = QueryErrorHandler.getInstance();
    errorHandler.handleError(error, query?.queryKey as string[]);
  },
  onSuccess: (data) => {
    logger.debug('Query success:', { data });
  },
});

const mutationCache = new MutationCache({
  onError: (error: any, _variables, _context, mutation) => {
    const errorHandler = QueryErrorHandler.getInstance();
    errorHandler.handleError(error, mutation?.options?.mutationKey as string[]);
  },
  onSuccess: (data) => {
    logger.debug('Mutation success:', { data });
  },
});

const queryClientConfig: QueryClientConfig = {
  defaultOptions,
  queryCache,
  mutationCache,
};

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(() => new QueryClient(queryClientConfig));
  const [isDevtoolsVisible, setIsDevtoolsVisible] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && env.NODE_ENV === 'development') {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'd' && e.ctrlKey && e.shiftKey) {
          e.preventDefault();
          setIsDevtoolsVisible(prev => !prev);
        }
      };
      
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      queryClient.resumePausedMutations();
      queryClient.refetchQueries({ type: 'active' });
      toast.success('Connection restored');
    };

    const handleOffline = () => {
      toast.error('Connection lost. Working offline...');
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
    };
  }, [queryClient]);

  useEffect(() => {
    const errorHandler = QueryErrorHandler.getInstance();
    const interval = setInterval(() => {
      errorHandler.clearErrors();
    }, 300000);

    return () => clearInterval(interval);
  }, []);

  const clearQueryCache = useCallback(() => {
    queryClient.clear();
    toast.success('Cache cleared');
  }, [queryClient]);

  const resetQueryCache = useCallback(() => {
    queryClient.resetQueries();
    toast.success('Queries reset');
  }, [queryClient]);

  const getQueryStats = useCallback(() => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    return {
      total: queries.length,
      active: queries.filter(q => q.state.status === 'success').length,
      loading: queries.filter(q => q.state.status === 'loading').length,
      error: queries.filter(q => q.state.status === 'error').length,
      stale: queries.filter(q => q.isStale).length,
      inactive: queries.filter(q => !q.isActive()).length,
    };
  }, [queryClient]);

  const prefetchQueries = useCallback(async () => {
    const queries = queryClient.getQueryCache().getAll();
    const prefetchPromises = queries.map(query => {
      if (query.isStale && query.isActive()) {
        return query.fetch();
      }
      return Promise.resolve();
    });
    
    await Promise.all(prefetchPromises);
    logger.info('Queries prefetched');
  }, [queryClient]);

  const getQueryData = useCallback(<T>(queryKey: string[]): T | undefined => {
    return queryClient.getQueryData<T>(queryKey);
  }, [queryClient]);

  const setQueryData = useCallback(<T>(queryKey: string[], data: T): void => {
    queryClient.setQueryData(queryKey, data);
  }, [queryClient]);

  const invalidateQueries = useCallback((queryKey: string[]): Promise<void> => {
    return queryClient.invalidateQueries({ queryKey });
  }, [queryClient]);

  const refetchQueries = useCallback((queryKey: string[]): Promise<void> => {
    return queryClient.refetchQueries({ queryKey });
  }, [queryClient]);

  const removeQueries = useCallback((queryKey: string[]): void => {
    queryClient.removeQueries({ queryKey });
  }, [queryClient]);

  const cancelQueries = useCallback((queryKey: string[]): Promise<void> => {
    return queryClient.cancelQueries({ queryKey });
  }, [queryClient]);

  return (
    <TanstackQueryProvider client={queryClient}>
      {children}
      {typeof window !== 'undefined' && (
        <>
          <ReactQueryDevtools
            initialIsOpen={isDevtoolsVisible}
            toggleButtonProps={{
              style: {
                position: 'fixed',
                bottom: '20px',
                right: '20px',
                zIndex: 9999,
              },
            }}
          />
        </>
      )}
    </TanstackQueryProvider>
  );
}

export {
  QueryProvider,
  queryClientConfig,
  queryCache,
  mutationCache,
  defaultOptions,
  QueryErrorHandler,
};

export default QueryProvider;