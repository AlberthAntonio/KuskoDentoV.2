"use client";

import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { AppLayout } from '@/components/layout/AppLayout';
import { db, Appointment, Patient, Treatment, User, Payment } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Calendar as CalendarIcon, Clock, User as UserIcon, Filter, Search, Check, Trash2, ShieldAlert, CalendarSearch } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format, isToday, isWithinInterval, addDays, parseISO } from 'date-fns';

function AppointmentsContent() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [rawAppointments, setRawAppointments] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState<string | null>(null);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'today' | 'week' | 'specific'>('all');
  const [specificDate, setSpecificDate] = useState('');
  
  const [form, setForm] = useState({
    patientId: '',
    treatmentId: '',
    doctorId: '',
    date: '',
    time: '',
    observations: '',
    status: 'Asignado' as 'Asignado' | 'Atendido',
    cost: 0,
    discountAmount: 0,
    paidAmount: 0,
    patientSearch: '',
  });

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [rawAppointments, filterType, specificDate]);

  const load = async () => {
    const allA = await db.getAll<Appointment>('appointments');
    const allP = await db.getAll<Patient>('patients');
    const allT = await db.getAll<Treatment>('treatments');
    const allU = await db.getAll<User>('users');
    
    setPatients(allP);
    setTreatments(allT);
    setUsers(allU);

    const combined = allA.map(a => ({
      ...a,
      patientName: allP.find(p => p.id === a.patientId)?.lastNames || 'Paciente',
      treatmentName: allT.find(t => t.id === a.treatmentId)?.name || 'Tratamiento'
    }));
    setRawAppointments(combined);
  };

  const applyFilters = () => {
    let filtered = [...rawAppointments];
    const today = new Date();

    if (filterType === 'today') {
      filtered = filtered.filter(a => isToday(parseISO(a.date)));
    } else if (filterType === 'week') {
      const nextWeek = addDays(today, 7);
      filtered = filtered.filter(a => {
        const appDate = parseISO(a.date);
        return isWithinInterval(appDate, { start: today, end: nextWeek });
      });
    } else if (filterType === 'specific' && specificDate) {
      filtered = filtered.filter(a => a.date === specificDate);
    }

    setAppointments(filtered.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.time.localeCompare(b.time);
    }));
  };

  const handleTreatmentChange = (tid: string) => {
    const t = treatments.find(x => x.id === tid);
    setForm({ ...form, treatmentId: tid, cost: t ? t.price : 0 });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar duplicidad de hora para el mismo doctor
    const conflict = rawAppointments.find(a => 
      a.doctorId === form.doctorId && 
      a.date === form.date && 
      a.time === form.time
    );

    if (conflict) {
      toast({ 
        variant: 'destructive', 
        title: 'Conflicto de Horario', 
        description: `El doctor seleccionado ya tiene una cita programada a las ${form.time} en esta fecha.` 
      });
      return;
    }

    const doctor = users.find(u => u.id === form.doctorId);
    const finalCost = Math.max(0, form.cost - form.discountAmount);
    const paid = Math.min(finalCost, form.paidAmount);
    const balance = Math.max(0, finalCost - paid);

    const appointment: Appointment = {
      id: crypto.randomUUID(),
      patientId: form.patientId,
      treatmentId: form.treatmentId,
      doctorId: form.doctorId,
      doctorName: doctor?.fullName || doctor?.username || 'Médico',
      date: form.date,
      time: form.time,
      observations: form.observations,
      status: form.status,
      cost: finalCost,
      applyDiscount: form.discountAmount > 0,
      paidAmount: paid,
      balance: balance,
    };

    await db.put('appointments', appointment);

    if (paid > 0 || finalCost > 0) {
      const treatment = treatments.find(t => t.id === form.treatmentId);
      const payment: Payment = {
        id: crypto.randomUUID(),
        patientId: form.patientId,
        appointmentId: appointment.id,
        treatmentName: treatment?.name || 'Consulta',
        amount: paid,
        totalCost: finalCost,
        totalPaid: paid,
        balance: balance,
        date: form.date,
        time: form.time,
        observations: form.observations,
        history: paid > 0 ? [{ date: form.date, time: form.time, amount: paid }] : []
      };
      await db.put('payments', payment);
    }

    setIsOpen(false);
    toast({ title: "Cita Registrada", description: `Saldo: S/. ${balance.toFixed(2)}` });
    setForm({ patientId: '', treatmentId: '', doctorId: '', date: '', time: '', observations: '', status: 'Asignado', cost: 0, discountAmount: 0, paidAmount: 0, patientSearch: '' });
    load();
  };

  const updateStatus = async (appointmentId: string, newStatus: 'Asignado' | 'Atendido') => {
    const app = rawAppointments.find(a => a.id === appointmentId);
    if (app) {
      await db.put('appointments', { ...app, status: newStatus });
      toast({ title: "Estado Actualizado", description: `La cita ahora está marcada como ${newStatus}` });
      load();
    }
  };

  const handleDeleteRequest = (id: string) => {
    setAppointmentToDelete(id);
    setConfirmPassword('');
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!currentUser) return;
    
    const allUsers = await db.getAll<User>('users');
    const me = allUsers.find(u => u.id === currentUser.id);
    
    if (me && me.password === confirmPassword) {
      if (appointmentToDelete) {
        await db.delete('appointments', appointmentToDelete);
        setIsDeleteOpen(false);
        setAppointmentToDelete(null);
        toast({ title: "Cita Eliminada" });
        load();
      }
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'Contraseña incorrecta. No se puede eliminar la cita.' });
    }
  };

  const filteredPatientList = patients.filter(p => 
    p.names.toLowerCase().includes(form.patientSearch.toLowerCase()) || 
    p.lastNames.toLowerCase().includes(form.patientSearch.toLowerCase()) ||
    p.dni.includes(form.patientSearch)
  );

  const previewFinal = Math.max(0, form.cost - form.discountAmount);
  const previewBalance = Math.max(0, previewFinal - form.paidAmount);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-primary">Agenda de Citas</h2>
            <p className="text-muted-foreground mt-1">Gestión de turnos y presupuestos</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setFilterType('all'); setSpecificDate(''); }} className={cn(filterType === 'all' && "bg-primary/10")}>
              Ver Todo
            </Button>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 h-12">
                  <Plus className="w-5 h-5" /> Nueva Cita
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Programar Cita</DialogTitle></DialogHeader>
                <form onSubmit={handleSave} className="grid grid-cols-2 gap-4 py-4">
                  <div className="col-span-2 space-y-2 relative">
                    <Label>Buscar Paciente (Escribe DNI o Nombre)</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 w-4 h-4 opacity-50" />
                      <Input 
                        placeholder="Ej: 45678912 o Juan Pérez" 
                        className="pl-10 h-11" 
                        value={form.patientSearch} 
                        onChange={e => setForm({...form, patientSearch: e.target.value, patientId: ''})} 
                      />
                    </div>
                    {form.patientSearch && form.patientId === '' && (
                      <div className="border rounded-md max-h-48 overflow-y-auto bg-white shadow-2xl absolute w-full top-full mt-1 z-[100] border-primary/20">
                        {filteredPatientList.length > 0 ? filteredPatientList.map(p => (
                          <div 
                            key={p.id} 
                            className="p-3 cursor-pointer hover:bg-primary/10 border-b flex justify-between items-center bg-white" 
                            onClick={() => setForm({...form, patientId: p.id, patientSearch: `${p.lastNames}, ${p.names} (DNI: ${p.dni})`})}
                          >
                            <div>
                              <p className="font-bold">{p.lastNames}, {p.names}</p>
                              <p className="text-[10px] text-muted-foreground">Celular: {p.phone}</p>
                            </div>
                            <Badge variant="outline" className="font-mono">DNI: {p.dni}</Badge>
                          </div>
                        )) : (
                          <div className="p-4 text-center text-xs text-muted-foreground bg-white">No se encontró el paciente</div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Tratamiento</Label>
                    <Select onValueChange={handleTreatmentChange}>
                      <SelectTrigger><SelectValue placeholder="Seleccione..." /></SelectTrigger>
                      <SelectContent>
                        {treatments.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Médico</Label>
                    <Select onValueChange={v => setForm({...form, doctorId: v})}>
                      <SelectTrigger><SelectValue placeholder="Seleccione Doctor" /></SelectTrigger>
                      <SelectContent>
                        {users.map(u => <SelectItem key={u.id} value={u.id}>{u.fullName || u.username}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Fecha</Label>
                    <Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required />
                  </div>

                  <div className="space-y-2">
                    <Label>Hora</Label>
                    <Input type="time" value={form.time} onChange={e => setForm({...form, time: e.target.value})} required />
                  </div>

                  <div className="col-span-2 space-y-2">
                    <Label>Observaciones</Label>
                    <Textarea value={form.observations} onChange={e => setForm({...form, observations: e.target.value})} />
                  </div>

                  <div className="space-y-2">
                    <Label>Costo Base (S/.)</Label>
                    <Input type="number" step="0.01" value={form.cost} onChange={e => setForm({...form, cost: parseFloat(e.target.value) || 0})} />
                  </div>

                  <div className="space-y-2">
                    <Label>Descuento Directo (S/.)</Label>
                    <Input type="number" step="0.01" value={form.discountAmount} onChange={e => setForm({...form, discountAmount: parseFloat(e.target.value) || 0})} className="text-emerald-600 font-bold" />
                  </div>

                  <div className="space-y-2">
                    <Label>Abono inicial (S/.)</Label>
                    <Input type="number" step="0.01" value={form.paidAmount} onChange={e => setForm({...form, paidAmount: parseFloat(e.target.value) || 0})} />
                  </div>

                  <div className="space-y-2">
                    <Label>Estado de la Cita</Label>
                    <Select onValueChange={v => setForm({...form, status: v as any})} defaultValue="Asignado">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Asignado">Asignado</SelectItem>
                        <SelectItem value="Atendido">Atendido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-2 bg-muted p-4 rounded-lg flex justify-between items-center">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">Total Final</span>
                      <p className="text-lg font-bold">S/. {previewFinal.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">Saldo Pendiente</span>
                      <p className="text-lg font-bold text-amber-600">S/. {previewBalance.toFixed(2)}</p>
                    </div>
                  </div>

                  <DialogFooter className="col-span-full pt-4">
                    <Button type="submit" className="w-full h-12" disabled={!form.patientId}>Guardar Cita</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="md:col-span-1 border-none shadow-sm h-fit">
             <CardHeader className="border-b"><CardTitle className="text-lg">Filtros de Agenda</CardTitle></CardHeader>
             <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Button 
                    variant={filterType === 'today' ? 'secondary' : 'ghost'} 
                    className="w-full justify-start"
                    onClick={() => { setFilterType('today'); setSpecificDate(''); }}
                  >
                    <Clock className="w-4 h-4 mr-2" /> Hoy
                  </Button>
                  <Button 
                    variant={filterType === 'week' ? 'secondary' : 'ghost'} 
                    className="w-full justify-start"
                    onClick={() => { setFilterType('week'); setSpecificDate(''); }}
                  >
                    <CalendarIcon className="w-4 h-4 mr-2" /> Esta Semana
                  </Button>
                </div>
                
                <div className="pt-4 border-t space-y-2">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">Buscar por fecha específica</Label>
                  <div className="flex gap-2">
                    <Input 
                      type="date" 
                      className="h-9 text-xs" 
                      value={specificDate} 
                      onChange={(e) => {
                        setSpecificDate(e.target.value);
                        setFilterType('specific');
                      }} 
                    />
                    <Button size="icon" variant="outline" className="h-9 w-9 shrink-0">
                      <CalendarSearch className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
             </CardContent>
          </Card>

          <Card className="md:col-span-3 border-none shadow-sm p-6 overflow-hidden">
             <div className="mb-4 flex justify-between items-center">
                <Badge variant="outline" className="text-primary border-primary">
                  {filterType === 'all' ? 'Todas las citas' : 
                   filterType === 'today' ? 'Citas de hoy' : 
                   filterType === 'week' ? 'Citas de la semana' : 
                   `Citas del ${specificDate}`}
                </Badge>
                <span className="text-xs text-muted-foreground">{appointments.length} resultados encontrados</span>
             </div>
             <div className="overflow-x-auto">
               <Table>
                 <TableHeader className="bg-muted/50">
                   <TableRow>
                     <TableHead>Fecha / Hora</TableHead>
                     <TableHead>Paciente</TableHead>
                     <TableHead>Tratamiento</TableHead>
                     <TableHead>Saldos</TableHead>
                     <TableHead>Estado</TableHead>
                     <TableHead className="text-right">Acciones</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {appointments.map(a => (
                     <TableRow key={a.id}>
                       <TableCell>
                         <div className="flex flex-col">
                           <span className="font-bold flex items-center gap-1"><Clock className="w-3 h-3" /> {a.time}</span>
                           <span className="text-[10px] text-muted-foreground">{a.date}</span>
                         </div>
                       </TableCell>
                       <TableCell>
                          <div className="font-medium">{a.patientName}</div>
                          <div className="text-[10px] text-muted-foreground italic">Dr. {a.doctorName}</div>
                       </TableCell>
                       <TableCell className="text-xs uppercase">{a.treatmentName}</TableCell>
                       <TableCell>
                          <div className="font-bold">S/. {a.cost.toFixed(2)}</div>
                          <div className={cn("text-[10px] font-bold", a.balance > 0 ? "text-amber-600" : "text-emerald-600")}>
                            {a.balance > 0 ? `Saldo: S/. ${a.balance.toFixed(2)}` : 'Liquidado'}
                          </div>
                       </TableCell>
                       <TableCell>
                          <Select value={a.status} onValueChange={(v) => updateStatus(a.id, v as any)}>
                            <SelectTrigger className="w-28 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Asignado">Asignado</SelectItem>
                              <SelectItem value="Atendido">Atendido</SelectItem>
                            </SelectContent>
                          </Select>
                       </TableCell>
                       <TableCell className="text-right">
                         <Button variant="ghost" size="icon" onClick={() => handleDeleteRequest(a.id)} className="text-destructive">
                           <Trash2 className="w-4 h-4" />
                         </Button>
                       </TableCell>
                     </TableRow>
                   ))}
                   {appointments.length === 0 && (
                     <TableRow><TableCell colSpan={6} className="text-center py-10 opacity-50">No hay citas registradas para este filtro</TableCell></TableRow>
                   )}
                 </TableBody>
               </Table>
             </div>
          </Card>
        </div>
      </div>

      {/* Modal de eliminación con contraseña */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="w-5 h-5" /> Confirmar Eliminación
            </DialogTitle>
            <DialogDescription>
              Para eliminar esta cita, por seguridad debe ingresar su contraseña de administrador.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="pass-confirm">Contraseña de Administrador</Label>
              <Input 
                id="pass-confirm" 
                type="password" 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                placeholder="••••••••"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDelete}>Eliminar Cita Permanentemente</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

export default function AppointmentsPage() {
  return (
    <AuthProvider>
      <AppointmentsContent />
    </AuthProvider>
  );
}