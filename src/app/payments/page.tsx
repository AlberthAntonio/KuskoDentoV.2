"use client";

import { useState, useEffect } from 'react';
import { AuthProvider } from '@/hooks/use-auth';
import { AppLayout } from '@/components/layout/AppLayout';
import { db, Payment, Patient, Treatment } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Search, Plus, CreditCard, Filter } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

function PaymentsContent() {
  const [payments, setPayments] = useState<any[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const allP = await db.getAll<Payment>('payments');
    const allPatients = await db.getAll<Patient>('patients');
    const allT = await db.getAll<Treatment>('treatments');
    
    setPatients(allPatients);

    const fullPayments = allP.map(p => {
      const patient = allPatients.find(pat => pat.id === p.patientId);
      const treatment = allT.find(t => t.id === p.treatmentId);
      return {
        ...p,
        patientName: patient ? `${patient.lastNames}, ${patient.names}` : 'Desconocido',
        patientDni: patient?.dni || '',
        treatmentName: treatment?.name || 'Varios'
      };
    });

    setPayments(fullPayments);
  };

  const filtered = payments.filter(p => 
    p.patientName.toLowerCase().includes(search.toLowerCase()) || 
    p.patientDni.includes(search)
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-primary">Gestión de Pagos</h2>
            <p className="text-muted-foreground mt-1">Control de ingresos, abonos y deudas de pacientes</p>
          </div>
          <Button className="gap-2 h-12">
            <Plus className="w-5 h-5" />
            Nuevo Registro de Pago
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none shadow-sm">
             <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Recaudado (Mes)</CardTitle></CardHeader>
             <CardContent><div className="text-3xl font-bold text-primary">S/. 12,450.00</div></CardContent>
          </Card>
          <Card className="border-none shadow-sm">
             <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Saldos Pendientes</CardTitle></CardHeader>
             <CardContent><div className="text-3xl font-bold text-amber-600">S/. 3,200.00</div></CardContent>
          </Card>
          <Card className="border-none shadow-sm">
             <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Pagos Hoy</CardTitle></CardHeader>
             <CardContent><div className="text-3xl font-bold text-emerald-600">S/. 850.00</div></CardContent>
          </Card>
        </div>

        <Card className="p-6">
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input 
                placeholder="Buscar por paciente o DNI..." 
                className="pl-10 h-11"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Button variant="outline" className="gap-2 h-11"><Filter className="w-5 h-5" /> Filtros</Button>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(p => (
                  <TableRow key={p.id}>
                    <TableCell>{p.date}</TableCell>
                    <TableCell>
                      <div className="font-medium">{p.patientName}</div>
                      <div className="text-xs text-muted-foreground">DNI: {p.patientDni}</div>
                    </TableCell>
                    <TableCell>{p.treatmentName}</TableCell>
                    <TableCell>
                      <Badge variant={p.type === 'Cancelado' ? 'default' : 'outline'}>
                        {p.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold text-slate-800">S/. {p.amount.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">No se encontraron registros de pagos</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
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
