
"use client";

import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { AlertCircle, Lock } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

function LoginContent() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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
    const result = await login(username, password);
    if (result.success) {
      router.push('/dashboard');
    } else {
      setError(result.message || 'Credenciales incorrectas');
    }
  };

  const isLocked = remainingSeconds > 0;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 bg-[url('https://images.unsplash.com/photo-1598256989800-fe5f95da9787?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center">
      <div className="absolute inset-0 bg-primary/40 backdrop-blur-sm"></div>
      <Card className="w-full max-w-md relative z-10 shadow-2xl border-none rounded-[2.5rem] overflow-hidden">
        <div className="h-2 bg-primary" />
        <CardHeader className="space-y-1 text-center pt-10">
          <div className="w-20 h-20 bg-primary rounded-3xl mx-auto mb-6 flex items-center justify-center text-primary-foreground shadow-xl ring-4 ring-primary/10">
             <span className="text-4xl font-black">K</span>
          </div>
          <CardTitle className="text-4xl font-black tracking-tighter text-primary">KuskoDento</CardTitle>
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
              <Label htmlFor="username" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Usuario</Label>
              <Input 
                id="username" 
                type="text" 
                placeholder="Ingresa tu ID de usuario" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isLocked}
                className="h-14 rounded-2xl bg-slate-50 border-none shadow-inner text-lg focus:bg-white transition-all"
              />
            </div>
            <div className="space-y-3">
              <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Contraseña</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLocked}
                className="h-14 rounded-2xl bg-slate-50 border-none shadow-inner text-lg focus:bg-white transition-all"
              />
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
      </Card>
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
