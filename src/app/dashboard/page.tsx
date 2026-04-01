
"use client";

import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, UserSquare2, Stethoscope, Landmark, Activity, Calendar, Database as DatabaseIcon, ShieldCheck, Clock, AlertCircle, Boxes, Sparkles, TrendingUp, ArrowUpRight, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { db, User, Patient, Appointment } from '@/lib/legacy-data';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';

function AdminDashboard() {
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
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-primary tracking-tight">Panel Administrativo</h2>
          <p className="text-muted-foreground mt-2 font-medium">Monitoreo y control de la red de consultorios KuskoDento</p>
        </div>
        <div className="hidden md:flex gap-4">
           <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border shadow-sm flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg text-primary"><Zap className="w-4 h-4" /></div>
              <div><p className="text-[10px] font-black uppercase text-muted-foreground leading-none">Status</p><p className="text-xs font-bold">Operativo 100%</p></div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-xl shadow-blue-500/5 bg-white dark:bg-slate-950 rounded-[2rem] group hover:scale-[1.02] transition-transform">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Consultorios</CardTitle>
            <ShieldCheck className="w-5 h-5 text-primary group-hover:animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black">{stats.totalClinics}</div>
            <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1"><ArrowUpRight className="w-3 h-3 text-emerald-500" /> +5% este mes</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-xl shadow-emerald-500/5 bg-white dark:bg-slate-950 rounded-[2rem] group hover:scale-[1.02] transition-transform">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">En Línea</CardTitle>
            <Clock className="w-5 h-5 text-emerald-600 group-hover:animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-emerald-600">{stats.activeClinics}</div>
            <p className="text-[10px] text-muted-foreground mt-2">Sincronización activa</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-xl shadow-slate-500/5 bg-white dark:bg-slate-950 rounded-[2rem] group hover:scale-[1.02] transition-transform">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Desconectados</CardTitle>
            <AlertCircle className="w-5 h-5 text-slate-400 group-hover:animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-slate-500">{stats.inactiveClinics}</div>
            <p className="text-[10px] text-muted-foreground mt-2">Requieren atención</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-xl shadow-indigo-500/5 bg-white dark:bg-slate-950 rounded-[2rem] group hover:scale-[1.02] transition-transform">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Pacientes Red</CardTitle>
            <UserSquare2 className="w-5 h-5 text-indigo-600 group-hover:animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black text-indigo-600">{stats.totalPatients}</div>
            <p className="text-[10px] text-muted-foreground mt-2">Historiales digitales</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-none shadow-xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-950 rounded-[2.5rem] overflow-hidden">
          <CardHeader className="border-b pb-6 p-8">
            <CardTitle className="text-xl font-black">Distribución de Consultorios</CardTitle>
            <CardDescription>Estado de conexión en tiempo real</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] pt-8 p-8">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                <XAxis dataKey="name" fontSize={10} fontWeight="bold" />
                <YAxis fontSize={10} fontWeight="bold" />
                <Bar dataKey="count" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-950 rounded-[2.5rem] overflow-hidden">
          <CardHeader className="border-b pb-6 p-8">
            <CardTitle className="text-xl font-black">Registros Recientes</CardTitle>
            <CardDescription>Últimos consultorios activados</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-8">
            {recentClinics.map(clinic => (
              <div key={clinic.id} className="flex items-center justify-between p-5 border rounded-3xl hover:bg-slate-50 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-lg font-black group-hover:scale-110 transition-transform">
                    {clinic.fullName?.charAt(0) || clinic.username?.charAt(0)}
                  </div>
                  <div>
                    <p className="font-black text-sm text-slate-800 dark:text-white">{clinic.fullName || clinic.username}</p>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{clinic.username}</p>
                  </div>
                </div>
                <Badge 
                  variant={clinic.status === 'active' ? 'default' : 'secondary'}
                  className={cn("text-[9px] h-6 font-black uppercase tracking-tighter px-3", clinic.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400')}
                >
                  {clinic.status === 'active' ? 'En Línea' : 'Off-line'}
                </Badge>
              </div>
            ))}
            {recentClinics.length === 0 && (
              <div className="text-center py-20 opacity-20">
                <Boxes className="w-16 h-16 mx-auto mb-4" />
                <p className="text-sm font-black uppercase tracking-[0.2em]">Sin actividad reciente</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ClinicDashboard() {
  const { user } = useAuth();
  const [clinicStats, setClinicStats] = useState({ patients: 0, appointments: 0, lowStock: 0 });

  useEffect(() => {
    loadClinicData();
  }, [user]);

  const loadClinicData = async () => {
    if (!user) return;
    const cid = user.role === 'clinic' ? user.id : user.clinicId;
    const allP = await db.getAll<Patient>('patients');
    const allA = await db.getAll<Appointment>('appointments');
    const allI = await db.getAll<any>('inventory');

    setClinicStats({
      patients: allP.filter(p => p.clinicId === cid).length,
      appointments: allA.filter(a => a.clinicId === cid).length,
      lowStock: allI.filter(i => i.clinicId === cid && i.quantity <= i.minQuantity).length
    });
  };

  const modules = [
    { icon: UserSquare2, title: 'Pacientes', description: 'Historia Clínica Digital', href: '/patients', color: 'bg-teal-500' },
    { icon: Stethoscope, title: 'Tratamientos', description: 'Catálogo y Tarifas', href: '/treatments', color: 'bg-blue-600' },
    { icon: Landmark, title: 'Pagos', description: 'Control de Finanzas', href: '/payments', color: 'bg-emerald-600' },
    { icon: Activity, title: 'Odontograma', description: 'Gráfico Interactivo', href: '/odontogram', color: 'bg-indigo-600' },
    { icon: Calendar, title: 'Citas', description: 'Agenda y Turnos', href: '/appointments', color: 'bg-violet-600' },
    { icon: Boxes, title: 'Inventario', description: 'Control de Insumos', href: '/inventory', color: 'bg-orange-600' },
    { icon: Users, title: 'Personal', description: 'Equipo Clínico', href: '/admin/users', color: 'bg-slate-600' },
    { icon: DatabaseIcon, title: 'Respaldo', description: 'Backup de Datos', href: '/backups', show: user?.role === 'clinic', color: 'bg-slate-600' },
  ];

  const brandColor = user?.primaryColor || '#008080';

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Welcome Banner */}
      <div 
        className="relative overflow-hidden p-10 md:p-14 rounded-[3rem] shadow-2xl shadow-primary/20 text-white group"
        style={{ 
          background: `linear-gradient(135deg, ${brandColor}, ${brandColor}dd)` 
        }}
      >
        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 transition-transform duration-1000">
          <Sparkles className="w-64 h-64" />
        </div>
        <div className="relative z-10 space-y-4">
          <Badge className="bg-white/20 hover:bg-white/30 text-white border-none backdrop-blur-md px-4 py-1.5 font-black uppercase tracking-[0.2em] text-[10px]">
            {user?.role === 'clinic' ? 'Admin de Clínica' : 'Personal Clínico'}
          </Badge>
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter leading-none">
            {user?.brandName ? `Bienvenido a ${user.brandName}` : `Bienvenido, ${user?.fullName || user?.username}`}
          </h2>
          <p className="text-lg md:text-xl font-medium opacity-90 max-w-2xl leading-relaxed">
            {user?.slogan || 'Gestione su consultorio con la máxima precisión y profesionalismo.'}
          </p>
          <div className="flex flex-wrap gap-8 pt-6">
             <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md"><Users className="w-6 h-6" /></div>
                <div><p className="text-2xl font-black">{clinicStats.patients}</p><p className="text-[10px] font-bold uppercase opacity-70 tracking-widest">Pacientes</p></div>
             </div>
             <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md"><Calendar className="w-6 h-6" /></div>
                <div><p className="text-2xl font-black">{clinicStats.appointments}</p><p className="text-[10px] font-bold uppercase opacity-70 tracking-widest">Citas</p></div>
             </div>
             {clinicStats.lowStock > 0 && (
               <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-red-500/30 rounded-2xl flex items-center justify-center backdrop-blur-md animate-pulse"><AlertCircle className="w-6 h-6" /></div>
                  <div><p className="text-2xl font-black text-white">{clinicStats.lowStock}</p><p className="text-[10px] font-bold uppercase opacity-70 tracking-widest">Stock Crítico</p></div>
               </div>
             )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {modules.filter(m => m.show !== false).map((module) => {
          const colorName = module.color?.split('-')[1] || 'primary';
          return (
            <Link href={module.href} key={module.href}>
              <Card className="hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 border-none shadow-xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-950 group cursor-pointer overflow-hidden h-full rounded-[2.5rem]">
                <div className={`h-2 ${module.color}`} />
                <CardHeader className="flex flex-row items-center gap-5 py-8 p-6">
                  <div className={cn(
                    "p-4 rounded-[1.5rem] text-white shadow-lg group-hover:rotate-6 transition-all duration-500",
                    module.color,
                    `shadow-${colorName}-500/20`
                  )}>
                    <module.icon className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-black tracking-tight">{module.title}</CardTitle>
                    <CardDescription className="text-xs font-medium leading-snug">{module.description}</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900 p-8 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-800">
         <div className="flex items-center gap-4">
            <div className="p-4 bg-white dark:bg-slate-800 rounded-3xl shadow-sm"><TrendingUp className="w-6 h-6 text-primary" /></div>
            <div>
              <p className="text-lg font-black tracking-tight">Crecimiento del Consultorio</p>
              <p className="text-sm text-muted-foreground">Digitalización completa de su práctica dental</p>
            </div>
         </div>
         <Button asChild variant="outline" className="h-14 px-8 rounded-2xl font-black uppercase text-xs tracking-widest border-2 hover:bg-primary hover:text-white transition-all">
           <Link href="/patients">Empezar Ahora</Link>
         </Button>
      </div>
    </div>
  );
}

function DashboardContent() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <AppLayout>
      {user.role === 'admin' ? <AdminDashboard /> : <ClinicDashboard />}
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
