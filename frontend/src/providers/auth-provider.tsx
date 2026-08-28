'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useAuth as useAuthHook } from '@/hooks/useAuth';
import { AuthContextType } from '@/types/auth';

interface AuthProviderProps {
  children: ReactNode;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: AuthProviderProps) {
  const auth = useAuthHook();

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextType {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  
  return context;
}

export const useAuth = useAuthContext;

export default Au'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useAuth as useAuthHook } from '@/hooks/useAuth';
import { AuthContextType } from '@/types/auth';

interface AuthProviderProps {
  children: ReactNode;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: AuthProviderProps) {
  const auth = useAuthHook();

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextType {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  
  return context;
}

export const useAuth = useAuthContext;

export default AuthProvider;thProvider;