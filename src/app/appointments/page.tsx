
"use client";

import { useState, useEffect } from 'react';
import { AuthProvider } from '@/hooks/use-auth';
import { AppLayout } from '@/components/layout/AppLayout';
import { db, Appointment, Patient, Treatment, User, Payment } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Calendar as CalendarIcon, Clock, User as UserIcon, Filter, Search, CheckCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

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
    applyDiscount: false,
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
      patientName: allP.find(p => p.id === a.patientId)?.lastNames || 'Desconocido',
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
    const costFinal = form.applyDiscount ? form.cost * 0.9 : form.cost; // Ejemplo 10% descuento
    const balance = costFinal - form.paidAmount;

    const appointment: Appointment = {
      id: crypto.randomUUID(),
      patientId: form.patientId,
      treatmentId: form.treatmentId,
      doctorId: form.doctorId,
      doctorName: doctor?.username || 'Desconocido',
      date: form.date,
      time: form.time,
      observations: form.observations,
      status: form.status,
      cost: costFinal,
      applyDiscount: form.applyDiscount,
      paidAmount: form.paidAmount,
      balance: balance,
    };

    await db.put('appointments', appointment);

    // Si hubo un pago, registrarlo
    if (form.paidAmount > 0) {
      const treatment = treatments.find(t => t.id === form.treatmentId);
      const payment: Payment = {
        id: crypto.randomUUID(),
        patientId: form.patientId,
        appointmentId: appointment.id,
        treatmentName: treatment?.name || 'Varios',
        amount: form.paidAmount,
        totalCost: costFinal,
        totalPaid: form.paidAmount,
        balance: balance,
        date: form.date,
        time: form.time,
        observations: form.observations,
      };
      await db.put('payments', payment);
    }

    setIsOpen(false);
    toast({ title: "Cita Agendada", description: `Cita para el paciente registrada con éxito.` });
    load();
  };

  const filteredPatientList = patients.filter(p => 
    p.names.toLowerCase().includes(form.patientSearch.toLowerCase()) || 
    p.lastNames.toLowerCase().includes(form.patientSearch.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-primary">Agenda de Citas</h2>
            <p className="text-muted-foreground mt-1">Gestión integral de visitas y cobros</p>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 h-12">
                <Plus className="w-5 h-5" />
                Nueva Cita
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Programar Nueva Cita</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSave} className="grid grid-cols-2 gap-4 py-4">
                <div className="col-span-2 space-y-2">
                  <Label>Buscar Paciente</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 opacity-50" />
                    <Input 
                      placeholder="Escriba nombre o apellido..." 
                      className="pl-10"
                      value={form.patientSearch} 
                      onChange={e => setForm({...form, patientSearch: e.target.value})}
                    />
                  </div>
                  {form.patientSearch && (
                    <div className="border rounded-md max-h-32 overflow-y-auto mt-1">
                      {filteredPatientList.map(p => (
                        <div 
                          key={p.id} 
                          className={`p-2 cursor-pointer hover:bg-muted text-sm ${form.patientId === p.id ? 'bg-primary/10' : ''}`}
                          onClick={() => setForm({...form, patientId: p.id, patientSearch: `${p.lastNames}, ${p.names}`})}
                        >
                          {p.lastNames}, {p.names} (DNI: {p.dni})
                        </div>
                      ))}
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
                  <Label>Observaciones de la Cita</Label>
                  <Textarea value={form.observations} onChange={e => setForm({...form, observations: e.target.value})} />
                </div>

                <div className="space-y-2">
                  <Label>Costo (S/.)</Label>
                  <Input type="number" step="0.01" value={form.cost} onChange={e => setForm({...form, cost: parseFloat(e.target.value)})} />
                </div>

                <div className="space-y-2">
                  <Label>¿Pago hoy? (S/.)</Label>
                  <Input type="number" step="0.01" value={form.paidAmount} onChange={e => setForm({...form, paidAmount: parseFloat(e.target.value)})} />
                </div>

                <div className="flex items-center gap-2 pt-4">
                  <Checkbox id="discount" checked={form.applyDiscount} onCheckedChange={v => setForm({...form, applyDiscount: !!v})} />
                  <Label htmlFor="discount">Aplicar Descuento (10%)</Label>
                </div>

                <div className="space-y-2 pt-2">
                  <Label>Estado</Label>
                  <Select onValueChange={v => setForm({...form, status: v as any})} defaultValue="Asignado">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asignado">Asignado</SelectItem>
                      <SelectItem value="Atendido">Atendido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <DialogFooter className="col-span-2 pt-4">
                  <Button type="submit" className="w-full h-12">Guardar Cita</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="md:col-span-1 border-none shadow-sm">
             <CardHeader className="border-b pb-4"><CardTitle className="text-lg">Filtros</CardTitle></CardHeader>
             <CardContent className="pt-6 space-y-4">
                <Button variant="secondary" className="w-full justify-start gap-2">Hoy</Button>
                <Button variant="ghost" className="w-full justify-start gap-2">Mañana</Button>
                <Button variant="outline" className="w-full justify-start gap-2 mt-4"><Filter className="w-4 h-4" /> Seleccionar Día</Button>
             </CardContent>
          </Card>

          <Card className="md:col-span-3 border-none shadow-sm p-6">
             <h3 className="text-xl font-bold mb-6">Próximas Visitas</h3>
             <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Fecha/Hora</TableHead>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Tratamiento</TableHead>
                      <TableHead>Costo/Saldo</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {appointments.map(a => (
                      <TableRow key={a.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-bold flex items-center gap-1"><Clock className="w-3 h-3 text-primary" /> {a.time}</span>
                            <span className="text-[10px] text-muted-foreground">{a.date}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                           <div className="font-medium flex items-center gap-2"><UserIcon className="w-3 h-3 text-primary" /> {a.patientName}</div>
                           <div className="text-[10px] text-muted-foreground">Dr. {a.doctorName}</div>
                        </TableCell>
                        <TableCell className="text-xs">{a.treatmentName}</TableCell>
                        <TableCell>
                           <div className="font-bold">S/. {a.cost.toFixed(2)}</div>
                           <div className="text-[10px] text-amber-600 font-bold">Saldo: S/. {a.balance.toFixed(2)}</div>
                        </TableCell>
                        <TableCell>
                           <Badge variant={a.status === 'Atendido' ? 'default' : 'secondary'} className={a.status === 'Atendido' ? 'bg-emerald-500' : ''}>
                             {a.status}
                           </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {appointments.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center py-20 text-muted-foreground">
                         <CalendarIcon className="w-12 h-12 mx-auto mb-4 opacity-10" />
                         No hay citas programadas
                      </TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
             </div>
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
