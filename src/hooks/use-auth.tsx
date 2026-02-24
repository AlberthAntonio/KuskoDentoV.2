
"use client";

import { useState, useEffect, createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { db, User } from '@/lib/db';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const session = localStorage.getItem('kd_session');
    if (session) {
      try {
        const parsed = JSON.parse(session);
        setUser(parsed);
      } catch (e) {
        localStorage.removeItem('kd_session');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    const users = await db.getAll<User>('users');
    let authenticatedUser: User | null = null;
    
    // 1. Verificar credenciales maestras de Super Administrador
    if (username === 'superadmin' && password === 'superadmin') {
      const existingSuper = users.find(u => u.username === 'superadmin');
      if (!existingSuper) {
        authenticatedUser = { 
          id: 'su-admin-master', 
          username: 'superadmin', 
          password: 'superadmin',
          role: 'superadmin',
          fullName: 'Súper Administrador',
          status: 'active',
          lastLogin: new Date().toISOString(),
          subscriptionStatus: 'active'
        };
        await db.put('users', authenticatedUser);
      } else {
        authenticatedUser = { ...existingSuper, status: 'active', lastLogin: new Date().toISOString() };
        await db.put('users', authenticatedUser);
      }
    }
    // 2. Buscar en la base de datos
    else {
      const foundUser = users.find(u => u.username === username && u.password === password);
      if (foundUser) {
        // VALIDACIÓN DE BLOQUEO
        if (foundUser.subscriptionStatus === 'blocked') {
          return { success: false, message: 'Cuenta Bloqueada. Comuníquese con el administrador.' };
        }
        
        authenticatedUser = { ...foundUser, status: 'active', lastLogin: new Date().toISOString() };
        await db.put('users', authenticatedUser);
      }
    }

    if (authenticatedUser) {
      setUser(authenticatedUser);
      localStorage.setItem('kd_session', JSON.stringify(authenticatedUser));
      return { success: true };
    }
    
    return { success: false, message: 'Credenciales incorrectas' };
  };

  const logout = async () => {
    if (user) {
      const updatedUser = { ...user, status: 'inactive' };
      await db.put('users', updatedUser);
    }
    setUser(null);
    localStorage.removeItem('kd_session');
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
