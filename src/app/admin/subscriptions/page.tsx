
"use client";

import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { AppLayout } from '@/components/layout/AppLayout';
import { db, User, SubscriptionPayment } from '@/lib/db';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, CreditCard, Calendar, Clock, CheckCircle2, AlertTriangle, Landmark, Plus, History, ReceiptText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { format, isAfter, parseISO, addDays, isBefore, addMonths, addYears } from 'date-fns';
import { es } from 'date-fns/locale';

function SubscriptionsContent() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [clinics, setClinics] = useState<User[]>([]);
  const [history, setHistory] = useState<SubscriptionPayment[]>([]);
  const [search, setSearch] = useState('');
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState<User | null>(null);
  const [payAmount, setPayAmount] = useState('0');
  const [nextDate, setNextDate] = useState('');
  const [installments, setInstallments] = useState('1');

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (selectedClinic && installments) {
      const currentNext = selectedClinic.nextPaymentDate ? parseISO(selectedClinic.nextPaymentDate) : new Date();
      const num = parseInt(installments) || 1;
      let calculatedNext;
      
      if (selectedClinic.paymentFrequency === 'yearly') {
        calculatedNext = addYears(currentNext, num);
      } else {
        calculatedNext = addMonths(currentNext, num);
      }
      
      setNextDate(format(calculatedNext, 'yyyy-MM-dd'));
      setPayAmount(((selectedClinic.subscriptionFee || 0) * num).toString());
    }
  }, [selectedClinic, installments]);

  const load = async () => {
    const allUsers = await db.getAll<User>('users');
    const allHistory = await db.getAll<SubscriptionPayment>('subscription_payments');
    setClinics(allUsers.filter(u => u.role === 'clinic'));
    setHistory(allHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  };

  const getStatus = (clinic: User) => {
    if (clinic.subscriptionStatus === 'blocked') return 'blocked';
    if (!clinic.nextPaymentDate) return 'pending';
    
    const next = parseISO(clinic.nextPaymentDate);
    const today = new Date();
    
    if (isAfter(today, addDays(next, 10))) return 'suspended';
    if (isAfter(today, next)) return 'overdue';
    return 'active';
  };

  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClinic) return;

    const payment: SubscriptionPayment = {
      id: crypto.randomUUID(),
      clinicId: selectedClinic.id,
      clinicName: selectedClinic.fullName || selectedClinic.username || 'Clínica',
      amount: parseFloat(payAmount),
      date: new Date().toISOString().split('T')[0],
      concept: `Renovación: ${installments} cuota(s) (${selectedClinic.paymentFrequency === 'monthly' ? 'Mensual' : 'Anual'}). Próximo vencimiento: ${nextDate}`
    };

    await db.put('subscription_payments', payment);
    
    // Actualizar datos del consultorio y reactivar si estaba suspendido
    const updatedClinic: User = {
      ...selectedClinic,
      nextPaymentDate: nextDate,
      subscriptionStatus: selectedClinic.subscriptionStatus === 'blocked' ? 'blocked' : 'active'
    };
    await db.put('users', updatedClinic);

    setIsPayOpen(false);
    toast({ 
      title: "Pago registrado con éxito", 
      description: `Se ha extendido el acceso hasta el ${format(parseISO(nextDate), "dd 'de' MMMM, yyyy", { locale: es })}` 
    });
    setInstallments('1');
    load();
  };

  const filteredClinics = clinics.filter(c => 
    (c.fullName || c.username || '').toLowerCase().includes(search.toLowerCase()) || 
    (c.dni || '').includes(search)
  );

  if (currentUser?.role !== 'superadmin') return null;

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-3xl font-bold text-primary">Administración de Cobros</h2>
            <p className="text-muted-foreground mt-2">Seguimiento de suscripciones y renovación de accesos</p>
          </div>
          <div className="bg-primary/10 px-4 py-2 rounded-lg border border-primary/20 flex items-center gap-3">
            <ReceiptText className="w-5 h-5 text-primary" />
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Recaudación Total</p>
              <p className="text-lg font-bold text-primary">S/. {history.reduce((acc, h) => acc + h.amount, 0).toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border-none shadow-sm bg-white">
            <CardHeader className="pb-2"><CardTitle className="text-xs uppercase text-muted-foreground">Total Red</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{clinics.length}</div></CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-emerald-50">
            <CardHeader className="pb-2"><CardTitle className="text-xs uppercase text-emerald-600">Al Día</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-emerald-600">{clinics.filter(c => getStatus(c) === 'active').length}</div></CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-amber-50">
            <CardHeader className="pb-2"><CardTitle className="text-xs uppercase text-amber-600">En Mora</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-amber-600">{clinics.filter(c => getStatus(c) === 'overdue').length}</div></CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-red-50">
            <CardHeader className="pb-2"><CardTitle className="text-xs uppercase text-red-600">Suspendidos</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-red-600">{clinics.filter(c => getStatus(c) === 'suspended').length}</div></CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between border-b mb-4">
              <div>
                <CardTitle>Estado de Consultorios</CardTitle>
                <CardDescription>Control de vencimientos y renovación</CardDescription>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar por nombre o DNI..." className="pl-8 h-10 text-xs" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Consultorio</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Gestión</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClinics.map(c => {
                    const status = getStatus(c);
                    return (
                      <TableRow key={c.id} className="hover:bg-muted/30">
                        <TableCell>
                          <p className="font-bold text-sm">{c.fullName || c.username}</p>
                          <p className="text-[10px] text-muted-foreground uppercase">{c.paymentFrequency === 'yearly' ? 'Plan Anual' : 'Plan Mensual'}</p>
                        </TableCell>
                        <TableCell className="text-xs font-medium">
                          {c.nextPaymentDate ? format(parseISO(c.nextPaymentDate), "dd/MM/yyyy") : '---'}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={status === 'active' ? 'default' : status === 'overdue' ? 'secondary' : 'destructive'} 
                            className={cn(
                              "text-[10px] h-5",
                              status === 'overdue' && "bg-amber-100 text-amber-700 hover:bg-amber-100",
                              status === 'active' && "bg-emerald-500 hover:bg-emerald-600"
                            )}
                          >
                            {status === 'active' ? 'AL DÍA' : status === 'overdue' ? 'POR VENCER' : status === 'suspended' ? 'SUSPENDIDO' : 'BLOQUEADO'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" className="gap-2 h-8" onClick={() => {
                            setSelectedClinic(c);
                            setIsPayOpen(true);
                          }}>
                            <Landmark className="w-3 h-3" /> Cobrar
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="border-b mb-4">
              <CardTitle className="flex items-center gap-2"><History className="w-5 h-5" /> Historial de Cobros</CardTitle>
              <CardDescription>Últimos pagos verificados</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 scrollbar-hide">
                {history.map(h => (
                  <div key={h.id} className="p-3 border rounded-xl bg-slate-50 flex items-start justify-between hover:bg-white transition-all shadow-sm border-slate-200">
                    <div className="flex gap-3">
                      <div className="p-2 bg-white rounded-full text-emerald-600 border border-emerald-100">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-xs truncate">{h.clinicName}</p>
                        <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight">{h.concept}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-xs text-emerald-600">S/. {h.amount.toFixed(2)}</p>
                      <p className="text-[9px] text-muted-foreground">{h.date}</p>
                    </div>
                  </div>
                ))}
                {history.length === 0 && (
                  <div className="py-20 text-center opacity-40">
                    <CreditCard className="w-12 h-12 mx-auto mb-2" />
                    <p className="text-xs">Sin registros de pago</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isPayOpen} onOpenChange={setIsPayOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Landmark className="w-5 h-5 text-primary" /> Registrar Pago
            </DialogTitle>
          </DialogHeader>
          {selectedClinic && (
            <form onSubmit={handleRegisterPayment} className="space-y-5 py-2">
              <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Consultorio Seleccionado</p>
                <p className="font-bold text-primary">{selectedClinic.fullName || selectedClinic.username}</p>
                <p className="text-xs text-muted-foreground mt-1">Costo Unitario: S/. {selectedClinic.subscriptionFee?.toFixed(2)} ({selectedClinic.paymentFrequency === 'yearly' ? 'Anual' : 'Mensual'})</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>N° de Cuotas a Pagar</Label>
                  <Input type="number" min="1" value={installments} onChange={e => setInstallments(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Monto Total (S/.)</Label>
                  <Input type="number" step="0.01" value={payAmount} onChange={e => setPayAmount(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Nueva Fecha de Vencimiento</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input type="date" className="pl-10" value={nextDate} onChange={e => setNextDate(e.target.value)} required />
                </div>
              </div>

              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-emerald-800 uppercase">Acceso se extenderá hasta:</span>
                </div>
                <span className="text-xs font-bold text-emerald-600">{nextDate ? format(parseISO(nextDate), "dd/MM/yyyy") : '---'}</span>
              </div>

              <DialogFooter className="pt-2">
                <Button type="submit" className="w-full h-12 text-lg shadow-lg shadow-primary/20">
                  Confirmar Pago y Renovar Acceso
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

export default function SubscriptionsPage() {
  return (
    <AuthProvider>
      <SubscriptionsContent />
    </AuthProvider>
  );
}
