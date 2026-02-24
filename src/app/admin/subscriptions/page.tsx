
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
import { Search, CreditCard, Calendar, Clock, CheckCircle2, AlertTriangle, Landmark, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { format, isAfter, parseISO, addDays, isBefore } from 'date-fns';

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

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const allUsers = await db.getAll<User>('users');
    const allHistory = await db.getAll<SubscriptionPayment>('subscription_payments');
    setClinics(allUsers.filter(u => u.role === 'clinic'));
    setHistory(allHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  };

  const getStatus = (clinic: User) => {
    if (!clinic.nextPaymentDate) return 'pending';
    const next = parseISO(clinic.nextPaymentDate);
    const today = new Date();
    
    if (isAfter(today, addDays(next, 10))) return 'blocked';
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
      concept: `Pago de mensualidad - Próximo vencimiento: ${nextDate}`
    };

    await db.put('subscription_payments', payment);
    
    // Actualizar datos del consultorio
    const updatedClinic = {
      ...selectedClinic,
      nextPaymentDate: nextDate,
      subscriptionStatus: 'active'
    };
    await db.put('users', updatedClinic);

    setIsPayOpen(false);
    toast({ title: "Pago registrado", description: "Se ha actualizado la fecha de vencimiento del consultorio." });
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
        <div>
          <h2 className="text-3xl font-bold text-primary">Administración de Cobros</h2>
          <p className="text-muted-foreground mt-2">Seguimiento de suscripciones y pagos de consultorios</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none shadow-sm bg-primary/5">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Total Consultorios</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{clinics.length}</div></CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-amber-50">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Pagos Vencidos</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-amber-600">{clinics.filter(c => getStatus(c) === 'overdue').length}</div></CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-red-50">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Bloqueados por Mora</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-red-600">{clinics.filter(c => getStatus(c) === 'blocked').length}</div></CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Estado de Suscripciones</CardTitle>
                <CardDescription>Control de vencimientos</CardDescription>
              </div>
              <div className="relative w-48">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar..." className="pl-8 h-9 text-xs" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Consultorio</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClinics.map(c => {
                    const status = getStatus(c);
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.fullName || c.username}</TableCell>
                        <TableCell className="text-xs">{c.nextPaymentDate || 'Pendiente'}</TableCell>
                        <TableCell>
                          <Badge variant={status === 'active' ? 'default' : status === 'overdue' ? 'secondary' : 'destructive'} className="text-[10px]">
                            {status === 'active' ? 'AL DÍA' : status === 'overdue' ? 'DEUDA' : 'BLOQUEADO'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => {
                            setSelectedClinic(c);
                            setPayAmount(c.subscriptionFee?.toString() || '0');
                            setIsPayOpen(true);
                          }}>
                            <Landmark className="w-4 h-4" />
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
            <CardHeader>
              <CardTitle>Historial de Pagos</CardTitle>
              <CardDescription>Últimas transacciones registradas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {history.map(h => (
                  <div key={h.id} className="p-4 border rounded-lg flex items-center justify-between hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-100 text-emerald-600 rounded-full">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-sm">{h.clinicName}</p>
                        <p className="text-[10px] text-muted-foreground">{h.concept}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-600">S/. {h.amount.toFixed(2)}</p>
                      <p className="text-[10px] text-muted-foreground">{h.date}</p>
                    </div>
                  </div>
                ))}
                {history.length === 0 && <p className="text-center text-xs text-muted-foreground py-10">No hay pagos registrados aún.</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isPayOpen} onOpenChange={setIsPayOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar Pago de Suscripción</DialogTitle></DialogHeader>
          <form onSubmit={handleRegisterPayment} className="space-y-4 py-4">
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-xs uppercase font-bold text-muted-foreground mb-1">Consultorio</p>
              <p className="font-bold">{selectedClinic?.fullName || selectedClinic?.username}</p>
            </div>
            <div className="space-y-2">
              <Label>Monto Recibido (S/.)</Label>
              <Input type="number" step="0.01" value={payAmount} onChange={e => setPayAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Nueva Fecha de Vencimiento</Label>
              <Input type="date" value={nextDate} onChange={e => setNextDate(e.target.value)} required />
            </div>
            <DialogFooter className="pt-4">
              <Button type="submit" className="w-full h-12">Confirmar Pago y Renovar Acceso</Button>
            </DialogFooter>
          </form>
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
