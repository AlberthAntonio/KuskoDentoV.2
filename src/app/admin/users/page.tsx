"use client";

import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { AppLayout } from '@/components/layout/AppLayout';
import { db, User, UserRole } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Shield, Trash2, UserPlus, Camera, MapPin, User as UserIcon, Building2, Stethoscope, Briefcase, Clock, Circle, Edit2, CreditCard, Calendar, Calculator } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { addMonths, addYears, format, parseISO } from 'date-fns';

function UsersContent() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [form, setForm] = useState({ 
    username: '', 
    password: '', 
    fullName: '', 
    dni: '', 
    address: '', 
    colegiatura: '',
    role: 'doctor' as UserRole,
    subscriptionFee: '0',
    nextPaymentDate: '',
    contractStartDate: new Date().toISOString().split('T')[0],
    paymentFrequency: 'monthly' as 'monthly' | 'yearly',
    advanceInstallments: '1'
  });

  useEffect(() => {
    load();
  }, [currentUser]);

  // Recalcular fecha de próximo pago automáticamente cuando cambian fecha de inicio, frecuencia o cuotas
  useEffect(() => {
    if (currentUser?.role === 'superadmin' && form.contractStartDate) {
      const installments = parseInt(form.advanceInstallments) || 1;
      const start = parseISO(form.contractStartDate);
      let next;
      
      if (form.paymentFrequency === 'monthly') {
        next = addMonths(start, installments);
      } else {
        next = addYears(start, installments);
      }
      
      setForm(prev => ({ ...prev, nextPaymentDate: format(next, 'yyyy-MM-dd') }));
    }
  }, [form.contractStartDate, form.paymentFrequency, form.advanceInstallments, currentUser?.role]);

  const load = async () => {
    if (!currentUser) return;
    const all = await db.getAll<User>('users');
    
    if (currentUser.role === 'superadmin') {
      setUsers(all.filter(u => u.role === 'clinic'));
    } 
    else if (currentUser.role === 'clinic') {
      setUsers(all.filter(u => u.clinicId === currentUser.id));
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const isCreatingClinic = currentUser.role === 'superadmin';

    const newUser: User = {
      id: editingId || crypto.randomUUID(),
      username: isCreatingClinic ? form.username : undefined,
      password: isCreatingClinic ? form.password : undefined,
      fullName: form.fullName,
      dni: form.dni,
      address: form.address,
      colegiatura: form.colegiatura,
      photo: photoPreview || undefined,
      role: isCreatingClinic ? 'clinic' : form.role,
      clinicId: currentUser.role === 'clinic' ? currentUser.id : undefined,
      status: editingId ? (users.find(u => u.id === editingId)?.status || 'inactive') : 'inactive',
      // Subscription fields
      subscriptionFee: isCreatingClinic ? parseFloat(form.subscriptionFee) : undefined,
      nextPaymentDate: isCreatingClinic ? form.nextPaymentDate : undefined,
      contractStartDate: isCreatingClinic ? form.contractStartDate : undefined,
      paymentFrequency: isCreatingClinic ? form.paymentFrequency : undefined,
      subscriptionStatus: editingId ? (users.find(u => u.id === editingId)?.subscriptionStatus || 'active') : 'active'
    };

    await db.put('users', newUser);

    // Registrar pago inicial si es nuevo consultorio
    if (isCreatingClinic && !editingId) {
      const installments = parseInt(form.advanceInstallments) || 1;
      const totalAmount = parseFloat(form.subscriptionFee) * installments;
      
      await db.put('subscription_payments', {
        id: crypto.randomUUID(),
        clinicId: newUser.id,
        clinicName: newUser.fullName || newUser.username || 'Nuevo Consultorio',
        amount: totalAmount,
        date: new Date().toISOString().split('T')[0],
        concept: `Pago inicial por ${installments} cuota(s) (${form.paymentFrequency === 'monthly' ? 'Mensual' : 'Anual'})`
      });
    }

    setIsOpen(false);
    resetForm();
    toast({ title: editingId ? 'Registro actualizado' : 'Registro creado' });
    load();
  };

  const resetForm = () => {
    setEditingId(null);
    setPhotoPreview(null);
    setForm({ 
      username: '', 
      password: '', 
      fullName: '', 
      dni: '', 
      address: '', 
      colegiatura: '',
      role: currentUser?.role === 'clinic' ? 'doctor' : 'clinic',
      subscriptionFee: '0',
      nextPaymentDate: '',
      contractStartDate: new Date().toISOString().split('T')[0],
      paymentFrequency: 'monthly',
      advanceInstallments: '1'
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Eliminar este registro?')) {
      await db.delete('users', id);
      load();
    }
  };

  const openEdit = (u: User) => {
    setEditingId(u.id);
    setForm({ 
      username: u.username || '', 
      password: u.password || '', 
      fullName: u.fullName || '', 
      dni: u.dni || '', 
      address: u.address || '', 
      colegiatura: u.colegiatura || '',
      role: u.role,
      subscriptionFee: u.subscriptionFee?.toString() || '0',
      nextPaymentDate: u.nextPaymentDate || '',
      contractStartDate: u.contractStartDate || new Date().toISOString().split('T')[0],
      paymentFrequency: u.paymentFrequency || 'monthly',
      advanceInstallments: '1'
    });
    setPhotoPreview(u.photo || null);
    setIsOpen(true);
  };

  if (!currentUser) return null;

  const isSuperAdmin = currentUser.role === 'superadmin';
  const totalInformational = (parseFloat(form.subscriptionFee) || 0) * (parseInt(form.advanceInstallments) || 1);

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-primary">
              {isSuperAdmin ? 'Gestión de Consultorios' : 'Gestión de Personal'}
            </h2>
            <p className="text-muted-foreground mt-1">
              {isSuperAdmin 
                ? 'Administra los accesos y suscripciones de consultorios' 
                : 'Administra el personal clínico de tu consultorio'}
            </p>
          </div>
          <Dialog open={isOpen} onOpenChange={(val) => {
            setIsOpen(val);
            if (!val) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2 h-12 px-6">
                <UserPlus className="w-5 h-5" />
                {isSuperAdmin ? 'Nuevo Consultorio' : 'Nuevo Personal'}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingId ? 'Editar Registro' : isSuperAdmin ? 'Registrar Nuevo Consultorio' : 'Registrar Nuevo Personal'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSave} className="space-y-6 py-4">
                <div className="flex justify-center">
                  <div className="relative">
                    <Avatar className="w-24 h-24 border-2 border-primary/20">
                      <AvatarImage src={photoPreview || ''} />
                      <AvatarFallback className="bg-primary/5 text-primary text-2xl">
                        {isSuperAdmin ? <Building2 className="w-10 h-10" /> : <UserIcon className="w-10 h-10" />}
                      </AvatarFallback>
                    </Avatar>
                    <label className="absolute bottom-0 right-0 p-2 bg-primary rounded-full text-white cursor-pointer hover:bg-primary/90 transition-colors shadow-lg">
                      <Camera className="w-4 h-4" />
                      <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="fullName">
                      {isSuperAdmin ? 'Nombre del Consultorio' : 'Nombre Completo'}
                    </Label>
                    <Input id="fullName" value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})} required placeholder={isSuperAdmin ? "Ej: Consultorio Dental Cusco" : "Ej: Dr. Juan Pérez"} />
                  </div>
                  
                  {isSuperAdmin && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="username">Usuario (Login)</Label>
                        <Input id="username" value={form.username} onChange={e => setForm({...form, username: e.target.value})} required={isSuperAdmin} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">Contraseña</Label>
                        <Input id="password" type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required={isSuperAdmin} />
                      </div>
                      <div className="col-span-2 border-t pt-4 mt-2">
                        <h4 className="text-sm font-bold text-primary flex items-center gap-2 mb-4">
                          <CreditCard className="w-4 h-4" /> Datos de Suscripción y Cobro
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-muted/30 p-4 rounded-xl">
                          <div className="space-y-2">
                            <Label>Costo Unitario (S/.)</Label>
                            <Input type="number" step="0.01" value={form.subscriptionFee} onChange={e => setForm({...form, subscriptionFee: e.target.value})} />
                          </div>
                          <div className="space-y-2">
                            <Label>Frecuencia de Cobro</Label>
                            <Select value={form.paymentFrequency} onValueChange={(v: any) => setForm({...form, paymentFrequency: v})}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="monthly">Mensual</SelectItem>
                                <SelectItem value="yearly">Anual</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Cuotas Adelantadas</Label>
                            <Select value={form.advanceInstallments} onValueChange={(v: any) => setForm({...form, advanceInstallments: v})}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {[1, 2, 3, 4, 5, 6, 12, 24].map(n => (
                                  <SelectItem key={n} value={n.toString()}>{n} {n === 1 ? 'Cuota' : 'Cuotas'}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Inicio de Contrato</Label>
                            <Input type="date" value={form.contractStartDate} onChange={e => setForm({...form, contractStartDate: e.target.value})} />
                          </div>
                          <div className="space-y-2">
                            <Label>Próximo Pago (Calculado)</Label>
                            <div className="h-10 px-3 py-2 border rounded-md bg-white font-bold text-primary flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              {form.nextPaymentDate}
                            </div>
                          </div>
                          <div className="space-y-2 flex flex-col justify-end">
                            <div className="p-2 bg-primary text-primary-foreground rounded-lg text-center">
                              <p className="text-[10px] uppercase font-bold opacity-80">Total Pago Inicial</p>
                              <p className="text-lg font-bold">S/. {totalInformational.toFixed(2)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {!isSuperAdmin && (
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="role">Tipo de Personal</Label>
                      <Select value={form.role} onValueChange={(v: any) => setForm({...form, role: v})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="doctor">Doctor(a)</SelectItem>
                          <SelectItem value="assistant">Asistente</SelectItem>
                          <SelectItem value="technician">Técnico</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="dni">DNI / RUC</Label>
                    <Input id="dni" value={form.dni} onChange={e => setForm({...form, dni: e.target.value})} required />
                  </div>

                  {(isSuperAdmin || form.role === 'doctor') && (
                    <div className="space-y-2">
                      <Label htmlFor="colegiatura">N° Registro / Colegiatura</Label>
                      <Input id="colegiatura" value={form.colegiatura} onChange={e => setForm({...form, colegiatura: e.target.value})} required={form.role === 'doctor'} />
                    </div>
                  )}

                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="address">Dirección</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input id="address" className="pl-10" value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="Dirección completa" />
                    </div>
                  </div>
                </div>

                <DialogFooter className="pt-6">
                  <Button type="submit" className="w-full h-12 text-lg">
                    {editingId ? 'Guardar Cambios' : 'Confirmar Registro y Pago Inicial'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {users.map((u) => (
            <Card key={u.id} className="border-none shadow-sm hover:shadow-md transition-all group overflow-hidden">
               <div className={`h-1 ${u.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
               <CardHeader className="flex flex-row items-start gap-4 pb-4">
                 <Avatar className="w-16 h-16 rounded-xl">
                   <AvatarImage src={u.photo} />
                   <AvatarFallback className="bg-primary/10 text-primary">
                     {u.role === 'clinic' ? <Building2 /> : u.role === 'doctor' ? <Stethoscope /> : <Briefcase />}
                   </AvatarFallback>
                 </Avatar>
                 <div className="flex-1 min-w-0">
                   <div className="flex justify-between items-start">
                    <CardTitle className="text-lg truncate">{u.fullName || u.username}</CardTitle>
                    {isSuperAdmin && (
                      <div className="flex items-center gap-1">
                        <Circle className={cn("w-2 h-2 fill-current", u.status === 'active' ? 'text-emerald-500' : 'text-slate-300')} />
                        <span className="text-[10px] font-bold text-muted-foreground">{u.status === 'active' ? 'Activo' : 'Offline'}</span>
                      </div>
                    )}
                   </div>
                   <CardDescription className="flex items-center gap-1 mt-1 font-bold text-primary">
                     <Shield className="w-3 h-3" /> {
                       u.role === 'clinic' ? 'Consultorio' : 
                       u.role === 'doctor' ? 'Doctor(a)' : 
                       u.role === 'assistant' ? 'Asistente' : 'Técnico'
                     }
                   </CardDescription>
                 </div>
               </CardHeader>
               <CardContent className="space-y-4">
                 {isSuperAdmin && (
                   <div className="bg-muted/50 p-3 rounded-lg text-[10px] space-y-1">
                      <p className="flex justify-between"><span>Cobro:</span> <b className="text-primary font-bold">S/. {u.subscriptionFee?.toFixed(2)}</b></p>
                      <p className="flex justify-between"><span>Vence:</span> <b>{u.nextPaymentDate || 'N/A'}</b></p>
                      <p className="flex justify-between"><span>Frecuencia:</span> <b>{u.paymentFrequency === 'monthly' ? 'Mensual' : 'Anual'}</b></p>
                   </div>
                 )}
                 <div className="text-xs space-y-2 text-muted-foreground">
                    <p className="flex items-center gap-2 truncate"><MapPin className="w-3 h-3" /> {u.address || 'Sin dirección'}</p>
                    {u.lastLogin && isSuperAdmin && (
                      <p className="flex items-center gap-2"><Clock className="w-3 h-3" /> Login: {new Date(u.lastLogin).toLocaleString('es-PE')}</p>
                    )}
                 </div>
                 <div className="flex gap-2 pt-2">
                   <Button variant="outline" size="sm" className="gap-2 flex-1" onClick={() => openEdit(u)}>
                     <Edit2 className="w-4 h-4" />
                     Editar
                   </Button>
                   <Button variant="ghost" size="sm" onClick={() => handleDelete(u.id)} className="text-destructive hover:bg-destructive/10">
                     <Trash2 className="w-4 h-4" />
                   </Button>
                 </div>
               </CardContent>
            </Card>
          ))}
          {users.length === 0 && (
            <div className="col-span-full py-20 text-center opacity-50 flex flex-col items-center gap-4">
              <Shield className="w-16 h-16" />
              <p>No hay registros encontrados.</p>
            </div>
          )}
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
