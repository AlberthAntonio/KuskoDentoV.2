"use client";

import { useEffect, useMemo, useState } from 'react';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Calendar as CalendarIcon, Clock, Search, Trash2, ShieldAlert } from 'lucide-react';
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

type ApiPatient = {
  id: string;
  dni: string;
  full_name: string;
  phone: string;
};

type ApiTreatment = {
  id: string;
  name: string;
  price: string | number;
};

type ApiAppointment = {
  id: string;
  patient_id: string;
  doctor_id: string;
  treatment_id?: string | null;
  date: string;
  time: string;
  cost: string | number;
  status: string;
  observations?: string | null;
  patient?: { id: string; full_name: string; dni: string };
  doctor?: { id: string; full_name: string | null; email: string | null };
  treatment?: { id: string; name: string; price: string | number };
};

type ViewAppointment = {
  id: string;
  patientId: string;
  doctorId: string;
  treatmentId?: string;
  dateIso: string;
  dateKey: string;
  time: string;
  patientName: string;
  treatmentName: string;
  doctorName: string;
  cost: number;
  status: 'Asignado' | 'Atendido';
};

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(body?.error || 'Error de API');
  }

  // Compatibilidad con respuestas planas (apiOk) y con envoltura { success, data }.
  if (typeof body === 'object' && body !== null && 'success' in body) {
    const wrapped = body as { success?: boolean; data?: T; error?: string };
    if (!wrapped.success) {
      throw new Error(wrapped.error || 'Error de API');
    }
    return (wrapped.data as T) ?? (body as T);
  }

  return body as T;
}

function mapStatusToUi(status: string): 'Asignado' | 'Atendido' {
  return status === 'completed' || status === 'attended' ? 'Atendido' : 'Asignado';
}

function mapStatusToApi(status: 'Asignado' | 'Atendido'): 'scheduled' | 'completed' {
  return status === 'Atendido' ? 'completed' : 'scheduled';
}

function toDateKey(isoDate: string) {
  const d = parseISO(isoDate);
  return format(d, 'yyyy-MM-dd');
}

