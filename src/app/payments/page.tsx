
"use client";

import { useState, useEffect } from 'react';
import { AuthProvider } from '@/hooks/use-auth';
import { AppLayout } from '@/components/layout/AppLayout';
import { db, Payment, Patient } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Search, Filter, ChevronLeft, ChevronRight, Edit2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

const PAGE_SIZE = 10;

function PaymentsContent() {
  const [payments, setPayments] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const allP = await db.getAll<Payment>('payments');
    const allPatients = await db.getAll<Patient>('patients');
    
    const fullPayments = allP.map(p => {
      const patient = allPatients.find(pat => pat.id === p.patientId);
      return {
        ...p,
        patientName: patient ? `${patient.lastNames}, ${patient.names}` : 'Desconocido',
        patientDni: patient?.dni || '',
      };
    });

    setPayments(fullPayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPayment) {
      await db.put('payments', editingPayment);
      setIsEditOpen(false);
      load();
    }
  };

  const filtered = payments.filter(p => 
    p.patientName.toLowerCase().includes(search.toLowerCase()) || 
    p.treatmentName.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginatedData = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const totalRecaudado = payments.reduce((acc, curr) => acc + curr.amount, 0);
  const totalSaldos = payments.reduce((acc, curr) => acc + curr.balance, 0);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-primary">Control de Pagos</h2>
            <p className="text-muted-foreground mt-1">Saldos, abonos y facturación por paciente</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none shadow-sm bg-primary/5">
             <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Histórico</CardTitle></CardHeader>
             <CardContent><div className="text-3xl font-bold text-primary">S/. {totalRecaudado.toFixed(2)}</div></CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-amber-50">
             <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Saldos por Cobrar</CardTitle></CardHeader>
             <CardContent><div className="text-3xl font-bold text-amber-600">S/. {totalSaldos.toFixed(2)}</div></CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-emerald-50">
             <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Pagos Realizados</CardTitle></CardHeader>
             <CardContent><div className="text-3xl font-bold text-emerald-600">{payments.length} transacciones</div></CardContent>
          </Card>
        </div>

        <Card className="p-6">
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input 
                placeholder="Buscar por paciente o tratamiento..." 
                className="pl-10 h-11"
                value={search}
                onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
              />
            </div>
            <Button variant="outline" className="gap-2 h-11"><Filter className="w-5 h-5" /> Filtros</Button>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Tratamiento / Obs.</TableHead>
                  <TableHead>Fecha / Hora</TableHead>
                  <TableHead>Costo</TableHead>
                  <TableHead>Pagado</TableHead>
                  <TableHead>Saldo</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map(p => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="font-bold">{p.patientName}</div>
                      <div className="text-[10px] text-muted-foreground">DNI: {p.patientDni}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{p.treatmentName}</div>
                      <div className="text-[10px] text-muted-foreground truncate max-w-[150px]">{p.observations}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">{p.date}</div>
                      <div className="text-[10px] text-muted-foreground">{p.time}</div>
                    </TableCell>
                    <TableCell className="font-medium">S/. {p.totalCost.toFixed(2)}</TableCell>
                    <TableCell className="font-bold text-emerald-600">S/. {p.amount.toFixed(2)}</TableCell>
                    <TableCell>
                       <Badge variant={p.balance > 0 ? 'outline' : 'default'} className={p.balance > 0 ? 'text-amber-600 border-amber-600' : 'bg-emerald-500'}>
                         S/. {p.balance.toFixed(2)}
                       </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                       <Button variant="ghost" size="icon" onClick={() => { setEditingPayment(p); setIsEditOpen(true); }}>
                         <Edit2 className="w-4 h-4" />
                       </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {paginatedData.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center py-20 text-muted-foreground">No hay registros de pagos que coincidan</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
               <span className="text-sm text-muted-foreground">Página {currentPage} de {totalPages}</span>
               <div className="flex gap-2">
                 <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1}>
                   <ChevronLeft className="w-4 h-4" /> Anterior
                 </Button>
                 <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages}>
                   Siguiente <ChevronRight className="w-4 h-4" />
                 </Button>
               </div>
            </div>
          )}
        </Card>

        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
           <DialogContent>
             <DialogHeader><DialogTitle>Modificar Pago / Saldo</DialogTitle></DialogHeader>
             {editingPayment && (
               <form onSubmit={handleUpdate} className="space-y-4 py-4">
                 <div className="space-y-2">
                   <Label>Monto Pagado (S/.)</Label>
                   <Input 
                     type="number" 
                     step="0.01" 
                     value={editingPayment.amount} 
                     onChange={e => {
                       const val = parseFloat(e.target.value);
                       setEditingPayment({...editingPayment, amount: val, balance: editingPayment.totalCost - val});
                     }} 
                   />
                 </div>
                 <div className="space-y-2">
                    <Label>Observaciones</Label>
                    <Textarea value={editingPayment.observations} onChange={e => setEditingPayment({...editingPayment, observations: e.target.value})} />
                 </div>
                 <div className="p-4 bg-muted rounded-md text-sm">
                   <p>Costo Total: <b>S/. {editingPayment.totalCost.toFixed(2)}</b></p>
                   <p>Nuevo Saldo: <b className="text-amber-600">S/. {editingPayment.balance.toFixed(2)}</b></p>
                 </div>
                 <DialogFooter>
                   <Button type="submit" className="w-full">Guardar Cambios</Button>
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
