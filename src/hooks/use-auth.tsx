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
      setUser(JSON.parse(session));
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    // Initial setup if no users exist
    const users = await db.getAll<User>('users');
    if (users.length === 0 && username === 'admin' && password === 'admin') {
      const newUser: User = { id: crypto.randomUUID(), username: 'admin', role: 'admin' };
      await db.put('users', newUser);
      setUser(newUser);
      localStorage.setItem('kd_session', JSON.stringify(newUser));
      return true;
    }

    const foundUser = users.find(u => u.username === username);
    if (foundUser) {
      // In a real local app, we'd hash and check, but for this prototype:
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
