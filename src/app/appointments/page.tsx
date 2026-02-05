
"use client";

import { useState, useEffect } from 'react';
import { AuthProvider } from '@/hooks/use-auth';
import { AppLayout } from '@/components/layout/AppLayout';
import { db, Appointment, Patient, Treatment, User, Payment } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Calendar as CalendarIcon, Clock, User as UserIcon, Filter, Search, Check } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

function AppointmentsContent() {
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  
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
    setAppointments(combined);
  };

  const handleTreatmentChange = (tid: string) => {
    const t = treatments.find(x => x.id === tid);
    setForm({ ...form, treatmentId: tid, cost: t ? t.price : 0 });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const doctor = users.find(u => u.id === form.doctorId);
    const finalCost = Math.max(0, form.cost - form.discountAmount);
    const paid = Math.min(finalCost, form.paidAmount);
    const balance = Math.max(0, finalCost - paid);

    const appointment: Appointment = {
      id: crypto.randomUUID(),
      patientId: form.patientId,
      treatmentId: form.treatmentId,
      doctorId: form.doctorId,
      doctorName: doctor?.username || 'Médico',
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

    if (paid > 0) {
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
      };
      await db.put('payments', payment);
    }

    setIsOpen(false);
    toast({ title: "Cita Registrada", description: `Saldo: S/. ${balance.toFixed(2)}` });
    setForm({ patientId: '', treatmentId: '', doctorId: '', date: '', time: '', observations: '', status: 'Asignado', cost: 0, discountAmount: 0, paidAmount: 0, patientSearch: '' });
    load();
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
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 h-12">
                <Plus className="w-5 h-5" /> Nueva Cita
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px]">
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
                    <SelectTrigger><SelectValue placeholder="Seleccione..." /></SelectTrigger>
                    <SelectContent>
                      {users.map(u => <SelectItem key={u.id} value={u.id}>{u.username}</SelectItem>)}
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

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="md:col-span-1 border-none shadow-sm h-fit">
             <CardHeader className="border-b"><CardTitle className="text-lg">Próximas Citas</CardTitle></CardHeader>
             <CardContent className="pt-6">
                <Button variant="secondary" className="w-full justify-start mb-2">Hoy</Button>
                <Button variant="ghost" className="w-full justify-start">Semana</Button>
             </CardContent>
          </Card>

          <Card className="md:col-span-3 border-none shadow-sm p-6">
             <Table>
               <TableHeader className="bg-muted/50">
                 <TableRow>
                   <TableHead>Fecha / Hora</TableHead>
                   <TableHead>Paciente</TableHead>
                   <TableHead>Tratamiento</TableHead>
                   <TableHead>Saldos</TableHead>
                   <TableHead>Estado</TableHead>
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
                        <div className="text-[10px] text-muted-foreground">Doctor: {a.doctorName}</div>
                     </TableCell>
                     <TableCell className="text-xs uppercase">{a.treatmentName}</TableCell>
                     <TableCell>
                        <div className="font-bold">S/. {a.cost.toFixed(2)}</div>
                        <div className={cn("text-[10px] font-bold", a.balance > 0 ? "text-amber-600" : "text-emerald-600")}>
                          {a.balance > 0 ? `Saldo: S/. ${a.balance.toFixed(2)}` : 'Liquidado'}
                        </div>
                     </TableCell>
                     <TableCell>
                        <Badge variant={a.status === 'Atendido' ? 'default' : 'outline'}>{a.status}</Badge>
                     </TableCell>
                   </TableRow>
                 ))}
                 {appointments.length === 0 && (
                   <TableRow><TableCell colSpan={5} className="text-center py-10 opacity-50">No hay citas registradas</TableCell></TableRow>
                 )}
               </TableBody>
             </Table>
          </Card>
        </div>
      </div>
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
