
"use client";

import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Users, UserSquare2, Stethoscope, Landmark, Activity, Calendar, Database, ShieldCheck, BarChart3, Clock, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { db, User, Patient, Appointment } from '@/lib/db';
import Link from 'next/link';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

function SuperAdminDashboard() {
  const [stats, setStats] = useState({
    totalClinics: 0,
    activeClinics: 0,
    inactiveClinics: 0,
    totalPatients: 0,
    totalAppointments: 0
  });

  const [recentClinics, setRecentClinics] = useState<User[]>([]);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const users = await db.getAll<User>('users');
    const clinics = users.filter(u => u.role === 'clinic');
    const patients = await db.getAll<Patient>('patients');
    const appointments = await db.getAll<Appointment>('appointments');

    setStats({
      totalClinics: clinics.length,
      activeClinics: clinics.filter(c => c.status === 'active').length,
      inactiveClinics: clinics.filter(c => c.status !== 'active').length,
      totalPatients: patients.length,
      totalAppointments: appointments.length
    });

    setRecentClinics(clinics.slice(-3).reverse());
  };

  const chartData = [
    { name: 'Activos', count: stats.activeClinics, fill: 'hsl(var(--primary))' },
    { name: 'Desconectados', count: stats.inactiveClinics, fill: 'hsl(var(--muted))' }
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-primary">Panel Administrativo Global</h2>
        <p className="text-muted-foreground mt-2">Monitoreo de red de consultorios dentales</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-sm bg-primary/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Consultorios Totales</CardTitle>
            <ShieldCheck className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClinics}</div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-emerald-50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">En Línea (Activos)</CardTitle>
            <Clock className="w-4 h-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{stats.activeClinics}</div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-slate-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Desconectados</CardTitle>
            <AlertCircle className="w-4 h-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-600">{stats.inactiveClinics}</div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-indigo-50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pacientes en Red</CardTitle>
            <UserSquare2 className="w-4 h-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">{stats.totalPatients}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Estado de Consultorios</CardTitle>
            <CardDescription>Distribución en tiempo real</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Nuevos Consultorios</CardTitle>
            <CardDescription>Últimos registros en la plataforma</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentClinics.map(clinic => (
              <div key={clinic.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    {clinic.fullName?.charAt(0) || clinic.username.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-sm">{clinic.fullName || clinic.username}</p>
                    <p className="text-xs text-muted-foreground">{clinic.username}</p>
                  </div>
                </div>
                <Badge variant={clinic.status === 'active' ? 'default' : 'secondary'}>
                  {clinic.status === 'active' ? 'Activo' : 'Desconectado'}
                </Badge>
              </div>
            ))}
            {recentClinics.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">No hay consultorios registrados.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ClinicDashboard() {
  const modules = [
    { icon: UserSquare2, title: 'Pacientes', description: 'Registro y historial clínico', href: '/patients', color: 'bg-teal-500' },
    { icon: Stethoscope, title: 'Tratamientos', description: 'Catálogo de servicios y precios', href: '/treatments', color: 'bg-blue-500' },
    { icon: Landmark, title: 'Pagos', description: 'Control de abonos y saldos', href: '/payments', color: 'bg-emerald-500' },
    { icon: Activity, title: 'Odontograma', description: 'Esquema gráfico interactivo', href: '/odontogram', color: 'bg-indigo-500' },
    { icon: Calendar, title: 'Citas', description: 'Agenda de pacientes', href: '/appointments', color: 'bg-violet-500' },
    { icon: Users, title: 'Personal', description: 'Administración de acceso', href: '/admin/users', color: 'bg-slate-500' },
    { icon: Database, title: 'Respaldo', description: 'Backup y restauración', href: '/backups', color: 'bg-amber-500' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-primary">Panel del Consultorio</h2>
        <p className="text-muted-foreground mt-2">Bienvenido al sistema de gestión KuskoDento</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map((module) => (
          <Link href={module.href} key={module.href}>
            <Card className="hover:shadow-lg transition-all border-none shadow-sm group cursor-pointer overflow-hidden h-full">
              <div className={`h-2 ${module.color}`} />
              <CardHeader className="flex flex-row items-center gap-4 py-8">
                <div className={`p-4 rounded-2xl text-white ${module.color} group-hover:scale-110 transition-transform`}>
                  <module.icon className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <CardTitle className="text-xl">{module.title}</CardTitle>
                  <CardDescription>{module.description}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

function DashboardContent() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <AppLayout>
      {user.role === 'superadmin' ? <SuperAdminDashboard /> : <ClinicDashboard />}
    </AppLayout>
  );
}

export default function DashboardPage() {
  return (
    <AuthProvider>
      <DashboardContent />
    </AuthProvider>
  );
}
