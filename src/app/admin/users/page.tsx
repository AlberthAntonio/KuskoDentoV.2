
"use client";

import { useState, useEffect } from 'react';
import { AuthProvider } from '@/hooks/use-auth';
import { AppLayout } from '@/components/layout/AppLayout';
import { db, User } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Shield, Trash2, UserPlus, Lock, Edit2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

function UsersContent() {
  const [users, setUsers] = useState<User[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ username: '', password: '' });

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const all = await db.getAll<User>('users');
    setUsers(all);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const newUser: User = {
      id: editingId || crypto.randomUUID(),
      username: form.username,
      role: 'admin',
    };
    await db.put('users', newUser);
    setIsOpen(false);
    setEditingId(null);
    setForm({ username: '', password: '' });
    load();
  };

  const handleDelete = async (id: string) => {
    if (users.length === 1) {
      alert('Debe existir al menos un usuario administrador.');
      return;
    }
    if (confirm('¿Eliminar este usuario?')) {
      await db.delete('users', id);
      load();
    }
  };

  const openEdit = (u: User) => {
    setEditingId(u.id);
    setForm({ username: u.username, password: '' });
    setIsOpen(true);
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-primary">Usuarios</h2>
            <p className="text-muted-foreground mt-1">Administra el acceso al sistema para doctores y personal</p>
          </div>
          <Dialog open={isOpen} onOpenChange={(val) => {
            setIsOpen(val);
            if (!val) { setEditingId(null); setForm({ username: '', password: '' }); }
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2 h-12">
                <UserPlus className="w-5 h-5" />
                Agregar Usuario
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? 'Editar Usuario' : 'Nuevo Usuario'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSave} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Nombre de Usuario</Label>
                  <Input id="username" value={form.username} onChange={e => setForm({...form, username: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña {editingId && '(Opcional si no se desea cambiar)'}</Label>
                  <Input id="password" type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required={!editingId} />
                </div>
                <DialogFooter className="pt-4">
                  <Button type="submit" className="w-full">{editingId ? 'Guardar Cambios' : 'Crear Usuario'}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {users.map((u) => (
            <Card key={u.id} className="border-none shadow-sm relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4">
                 <Shield className="w-8 h-8 text-primary/10" />
               </div>
               <CardHeader>
                 <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
                   <Shield className="w-6 h-6" />
                 </div>
                 <CardTitle>{u.username}</CardTitle>
                 <CardDescription>Rol: Superusuario (Doctor)</CardDescription>
               </CardHeader>
               <CardContent className="flex gap-2">
                 <Button variant="outline" size="sm" className="gap-2 flex-1" onClick={() => openEdit(u)}>
                   <Edit2 className="w-4 h-4" />
                   Editar
                 </Button>
                 <Button variant="ghost" size="sm" onClick={() => handleDelete(u.id)} className="text-destructive">
                   <Trash2 className="w-4 h-4" />
                 </Button>
               </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}

export default function UsersPage() {
  return (
    <AuthProvider>
      <UsersContent />
    </AuthProvider>
  );
}
