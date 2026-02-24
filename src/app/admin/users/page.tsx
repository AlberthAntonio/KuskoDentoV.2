
"use client";

import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { AppLayout } from '@/components/layout/AppLayout';
import { db, User, UserRole } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Trash2, UserPlus, Camera, MapPin, User as UserIcon, Building2, Stethoscope, Briefcase, Edit2, CreditCard, Calendar, ShieldAlert, Search, Loader2, CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { addMonths, format, parseISO } from 'date-fns';

function UsersContent() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isValidatingDni, setIsValidatingDni] = useState(false);
  
  const [form, setForm] = useState({ 
    username: '', 
    password: '', 
    fullName: '', 
    dni: '', 
    address: '', 
    colegiatura: '',
    role: 'doctor' as UserRole,
    subscriptionFee: '50',
    nextPaymentDate: '',
    contractStartDate: new Date().toISOString().split('T')[0],
    paymentFrequency: 'monthly' as 'monthly' | 'yearly',
    advanceInstallments: '1',
    subscriptionStatus: 'active' as 'active' | 'suspended' | 'blocked'
  });

  useEffect(() => {
    load();
  }, [currentUser]);

  useEffect(() => {
    if (currentUser?.role === 'superadmin' && form.contractStartDate && !editingId) {
      const installments = parseInt(form.advanceInstallments) || 1;
      const start = parseISO(form.contractStartDate);
      const next = addMonths(start, installments);
      setForm(prev => ({ ...prev, nextPaymentDate: format(next, 'yyyy-MM-dd') }));
    }
  }, [form.contractStartDate, form.advanceInstallments, currentUser?.role, editingId]);

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

  const handleValidateDni = async () => {
    if (form.dni.length !== 8) {
      toast({ variant: "destructive", title: "DNI Inválido", description: "El DNI debe tener 8 dígitos." });
      return;
    }

    setIsValidatingDni(true);
    // Simulación de consulta a RENIEC
    setTimeout(() => {
      setIsValidatingDni(false);
      // Datos de ejemplo para la simulación
      const simulatedData: Record<string, string> = {
        "12345678": "CONSULTORIO DENTAL CUSCO S.A.C.",
        "87654321": "DR. RICARDO PALMA ZEGARRA",
        "44556677": "CLINICA ODONTOLOGICA DEL SUR"
      };

      const foundName = simulatedData[form.dni] || "NOMBRES RECUPERADOS DE RENIEC";
      setForm(prev => ({ ...prev, fullName: foundName }));
      toast({ 
        title: "DNI Validado", 
        description: "Datos recuperados correctamente de la base de datos de RENIEC." 
      });
    }, 1500);
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
      subscriptionFee: isCreatingClinic ? parseFloat(form.subscriptionFee) : undefined,
      nextPaymentDate: isCreatingClinic ? form.nextPaymentDate : undefined,
      contractStartDate: isCreatingClinic ? form.contractStartDate : undefined,
      paymentFrequency: 'monthly',
      subscriptionStatus: form.subscriptionStatus
    };

    await db.put('users', newUser);

    if (isCreatingClinic && !editingId) {
      const installments = parseInt(form.advanceInstallments) || 1;
      const totalAmount = parseFloat(form.subscriptionFee) * installments;
      
      await db.put('subscription_payments', {
        id: crypto.randomUUID(),
        clinicId: newUser.id,
        clinicName: newUser.fullName || newUser.username || 'Nuevo Consultorio',
        amount: totalAmount,
        date: new Date().toISOString().split('T')[0],
        concept: `Pago inicial: ${installments} cuota(s) mensuales adelantadas`
      });
    }

    setIsOpen(false);
    resetForm();
    toast({ title: editingId ? 'Actualizado correctamente' : 'Registrado correctamente' });
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
      subscriptionFee: '50',
      nextPaymentDate: '',
      contractStartDate: new Date().toISOString().split('T')[0],
      paymentFrequency: 'monthly',
      advanceInstallments: '1',
      subscriptionStatus: 'active'
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
      subscriptionFee: u.subscriptionFee?.toString() || '50',
      nextPaymentDate: u.nextPaymentDate || '',
      contractStartDate: u.contractStartDate || new Date().toISOString().split('T')[0],
      paymentFrequency: 'monthly',
      advanceInstallments: '1',
      subscriptionStatus: u.subscriptionStatus
    });
    setPhotoPreview(u.photo || null);
    setIsOpen(true);
  };

  if (!currentUser) return null;

  const isSuperAdmin = currentUser.role === 'superadmin';
  const totalInformational = (parseFloat(form.subscriptionFee) || 0) * (parseInt(form.advanceInstallments) || 1);
  const installmentOptions = Array.from({ length: 24 }, (_, i) => i + 1);

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
                ? 'Panel de control de acceso y suscripciones' 
                : 'Administra el personal clínico de tu consultorio'}
            </p>
          </div>
          <Dialog open={isOpen} onOpenChange={(val) => {
            setIsOpen(val);
            if (!val) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2 h-12 px-6 shadow-lg shadow-primary/20">
                <UserPlus className="w-5 h-5" />
                {isSuperAdmin ? 'Nuevo Consultorio' : 'Nuevo Personal'}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto rounded-3xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                  <Building2 className="text-primary w-8 h-8" />
                  {editingId ? 'Editar Registro' : isSuperAdmin ? 'Registrar Nuevo Consultorio' : 'Registrar Personal'}
                </DialogTitle>
                <DialogDescription>
                  Complete la ficha técnica del establecimiento o personal (Estándar regional DD/MM/AAAA)
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSave} className="space-y-8 py-6">
                <div className="flex justify-center">
                  <div className="relative">
                    <Avatar className="w-28 h-28 border-4 border-primary/10 shadow-xl">
                      <AvatarImage src={photoPreview || ''} />
                      <AvatarFallback className="bg-primary/5 text-primary text-3xl">
                        {isSuperAdmin ? <Building2 className="w-12 h-12" /> : <UserIcon className="w-12 h-12" />}
                      </AvatarFallback>
                    </Avatar>
                    <label className="absolute bottom-1 right-1 p-2.5 bg-primary rounded-full text-white cursor-pointer hover:bg-primary/90 transition-all shadow-lg hover:scale-110 active:scale-95">
                      <Camera className="w-5 h-5" />
                      <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Validación DNI - RENIEC */}
                  <div className="space-y-2 col-span-1">
                    <Label htmlFor="dni" className="font-bold flex items-center gap-2">
                      DNI / RUC del Titular
                    </Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                        <Input id="dni" value={form.dni} onChange={e => setForm({...form, dni: e.target.value})} maxLength={11} className="pl-10 h-11" placeholder="Ej: 45678901" />
                      </div>
                      <Button 
                        type="button" 
                        onClick={handleValidateDni} 
                        disabled={isValidatingDni || form.dni.length < 8}
                        variant="secondary"
                        className="h-11 gap-2 border-primary/20 hover:bg-primary/10"
                      >
                        {isValidatingDni ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        Validar DNI
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2 col-span-1">
                    <Label htmlFor="fullName" className="font-bold">
                      {isSuperAdmin ? 'Nombre Comercial del Consultorio' : 'Nombre Completo'}
                    </Label>
                    <Input id="fullName" value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})} required className="h-11" placeholder="Se completará al validar DNI" />
                  </div>
                  
                  {isSuperAdmin && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="username" className="font-bold">Usuario de Acceso</Label>
                        <Input id="username" value={form.username} onChange={e => setForm({...form, username: e.target.value})} required={isSuperAdmin} className="h-11" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password" className="font-bold">Contraseña de Seguridad</Label>
                        <Input id="password" type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required={isSuperAdmin} className="h-11" />
                      </div>

                      <div className="col-span-full border-t border-dashed pt-6">
                        <div className="bg-primary/5 p-6 rounded-3xl border border-primary/10 space-y-6">
                          <h4 className="text-md font-bold text-primary flex items-center gap-2">
                            <CreditCard className="w-5 h-5" /> Configuración de Contrato y Suscripción
                          </h4>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                              <Label className="font-bold text-xs">Fecha de Inicio de Contrato</Label>
                              <div className="relative">
                                <Calendar className="absolute left-3 top-3 w-4 h-4 text-primary" />
                                <Input type="date" value={form.contractStartDate} onChange={e => setForm({...form, contractStartDate: e.target.value})} className="h-11 pl-10" />
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <Label className="font-bold text-xs">Costo Mensual (S/.)</Label>
                              <Input type="number" step="0.01" value={form.subscriptionFee} onChange={e => setForm({...form, subscriptionFee: e.target.value})} className="h-11 font-bold" />
                            </div>

                            <div className="space-y-2">
                              <Label className="font-bold text-xs">Meses Pagados por Adelantado</Label>
                              <Select value={form.advanceInstallments} onValueChange={(v: any) => setForm({...form, advanceInstallments: v})}>
                                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {installmentOptions.map(n => (
                                    <SelectItem key={n} value={n.toString()}>{n} mes(es)</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 bg-white rounded-2xl border border-primary/10 flex items-center justify-between">
                              <div>
                                <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Primer Vencimiento (DD/MM/AAAA)</p>
                                <p className="text-lg font-bold text-primary">
                                  {form.nextPaymentDate ? format(parseISO(form.nextPaymentDate), 'dd/MM/yyyy') : '---'}
                                </p>
                              </div>
                              <Calendar className="w-8 h-8 text-primary/20" />
                            </div>

                            <div className="p-4 bg-primary text-white rounded-2xl shadow-lg shadow-primary/20 flex items-center justify-between">
                              <div>
                                <p className="text-[10px] font-black uppercase opacity-80 mb-1">Inversión Inicial Total</p>
                                <p className="text-xl font-bold">S/. {totalInformational.toFixed(2)}</p>
                              </div>
                              <CheckCircle2 className="w-8 h-8 opacity-40" />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label className="font-bold text-xs flex items-center gap-2">
                              <ShieldAlert className="w-4 h-4 text-amber-500" /> Estado Inicial de Acceso
                            </Label>
                            <Select value={form.subscriptionStatus} onValueChange={(v: any) => setForm({...form, subscriptionStatus: v})}>
                              <SelectTrigger className="h-11 bg-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="active">Activa (Acceso Inmediato)</SelectItem>
                                <SelectItem value="suspended">Suspendida (Requiere Pago)</SelectItem>
                                <SelectItem value="blocked">Bloqueada (Inhabilitar Permanente)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {!isSuperAdmin && (
                    <div className="space-y-2 col-span-full">
                      <Label htmlFor="role" className="font-bold">Cargo / Función Clínica</Label>
                      <Select value={form.role} onValueChange={(v: any) => setForm({...form, role: v})}>
                        <SelectTrigger className="h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="doctor">Médico Odontólogo(a)</SelectItem>
                          <SelectItem value="assistant">Asistente Dental / Higienista</SelectItem>
                          <SelectItem value="technician">Técnico Dental / Especialista</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="colegiatura" className="font-bold">N° Colegiatura / Registro Profesional</Label>
                    <div className="relative">
                      <Stethoscope className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input id="colegiatura" value={form.colegiatura} onChange={e => setForm({...form, colegiatura: e.target.value})} required={!isSuperAdmin && form.role === 'doctor'} className="pl-10 h-11" placeholder="Ej: COP 12345" />
                    </div>
                  </div>

                  <div className="space-y-2 col-span-1">
                    <Label htmlFor="address" className="font-bold">Dirección del Establecimiento</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input id="address" className="pl-10 h-11" value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="Ej: Av. El Sol 123, Cusco" />
                    </div>
                  </div>
                </div>

                <DialogFooter className="pt-8 border-t">
                  <Button type="submit" className="w-full h-14 text-lg font-bold rounded-2xl shadow-xl shadow-primary/20 transition-all hover:scale-[1.02]">
                    {editingId ? 'Actualizar Información' : 'Registrar Consultorio y Activar Servicio'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {users.map((u) => (
            <Card key={u.id} className="border-none shadow-sm hover:shadow-xl transition-all group overflow-hidden bg-white/50 backdrop-blur-sm">
               <div className={cn("h-2", u.subscriptionStatus === 'active' ? 'bg-emerald-500' : u.subscriptionStatus === 'suspended' ? 'bg-amber-500' : 'bg-red-600')} />
               <CardHeader className="flex flex-row items-start gap-4 pb-4">
                 <Avatar className="w-16 h-16 rounded-2xl shadow-md">
                   <AvatarImage src={u.photo} />
                   <AvatarFallback className="bg-primary/10 text-primary">
                     {u.role === 'clinic' ? <Building2 /> : u.role === 'doctor' ? <Stethoscope /> : <Briefcase />}
                   </AvatarFallback>
                 </Avatar>
                 <div className="flex-1 min-w-0">
                   <div className="flex justify-between items-start">
                    <CardTitle className="text-lg truncate font-bold text-slate-800">{u.fullName || u.username}</CardTitle>
                   </div>
                   <CardDescription className="flex items-center gap-1 mt-1 font-bold text-primary/70 uppercase text-[10px] tracking-widest">
                     <Shield className="w-3 h-3" /> {
                       u.role === 'clinic' ? 'Establecimiento' : 
                       u.role === 'doctor' ? 'Odontólogo' : 
                       u.role === 'assistant' ? 'Asistente' : 'Técnico'
                     }
                   </CardDescription>
                 </div>
               </CardHeader>
               <CardContent className="space-y-4">
                 {isSuperAdmin && (
                   <div className="bg-slate-50 p-4 rounded-2xl text-[10px] space-y-3 border border-slate-100">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-muted-foreground uppercase">Estado:</span> 
                        <Badge variant={u.subscriptionStatus === 'active' ? 'default' : u.subscriptionStatus === 'suspended' ? 'secondary' : 'destructive'} className="text-[9px] h-5 font-black">
                          {u.subscriptionStatus === 'active' ? 'ACTIVA' : u.subscriptionStatus === 'suspended' ? 'SUSPENDIDA' : 'BLOQUEADA'}
                        </Badge>
                      </div>
                      <p className="flex justify-between">
                        <span className="font-bold text-muted-foreground uppercase">Costo Mensual:</span> 
                        <b className="text-primary font-bold text-sm">S/. {u.subscriptionFee?.toFixed(2)}</b>
                      </p>
                      <p className="flex justify-between">
                        <span className="font-bold text-muted-foreground uppercase">Vencimiento:</span> 
                        <b className="text-red-600 font-bold">{u.nextPaymentDate ? format(parseISO(u.nextPaymentDate), 'dd/MM/yyyy') : 'Pendiente'}</b>
                      </p>
                   </div>
                 )}
                 <div className="text-xs space-y-2 text-muted-foreground">
                    <p className="flex items-center gap-2 truncate font-medium"><MapPin className="w-3 h-3 text-primary" /> {u.address || 'Sin dirección registrada'}</p>
                    {u.colegiatura && <p className="flex items-center gap-2 font-medium"><Stethoscope className="w-3 h-3 text-primary" /> {u.colegiatura}</p>}
                 </div>
                 <div className="flex gap-2 pt-2">
                   <Button variant="outline" size="sm" className="gap-2 flex-1 h-10 rounded-xl hover:bg-primary/5 hover:text-primary transition-all" onClick={() => openEdit(u)}>
                     <Edit2 className="w-4 h-4" /> Editar
                   </Button>
                   <Button variant="ghost" size="sm" onClick={() => handleDelete(u.id)} className="h-10 w-10 text-destructive hover:bg-red-50 rounded-xl transition-all">
                     <Trash2 className="w-4 h-4" />
                   </Button>
                 </div>
               </CardContent>
            </Card>
          ))}
          {users.length === 0 && (
            <div className="col-span-full py-24 text-center opacity-30 flex flex-col items-center gap-6 border-2 border-dashed rounded-3xl">
              <Building2 className="w-20 h-20" />
              <div className="space-y-1">
                <p className="font-bold text-xl">Sin registros</p>
                <p className="text-sm">Empiece registrando el primer consultorio de la red.</p>
              </div>
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
