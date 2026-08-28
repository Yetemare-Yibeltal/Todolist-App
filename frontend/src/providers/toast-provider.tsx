'use client';

import { Toaster, ToastOptions, ToastPosition } from 'react-hot-toast';
import { useState, useEffect, useCallback } from 'react';
import { X, Check, AlertCircle, Info, AlertTriangle } from 'lucide-react';

interface ToastProviderProps {
  children: React.ReactNode;
  options?: {
    position?: ToastPosition;
    duration?: number;
    pauseOnHover?: boolean;
    pauseOnFocusLoss?: boolean;
    className?: string;
    style?: React.CSSProperties;
  };
}

interface ToastConfig {
  success: (message: string, options?: ToastOptions) => string;
  error: (message: string, options?: ToastOptions) => string;
  info: (message: string, options?: ToastOptions) => string;
  warn: (message: string, options?: ToastOptions) => string;
  loading: (message: string, options?: ToastOptions) => string;
  dismiss: (id?: string) => void;
  dismissAll: () => void;
  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: (data: T) => string;
      error: (error: any) => string;
    },
    options?: ToastOptions
  ) => Promise<T>;
  custom: (component: React.ReactNode, options?: ToastOptions) => string;
  update: (id: string, options: ToastOptions) => void;
}

const defaultOptions: ToastOptions = {
  duration: 5000,
  position: 'top-right',
  className: 'rounded-lg shadow-lg',
  style: {
    maxWidth: '500px',
    padding: '16px',
    borderRadius: '8px',
    fontWeight: '500',
  },
  icon: null,
  iconTheme: {
    primary: '#000',
    secondary: '#fff',
  },
  ariaProps: {
    role: 'status',
    'aria-live': 'polite',
  },
};

const toastIcons = {
  success: Check,
  error: AlertCircle,
  info: Info,
  warn: AlertTriangle,
  loading: undefined,
};

const toastColors = {
  success: 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-200',
  error: 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-200',
  info: 'bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200',
  warn: 'bg-yellow-50 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200',
  loading: 'bg-gray-50 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
};

export function ToastProvider({ children, options = {} }: ToastProviderProps) {
  const [toastCount, setToastCount] = useState(0);
  const [toastInstances, setToastInstances] = useState<Map<string, any>>(new Map());

  const getToastOptions = useCallback((type: keyof typeof toastColors): ToastOptions => {
    const color = toastColors[type];
    return {
      ...defaultOptions,
      ...options,
      className: `${defaultOptions.className} ${color}`,
      icon: toastIcons[type] ? <toastIcons[type] className="w-5 h-5" /> : undefined,
      duration: type === 'loading' ? Infinity : (options.duration || 5000),
    };
  }, [options]);

  const getIcon = useCallback((type: keyof typeof toastIcons) => {
    const Icon = toastIcons[type];
    return Icon ? <Icon className="w-5 h-5" /> : null;
  }, []);

  const toast = {
    success: (message: string, opts?: ToastOptions) => {
      const id = globalThis.toast?.success(message, {
        ...getToastOptions('success'),
        ...opts,
      });
      return id;
    },
    error: (message: string, opts?: ToastOptions) => {
      const id = globalThis.toast?.error(message, {
        ...getToastOptions('error'),
        ...opts,
      });
      return id;
    },
    info: (message: string, opts?: ToastOptions) => {
      const id = globalThis.toast?.custom(
        (t) => (
          <div className="flex items-center gap-3">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0" />
            <span>{message}</span>
            <button
              onClick={() => globalThis.toast?.dismiss(t.id)}
              className="ml-auto text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ),
        {
          ...getToastOptions('info'),
          ...opts,
        }
      );
      return id;
    },
    warn: (message: string, opts?: ToastOptions) => {
      const id = globalThis.toast?.custom(
        (t) => (
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
            <span>{message}</span>
            <button
              onClick={() => globalThis.toast?.dismiss(t.id)}
              className="ml-auto text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ),
        {
          ...getToastOptions('warn'),
          ...opts,
        }
      );
      return id;
    },
    loading: (message: string, opts?: ToastOptions) => {
      const id = globalThis.toast?.loading(message, {
        ...getToastOptions('loading'),
        ...opts,
      });
      return id;
    },
    dismiss: (id?: string) => {
      if (id) {
        globalThis.toast?.dismiss(id);
      }
    },
    dismissAll: () => {
      globalThis.toast?.dismiss();
    },
    promise: async <T>(
      promise: Promise<T>,
      messages: {
        loading: string;
        success: (data: T) => string;
        error: (error: any) => string;
      },
      opts?: ToastOptions
    ) => {
      const id = toast.loading(messages.loading, opts);
      
      try {
        const data = await promise;
        toast.success(messages.success(data), { id });
        return data;
      } catch (error) {
        toast.error(messages.error(error), { id });
        throw error;
      }
    },
    custom: (component: React.ReactNode, opts?: ToastOptions) => {
      const id = globalThis.toast?.custom(component, {
        ...defaultOptions,
        ...options,
        ...opts,
        className: `${defaultOptions.className} ${opts?.className || ''}`,
      });
      return id;
    },
    update: (id: string, opts: ToastOptions) => {
      globalThis.toast?.update(id, {
        ...defaultOptions,
        ...options,
        ...opts,
      });
    },
  };

  useEffect(() => {
    (globalThis as any).toast = toast;
    
    return () => {
      delete (globalThis as any).toast;
    };
  }, []);

  return (
    <>
      {children}
      <Toaster
        position={options.position || 'top-right'}
        gutter={8}
        containerStyle={{
          margin: '8px',
          zIndex: 99999,
        }}
        toastOptions={{
          duration: options.duration || 5000,
          className: 'rounded-lg shadow-lg font-medium',
          style: {
            maxWidth: '500px',
            padding: '16px',
            borderRadius: '8px',
          },
          success: {
            className: 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-200',
            icon: <Check className="w-5 h-5" />,
          },
          error: {
            className: 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-200',
            icon: <AlertCircle className="w-5 h-5" />,
          },
          loading: {
            className: 'bg-gray-50 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
          },
          blank: {
            className: 'bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-200',
          },
        }}
      />
    </>
  );
}

export const useToast = (): ToastConfig => {
  const toast = (globalThis as any).toast;
  
  if (!toast) {
    console.warn('Toast not initialized. Please wrap your app with ToastProvider.');
    return {
      success: () => '',
      error: () => '',
      info: () => '',
      warn: () => '',
      loading: () => '',
      dismiss: () => {},
      dismissAll: () => {},
      promise: async <T>(promise: Promise<T>, messages: any) => {
        return await promise;
      },
      custom: () => '',
      update: () => {},
    };
  }
  
  return toast;
};

export default ToastProvider;