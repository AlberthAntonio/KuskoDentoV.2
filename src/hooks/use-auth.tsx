
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

// ÚNICAS CUENTAS ADMINISTRATIVAS PERMITIDAS EN TODO EL SISTEMA
const MASTER_ADMINS = [
  { username: 'admin1', password: 'KuskoAdmin01*', fullName: 'Administrador 1' },
  { username: 'admin2', password: 'KuskoAdmin02*', fullName: 'Administrador 2' }
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const session = localStorage.getItem('kd_session');
    if (session) {
      try {
        const parsed = JSON.parse(session);
        // Normalización estricta: si el rol guardado no es uno de los permitidos, forzar cierre
        if (parsed.role === 'superadmin') {
          parsed.role = 'admin';
        }
        setUser(parsed);
      } catch (e) {
        localStorage.removeItem('kd_session');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    // 1. Bloqueo explícito de cualquier intento con el usuario 'superadmin'
    if (username.toLowerCase() === 'superadmin') {
      return { success: false, message: 'Acceso Denegado: Usuario no autorizado.' };
    }

    // 2. Verificar si es una de las dos cuentas maestras (admin1 o admin2)
    const masterMatch = MASTER_ADMINS.find(ma => ma.username === username && ma.password === password);
    
    let authenticatedUser: User | null = null;

    if (masterMatch) {
      authenticatedUser = { 
        id: `admin-${username}`, 
        username: masterMatch.username, 
        password: masterMatch.password,
        role: 'admin',
        fullName: masterMatch.fullName,
        status: 'active',
        lastLogin: new Date().toISOString(),
        subscriptionStatus: 'active'
      };
      // Sincronizar con BD para asegurar persistencia de datos
      await db.put('users', authenticatedUser);
    } 
    // 3. Verificar en la base de datos local (Consultorios y Personal)
    else {
      const allUsers = await db.getAll<User>('users');
      const foundUser = allUsers.find(u => u.username === username && u.password === password);
      
      if (foundUser) {
        // SEGURIDAD: Impedir que un usuario de la BD acceda si tiene rol 'admin' pero no es master
        // También bloquea si de alguna forma quedó un 'superadmin' en BD
        if (foundUser.role === 'admin' || (foundUser.role as any) === 'superadmin') {
          return { success: false, message: 'Acceso Denegado: Credenciales administrativas no autorizadas.' };
        }

        if (foundUser.subscriptionStatus === 'blocked') {
          return { success: false, message: 'Cuenta Bloqueada. Comuníquese con el administrador.' };
        }
        
        authenticatedUser = { 
          ...foundUser, 
          status: 'active', 
          lastLogin: new Date().toISOString() 
        };
        
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
