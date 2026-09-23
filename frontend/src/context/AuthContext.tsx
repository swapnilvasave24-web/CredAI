import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Role } from '../types';
import { authLogin, authRegister, authLogout } from '../services/api';

interface User { id: number; name: string; email: string; role: Role; }

interface AuthCtx {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('credai_token'));
  const [user, setUser] = useState<User | null>(() => {
    const s = localStorage.getItem('credai_user');
    return s ? JSON.parse(s) : null;
  });

  const saveSession = useCallback((data: { access_token: string; role: Role; name: string; user_id: number }, email: string) => {
    localStorage.setItem('credai_token', data.access_token);
    const u: User = { id: data.user_id, name: data.name, email, role: data.role };
    localStorage.setItem('credai_user', JSON.stringify(u));
    setToken(data.access_token);
    setUser(u);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await authLogin(email, password);
    saveSession(data, email);
  }, [saveSession]);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const data = await authRegister(name, email, password);
    saveSession(data, email);
  }, [saveSession]);

  const logout = useCallback(() => {
    authLogout().catch(() => {});
    localStorage.removeItem('credai_token');
    localStorage.removeItem('credai_user');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
