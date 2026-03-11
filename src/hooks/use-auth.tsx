
"use client";

import { useState, useEffect, createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { db, User } from '@/lib/db';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  updateUser: (updatedUser: User) => void;
  isLoading: boolean;
  lockoutUntil: number;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const MASTER_ADMINS = [
  { username: 'admin1', password: 'admin1', fullName: 'Administrador 1' },
  { username: 'admin2', password: 'admin2', fullName: 'Administrador 2' }
];

const MAX_ATTEMPTS = 3;
const LOCKOUT_MS = 2 * 60 * 1000; // 2 minutos

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lockoutUntil, setLockoutUntil] = useState<number>(0);
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

    const storedLockout = localStorage.getItem('kd_lockout_until');
    if (storedLockout) {
      const until = parseInt(storedLockout);
      if (until > Date.now()) {
        setLockoutUntil(until);
      } else {
        localStorage.removeItem('kd_lockout_until');
        localStorage.removeItem('kd_failed_attempts');
      }
    }

    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    // Verificar si el sistema está bloqueado
    const now = Date.now();
    if (now < lockoutUntil) {
      const remaining = Math.ceil((lockoutUntil - now) / 1000);
      return { 
        success: false, 
        message: `Sistema bloqueado por seguridad. Intente en ${remaining} segundos.` 
      };
    }

    if (username.toLowerCase() === 'superadmin') {
      return { success: false, message: 'Acceso Denegado: Usuario no autorizado.' };
    }

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
      await db.put('users', authenticatedUser);
    } 
    else {
      const allUsers = await db.getAll<User>('users');
      const foundUser = allUsers.find(u => u.username === username && u.password === password);
      
      if (foundUser) {
        if (foundUser.role === 'admin') {
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
      // Limpiar rastro de fallos al entrar con éxito
      localStorage.removeItem('kd_failed_attempts');
      localStorage.removeItem('kd_lockout_until');
      setLockoutUntil(0);
      return { success: true };
    }
    
    // Si llegamos aquí, las credenciales son incorrectas
    const attempts = parseInt(localStorage.getItem('kd_failed_attempts') || '0') + 1;
    localStorage.setItem('kd_failed_attempts', attempts.toString());

    if (attempts >= MAX_ATTEMPTS) {
      const lockUntil = Date.now() + LOCKOUT_MS;
      localStorage.setItem('kd_lockout_until', lockUntil.toString());
      setLockoutUntil(lockUntil);
      return { 
        success: false, 
        message: 'Demasiados intentos fallidos. Sistema bloqueado por 2 minutos.' 
      };
    }

    return { 
      success: false, 
      message: `Credenciales incorrectas. Intento ${attempts} de ${MAX_ATTEMPTS}.` 
    };
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

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('kd_session', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, isLoading, lockoutUntil }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
