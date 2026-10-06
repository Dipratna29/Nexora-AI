import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AdminUser, AdminRole } from '../types';
import api from '../lib/api';
import { supabase } from '../lib/supabase';
import { hasPermission as checkRolePerm } from '../utils/permissions';

interface AuthContextType {
  user: AdminUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  permissions: string[];
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (roles: AdminRole | AdminRole[]) => boolean;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(() => {
    const saved = localStorage.getItem('trusttrip_admin_user');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('trusttrip_admin_token');
  });

  const [permissions, setPermissions] = useState<string[]>(() => {
    const saved = localStorage.getItem('trusttrip_admin_permissions');
    try {
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Validate session on mount
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('trusttrip_admin_token');
      if (storedToken) {
        try {
          const res = await api.get('/api/admin/auth/me');
          if (res.success && res.user) {
            setUser(res.user);
            setPermissions(res.permissions || []);
            localStorage.setItem('trusttrip_admin_user', JSON.stringify(res.user));
            localStorage.setItem('trusttrip_admin_permissions', JSON.stringify(res.permissions || []));
          } else {
            logout();
          }
        } catch {
          logout();
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    try {
      const res = await api.post('/api/admin/auth/login', { email, password });
      if (res.success && res.token && res.user) {
        setToken(res.token);
        setUser(res.user);
        setPermissions(res.permissions || []);
        localStorage.setItem('trusttrip_admin_token', res.token);
        localStorage.setItem('trusttrip_admin_user', JSON.stringify(res.user));
        localStorage.setItem('trusttrip_admin_permissions', JSON.stringify(res.permissions || []));
      } else {
        throw new Error(res.message || 'Login failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut().catch(() => {});
    } catch {
      // ignore
    }
    setUser(null);
    setToken(null);
    setPermissions([]);
    localStorage.removeItem('trusttrip_admin_token');
    localStorage.removeItem('trusttrip_admin_user');
    localStorage.removeItem('trusttrip_admin_permissions');
  }, []);

  const hasRole = (roles: AdminRole | AdminRole[]): boolean => {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN') return true;
    if (Array.isArray(roles)) {
      return roles.includes(user.role);
    }
    return user.role === roles;
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    return checkRolePerm(user.role, permission);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        permissions,
        login,
        logout,
        hasRole,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
