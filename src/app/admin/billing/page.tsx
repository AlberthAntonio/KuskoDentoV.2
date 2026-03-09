
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
import { Search, Landmark, History, ReceiptText, ShieldCheck, ShieldAlert, Ban, RefreshCcw, MoreVertical, Wallet } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { format, isAfter, parseISO, addDays, addMonths } from 'date-fns';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

function BillingContent() {
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
      const currentExpiry = selectedClinic.nextPaymentDate ? parseISO(selectedClinic.nextPaymentDate) : new Date();
      const num = parseInt(installments) || 1;
      const calculatedNext = addMonths(currentExpiry, num);
      
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

  const getCalculatedStatus = (clinic: User) => {
    if (clinic.subscriptionStatus === 'blocked') return 'blocked';
    if (!clinic.nextPaymentDate) return 'active';
    
    const next = parseISO(clinic.nextPaymentDate);
    const today = new Date();
    
    if (isAfter(today, addDays(next, 10))) return 'suspended';
    if (isAfter(today, next)) return 'overdue';
    return 'active';
  };

  const handleStatusChange = async (clinicId: string, newStatus: 'active' | 'suspended' | 'blocked') => {
    const clinic = clinics.find(c => c.id === clinicId);
    if (!clinic) return;

    const updated: User = { ...clinic, subscriptionStatus: newStatus };
    await db.put('users', updated);
    toast({ 
      title: "Estado actualizado", 
      description: `El consultorio ahora está ${newStatus === 'active' ? 'Activo' : newStatus === 'suspended' ? 'Suspendido' : 'Bloqueado'}` 
    });
    load();
  };

  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClinic || !currentUser) return;

    const payment: SubscriptionPayment = {
      id: crypto.randomUUID(),
      clinicId: selectedClinic.id,
      clinicName: selectedClinic.fullName || selectedClinic.username || 'Clínica',
      amount: parseFloat(payAmount),
      date: new Date().toISOString().split('T')[0],
      concept: `Renovación: ${installments} cuota(s) mensuales. Próximo vencimiento: ${format(parseISO(nextDate), 'dd/MM/yyyy')}`,
      processedByAdminId: currentUser.username
    };

    await db.put('subscription_payments', payment);
    
    const updatedClinic: User = {
      ...selectedClinic,
      nextPaymentDate: nextDate,
      subscriptionStatus: 'active'
    };
    await db.put('users', updatedClinic);

    setIsPayOpen(false);
    toast({ 
      title: "Pago registrado con éxito", 
      description: `Acceso extendido hasta el ${format(parseISO(nextDate), "dd/MM/yyyy")}` 
    });
    setInstallments('1');
    load();
  };

  const filteredClinics = clinics.filter(c => 
    (c.fullName || c.username || '').toLowerCase().includes(search.toLowerCase()) || 
    (c.dni || '').includes(search)
  );

  if (currentUser?.role !== 'admin') return null;

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-3xl font-bold text-primary">Gestión de Pagos y Accesos</h2>
            <p className="text-muted-foreground mt-2">Control financiero centralizado (Día/Mes/Año)</p>
          </div>
          <div className="bg-primary/10 px-6 py-3 rounded-2xl border border-primary/20 flex items-center gap-4">
            <ReceiptText className="w-6 h-6 text-primary" />
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Recaudación Total</p>
              <p className="text-2xl font-bold text-primary">S/. {history.reduce((acc, h) => acc + h.amount, 0).toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-6 mb-6">
              <div>
                <CardTitle className="text-xl">Panel de Control Financiero</CardTitle>
                <CardDescription>Cobros y reactivación automática</CardDescription>
              </div>
              <div className="relative w-72">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar consultorio..." className="pl-10 h-10 text-xs rounded-xl" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Consultorio</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead>Estado Actual</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClinics.map(c => {
                    const status = getCalculatedStatus(c);
                    return (
                      <TableRow key={c.id} className="group transition-colors">
                        <TableCell>
                          <p className="font-bold text-sm text-slate-900">{c.fullName || c.username}</p>
                          <p className="text-[10px] text-muted-foreground uppercase font-medium">Costo: S/. {c.subscriptionFee}</p>
                        </TableCell>
                        <TableCell className="text-xs font-semibold">
                          {c.nextPaymentDate ? format(parseISO(c.nextPaymentDate), "dd/MM/yyyy") : 'Pendiente'}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline"
                            className={cn(
                              "text-[9px] h-5 font-bold tracking-tight",
                              status === 'active' && "bg-emerald-100 text-emerald-700 border-emerald-200",
                              status === 'overdue' && "bg-amber-100 text-amber-700 border-amber-200",
                              status === 'suspended' && "bg-orange-100 text-orange-700 border-orange-200",
                              status === 'blocked' && "bg-red-100 text-red-700 border-red-200"
                            )}
                          >
                            {status === 'active' ? 'ACTIVA' : status === 'overdue' ? 'MORA' : status === 'suspended' ? 'SUSPENDIDA' : 'BLOQUEADA'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              size="sm" 
                              className="h-9 px-4 gap-2 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/10 transition-all hover:scale-105" 
                              onClick={() => {
                                setSelectedClinic(c);
                                setIsPayOpen(true);
                              }}
                            >
                              <Wallet className="w-4 h-4" />
                              Registrar Pago
                            </Button>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-9 w-9 p-0 rounded-xl hover:bg-slate-50">
                                  <MoreVertical className="w-4 h-4 text-muted-foreground" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-52 rounded-2xl shadow-xl border-slate-100 p-2">
                                <DropdownMenuLabel className="text-[10px] px-3 py-2 uppercase font-black text-muted-foreground tracking-widest">Control de Acceso</DropdownMenuLabel>
                                <DropdownMenuSeparator className="my-1" />
                                <DropdownMenuItem className="gap-3 py-2.5 rounded-xl cursor-pointer hover:bg-emerald-50 focus:bg-emerald-50 transition-colors" onClick={() => handleStatusChange(c.id, 'active')}>
                                  <div className="p-1.5 bg-emerald-100 rounded-lg"><ShieldCheck className="w-4 h-4 text-emerald-600" /></div>
                                  <span className="font-bold text-sm text-emerald-900">Activar Servicio</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem className="gap-3 py-2.5 rounded-xl cursor-pointer hover:bg-orange-50 focus:bg-orange-50 transition-colors" onClick={() => handleStatusChange(c.id, 'suspended')}>
                                  <div className="p-1.5 bg-orange-100 rounded-lg"><ShieldAlert className="w-4 h-4 text-orange-600" /></div>
                                  <span className="font-bold text-sm text-orange-900">Suspender Acceso</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="my-1" />
                                <DropdownMenuItem className="gap-3 py-2.5 rounded-xl cursor-pointer hover:bg-red-50 focus:bg-red-50 group transition-colors" onClick={() => handleStatusChange(c.id, 'blocked')}>
                                  <div className="p-1.5 bg-red-100 rounded-lg"><Ban className="w-4 h-4 text-red-600" /></div>
                                  <span className="font-bold text-sm text-red-900">Bloquear Cuenta</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader className="border-b pb-6 mb-6">
              <CardTitle className="text-lg flex items-center gap-2"><History className="w-5 h-5 text-primary" /> Historial de Cobros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 scrollbar-hide">
                {history.map(h => (
                  <div key={h.id} className="p-4 border rounded-2xl bg-slate-50 flex items-start justify-between hover:bg-white transition-all shadow-sm border-slate-200 group">
                    <div className="flex gap-3">
                      <div className="p-2 bg-white rounded-xl text-emerald-600 border border-emerald-100">
                        <ReceiptText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-xs truncate text-slate-900">{h.clinicName}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{h.concept}</p>
                        {h.processedByAdminId && (
                          <p className="text-[8px] font-bold text-muted-foreground uppercase">Por: {h.processedByAdminId}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-xs text-emerald-600">S/. {h.amount.toFixed(2)}</p>
                      <p className="text-[9px] text-muted-foreground">{format(parseISO(h.date), 'dd/MM/yyyy')}</p>
                    </div>
                  </div>
                ))}
                {history.length === 0 && (
                  <div className="text-center py-10 text-muted-foreground">
                    <p className="text-xs">No hay registros de cobros aún.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isPayOpen} onOpenChange={setIsPayOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Landmark className="w-6 h-6 text-primary" /> Registrar Pago de Cuotas
            </DialogTitle>
          </DialogHeader>
          {selectedClinic && (
            <form onSubmit={handleRegisterPayment} className="space-y-6 py-4">
              <div className="bg-primary/5 p-5 rounded-2xl border border-primary/10">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">Consultorio</p>
                <p className="font-bold text-lg text-primary">{selectedClinic.fullName || selectedClinic.username}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold">Meses a Adelantar</Label>
                  <Select value={installments} onValueChange={setInstallments}>
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => i + 1).map(n => (
                        <SelectItem key={n} value={n.toString()}>{n} mes(es)</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold">Monto Total (S/.)</Label>
                  <Input type="number" step="0.01" value={payAmount} readOnly className="bg-muted font-bold rounded-xl h-11" />
                </div>
              </div>

              <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <RefreshCcw className="w-5 h-5 text-emerald-600" />
                  <div>
                    <p className="text-[10px] font-bold text-emerald-800 uppercase leading-none">Nueva Vigencia</p>
                    <p className="text-sm font-bold text-emerald-600 mt-1">{nextDate ? format(parseISO(nextDate), "dd/MM/yyyy") : '---'}</p>
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button type="submit" className="w-full h-12 text-lg font-bold rounded-2xl shadow-xl shadow-primary/20">
                  Confirmar Pago y Activar
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

export default function BillingPage() {
  return (
    <AuthProvider>
      <BillingContent />
    </AuthProvider>
  );
}
