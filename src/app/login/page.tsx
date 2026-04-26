
"use client";

import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { AlertCircle, Eye, EyeOff, LifeBuoy, Lock } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || '2.3.0';
const SUPPORT_WHATSAPP = '51972156954';
const SUPPORT_MESSAGE = encodeURIComponent(
  'Hola, deseo informacion para implementar CuscoDent en un nuevo consultorio dental.'
);

function LoginContent() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const { login, lockoutUntil } = useAuth();
  const router = useRouter();

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const checkLockout = () => {
      const now = Date.now();
      if (lockoutUntil > now) {
        setRemainingSeconds(Math.ceil((lockoutUntil - now) / 1000));
        timer = setTimeout(checkLockout, 1000);
      } else {
        setRemainingSeconds(0);
      }
    };

    checkLockout();
    return () => clearTimeout(timer);
  }, [lockoutUntil]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (remainingSeconds > 0) return;
    
    setError('');
    const result = await login(identifier, password);
    if (result.success) {
      router.push('/dashboard');
    } else {
      setError(result.message || 'Credenciales incorrectas');
    }
  };

  const isLocked = remainingSeconds > 0;

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-background p-4 bg-cover bg-center"
      style={{
        backgroundImage:
          "linear-gradient(rgba(15, 118, 110, 0.35), rgba(15, 118, 110, 0.35)), url('https://images.unsplash.com/photo-1598256989800-fe5f95da9787?q=80&w=2070&auto=format&fit=crop')",
      }}
    >
      <div className="absolute inset-0 bg-primary/40 backdrop-blur-sm"></div>
      <Card className="w-full max-w-md relative z-10 shadow-2xl border-none rounded-[2.5rem] overflow-hidden">
        <div className="h-2 bg-primary" />
        <CardHeader className="space-y-1 text-center pt-10">
            <div className="w-48 h-auto mx-auto mb-6 flex items-center justify-center">
              <img 
                src="/files/dento.png" 
                alt="Logo Dento" 
                className="w-full h-full object-contain filter drop-shadow-[0_10px_15px_rgba(0,0,0,0.4)]" 
              />
            </div>
          <CardDescription className="text-base font-bold text-slate-500 uppercase tracking-widest pt-2">
            Sistema de Gestión Odontológica
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-6 px-8 py-6">
            {error && !isLocked && (
              <Alert variant="destructive" className="rounded-2xl border-none bg-red-50 text-red-800">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <AlertDescription className="font-bold">{error}</AlertDescription>
              </Alert>
            )}

            {isLocked && (
              <Alert variant="destructive" className="rounded-2xl border-none bg-amber-50 text-amber-800 animate-pulse">
                <Lock className="h-5 w-5 text-amber-600" />
                <AlertTitle className="font-black uppercase tracking-widest text-[10px]">Acceso Bloqueado</AlertTitle>
                <AlertDescription className="font-bold">
                  Por seguridad, el sistema está bloqueado. Reintente en {remainingSeconds} segundos.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              <Label htmlFor="identifier" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">ID de Usuario</Label>
              <Input 
                id="identifier" 
                type="text" 
                placeholder="Ingresa tu ID de usuario" 
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                disabled={isLocked}
                className="h-14 rounded-2xl bg-slate-50 border-none shadow-inner text-lg focus:bg-white transition-all"
              />
            </div>
            <div className="space-y-3">
              <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLocked}
                  className="h-14 rounded-2xl bg-slate-50 border-none shadow-inner text-lg focus:bg-white transition-all pr-14"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  disabled={isLocked}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute inset-y-0 right-0 flex w-14 items-center justify-center text-slate-500 transition-colors hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="px-8 pb-10 pt-2">
            <Button 
              className="w-full text-xl font-black h-16 rounded-2xl shadow-2xl shadow-primary/20 transition-transform active:scale-95" 
              type="submit"
              disabled={isLocked}
            >
              {isLocked ? `BLOQUEADO (${remainingSeconds}s)` : 'INICIAR SESIÓN'}
            </Button>
          </CardFooter>
        </form>
        <div className="px-8 pb-8 text-center">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">
            Version {APP_VERSION}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-500/90">Created by CodexCusco</p>
        </div>
      </Card>

      <a
        href={`https://wa.me/${SUPPORT_WHATSAPP}?text=${SUPPORT_MESSAGE}`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-4 left-4 z-20 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-xs font-black uppercase tracking-wider text-white shadow-2xl shadow-emerald-700/25 transition-all hover:bg-emerald-700 active:scale-95"
      >
        <LifeBuoy className="h-4 w-4" />
        Soporte Nuevos Consultorios
      </a>
    </div>
  );
}

export default function LoginPage() {
  return (
    <AuthProvider>
      <LoginContent />
    </AuthProvider>
  );
}
