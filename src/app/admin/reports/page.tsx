
"use client";

import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { AppLayout } from '@/components/layout/AppLayout';
import { db, User, Patient, Appointment, Payment } from '@/lib/db';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { Users, Building2, Calendar, CreditCard, TrendingUp } from 'lucide-react';

function ReportsContent() {
  const { user } = useAuth();
  const [data, setData] = useState({
    clinicsData: [] as any[],
    growthData: [] as any[],
    stats: {
      totalClinics: 0,
      totalPatients: 0,
      totalAppointments: 0,
      totalRevenue: 0
    }
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const users = await db.getAll<User>('users');
    const clinics = users.filter(u => u.role === 'clinic');
    const patients = await db.getAll<Patient>('patients');
    const appointments = await db.getAll<Appointment>('appointments');
    const payments = await db.getAll<Payment>('payments');

    // Datos simulados por mes para el gráfico de crecimiento
    const growth = [
      { name: 'Ene', value: 10 },
      { name: 'Feb', value: 25 },
      { name: 'Mar', value: 45 },
      { name: 'Abr', value: 30 },
      { name: 'May', value: 60 },
      { name: 'Jun', value: clinics.length * 10 }
    ];

    // Distribución de pacientes por consultorio (Top 5)
    const distribution = clinics.map(c => ({
      name: c.fullName || c.username,
      patients: patients.filter(p => p.clinicId === c.id).length
    })).sort((a, b) => b.patients - a.patients).slice(0, 5);

    setData({
      clinicsData: distribution,
      growthData: growth,
      stats: {
        totalClinics: clinics.length,
        totalPatients: patients.length,
        totalAppointments: appointments.length,
        totalRevenue: payments.reduce((acc, curr) => acc + curr.totalPaid, 0)
      }
    });
  };

  if (user?.role !== 'superadmin') return null;

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-bold text-primary">Reportes Estadísticos</h2>
          <p className="text-muted-foreground mt-2">Visión global del rendimiento de la plataforma</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-none shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg text-blue-600"><Building2 className="w-6 h-6" /></div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold">Consultorios</p>
                  <p className="text-2xl font-bold">{data.stats.totalClinics}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-teal-100 rounded-lg text-teal-600"><Users className="w-6 h-6" /></div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold">Pacientes Red</p>
                  <p className="text-2xl font-bold">{data.stats.totalPatients}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-violet-100 rounded-lg text-violet-600"><Calendar className="w-6 h-6" /></div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold">Citas Totales</p>
                  <p className="text-2xl font-bold">{data.stats.totalAppointments}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-100 rounded-lg text-emerald-600"><CreditCard className="w-6 h-6" /></div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-bold">Volumen Transaccional</p>
                  <p className="text-2xl font-bold">S/. {data.stats.totalRevenue.toFixed(0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5" /> Crecimiento de la Red</CardTitle>
              <CardDescription>Número de transacciones estimadas por mes</CardDescription>
            </CardHeader>
            <CardContent className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.growthData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Pacientes por Consultorio</CardTitle>
              <CardDescription>Top 5 consultorios con más registros</CardDescription>
            </CardHeader>
            <CardContent className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.clinicsData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="patients"
                  >
                    {data.clinicsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-4 mt-4">
                {data.clinicsData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">{entry.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

export default function ReportsPage() {
  return (
    <AuthProvider>
      <ReportsContent />
    </AuthProvider>
  );
}
