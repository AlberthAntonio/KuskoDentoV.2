
"use client";

import { useState } from 'react';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

function LoginContent() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const result = await login(username, password);
    if (result.success) {
      router.push('/dashboard');
    } else {
      setError(result.message || 'Credenciales incorrectas');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 bg-[url('https://images.unsplash.com/photo-1598256989800-fe5f95da9787?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center">
      <div className="absolute inset-0 bg-primary/40 backdrop-blur-sm"></div>
      <Card className="w-full max-w-md relative z-10 shadow-2xl border-none">
        <CardHeader className="space-y-1 text-center">
          <div className="w-16 h-16 bg-primary rounded-2xl mx-auto mb-4 flex items-center justify-center text-primary-foreground">
             <span className="text-3xl font-bold">K</span>
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight text-primary">KuskoDento</CardTitle>
          <CardDescription>
            Sistema de Gestión Odontológica
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="username">Usuario</Label>
              <Input 
                id="username" 
                type="text" 
                placeholder="Ingresa tu usuario" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full text-lg h-12" type="submit">
              Iniciar Sesión
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
