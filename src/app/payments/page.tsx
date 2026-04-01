"use client";

import { useEffect, useMemo, useState } from 'react';
import { AuthProvider } from '@/hooks/use-auth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Search, ChevronLeft, ChevronRight, HandCoins } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, isValid } from 'date-fns';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 10;

type ApiPaymentHistory = {
  id: string;
  amount_paid: string | number;
  payment_date: string;
  payment_method: string;
  reference?: string | null;
};

type ApiPayment = {
  id: string;
  total_cost: string | number;
  total_paid: string | number;
  balance: string | number;
  payment_status: string;
  payment_method?: string | null;
  notes?: string | null;
  created_at: string;
  patient?: {
    id: string;
    full_name: string;
    dni: string;
  };
  appointment?: {
    id: string;
    date: string;
    time: string;
    status: string;
    cost?: string | number;
    treatment?: { id: string; name: string } | null;
  };
  payment_histories?: ApiPaymentHistory[];
};

type ApiAppointment = {
  id: string;
  date: string;
  time: string;
  status: string;
  cost: string | number;
  patient?: {
    id: string;
    full_name: string;
    dni: string;
  };
  treatment?: { id: string; name: string } | null;
};

type ApiResponse<T> = {
  success?: boolean;
  data?: T;
  error?: string;
  items?: unknown;
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

  const body = (await response.json()) as ApiResponse<T> | T;
  if (!response.ok) {
    const message =
      typeof body === 'object' && body !== null && 'error' in body
        ? String((body as { error?: string }).error || 'Error de API')
        : 'Error de API';
    throw new Error(message);
  }

  if (
    typeof body === 'object' &&
    body !== null &&
    'success' in body &&
    (body as ApiResponse<T>).success !== undefined
  ) {
    const wrapped = body as ApiResponse<T>;
    if (!wrapped.success) {
      throw new Error(wrapped.error || 'Error de API');
    }
    return wrapped.data as T;
  }

  return body as T;
}

function toNumber(v: string | number | undefined | null) {
  return Number(v || 0);
}

