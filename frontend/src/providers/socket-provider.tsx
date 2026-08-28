'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'react-hot-toast';
import { logger } from '@/lib/logger';
import { env } from '@/lib/env';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => void;
  disconnect: () => void;
  emit: (event: string, data?: any) => void;
  on: (event: string, callback: (data: any) => void) => void;
  off: (event: string, callback?: (data: any) => void) => void;
  joinRoom: (room: string) => void;
  leaveRoom: (room: string) => void;
  joinTaskRoom: (taskId: string) => void;
  leaveTaskRoom: (taskId: string) => void;
  joinTeamRoom: (teamId: string) => void;
  leaveTeamRoom: (teamId: string) => void;
  joinUserRoom: (userId: string) => void;
  leaveUserRoom: (userId: string) => void;
  getSocketId: () => string | null;
  reconnect: () => void;
}

const SocketContext = createContext<SocketContextType | null>(null);

interface SocketProviderProps {
  children: ReactNode;
  options?: {
    autoConnect?: boolean;
    reconnection?: boolean;
    reconnectionAttempts?: number;
    reconnectionDelay?: number;
    reconnectionDelayMax?: number;
    timeout?: number;
  };
}

export function SocketProvider({ children, options = {} }: SocketProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const eventListeners = useRef<Map<string, Set<(data: any) => void>>>(new Map());
  const { user, isAuthenticated, getToken } = useAuth();

  const defaultOptions = {
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
    ...options,
  };

  const connectSocket = useCallback(() => {
    if (socketRef.current?.connected) {
      return;
    }

    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }

    setIsConnecting(true);

    const token = getToken();
    const socketInstance = io(env.wsUrl || '/socket.io', {
      ...defaultOptions,
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      query: {
        userId: user?.id,
        device: 'web',
        version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      },
      forceNew: true,
      multiplex: true,
      autoConnect: false,
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
      setIsConnecting(false);
      reconnectAttempts.current = 0;
      logger.info('Socket connected');
      
      if (user?.id) {
        socketInstance.emit('user:online', { userId: user.id });
      }
    });

    socketInstance.on('disconnect', (reason) => {
      setIsConnected(false);
      logger.info('Socket disconnected:', { reason });
      
      if (reason === 'io server disconnect') {
        reconnectAttempts.current = 0;
        setTimeout(() => {
          socketInstance.connect();
        }, 1000);
      }
    });

    socketInstance.on('connect_error', (error) => {
      setIsConnecting(false);
      logger.error('Socket connection error:', { error: error.message });
      
      if (reconnectAttempts.current < (defaultOptions.reconnectionAttempts || 5)) {
        reconnectAttempts.current++;
        const delay = Math.min(
          (defaultOptions.reconnectionDelay || 1000) * Math.pow(2, reconnectAttempts.current - 1),
          defaultOptions.reconnectionDelayMax || 5000
        );
        
        reconnectTimeout.current = setTimeout(() => {
          socketInstance.connect();
        }, delay);
      } else {
        toast.error('Unable to connect to real-time service. Please refresh the page.');
      }
    });

    socketInstance.on('reconnect_attempt', (attempt) => {
      logger.info('Socket reconnection attempt:', { attempt });
    });

    socketInstance.on('reconnect_failed', () => {
      setIsConnecting(false);
      toast.error('Real-time connection failed. Some features may not work.');
    });

    socketInstance.on('error', (error) => {
      logger.error('Socket error:', { error });
    });

    socketInstance.on('notification', (data) => {
      if (data.type === 'task_assigned') {
        toast.success(`Task "${data.title}" assigned to you`);
      } else if (data.type === 'task_completed') {
        toast.success(`Task "${data.title}" completed`);
      } else if (data.type === 'task_overdue') {
        toast.error(`Task "${data.title}" is overdue`);
      } else if (data.type === 'team_invite') {
        toast.success(`You've been invited to join "${data.teamName}"`);
      } else if (data.type === 'mention') {
        toast.info(`You were mentioned in "${data.context}"`);
      }
    });

    socketInstance.connect();
    socketRef.current = socketInstance;
    setSocket(socketInstance);
  }, [user, getToken, defaultOptions]);

  const disconnectSocket = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current.removeAllListeners();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
      setIsConnecting(false);
      logger.info('Socket disconnected manually');
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && user) {
      connectSocket();
    } else {
      disconnectSocket();
    }

    return () => {
      disconnectSocket();
    };
  }, [isAuthenticated, user, connectSocket, disconnectSocket]);

  const emit = useCallback((event: string, data?: any) => {
    if (!socketRef.current || !isConnected) {
      logger.warn('Socket not connected, event not sent:', { event });
      return;
    }

    socketRef.current.emit(event, data);
  }, [isConnected]);

  const on = useCallback((event: string, callback: (data: any) => void) => {
    if (!socketRef.current) {
      logger.warn('Socket not initialized, event listener not added:', { event });
      return;
    }

    if (!eventListeners.current.has(event)) {
      eventListeners.current.set(event, new Set());
    }

    eventListeners.current.get(event)?.add(callback);
    socketRef.current.on(event, callback);
  }, []);

  const off = useCallback((event: string, callback?: (data: any) => void) => {
    if (!socketRef.current) {
      return;
    }

    if (callback) {
      socketRef.current.off(event, callback);
      eventListeners.current.get(event)?.delete(callback);
    } else {
      socketRef.current.off(event);
      eventListeners.current.delete(event);
    }
  }, []);

  const joinRoom = useCallback((room: string) => {
    if (!socketRef.current || !isConnected) {
      logger.warn('Socket not connected, cannot join room:', { room });
      return;
    }

    socketRef.current.emit('join', { room });
  }, [isConnected]);

  const leaveRoom = useCallback((room: string) => {
    if (!socketRef.current || !isConnected) {
      return;
    }

    socketRef.current.emit('leave', { room });
  }, [isConnected]);

  const joinTaskRoom = useCallback((taskId: string) => {
    joinRoom(`task:${taskId}`);
  }, [joinRoom]);

  const leaveTaskRoom = useCallback((taskId: string) => {
    leaveRoom(`task:${taskId}`);
  }, [leaveRoom]);

  const joinTeamRoom = useCallback((teamId: string) => {
    joinRoom(`team:${teamId}`);
  }, [joinRoom]);

  const leaveTeamRoom = useCallback((teamId: string) => {
    leaveRoom(`team:${teamId}`);
  }, [leaveRoom]);

  const joinUserRoom = useCallback((userId: string) => {
    joinRoom(`user:${userId}`);
  }, [joinRoom]);

  const leaveUserRoom = useCallback((userId: string) => {
    leaveRoom(`user:${userId}`);
  }, [leaveRoom]);

  const getSocketId = useCallback(() => {
    return socketRef.current?.id || null;
  }, []);

  const reconnect = useCallback(() => {
    disconnectSocket();
    setTimeout(() => {
      connectSocket();
    }, 500);
  }, [connectSocket, disconnectSocket]);

  const value: SocketContextType = {
    socket,
    isConnected,
    isConnecting,
    connect: connectSocket,
    disconnect: disconnectSocket,
    emit,
    on,
    off,
    joinRoom,
    leaveRoom,
    joinTaskRoom,
    leaveTaskRoom,
    joinTeamRoom,
    leaveTeamRoom,
    joinUserRoom,
    leaveUserRoom,
    getSocketId,
    reconnect,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket(): SocketContextType {
  const context = useContext(SocketContext);
  
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  
  return context;
}

export default SocketProvider;