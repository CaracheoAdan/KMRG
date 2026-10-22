import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import api from '../lib/api';
import type { AdminUser, ApiResponse } from '../types';

export type User = AdminUser;

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Al montar, hidratar la sesión desde la cookie httpOnly consultando /auth/me
  useEffect(() => {
    let cancelled = false;
    api
      .get<ApiResponse<{ user: User }>>('/auth/me')
      .then((res) => {
        if (!cancelled) setUser(res.data?.data?.user ?? null);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    const response = await api.post<ApiResponse<{ user: User }>>('/auth/login', { email, password });
    const authUser = response.data?.data?.user;
    if (!authUser) {
      throw new Error('Respuesta de autenticación incompleta');
    }
    setUser(authUser);
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    } finally {
      setUser(null);
    }
  }, []);

  const isAuthenticated = Boolean(user);

  const value = useMemo<AuthContextType>(
    () => ({ user, isAuthenticated, isLoading, login, logout }),
    [user, isAuthenticated, isLoading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
