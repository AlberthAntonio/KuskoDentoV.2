
"use client";

import { useState, useEffect, createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { db, User } from '@/lib/db';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
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
        setUser(JSON.parse(session));
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
          lastLogin: new Date().toISOString()
        };
        await db.put('users', authenticatedUser);
      } else {
        authenticatedUser = { ...existingSuper, status: 'active', lastLogin: new Date().toISOString() };
        await db.put('users', authenticatedUser);
      }
    }
    // 2. Verificar credenciales maestras de Consultorio
    else if (username === 'consultorio1' && password === 'consultorio1') {
      const existingClinic = users.find(u => u.username === 'consultorio1');
      if (!existingClinic) {
        authenticatedUser = { 
          id: 'clinic-master-1', 
          username: 'consultorio1', 
          password: 'consultorio1',
          role: 'clinic',
          fullName: 'Consultorio Dental 1',
          status: 'active',
          lastLogin: new Date().toISOString()
        };
        await db.put('users', authenticatedUser);
      } else {
        authenticatedUser = { ...existingClinic, status: 'active', lastLogin: new Date().toISOString() };
        await db.put('users', authenticatedUser);
      }
    }
    // 3. Buscar en la base de datos para el resto del personal
    else {
      const foundUser = users.find(u => u.username === username && u.password === password);
      if (foundUser) {
        authenticatedUser = { ...foundUser, status: 'active', lastLogin: new Date().toISOString() };
        await db.put('users', authenticatedUser);
      }
    }

    if (authenticatedUser) {
      setUser(authenticatedUser);
      localStorage.setItem('kd_session', JSON.stringify(authenticatedUser));
      return true;
    }
    
    return false;
  };

  const logout = async () => {
    if (user) {
      // Marcar como inactivo al cerrar sesión
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