function PaymentsContent() {
  const { toast } = useToast();
  const [payments, setPayments] = useState<ApiPayment[]>([]);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingPayment, setEditingPayment] = useState<ApiPayment | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [newAmount, setNewAmount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const [paymentsData, completedAppointmentsData, attendedAppointmentsData] = await Promise.all([
        apiRequest<ApiPayment[] | { items: ApiPayment[] }>('/api/payments'),
        apiRequest<ApiAppointment[] | { items: ApiAppointment[] }>('/api/appointments?status=completed'),
        apiRequest<ApiAppointment[] | { items: ApiAppointment[] }>('/api/appointments?status=attended'),
      ]);

      let items: ApiPayment[] = [];
      if (Array.isArray(paymentsData)) {
        items = paymentsData;
      } else if (paymentsData && typeof paymentsData === 'object' && 'items' in paymentsData) {
        items = Array.isArray((paymentsData as { items: ApiPayment[] }).items)
          ? (paymentsData as { items: ApiPayment[] }).items
          : [];
      }

      const extractAppointments = (raw: ApiAppointment[] | { items: ApiAppointment[] }): ApiAppointment[] => {
        if (Array.isArray(raw)) return raw;
        if (raw && typeof raw === 'object' && 'items' in raw) {
          return Array.isArray((raw as { items: ApiAppointment[] }).items)
            ? (raw as { items: ApiAppointment[] }).items
            : [];
        }
        return [];
      };

      const allCompleted = [...extractAppointments(completedAppointmentsData), ...extractAppointments(attendedAppointmentsData)];
      const seenAppointments = new Set<string>();
      const uniqueCompleted = allCompleted.filter((a) => {
        if (seenAppointments.has(a.id)) return false;
        seenAppointments.add(a.id);
        return true;
      });

      const paidAppointmentIds = new Set(items.map((p) => p.appointment?.id).filter(Boolean) as string[]);
      const pendingRows: ApiPayment[] = uniqueCompleted
        .filter((appt) => !paidAppointmentIds.has(appt.id))
        .map((appt) => {
          const totalCost = toNumber(appt.cost);
          return {
            id: `pending:${appt.id}`,
            total_cost: totalCost,
            total_paid: 0,
            balance: totalCost,
            payment_status: 'pending',
            created_at: appt.date,
            patient: appt.patient,
            appointment: {
              id: appt.id,
              date: appt.date,
              time: appt.time,
              status: appt.status,
              cost: appt.cost,
              treatment: appt.treatment,
            },
            payment_histories: [],
          };
        });

      setPayments([...items, ...pendingRows]);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'No se pudo cargar pagos',
        description: error instanceof Error ? error.message : 'Error inesperado',
      });
      setPayments([]);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment) return;

    const currentBalance = toNumber(editingPayment.balance);
    if (newAmount <= 0 || newAmount > currentBalance) {
      toast({
        variant: 'destructive',
        title: 'Monto invalido',
        description: 'El abono debe ser mayor a 0 y menor o igual al saldo pendiente.',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingPayment.id.startsWith('pending:')) {
        const appointmentId = editingPayment.appointment?.id;
        const patientId = editingPayment.patient?.id;
        if (!appointmentId || !patientId) {
          throw new Error('No se pudo identificar la cita o el paciente para crear el pago.');
        }

        await apiRequest('/api/payments', {
          method: 'POST',
          body: JSON.stringify({
            patient_id: patientId,
            appointment_id: appointmentId,
            amount: newAmount,
            payment_method: 'cash',
            notes: 'Pago inicial registrado desde seguimiento de pagos',
            total_cost: toNumber(editingPayment.total_cost),
          }),
        });
      } else {
        await apiRequest(`/api/payments/${editingPayment.id}/history`, {
          method: 'POST',
          body: JSON.stringify({
            amount_paid: newAmount,
            payment_method: 'cash',
            reference: 'abono-manual-ui',
          }),
        });
      }

      setIsEditOpen(false);
      setNewAmount(0);
      toast({ title: editingPayment.id.startsWith('pending:') ? 'Pago creado correctamente' : 'Abono registrado correctamente' });
      await load();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'No se pudo registrar el abono',
        description: error instanceof Error ? error.message : 'Error inesperado',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const safeFormatDate = (dateStr?: string) => {
    if (!dateStr) return '---';
    try {
      const parsed = parseISO(dateStr);
      return isValid(parsed) ? format(parsed, 'dd/MM/yyyy') : dateStr;
    } catch {
      return dateStr;
    }
  };

  const filtered = useMemo(
    () =>
      payments.filter((p) => {
        const patientName = p.patient?.full_name || '';
        const treatmentName = p.appointment?.treatment?.name || 'Consulta';
        const patientDni = p.patient?.dni || '';

        return (
          patientName.toLowerCase().includes(search.toLowerCase()) ||
          treatmentName.toLowerCase().includes(search.toLowerCase()) ||
          patientDni.includes(search)
        );
      }),
    [payments, search]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginatedData = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const totalRecaudado = payments.reduce((acc, curr) => acc + toNumber(curr.total_paid), 0);
  const totalSaldos = payments.reduce((acc, curr) => acc + toNumber(curr.balance), 0);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-primary">Seguimiento de Pagos</h2>
            <p className="text-muted-foreground mt-1">Control de presupuestos y abonos de pacientes</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none shadow-sm bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Recaudacion</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">S/. {totalRecaudado.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-amber-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase text-amber-600">Por cobrar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">S/. {totalSaldos.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-slate-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase text-slate-600">Operaciones</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-600">{payments.length}</div>
            </CardContent>
          </Card>
        </div>

        <Card className="p-6 border-none shadow-sm">
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="DNI o nombre del paciente..."
                className="pl-10 h-11"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>

          <div className="border rounded-xl overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Tratamiento</TableHead>
                  <TableHead>Presupuesto</TableHead>
                  <TableHead>Pagado</TableHead>
                  <TableHead>Saldo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((p) => {
                  const totalCost = toNumber(p.total_cost);
                  const totalPaid = toNumber(p.total_paid);
                  const balance = toNumber(p.balance);
                  const patientName = p.patient?.full_name || 'Desconocido';
                  const patientDni = p.patient?.dni || '';
                  const treatmentName = p.appointment?.treatment?.name || 'Consulta';

                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="font-bold text-sm">{patientName}</div>
                        <div className="text-[10px] text-muted-foreground">DNI: {patientDni}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-[11px] uppercase truncate max-w-[150px]">{treatmentName}</div>
                        <div className="text-[10px] text-muted-foreground">{safeFormatDate(p.created_at)}</div>
                      </TableCell>
                      <TableCell className="text-sm">S/. {totalCost.toFixed(2)}</TableCell>
                      <TableCell className="font-bold text-emerald-600 text-sm">S/. {totalPaid.toFixed(2)}</TableCell>
                      <TableCell className="font-bold text-sm">S/. {balance.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={balance > 0 ? 'outline' : 'default'}
                          className={cn(
                            'text-[10px] h-5',
                            balance > 0 ? 'text-amber-600 border-amber-600' : 'bg-emerald-500'
                          )}
                        >
                          {balance > 0 ? 'PENDIENTE' : 'LIQUIDADO'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-2"
                          onClick={() => {
                            setEditingPayment(p);
                            setIsEditOpen(true);
                          }}
                          disabled={balance === 0}
                        >
                          <HandCoins className="w-4 h-4" /> Abono
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {paginatedData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {payments.length === 0
                        ? 'No hay pagos ni citas atendidas pendientes por cobrar'
                        : 'No hay resultados que coincidan con tu búsqueda'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <span className="text-xs text-muted-foreground">Pagina {currentPage} de {totalPages}</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>

        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <HandCoins className="w-5 h-5 text-emerald-600" /> Registrar Abono
              </DialogTitle>
            </DialogHeader>
            {editingPayment && (
              <form onSubmit={handleUpdate} className="space-y-4 py-2">
                <div className="p-4 bg-muted/50 rounded-xl border space-y-2">
                  <p className="text-xs">
                    Paciente: <b className="text-primary">{editingPayment.patient?.full_name || 'Desconocido'}</b>
                  </p>
                  <p className="text-xs">
                    Procedimiento: <b>{editingPayment.appointment?.treatment?.name || 'Consulta'}</b>
                  </p>
                  <p className="text-xs">
                    Saldo pendiente:{' '}
                    <b className="text-amber-600">S/. {toNumber(editingPayment.balance).toFixed(2)}</b>
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Monto del nuevo abono (S/.)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    max={toNumber(editingPayment.balance)}
                    value={newAmount}
                    onChange={(e) => setNewAmount(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="bg-emerald-50 p-3 rounded-lg flex justify-between items-center">
                  <span className="text-[10px] font-bold uppercase text-emerald-700">Nuevo saldo:</span>
                  <span className="text-sm font-bold text-emerald-600">
                    S/. {Math.max(0, toNumber(editingPayment.balance) - newAmount).toFixed(2)}
                  </span>
                </div>
                <DialogFooter>
                  <Button
                    type="submit"
                    className="w-full h-12 text-lg"
                    disabled={
                      isSubmitting || newAmount <= 0 || newAmount > toNumber(editingPayment.balance)
                    }
                  >
                    {isSubmitting ? 'Registrando...' : 'Registrar Pago'}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

export default function PaymentsPage() {
  return (
    <AuthProvider>
      <PaymentsContent />
    </AuthProvider>
  );
}
