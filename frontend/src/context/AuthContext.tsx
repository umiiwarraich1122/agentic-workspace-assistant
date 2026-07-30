import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { UserSession } from '../types';

interface AuthContextType {
  user: UserSession | null;
  login: (userId: string, name?: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check local storage for session on mount
    const storedUser = localStorage.getItem('jarvis_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = useCallback((userId: string, name?: string) => {
    const session = { userId, name };
    setUser(session);
    localStorage.setItem('jarvis_user', JSON.stringify(session));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('jarvis_user');
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