function AppointmentsContent() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [rawAppointments, setRawAppointments] = useState<ViewAppointment[]>([]);
  const [appointments, setAppointments] = useState<ViewAppointment[]>([]);
  const [patients, setPatients] = useState<ApiPatient[]>([]);
  const [treatments, setTreatments] = useState<ApiTreatment[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState<string | null>(null);
  const [confirmWord, setConfirmWord] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'today' | 'week' | 'specific'>('all');
  const [specificDate, setSpecificDate] = useState('');

  const doctorOptions = useMemo(
    () => [
      {
        id: currentUser?.id || '',
        label: currentUser?.fullName || currentUser?.full_name || currentUser?.email || 'Odontologo',
      },
    ],
    [currentUser?.id, currentUser?.fullName, currentUser?.full_name, currentUser?.email]
  );

  const [form, setForm] = useState({
    patientId: '',
    treatmentId: '',
    doctorId: '',
    date: '',
    time: '',
    observations: '',
    status: 'Asignado' as 'Asignado' | 'Atendido',
    cost: 0,
    patientSearch: '',
  });

  useEffect(() => {
    if (currentUser) {
      load();
      setForm((prev) => ({ ...prev, doctorId: currentUser.id }));
    }
  }, [currentUser?.id]);

  useEffect(() => {
    applyFilters();
  }, [rawAppointments, filterType, specificDate]);

  const load = async () => {
    try {
      const [patientsData, treatmentsData, appointmentsData] = await Promise.all([
        apiRequest<{ items: ApiPatient[]; total: number; page: number; limit: number; totalPages: number }>('/api/patients?limit=200'),
        apiRequest<{ items: ApiTreatment[] }>('/api/treatments'),
        apiRequest<{ items: ApiAppointment[] }>('/api/appointments'),
      ]);

      setPatients(patientsData.items || []);
      setTreatments(treatmentsData.items || []);

      const mapped: ViewAppointment[] = (appointmentsData.items || []).map((a) => ({
        id: a.id,
        patientId: a.patient_id,
        doctorId: a.doctor_id,
        treatmentId: a.treatment_id || undefined,
        dateIso: a.date,
        dateKey: toDateKey(a.date),
        time: a.time,
        patientName: a.patient?.full_name || 'Paciente',
        treatmentName: a.treatment?.name || 'Tratamiento',
        doctorName: a.doctor?.full_name || a.doctor?.email || 'Doctor',
        cost: Number(a.cost) || 0,
        status: mapStatusToUi(a.status),
      }));

      setRawAppointments(mapped);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'No se pudo cargar agenda',
        description: error instanceof Error ? error.message : 'Error inesperado',
      });
    }
  };

  const applyFilters = () => {
    let filtered = [...rawAppointments];
    const today = new Date();

    if (filterType === 'today') {
      filtered = filtered.filter((a) => isToday(parseISO(a.dateIso)));
    } else if (filterType === 'week') {
      const nextWeek = addDays(today, 7);
      filtered = filtered.filter((a) => {
        const appDate = parseISO(a.dateIso);
        return isWithinInterval(appDate, { start: today, end: nextWeek });
      });
    } else if (filterType === 'specific' && specificDate) {
      filtered = filtered.filter((a) => a.dateKey === specificDate);
    }

    setAppointments(
      filtered.sort((a, b) => {
        const dateCompare = a.dateKey.localeCompare(b.dateKey);
        if (dateCompare !== 0) return dateCompare;
        return a.time.localeCompare(b.time);
      })
    );
  };

  const handleTreatmentChange = (tid: string) => {
    const t = treatments.find((x) => x.id === tid);
    setForm({ ...form, treatmentId: tid, cost: Number(t?.price || 0) });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const conflict = rawAppointments.find(
      (a) => a.doctorId === form.doctorId && a.dateKey === form.date && a.time === form.time
    );

    if (conflict) {
      toast({
        variant: 'destructive',
        title: 'Conflicto de horario',
        description: `El doctor ya tiene una cita programada a las ${form.time}.`,
      });
      return;
    }

    try {
      await apiRequest('/api/appointments', {
        method: 'POST',
        body: JSON.stringify({
          patient_id: form.patientId,
          doctor_id: form.doctorId,
          treatment_id: form.treatmentId || undefined,
          date: form.date,
          time: form.time,
          cost: Math.max(0.01, form.cost),
          status: mapStatusToApi(form.status),
          observations: form.observations || undefined,
        }),
      });

      setIsOpen(false);
      toast({ title: 'Cita registrada' });
      setForm({
        patientId: '',
        treatmentId: '',
        doctorId: currentUser?.id || '',
        date: '',
        time: '',
        observations: '',
        status: 'Asignado',
        cost: 0,
        patientSearch: '',
      });
      load();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'No se pudo guardar la cita',
        description: error instanceof Error ? error.message : 'Error inesperado',
      });
    }
  };

  const updateStatus = async (appointmentId: string, newStatus: 'Asignado' | 'Atendido') => {
    try {
      await apiRequest(`/api/appointments/${appointmentId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: mapStatusToApi(newStatus) }),
      });
      toast({ title: 'Estado actualizado', description: `La cita ahora esta en ${newStatus}.` });
      load();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'No se pudo actualizar estado',
        description: error instanceof Error ? error.message : 'Error inesperado',
      });
    }
  };

  const handleDeleteRequest = (id: string) => {
    setAppointmentToDelete(id);
    setConfirmWord('');
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!appointmentToDelete) return;

    if (confirmWord.trim().toUpperCase() !== 'ELIMINAR') {
      toast({
        variant: 'destructive',
        title: 'Confirmacion invalida',
        description: 'Escriba ELIMINAR para confirmar la eliminacion.',
      });
      return;
    }

    try {
      await apiRequest(`/api/appointments/${appointmentToDelete}`, { method: 'DELETE' });
      setIsDeleteOpen(false);
      setAppointmentToDelete(null);
      toast({ title: 'Cita eliminada' });
      load();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'No se pudo eliminar cita',
        description: error instanceof Error ? error.message : 'Error inesperado',
      });
    }
  };

  const filteredPatientList = patients.filter(
    (p) =>
      p.full_name.toLowerCase().includes(form.patientSearch.toLowerCase()) ||
      p.dni.includes(form.patientSearch)
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-primary">Agenda de Citas</h2>
            <p className="text-muted-foreground mt-1">Gestion de turnos y agenda clinica</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setFilterType('all'); setSpecificDate(''); }} className={cn(filterType === 'all' && 'bg-primary/10')}>
              Ver Todo
            </Button>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 h-12">
                  <Plus className="w-5 h-5" /> Nueva Cita
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Programar Cita</DialogTitle>
                  <DialogDescription>
                    Complete los datos del paciente y horario para registrar una nueva cita.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSave} className="grid grid-cols-2 gap-4 py-4">
                  <div className="col-span-2 space-y-2 relative">
                    <Label>Buscar Paciente</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 w-4 h-4 opacity-50" />
                      <Input
                        placeholder="Ej: 45678912 o Juan Perez"
                        className="pl-10 h-11"
                        value={form.patientSearch}
                        onChange={(e) => setForm({ ...form, patientSearch: e.target.value, patientId: '' })}
                      />
                    </div>
                    {form.patientSearch && form.patientId === '' && (
                      <div className="border rounded-md max-h-48 overflow-y-auto bg-white shadow-2xl absolute w-full top-full mt-1 z-[100] border-primary/20">
                        {filteredPatientList.length > 0 ? (
                          filteredPatientList.map((p) => (
                            <div
                              key={p.id}
                              className="p-3 cursor-pointer hover:bg-primary/10 border-b flex justify-between items-center bg-white"
                              onClick={() => setForm({ ...form, patientId: p.id, patientSearch: `${p.full_name} (DNI: ${p.dni})` })}
                            >
                              <div>
                                <p className="font-bold">{p.full_name}</p>
                                <p className="text-[10px] text-muted-foreground">Celular: {p.phone}</p>
                              </div>
                              <Badge variant="outline" className="font-mono">
                                DNI: {p.dni}
                              </Badge>
                            </div>
                          ))
                        ) : (
                          <div className="p-4 text-center text-xs text-muted-foreground bg-white">No se encontro el paciente</div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Tratamiento</Label>
                    <Select onValueChange={handleTreatmentChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {treatments.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Medico</Label>
                    <Select onValueChange={(v) => setForm({ ...form, doctorId: v })} value={form.doctorId || undefined}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione Doctor" />
                      </SelectTrigger>
                      <SelectContent>
                        {doctorOptions.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Fecha</Label>
                    <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
                  </div>

                  <div className="space-y-2">
                    <Label>Hora</Label>
                    <Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} required />
                  </div>

                  <div className="col-span-2 space-y-2">
                    <Label>Observaciones</Label>
                    <Textarea value={form.observations} onChange={(e) => setForm({ ...form, observations: e.target.value })} />
                  </div>

                  <div className="space-y-2">
                    <Label>Costo (S/.)</Label>
                    <Input type="number" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: parseFloat(e.target.value) || 0 })} />
                  </div>

                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Select onValueChange={(v) => setForm({ ...form, status: v as 'Asignado' | 'Atendido' })} defaultValue="Asignado">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Asignado">Asignado</SelectItem>
                        <SelectItem value="Atendido">Atendido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <DialogFooter className="col-span-full pt-4">
                    <Button type="submit" className="w-full h-12" disabled={!form.patientId || !form.doctorId}>
                      Guardar Cita
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="md:col-span-1 border-none shadow-sm h-fit">
            <CardHeader className="border-b">
              <CardTitle className="text-lg">Filtros de Agenda</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Button variant={filterType === 'today' ? 'secondary' : 'ghost'} className="w-full justify-start" onClick={() => { setFilterType('today'); setSpecificDate(''); }}>
                  <Clock className="w-4 h-4 mr-2" /> Hoy
                </Button>
                <Button variant={filterType === 'week' ? 'secondary' : 'ghost'} className="w-full justify-start" onClick={() => { setFilterType('week'); setSpecificDate(''); }}>
                  <CalendarIcon className="w-4 h-4 mr-2" /> Esta Semana
                </Button>
              </div>

              <div className="pt-4 border-t space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Buscar por fecha especifica</Label>
                <Input
                  type="date"
                  className="h-9 text-xs"
                  value={specificDate}
                  onChange={(e) => {
                    setSpecificDate(e.target.value);
                    setFilterType('specific');
                  }}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-3 border-none shadow-sm p-6 overflow-hidden">
            <div className="mb-4 flex justify-between items-center">
              <Badge variant="outline" className="text-primary border-primary">
                {filterType === 'all'
                  ? 'Todas las citas'
                  : filterType === 'today'
                    ? 'Citas de hoy'
                    : filterType === 'week'
                      ? 'Citas de la semana'
                      : `Citas del ${specificDate ? format(parseISO(specificDate), 'dd/MM/yyyy') : ''}`}
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
                    <TableHead>Costo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appointments.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {a.time}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{format(parseISO(a.dateIso), 'dd/MM/yyyy')}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{a.patientName}</div>
                        <div className="text-[10px] text-muted-foreground italic">Dr. {a.doctorName}</div>
                      </TableCell>
                      <TableCell className="text-xs uppercase">{a.treatmentName}</TableCell>
                      <TableCell>
                        <div className="font-bold">S/. {a.cost.toFixed(2)}</div>
                      </TableCell>
                      <TableCell>
                        <Select value={a.status} onValueChange={(v) => updateStatus(a.id, v as 'Asignado' | 'Atendido')}>
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
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 opacity-50">
                        No hay citas registradas para este filtro
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      </div>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="w-5 h-5" /> Confirmar Eliminacion
            </DialogTitle>
            <DialogDescription>Esta accion es irreversible. Escriba ELIMINAR para continuar.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="delete-confirm">Confirmacion</Label>
              <Input id="delete-confirm" value={confirmWord} onChange={(e) => setConfirmWord(e.target.value)} placeholder="ELIMINAR" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Eliminar Cita Permanentemente
            </Button>
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
