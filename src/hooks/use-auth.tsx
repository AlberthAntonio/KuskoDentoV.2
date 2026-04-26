"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

type Role = 'admin' | 'clinic' | 'doctor' | 'assistant' | 'technician' | string;
type ThemePreference = 'light' | 'dark' | 'system';

const THEME_STORAGE_PREFIX = 'kuskodento_theme';
const DEFAULT_SUBSCRIPTION_FEE = 50;

export interface AuthUser {
  id: string;
  email?: string;
  username?: string;
  fullName?: string;
  full_name?: string;
  dni?: string;
  role: Role;
  clinicId?: string;
  clinic_id?: string;
  subscriptionStatus?: 'active' | 'suspended' | 'blocked';
  theme?: 'light' | 'dark' | 'system';
  primaryColor?: string;
  brandName?: string;
  slogan?: string;
  nextPaymentDate?: string;
  subscriptionFee?: number;
  photo?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (identifier: string, password: string, clinicId?: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  updateUser: (updatedUser: AuthUser) => void;
  isLoading: boolean;
  lockoutUntil: number;
}

interface MeResponse {
  success: boolean;
  data?: {
    user: {
      id: string;
      email: string | null;
      username?: string | null;
      full_name: string | null;
      dni?: string | null;
      role: string;
      clinic_id: string;
    };
    clinic: {
      id: string;
      name: string;
      domain: string;
      subscription_fee?: number | null;
      subscription_status?: 'active' | 'suspended' | 'blocked';
      theme?: string;
      logo_url?: string | null;
      primary_color?: string | null;
      slogan?: string | null;
      next_payment_date?: string | null;
    };
  };
  error?: string;
}

type AuthPayload = {
  user: {
    id: string;
    email: string | null;
    username?: string | null;
    full_name: string | null;
    dni?: string | null;
    role: string;
    clinic_id: string;
  };
  clinic: {
    id: string;
    name: string;
    domain: string;
    subscription_fee?: number | null;
    subscription_status?: 'active' | 'suspended' | 'blocked';
    theme?: string;
    logo_url?: string | null;
    primary_color?: string | null;
    slogan?: string | null;
    next_payment_date?: string | null;
  };
};

function isThemePreference(value: string | null | undefined): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

function getClinicRef(user: Pick<AuthUser, 'clinicId' | 'clinic_id'>): string | undefined {
  return user.clinicId || user.clinic_id;
}

function getThemeStorageKey(userId: string, clinicId: string): string {
  return `${THEME_STORAGE_PREFIX}:${clinicId}:${userId}`;
}

function getStoredTheme(userId: string, clinicId: string): ThemePreference | undefined {
  if (typeof window === 'undefined') return undefined;
  const saved = window.localStorage.getItem(getThemeStorageKey(userId, clinicId));
  return isThemePreference(saved) ? saved : undefined;
}

function persistThemePreference(user: Pick<AuthUser, 'id' | 'clinicId' | 'clinic_id' | 'theme'>): void {
  if (typeof window === 'undefined') return;
  const clinicRef = getClinicRef(user);
  if (!clinicRef || !user.id || !isThemePreference(user.theme)) return;

  window.localStorage.setItem(getThemeStorageKey(user.id, clinicRef), user.theme);
}

function extractAuthPayload(body: unknown): AuthPayload | null {
  if (!body || typeof body !== 'object') return null;

  const candidate = (body as { data?: unknown }).data ?? body;
  if (!candidate || typeof candidate !== 'object') return null;

  const payload = candidate as Partial<AuthPayload>;
  if (!payload.user || !payload.clinic) return null;

  return payload as AuthPayload;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function normalizeUser(payload: NonNullable<MeResponse['data']>): AuthUser {
  const themeFromPayload: ThemePreference =
    payload.clinic.theme === 'dark' || payload.clinic.theme === 'light' || payload.clinic.theme === 'system'
      ? payload.clinic.theme
      : 'light';

  const storedTheme = getStoredTheme(payload.user.id, payload.user.clinic_id);

  return {
    id: payload.user.id,
    email: payload.user.email ?? undefined,
    username: payload.user.username ?? payload.user.email ?? undefined,
    fullName: payload.user.full_name ?? undefined,
    full_name: payload.user.full_name ?? undefined,
    dni: payload.user.dni ?? undefined,
    role: payload.user.role,
    clinicId: payload.user.clinic_id,
    clinic_id: payload.user.clinic_id,
    subscriptionStatus: payload.clinic.subscription_status ?? 'active',
    theme: storedTheme ?? themeFromPayload,
    primaryColor: payload.clinic.primary_color ?? undefined,
    brandName: payload.clinic.name,
    slogan: payload.clinic.slogan ?? payload.clinic.domain,
    subscriptionFee:
      typeof payload.clinic.subscription_fee === 'number'
        ? payload.clinic.subscription_fee
        : DEFAULT_SUBSCRIPTION_FEE,
    photo: payload.clinic.logo_url ?? undefined,
    nextPaymentDate: payload.clinic.next_payment_date ?? undefined,
  };
}

async function fetchMe(): Promise<AuthUser | null> {
  const response = await fetch('/api/auth/me', {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
  });

  if (!response.ok) return null;

  const body = (await response.json()) as MeResponse | AuthPayload;
  const payload = extractAuthPayload(body);
  if (!payload) return null;
  return normalizeUser(payload);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const parentContext = useContext(AuthContext);
  if (parentContext) {
    return <>{children}</>;
  }

  return <AuthProviderRoot>{children}</AuthProviderRoot>;
}

function AuthProviderRoot({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let mounted = true;

    if (pathname === '/login') {
      setUser(null);
      setIsLoading(false);
      return () => {
        mounted = false;
      };
    }

    const initAuth = async () => {
      try {
        const me = await fetchMe();
        if (mounted) setUser(me);
      } catch {
        if (mounted) setUser(null);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    initAuth();

    return () => {
      mounted = false;
    };
  }, [pathname]);

  const login = useCallback(async (identifier: string, password: string, clinicId?: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          identifier,
          password,
          ...(clinicId?.trim() ? { clinic_id: clinicId.trim() } : {}),
        }),
      });

      const body = (await response.json()) as MeResponse | AuthPayload;
      const payload = extractAuthPayload(body);

      if (!response.ok || !payload) {
        return {
          success: false,
          message: (body as { error?: string })?.error || 'No fue posible iniciar sesion',
        };
      }

      const normalized = normalizeUser(payload);
      persistThemePreference(normalized);
      setUser(normalized);
      return { success: true };
    } catch {
      return {
        success: false,
        message: 'Error de red al iniciar sesion',
      };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // no-op
    }

    setUser(null);
    router.push('/login');
  }, [router]);

  const updateUser = useCallback((updatedUser: AuthUser) => {
    persistThemePreference(updatedUser);
    setUser(updatedUser);
  }, []);

  const value = useMemo(
    () => ({
      user,
      login,
      logout,
      updateUser,
      isLoading,
      lockoutUntil: 0,
    }),
    [user, login, logout, updateUser, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
