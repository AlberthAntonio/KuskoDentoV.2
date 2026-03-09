
"use client";

import { useState } from 'react';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { AppLayout } from '@/components/layout/AppLayout';
import { db, User } from '@/lib/db';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Lock, ShieldCheck, AlertCircle, User as UserIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

function ProfileContent() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [isChanging, setIsChanging] = useState(false);

  if (!user) return null;

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      toast({ variant: 'destructive', title: 'Error', description: 'Las contraseñas nuevas no coinciden.' });
      return;
    }

    if (passwords.current !== user.password) {
      toast({ variant: 'destructive', title: 'Error', description: 'La contraseña actual es incorrecta.' });
      return;
    }

    setIsChanging(true);
    try {
      const updatedUser: User = { ...user, password: passwords.new };
      await db.put('users', updatedUser);
      
      toast({ 
        title: 'Éxito', 
        description: 'Contraseña actualizada correctamente. Por seguridad, su sesión se cerrará en breve.' 
      });
      
      setTimeout(() => {
        logout();
      }, 2000);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo actualizar la contraseña.' });
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h2 className="text-3xl font-bold text-primary">Perfil de Usuario</h2>
          <p className="text-muted-foreground mt-2">Administra tu información personal y configuración de seguridad</p>
        </div>

        <Card className="border-none shadow-sm overflow-hidden bg-white/50 backdrop-blur-sm">
          <div className="h-2 bg-primary" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" /> Seguridad de la Cuenta
            </CardTitle>
            <CardDescription>Cambia tu contraseña para mantener tu acceso protegido</CardDescription>
          </CardHeader>
          <form onSubmit={handleChangePassword}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-pass">Contraseña Actual</Label>
                <Input 
                  id="current-pass" 
                  type="password" 
                  value={passwords.current} 
                  onChange={e => setPasswords({...passwords, current: e.target.value})} 
                  required 
                  className="rounded-xl h-11"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new-pass">Nueva Contraseña</Label>
                  <Input 
                    id="new-pass" 
                    type="password" 
                    value={passwords.new} 
                    onChange={e => setPasswords({...passwords, new: e.target.value})} 
                    required 
                    className="rounded-xl h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-pass">Confirmar Nueva Contraseña</Label>
                  <Input 
                    id="confirm-pass" 
                    type="password" 
                    value={passwords.confirm} 
                    onChange={e => setPasswords({...passwords, confirm: e.target.value})} 
                    required 
                    className="rounded-xl h-11"
                  />
                </div>
              </div>
              
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3 mt-4">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 leading-relaxed">
                  <b>Nota Importante:</b> Al cambiar su contraseña, su sesión se cerrará automáticamente y deberá volver a ingresar con sus nuevas credenciales.
                </p>
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50 border-t p-6">
              <Button type="submit" className="w-full h-12 text-lg font-bold rounded-xl shadow-lg shadow-primary/10" disabled={isChanging}>
                {isChanging ? 'Actualizando...' : 'Actualizar Contraseña'}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <Card className="border-none shadow-sm bg-white/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
               <UserIcon className="w-5 h-5 text-primary" /> Información del Usuario
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm font-medium text-muted-foreground uppercase">Nombre Completo:</span>
              <span className="text-sm font-bold">{user.fullName}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm font-medium text-muted-foreground uppercase">Usuario de Acceso:</span>
              <span className="text-sm font-bold text-primary">{user.username}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm font-medium text-muted-foreground uppercase">Rol en el Sistema:</span>
              <Badge className="uppercase text-[10px] font-black">{user.role}</Badge>
            </div>
            {user.role === 'clinic' && (
              <div className="flex justify-between items-center py-2">
                <span className="text-sm font-medium text-muted-foreground uppercase">Estado de Servicio:</span>
                <Badge 
                  variant={user.subscriptionStatus === 'active' ? 'default' : 'destructive'} 
                  className="uppercase text-[10px] font-black"
                >
                  {user.subscriptionStatus === 'active' ? 'ACTIVO' : user.subscriptionStatus === 'suspended' ? 'SUSPENDIDO' : 'BLOQUEADO'}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

export default function ProfilePage() {
  return (
    <AuthProvider>
      <ProfileContent />
    </AuthProvider>
  );
}
