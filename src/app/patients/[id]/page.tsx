"use client";

import { useState, useEffect, use } from 'react';
import { AuthProvider } from '@/hooks/use-auth';
import { AppLayout } from '@/components/layout/AppLayout';
import { db, Patient, Radiograph, Consent, Appointment, Payment, Odontogram } from '@/lib/legacy-data';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, CreditCard, ImageIcon, FileText, Activity, ChevronLeft, Plus, Eye, History, Upload, Trash2, Download, ZoomIn, X, FileSearch } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PaymentModal } from '../../../components/PaymentModal';

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  error?: string;
};

async function fetchApi<T>(path: string): Promise<T> {
  const response = await fetch(path, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const body = (await response.json()) as ApiEnvelope<T> | T;

  if (!response.ok) {
    const message =
      typeof body === 'object' && body !== null && 'error' in body
        ? String((body as { error?: string }).error || 'No se pudo cargar la informacion del paciente')
        : 'No se pudo cargar la informacion del paciente';
    throw new Error(message);
  }

  if (
    typeof body === 'object' &&
    body !== null &&
    'success' in body &&
    (body as ApiEnvelope<T>).success !== undefined
  ) {
    const wrapped = body as ApiEnvelope<T>;
    if (!wrapped.success) {
      throw new Error(wrapped.error || 'No se pudo cargar la informacion del paciente');
    }
    return wrapped.data as T;
  }

  return body as T;
}

const toNumber = (value: string | number | null | undefined): number => Number(value ?? 0);

const parseDateValue = (value?: string | null): number => {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

const toDisplayDate = (value?: string | null): string => {
  if (!value) return '-';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString('es-PE');
};

const splitFullName = (fullName: string): { names: string; lastNames: string } => {
  const chunks = fullName.trim().split(/\s+/).filter(Boolean);
  if (chunks.length <= 1) {
    return { names: chunks[0] || fullName, lastNames: '' };
  }

  return {
    names: chunks.slice(0, -1).join(' '),
    lastNames: chunks[chunks.length - 1],
  };
};

type PatientApi = {
  id: string;
  dni: string;
  full_name: string;
  email?: string | null;
  phone: string;
  address: string;
  created_at?: string | null;
  under_treatment?: boolean | null;
  prone_to_bleeding?: boolean | null;
  allergic_to_meds?: boolean | null;
  medical_observations?: string | null;
};

type PaymentApi = {
  id: string;
  patient_id: string;
  appointment_id: string;
  total_cost: string | number;
  total_paid: string | number;
  balance: string | number;
  created_at?: string | null;
  appointment?: { treatment?: { name?: string | null } | null } | null;
  payment_histories?: Array<{
    amount_paid: string | number;
    payment_date: string;
    payment_method?: string | null;
  }>;
};

type AppointmentApi = {
  id: string;
  patient_id?: string;
  patient?: { id?: string | null } | null;
  treatment_id?: string | null;
  treatment?: { name?: string | null } | null;
  doctor_id?: string | null;
  doctor?: { full_name?: string | null } | null;
  date: string;
  time: string;
  status: string;
  cost: string | number;
  observations?: string | null;
};

type OdontogramApi = {
  id: string;
  patient_id: string;
  appointment_id?: string | null;
  data_json: unknown;
  notes?: string | null;
  created_at: string;
};

export default function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { toast } = useToast();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [radiographs, setRadiographs] = useState<Radiograph[]>([]);
  const [consents, setConsents] = useState<Consent[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [odontograms, setOdontograms] = useState<Odontogram[]>([]);
  
  const [previewData, setPreviewData] = useState<{ url: string; type: string } | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [paymentForm, setPaymentForm] = useState({ amount: '', method: 'cash', notes: '' });
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  useEffect(() => {
    loadAll();
  }, [id]);

  const loadAll = async () => {
    try {
      const [patientApi, paymentsApi, appointmentsApi, odontogramsApi] = await Promise.all([
        fetchApi<PatientApi>(`/api/patients/${id}`),
        fetchApi<{ items: PaymentApi[] }>(`/api/payments?patient_id=${id}`),
        fetchApi<{ items: AppointmentApi[] }>(`/api/appointments?patient_id=${id}`),
        fetchApi<{ items: OdontogramApi[] }>(`/api/odontograms?patient_id=${id}`),
      ]);

      const nameParts = splitFullName(patientApi.full_name);
      const observations = (patientApi.medical_observations || '')
        .split('|')
        .map((v) => v.trim())
        .filter(Boolean);

      setPatient({
        id: patientApi.id,
        dni: patientApi.dni,
        names: nameParts.names,
        lastNames: nameParts.lastNames,
        email: patientApi.email || undefined,
        phone: patientApi.phone,
        address: patientApi.address,
        registrationDate: toDisplayDate(patientApi.created_at),
        attendedBy: undefined,
        underTreatment: Boolean(patientApi.under_treatment),
        proneToBleeding: Boolean(patientApi.prone_to_bleeding),
        allergicToMeds: Boolean(patientApi.allergic_to_meds),
        consultationReason: observations[0] || 'No registrado',
        diagnostic: observations.slice(1).join(' | ') || 'Evaluacion inicial',
      });

      const mappedPayments = (paymentsApi.items || [])
        .sort((a, b) => parseDateValue(b.created_at) - parseDateValue(a.created_at))
        .map((payment): Payment => ({
          id: payment.id,
          patientId: payment.patient_id,
          appointmentId: payment.appointment_id,
          treatmentName: payment.appointment?.treatment?.name || 'Consulta',
          totalPaid: toNumber(payment.total_paid),
          balance: toNumber(payment.balance),
          totalCost: toNumber(payment.total_cost),
          date: toDisplayDate(payment.created_at),
          history: (payment.payment_histories || []).map((item) => ({
            amount: toNumber(item.amount_paid),
            date: toDisplayDate(item.payment_date),
            method: item.payment_method || undefined,
          })),
        }));

      const paidAppointmentIds = new Set(
        mappedPayments.map((payment) => payment.appointmentId).filter(Boolean)
      );

      const pendingFromAppointments = (appointmentsApi.items || [])
        .filter((appointment) => {
          const normalized = String(appointment.status || '').toLowerCase();
          return (
            (normalized === 'completed' || normalized === 'attended') &&
            !paidAppointmentIds.has(appointment.id)
          );
        })
        .map((appointment): Payment => ({
          id: `pending-${appointment.id}`,
          patientId: appointment.patient_id || appointment.patient?.id || id,
          appointmentId: appointment.id,
          treatmentName: appointment.treatment?.name || 'Consulta',
          totalPaid: 0,
          balance: toNumber(appointment.cost),
          totalCost: toNumber(appointment.cost),
          date: toDisplayDate(appointment.date),
          history: [],
        }));

      setPayments(
        [...mappedPayments, ...pendingFromAppointments].sort(
          (a, b) => parseDateValue(b.date) - parseDateValue(a.date)
        )
      );

      setAppointments(
        (appointmentsApi.items || [])
          .sort((a, b) => parseDateValue(b.date) - parseDateValue(a.date))
          .map((appointment): Appointment => ({
            id: appointment.id,
            patientId: appointment.patient_id || appointment.patient?.id || '',
            treatmentId: appointment.treatment_id || '',
            doctorId: appointment.doctor_id || '',
            doctorName: appointment.doctor?.full_name || 'No asignado',
            date: toDisplayDate(appointment.date),
            time: appointment.time,
            status:
              appointment.status === 'completed' || appointment.status === 'attended'
                ? 'Atendido'
                : 'Asignado',
            cost: toNumber(appointment.cost),
            observations: appointment.observations || undefined,
          }))
      );

      // No existen endpoints REST para estos modulos en la version actual.
      setRadiographs([]);
      setConsents([]);
      setOdontograms(
        (odontogramsApi.items || [])
          .sort((a, b) => parseDateValue(b.created_at) - parseDateValue(a.created_at))
          .map((item): Odontogram => ({
            id: item.id,
            patientId: item.patient_id,
            appointmentId: item.appointment_id || undefined,
            data_json: item.data_json,
            data: (item.data_json as Record<number, any>) || {},
            diagnostic: item.notes || undefined,
            date: item.created_at,
          }))
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo cargar el historial';
      toast({
        title: 'Error al cargar historial',
        description: message,
        variant: 'destructive',
      });
    }
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
    try {
      await db.put(store, data);
      toast({ title: "Archivo subido", description: "El documento se guardo correctamente." });
      loadAll();
    } catch (error) {
      toast({
        title: 'Modulo en migracion',
        description: error instanceof Error ? error.message : 'Aun no se pudo guardar este archivo.',
        variant: 'destructive',
      });
    }
    e.target.value = ''; 
  };

  const downloadFile = (fileBlob: Blob, fileName: string) => {
    const url = URL.createObjectURL(fileBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openPreview = (fileBlob: Blob, fileType: string) => {
    const url = URL.createObjectURL(fileBlob);
    setPreviewData({ url, type: fileType });
  };

  const deleteFile = async (store: 'radiographs' | 'consents', fileId: string) => {
    if (confirm("¿Eliminar este archivo permanentemente?")) {
      try {
        await db.delete(store, fileId);
        loadAll();
      } catch (error) {
        toast({
          title: 'Modulo en migracion',
          description: error instanceof Error ? error.message : 'Aun no se pudo eliminar este archivo.',
          variant: 'destructive',
        });
      }
    }
  };

  const openPaymentModal = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setPaymentForm({ amount: appointment.cost.toFixed(2), method: 'cash', notes: '' });
    setShowPaymentModal(true);
  };

  const submitPayment = async () => {
    if (!selectedAppointment || !paymentForm.amount) {
      toast({ title: 'Error', description: 'Ingrese el monto del pago', variant: 'destructive' });
      return;
    }

    setIsSubmittingPayment(true);
    try {
      const response = await fetch('/api/payments', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: id,
          appointment_id: selectedAppointment.id,
          amount: Number(paymentForm.amount),
          payment_method: paymentForm.method,
          notes: paymentForm.notes,
          total_cost: selectedAppointment.cost,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'No se pudo registrar el pago');
      }

      toast({ title: 'Pago registrado', description: 'El pago se registró correctamente.' });
      setShowPaymentModal(false);
      setPaymentForm({ amount: '', method: 'cash', notes: '' });
      loadAll();
    } catch (error) {
      toast({
        title: 'Error al registrar pago',
        description: error instanceof Error ? error.message : 'No se pudo registrar el pago',
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingPayment(false);
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
                  <span className="text-sm text-muted-foreground">Paciente desde: {patient.registrationDate}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline" className="gap-2">
                <Link href={`/patients/${id}/odontogram`}><Activity className="w-4 h-4" /> Nuevo Odontograma</Link>
              </Button>
              <Button asChild className="gap-2">
                 <Link href="/appointments"><Plus className="w-4 h-4" /> Agendar Cita</Link>
              </Button>
            </div>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="bg-muted p-1 rounded-xl h-auto flex flex-wrap justify-start gap-1">
              <TabsTrigger value="overview" className="gap-2 py-3 px-6"><Eye className="w-4 h-4" /> Resumen</TabsTrigger>
              <TabsTrigger value="radiographs" className="gap-2 py-3 px-6"><ImageIcon className="w-4 h-4" /> Radiografías</TabsTrigger>
              <TabsTrigger value="consents" className="gap-2 py-3 px-6"><FileText className="w-4 h-4" /> Consentimientos</TabsTrigger>
              <TabsTrigger value="odontograms" className="gap-2 py-3 px-6"><Activity className="w-4 h-4" /> Odontogramas</TabsTrigger>
              <TabsTrigger value="payments" className="gap-2 py-3 px-6"><CreditCard className="w-4 h-4" /> Pagos/Saldos</TabsTrigger>
              <TabsTrigger value="appointments" className="gap-2 py-3 px-6"><Calendar className="w-4 h-4" /> Citas</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <Card className="md:col-span-1 border-none shadow-sm">
                   <CardHeader className="bg-primary/5 border-b"><CardTitle className="text-lg">Información de Contacto</CardTitle></CardHeader>
                   <CardContent className="space-y-4 pt-6">
                     <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">Teléfono</span>
                        <span className="font-medium text-primary">{patient.phone}</span>
                     </div>
                     <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">Email</span>
                        <span className="font-medium">{patient.email || 'No registrado'}</span>
                     </div>
                     <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">Dirección</span>
                        <span className="font-medium">{patient.address}</span>
                     </div>
                     <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">Atendido por</span>
                        <span className="font-medium">Dr. {patient.attendedBy || 'N/A'}</span>
                     </div>
                   </CardContent>
                 </Card>

                 <Card className="md:col-span-2 border-none shadow-sm">
                   <CardHeader className="bg-amber-50 border-b"><CardTitle className="text-lg flex items-center gap-2 text-amber-800"><History className="w-5 h-5" /> Alertas de Historia Clínica</CardTitle></CardHeader>
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
                      </div>

                      <div className="space-y-4">
                        <div className="p-4 bg-muted/30 rounded-lg">
                           <h4 className="text-xs font-bold uppercase text-muted-foreground mb-1">Motivo de consulta</h4>
                           <p className="text-sm font-medium">{patient.consultationReason}</p>
                        </div>
                        <div className="p-4 bg-muted/30 rounded-lg">
                           <h4 className="text-xs font-bold uppercase text-muted-foreground mb-1">Diagnóstico</h4>
                           <p className="text-sm">{patient.diagnostic || 'Evaluación inicial'}</p>
                        </div>
                      </div>
                   </CardContent>
                 </Card>
               </div>
            </TabsContent>

            <TabsContent value="radiographs">
               <div className="space-y-4">
                 <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border">
                   <h3 className="font-bold">Archivo de Radiografías</h3>
                   <div className="relative">
                      <Button className="gap-2 pointer-events-none">
                        <Upload className="w-4 h-4" /> Subir Imagen
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
                       <div className="aspect-square bg-slate-100 flex items-center justify-center overflow-hidden cursor-pointer" onClick={() => openPreview(r.fileBlob, r.fileType)}>
                          <img 
                            src={URL.createObjectURL(r.fileBlob)} 
                            className="w-full h-full object-cover transition-transform group-hover:scale-105" 
                            alt={r.fileName}
                            onLoad={(e) => URL.revokeObjectURL((e.target as any).src)}
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <ZoomIn className="text-white w-8 h-8" />
                          </div>
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
                     <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed rounded-xl">No hay radiografías cargadas</div>
                   )}
                 </div>
               </div>
            </TabsContent>

            <TabsContent value="consents">
               <div className="space-y-4">
                 <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border">
                   <h3 className="font-bold">Documentos Legales y Consentimientos</h3>
                   <div className="relative">
                      <Button variant="outline" className="gap-2 pointer-events-none">
                        <Upload className="w-4 h-4" /> Subir Documento
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
                          <div className="p-3 bg-sky-100 rounded-lg text-sky-600">
                            {c.fileType.includes('pdf') ? <FileSearch className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                          </div>
                          <div>
                             <p className="font-bold text-sm truncate max-w-[200px]">{c.fileName}</p>
                             <p className="text-[10px] text-muted-foreground">{c.date}</p>
                          </div>
                       </div>
                       <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => openPreview(c.fileBlob, c.fileType)}>Previsualizar</Button>
                          <Button variant="ghost" size="icon" className="text-destructive opacity-0 group-hover:opacity-100" onClick={() => deleteFile('consents', c.id)}><Trash2 className="w-4 h-4" /></Button>
                       </div>
                     </Card>
                   ))}
                   {consents.length === 0 && (
                     <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed rounded-xl">No hay consentimientos registrados</div>
                   )}
                 </div>
               </div>
            </TabsContent>

            <TabsContent value="odontograms">
               <div className="space-y-4">
                 <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border">
                   <h3 className="font-bold">Historial de Odontogramas</h3>
                   <Button asChild className="gap-2">
                      <Link href={`/patients/${id}/odontogram`}><Plus className="w-4 h-4" /> Nuevo Diagnóstico</Link>
                   </Button>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {odontograms.map((o, idx) => (
                      <Card key={o.id} className="border-none shadow-sm hover:shadow-md transition-all overflow-hidden">
                         <CardHeader className="bg-primary/5 p-4 flex flex-row justify-between items-center">
                            <div>
                               <p className="text-[10px] uppercase font-bold text-muted-foreground">Sesión #{odontograms.length - idx}</p>
                               <p className="font-bold text-sm">{new Date(o.date).toLocaleDateString('es-PE')}</p>
                            </div>
                            <Activity className="w-5 h-5 text-primary opacity-50" />
                         </CardHeader>
                         <CardContent className="p-4">
                            <p className="text-xs text-muted-foreground line-clamp-2 italic mb-4">{o.diagnostic || 'Sin observaciones'}</p>
                            <Button asChild variant="secondary" size="sm" className="w-full">
                               <Link href={`/patients/${id}/odontogram`}>Abrir Odontograma</Link>
                            </Button>
                         </CardContent>
                      </Card>
                    ))}
                 </div>
               </div>
            </TabsContent>

            <TabsContent value="payments">
              <Card className="border-none shadow-sm p-6 overflow-x-auto">
                 <div className="flex justify-between items-center mb-6">
                   <h3 className="text-xl font-bold">Estado de Cuenta y Amortizaciones</h3>
                   <div className="text-right">
                     <p className="text-[10px] text-muted-foreground font-bold uppercase">Deuda Total Acumulada</p>
                     <p className="text-2xl font-bold text-amber-600">S/. {payments.reduce((acc, p) => acc + p.balance, 0).toFixed(2)}</p>
                   </div>
                 </div>
                 <Table>
                   <TableHeader className="bg-muted/50">
                     <TableRow>
                       <TableHead>Fecha</TableHead>
                       <TableHead>Tratamiento / Concepto</TableHead>
                       <TableHead>Presupuesto</TableHead>
                       <TableHead>Pagado</TableHead>
                       <TableHead>Saldo</TableHead>
                       <TableHead>Estado</TableHead>
                       <TableHead>Historial de Abonos</TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {payments.map(p => (
                       <TableRow key={p.id}>
                         <TableCell className="text-sm font-medium">{p.date}</TableCell>
                         <TableCell className="text-xs font-bold uppercase">{p.treatmentName}</TableCell>
                         <TableCell>S/. {p.totalCost.toFixed(2)}</TableCell>
                         <TableCell className="text-emerald-600 font-bold">S/. {p.totalPaid.toFixed(2)}</TableCell>
                         <TableCell className="font-bold">S/. {p.balance.toFixed(2)}</TableCell>
                         <TableCell>
                           <Badge variant={p.balance > 0 ? 'outline' : 'default'} className={p.balance > 0 ? 'text-amber-600 border-amber-600' : 'bg-emerald-500'}>
                             {p.balance > 0 ? 'PENDIENTE' : 'LIQUIDADO'}
                           </Badge>
                         </TableCell>
                         <TableCell>
                           <div className="text-[10px] space-y-1 max-h-24 overflow-y-auto">
                             {p.history && p.history.length > 0 ? p.history.map((h, i) => (
                               <div key={i} className="flex justify-between gap-4 border-b border-dashed pb-1 last:border-0">
                                 <span>{h.date}</span>
                                 <span className="font-bold">S/. {h.amount.toFixed(2)}</span>
                               </div>
                             )) : (
                               <div className="flex justify-between gap-4">
                                 <span>{p.date}</span>
                                 <span className="font-bold">S/. {p.totalPaid.toFixed(2)}</span>
                               </div>
                             )}
                           </div>
                         </TableCell>
                       </TableRow>
                     ))}
                     {payments.length === 0 && (
                       <TableRow><TableCell colSpan={7} className="text-center py-10 opacity-50">No hay movimientos financieros</TableCell></TableRow>
                     )}
                   </TableBody>
                 </Table>
              </Card>
            </TabsContent>

            <TabsContent value="appointments">
               <Card className="border-none shadow-sm p-6">
                  <h3 className="text-xl font-bold mb-6">Agenda Histórica de Citas</h3>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha / Hora</TableHead>
                          <TableHead>Médico</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Costo</TableHead>
                          <TableHead>Observaciones</TableHead>
                          <TableHead>Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {appointments.map(a => {
                          const hasPaidForAppointment = payments.some(p => p.appointmentId === a.id);
                          return (
                            <TableRow key={a.id}>
                              <TableCell className="font-medium">{a.date} - {a.time}</TableCell>
                              <TableCell>Dr. {a.doctorName}</TableCell>
                              <TableCell><Badge variant={a.status === 'Atendido' ? 'default' : 'secondary'}>{a.status}</Badge></TableCell>
                              <TableCell className="font-bold">S/. {a.cost.toFixed(2)}</TableCell>
                              <TableCell className="text-xs italic">{a.observations || '-'}</TableCell>
                              <TableCell>
                                {a.status === 'Atendido' && !hasPaidForAppointment && (
                                  <Button size="sm" variant="outline" onClick={() => openPaymentModal(a)}>
                                    Registrar Pago
                                  </Button>
                                )}
                                {hasPaidForAppointment && (
                                  <Badge variant="default" className="bg-emerald-500">Pagado</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
               </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Modal de Zoom General y PDF Preview */}
        <Dialog open={!!previewData} onOpenChange={() => setPreviewData(null)}>
           <DialogContent className="max-w-[95vw] h-[95vh] flex flex-col p-0 bg-black/95 border-none">
              <div className="flex justify-between items-center p-4 bg-black/40 text-white z-50">
                <span className="text-sm font-medium">Previsualización de Documento</span>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={() => setPreviewData(null)}>
                  <X className="w-6 h-6" />
                </Button>
              </div>
              {previewData && (
                <div className="flex-1 w-full h-full flex items-center justify-center p-4">
                  {previewData.type.includes('pdf') ? (
                    <iframe 
                      src={previewData.url} 
                      className="w-full h-full rounded-lg bg-white" 
                      title="PDF Preview"
                    />
                  ) : (
                    <img src={previewData.url} className="max-w-full max-h-full object-contain shadow-2xl" alt="Preview" />
                  )}
                </div>
              )}
           </DialogContent>
        </Dialog>

        <PaymentModal
          open={showPaymentModal}
          onOpenChange={setShowPaymentModal}
          selectedAppointment={selectedAppointment ? {
            date: new Date(selectedAppointment.date).toLocaleDateString(),
            doctorName: selectedAppointment.doctorId || 'N/A',
            cost: selectedAppointment.cost || 0
          } : undefined}
          paymentForm={paymentForm}
          onFormChange={setPaymentForm}
          onSubmit={submitPayment}
          isSubmitting={isSubmittingPayment}
        />
      </AppLayout>
    </AuthProvider>
  );
}
