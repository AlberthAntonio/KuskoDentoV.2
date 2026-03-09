
"use client";

import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { AppLayout } from '@/components/layout/AppLayout';
import { db, User } from '@/lib/db';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, CreditCard, Calendar, Clock, CheckCircle2, AlertTriangle, ShieldCheck, Activity } from 'lucide-react';
import { format, isAfter, parseISO, addDays } from 'date-fns';
import { cn } from '@/lib/utils';

function SubscriptionsContent() {
  const { user: currentUser } = useAuth();
  const [clinics, setClinics] = useState<User[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const allUsers = await db.getAll<User>('users');
    setClinics(allUsers.filter(u => u.role === 'clinic'));
  };

  const getStatus = (clinic: User) => {
    if (clinic.subscriptionStatus === 'blocked') return 'blocked';
    if (clinic.subscriptionStatus === 'suspended') return 'suspended';
    if (!clinic.nextPaymentDate) return 'pending';
    
    const next = parseISO(clinic.nextPaymentDate);
    const today = new Date();
    
    if (isAfter(today, addDays(next, 10))) return 'suspended';
    if (isAfter(today, next)) return 'overdue';
    return 'active';
  };

  const filteredClinics = clinics.filter(c => 
    (c.fullName || c.username || '').toLowerCase().includes(search.toLowerCase()) || 
    (c.dni || '').includes(search)
  );

  if (currentUser?.role !== 'admin') return null;

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-bold text-primary">Estado de Suscripciones</h2>
          <p className="text-muted-foreground mt-2">Visión general del estado de acceso y salud de la red (DD/MM/YYYY)</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none shadow-sm bg-white border-l-4 border-emerald-500">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-[10px] uppercase font-bold text-muted-foreground">Cuentas Saludables</CardTitle>
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
            </CardHeader>
            <CardContent><div className="text-3xl font-bold text-emerald-600">{clinics.filter(c => getStatus(c) === 'active').length}</div></CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-white border-l-4 border-amber-500">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-[10px] uppercase font-bold text-muted-foreground">Alertas de Pago</CardTitle>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </CardHeader>
            <CardContent><div className="text-3xl font-bold text-amber-600">{clinics.filter(c => getStatus(c) === 'overdue').length}</div></CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-white border-l-4 border-red-500">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-[10px] uppercase font-bold text-muted-foreground">Fuera de Servicio</CardTitle>
              <Activity className="w-4 h-4 text-red-500" />
            </CardHeader>
            <CardContent><div className="text-3xl font-bold text-red-600">{clinics.filter(c => getStatus(c) === 'suspended' || getStatus(c) === 'blocked').length}</div></CardContent>
          </Card>
        </div>

        <Card className="border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between border-b pb-6 mb-6">
            <div>
              <CardTitle className="text-xl font-bold">Directorio de Planes</CardTitle>
              <CardDescription>Monitoreo de vigencia de servicios por clínica</CardDescription>
            </div>
            <div className="relative w-72">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por nombre o DNI..." className="pl-10 h-10 text-xs rounded-xl" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Consultorio</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClinics.map(c => {
                  const status = getStatus(c);
                  return (
                    <TableRow key={c.id}>
                      <TableCell>
                        <p className="font-bold text-sm text-slate-900">{c.fullName || c.username}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">S/. {c.subscriptionFee} mensual</p>
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-slate-700">
                        {c.nextPaymentDate ? format(parseISO(c.nextPaymentDate), "dd/MM/yyyy") : 'No definido'}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={status === 'active' ? 'default' : status === 'overdue' ? 'secondary' : 'destructive'} 
                          className={cn(
                            "text-[9px] h-5 font-bold",
                            status === 'active' && "bg-emerald-500",
                            status === 'overdue' && "bg-amber-500",
                            status === 'suspended' && "bg-orange-600",
                            status === 'blocked' && "bg-red-600"
                          )}
                        >
                          {status === 'active' ? 'ACTIVO' : status === 'overdue' ? 'MORA' : status === 'suspended' ? 'SUSPENDIDO' : 'BLOQUEADO'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
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
