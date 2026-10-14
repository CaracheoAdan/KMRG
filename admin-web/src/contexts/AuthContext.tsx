import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import api from '../lib/api';

export interface User {
  id: string;
  email: string;
}

export interface AuthContextType {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('kmrg_token');
  });

  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('kmrg_user');
    if (savedUser) {
      try {
        return JSON.parse(savedUser) as User;
      } catch {
        localStorage.removeItem('kmrg_user');
        return null;
      }
    }
    return null;
  });

  // On mount, check localStorage for existing token/user and hydrate state
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('kmrg_token');
      const storedUser = localStorage.getItem('kmrg_user');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser) as User);
      } else if (!storedToken || !storedUser) {
        setToken(null);
        setUser(null);
      }
    } catch (error) {
      console.error('Error hydrating authentication state:', error);
      localStorage.removeItem('kmrg_token');
      localStorage.removeItem('kmrg_user');
      setToken(null);
      setUser(null);
    }
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    const response = await api.post('/auth/login', { email, password });
    const payload = response.data?.data || response.data;

    const authToken: string = payload.token;
    const authUser: User = payload.user;

    if (!authToken || !authUser) {
      throw new Error('Respuesta de autenticación incompleta');
    }

    localStorage.setItem('kmrg_token', authToken);
    localStorage.setItem('kmrg_user', JSON.stringify(authUser));

    setToken(authToken);
    setUser(authUser);
  }, []);

  const logout = useCallback((): void => {
    localStorage.removeItem('kmrg_token');
    localStorage.removeItem('kmrg_user');
    setToken(null);
    setUser(null);
  }, []);

  const isAuthenticated = Boolean(token && user);

  const value = useMemo<AuthContextType>(
    () => ({
      token,
      user,
      isAuthenticated,
      login,
      logout,
    }),
    [token, user, isAuthenticated, login, logout]
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
