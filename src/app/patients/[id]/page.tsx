"use client";

import { useState, useEffect, use } from 'react';
import { AuthProvider } from '@/hooks/use-auth';
import { AppLayout } from '@/components/layout/AppLayout';
import { db, Patient, Treatment, PatientTreatment, Payment, Radiograph, Consent, Appointment } from '@/lib/db';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, CreditCard, Stethoscope, Image as ImageIcon, FileText, Activity, ChevronLeft, Plus } from 'lucide-react';
import Link from 'next/link';

export default function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [patientTreatments, setPatientTreatments] = useState<any[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [radiographs, setRadiographs] = useState<Radiograph[]>([]);
  const [consents, setConsents] = useState<Consent[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    loadAll();
  }, [id]);

  const loadAll = async () => {
    const p = await db.getById<Patient>('patients', id);
    if (!p) return;
    setPatient(p);

    const pts = await db.getAll<PatientTreatment>('patient_treatments');
    const trs = await db.getAll<Treatment>('treatments');
    
    const relevantPts = pts.filter(pt => pt.patientId === id).map(pt => ({
      ...pt,
      treatmentName: trs.find(t => t.id === pt.treatmentId)?.name || 'Tratamiento Desconocido'
    }));
    setPatientTreatments(relevantPts);

    const allPayments = await db.getAll<Payment>('payments');
    setPayments(allPayments.filter(pay => pay.patientId === id));

    const allRad = await db.getAll<Radiograph>('radiographs');
    setRadiographs(allRad.filter(r => r.patientId === id));

    const allConsents = await db.getAll<Consent>('consents');
    setConsents(allConsents.filter(c => c.patientId === id));

    const allApp = await db.getAll<Appointment>('appointments');
    setAppointments(allApp.filter(a => a.patientId === id));
  };

  if (!patient) return null;

  return (
    <AuthProvider>
      <AppLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="icon">
              <Link href="/patients"><ChevronLeft /></Link>
            </Button>
            <div>
              <h2 className="text-3xl font-bold text-primary">{patient.lastNames}, {patient.names}</h2>
              <div className="flex gap-4 mt-1">
                <Badge variant="outline" className="border-primary text-primary">DNI: {patient.dni}</Badge>
                <Badge variant="outline" className="border-primary text-primary">{patient.age} años</Badge>
                <span className="text-sm text-muted-foreground">Registrado el {patient.registrationDate}</span>
              </div>
            </div>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="bg-muted p-1 rounded-xl h-auto flex flex-wrap justify-start gap-1">
              <TabsTrigger value="overview" className="gap-2 py-3 px-6"><Activity className="w-4 h-4" /> Resumen</TabsTrigger>
              <TabsTrigger value="treatments" className="gap-2 py-3 px-6"><Stethoscope className="w-4 h-4" /> Tratamientos</TabsTrigger>
              <TabsTrigger value="payments" className="gap-2 py-3 px-6"><CreditCard className="w-4 h-4" /> Pagos</TabsTrigger>
              <TabsTrigger value="radiographs" className="gap-2 py-3 px-6"><ImageIcon className="w-4 h-4" /> Radiografías</TabsTrigger>
              <TabsTrigger value="consents" className="gap-2 py-3 px-6"><FileText className="w-4 h-4" /> Consentimientos</TabsTrigger>
              <TabsTrigger value="appointments" className="gap-2 py-3 px-6"><Calendar className="w-4 h-4" /> Citas</TabsTrigger>
              <TabsTrigger value="odontogram" className="gap-2 py-3 px-6" asChild>
                <Link href={`/patients/${id}/odontogram`}><Activity className="w-4 h-4" /> Odontograma</Link>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <Card className="border-none shadow-sm">
                   <CardHeader><CardTitle className="text-lg">Información de Contacto</CardTitle></CardHeader>
                   <CardContent className="space-y-4">
                     <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Teléfono</span><span className="font-medium">{patient.phone}</span></div>
                     <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Dirección</span><span className="font-medium">{patient.address}</span></div>
                     <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">DNI</span><span className="font-medium">{patient.dni}</span></div>
                   </CardContent>
                 </Card>
                 <Card className="border-none shadow-sm">
                   <CardHeader><CardTitle className="text-lg">Próxima Cita</CardTitle></CardHeader>
                   <CardContent className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                      <Calendar className="w-12 h-12 mb-4 opacity-20" />
                      <p>No hay citas pendientes</p>
                      <Button variant="link" className="text-primary mt-2">Agendar Cita</Button>
                   </CardContent>
                 </Card>
               </div>
            </TabsContent>

            <TabsContent value="treatments">
               <Card className="border-none shadow-sm p-6">
                 <div className="flex justify-between items-center mb-6">
                   <h3 className="text-xl font-bold">Historial de Tratamientos</h3>
                   <Button size="sm" className="gap-2"><Plus className="w-4 h-4" /> Asignar Tratamiento</Button>
                 </div>
                 <Table>
                   <TableHeader>
                     <TableRow>
                       <TableHead>Fecha</TableHead>
                       <TableHead>Tratamiento</TableHead>
                       <TableHead>Precio S/.</TableHead>
                       <TableHead>Estado Pago</TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {patientTreatments.map(pt => (
                       <TableRow key={pt.id}>
                         <TableCell>{pt.date}</TableCell>
                         <TableCell className="font-medium">{pt.treatmentName}</TableCell>
                         <TableCell>S/. {pt.actualPrice.toFixed(2)}</TableCell>
                         <TableCell>
                           <Badge className="bg-emerald-500">Completado</Badge>
                         </TableCell>
                       </TableRow>
                     ))}
                     {patientTreatments.length === 0 && (
                       <TableRow><TableCell colSpan={4} className="text-center py-10 text-muted-foreground">Sin tratamientos registrados</TableCell></TableRow>
                     )}
                   </TableBody>
                 </Table>
               </Card>
            </TabsContent>

            <TabsContent value="payments">
              <Card className="border-none shadow-sm p-6">
                 <div className="flex justify-between items-center mb-6">
                   <h3 className="text-xl font-bold">Registro de Pagos</h3>
                   <Button size="sm" className="gap-2"><Plus className="w-4 h-4" /> Registrar Pago</Button>
                 </div>
                 <Table>
                   <TableHeader>
                     <TableRow>
                       <TableHead>Fecha</TableHead>
                       <TableHead>Tipo</TableHead>
                       <TableHead>Monto S/.</TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {payments.map(p => (
                       <TableRow key={p.id}>
                         <TableCell>{p.date}</TableCell>
                         <TableCell><Badge variant="outline">{p.type}</Badge></TableCell>
                         <TableCell className="font-bold">S/. {p.amount.toFixed(2)}</TableCell>
                       </TableRow>
                     ))}
                     {payments.length === 0 && (
                       <TableRow><TableCell colSpan={3} className="text-center py-10 text-muted-foreground">No se han registrado pagos aún</TableCell></TableRow>
                     )}
                   </TableBody>
                 </Table>
              </Card>
            </TabsContent>

            <TabsContent value="radiographs">
               <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                 <div className="border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-6 text-center hover:bg-muted/50 cursor-pointer transition-colors">
                    <Plus className="w-8 h-8 text-muted-foreground mb-2" />
                    <span className="text-xs font-bold">Subir Radiografía</span>
                 </div>
                 {radiographs.map(r => (
                   <Card key={r.id} className="overflow-hidden group relative">
                     <div className="aspect-square bg-slate-200 flex items-center justify-center">
                        <ImageIcon className="w-10 h-10 text-slate-400" />
                     </div>
                     <div className="p-2 text-center">
                        <p className="text-[10px] truncate font-medium">{r.fileName}</p>
                        <p className="text-[10px] text-muted-foreground">{r.date}</p>
                     </div>
                   </Card>
                 ))}
               </div>
            </TabsContent>
            
            <TabsContent value="consents">
               <Card className="border-none shadow-sm p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold">Consentimientos Informados</h3>
                    <Button size="sm" className="gap-2"><Plus className="w-4 h-4" /> Nuevo Documento</Button>
                  </div>
                  <div className="space-y-4">
                    {consents.map(c => (
                      <div key={c.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="w-6 h-6 text-primary" />
                          <div>
                            <p className="font-medium">{c.fileName}</p>
                            <p className="text-xs text-muted-foreground">{c.date}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">Ver PDF</Button>
                      </div>
                    ))}
                    {consents.length === 0 && (
                      <div className="text-center py-10 text-muted-foreground">No hay documentos de consentimiento archivados</div>
                    )}
                  </div>
               </Card>
            </TabsContent>

            <TabsContent value="appointments">
               <Card className="border-none shadow-sm p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold">Próximas y Anteriores Citas</h3>
                    <Button size="sm" className="gap-2"><Plus className="w-4 h-4" /> Agendar Nueva</Button>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Hora</TableHead>
                        <TableHead>Doctor</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {appointments.map(a => (
                        <TableRow key={a.id}>
                          <TableCell>{a.date}</TableCell>
                          <TableCell>{a.time}</TableCell>
                          <TableCell>Dr. {a.doctor}</TableCell>
                          <TableCell><Badge>Programada</Badge></TableCell>
                        </TableRow>
                      ))}
                      {appointments.length === 0 && (
                        <TableRow><TableCell colSpan={4} className="text-center py-10 text-muted-foreground">No hay citas registradas</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
               </Card>
            </TabsContent>

          </Tabs>
        </div>
      </AppLayout>
    </AuthProvider>
  );
}
