
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
    
    // 1. Verificar credenciales maestras de Super Administrador
    if (username === 'superadmin' && password === 'superadmin') {
      const existingSuper = users.find(u => u.username === 'superadmin');
      if (!existingSuper) {
        const superUser: User = { 
          id: 'su-admin-master', 
          username: 'superadmin', 
          password: 'superadmin',
          role: 'superadmin',
          fullName: 'Súper Administrador'
        };
        await db.put('users', superUser);
        setUser(superUser);
        localStorage.setItem('kd_session', JSON.stringify(superUser));
        return true;
      } else {
        setUser(existingSuper);
        localStorage.setItem('kd_session', JSON.stringify(existingSuper));
        return true;
      }
    }

    // 2. Verificar credenciales maestras de Consultorio
    if (username === 'consultorio1' && password === 'consultorio1') {
      const existingClinic = users.find(u => u.username === 'consultorio1');
      if (!existingClinic) {
        const clinicUser: User = { 
          id: 'clinic-master-1', 
          username: 'consultorio1', 
          password: 'consultorio1',
          role: 'clinic',
          fullName: 'Consultorio Dental 1'
        };
        await db.put('users', clinicUser);
        setUser(clinicUser);
        localStorage.setItem('kd_session', JSON.stringify(clinicUser));
        return true;
      } else {
        setUser(existingClinic);
        localStorage.setItem('kd_session', JSON.stringify(existingClinic));
        return true;
      }
    }

    // 3. Buscar en la base de datos para el resto del personal
    const foundUser = users.find(u => u.username === username && u.password === password);
    if (foundUser) {
      setUser(foundUser);
      localStorage.setItem('kd_session', JSON.stringify(foundUser));
      return true;
    }
    
    return false;
  };

  const logout = () => {
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
