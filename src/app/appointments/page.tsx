"use client";

import { useState, useEffect } from 'react';
import { AuthProvider } from '@/hooks/use-auth';
import { AppLayout } from '@/components/layout/AppLayout';
import { db, Appointment, Patient } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Calendar as CalendarIcon, Clock, User, Filter } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

function AppointmentsContent() {
  const [appointments, setAppointments] = useState<any[]>([]);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const allA = await db.getAll<Appointment>('appointments');
    const allP = await db.getAll<Patient>('patients');
    
    const combined = allA.map(a => ({
      ...a,
      patientName: allP.find(p => p.id === a.patientId)?.lastNames || 'Desconocido'
    }));
    setAppointments(combined);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-primary">Agenda de Citas</h2>
            <p className="text-muted-foreground mt-1">Organiza tu jornada diaria y gestiona visitas futuras</p>
          </div>
          <Button className="gap-2 h-12">
            <Plus className="w-5 h-5" />
            Nueva Cita
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="md:col-span-1 border-none shadow-sm">
             <CardHeader className="border-b pb-4"><CardTitle className="text-lg">Filtros de Fecha</CardTitle></CardHeader>
             <CardContent className="pt-6 space-y-4">
                <Button variant="secondary" className="w-full justify-start gap-2">Hoy</Button>
                <Button variant="ghost" className="w-full justify-start gap-2">Esta Semana</Button>
                <Button variant="ghost" className="w-full justify-start gap-2">Este Mes</Button>
                <Button variant="outline" className="w-full justify-start gap-2 mt-4"><Filter className="w-4 h-4" /> Seleccionar Día</Button>
             </CardContent>
          </Card>

          <Card className="md:col-span-3 border-none shadow-sm p-6">
             <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">Listado de Citas</h3>
                <div className="flex gap-2">
                   <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Hoy: 5 citas</Badge>
                </div>
             </div>

             <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Horario</TableHead>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Doctor</TableHead>
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
                           <div className="font-medium flex items-center gap-2"><User className="w-3 h-3 text-primary" /> {a.patientName}</div>
                        </TableCell>
                        <TableCell>Dr. {a.doctor}</TableCell>
                        <TableCell><Badge className="bg-primary">Confirmado</Badge></TableCell>
                        <TableCell className="text-right">
                           <Button variant="ghost" size="sm">Detalles</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {appointments.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center py-20 text-muted-foreground">
                         <CalendarIcon className="w-12 h-12 mx-auto mb-4 opacity-10" />
                         No hay citas programadas para este periodo
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
