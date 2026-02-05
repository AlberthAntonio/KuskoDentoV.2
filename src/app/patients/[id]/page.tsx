
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
import { Calendar, CreditCard, Stethoscope, Image as ImageIcon, FileText, Activity, ChevronLeft, Plus, Eye, History, Upload, Trash2, Download } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

export default function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { toast } = useToast();
  const [patient, setPatient] = useState<Patient | null>(null);
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

    const allPayments = await db.getAll<Payment>('payments');
    setPayments((allPayments || []).filter(pay => pay.patientId === id));

    const allRad = await db.getAll<Radiograph>('radiographs');
    setRadiographs((allRad || []).filter(r => r.patientId === id));

    const allConsents = await db.getAll<Consent>('consents');
    setConsents((allConsents || []).filter(c => c.patientId === id));

    const allApp = await db.getAll<Appointment>('appointments');
    setAppointments((allApp || []).filter(a => a.patientId === id));
  };

  const handleFileUpload = async (type: 'radiograph' | 'consent', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const data: any = {
      id: crypto.randomUUID(),
      patientId: id,
      fileName: file.name,
      fileType: file.type,
      fileBlob: file, 
      date: new Date().toLocaleDateString('es-PE'),
    };

    const store = type === 'radiograph' ? 'radiographs' : 'consents';
    await db.put(store, data);
    toast({ title: "Archivo subido", description: "El documento se guardó correctamente." });
    loadAll();
    e.target.value = ''; // Reset input
  };

  const downloadFile = (fileBlob: Blob, fileName: string) => {
    const url = URL.createObjectURL(fileBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const deleteFile = async (store: 'radiographs' | 'consents', fileId: string) => {
    if (confirm("¿Eliminar este archivo permanentemente?")) {
      await db.delete(store, fileId);
      loadAll();
    }
  };

  if (!patient) return null;

  return (
    <AuthProvider>
      <AppLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button asChild variant="ghost" size="icon">
                <Link href="/patients"><ChevronLeft /></Link>
              </Button>
              <div>
                <h2 className="text-3xl font-bold text-primary">{patient.lastNames}, {patient.names}</h2>
                <div className="flex gap-4 mt-1">
                  <Badge variant="outline" className="border-primary text-primary">DNI: {patient.dni}</Badge>
                  <span className="text-sm text-muted-foreground">Paciente registrado el {patient.registrationDate}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline" className="gap-2">
                <Link href={`/patients/${id}/odontogram`}><Activity className="w-4 h-4" /> Odontograma</Link>
              </Button>
              <Button asChild className="gap-2">
                 <Link href="/appointments"><Plus className="w-4 h-4" /> Nueva Cita</Link>
              </Button>
            </div>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="bg-muted p-1 rounded-xl h-auto flex flex-wrap justify-start gap-1">
              <TabsTrigger value="overview" className="gap-2 py-3 px-6"><Eye className="w-4 h-4" /> Resumen Historia</TabsTrigger>
              <TabsTrigger value="radiographs" className="gap-2 py-3 px-6"><ImageIcon className="w-4 h-4" /> Radiografías</TabsTrigger>
              <TabsTrigger value="consents" className="gap-2 py-3 px-6"><FileText className="w-4 h-4" /> Consentimientos</TabsTrigger>
              <TabsTrigger value="payments" className="gap-2 py-3 px-6"><CreditCard className="w-4 h-4" /> Financiero</TabsTrigger>
              <TabsTrigger value="appointments" className="gap-2 py-3 px-6"><Calendar className="w-4 h-4" /> Citas</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <Card className="md:col-span-1 border-none shadow-sm">
                   <CardHeader className="bg-primary/5 border-b"><CardTitle className="text-lg">Contacto</CardTitle></CardHeader>
                   <CardContent className="space-y-4 pt-6">
                     <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">Teléfono</span>
                        <span className="font-medium text-primary">{patient.phone}</span>
                     </div>
                     <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">Correo</span>
                        <span className="font-medium">{patient.email || '-'}</span>
                     </div>
                     <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">Dirección</span>
                        <span className="font-medium">{patient.address}</span>
                     </div>
                     <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">Doctor Responsable</span>
                        <span className="font-medium">Dr. {patient.attendedBy}</span>
                     </div>
                   </CardContent>
                 </Card>

                 <Card className="md:col-span-2 border-none shadow-sm">
                   <CardHeader className="bg-amber-50/50 border-b"><CardTitle className="text-lg flex items-center gap-2 text-amber-800"><History className="w-5 h-5" /> Alertas Médicas</CardTitle></CardHeader>
                   <CardContent className="pt-6">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                         <div className={`p-3 rounded-lg border flex flex-col gap-1 ${patient.underTreatment ? 'bg-red-50 border-red-200' : 'bg-slate-50'}`}>
                            <span className="text-[9px] font-bold text-muted-foreground uppercase">T. Médico</span>
                            <Badge variant={patient.underTreatment ? 'destructive' : 'secondary'}>{patient.underTreatment ? 'SÍ' : 'NO'}</Badge>
                         </div>
                         <div className={`p-3 rounded-lg border flex flex-col gap-1 ${patient.proneToBleeding ? 'bg-red-50 border-red-200' : 'bg-slate-50'}`}>
                            <span className="text-[9px] font-bold text-muted-foreground uppercase">Hemorragias</span>
                            <Badge variant={patient.proneToBleeding ? 'destructive' : 'secondary'}>{patient.proneToBleeding ? 'SÍ' : 'NO'}</Badge>
                         </div>
                         <div className={`p-3 rounded-lg border flex flex-col gap-1 ${patient.allergicToMeds ? 'bg-red-50 border-red-200' : 'bg-slate-50'}`}>
                            <span className="text-[9px] font-bold text-muted-foreground uppercase">Alergias</span>
                            <Badge variant={patient.allergicToMeds ? 'destructive' : 'secondary'}>{patient.allergicToMeds ? 'SÍ' : 'NO'}</Badge>
                         </div>
                         <div className={`p-3 rounded-lg border flex flex-col gap-1 ${patient.hypertensive ? 'bg-red-50 border-red-200' : 'bg-slate-50'}`}>
                            <span className="text-[9px] font-bold text-muted-foreground uppercase">Hipertenso</span>
                            <Badge variant={patient.hypertensive ? 'destructive' : 'secondary'}>{patient.hypertensive ? 'SÍ' : 'NO'}</Badge>
                         </div>
                         <div className={`p-3 rounded-lg border flex flex-col gap-1 ${patient.diabetic ? 'bg-red-50 border-red-200' : 'bg-slate-50'}`}>
                            <span className="text-[9px] font-bold text-muted-foreground uppercase">Diabético</span>
                            <Badge variant={patient.diabetic ? 'destructive' : 'secondary'}>{patient.diabetic ? 'SÍ' : 'NO'}</Badge>
                         </div>
                         <div className={`p-3 rounded-lg border flex flex-col gap-1 ${patient.pregnant ? 'bg-red-50 border-red-200' : 'bg-slate-50'}`}>
                            <span className="text-[9px] font-bold text-muted-foreground uppercase">Embarazada</span>
                            <Badge variant={patient.pregnant ? 'destructive' : 'secondary'}>{patient.pregnant ? 'SÍ' : 'NO'}</Badge>
                         </div>
                      </div>

                      <div className="space-y-4">
                        <div className="p-4 bg-muted/30 rounded-lg">
                           <h4 className="text-xs font-bold uppercase text-muted-foreground mb-1">Motivo de consulta</h4>
                           <p className="text-sm font-medium">{patient.consultationReason}</p>
                        </div>
                        <div className="p-4 bg-muted/30 rounded-lg">
                           <h4 className="text-xs font-bold uppercase text-muted-foreground mb-1">Diagnóstico</h4>
                           <p className="text-sm">{patient.diagnostic || 'N/A'}</p>
                        </div>
                        {patient.allergicToMeds && (
                           <div className="p-4 bg-red-50 border border-red-100 rounded-lg">
                              <h4 className="text-xs font-bold uppercase text-red-600 mb-1">Alergias detalladas</h4>
                              <p className="text-sm font-bold text-red-700">{patient.allergiesDetail}</p>
                           </div>
                        )}
                      </div>
                   </CardContent>
                 </Card>
               </div>
            </TabsContent>

            <TabsContent value="radiographs">
               <div className="space-y-4">
                 <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border">
                   <h3 className="font-bold">Galería Radiográfica</h3>
                   <div className="relative">
                      <Button className="gap-2 pointer-events-none">
                        <Upload className="w-4 h-4" /> Subir Placa
                      </Button>
                      <input 
                        type="file" 
                        className="absolute inset-0 opacity-0 cursor-pointer" 
                        accept="image/*" 
                        onChange={(e) => handleFileUpload('radiograph', e)} 
                      />
                   </div>
                 </div>
                 <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                   {radiographs.map(r => (
                     <Card key={r.id} className="overflow-hidden group relative border-none shadow-sm hover:shadow-md transition-all">
                       <div className="aspect-square bg-slate-100 flex items-center justify-center overflow-hidden">
                          {r.fileType.startsWith('image/') ? (
                             <img 
                                src={URL.createObjectURL(r.fileBlob)} 
                                className="w-full h-full object-cover" 
                                alt={r.fileName}
                                onLoad={(e) => {
                                  // Optional: Revoke URL after load if memory is an issue, 
                                  // but for snapshots it's easier to keep them.
                                }}
                             />
                          ) : (
                             <ImageIcon className="w-12 h-12 text-slate-300" />
                          )}
                       </div>
                       <div className="p-3 bg-white">
                          <p className="text-[10px] truncate font-bold uppercase">{r.fileName}</p>
                          <p className="text-[9px] text-muted-foreground">{r.date}</p>
                       </div>
                       <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                         <Button variant="secondary" size="icon" className="h-7 w-7" onClick={() => downloadFile(r.fileBlob, r.fileName)}><Download className="w-3 h-3" /></Button>
                         <Button variant="destructive" size="icon" className="h-7 w-7" onClick={() => deleteFile('radiographs', r.id)}><Trash2 className="w-3 h-3" /></Button>
                       </div>
                     </Card>
                   ))}
                   {radiographs.length === 0 && (
                     <div className="col-span-full py-20 text-center border-2 border-dashed rounded-xl text-muted-foreground">No hay radiografías registradas</div>
                   )}
                 </div>
               </div>
            </TabsContent>

            <TabsContent value="consents">
               <div className="space-y-4">
                 <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border">
                   <h3 className="font-bold">Documentos Firmados</h3>
                   <div className="relative">
                      <Button variant="outline" className="gap-2 pointer-events-none">
                        <Upload className="w-4 h-4" /> Subir Archivo
                      </Button>
                      <input 
                        type="file" 
                        className="absolute inset-0 opacity-0 cursor-pointer" 
                        accept=".pdf,image/*" 
                        onChange={(e) => handleFileUpload('consent', e)} 
                      />
                   </div>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {consents.map(c => (
                     <Card key={c.id} className="p-4 flex items-center justify-between border-none shadow-sm group">
                       <div className="flex items-center gap-4">
                          <div className="p-3 bg-sky-100 rounded-lg text-sky-600"><FileText className="w-6 h-6" /></div>
                          <div>
                             <p className="font-bold text-sm truncate max-w-[200px]">{c.fileName}</p>
                             <p className="text-[10px] text-muted-foreground">{c.date}</p>
                          </div>
                       </div>
                       <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => downloadFile(c.fileBlob, c.fileName)}>Descargar</Button>
                          <Button variant="ghost" size="icon" className="text-destructive opacity-0 group-hover:opacity-100" onClick={() => deleteFile('consents', c.id)}><Trash2 className="w-4 h-4" /></Button>
                       </div>
                     </Card>
                   ))}
                   {consents.length === 0 && (
                     <div className="col-span-full py-20 text-center border-2 border-dashed rounded-xl text-muted-foreground">Sin documentos archivados</div>
                   )}
                 </div>
               </div>
            </TabsContent>

            <TabsContent value="payments">
              <Card className="border-none shadow-sm p-6">
                 <h3 className="text-xl font-bold mb-6">Estado de Cuenta</h3>
                 <Table>
                   <TableHeader>
                     <TableRow>
                       <TableHead>Fecha</TableHead>
                       <TableHead>Tratamiento</TableHead>
                       <TableHead>Costo</TableHead>
                       <TableHead>Abonado</TableHead>
                       <TableHead>Saldo</TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {payments.map(p => (
                       <TableRow key={p.id}>
                         <TableCell>{p.date}</TableCell>
                         <TableCell className="text-xs font-bold uppercase">{p.treatmentName}</TableCell>
                         <TableCell>S/. {p.totalCost.toFixed(2)}</TableCell>
                         <TableCell className="text-emerald-600 font-bold">S/. {p.totalPaid.toFixed(2)}</TableCell>
                         <TableCell>
                           <Badge variant={p.balance > 0 ? 'outline' : 'default'} className={p.balance > 0 ? 'text-amber-600 border-amber-600' : 'bg-emerald-500'}>
                             S/. {p.balance.toFixed(2)}
                           </Badge>
                         </TableCell>
                       </TableRow>
                     ))}
                     {payments.length === 0 && (
                       <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">No se registran deudas o pagos</TableCell></TableRow>
                     )}
                   </TableBody>
                 </Table>
              </Card>
            </TabsContent>

            <TabsContent value="appointments">
               <Card className="border-none shadow-sm p-6">
                  <h3 className="text-xl font-bold mb-6">Historial de Citas</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha / Hora</TableHead>
                        <TableHead>Doctor</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Observaciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {appointments.map(a => (
                        <TableRow key={a.id}>
                          <TableCell className="font-medium">{a.date} - {a.time}</TableCell>
                          <TableCell>Dr. {a.doctorName}</TableCell>
                          <TableCell><Badge variant={a.status === 'Atendido' ? 'default' : 'secondary'}>{a.status}</Badge></TableCell>
                          <TableCell className="text-xs italic">{a.observations || '-'}</TableCell>
                        </TableRow>
                      ))}
                      {appointments.length === 0 && (
                        <TableRow><TableCell colSpan={4} className="text-center py-10 text-muted-foreground">Sin citas programadas</TableCell></TableRow>
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
